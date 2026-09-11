-- Self-service account deletion, backing the new "Delete Account" UI
-- (DeleteButton in SettingsForm). Deleting the auth.users row cascades to
-- profiles/streak_state/daily_records/push_subscriptions/notification_log
-- via the ON DELETE CASCADE foreign keys already defined in the init
-- migration — this function only needs to remove the auth.users row itself.
create function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'delete_own_account: no authenticated user';
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
