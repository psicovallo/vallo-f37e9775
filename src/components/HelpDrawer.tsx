import { useState } from 'react';
import { HelpCircle, X, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HelpDrawerProps {
  title: string;
  whatYouDo: string;
  whatAIDoes: string;
  expectedResult: string;
  accent?: 'primary' | 'destructive' | 'amber' | 'red';
}

const ACCENT_MAP: Record<string, string> = {
  primary: 'border-primary/40 text-primary',
  destructive: 'border-destructive/40 text-destructive',
  amber: 'border-amber-500/40 text-amber-500',
  red: 'border-red-600/40 text-red-500',
};

export default function HelpDrawer({ title, whatYouDo, whatAIDoes, expectedResult, accent = 'primary' }: HelpDrawerProps) {
  const [open, setOpen] = useState(false);
  const accentCls = ACCENT_MAP[accent] || ACCENT_MAP.primary;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Aiuto"
        className={`inline-flex items-center justify-center rounded-full border ${accentCls} bg-background/60 backdrop-blur p-1.5 hover:bg-background transition-colors`}
      >
        <HelpCircle size={16} />
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/70 px-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-border bg-card p-5 space-y-4 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className={`text-base font-bold ${accentCls.split(' ')[1]}`}>{title}</h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-sm leading-relaxed">
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Cosa stai facendo qui</p>
                <p className="text-foreground">{whatYouDo}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Cosa farà il Consiglio</p>
                <p className="text-foreground">{whatAIDoes}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Risultato atteso</p>
                <p className="text-foreground">{expectedResult}</p>
              </div>
            </div>

            <Link
              to="/manuale"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 w-full rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-xs font-medium text-foreground hover:bg-muted"
            >
              <BookOpen size={14} /> Apri il Manuale completo
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
