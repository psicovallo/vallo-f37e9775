import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash2, Clock, BellRing, X, Bell, Zap, Swords } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';

interface Reminder {
  id: string;
  text: string;
  times: string[] | null;
  active: boolean;
  created_at: string;
}

interface NotifSettings {
  notify_questions: boolean;
  notify_dna: boolean;
  daily_times: string[] | null;
  dna_daily_times: string[] | null;
}

export default function RemindersPage() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [text, setText] = useState('');
  const [times, setTimes] = useState<string[]>(['']);
  const [loading, setLoading] = useState(true);
  const [notifSettings, setNotifSettings] = useState<NotifSettings | null>(null);
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

  const fetchNotifSettings = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('question_progress')
      .select('notify_questions, notify_dna, daily_times, dna_daily_times')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      setNotifSettings(data as unknown as NotifSettings);
    }
  };

  useEffect(() => {
    fetchReminders();
    fetchNotifSettings();
  }, [user]);

  const toggleNotifSetting = async (field: 'notify_questions' | 'notify_dna', current: boolean) => {
    if (!user) return;
    await supabase.from('question_progress')
      .update({ [field]: !current } as any)
      .eq('user_id', user.id);
    setNotifSettings(prev => prev ? { ...prev, [field]: !current } : null);
    toast.success(!current ? 'Notifiche attivate' : 'Notifiche disattivate');
  };

  const addTimeSlot = () => { if (times.length < 3) setTimes([...times, '']); };
  const removeTimeSlot = (idx: number) => { setTimes(times.filter((_, i) => i !== idx)); };
  const updateTime = (idx: number, val: string) => { const next = [...times]; next[idx] = val; setTimes(next); };

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
        body: { user_ids: [user.id], title: '🧪 Test Vallo', body: 'Le notifiche push funzionano!' },
      });
      if (error) setTestResult(`❌ Errore: ${error.message}`);
      else setTestResult(`✅ Inviate: ${data.sent} | Risultati: ${JSON.stringify(data.results)}`);
    } catch (err: any) {
      setTestResult(`❌ Errore: ${err.message}`);
    }
    setTesting(false);
  };

  return (
    <div className="mx-auto max-w-lg px-4 pt-8 pb-24">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Promemoria & Notifiche</h1>

      {/* ── NOTIFICATION SETTINGS ── */}
      {notifSettings && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-4 space-y-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Bell size={16} className="text-primary" />
            Notifiche Automatiche
          </h2>

          {/* Questions switch */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Zap size={14} className="text-amber-500" />
                Domande di Riflessione
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                6 notifiche al giorno per memorizzare le domande
              </p>
              {notifSettings.notify_questions && notifSettings.daily_times?.length ? (
                <p className="text-xs text-primary mt-1">
                  🔥 Oggi: {notifSettings.daily_times.join(', ')}
                </p>
              ) : null}
            </div>
            <Switch
              checked={notifSettings.notify_questions}
              onCheckedChange={() => toggleNotifSetting('notify_questions', notifSettings.notify_questions)}
            />
          </div>

          {/* DNA switch */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Swords size={14} className="text-red-500" />
                SOS DNA
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Fino a 6 notifiche al giorno per ogni profilo attivo
              </p>
              {notifSettings.notify_dna && notifSettings.dna_daily_times?.length ? (
                <p className="text-xs text-primary mt-1">
                  ⚔️ Oggi: {notifSettings.dna_daily_times.join(', ')}
                </p>
              ) : null}
            </div>
            <Switch
              checked={notifSettings.notify_dna}
              onCheckedChange={() => toggleNotifSetting('notify_dna', notifSettings.notify_dna)}
            />
          </div>
        </div>
      )}

      {/* ── ADD REMINDER FORM ── */}
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
            <button onClick={addTimeSlot} className="text-xs text-primary hover:underline">+ Aggiungi orario</button>
          )}
        </div>
        <button onClick={add} className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          <Plus size={16} /> Aggiungi promemoria
        </button>
      </div>

      {/* Test push */}
      <button onClick={testPush} disabled={testing} className="mb-4 w-full flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary disabled:opacity-50">
        <BellRing size={16} />
        {testing ? 'Invio in corso...' : 'Testa notifica push'}
      </button>

      {testResult && (
        <div className="mb-4 rounded-xl border border-border bg-secondary p-3 text-xs text-foreground font-mono break-all">{testResult}</div>
      )}

      {/* ── REMINDERS LIST ── */}
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
                <span className={`block text-sm ${r.active ? 'text-foreground' : 'text-muted-foreground line-through'}`}>{r.text}</span>
                {r.times && r.times.length > 0 && <span className="text-xs text-muted-foreground">{r.times.join(', ')}</span>}
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
