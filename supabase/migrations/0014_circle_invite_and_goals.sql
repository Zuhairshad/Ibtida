-- Add invite_code to community_circles
ALTER TABLE public.community_circles
  ADD COLUMN IF NOT EXISTS invite_code text UNIQUE DEFAULT gen_random_uuid()::text;
UPDATE public.community_circles SET invite_code = gen_random_uuid()::text WHERE invite_code IS NULL;
ALTER TABLE public.community_circles ALTER COLUMN invite_code SET NOT NULL;

-- SECURITY DEFINER RPC: join a circle by invite code (bypasses RLS so any signed-in user can look up the code)
CREATE OR REPLACE FUNCTION public.join_circle_by_code(p_code text, p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_circle_id uuid;
  v_circle_name text;
BEGIN
  SELECT id, name INTO v_circle_id, v_circle_name
  FROM public.community_circles
  WHERE invite_code = p_code;
  IF v_circle_id IS NULL THEN
    RAISE EXCEPTION 'No circle found with that invite code.';
  END IF;
  INSERT INTO public.circle_members (circle_id, user_id, role)
  VALUES (v_circle_id, p_user_id, 'member')
  ON CONFLICT (circle_id, user_id) DO NOTHING;
  RETURN json_build_object('circleId', v_circle_id, 'circleName', v_circle_name);
END;
$$;
