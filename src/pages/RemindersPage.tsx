import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash2, Clock, BellRing, X, Bell, Zap, Swords, Flame, Settings, Pencil, Check, XCircle, Target } from 'lucide-react';
import VoiceInput from '@/components/VoiceInput';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import NotificationCategoryEditor from '@/components/NotificationCategoryEditor';
import NotificationHistory from '@/components/NotificationHistory';

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
  notify_sfogo: boolean;
  notify_overton: boolean;
  daily_times: string[] | null;
  dna_daily_times: string[] | null;
  sfogo_daily_times: string[] | null;
  questions_per_day: number;
  dna_per_day: number;
  sfogo_per_day: number;
  questions_frequency: string;
  dna_frequency: string;
  sfogo_frequency: string;
  notification_window_start: string | null;
  notification_window_end: string | null;
  notify_days: string[];
  custom_questions_text: string | null;
  custom_dna_text: string | null;
  custom_sfogo_text: string | null;
  custom_overton_text: string | null;
}

type EditorCategory = 'questions' | 'dna' | 'sfogo' | 'overton';

const ALL_DAYS = [
  { key: 'lun', label: 'L' },
  { key: 'mar', label: 'M' },
  { key: 'mer', label: 'M' },
  { key: 'gio', label: 'G' },
  { key: 'ven', label: 'V' },
  { key: 'sab', label: 'S' },
  { key: 'dom', label: 'D' },
];

const HOURS = Array.from({ length: 18 }, (_, i) => {
  const h = i + 6;
  return `${h.toString().padStart(2, '0')}:00`;
});

const COUNT_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20];

