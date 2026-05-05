import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, X, MessageSquare, Globe } from 'lucide-react';
import { CHAT_LANGS, ChatLang, getChatLang, setChatLang, t } from '@/lib/chat-i18n';

interface ChatRow { id: string; user_a: string; user_b: string; last_message_at: string; }
interface ProfileLite { user_id: string; name: string | null; email: string | null; }

export default function ChatPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [lang, setLang] = useState<ChatLang>(getChatLang());
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [showPicker, setShowPicker] = useState(false);
  const [allUsers, setAllUsers] = useState<ProfileLite[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => { setChatLang(lang); }, [lang]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('user_chats')
        .select('*')
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .order('last_message_at', { ascending: false });
      const list = (data as ChatRow[]) || [];
      setChats(list);
      const otherIds = Array.from(new Set(list.map(c => c.user_a === user.id ? c.user_b : c.user_a)));
      if (otherIds.length) {
        const map: Record<string, ProfileLite> = {};
        await Promise.all(otherIds.map(async id => {
          const { data } = await supabase.rpc('get_chat_profile' as any, { _user_id: id });
          const row = (data as any[])?.[0];
          if (row) map[id] = row;
        }));
        setProfiles(map);
      }
    })();
  }, [user]);

  const openPicker = async () => {
    setShowPicker(true);
    if (allUsers.length === 0) {
      const { data } = await supabase.rpc('list_chat_directory' as any, { _search: '' });
      setAllUsers((data as any) || []);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allUsers;
    return allUsers.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q)
    );
  }, [search, allUsers]);

  const startChat = async (other: ProfileLite) => {
    if (!user) return;
    const [a, b] = [user.id, other.user_id].sort();
    // Try find existing
    const { data: existing } = await supabase
      .from('user_chats').select('id').eq('user_a', a).eq('user_b', b).maybeSingle();
    let chatId = (existing as any)?.id;
    if (!chatId) {
      const { data: created, error } = await supabase
        .from('user_chats').insert({ user_a: a, user_b: b }).select('id').single();
      if (error) { console.error(error); return; }
      chatId = (created as any).id;
    }
    nav(`/chat/${chatId}`);
  };

  return (
    <div className="mx-auto max-w-lg px-4 pt-6 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <MessageSquare size={22} /> {t(lang, 'chat')}
        </h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-border bg-card px-2 py-1">
            <Globe size={14} className="text-muted-foreground" />
            <select value={lang} onChange={e => setLang(e.target.value as ChatLang)}
              className="bg-transparent text-xs text-foreground focus:outline-none">
              {CHAT_LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
          <button onClick={openPicker}
            className="flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            <Plus size={14} /> {t(lang, 'new_chat')}
          </button>
        </div>
      </div>

      {chats.length === 0 ? (
        <p className="text-center text-muted-foreground py-12 text-sm">{t(lang, 'no_chats')}</p>
      ) : (
        <ul className="space-y-2">
          {chats.map(c => {
            const otherId = c.user_a === user?.id ? c.user_b : c.user_a;
            const p = profiles[otherId];
            return (
              <li key={c.id}>
                <Link to={`/chat/${c.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:bg-muted transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                    {(p?.name || p?.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p?.name || p?.email || 'User'}</p>
                    <p className="text-xs text-muted-foreground truncate">{p?.email}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(c.last_message_at).toLocaleDateString()}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {showPicker && (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">{t(lang, 'select_user')}</h3>
              <button onClick={() => setShowPicker(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="p-3 border-b border-border flex items-center gap-2">
              <Search size={16} className="text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t(lang, 'search_user')}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtered.map(p => (
                <button key={p.user_id} onClick={() => startChat(p)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-muted text-left transition-colors">
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-semibold">
                    {(p.name || p.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate">{p.name || '—'}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-6">—</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}