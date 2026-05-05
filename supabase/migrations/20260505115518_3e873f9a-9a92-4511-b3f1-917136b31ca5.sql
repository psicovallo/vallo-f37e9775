
-- Conversations
CREATE TABLE public.user_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL,
  user_b UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_chats_ordered CHECK (user_a < user_b),
  CONSTRAINT user_chats_unique UNIQUE (user_a, user_b)
);

ALTER TABLE public.user_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view own chats" ON public.user_chats
FOR SELECT TO authenticated
USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "Members create own chats" ON public.user_chats
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "Members update own chats" ON public.user_chats
FOR UPDATE TO authenticated
USING (auth.uid() = user_a OR auth.uid() = user_b);

-- Messages
CREATE TABLE public.user_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.user_chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  audio_path TEXT,
  audio_duration_sec INTEGER,
  transcript TEXT,
  transcript_lang TEXT NOT NULL DEFAULT 'en',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX user_chat_messages_chat_idx ON public.user_chat_messages(chat_id, created_at DESC);

ALTER TABLE public.user_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view chat messages" ON public.user_chat_messages
FOR SELECT TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Sender inserts message" ON public.user_chat_messages
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipient updates read state" ON public.user_chat_messages
FOR UPDATE TO authenticated
USING (auth.uid() = recipient_id OR auth.uid() = sender_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_chat_messages;
ALTER TABLE public.user_chat_messages REPLICA IDENTITY FULL;

-- Storage bucket for chat audio (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-audio', 'chat-audio', false)
ON CONFLICT (id) DO NOTHING;

-- Helper: check chat membership
CREATE OR REPLACE FUNCTION public.is_chat_member(_chat_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.user_chats
    WHERE id = _chat_id AND (_user_id = user_a OR _user_id = user_b)
  );
$$;

CREATE POLICY "Chat members read audio" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-audio'
  AND public.is_chat_member( ((storage.foldername(name))[1])::uuid, auth.uid())
);

CREATE POLICY "Chat members upload audio" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-audio'
  AND public.is_chat_member( ((storage.foldername(name))[1])::uuid, auth.uid())
);
