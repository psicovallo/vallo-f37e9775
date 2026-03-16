import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Phrase {
  id: string;
  type: 'mantra' | 'domanda';
  category: string;
  text: string;
}

export default function PhrasesManager() {
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'mantra' | 'domanda'>('mantra');
  const [newCategory, setNewCategory] = useState('');
  const [newText, setNewText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchPhrases = async () => {
    const { data } = await supabase
      .from('phrases')
      .select('*')
      .order('category')
      .order('text');
    setPhrases((data as unknown as Phrase[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchPhrases(); }, []);

  const filtered = phrases.filter(p => p.type === tab);
  const categories = [...new Set(filtered.map(p => p.category))];

  const addPhrase = async () => {
    if (!newCategory.trim() || !newText.trim()) return;
    const { error } = await supabase.from('phrases').insert({
      type: tab,
      category: newCategory.trim(),
      text: newText.trim(),
    } as any);
    if (error) { toast.error(error.message); return; }
    setNewText('');
    toast.success('Frase aggiunta');
    fetchPhrases();
  };

  const deletePhrase = async (id: string) => {
    await supabase.from('phrases').delete().eq('id', id);
    setPhrases(prev => prev.filter(p => p.id !== id));
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    
    // Skip header if present
    const startIdx = lines[0]?.toLowerCase().includes('categoria') || lines[0]?.toLowerCase().includes('mantra') || lines[0]?.toLowerCase().includes('domand') ? 1 : 0;
    
    const rows: { type: string; category: string; text: string }[] = [];
    for (let i = startIdx; i < lines.length; i++) {
      // Support both comma and semicolon separators
      const sep = lines[i].includes(';') ? ';' : ',';
      const parts = lines[i].split(sep).map(s => s.trim().replace(/^["']|["']$/g, ''));
      if (parts.length < 3) continue;
      
      const rawType = parts[0].toLowerCase();
      const type = rawType.includes('domand') ? 'domanda' : 'mantra';
      rows.push({ type, category: parts[1], text: parts[2] });
    }

    if (rows.length === 0) {
      toast.error('Nessuna riga valida trovata nel file');
      return;
    }

    const { error } = await supabase.from('phrases').insert(rows as any);
    if (error) { toast.error(error.message); return; }
    toast.success(`${rows.length} frasi importate`);
    fetchPhrases();
    if (fileRef.current) fileRef.current.value = '';
  };

  if (loading) return <p className="text-center text-muted-foreground py-8">Caricamento...</p>;

  return (
    <div className="space-y-4">
      {/* Type tabs */}
      <div className="flex gap-1 rounded-xl bg-secondary p-1">
        <button
          onClick={() => setTab('mantra')}
          className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${tab === 'mantra' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
        >
          Mantra ({phrases.filter(p => p.type === 'mantra').length})
        </button>
        <button
          onClick={() => setTab('domanda')}
          className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${tab === 'domanda' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
        >
          Domande ({phrases.filter(p => p.type === 'domanda').length})
        </button>
      </div>

      {/* Import CSV */}
      <div className="flex gap-2">
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.txt" onChange={handleCSVImport} className="hidden" />
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm text-foreground hover:border-primary transition-colors"
        >
          <Upload size={14} /> Importa CSV
        </button>
      </div>

      {/* Add new */}
      <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
        <input
          value={newCategory}
          onChange={e => setNewCategory(e.target.value)}
          placeholder="Categoria..."
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="flex gap-2">
          <input
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addPhrase()}
            placeholder={tab === 'mantra' ? 'Frase motivazionale...' : 'Domanda...'}
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button onClick={addPhrase} className="rounded-xl bg-primary px-3 py-2 text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Phrases list by category */}
      {categories.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-4">Nessuna frase</p>
      ) : (
        categories.map(cat => (
          <div key={cat}>
            <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{cat}</h3>
            <div className="space-y-1">
              {filtered.filter(p => p.category === cat).map(p => (
                <div key={p.id} className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
                  <span className="flex-1 text-sm text-foreground">{p.text}</span>
                  <button onClick={() => deletePhrase(p.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
