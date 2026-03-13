-- Admin can read all messages
CREATE POLICY "Admins can view all messages" ON public.messages
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin can insert messages for any user (replying as admin)
CREATE POLICY "Admins can insert messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin can delete any messages
CREATE POLICY "Admins can delete messages" ON public.messages
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Users can delete own messages
CREATE POLICY "Users can delete own messages" ON public.messages
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Admin can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));