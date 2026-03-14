import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash2, Clock, BellRing, X } from 'lucide-react';
import { toast } from 'sonner';

interface Reminder {
  id: string;
  text: string;
  times: string[] | null;
  active: boolean;
  created_at: string;
}

export default function RemindersPage() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [text, setText] = useState('');
  const [times, setTimes] = useState<string[]>(['']);
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const fetchReminders = async () => {
    const { data } = await supabase
      .from('reminders')
      .select('*')
      .order('created_at', { ascending: false });
    setReminders(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchReminders(); }, []);

  const addTimeSlot = () => {
    if (times.length < 3) setTimes([...times, '']);
  };

  const removeTimeSlot = (idx: number) => {
    setTimes(times.filter((_, i) => i !== idx));
  };

  const updateTime = (idx: number, val: string) => {
    const next = [...times];
    next[idx] = val;
    setTimes(next);
  };

  const add = async () => {
    if (!text.trim() || !user) return;
    const validTimes = times.filter(t => /^\d{2}:\d{2}$/.test(t));
    const { error } = await supabase.from('reminders').insert({
      user_id: user.id,
      text: text.trim(),
      times: validTimes.length > 0 ? validTimes : [],
    });
    if (error) { toast.error(error.message); return; }
    setText('');
    setTimes(['']);
    fetchReminders();
  };

  const toggle = async (id: string, active: boolean) => {
    await supabase.from('reminders').update({ active: !active }).eq('id', id);
    fetchReminders();
  };

  const remove = async (id: string) => {
    await supabase.from('reminders').delete().eq('id', id);
    fetchReminders();
  };

  const testPush = async () => {
    if (!user) return;
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          user_ids: [user.id],
          title: '🧪 Test Levante',
          body: 'Le notifiche push funzionano!',
        },
      });
      if (error) {
        setTestResult(`❌ Errore: ${error.message}`);
      } else {
        setTestResult(`✅ Inviate: ${data.sent} | Risultati: ${JSON.stringify(data.results)}`);
      }
    } catch (err: any) {
      setTestResult(`❌ Errore: ${err.message}`);
    }
    setTesting(false);
  };

  return (
    <div className="mx-auto max-w-lg px-4 pt-8 pb-24">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Promemoria</h1>

      {/* Add form */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-4 space-y-3">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Testo del promemoria..."
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Orari (HH:MM)</p>
          {times.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="time"
                value={t}
                onChange={e => updateTime(i, e.target.value)}
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary [color-scheme:dark]"
              />
              {times.length > 1 && (
                <button onClick={() => removeTimeSlot(i)} className="text-muted-foreground hover:text-destructive">
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
          {times.length < 3 && (
            <button onClick={addTimeSlot} className="text-xs text-primary hover:underline">
              + Aggiungi orario
            </button>
          )}
        </div>

        <button
          onClick={add}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus size={16} />
          Aggiungi promemoria
        </button>
      </div>

      {/* Test push */}
      <button
        onClick={testPush}
        disabled={testing}
        className="mb-4 w-full flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary disabled:opacity-50"
      >
        <BellRing size={16} />
        {testing ? 'Invio in corso...' : 'Testa notifica push'}
      </button>

      {testResult && (
        <div className="mb-4 rounded-xl border border-border bg-secondary p-3 text-xs text-foreground font-mono break-all">
          {testResult}
        </div>
      )}

      {/* List */}
      {loading ? (
        <p className="text-center text-muted-foreground">Caricamento...</p>
      ) : reminders.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Nessun promemoria</p>
      ) : (
        <div className="space-y-3">
          {reminders.map(r => (
            <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
              <button onClick={() => toggle(r.id, r.active)}>
                <Clock size={18} className={r.active ? 'text-primary' : 'text-muted-foreground'} />
              </button>
              <div className="flex-1 min-w-0">
                <span className={`block text-sm ${r.active ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                  {r.text}
                </span>
                {r.times && r.times.length > 0 && (
                  <span className="text-xs text-muted-foreground">{r.times.join(', ')}</span>
                )}
              </div>
              <button onClick={() => remove(r.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
