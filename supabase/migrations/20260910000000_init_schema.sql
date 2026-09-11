-- StreakForge v2 schema: accounts, daily records, cached streak state,
-- push subscriptions, and notification dedupe log. See docs/DECISIONS.md
-- and the project plan for why this replaces the old localStorage model.
--
-- Security model: RLS restricts every table to its owning row, but RLS
-- alone does not grant access — Postgres checks table-level GRANTs first.
-- Mutating columns (freeze_count, repair_credits, streak numbers, day
-- statuses) are never directly GRANTed to `authenticated`; they change
-- only through the SECURITY DEFINER functions below, each of which
-- verifies auth.uid() matches the row being written before doing anything.

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- Mirrored from auth.users at signup so the scheduled job (service role,
  -- reading only `public` tables) can send email without an Admin API call
  -- per user on every cron tick.
  email text not null default '',
  github_username text not null default '',
  leetcode_username text not null default '',
  timezone text not null default 'UTC',
  freeze_count integer not null default 2,
  repair_credits integer not null default 1,
  daily_goal_notify_hour integer not null default 21 check (daily_goal_notify_hour between 0 and 23),
  notifications_enabled boolean not null default false,
  email_reminders_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: owner read" on public.profiles
  for select using (auth.uid() = user_id);
create policy "profiles: owner update" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select on public.profiles to authenticated;
-- Column-restricted: freeze_count/repair_credits are never in this list,
-- so a plain client-side .update() cannot touch them even though the row
-- policy would otherwise allow updating the row.
grant update (
  github_username, leetcode_username, timezone,
  daily_goal_notify_hour, notifications_enabled, email_reminders_enabled
) on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- daily_records — one row per user per LOCAL calendar day
-- ---------------------------------------------------------------------
create table public.daily_records (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  local_date date not null,
  github_contributed boolean not null default false,
  leetcode_contributed boolean not null default false,
  leetcode_synced_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'freeze_applied', 'repair_window', 'broken')),
  freeze_applied boolean not null default false,
  repair_deadline timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, local_date)
);

create index daily_records_user_date_idx on public.daily_records (user_id, local_date desc);
create index daily_records_repair_window_idx on public.daily_records (repair_deadline)
  where status = 'repair_window';

alter table public.daily_records enable row level security;

create policy "daily_records: owner read" on public.daily_records
  for select using (auth.uid() = user_id);

grant select on public.daily_records to authenticated;
-- No insert/update grant: all writes go through record_activity /
-- use_repair_credit / evaluate_daily_status (SECURITY DEFINER).

-- ---------------------------------------------------------------------
-- streak_state — cached read model, one row per user
-- ---------------------------------------------------------------------
create table public.streak_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_completed_date date,
  freeze_credits integer not null default 2,
  repair_credits integer not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.streak_state enable row level security;

create policy "streak_state: owner read" on public.streak_state
  for select using (auth.uid() = user_id);

grant select on public.streak_state to authenticated;

-- ---------------------------------------------------------------------
-- push_subscriptions
-- ---------------------------------------------------------------------
create table public.push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions: owner read" on public.push_subscriptions
  for select using (auth.uid() = user_id);
create policy "push_subscriptions: owner insert" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);
create policy "push_subscriptions: owner delete" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

grant select, insert, delete on public.push_subscriptions to authenticated;

-- ---------------------------------------------------------------------
-- notification_log — dedupe guard so the cron can never double-send
-- ---------------------------------------------------------------------
create table public.notification_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (
    kind in ('evening_warning', 'repair_window_opened', 'repair_reminder',
             'freeze_applied', 'streak_broken', 'milestone')
  ),
  local_date date not null,
  sent_at timestamptz not null default now(),
  unique (user_id, kind, local_date)
);

alter table public.notification_log enable row level security;

create policy "notification_log: owner read" on public.notification_log
  for select using (auth.uid() = user_id);

grant select on public.notification_log to authenticated;
-- Inserts happen only via the service-role key from the scheduled Edge
-- Function, which bypasses RLS and table grants entirely.

