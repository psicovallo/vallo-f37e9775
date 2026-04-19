import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { X, Plus } from 'lucide-react';
import VoiceInput from '@/components/VoiceInput';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reminderId: string;
  initialText: string;
  initialTimes: string[];
  initialActive: boolean;
  onSaved: () => void;
}

export default function ReminderEditor({
  open, onOpenChange, reminderId,
  initialText, initialTimes, initialActive, onSaved,
}: Props) {
  const [text, setText] = useState(initialText);
  const [times, setTimes] = useState<string[]>(initialTimes.length ? initialTimes : ['']);
  const [active, setActive] = useState(initialActive);
  const [saving, setSaving] = useState(false);

  const updateTime = (i: number, v: string) => {
    const next = [...times];
    next[i] = v;
    setTimes(next);
  };
  const addSlot = () => { if (times.length < 5) setTimes([...times, '']); };
  const removeSlot = (i: number) => setTimes(times.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!text.trim()) { toast.error('Inserisci un testo'); return; }
    setSaving(true);
    const validTimes = times.filter(t => /^\d{2}:\d{2}$/.test(t));
    const { error } = await supabase.from('reminders').update({
      text: text.trim(),
      times: validTimes,
      active,
    }).eq('id', reminderId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Promemoria aggiornato');
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifica promemoria</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Testo</label>
            <div className="relative">
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="absolute right-1 top-0.5">
                <VoiceInput onTranscript={setText} currentValue={text} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Orari</label>
            {times.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="time"
                  value={t}
                  onChange={e => updateTime(i, e.target.value)}
                  className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary [color-scheme:dark]"
                />
                {times.length > 1 && (
                  <button onClick={() => removeSlot(i)} className="text-muted-foreground hover:text-destructive">
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
            {times.length < 5 && (
              <button onClick={addSlot} className="text-xs text-primary hover:underline flex items-center gap-1">
                <Plus size={12} /> Aggiungi orario
              </button>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={active}
              onChange={e => setActive(e.target.checked)}
              className="h-4 w-4"
            />
            Attivo
          </label>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Salvataggio…' : 'Salva'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
