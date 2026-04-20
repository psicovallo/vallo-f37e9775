import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  category: 'questions' | 'dna' | 'sfogo' | 'overton';
  label: string;
  initialCustomText: string;
  initialPerCount: number;
  initialFrequency: string;
  initialWindowStart: string;
  initialWindowEnd: string;
  onSaved: () => void;
}

const HOURS = Array.from({ length: 18 }, (_, i) => {
  const h = i + 6;
  return `${h.toString().padStart(2, '0')}:00`;
});
const COUNT_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20];

const FIELD_MAP = {
  questions: { custom: 'custom_questions_text', per: 'questions_per_day', freq: 'questions_frequency', resetKey: 'daily_times_date' },
  dna: { custom: 'custom_dna_text', per: 'dna_per_day', freq: 'dna_frequency', resetKey: 'dna_daily_times_date' },
  sfogo: { custom: 'custom_sfogo_text', per: 'sfogo_per_day', freq: 'sfogo_frequency', resetKey: 'sfogo_daily_times_date' },
  overton: { custom: 'custom_overton_text', per: 'questions_per_day', freq: 'questions_frequency', resetKey: 'daily_times_date' },
} as const;

export default function NotificationCategoryEditor({
  open, onOpenChange, category, label,
  initialCustomText, initialPerCount, initialFrequency,
  initialWindowStart, initialWindowEnd, onSaved,
}: Props) {
  const { user } = useAuth();
  const [customText, setCustomText] = useState(initialCustomText);
  const [perCount, setPerCount] = useState(initialPerCount);
  const [frequency, setFrequency] = useState(initialFrequency);
  const [winStart, setWinStart] = useState(initialWindowStart);
  const [winEnd, setWinEnd] = useState(initialWindowEnd);
  const [saving, setSaving] = useState(false);

  const fields = FIELD_MAP[category];

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const update: any = {
      [fields.custom]: customText.trim() || null,
      notification_window_start: winStart,
      notification_window_end: winEnd,
      [fields.resetKey]: null,
    };
    if (category !== 'overton') {
      update[fields.per] = perCount;
      update[fields.freq] = frequency;
    }
    const { error } = await supabase.from('question_progress').update(update).eq('user_id', user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Notifica aggiornata');
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifica notifica: {label}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Testo personalizzato (opzionale)
            </label>
            <Textarea
              value={customText}
              onChange={e => setCustomText(e.target.value)}
              placeholder="Lascia vuoto per usare il testo del Consiglio dei Maestri"
              rows={3}
              className="text-sm"
            />
            <p className="text-[10px] text-muted-foreground">
              Se compili, questo testo sostituirà quello automatico nella notifica push.
            </p>
          </div>

          {category !== 'overton' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Quante e quando</label>
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={String(perCount)} onValueChange={v => setPerCount(Number(v))}>
                  <SelectTrigger className="h-9 w-20 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNT_OPTIONS.map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex rounded-lg border border-border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setFrequency('day')}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      frequency === 'day' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >al giorno</button>
                  <button
                    type="button"
                    onClick={() => setFrequency('hour')}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      frequency === 'hour' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >all'ora</button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Finestra oraria</label>
            <div className="flex items-center gap-2">
              <Select value={winStart} onValueChange={setWinStart}>
                <SelectTrigger className="h-9 flex-1 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HOURS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">→</span>
              <Select value={winEnd} onValueChange={setWinEnd}>
                <SelectTrigger className="h-9 flex-1 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HOURS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <p className="text-[10px] text-muted-foreground">
              La finestra oraria è condivisa tra tutte le categorie automatiche.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Salvataggio…' : 'Salva'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
