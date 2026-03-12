-- Fix: restrict push_subscriptions INSERT to authenticated users but allow any user_id (for service role)
DROP POLICY "Users can insert push subs" ON public.push_subscriptions;
CREATE POLICY "Authenticated can insert push subs" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (true);