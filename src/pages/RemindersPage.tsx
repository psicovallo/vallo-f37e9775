import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash2, BellRing, X, Bell, Zap, Swords, Flame, Pencil, Target, Settings } from 'lucide-react';
import VoiceInput from '@/components/VoiceInput';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import NotificationCategoryEditor from '@/components/NotificationCategoryEditor';
import NotificationHistory from '@/components/NotificationHistory';
import ReminderEditor from '@/components/ReminderEditor';
import QuestionsList from '@/components/QuestionsList';

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

const CATEGORY_META: Record<EditorCategory, { label: string; icon: typeof Zap; iconClass: string; description: string }> = {
  questions: { label: 'Domande di Riflessione', icon: Zap, iconClass: 'text-amber-500', description: 'Domande del Consiglio dei Maestri' },
  dna: { label: 'SOS DNA', icon: Swords, iconClass: 'text-red-500', description: 'Domande sui profili bersaglio' },
  sfogo: { label: 'Area Sfogo', icon: Flame, iconClass: 'text-orange-500', description: 'Riflessioni dallo sfogo' },
  overton: { label: 'Overton Shift', icon: Target, iconClass: 'text-primary', description: 'Solleciti dello step attivo' },
};

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
  const [editorCategory, setEditorCategory] = useState<EditorCategory | null>(null);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

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
    if (data) setNotifSettings(data as unknown as NotifSettings);
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
    const extra: any = {};
    if (field === 'notification_window_start' || field === 'notification_window_end') {
      extra.daily_times_date = null;
      extra.dna_daily_times_date = null;
      extra.sfogo_daily_times_date = null;
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
      times: validTimes,
    });
    if (error) { toast.error(error.message); return; }
    setText('');
    setTimes(['']);
    setShowAddForm(false);
    toast.success('Promemoria creato');
    fetchReminders();
  };

  const toggle = async (id: string, active: boolean) => {
    await supabase.from('reminders').update({ active: !active }).eq('id', id);
    fetchReminders();
  };

  const remove = async (id: string) => {
    await supabase.from('reminders').delete().eq('id', id);
    toast.success('Promemoria eliminato');
    fetchReminders();
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
      else setTestResult(`✅ Inviate: ${data.sent}`);
    } catch (err: any) {
      setTestResult(`❌ Errore: ${err.message}`);
    }
    setTesting(false);
  };

  const renderCategoryRow = (cat: EditorCategory) => {
    if (!notifSettings) return null;
    const meta = CATEGORY_META[cat];
    const Icon = meta.icon;
    const enabled =
      cat === 'questions' ? notifSettings.notify_questions :
      cat === 'dna' ? notifSettings.notify_dna :
      cat === 'sfogo' ? notifSettings.notify_sfogo :
      (notifSettings.notify_overton ?? true);
    const customText =
      cat === 'questions' ? notifSettings.custom_questions_text :
      cat === 'dna' ? notifSettings.custom_dna_text :
      cat === 'sfogo' ? notifSettings.custom_sfogo_text :
      notifSettings.custom_overton_text;
    const perCount =
      cat === 'questions' ? notifSettings.questions_per_day :
      cat === 'dna' ? notifSettings.dna_per_day :
      cat === 'sfogo' ? notifSettings.sfogo_per_day : null;
    const freq =
      cat === 'questions' ? notifSettings.questions_frequency :
      cat === 'dna' ? notifSettings.dna_frequency :
      cat === 'sfogo' ? notifSettings.sfogo_frequency : null;
    const todayTimes =
      cat === 'questions' ? notifSettings.daily_times :
      cat === 'dna' ? notifSettings.dna_daily_times :
      cat === 'sfogo' ? notifSettings.sfogo_daily_times : null;

    return (
      <div key={cat} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card">
        <div className={`mt-0.5 flex-shrink-0 ${meta.iconClass}`}>
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium text-sm text-foreground">{meta.label}</div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => setEditorCategory(cat)}
                className="rounded-lg px-2 py-1 text-[11px] font-medium text-primary border border-primary/30 hover:bg-primary/10 transition-colors flex items-center gap-1"
              >
                <Pencil size={11} /> Modifica
              </button>
              <Switch
                checked={enabled}
                onCheckedChange={() => toggleNotifSetting(
                  cat === 'questions' ? 'notify_questions' :
                  cat === 'dna' ? 'notify_dna' :
                  cat === 'sfogo' ? 'notify_sfogo' : 'notify_overton',
                  enabled
                )}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
          {enabled && perCount !== null && freq && (
            <p className="text-[11px] text-muted-foreground mt-1">
              {perCount} {freq === 'hour' ? 'ogni ora' : 'al giorno'}
              {customText ? ' · 📝 testo personalizzato' : ''}
            </p>
          )}
          {enabled && todayTimes?.length ? (
            <p className="text-[11px] text-primary mt-1 truncate">
              ⏰ Oggi: {todayTimes.join(', ')}
            </p>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-lg px-4 pt-8 pb-24">
      <h1 className="mb-1 text-2xl font-bold text-foreground">Centro Notifiche</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Tutte le tue notifiche organizzate. Tocca <span className="text-primary font-medium">Modifica</span> per cambiare testo, orario o frequenza.
      </p>

      {/* ── AUTOMATIC NOTIFICATIONS ── */}
      {notifSettings && (
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Bell size={12} /> Notifiche del Consiglio
          </h2>
          <div className="space-y-2">
            {(['questions', 'dna', 'sfogo', 'overton'] as EditorCategory[]).map(renderCategoryRow)}
          </div>
        </section>
      )}

      {/* ── PER-QUESTION SCHEDULE LIST ── */}
      <QuestionsList />

      {/* ── MANUAL REMINDERS ── */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <BellRing size={12} /> I tuoi promemoria ({reminders.length})
          </h2>
          <button
            onClick={() => setShowAddForm(v => !v)}
            className="rounded-lg px-2.5 py-1 text-[11px] font-medium text-primary border border-primary/30 hover:bg-primary/10 transition-colors flex items-center gap-1"
          >
            <Plus size={12} /> Nuovo
          </button>
        </div>

        {showAddForm && (
          <div className="mb-3 rounded-2xl border border-primary/30 bg-primary/5 p-3 space-y-2">
            <div className="relative">
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Testo del promemoria..."
                className="w-full rounded-xl border border-border bg-background px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="absolute right-1 top-0.5">
                <VoiceInput onTranscript={setText} currentValue={text} />
              </div>
            </div>
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
            <div className="flex items-center justify-between">
              {times.length < 3 ? (
                <button onClick={addTimeSlot} className="text-xs text-primary hover:underline">+ Aggiungi orario</button>
              ) : <span />}
              <div className="flex gap-2">
                <button onClick={() => { setShowAddForm(false); setText(''); setTimes(['']); }} className="text-xs text-muted-foreground hover:text-foreground px-2">
                  Annulla
                </button>
                <button onClick={add} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                  Crea
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-center text-muted-foreground py-4 text-sm">Caricamento...</p>
        ) : reminders.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 text-sm">
            Nessun promemoria. Tocca <span className="text-primary">Nuovo</span> per crearne uno.
          </p>
        ) : (
          <div className="space-y-2">
            {reminders.map(r => (
              <div key={r.id} className={`flex items-center gap-3 p-3 rounded-xl border bg-card ${r.active ? 'border-border' : 'border-border opacity-60'}`}>
                <div className="flex-shrink-0 text-muted-foreground">
                  <BellRing size={16} className={r.active ? 'text-primary' : ''} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${r.active ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                    {r.text}
                  </div>
                  {r.times && r.times.length > 0 && (
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      ⏰ {r.times.join(' · ')}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setEditingReminder(r)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Modifica"
                  >
                    <Pencil size={14} />
                  </button>
                  <Switch checked={r.active} onCheckedChange={() => toggle(r.id, r.active)} />
                  <button
                    onClick={() => remove(r.id)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                    title="Elimina"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── ADVANCED SETTINGS ── */}
      {notifSettings && (
        <section className="mb-6">
          <button
            onClick={() => setShowAdvanced(v => !v)}
            className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 hover:text-foreground transition-colors"
          >
            <span className="flex items-center gap-2"><Settings size={12} /> Impostazioni avanzate</span>
            <span>{showAdvanced ? '−' : '+'}</span>
          </button>
          {showAdvanced && (
            <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">Finestra oraria (per tutte)</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-8">Da</span>
                  <Select
                    value={notifSettings.notification_window_start || '06:00'}
                    onValueChange={v => updateSetting('notification_window_start', v)}
                  >
                    <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {HOURS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground w-8">A</span>
                  <Select
                    value={notifSettings.notification_window_end || '23:00'}
                    onValueChange={v => updateSetting('notification_window_end', v)}
                  >
                    <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {HOURS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">Giorni attivi</p>
                <div className="flex gap-1.5">
                  {ALL_DAYS.map(d => {
                    const active = (notifSettings.notify_days || ALL_DAYS.map(x => x.key)).includes(d.key);
                    return (
                      <button
                        key={d.key}
                        onClick={() => toggleDay(d.key)}
                        className={`flex-1 rounded-lg py-2 text-xs font-bold transition-colors ${
                          active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={testPush}
                disabled={testing}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-medium text-foreground hover:border-primary disabled:opacity-50"
              >
                <BellRing size={14} />
                {testing ? 'Invio...' : 'Testa notifica push'}
              </button>
              {testResult && (
                <div className="rounded-xl border border-border bg-secondary p-2 text-[11px] text-foreground font-mono break-all">
                  {testResult}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* ── HISTORY ── */}
      <NotificationHistory
        onEditCategory={(cat) => {
          if (cat === 'reminder') {
            if (reminders.length > 0) {
              setEditingReminder(reminders[0]);
            } else {
              toast.info('Nessun promemoria manuale da modificare');
            }
          } else if (['questions','dna','sfogo','overton'].includes(cat)) {
            setEditorCategory(cat as EditorCategory);
          }
        }}
      />

      {/* ── EDITOR DIALOGS ── */}
      {editorCategory && notifSettings && (
        <NotificationCategoryEditor
          open={editorCategory !== null}
          onOpenChange={(v) => { if (!v) setEditorCategory(null); }}
          category={editorCategory}
          label={CATEGORY_META[editorCategory].label}
          initialCustomText={
            (editorCategory === 'questions' ? notifSettings.custom_questions_text :
             editorCategory === 'dna' ? notifSettings.custom_dna_text :
             editorCategory === 'sfogo' ? notifSettings.custom_sfogo_text :
             notifSettings.custom_overton_text) || ''
          }
          initialPerCount={
            editorCategory === 'questions' ? (notifSettings.questions_per_day || 6) :
            editorCategory === 'dna' ? (notifSettings.dna_per_day || 6) :
            editorCategory === 'sfogo' ? (notifSettings.sfogo_per_day || 6) : 6
          }
          initialFrequency={
            editorCategory === 'questions' ? (notifSettings.questions_frequency || 'day') :
            editorCategory === 'dna' ? (notifSettings.dna_frequency || 'day') :
            editorCategory === 'sfogo' ? (notifSettings.sfogo_frequency || 'day') : 'day'
          }
          initialWindowStart={notifSettings.notification_window_start || '06:00'}
          initialWindowEnd={notifSettings.notification_window_end || '23:00'}
          onSaved={fetchNotifSettings}
        />
      )}

      {editingReminder && (
        <ReminderEditor
          open={editingReminder !== null}
          onOpenChange={(v) => { if (!v) setEditingReminder(null); }}
          reminderId={editingReminder.id}
          initialText={editingReminder.text}
          initialTimes={editingReminder.times || []}
          initialActive={editingReminder.active}
          onSaved={fetchReminders}
        />
      )}
    </div>
  );
}
