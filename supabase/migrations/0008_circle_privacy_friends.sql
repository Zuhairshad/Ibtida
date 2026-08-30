-- 0008_circle_privacy_friends.sql
--
-- CircleNewScreen (src/screens/community/CircleNewScreen.tsx) has always
-- offered three "who can join" options: 'Invite only', 'Private', 'Friends'.
-- 0006_community.sql's check constraint on community_circles.privacy only
-- allowed ('Invite only', 'Private', 'Public') — it never included 'Friends',
-- so creating a circle with that option selected would fail the CHECK at
-- insert time. This widens the constraint to match the screen that already
-- shipped, without touching the original migration file. 'Public' is kept
-- for backward compatibility with any row already using it; RLS itself does
-- not branch on this value (see 0006's policy comments), so this is a pure
-- data-shape fix with no access-control implications.

alter table public.community_circles
  drop constraint if exists community_circles_privacy_check;

alter table public.community_circles
  add constraint community_circles_privacy_check
  check (privacy in ('Invite only', 'Private', 'Friends', 'Public'));
