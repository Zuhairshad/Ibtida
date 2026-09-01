-- 0013_fix_circle_rls_recursion.sql
-- The original circle_members SELECT policy queried circle_members from within
-- itself, causing PostgreSQL to recurse infinitely whenever any query touched
-- both community_circles and circle_members (including the simple INSERT +
-- RETURNING on community_circles that createCircle does). A SECURITY DEFINER
-- helper function breaks the cycle — it runs with the function owner's
-- privileges, bypassing the outer RLS context so the membership subquery
-- doesn't trigger the policy it's part of.

create or replace function public.is_circle_member(p_circle_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.circle_members
    where circle_id = p_circle_id and user_id = p_user_id
  );
$$;

-- Fix circle_members SELECT (was self-referential → infinite recursion)
drop policy if exists "circle_members_select_fellow_member" on public.circle_members;
create policy "circle_members_select_fellow_member"
  on public.circle_members for select
  using (public.is_circle_member(circle_members.circle_id, auth.uid()));

-- Fix community_circles SELECT (used EXISTS on circle_members, triggering the recursion)
drop policy if exists "community_circles_select_member_or_owner" on public.community_circles;
create policy "community_circles_select_member_or_owner"
  on public.community_circles for select
  using (
    auth.uid() = created_by
    or public.is_circle_member(community_circles.id, auth.uid())
  );
