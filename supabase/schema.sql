-- LIKHA — Supabase schema (Postgres). Run in Supabase SQL editor, top to bottom.
-- Roles: client (한국 고객) · creator (필리핀 크리에이터) · pm (한국 PM) · admin
-- Money: orders.amount in KRW (client side). tasks.fee_php in PHP (creator side). The two are never joined in any creator-readable view.

create extension if not exists "pgcrypto";

-- ---------- enums ----------
do $$ begin
  create type user_role as enum ('client','creator','pm','admin');
  create type order_status as enum ('pending_payment','paid','req','work','review','delivered','done','cancelled','refunded');
  create type task_status as enum ('offer','open','work','review','revision','delivered','done','declined','expired');
  create type task_type as enum ('short','long','thumb','sub','motion','ai');
  create type thread_kind as enum ('support','pm','task','order');
  create type payout_status as enum ('scheduled','paid','failed');
exception when duplicate_object then null; end $$;

-- ---------- profiles (1:1 auth.users) ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'client',
  name text, email text, phone text, avatar_url text,
  lang text not null default 'en' check (lang in ('ko','en','tl')),
  company text, biz_no text,                       -- client
  city text, skills task_type[] default '{}', tools text[] default '{}', portfolio text[] default '{}', capacity int default 20,   -- creator
  level int not null default 1 check (level between 1 and 4),
  deliveries int not null default 0, first_pass int not null default 0, ontime int not null default 0,
  payout_method text check (payout_method in ('gcash','maya','bank')), payout_account jsonb,
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

-- auto-create profile on signup (Google login fills name/avatar)
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name, email, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)), new.email, new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- ---------- services (catalog; mirrors data.js, editable by admin) ----------
create table if not exists services (
  id int primary key, slug text unique, title text not null, cat text not null, sub text,
  packages jsonb not null,            -- [{code:'STANDARD',name,price,days,rev,inc:[...]}...]
  options jsonb default '[]', creator_task task_type not null, active boolean default true
);

-- ---------- orders (client side, KRW) ----------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_no text unique not null,                   -- LK-2611-1043 (shown to client, used as Toss orderId)
  client_id uuid not null references profiles(id),
  service_id int not null references services(id),
  package_code text not null, options jsonb default '[]', qty int not null default 1,
  amount int not null,                             -- KRW, verified against Toss on confirm
  coupon text, status order_status not null default 'pending_payment',
  requirements jsonb,                              -- client's brief, files, refs (filled after payment)
  payment jsonb,                                   -- toss: paymentKey, method, approvedAt, receiptUrl
  pm_id uuid references profiles(id),
  due_at timestamptz, delivered_at timestamptz, confirmed_at timestamptz,
  rating int check (rating between 1 and 5), review text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists orders_client_idx on orders(client_id, created_at desc);
create index if not exists orders_status_idx on orders(status);

create table if not exists order_events (
  id bigserial primary key, order_id uuid not null references orders(id) on delete cascade,
  actor_id uuid references profiles(id), kind text not null, data jsonb, created_at timestamptz not null default now()
);

-- ---------- tasks (creator side, PHP) ----------
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  task_no text unique not null,                    -- T-2611-0412
  order_id uuid not null references orders(id) on delete cascade,
  creator_id uuid references profiles(id),         -- null while 'open'
  pm_id uuid not null references profiles(id),
  type task_type not null, status task_status not null default 'offer',
  client_alias text not null,                      -- "Skin clinic · Gangnam" — never the client's real name
  brief text not null, files jsonb default '[]', refs jsonb default '[]',
  fee_php int not null, bonus_php int not null default 0, min_level int not null default 1, max_rev int not null default 1, rev int not null default 0,
  due_at timestamptz not null, expires_at timestamptz,
  deliverable jsonb,                               -- {link, note, submitted_at}
  rev_notes text,
  accepted_at timestamptz, delivered_at timestamptz, passed_at timestamptz, done_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists tasks_creator_idx on tasks(creator_id, status);
create index if not exists tasks_order_idx on tasks(order_id);

