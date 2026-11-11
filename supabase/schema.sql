-- Tables propres à Cap 2027. Ne modifie aucune table existante d'une autre application.
create table public.cap27_snapshot (id integer primary key check(id=1), payload jsonb not null, updated_at timestamptz not null default now());
alter table public.cap27_snapshot enable row level security;
grant select on public.cap27_snapshot to anon, authenticated;
create policy cap27_snapshot_read on public.cap27_snapshot for select to anon,authenticated using(true);
create table public.cap27_preferences (user_id uuid primary key references auth.users(id) on delete cascade, favorites text[] not null default '{}', themes text[] not null default '{}', alerts jsonb not null default '{"programme":true,"candidature":true,"vote":true,"parrainage":true}', last_seen timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.cap27_preferences enable row level security;
grant select,insert,update,delete on public.cap27_preferences to authenticated;
create policy cap27_preferences_read on public.cap27_preferences for select to authenticated using((select auth.uid())=user_id);
create policy cap27_preferences_insert on public.cap27_preferences for insert to authenticated with check((select auth.uid())=user_id);
create policy cap27_preferences_update on public.cap27_preferences for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy cap27_preferences_delete on public.cap27_preferences for delete to authenticated using((select auth.uid())=user_id);
create table public.cap27_jobs (id integer primary key check(id=1), claimed_at timestamptz not null default '2000-01-01', finished_at timestamptz, error text);
alter table public.cap27_jobs enable row level security;
insert into public.cap27_jobs(id) values(1);
create table public.cap27_ai_usage (user_id uuid not null references auth.users(id) on delete cascade, day date not null default current_date, requests integer not null default 0, primary key(user_id,day));
alter table public.cap27_ai_usage enable row level security;
-- Fonctions à privilèges appelant, exclusivement accessibles au rôle serveur.
create function public.cap27_claim_refresh() returns boolean language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 update public.cap27_jobs set claimed_at=now(),error=null where id=1 and claimed_at < now()-interval '25 minutes';
 get diagnostics n = row_count; return n>0;
end; $$;
revoke all on function public.cap27_claim_refresh() from public,anon,authenticated;
grant execute on function public.cap27_claim_refresh() to service_role;
create function public.cap27_claim_ai(uid uuid) returns boolean language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 insert into public.cap27_ai_usage(user_id,day,requests) values(uid,current_date,1)
 on conflict(user_id,day) do update set requests=cap27_ai_usage.requests+1 where cap27_ai_usage.requests<20
 returning requests into n;
 return n is not null;
end; $$;
revoke all on function public.cap27_claim_ai(uuid) from public,anon,authenticated;
grant execute on function public.cap27_claim_ai(uuid) to service_role;
grant all on public.cap27_snapshot,public.cap27_preferences,public.cap27_jobs,public.cap27_ai_usage to service_role;
