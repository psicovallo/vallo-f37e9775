import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface Note {
  id: string;
  text: string;
  created_at: string;
  updated_at: string;
}

export default function NotesPage() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchNotes = async () => {
    const { data } = await supabase.from('notes').select('*').order('created_at', { ascending: false });
    setNotes(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchNotes(); }, []);

  const add = async () => {
    if (!text.trim() || !user) return;
    const { error } = await supabase.from('notes').insert({ user_id: user.id, text: text.trim() });
    if (error) { toast.error(error.message); return; }
    setText('');
    fetchNotes();
  };

  const save = async (id: string) => {
    if (!editText.trim()) return;
    await supabase.from('notes').update({ text: editText.trim() }).eq('id', id);
    setEditingId(null);
    fetchNotes();
  };

  const remove = async (id: string) => {
    await supabase.from('notes').delete().eq('id', id);
    fetchNotes();
  };

  return (
    <div className="mx-auto max-w-lg px-4 pt-8 pb-24">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Note</h1>

      <div className="mb-6 rounded-2xl border border-border bg-card p-4 space-y-3">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Scrivi una nota..."
          rows={3}
          className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          onClick={add}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus size={16} />
          Aggiungi nota
        </button>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground">Caricamento...</p>
      ) : notes.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Nessuna nota</p>
      ) : (
        <div className="space-y-3">
          {notes.map(n => (
            <div key={n.id} className="rounded-2xl border border-border bg-card p-4">
              {editingId === n.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={() => save(n.id)} className="flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                      <Check size={12} /> Salva
                    </button>
                    <button onClick={() => setEditingId(null)} className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
                      <X size={12} /> Annulla
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <p className="flex-1 whitespace-pre-wrap text-sm text-foreground">{n.text}</p>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => { setEditingId(n.id); setEditText(n.text); }} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => remove(n.id)} className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
              <p className="mt-2 text-[10px] text-muted-foreground">
                {new Date(n.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