-- ---------- messaging ----------
create table if not exists threads (
  id uuid primary key default gen_random_uuid(),
  kind thread_kind not null,
  order_id uuid references orders(id) on delete cascade,
  task_id uuid references tasks(id) on delete cascade,
  created_at timestamptz not null default now(), last_at timestamptz not null default now()
);
create table if not exists thread_members (
  thread_id uuid references threads(id) on delete cascade, user_id uuid references profiles(id) on delete cascade,
  last_read_at timestamptz not null default 'epoch', primary key (thread_id, user_id)
);
create table if not exists messages (
  id bigserial primary key, thread_id uuid not null references threads(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  lang text not null default 'en',                 -- language the sender wrote in
  text text not null,                              -- original
  tr jsonb default '{}',                           -- {"ko":"…","en":"…","tl":"…"} filled by api/translate
  attachments jsonb default '[]',
  created_at timestamptz not null default now()
);
create index if not exists messages_thread_idx on messages(thread_id, created_at);

create or replace function bump_thread() returns trigger language plpgsql as $$
begin update threads set last_at = new.created_at where id = new.thread_id; return new; end $$;
drop trigger if exists messages_bump on messages;
create trigger messages_bump after insert on messages for each row execute function bump_thread();

-- ---------- notifications ----------
create table if not exists notifications (
  id bigserial primary key, user_id uuid not null references profiles(id) on delete cascade,
  kind text not null, vars jsonb default '{}', link text, read boolean not null default false, created_at timestamptz not null default now()
);
create index if not exists notif_user_idx on notifications(user_id, read, created_at desc);

-- ---------- payouts (creator, PHP) ----------
create table if not exists payouts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references profiles(id),
  period_start date not null, period_end date not null, amount_php int not null,
  method text, account jsonb, status payout_status not null default 'scheduled', paid_at timestamptz, ref text,
  created_at timestamptz not null default now()
);
create table if not exists payout_items (
  payout_id uuid references payouts(id) on delete cascade, task_id uuid references tasks(id), amount_php int not null, primary key (payout_id, task_id)
);

-- ---------- helpers ----------
create or replace function my_role() returns user_role language sql stable as $$ select role from profiles where id = auth.uid() $$;
create or replace function is_staff() returns boolean language sql stable as $$ select coalesce(my_role() in ('pm','admin'), false) $$;

create or replace function next_no(prefix text) returns text language plpgsql as $$
declare n int; begin
  n := (select count(*) from orders where created_at::date = current_date) + 1;
  return prefix || '-' || to_char(now(),'YYMM') || '-' || lpad(n::text, 4, '0');
end $$;

create or replace function touch_updated() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists orders_touch on orders; create trigger orders_touch before update on orders for each row execute function touch_updated();
drop trigger if exists tasks_touch on tasks;  create trigger tasks_touch  before update on tasks  for each row execute function touch_updated();

-- when a task is credited (done), bump creator stats
create or replace function on_task_done() returns trigger language plpgsql security definer as $$
begin
  if new.status = 'done' and old.status is distinct from 'done' then
    update profiles set deliveries = deliveries + 1 where id = new.creator_id;
    insert into notifications (user_id, kind, vars, link) values (new.creator_id, 'nt_pass', jsonb_build_object('t', new.task_no), '#task/' || new.id);
  end if;
  if new.status = 'revision' and old.status is distinct from 'revision' then
    insert into notifications (user_id, kind, vars, link) values (new.creator_id, 'nt_rev', jsonb_build_object('t', new.task_no), '#task/' || new.id);
  end if;
  if new.status = 'offer' and (old.status is distinct from 'offer') and new.creator_id is not null then
    insert into notifications (user_id, kind, vars, link) values (new.creator_id, 'nt_offer', jsonb_build_object('t', new.task_no), '#task/' || new.id);
  end if;
  return new;
end $$;
drop trigger if exists tasks_done on tasks; create trigger tasks_done after update on tasks for each row execute function on_task_done();

-- ---------- Row Level Security ----------
alter table profiles enable row level security;
alter table services enable row level security;
alter table orders enable row level security;
alter table order_events enable row level security;
alter table tasks enable row level security;
alter table threads enable row level security;
alter table thread_members enable row level security;
alter table messages enable row level security;
alter table notifications enable row level security;
alter table payouts enable row level security;
alter table payout_items enable row level security;

-- profiles: self read/write (not role/level), staff read all. Role changes only via service key / admin.
drop policy if exists p_self on profiles; create policy p_self on profiles for select using (id = auth.uid() or is_staff());
drop policy if exists p_self_upd on profiles; create policy p_self_upd on profiles for update using (id = auth.uid())
  with check (id = auth.uid()
    and level = (select level from profiles p where p.id = auth.uid())
    and (role = (select role from profiles p where p.id = auth.uid())                       -- role unchanged
         or (role in ('client','creator') and (select onboarded from profiles p where p.id = auth.uid()) = false)));  -- or first-time onboarding pick
drop policy if exists p_staff_upd on profiles; create policy p_staff_upd on profiles for update using (is_staff());

-- services: public read
drop policy if exists s_read on services; create policy s_read on services for select using (true);
drop policy if exists s_admin on services; create policy s_admin on services for all using (my_role() = 'admin');

