import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Send, Users, MessageSquare, Radio, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import PhrasesManager from '@/components/PhrasesManager';

interface Profile {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  created_at: string;
}

interface Message {
  id: string;
  text: string;
  from_role: 'user' | 'admin';
  created_at: string;
  user_id: string;
}

// ===== Users Tab =====
function UsersTab() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('profiles').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setProfiles(data || []); setLoading(false); });
  }, []);

  if (loading) return <p className="text-center text-muted-foreground py-8">Caricamento...</p>;

  return (
    <div className="space-y-2">
      {profiles.map(p => (
        <div key={p.id} className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground">{p.name || 'Senza nome'}</p>
          <p className="text-xs text-muted-foreground">{p.email}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {new Date(p.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
      ))}
      {profiles.length === 0 && <p className="text-center text-muted-foreground py-8">Nessun utente</p>}
    </div>
  );
}

// ===== Messages Tab =====
function MessagesTab() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from('profiles').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setProfiles(data || []));
  }, []);

  const fetchMessages = useCallback(async (userId: string) => {
    setLoadingMessages(true);
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    setMessages(data || []);
    setLoadingMessages(false);
  }, []);

  const selectUser = (p: Profile) => {
    setSelectedUser(p);
    fetchMessages(p.user_id);
  };

  // Realtime for selected user
  useEffect(() => {
    if (!selectedUser) return;
    const channel = supabase
      .channel(`admin-chat-${selectedUser.user_id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `user_id=eq.${selectedUser.user_id}` },
        (payload) => { setMessages(prev => [...prev, payload.new as Message]); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedUser]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendReply = async () => {
    if (!text.trim() || !selectedUser) return;
    // Admin inserts message with the user's user_id so they can see it
    const { error } = await supabase.from('messages').insert({
      user_id: selectedUser.user_id,
      text: text.trim(),
      from_role: 'admin',
    });
    if (error) { toast.error(error.message); return; }

    // Send push notification
    supabase.functions.invoke('send-push-notification', {
      body: {
        user_ids: [selectedUser.user_id],
        title: 'Vallo',
        body: text.trim().substring(0, 100),
        data: { url: '/messages' },
      },
    }).catch(() => {});

    setText('');
  };

  if (!selectedUser) {
    return (
      <div className="space-y-2">
        {profiles.map(p => (
          <button
            key={p.id}
            onClick={() => selectUser(p)}
            className="w-full text-left rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary"
          >
            <p className="text-sm font-medium text-foreground">{p.name || 'Senza nome'}</p>
            <p className="text-xs text-muted-foreground">{p.email}</p>
          </button>
        ))}
        {profiles.length === 0 && <p className="text-center text-muted-foreground py-8">Nessun utente</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 14rem)' }}>
      <button
        onClick={() => { setSelectedUser(null); setMessages([]); }}
        className="mb-3 text-xs text-primary hover:underline self-start"
      >
        ← Torna alla lista
      </button>
      <p className="mb-2 text-sm font-medium text-foreground">{selectedUser.name || selectedUser.email}</p>

      <div className="flex-1 overflow-y-auto space-y-2 pb-3">
        {loadingMessages ? (
          <p className="text-center text-muted-foreground py-4">Caricamento...</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">Nessun messaggio</p>
        ) : (
          messages.map(m => (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-2xl p-3 text-sm ${
                m.from_role === 'admin'
                  ? 'ml-auto bg-primary text-primary-foreground'
                  : 'mr-auto bg-card text-foreground border border-border'
              }`}
            >
              {m.text}
              <p className={`mt-1 text-[10px] ${m.from_role === 'admin' ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                {new Date(m.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 pt-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendReply()}
          placeholder="Rispondi..."
          className="flex-1 rounded-2xl border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button onClick={sendReply} className="rounded-2xl bg-primary p-3 text-primary-foreground hover:bg-primary/90 transition-colors">
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}

// ===== Broadcast Tab =====
function BroadcastTab() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const sendBroadcast = async () => {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    try {
      // Get all user IDs
      const { data: profiles } = await supabase.from('profiles').select('user_id');
      const userIds = (profiles || []).map(p => p.user_id);
      if (userIds.length === 0) { toast.error('Nessun utente trovato'); setSending(false); return; }

      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: { user_ids: userIds, title: title.trim(), body: body.trim() },
      });

      if (error) throw error;
      toast.success(`Notifica inviata a ${data.sent} dispositivi`);
      setTitle('');
      setBody('');
    } catch (err: any) {
      toast.error(err.message);
    }
    setSending(false);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Titolo notifica..."
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Corpo del messaggio..."
          rows={3}
          className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          onClick={sendBroadcast}
          disabled={sending || !title.trim() || !body.trim()}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <Radio size={16} />
          {sending ? 'Invio in corso...' : 'Invia broadcast'}
        </button>
      </div>
    </div>
  );
}

// ===== Main Admin Page =====
export default function AdminPage() {
  const { isAdmin } = useAuth();

  if (!isAdmin) return <Navigate to="/home" replace />;

  return (
    <div className="mx-auto max-w-lg px-4 pt-8 pb-24">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Admin</h1>

      <Tabs defaultValue="users">
        <TabsList className="w-full bg-secondary rounded-xl mb-4">
          <TabsTrigger value="users" className="flex-1 gap-1 rounded-lg data-[state=active]:bg-card">
            <Users size={14} /> Utenti
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex-1 gap-1 rounded-lg data-[state=active]:bg-card">
            <MessageSquare size={14} /> Messaggi
          </TabsTrigger>
          <TabsTrigger value="broadcast" className="flex-1 gap-1 rounded-lg data-[state=active]:bg-card">
            <Radio size={14} /> Broadcast
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="messages"><MessagesTab /></TabsContent>
        <TabsContent value="broadcast"><BroadcastTab /></TabsContent>
      </Tabs>
    </div>
  );
}
