import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Send, Mic, Square, Loader2, Download, FileText, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { CHAT_LANGS, ChatLang, getChatLang, setChatLang, t } from '@/lib/chat-i18n';

interface Msg {
  id: string; chat_id: string; sender_id: string; recipient_id: string;
  body: string; audio_path: string | null; transcript: string | null;
  transcript_lang: string; created_at: string;
}

export default function ChatConversationPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const { user } = useAuth();
  const [lang, setLang] = useState<ChatLang>(getChatLang());
  const [transcribeLang, setTranscribeLang] = useState<ChatLang>(getChatLang());
  const [messages, setMessages] = useState<Msg[]>([]);
  const [other, setOther] = useState<{ user_id: string; name: string | null; email: string | null } | null>(null);
  const [text, setText] = useState('');
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [showTranscript, setShowTranscript] = useState<Record<string, boolean>>({});
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [duration, setDuration] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setChatLang(lang); }, [lang]);

  // Load chat + messages + other user
  useEffect(() => {
    if (!chatId || !user) return;
    (async () => {
      const { data: chat } = await supabase.from('user_chats').select('*').eq('id', chatId).maybeSingle();
      if (!chat) return;
      const otherId = (chat as any).user_a === user.id ? (chat as any).user_b : (chat as any).user_a;
      const { data: prof } = await supabase.rpc('get_chat_profile' as any, { _user_id: otherId });
      setOther((prof as any[])?.[0] || { user_id: otherId, name: null, email: null });

      const { data: msgs } = await supabase
        .from('user_chat_messages').select('*').eq('chat_id', chatId).order('created_at');
      setMessages((msgs as Msg[]) || []);
    })();
  }, [chatId, user]);

  // Realtime
  useEffect(() => {
    if (!chatId) return;
    const channel = supabase.channel(`chat-${chatId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_chat_messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const m = payload.new as Msg;
          setMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [chatId]);

  // Sign URLs for audio
  useEffect(() => {
    const missing = messages.filter(m => m.audio_path && !audioUrls[m.id]);
    if (missing.length === 0) return;
    (async () => {
      const updates: Record<string, string> = {};
      for (const m of missing) {
        const { data } = await supabase.storage.from('chat-audio').createSignedUrl(m.audio_path!, 3600);
        if (data?.signedUrl) updates[m.id] = data.signedUrl;
      }
      if (Object.keys(updates).length) setAudioUrls(prev => ({ ...prev, ...updates }));
    })();
  }, [messages, audioUrls]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendText = async () => {
    if (!text.trim() || !user || !chatId || !other) return;
    const body = text.trim();
    setText('');
    const { error } = await supabase.from('user_chat_messages').insert({
      chat_id: chatId, sender_id: user.id, recipient_id: other.user_id, body,
    });
    if (error) { toast.error(error.message); return; }
    await supabase.from('user_chats').update({ last_message_at: new Date().toISOString() }).eq('id', chatId);
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach(tr => tr.stop());
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        const dur = duration;
        setDuration(0);
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        if (blob.size < 1000) { toast.error('Too short'); setIsRecording(false); return; }
        setIsUploading(true);
        try {
          const fd = new FormData();
          fd.append('audio', blob, 'rec.webm');
          fd.append('chat_id', chatId!);
          fd.append('recipient_id', other!.user_id);
          fd.append('language', transcribeLang);
          fd.append('duration', String(dur));
          const { error } = await supabase.functions.invoke('chat-send-audio', { body: fd });
          if (error) throw error;
        } catch (e: any) {
          toast.error(e.message || 'Upload failed');
        } finally {
          setIsUploading(false);
          setIsRecording(false);
        }
      };
      rec.start(1000);
      recorderRef.current = rec;
      setIsRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch {
      toast.error('Microphone denied');
    }
  }, [chatId, other, transcribeLang, duration]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
  }, []);

  const downloadTranscript = (m: Msg) => {
    const content = m.transcript || m.body || '';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${m.id.slice(0, 8)}.txt`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const fmt = (s: number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

  return (
    <div className="mx-auto flex h-[calc(100vh-5rem)] max-w-lg flex-col px-3 pt-4">
      <div className="flex items-center gap-2 pb-3 border-b border-border">
        <Link to="/chat" className="text-muted-foreground hover:text-foreground"><ArrowLeft size={20} /></Link>
        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-semibold">
          {(other?.name || other?.email || '?').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{other?.name || other?.email || '...'}</p>
          <p className="text-[10px] text-muted-foreground truncate">{other?.email}</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1">
          <Globe size={12} className="text-muted-foreground" />
          <select value={lang} onChange={e => { const v = e.target.value as ChatLang; setLang(v); setTranscribeLang(v); }}
            className="bg-transparent text-[11px] text-foreground focus:outline-none">
            {CHAT_LANGS.map(l => <option key={l.code} value={l.code}>{l.code.toUpperCase()}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {messages.map(m => {
          const mine = m.sender_id === user?.id;
          const isAudio = !!m.audio_path;
          const showT = !!showTranscript[m.id];
          return (
            <div key={m.id} className={`max-w-[82%] rounded-2xl p-3 text-sm ${mine ? 'ml-auto bg-primary text-primary-foreground' : 'mr-auto bg-card text-foreground border border-border'}`}>
              {isAudio ? (
                <div className="space-y-2">
                  {audioUrls[m.id] ? (
                    <audio controls src={audioUrls[m.id]} className="w-full max-w-[260px]" />
                  ) : (
                    <p className="text-xs opacity-70">Loading audio…</p>
                  )}
                  {m.transcript && (
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setShowTranscript(s => ({ ...s, [m.id]: !s[m.id] }))}
                        className={`text-[11px] inline-flex items-center gap-1 rounded-full px-2 py-1 ${mine ? 'bg-primary-foreground/20' : 'bg-muted'}`}>
                        <FileText size={11} /> {showT ? t(lang, 'hide_transcript') : t(lang, 'show_transcript')}
                      </button>
                      <button onClick={() => downloadTranscript(m)}
                        className={`text-[11px] inline-flex items-center gap-1 rounded-full px-2 py-1 ${mine ? 'bg-primary-foreground/20' : 'bg-muted'}`}>
                        <Download size={11} /> {t(lang, 'download_txt')}
                      </button>
                    </div>
                  )}
                  {showT && m.transcript && (
                    <p className={`text-xs whitespace-pre-wrap ${mine ? 'text-primary-foreground/90' : 'text-muted-foreground'}`}>{m.transcript}</p>
                  )}
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{m.body}</p>
              )}
              <p className={`mt-1 text-[10px] ${mine ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                {new Date(m.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 pb-4 pt-2 border-t border-border">
        <input value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendText()}
          placeholder={t(lang, 'type_message')}
          disabled={isRecording || isUploading}
          className="flex-1 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50" />
        {text.trim() ? (
          <button onClick={sendText} className="rounded-2xl bg-primary p-3 text-primary-foreground hover:bg-primary/90">
            <Send size={18} />
          </button>
        ) : (
          <button onClick={isRecording ? stopRecording : startRecording} disabled={isUploading}
            className={`rounded-2xl p-3 transition-colors ${isRecording ? 'bg-destructive text-destructive-foreground animate-pulse' : isUploading ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}>
            {isUploading ? <Loader2 size={18} className="animate-spin" /> : isRecording ? <Square size={18} /> : <Mic size={18} />}
          </button>
        )}
      </div>
      {isRecording && (
        <p className="text-[11px] text-destructive text-center -mt-2 pb-2">🔴 {t(lang, 'recording')} {fmt(duration)}</p>
      )}
      {isUploading && (
        <p className="text-[11px] text-primary text-center -mt-2 pb-2">{t(lang, 'transcribing')}</p>
      )}
    </div>
  );
}