-- ---------------------------------------------------------------------
-- Bootstrap a profile + streak_state row on signup
-- ---------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email) values (new.id, coalesce(new.email, ''));
  insert into public.streak_state (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- recompute_streak — walks CALENDAR DAYS (not just existing rows) to
-- rebuild the cached read model. This matters: a date with no row at all
-- (never synced, downtime, pre-account history) must break the chain
-- exactly like an explicit 'broken' status would — silently walking only
-- existing rows would incorrectly bridge over a missing day as if it
-- never happened. Today is the one exception: if it has no row yet (or
-- is still 'pending'), that's expected and just gets skipped.
--
-- A 'repair_window' day is skipped without breaking the chain (it's still
-- unresolved, per the generous-auto-repair design) but also doesn't count
-- toward the streak length yet — it resolves to 'completed' or 'broken'
-- later and gets recounted correctly on the next recompute.
--
-- Exposed to `authenticated` (see grants at the bottom) since it only
-- rebuilds a derived cache from data the caller already owns — the
-- ownership check still guards against recomputing someone else's cache.
-- ---------------------------------------------------------------------
create function public.recompute_streak(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tz text;
  v_today date;
  v_cursor date;
  v_row public.daily_records%rowtype;
  v_running integer := 0;
  v_current integer := 0;
  v_longest integer := 0;
  v_last_completed date;
  v_iterations integer := 0;
begin
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'recompute_streak: cannot recompute another user''s streak';
  end if;

  select timezone into v_tz from public.profiles where user_id = p_user_id;
  v_tz := coalesce(v_tz, 'UTC');
  v_today := (now() at time zone v_tz)::date;
  v_cursor := v_today;

  -- v_current always tracks v_running as of the most recent day actually
  -- processed (see below) — there is deliberately no "lock" once a
  -- repair_window is seen: an open repair window means Day 1 is still
  -- UNRESOLVED, not broken, so the streak as it stood going into Day 1
  -- keeps displaying (per the generous-auto-repair design) rather than
  -- dropping to 0 while the user still has time to fix it.
  loop
    v_iterations := v_iterations + 1;
    exit when v_iterations > 3650; -- 10-year safety cap; never expected to hit

    select * into v_row from public.daily_records
    where user_id = p_user_id and local_date = v_cursor;

    if not found then
      exit when v_cursor <> v_today; -- genuine gap on a past day breaks the chain
      -- today with no row yet: nothing to evaluate, keep walking backward
    elsif v_row.status = 'pending' then
      exit when v_cursor <> v_today; -- a stale 'pending' on a past day also breaks
    elsif v_row.status = 'repair_window' then
      null; -- unresolved, not yet a break — skip it and keep counting behind it
    elsif v_row.status = 'broken' then
      exit;
    else -- 'completed' or 'freeze_applied'
      v_running := v_running + 1;
      v_current := v_running;
      if v_last_completed is null then
        v_last_completed := v_cursor;
      end if;
      if v_running > v_longest then
        v_longest := v_running;
      end if;
    end if;

    v_cursor := v_cursor - 1;
  end loop;

  update public.streak_state
  set current_streak = v_current,
      longest_streak = greatest(v_longest, streak_state.longest_streak),
      last_completed_date = coalesce(v_last_completed, streak_state.last_completed_date),
      freeze_credits = (select freeze_count from public.profiles where user_id = p_user_id),
      repair_credits = (select repair_credits from public.profiles where user_id = p_user_id),
      updated_at = now()
  where user_id = p_user_id;
end;
$$;

-- ---------------------------------------------------------------------
-- award_milestone_freezes — same milestone table as the old client logic,
-- called after a streak increments. Awards freeze credits, never revokes.
-- Internal helper, not exposed directly.
-- ---------------------------------------------------------------------
create function public.award_milestone_freezes(p_user_id uuid, p_streak integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_milestones integer[] := array[7, 30, 50, 100, 200, 365];
  v_m integer;
  v_awarded integer;
  v_current integer;
begin
  foreach v_m in array v_milestones loop
    if p_streak >= v_m and p_streak % v_m = 0 then
      v_awarded := p_streak / v_m;
      select freeze_count into v_current from public.profiles where user_id = p_user_id;
      if v_awarded > v_current then
        update public.profiles set freeze_count = v_awarded, updated_at = now()
        where user_id = p_user_id;
      end if;
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- evaluate_daily_status — the midnight-rollover state transition for one
-- LOCAL day that just ended. Called by the daily-streak-check Edge
-- Function (service-role key) once a user's local clock crosses into the
-- next day. Not exposed to authenticated/anon.
-- ---------------------------------------------------------------------
create function public.evaluate_daily_status(p_user_id uuid, p_local_date date)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tz text;
  v_row public.daily_records%rowtype;
  v_freezes integer;
  v_new_status text;
begin
  select timezone into v_tz from public.profiles where user_id = p_user_id;
  v_tz := coalesce(v_tz, 'UTC');

  select * into v_row from public.daily_records
  where user_id = p_user_id and local_date = p_local_date;

  if not found then
    insert into public.daily_records (user_id, local_date, status)
    values (p_user_id, p_local_date, 'pending')
    returning * into v_row;
  end if;

  if v_row.status != 'pending' then
    return v_row.status; -- already finalized (e.g. re-run of the same tick)
  end if;

  if v_row.github_contributed or v_row.leetcode_contributed then
    v_new_status := 'completed';
    update public.daily_records set status = 'completed', updated_at = now()
    where id = v_row.id;
  else
    select freeze_count into v_freezes from public.profiles where user_id = p_user_id;
    if v_freezes > 0 then
      v_new_status := 'freeze_applied';
      update public.profiles set freeze_count = freeze_count - 1, updated_at = now()
      where user_id = p_user_id;
      update public.daily_records
      set status = 'freeze_applied', freeze_applied = true, updated_at = now()
      where id = v_row.id;
    else
      v_new_status := 'repair_window';
      update public.daily_records
      set status = 'repair_window',
          -- 24h grace: local midnight of local_date+2, i.e. the end of the
          -- following calendar day in the user's own timezone.
          repair_deadline = ((p_local_date + 2)::timestamp at time zone v_tz),
          updated_at = now()
      where id = v_row.id;
    end if;
  end if;

  perform public.recompute_streak(p_user_id);

  if v_new_status = 'completed' then
    perform public.award_milestone_freezes(
      p_user_id,
      (select current_streak from public.streak_state where user_id = p_user_id)
    );
  end if;

  return v_new_status;
end;
$$;

-- ---------------------------------------------------------------------
-- record_activity — upserts today's contribution flags. Called by the
-- client (its own user_id) via the sync-activity Edge Function, or by
-- the scheduled job's best-effort LeetCode fetch (service-role key, no
-- auth.uid() in scope). Also resolves an earlier open repair_window: per
-- the plan's Day 1 / Day 2 rule, a real contribution landing on Day 2
-- satisfies Day 1's repair condition independently of whether Day 2
-- completes on its own merits.
-- ---------------------------------------------------------------------
create function public.record_activity(
  p_user_id uuid,
  p_local_date date,
  p_github boolean,
  p_leetcode boolean,
  p_leetcode_synced boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_open record;
begin
  -- A real (JWT-authenticated) caller may only write their own row. A
  -- null auth.uid() means this is running under the service-role key
  -- (the scheduled job), which is trusted server-side and passes through.
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'record_activity: cannot write another user''s data';
  end if;

  insert into public.daily_records (user_id, local_date, github_contributed, leetcode_contributed, leetcode_synced_at)
  values (p_user_id, p_local_date, p_github, p_leetcode, case when p_leetcode_synced then now() else null end)
  on conflict (user_id, local_date) do update set
    github_contributed = public.daily_records.github_contributed or excluded.github_contributed,
    leetcode_contributed = public.daily_records.leetcode_contributed or excluded.leetcode_contributed,
    leetcode_synced_at = coalesce(excluded.leetcode_synced_at, public.daily_records.leetcode_synced_at),
    updated_at = now();

  if p_github or p_leetcode then
    -- Resolve the single earliest still-open repair window, if any and
    -- still within its deadline (a contribution "anywhere in Day 2").
    select * into v_open from public.daily_records
    where user_id = p_user_id
      and status = 'repair_window'
      and repair_deadline > now()
    order by local_date asc
    limit 1;

    if found then
      update public.daily_records set status = 'completed', updated_at = now()
      where id = v_open.id;
    end if;
  end if;

  perform public.recompute_streak(p_user_id);
end;
$$;

-- ---------------------------------------------------------------------
-- import_historical_day — one-time localStorage-to-Supabase migration
-- (see client/src/lib/localImport.js). Unlike record_activity, this sets
-- a final status directly instead of running the state machine, because
-- we already know the historical outcome (the old client computed it).
-- A day with neither activity nor a used freeze gets no row at all, so
-- recompute_streak's gap handling treats it as a break, same as if it
-- had gone through the normal nightly rollover.
-- ---------------------------------------------------------------------
create function public.import_historical_day(
  p_user_id uuid,
  p_local_date date,
  p_github boolean,
  p_leetcode boolean,
  p_freeze_used boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'import_historical_day: cannot write another user''s data';
  end if;

  if p_github or p_leetcode then
    v_status := 'completed';
  elsif p_freeze_used then
    v_status := 'freeze_applied';
  else
    return;
  end if;

  insert into public.daily_records (user_id, local_date, github_contributed, leetcode_contributed, status, freeze_applied)
  values (p_user_id, p_local_date, p_github, p_leetcode, v_status, p_freeze_used)
  on conflict (user_id, local_date) do update set
    github_contributed = excluded.github_contributed,
    leetcode_contributed = excluded.leetcode_contributed,
    status = excluded.status,
    freeze_applied = excluded.freeze_applied,
    updated_at = now();
end;
$$;

-- ---------------------------------------------------------------------
-- use_repair_credit — explicit "Use Streak Repair" action from the UI.
-- ---------------------------------------------------------------------
create function public.use_repair_credit(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credits integer;
  v_open record;
begin
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'use_repair_credit: cannot spend another user''s credit';
  end if;

  select repair_credits into v_credits from public.profiles where user_id = p_user_id;
  if v_credits is null or v_credits <= 0 then
    return false;
  end if;

  select * into v_open from public.daily_records
  where user_id = p_user_id and status = 'repair_window' and repair_deadline > now()
  order by local_date asc
  limit 1;

  if not found then
    return false;
  end if;

  update public.profiles set repair_credits = repair_credits - 1, updated_at = now()
  where user_id = p_user_id;

  update public.daily_records set status = 'completed', updated_at = now()
  where id = v_open.id;

  perform public.recompute_streak(p_user_id);
  return true;
end;
$$;

-- ---------------------------------------------------------------------
-- expire_repair_windows — sweeps every user's overdue repair windows.
-- Called by daily-streak-check on every cron tick (cheap: only rows past
-- their deadline match the partial index above). Not exposed directly.
-- ---------------------------------------------------------------------
create function public.expire_repair_windows()
returns setof uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
begin
  for v_row in
    select id, user_id from public.daily_records
    where status = 'repair_window' and repair_deadline <= now()
  loop
    update public.daily_records set status = 'broken', updated_at = now()
    where id = v_row.id;
    perform public.recompute_streak(v_row.user_id);
    return next v_row.user_id;
  end loop;
  return;
end;
$$;

-- ---------------------------------------------------------------------
-- Function execute privileges — explicit allow-list.
-- Function owners (the migration role) can always call their own other
-- functions regardless of these grants, so revoking PUBLIC/authenticated
-- here does not break the internal call chains above.
-- ---------------------------------------------------------------------
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.recompute_streak(uuid) from public, anon, authenticated;
revoke execute on function public.award_milestone_freezes(uuid, integer) from public, anon, authenticated;
revoke execute on function public.evaluate_daily_status(uuid, date) from public, anon, authenticated;
revoke execute on function public.expire_repair_windows() from public, anon, authenticated;
revoke execute on function public.record_activity(uuid, date, boolean, boolean, boolean) from public, anon;
revoke execute on function public.use_repair_credit(uuid) from public, anon;
revoke execute on function public.import_historical_day(uuid, date, boolean, boolean, boolean) from public, anon;

grant execute on function public.record_activity(uuid, date, boolean, boolean, boolean) to authenticated;
grant execute on function public.use_repair_credit(uuid) to authenticated;
grant execute on function public.recompute_streak(uuid) to authenticated;
grant execute on function public.import_historical_day(uuid, date, boolean, boolean, boolean) to authenticated;
