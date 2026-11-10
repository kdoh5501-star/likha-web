-- LIKHA migration 002: order deliverables + staff notifications
-- Run in Supabase SQL editor (idempotent).

alter table orders add column if not exists deliverables jsonb;   -- [{task_no, type, link, note}]

-- notify every pm/admin (helper)
create or replace function notify_staff(kind text, vars jsonb, link text) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, kind, vars, link)
  select id, kind, vars, link from profiles where role in ('pm','admin');
end $$;

-- tasks: creator delivered (-> review) / claimed open task (-> work) => tell PMs
create or replace function on_task_staff_notify() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'review' and old.status is distinct from 'review' then
    perform notify_staff('nt_review', jsonb_build_object('no', new.task_no), '#task/' || new.id);
  end if;
  if new.status = 'work' and old.status in ('open','offer') and new.creator_id is not null then
    perform notify_staff('nt_claimed', jsonb_build_object('no', new.task_no), '#task/' || new.id);
  end if;
  return new;
end $$;
drop trigger if exists tasks_staff_notify on tasks;
create trigger tasks_staff_notify after update on tasks for each row execute function on_task_staff_notify();

-- order_events: client submitted requirements / asked revision / confirmed => tell PMs
create or replace function on_order_event_notify() returns trigger language plpgsql security definer set search_path = public as $$
declare o record;
begin
  select order_no into o from orders where id = new.order_id;
  if new.kind = 'req' then perform notify_staff('nt_req', jsonb_build_object('no', o.order_no), '#order/' || new.order_id); end if;
  if new.kind = 'revision' then perform notify_staff('nt_client_rev', jsonb_build_object('no', o.order_no), '#order/' || new.order_id); end if;
  if new.kind = 'confirmed' then perform notify_staff('nt_confirmed', jsonb_build_object('no', o.order_no), '#order/' || new.order_id); end if;
  return new;
end $$;
drop trigger if exists order_events_notify on order_events;
create trigger order_events_notify after insert on order_events for each row execute function on_order_event_notify();

-- orders: client confirmed (-> done) => auto-credit delivered tasks (tasks.status -> done, triggers creator notification + deliveries count)
create or replace function on_order_done_credit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'done' and old.status is distinct from 'done' then
    update tasks set status = 'done', done_at = now() where order_id = new.id and status = 'delivered';
  end if;
  return new;
end $$;
drop trigger if exists orders_done_credit on orders;
create trigger orders_done_credit after update on orders for each row execute function on_order_done_credit();

-- tasks.paid_out: set when a payout_item is created (PM 정산 화면에서 지급 생성 후 목록에서 빠지도록)
alter table tasks add column if not exists paid_out boolean not null default false;
create or replace function on_payout_item_mark() returns trigger language plpgsql security definer set search_path = public as $$
begin update tasks set paid_out = true where id = new.task_id; return new; end $$;
drop trigger if exists payout_items_mark on payout_items;
create trigger payout_items_mark after insert on payout_items for each row execute function on_payout_item_mark();
update tasks t set paid_out = true where exists (select 1 from payout_items i where i.task_id = t.id);

-- RLS fix: staff could insert payouts but not payout_items (missing policy) -> 지급 생성 시 항목이 비는 버그
drop policy if exists pyi_staff on payout_items; create policy pyi_staff on payout_items for all using (is_staff()) with check (is_staff());

-- 맞춤 견적 요청 (index.html #request) — 로그인 없이도 접수 가능, 직원만 열람
create table if not exists quote_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references profiles(id),
  title text not null, cat text, vol text, due text, budget text, description text,
  name text, phone text, email text,
  status text not null default 'new',   -- new / contacted / converted / closed
  created_at timestamptz not null default now()
);
alter table quote_requests enable row level security;
drop policy if exists qr_ins on quote_requests; create policy qr_ins on quote_requests for insert with check (true);
drop policy if exists qr_staff on quote_requests; create policy qr_staff on quote_requests for all using (is_staff());
drop policy if exists qr_own on quote_requests; create policy qr_own on quote_requests for select using (client_id = auth.uid());
create or replace function on_quote_request() returns trigger language plpgsql security definer set search_path = public as $$
begin perform notify_staff('nt_quote', jsonb_build_object('t', left(new.title, 30)), '#quotes'); return new; end $$;
drop trigger if exists quote_requests_notify on quote_requests;
create trigger quote_requests_notify after insert on quote_requests for each row execute function on_quote_request();
