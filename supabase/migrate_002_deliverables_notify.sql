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
