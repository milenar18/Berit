create policy "Admins can view customer profiles"
  on public.profiles for select to authenticated
  using ((select private.is_admin()));
