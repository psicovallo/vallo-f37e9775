
# Chat Interna tra Utenti (con Audio + Trascrizione)

Una nuova sezione "Chat" separata dalla MessagesPage admin esistente. Stile WhatsApp: lista utenti → conversazione 1-a-1 → testo + audio. Gli audio vengono trascritti automaticamente (riusando `transcribe-audio` / Groq Whisper), il destinatario può ascoltare l'audio E scaricare il trascritto come `.txt`. UI in inglese di default, switch lingua nella chat (cambia solo la UI/etichette, non i messaggi).

> Nota: la memoria di progetto vieta "Chatta con Vallo" (chat con AI). Questa è chat **utente↔utente**, non viola il vincolo.

## Sezione 1 – Database (migrazione)

Nuove tabelle:

**`user_chats`** (conversazione 1-a-1)
- `id uuid pk`, `user_a uuid`, `user_b uuid` (ordinati alfabeticamente per unicità), `created_at`, `last_message_at`
- unique (user_a, user_b)

**`user_chat_messages`**
- `id uuid pk`
- `chat_id uuid → user_chats.id`
- `sender_id uuid` (auth.users)
- `recipient_id uuid`
- `body text` (testo o trascrizione audio)
- `audio_path text null` (path in storage bucket `chat-audio`)
- `audio_duration_sec int null`
- `transcript text null` (trascritto Whisper)
- `transcript_lang text default 'en'`
- `read_at timestamptz null`
- `created_at timestamptz default now()`

**Storage bucket** `chat-audio` (privato), RLS: utente può leggere/scrivere solo file il cui path inizia con `{chat_id}/` se è membro della chat.

**RLS** su entrambe le tabelle: SELECT/INSERT consentito solo se `auth.uid() in (user_a, user_b)` / `auth.uid() in (sender_id, recipient_id)`.

**Realtime**: `ALTER PUBLICATION supabase_realtime ADD TABLE public.user_chat_messages;`

## Sezione 2 – Edge function `chat-send-audio`

Riceve `multipart/form-data` con `audio`, `chat_id`, `recipient_id`, `language` (default `en`).
1. Valida che il sender sia membro della chat (JWT).
2. Carica l'audio nel bucket `chat-audio/{chat_id}/{uuid}.webm` con service role.
3. Chiama Groq Whisper (riutilizzando la stessa logica di `transcribe-audio`) con `language` selezionata.
4. INSERT in `user_chat_messages` con `audio_path`, `transcript`, `transcript_lang`, `body = transcript`.
5. Aggiorna `last_message_at` su `user_chats`.
6. Ritorna il messaggio creato.

## Sezione 3 – Frontend

### Nuova route `/chat`
Aggiungere in `App.tsx` dentro `<AppLayout>`. Voce nel `HamburgerMenu` con icona `MessagesSquare` → "Chat".

### Pagina `ChatPage.tsx` (lista chat + utenti)
- Header con switch lingua (`en | it | es | fr | de | pt`) salvato in `localStorage` chiave `chat_ui_lang`.
- Pulsante "New chat" → modal con lista utenti pescati da `profiles` (mostra `name`, `email`). Click su utente → upsert riga in `user_chats` e apre conversazione.
- Lista delle chat esistenti dell'utente con anteprima ultimo messaggio.

### Pagina `ChatConversationPage.tsx` (`/chat/:chatId`)
Stile WhatsApp:
- Bubble destra (mie) / sinistra (loro).
- Per messaggi audio: `<audio controls src={signedUrl}>` + badge "Transcript ready" + bottone **Download .txt** (genera Blob da `transcript` e fa download `transcript-{id}.txt`).
- Toggle "Show transcript" inline.
- Input bar:
  - Textbox + send.
  - Pulsante mic (riusa pattern di `VoiceInput.tsx` con `MediaRecorder`). Stop registrazione → upload via `supabase.functions.invoke('chat-send-audio', {body: formData})`.
- Realtime subscribe su `user_chat_messages` filtrato `chat_id=eq.{id}`.
- Auto-mark `read_at` quando il messaggio è visibile.

### URL firmati per l'audio
Bucket privato → genera signed URL con `supabase.storage.from('chat-audio').createSignedUrl(path, 3600)` quando si renderizza il player.

## Sezione 4 – i18n leggera (UI chat)
Piccolo dizionario `src/lib/chat-i18n.ts` con stringhe base ("New chat", "Type a message", "Recording…", "Download transcript", ecc.) per le 6 lingue. Hook `useChatLang()` che legge `localStorage`.

## Sezione 5 – Memoria
Aggiornare `mem://constraints` o equivalente: il vincolo "no internal chat" si riferiva a chat con AI Vallo. Annotare che ora esiste **chat utente↔utente** in `/chat`, distinta dalle messaggi admin in `/messages`.

## File da creare / modificare

Nuovi:
- `supabase/migrations/<ts>_user_chat.sql` (tabelle + RLS + storage bucket + realtime)
- `supabase/functions/chat-send-audio/index.ts`
- `src/pages/ChatPage.tsx`
- `src/pages/ChatConversationPage.tsx`
- `src/lib/chat-i18n.ts`

Modificati:
- `src/App.tsx` – aggiungere route `/chat` e `/chat/:chatId`
- `src/components/HamburgerMenu.tsx` – voce "Chat"
- `mem://index.md` (+ eventuale file constraint)

## Domande aperte (rispondi se vuoi cambiare default)
1. Le chat sono **1-a-1** (default) o anche di gruppo?
2. Gli utenti selezionabili sono **tutti** quelli registrati o solo quelli loggati con Google? (Default proposto: tutti gli utenti con un `profiles.name`. Filtrare solo Google è possibile leggendo `auth.users.app_metadata.providers`, ma richiede service role.)
3. Lingua default UI = **English**, confermi?