-- orders: client sees own; staff sees all. Creators NEVER select orders (no KRW exposure).
drop policy if exists o_client on orders; create policy o_client on orders for select using (client_id = auth.uid() or is_staff());
drop policy if exists o_client_ins on orders; create policy o_client_ins on orders for insert with check (client_id = auth.uid() and status = 'pending_payment');
drop policy if exists o_client_upd on orders; create policy o_client_upd on orders for update using (client_id = auth.uid() and status in ('paid','req','delivered')) with check (client_id = auth.uid());
drop policy if exists o_staff on orders; create policy o_staff on orders for all using (is_staff());
drop policy if exists oe_read on order_events; create policy oe_read on order_events for select using (exists (select 1 from orders o where o.id = order_id and (o.client_id = auth.uid() or is_staff())));
drop policy if exists oe_ins on order_events; create policy oe_ins on order_events for insert with check (actor_id = auth.uid());

-- tasks: creator sees own + open ones at or below level; staff all. Clients never see tasks (no PHP exposure).
drop policy if exists t_creator on tasks; create policy t_creator on tasks for select using (creator_id = auth.uid() or (status = 'open' and min_level <= (select level from profiles where id = auth.uid()) and my_role() = 'creator') or is_staff());
drop policy if exists t_creator_upd on tasks; create policy t_creator_upd on tasks for update using ((creator_id = auth.uid() and status in ('offer','work','revision')) or (status = 'open' and my_role() = 'creator')) with check (creator_id = auth.uid() and status in ('work','review','declined'));
drop policy if exists t_staff on tasks; create policy t_staff on tasks for all using (is_staff());

-- threads/messages: members only; staff all
drop policy if exists th_read on threads; create policy th_read on threads for select using (is_staff() or exists (select 1 from thread_members m where m.thread_id = id and m.user_id = auth.uid()));
drop policy if exists th_staff on threads; create policy th_staff on threads for all using (is_staff());
drop policy if exists th_ins on threads; create policy th_ins on threads for insert with check (auth.uid() is not null);
drop policy if exists tm_read on thread_members; create policy tm_read on thread_members for select using (user_id = auth.uid() or is_staff());
drop policy if exists tm_ins on thread_members; create policy tm_ins on thread_members for insert with check (user_id = auth.uid() or is_staff());
drop policy if exists tm_upd on thread_members; create policy tm_upd on thread_members for update using (user_id = auth.uid());
drop policy if exists m_read on messages; create policy m_read on messages for select using (is_staff() or exists (select 1 from thread_members m where m.thread_id = thread_id and m.user_id = auth.uid()));
drop policy if exists m_ins on messages; create policy m_ins on messages for insert with check (sender_id = auth.uid() and (is_staff() or exists (select 1 from thread_members m where m.thread_id = thread_id and m.user_id = auth.uid())));

-- notifications: own
drop policy if exists n_own on notifications; create policy n_own on notifications for select using (user_id = auth.uid());
drop policy if exists n_own_upd on notifications; create policy n_own_upd on notifications for update using (user_id = auth.uid());
drop policy if exists n_staff_ins on notifications; create policy n_staff_ins on notifications for insert with check (is_staff() or user_id = auth.uid());

-- payouts: creator own, staff all
drop policy if exists py_own on payouts; create policy py_own on payouts for select using (creator_id = auth.uid() or is_staff());
drop policy if exists py_staff on payouts; create policy py_staff on payouts for all using (is_staff());
drop policy if exists pyi_read on payout_items; create policy pyi_read on payout_items for select using (is_staff() or exists (select 1 from payouts p where p.id = payout_id and p.creator_id = auth.uid()));

-- realtime
do $$ begin
  alter publication supabase_realtime add table messages;
  alter publication supabase_realtime add table notifications;
  alter publication supabase_realtime add table tasks;
  alter publication supabase_realtime add table orders;
exception when others then null; end $$;

-- storage buckets (run once; or create in dashboard): 'sources' (client uploads, private), 'deliverables' (creator uploads, private)
insert into storage.buckets (id, name, public) values ('sources','sources',false) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('deliverables','deliverables',false) on conflict do nothing;
drop policy if exists st_src_rw on storage.objects; create policy st_src_rw on storage.objects for all using (bucket_id in ('sources','deliverables') and (is_staff() or (storage.foldername(name))[1] = auth.uid()::text)) with check (bucket_id in ('sources','deliverables') and (is_staff() or (storage.foldername(name))[1] = auth.uid()::text));

-- ---------- seed: make yourself admin after first Google login ----------
-- update profiles set role = 'admin' where email = 'yko0107@gmail.com';
