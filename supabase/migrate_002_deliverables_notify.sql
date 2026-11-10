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
