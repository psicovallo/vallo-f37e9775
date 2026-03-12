import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Send } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  text: string;
  from_role: 'user' | 'admin';
  created_at: string;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true });
    setMessages(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchMessages(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!text.trim() || !user) return;
    const { error } = await supabase.from('messages').insert({
      user_id: user.id,
      text: text.trim(),
      from_role: 'user',
    });
    if (error) { toast.error(error.message); return; }
    setText('');
    fetchMessages();
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-5rem)] max-w-lg flex-col px-4 pt-12">
      <h1 className="mb-4 text-2xl font-bold text-foreground">Messaggi</h1>

      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {loading ? (
          <p className="text-center text-muted-foreground">Caricamento...</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-muted-foreground">Nessun messaggio</p>
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
        <button onClick={send} className="rounded-2xl bg-primary p-3 text-primary-foreground">
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
