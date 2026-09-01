-- get_circle_member_profiles: lets circle members fetch each other's display_name/avatar_url
-- Verifies caller is a member before returning data.
CREATE OR REPLACE FUNCTION public.get_circle_member_profiles(p_circle_id uuid)
RETURNS TABLE (user_id uuid, display_name text, avatar_url text, role text, joined_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_circle_member(p_circle_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not a member of this circle';
  END IF;
  RETURN QUERY
  SELECT cm.user_id, p.display_name, p.avatar_url, cm.role::text, cm.joined_at
  FROM public.circle_members cm
  LEFT JOIN public.profiles p ON p.id = cm.user_id
  WHERE cm.circle_id = p_circle_id
  ORDER BY cm.joined_at ASC;
END;
$$;

-- regenerate_circle_invite: resets invite_code, only callable by owner
CREATE OR REPLACE FUNCTION public.regenerate_circle_invite(p_circle_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_new_code text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.community_circles
    WHERE id = p_circle_id AND created_by = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not the owner of this circle';
  END IF;
  v_new_code := gen_random_uuid()::text;
  UPDATE public.community_circles SET invite_code = v_new_code WHERE id = p_circle_id;
  RETURN v_new_code;
END;
$$;

-- contribute_to_goal: atomic insert-or-increment for a user's progress on a goal
CREATE OR REPLACE FUNCTION public.contribute_to_goal(p_goal_id uuid, p_user_id uuid, p_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_new_progress numeric;
BEGIN
  INSERT INTO public.community_goal_members (goal_id, user_id, progress)
  VALUES (p_goal_id, p_user_id, p_amount)
  ON CONFLICT (goal_id, user_id)
  DO UPDATE SET progress = community_goal_members.progress + p_amount
  RETURNING progress INTO v_new_progress;
  RETURN v_new_progress;
END;
$$;
