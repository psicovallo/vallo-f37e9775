import { useState, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { LANG_MAP } from '@/components/GoogleTranslate';

const LANGUAGES = Object.keys(LANG_MAP);

interface Props {
  current: string;
  onChange: (lang: string) => void;
}

export default function LanguageButton({ current, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 text-muted-foreground hover:text-foreground transition-colors"
        title="Lingua / Language"
      >
        <Globe size={20} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl border border-border bg-card shadow-lg py-1 animate-in fade-in slide-in-from-top-2 duration-150">
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              onClick={() => { onChange(lang); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-muted ${
                current === lang ? 'font-bold text-primary' : 'text-foreground'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
