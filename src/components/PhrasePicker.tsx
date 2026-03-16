import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, HelpCircle, ChevronLeft, X } from 'lucide-react';

interface Phrase {
  id: string;
  type: 'mantra' | 'domanda';
  category: string;
  text: string;
}

interface PhrasePickerProps {
  onSelect: (text: string) => void;
  onClose: () => void;
}

export default function PhrasePicker({ onSelect, onClose }: PhrasePickerProps) {
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [tab, setTab] = useState<'mantra' | 'domanda'>('mantra');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('phrases')
      .select('*')
      .order('category')
      .order('text')
      .then(({ data }) => setPhrases((data as unknown as Phrase[]) || []));
  }, []);

  const filtered = phrases.filter(p => p.type === tab);
  const categories = [...new Set(filtered.map(p => p.category))];
  const visiblePhrases = selectedCategory
    ? filtered.filter(p => p.category === selectedCategory)
    : [];

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        {selectedCategory ? (
          <button onClick={() => setSelectedCategory(null)} className="flex items-center gap-1 text-xs text-primary">
            <ChevronLeft size={14} /> Categorie
          </button>
        ) : (
          <div className="flex gap-1">
            <button
              onClick={() => { setTab('mantra'); setSelectedCategory(null); }}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${tab === 'mantra' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <BookOpen size={12} /> Mantra
            </button>
            <button
              onClick={() => { setTab('domanda'); setSelectedCategory(null); }}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${tab === 'domanda' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <HelpCircle size={12} /> Domande
            </button>
          </div>
        )}
        <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="max-h-48 overflow-y-auto p-2">
        {!selectedCategory ? (
          categories.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-4">Nessuna frase disponibile</p>
          ) : (
            <div className="space-y-1">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className="w-full text-left rounded-xl px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                >
                  {cat}
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({filtered.filter(p => p.category === cat).length})
                  </span>
                </button>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-1">
            {visiblePhrases.map(p => (
              <button
                key={p.id}
                onClick={() => { onSelect(p.text); onClose(); }}
                className="w-full text-left rounded-xl px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
              >
                {p.text}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