export default function RemindersPage() {
  const { user } = useAuth();
  const { isSupported, requestPermission } = usePushNotifications();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [text, setText] = useState('');
  const [times, setTimes] = useState<string[]>(['']);
  const [loading, setLoading] = useState(true);
  const [notifSettings, setNotifSettings] = useState<NotifSettings | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editorCategory, setEditorCategory] = useState<EditorCategory | null>(null);

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
      .select('notify_questions, notify_dna, notify_sfogo, notify_overton, daily_times, dna_daily_times, sfogo_daily_times, questions_per_day, dna_per_day, sfogo_per_day, questions_frequency, dna_frequency, sfogo_frequency, notification_window_start, notification_window_end, notify_days, custom_questions_text, custom_dna_text, custom_sfogo_text, custom_overton_text')
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

  const toggleNotifSetting = async (field: 'notify_questions' | 'notify_dna' | 'notify_sfogo' | 'notify_overton', current: boolean) => {
    if (!user) return;
    await supabase.from('question_progress')
      .update({ [field]: !current } as any)
      .eq('user_id', user.id);
    setNotifSettings(prev => prev ? { ...prev, [field]: !current } : null);
    toast.success(!current ? 'Notifiche attivate' : 'Notifiche disattivate');
  };

  const updateSetting = async (field: string, value: any) => {
    if (!user) return;
    // Reset daily times when count changes so they regenerate
    const extra: any = {};
    if (field === 'questions_per_day') extra.daily_times_date = null;
    if (field === 'dna_per_day') extra.dna_daily_times_date = null;
    if (field === 'sfogo_per_day') extra.sfogo_daily_times_date = null;
    if (field === 'notification_window_start' || field === 'notification_window_end') {
      extra.daily_times_date = null;
      extra.dna_daily_times_date = null;
    }
    await supabase.from('question_progress')
      .update({ [field]: value, ...extra } as any)
      .eq('user_id', user.id);
    setNotifSettings(prev => prev ? { ...prev, [field]: value } : null);
    toast.success('Impostazione aggiornata');
  };

  const toggleDay = async (day: string) => {
    if (!notifSettings) return;
    const current = notifSettings.notify_days || ALL_DAYS.map(d => d.key);
    const next = current.includes(day) ? current.filter(d => d !== day) : [...current, day];
    if (next.length === 0) { toast.error('Seleziona almeno un giorno'); return; }
    await updateSetting('notify_days', next);
    setNotifSettings(prev => prev ? { ...prev, notify_days: next } : null);
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

  const startEdit = (r: Reminder) => {
    setEditingId(r.id);
    setEditText(r.text);
  };

  const saveEdit = async () => {
    if (!editingId || !editText.trim()) return;
    await supabase.from('reminders').update({ text: editText.trim() }).eq('id', editingId);
    setEditingId(null);
    setEditText('');
    fetchReminders();
    toast.success('Promemoria aggiornato');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const testPush = async () => {
    if (!user) return;
    setTesting(true);
    setTestResult(null);
    try {
      if (isSupported) {
        const ready = await requestPermission();
        if (!ready) {
          setTestResult('❌ Notifiche non attive su questo dispositivo. Registralo prima.');
          setTesting(false);
          return;
        }
      }

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
        <div className="mb-6 rounded-2xl border border-border bg-card p-4 space-y-5">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Bell size={16} className="text-primary" />
            Notifiche Automatiche
          </h2>

          {/* Questions switch */}
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Zap size={14} className="text-amber-500" />
                  Domande di Riflessione
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Notifiche al giorno per memorizzare le domande
                </p>
                {notifSettings.notify_questions && notifSettings.daily_times?.length ? (
                  <p className="text-xs text-primary mt-1">
                    🔥 Oggi: {notifSettings.daily_times.join(', ')}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditorCategory('questions')}
                  className="rounded-lg p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  title="Modifica notifica"
                >
                  <Pencil size={14} />
                </button>
                <Switch
                  checked={notifSettings.notify_questions}
                  onCheckedChange={() => toggleNotifSetting('notify_questions', notifSettings.notify_questions)}
                />
              </div>
            {notifSettings.notify_questions && (
              <div className="ml-6 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Quante:</span>
                  <Select
                    value={String(notifSettings.questions_per_day || 6)}
                    onValueChange={v => updateSetting('questions_per_day', Number(v))}
                  >
                    <SelectTrigger className="h-8 w-16 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNT_OPTIONS.map(n => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex rounded-lg border border-border overflow-hidden">
                    <button
                      onClick={() => updateSetting('questions_frequency', 'day')}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                        (notifSettings.questions_frequency || 'day') === 'day'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >al giorno</button>
                    <button
                      onClick={() => updateSetting('questions_frequency', 'hour')}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                        notifSettings.questions_frequency === 'hour'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >all'ora</button>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {notifSettings.questions_frequency === 'hour'
                    ? `${notifSettings.questions_per_day || 6} notifiche ogni ora nella finestra oraria`
                    : `${notifSettings.questions_per_day || 6} notifiche distribuite nella giornata`}
                </p>
              </div>
            )}
          </div>

          {/* DNA switch */}
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Swords size={14} className="text-red-500" />
                  SOS DNA
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Notifiche al giorno per ogni profilo attivo
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
            {notifSettings.notify_dna && (
              <div className="ml-6 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Quante:</span>
                  <Select
                    value={String(notifSettings.dna_per_day || 6)}
                    onValueChange={v => updateSetting('dna_per_day', Number(v))}
                  >
                    <SelectTrigger className="h-8 w-16 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNT_OPTIONS.map(n => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex rounded-lg border border-border overflow-hidden">
                    <button
                      onClick={() => updateSetting('dna_frequency', 'day')}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                        (notifSettings.dna_frequency || 'day') === 'day'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >al giorno</button>
                    <button
                      onClick={() => updateSetting('dna_frequency', 'hour')}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                        notifSettings.dna_frequency === 'hour'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >all'ora</button>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {notifSettings.dna_frequency === 'hour'
                    ? `${notifSettings.dna_per_day || 6} notifiche ogni ora nella finestra oraria`
                    : `${notifSettings.dna_per_day || 6} notifiche distribuite nella giornata`}
                </p>
              </div>
            )}
          </div>

          {/* Sfogo switch */}
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Flame size={14} className="text-orange-500" />
                  Area Sfogo
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Notifiche con le domande di riflessione dallo sfogo
                </p>
                {notifSettings.notify_sfogo && notifSettings.sfogo_daily_times?.length ? (
                  <p className="text-xs text-primary mt-1">
                    🔥 Oggi: {notifSettings.sfogo_daily_times.join(', ')}
                  </p>
                ) : null}
              </div>
              <Switch
                checked={notifSettings.notify_sfogo}
                onCheckedChange={() => toggleNotifSetting('notify_sfogo', notifSettings.notify_sfogo)}
              />
            </div>
            {notifSettings.notify_sfogo && (
              <div className="ml-6 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Quante:</span>
                  <Select
                    value={String(notifSettings.sfogo_per_day || 6)}
                    onValueChange={v => updateSetting('sfogo_per_day', Number(v))}
                  >
                    <SelectTrigger className="h-8 w-16 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNT_OPTIONS.map(n => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex rounded-lg border border-border overflow-hidden">
                    <button
                      onClick={() => updateSetting('sfogo_frequency', 'day')}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                        (notifSettings.sfogo_frequency || 'day') === 'day'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >al giorno</button>
                    <button
                      onClick={() => updateSetting('sfogo_frequency', 'hour')}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                        notifSettings.sfogo_frequency === 'hour'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >all'ora</button>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {notifSettings.sfogo_frequency === 'hour'
                    ? `${notifSettings.sfogo_per_day || 6} notifiche ogni ora nella finestra oraria`
                    : `${notifSettings.sfogo_per_day || 6} notifiche distribuite nella giornata`}
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Settings size={14} className="text-muted-foreground" />
              Finestra oraria
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-10">Da:</span>
              <Select
                value={notifSettings.notification_window_start || '06:00'}
                onValueChange={v => updateSetting('notification_window_start', v)}
              >
                <SelectTrigger className="h-8 flex-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOURS.map(h => (
                    <SelectItem key={h} value={h}>{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground w-10">A:</span>
              <Select
                value={notifSettings.notification_window_end || '23:00'}
                onValueChange={v => updateSetting('notification_window_end', v)}
              >
                <SelectTrigger className="h-8 flex-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOURS.map(h => (
                    <SelectItem key={h} value={h}>{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Days of week */}
          <div className="border-t border-border pt-4 space-y-3">
            <p className="text-xs font-medium text-foreground">Giorni attivi</p>
            <div className="flex gap-1.5">
              {ALL_DAYS.map(d => {
                const active = (notifSettings.notify_days || ALL_DAYS.map(x => x.key)).includes(d.key);
                return (
                  <button
                    key={d.key}
                    onClick={() => toggleDay(d.key)}
                    className={`flex-1 rounded-lg py-2 text-xs font-bold transition-colors ${
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Se non ci sono nuove domande, le notifiche ripetono quelle esistenti
            </p>
          </div>
        </div>
      )}

      {/* ── ADD REMINDER FORM ── */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="relative">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Testo del promemoria..."
            className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-12 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="absolute right-2 top-1.5">
            <VoiceInput onTranscript={setText} currentValue={text} />
          </div>
        </div>
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

      {/* ── ACTIVE REMINDERS OVERVIEW ── */}
      {!loading && reminders.filter(r => r.active).length > 0 && (
        <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Bell size={16} className="text-primary" />
            Promemoria Attivi ({reminders.filter(r => r.active).length})
          </h2>
          <div className="space-y-2">
            {reminders.filter(r => r.active).map(r => (
              <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <div className="flex-1 min-w-0">
                  <span className="block text-sm text-foreground">{r.text}</span>
                  {r.times && r.times.length > 0 && (
                    <span className="text-xs text-muted-foreground">{r.times.join(', ')}</span>
                  )}
                </div>
                <Switch
                  checked={true}
                  onCheckedChange={() => toggle(r.id, true)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ALL REMINDERS LIST ── */}
      {loading ? (
        <p className="text-center text-muted-foreground">Caricamento...</p>
      ) : reminders.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Nessun promemoria</p>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Tutti i promemoria</h2>
          {reminders.map(r => (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
              {editingId === r.id ? (
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-4 py-2 pr-12 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <div className="absolute right-2 top-0.5">
                      <VoiceInput onTranscript={setEditText} currentValue={editText} />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={cancelEdit} className="p-1.5 text-muted-foreground hover:text-destructive">
                      <XCircle size={16} />
                    </button>
                    <button onClick={saveEdit} className="p-1.5 text-muted-foreground hover:text-primary">
                      <Check size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button onClick={() => toggle(r.id, r.active)}>
                    <Clock size={18} className={r.active ? 'text-primary' : 'text-muted-foreground'} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className={`block text-sm ${r.active ? 'text-foreground' : 'text-muted-foreground line-through'}`}>{r.text}</span>
                    {r.times && r.times.length > 0 && <span className="text-xs text-muted-foreground">{r.times.join(', ')}</span>}
                  </div>
                  <button onClick={() => startEdit(r)} className="text-muted-foreground hover:text-primary shrink-0">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => remove(r.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
