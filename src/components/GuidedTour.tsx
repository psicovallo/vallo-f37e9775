import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronRight, X, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

interface GuidedTourProps {
  onClose: () => void;
}

const STEPS = [
  {
    emoji: '🩸',
    title: 'IL CONTATORE ROSSO',
    headline: 'Il tuo debito. La tua condanna.',
    body: 'Qui vedi quanto stai derubando te stesso, in euro reali. Questo numero non è decorativo: è la tua condanna o la tua spinta. Quando sale sopra zero, tutta l\'app diventa grigia. Si chiama Paga dello Schiavo. Esci dal grigio o restaci.',
    accent: 'text-destructive',
  },
  {
    emoji: '⚠️',
    title: 'DICHIARA CEDIMENTO',
    headline: 'Il tasto della verità.',
    body: 'Usalo solo se hai deciso di fallire ufficialmente. +100€ di debito, -15 di lucidità, streak azzerata. Non mentire al sistema: se ti fingi sovrano mentre cedi, il sistema ti espelle. Qui non si bara.',
    accent: 'text-primary',
  },
  {
    emoji: '👑',
    title: 'AZIONI SOVRANE',
    headline: 'Riconquista l\'impero.',
    body: 'Ogni atto reale (lavoro, fisico, disciplina) sposta la Finestra di Overton verso il tuo dominio. +1 streak, +2 lucidità. Niente premi, niente fuochi d\'artificio: solo il numero che cala e il grigio che si dissolve. Ripeti, ogni giorno.',
    accent: 'text-primary',
  },
];

export default function GuidedTour({ onClose }: GuidedTourProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [closing, setClosing] = useState(false);

  const finish = async () => {
    if (closing) return;
    setClosing(true);
    if (user) {
      await supabase.from('profiles').update({ tour_completed: true } as any).eq('user_id', user.id);
    }
    onClose();
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else finish();
  };

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(5,5,5,0.95)' }}>
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 w-12 ${i <= step ? 'bg-primary' : 'bg-muted'}`}
              />
            ))}
          </div>
          <button onClick={finish} className="text-muted-foreground hover:text-foreground" aria-label="Chiudi">
            <X size={20} />
          </button>
        </div>

        <div className="rounded-none border-2 border-border bg-card p-8 space-y-5 text-center">
          <div className="text-7xl leading-none">{current.emoji}</div>
          <p className={`text-xs font-black uppercase tracking-widest ${current.accent}`}>{current.title}</p>
          <h2 className="text-2xl font-black text-foreground uppercase leading-tight tracking-tight">{current.headline}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{current.body}</p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={next}
            className="flex items-center justify-center gap-2 w-full rounded-none bg-primary py-4 text-base font-black uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
          >
            {step === STEPS.length - 1 ? 'INIZIA IL DOMINIO' : 'AVANTI'} <ChevronRight size={18} />
          </button>
          <Link
            to="/manuale"
            onClick={finish}
            className="flex items-center justify-center gap-2 w-full rounded-none border-2 border-border py-3 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted/40"
          >
            <BookOpen size={14} /> Apri il Codice del Sovrano
          </Link>
        </div>

        <p className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Step {step + 1} di {STEPS.length}
        </p>
      </div>
    </div>
  );
}
