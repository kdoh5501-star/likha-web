-- LIKHA migration 003: 자동화 (pg_cron)
-- 1) 크리에이터에게 제안(offer)한 작업이 12시간 내 수락되지 않으면 오픈 보드로 전환
-- 2) 납품(delivered) 후 7일 동안 고객이 확정하지 않으면 자동 구매 확정 (→ 작업 정산 적립 트리거 동작)
-- 3) 지급 예정일(15일·30일) 아침에 PM에게 정산 알림
create extension if not exists pg_cron with schema extensions;

create or replace function cron_expire_offers() returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with x as (
    update tasks set status = 'open', creator_id = null, expires_at = null
    where status = 'offer' and expires_at is not null and expires_at < now()
    returning id, task_no
  )
  select count(*) into n from x;
  if n > 0 then perform notify_staff('nt_expired', jsonb_build_object('n', n), '#tasks'); end if;
  return n;
end $$;

create or replace function cron_auto_confirm() returns int language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  for r in select id, client_id, order_no from orders where status = 'delivered' and delivered_at is not null and delivered_at < now() - interval '7 days' loop
    update orders set status = 'done', confirmed_at = now() where id = r.id;   -- orders_done_credit 트리거가 작업을 done 으로
    insert into order_events (order_id, actor_id, kind, data) values (r.id, null, 'confirmed', jsonb_build_object('auto', true));
    insert into notifications (user_id, kind, vars, link) values (r.client_id, 'nt_auto_confirm', jsonb_build_object('no', r.order_no), '#order-' || r.id);
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function cron_payout_reminder() returns void language plpgsql security definer set search_path = public as $$
declare total int; cnt int;
begin
  select coalesce(sum(fee_php + coalesce(bonus_php,0)),0), count(*) into total, cnt from tasks where status = 'done' and not paid_out;
  if cnt > 0 then perform notify_staff('nt_payout_day', jsonb_build_object('n', cnt, 'a', total), '#payouts'); end if;
end $$;

-- 스케줄 (UTC 기준; 한국 09:00 = UTC 00:00)
select cron.unschedule(jobname) from cron.job where jobname in ('likha_expire_offers','likha_auto_confirm','likha_payout_reminder');
select cron.schedule('likha_expire_offers',   '*/15 * * * *', $$select cron_expire_offers()$$);
select cron.schedule('likha_auto_confirm',    '0 * * * *',    $$select cron_auto_confirm()$$);
select cron.schedule('likha_payout_reminder', '0 0 15,30 * *', $$select cron_payout_reminder()$$);
select jobname, schedule, active from cron.job;
