import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { X, Plus } from 'lucide-react';

export type QuestionTable = 'question_assignments' | 'conflict_questions' | 'sfogo_questions' | 'overton_steps';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  table: QuestionTable;
  itemId: string;
  initialText: string;
  initialTimes: string[];
  textField?: string; // default 'question_text'
  readonlyText?: boolean;
  onSaved: () => void;
}

export default function QuestionItemEditor({
  open, onOpenChange, table, itemId,
  initialText, initialTimes,
  textField = 'question_text',
  readonlyText = false,
  onSaved,
}: Props) {
  const [text, setText] = useState(initialText);
  const [times, setTimes] = useState<string[]>(initialTimes.length ? initialTimes : ['']);
  const [saving, setSaving] = useState(false);

  const updateTime = (i: number, v: string) => {
    const next = [...times]; next[i] = v; setTimes(next);
  };
  const addSlot = () => { if (times.length < 5) setTimes([...times, '']); };
  const removeSlot = (i: number) => setTimes(times.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    const validTimes = times.filter(t => /^\d{2}:\d{2}$/.test(t));
    const payload: Record<string, any> = { times: validTimes };
    if (!readonlyText) payload[textField] = text.trim();
    const { error } = await (supabase.from(table) as any).update(payload).eq('id', itemId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Aggiornata');
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifica notifica</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Testo</label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              readOnly={readonlyText}
              rows={3}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
            />
            {readonlyText && (
              <p className="text-[10px] text-muted-foreground">Il testo di questa notifica è generato dal sistema e non può essere modificato.</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Orari di invio</label>
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
            <p className="text-[10px] text-muted-foreground">Lascia vuoto per usare la pianificazione automatica della categoria.</p>
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
