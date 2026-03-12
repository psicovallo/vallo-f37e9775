import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash2, Pencil } from 'lucide-react';
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
    <div className="mx-auto max-w-lg px-4 pt-12">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Note</h1>

      <div className="mb-6 flex gap-2">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Scrivi una nota..."
          rows={2}
          className="flex-1 resize-none rounded-2xl border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button onClick={add} className="self-end rounded-2xl bg-primary p-3 text-primary-foreground">
          <Plus size={20} />
        </button>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground">Caricamento...</p>
      ) : notes.length === 0 ? (
        <p className="text-center text-muted-foreground">Nessuna nota</p>
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
                  />
                  <div className="flex gap-2">
                    <button onClick={() => save(n.id)} className="rounded-xl bg-primary px-3 py-1 text-xs text-primary-foreground">Salva</button>
                    <button onClick={() => setEditingId(null)} className="rounded-xl px-3 py-1 text-xs text-muted-foreground">Annulla</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <p className="flex-1 whitespace-pre-wrap text-sm text-foreground">{n.text}</p>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingId(n.id); setEditText(n.text); }} className="text-muted-foreground hover:text-foreground">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => remove(n.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
