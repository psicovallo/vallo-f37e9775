import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Send, Trash2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import PhrasePicker from '@/components/PhrasePicker';

interface Message {
  id: string;
  text: string;
  from_role: 'user' | 'admin';
  created_at: string;
}

const ADMIN_SOUND_URL = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJeXl4F0bn6Xm5iFdG14lZuViXZteJOal4p4bXiRmZeLeW14kJiWi3pteI+Xl4x7bXiOlpaMe214jpWVjH1teI2UlYx+bXiMk5SNf214jJKTjYBteIuRkoyBbXiLkJKMgm14io+RjINteIqOkIyEbXiJjY+MhW14iYyOjIZteIiLjYuHbXiIioyLiG14h4mLi4lteIeIiouKbXiGh4mKi214hoaIiYxteIaFiImMbXiFhIeIjW14hYOHh41teISChoeObXiEgYWGjm14g4CEhY9teIOAhIWPbXiDf4OEkG14gn+Dg5BteIJ+goOQbXiBfYGCkW14gX2BgZFteIF8gIGRbA==';

export default function MessagesPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [showPhrases, setShowPhrases] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messageCountRef = useRef(0);

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true });
    setMessages(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    audioRef.current = new Audio(ADMIN_SOUND_URL);
    fetchMessages();
  }, [fetchMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as Message;
            setMessages(prev => [...prev, newMsg]);
            if (newMsg.from_role === 'admin') {
              audioRef.current?.play().catch(() => {});
            }
          } else if (payload.eventType === 'DELETE') {
            fetchMessages();
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!text.trim() || !user) return;
    const { error } = await supabase.from('messages').insert({
      user_id: user.id,
      text: text.trim(),
      from_role: 'user',
    });
    if (error) { toast.error(error.message); return; }
    setText('');
  };

  const clearChat = async () => {
    if (!user) return;
    const { error } = await supabase.from('messages').delete().eq('user_id', user.id);
    if (error) { toast.error(error.message); return; }
    setMessages([]);
    toast.success('Chat cancellata');
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-5rem)] max-w-lg flex-col px-4 pt-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Messaggi</h1>
        <button onClick={clearChat} className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors">
          <Trash2 size={14} />
          Pulisci chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {loading ? (
          <p className="text-center text-muted-foreground py-8">Caricamento...</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nessun messaggio</p>
        ) : (
          messages.map(m => (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-2xl p-3 text-sm ${
                m.from_role === 'user'
                  ? 'ml-auto bg-primary text-primary-foreground'
                  : 'mr-auto bg-card text-foreground border border-border'
              }`}
            >
              {m.text}
              <p className={`mt-1 text-[10px] ${m.from_role === 'user' ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                {new Date(m.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 pb-4">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Scrivi un messaggio..."
          className="flex-1 rounded-2xl border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button onClick={send} className="rounded-2xl bg-primary p-3 text-primary-foreground transition-colors hover:bg-primary/90">
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
