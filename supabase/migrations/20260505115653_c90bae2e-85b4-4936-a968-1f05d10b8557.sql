
CREATE OR REPLACE FUNCTION public.list_chat_directory(_search TEXT DEFAULT '')
RETURNS TABLE(user_id UUID, name TEXT, email TEXT)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.user_id, p.name, p.email
  FROM public.profiles p
  WHERE p.user_id <> auth.uid()
    AND auth.uid() IS NOT NULL
    AND (
      _search = '' OR
      p.name ILIKE '%' || _search || '%' OR
      p.email ILIKE '%' || _search || '%'
    )
  ORDER BY p.name NULLS LAST
  LIMIT 200;
$$;

REVOKE ALL ON FUNCTION public.list_chat_directory(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_chat_directory(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_chat_profile(_user_id UUID)
RETURNS TABLE(user_id UUID, name TEXT, email TEXT)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.user_id, p.name, p.email
  FROM public.profiles p
  WHERE p.user_id = _user_id
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_chats c
      WHERE (c.user_a = auth.uid() AND c.user_b = _user_id)
         OR (c.user_b = auth.uid() AND c.user_a = _user_id)
    );
$$;

REVOKE ALL ON FUNCTION public.get_chat_profile(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_chat_profile(UUID) TO authenticated;
