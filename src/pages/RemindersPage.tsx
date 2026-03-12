import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash2, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Reminder {
  id: string;
  text: string;
  times: string[];
  active: boolean;
  created_at: string;
}

export default function RemindersPage() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    const { data } = await supabase
      .from('reminders')
      .select('*')
      .order('created_at', { ascending: false });
    setReminders(data || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const add = async () => {
    if (!text.trim() || !user) return;
    const { error } = await supabase.from('reminders').insert({ user_id: user.id, text: text.trim() });
    if (error) { toast.error(error.message); return; }
    setText('');
    fetch();
  };

  const toggle = async (id: string, active: boolean) => {
    await supabase.from('reminders').update({ active: !active }).eq('id', id);
    fetch();
  };

  const remove = async (id: string) => {
    await supabase.from('reminders').delete().eq('id', id);
    fetch();
  };

  return (
    <div className="mx-auto max-w-lg px-4 pt-12">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Promemoria</h1>

      <div className="mb-6 flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Nuovo promemoria..."
          className="flex-1 rounded-2xl border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button onClick={add} className="rounded-2xl bg-primary p-3 text-primary-foreground">
          <Plus size={20} />
        </button>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground">Caricamento...</p>
      ) : reminders.length === 0 ? (
        <p className="text-center text-muted-foreground">Nessun promemoria</p>
      ) : (
        <div className="space-y-3">
          {reminders.map(r => (
            <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
              <button onClick={() => toggle(r.id, r.active)}>
                <Clock size={18} className={r.active ? 'text-primary' : 'text-muted-foreground'} />
              </button>
              <span className={`flex-1 text-sm ${r.active ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                {r.text}
              </span>
              <button onClick={() => remove(r.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
