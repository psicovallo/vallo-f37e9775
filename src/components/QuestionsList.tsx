import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Pencil, Archive, ArchiveRestore, Trash2, Zap, Swords, Flame, Target, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import QuestionItemEditor, { QuestionTable } from './QuestionItemEditor';

type Cat = 'questions' | 'dna' | 'sfogo' | 'overton';

interface Item {
  id: string;
  text: string;
  times: string[];
  archived: boolean;
  category: Cat;
  table: QuestionTable;
  textField: string;
  readonlyText: boolean;
  meta?: string;
}

const CAT_META: Record<Cat, { label: string; icon: typeof Zap; iconClass: string }> = {
  questions: { label: 'Riflessione', icon: Zap, iconClass: 'text-amber-500' },
  dna: { label: 'SOS DNA', icon: Swords, iconClass: 'text-red-500' },
  sfogo: { label: 'Sfogo', icon: Flame, iconClass: 'text-orange-500' },
  overton: { label: 'Overton', icon: Target, iconClass: 'text-primary' },
};

export default function QuestionsList() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [filter, setFilter] = useState<Cat | 'all'>('all');
  const [editing, setEditing] = useState<Item | null>(null);

  const fetchAll = async () => {
    if (!user) return;
    setLoading(true);
    const [qa, cq, sq, os] = await Promise.all([
      supabase.from('question_assignments').select('id, question_text, times, archived, status').eq('user_id', user.id),
      supabase.from('conflict_questions').select('id, question_text, times, archived, velo_number').eq('user_id', user.id),
      supabase.from('sfogo_questions').select('id, question_text, times, archived').eq('user_id', user.id),
      supabase.from('overton_steps').select('id, action_text, times, archived, label, step_number, confirmed').eq('user_id', user.id),
    ]);

    const all: Item[] = [
      ...(qa.data || []).map((r: any) => ({
        id: r.id, text: r.question_text, times: r.times || [], archived: r.archived,
        category: 'questions' as Cat, table: 'question_assignments' as QuestionTable,
        textField: 'question_text', readonlyText: false,
        meta: r.status,
      })),
      ...(cq.data || []).map((r: any) => ({
        id: r.id, text: r.question_text, times: r.times || [], archived: r.archived,
        category: 'dna' as Cat, table: 'conflict_questions' as QuestionTable,
        textField: 'question_text', readonlyText: false,
        meta: `Velo ${r.velo_number}`,
      })),
      ...(sq.data || []).map((r: any) => ({
        id: r.id, text: r.question_text, times: r.times || [], archived: r.archived,
        category: 'sfogo' as Cat, table: 'sfogo_questions' as QuestionTable,
        textField: 'question_text', readonlyText: false,
      })),
      ...(os.data || []).map((r: any) => ({
        id: r.id, text: r.action_text, times: r.times || [], archived: r.archived,
        category: 'overton' as Cat, table: 'overton_steps' as QuestionTable,
        textField: 'action_text', readonlyText: true,
        meta: `Step ${r.step_number} · ${r.label}`,
      })),
    ];
    setItems(all);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [user]);

  const toggleArchive = async (it: Item) => {
    const { error } = await (supabase.from(it.table) as any)
      .update({ archived: !it.archived }).eq('id', it.id);
    if (error) { toast.error(error.message); return; }
    toast.success(it.archived ? 'Riattivata' : 'Archiviata');
    fetchAll();
  };

  const remove = async (it: Item) => {
    if (!confirm('Cancellare definitivamente?')) return;
    const { error } = await (supabase.from(it.table) as any).delete().eq('id', it.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Cancellata');
    fetchAll();
  };

  const filtered = items.filter(it =>
    it.archived === showArchived &&
    (filter === 'all' || it.category === filter)
  );

  const counts = {
    all: items.filter(i => i.archived === showArchived).length,
    questions: items.filter(i => i.archived === showArchived && i.category === 'questions').length,
    dna: items.filter(i => i.archived === showArchived && i.category === 'dna').length,
    sfogo: items.filter(i => i.archived === showArchived && i.category === 'sfogo').length,
    overton: items.filter(i => i.archived === showArchived && i.category === 'overton').length,
  };

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <ListChecks size={12} /> Domande programmate ({counts.all})
        </h2>
        <button
          onClick={() => setShowArchived(v => !v)}
          className="rounded-lg px-2.5 py-1 text-[11px] font-medium text-muted-foreground border border-border hover:text-foreground transition-colors flex items-center gap-1"
        >
          {showArchived ? <><ArchiveRestore size={11} /> Attive</> : <><Archive size={11} /> Archivio</>}
        </button>
      </div>

      <div className="flex gap-1.5 mb-3 overflow-x-auto">
        {(['all','questions','dna','sfogo','overton'] as const).map(c => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
              filter === c ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {c === 'all' ? `Tutte (${counts.all})` : `${CAT_META[c].label} (${counts[c]})`}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-4 text-sm">Caricamento...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-6 text-sm">
          {showArchived ? 'Nessuna notifica archiviata.' : 'Nessuna domanda generata. Usa le sezioni del Consiglio per crearne.'}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map(it => {
            const meta = CAT_META[it.category];
            const Icon = meta.icon;
            return (
              <div key={`${it.table}-${it.id}`} className={`flex items-start gap-3 p-3 rounded-xl border bg-card ${it.archived ? 'border-border opacity-60' : 'border-border'}`}>
                <div className={`mt-0.5 flex-shrink-0 ${meta.iconClass}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{meta.label}</span>
                    {it.meta && <span className="text-[10px] text-muted-foreground">· {it.meta}</span>}
                  </div>
                  <div className={`text-sm ${it.archived ? 'text-muted-foreground line-through' : 'text-foreground'} line-clamp-2`}>
                    {it.text}
                  </div>
                  {it.times.length > 0 && (
                    <div className="text-[11px] text-primary mt-1">
                      ⏰ {it.times.join(' · ')}
                    </div>
                  )}
                  {it.times.length === 0 && !it.archived && (
                    <div className="text-[11px] text-muted-foreground mt-1">
                      Pianificazione automatica
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setEditing(it)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Modifica"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => toggleArchive(it)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title={it.archived ? 'Riattiva' : 'Archivia'}
                  >
                    {it.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                  </button>
                  <button
                    onClick={() => remove(it)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                    title="Elimina"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <QuestionItemEditor
          open={!!editing}
          onOpenChange={v => { if (!v) setEditing(null); }}
          table={editing.table}
          itemId={editing.id}
          initialText={editing.text}
          initialTimes={editing.times}
          textField={editing.textField}
          readonlyText={editing.readonlyText}
          onSaved={fetchAll}
        />
      )}
    </section>
  );
}
