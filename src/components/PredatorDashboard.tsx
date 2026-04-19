import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Skull, Flame, Shield, Zap, HelpCircle, BookOpen, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface PredatorStats {
  financial_debt: number;
  lucidity_level: number;
  sovereign_streak: number;
  last_vice_timestamp: string | null;
}

const INTRO_DISMISS_KEY = 'predator_intro_dismissed_v1';

// Penalty constants are enforced server-side in calculateVicePenalty edge function

export default function PredatorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<PredatorStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [confirmVice, setConfirmVice] = useState(false);
  const [confirmSovereign, setConfirmSovereign] = useState(false);

  useEffect(() => {
    if (!user) return;
    void loadStats();
    setShowIntro(localStorage.getItem(INTRO_DISMISS_KEY) !== '1');
  }, [user]);

  // Apply grayscale filter to body when in debt
  useEffect(() => {
    if (!stats) return;
    if (stats.financial_debt > 0) {
      document.documentElement.style.filter = 'grayscale(0.85)';
    } else {
      document.documentElement.style.filter = '';
    }
    return () => {
      document.documentElement.style.filter = '';
    };
  }, [stats?.financial_debt]);

  async function loadStats() {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('financial_debt, lucidity_level, sovereign_streak, last_vice_timestamp')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) setStats(data as PredatorStats);
  }

  function dismissIntro() {
    localStorage.setItem(INTRO_DISMISS_KEY, '1');
    setShowIntro(false);
  }

  async function declareVice() {
    if (!user || !stats || loading) return;
    setLoading(true);

    const { data, error } = await supabase.functions.invoke('calculateVicePenalty', {
      body: { action: 'vice' },
    });

    setLoading(false);

    if (error || !data?.ok) {
      toast.error('Errore. Riprova.');
      return;
    }

    setStats({
      financial_debt: data.financial_debt,
      lucidity_level: data.lucidity_level,
      sovereign_streak: data.sovereign_streak,
      last_vice_timestamp: data.last_vice_timestamp,
    });

    window.alert('Hai appena venduto un pezzo del tuo futuro per un piacere momentaneo.');
  }

  async function declareSovereignAction() {
    if (!user || !stats || loading) return;
    setLoading(true);

    const { data, error } = await supabase.functions.invoke('calculateVicePenalty', {
      body: { action: 'sovereign' },
    });

    setLoading(false);

    if (error || !data?.ok) {
      toast.error('Errore. Riprova.');
      return;
    }

    setStats({
      financial_debt: data.financial_debt,
      lucidity_level: data.lucidity_level,
      sovereign_streak: data.sovereign_streak,
      last_vice_timestamp: data.last_vice_timestamp,
    });

    toast.success('Azione Sovrana registrata.');
  }

  if (!stats) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const inDebt = stats.financial_debt > 0;

  return (
    <div className="mb-6 space-y-3" style={{ backgroundColor: '#050505' }}>
      {/* Quick legend / how-to-read */}
      {showIntro && (
        <div className="relative rounded-none border-2 border-primary/50 bg-primary/5 p-4 pr-8">
          <button
            onClick={dismissIntro}
            className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
            aria-label="Chiudi"
          >
            <X size={16} />
          </button>
          <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">
            Come si legge questo cruscotto
          </p>
          <ul className="space-y-1.5 text-xs text-foreground leading-relaxed">
            <li>
              <strong className="text-destructive">DEBITO</strong> — quanto stai derubando il tuo futuro, in euro. Sopra zero, l'app diventa grigia.
            </li>
            <li>
              <strong className="text-amber-500">LUCIDITÀ</strong> — la tua chiarezza mentale (0–100). Cala con i vizi, sale con le azioni sovrane.
            </li>
            <li>
              <strong className="text-emerald-500">STREAK</strong> — giorni consecutivi senza cedimenti. Un vizio = ripartenza da zero.
            </li>
          </ul>
          <Link
            to="/manuale"
            className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
          >
            <BookOpen size={12} /> Apri il Codice del Sovrano
          </Link>
        </div>
      )}

      {/* Giant debt counter */}
      <div
        className={`rounded-none border-2 p-6 text-center ${
          inDebt ? 'border-red-700 bg-red-950/40' : 'border-neutral-800 bg-neutral-950'
        }`}
      >
        <div className="mb-1 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500">
          <Skull size={12} /> Debito al Futuro
          <Popover>
            <PopoverTrigger aria-label="Cosa è il debito" className="text-neutral-500 hover:text-foreground">
              <HelpCircle size={12} />
            </PopoverTrigger>
            <PopoverContent className="w-72 text-xs leading-relaxed">
              <p className="font-black uppercase mb-1 text-destructive">Debito al Futuro</p>
              <p>Soldi virtuali che ti sei rubato dal futuro ogni volta che hai ceduto a un vizio. Ogni cedimento dichiarato vale <strong>+100€</strong>. Quando è sopra zero, tutta l'app diventa grigia: la chiamiamo <strong>Paga dello Schiavo</strong>.</p>
            </PopoverContent>
          </Popover>
        </div>
        <div
          className={`font-black tabular-nums leading-none ${
            inDebt ? 'text-red-600' : 'text-neutral-700'
          }`}
          style={{ fontSize: '4rem', letterSpacing: '-0.05em' }}
        >
          {Number(stats.financial_debt).toLocaleString('it-IT')}
          <span className="text-2xl">€</span>
        </div>
        {inDebt && (
          <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-red-500">
            ⛓ Stato: Schiavo
          </p>
        )}
      </div>

      {/* Lucidity + Streak */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-none border-2 border-neutral-800 bg-neutral-950 p-3">
          <div className="mb-1 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-neutral-500">
            <Flame size={10} /> Lucidità
            <Popover>
              <PopoverTrigger aria-label="Cosa è la lucidità" className="ml-auto text-neutral-500 hover:text-foreground">
                <HelpCircle size={10} />
              </PopoverTrigger>
              <PopoverContent className="w-64 text-xs leading-relaxed">
                <p className="font-black uppercase mb-1 text-amber-500">Lucidità (0–100)</p>
                <p>La tua chiarezza mentale. Ogni Vizio te ne toglie <strong>15</strong>. Ogni Azione Sovrana te ne ridà <strong>2</strong>. Sotto soglia critica sei in balia dell'umore.</p>
              </PopoverContent>
            </Popover>
          </div>
          <div className="font-black tabular-nums text-amber-500" style={{ fontSize: '2rem' }}>
            {stats.lucidity_level}
            <span className="text-xs text-neutral-600">/100</span>
          </div>
          <div className="mt-2 h-1 w-full bg-neutral-900">
            <div
              className="h-full bg-amber-600"
              style={{ width: `${stats.lucidity_level}%` }}
            />
          </div>
        </div>
        <div className="rounded-none border-2 border-neutral-800 bg-neutral-950 p-3">
          <div className="mb-1 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-neutral-500">
            <Shield size={10} /> Streak
            <Popover>
              <PopoverTrigger aria-label="Cosa è la streak" className="ml-auto text-neutral-500 hover:text-foreground">
                <HelpCircle size={10} />
              </PopoverTrigger>
              <PopoverContent className="w-64 text-xs leading-relaxed">
                <p className="font-black uppercase mb-1 text-emerald-500">Streak Sovrana</p>
                <p>Giorni consecutivi di controllo. Sale di <strong>+1</strong> ad ogni Azione Sovrana dichiarata. Un solo cedimento la <strong>azzera</strong>. Niente bonus a metà strada.</p>
              </PopoverContent>
            </Popover>
          </div>
          <div className="font-black tabular-nums text-emerald-500" style={{ fontSize: '2rem' }}>
            {stats.sovereign_streak}
            <span className="text-xs text-neutral-600"> gg</span>
          </div>
          <p className="mt-2 text-[9px] uppercase tracking-wider text-neutral-600">
            Giorni di controllo
          </p>
        </div>
      </div>

      {/* Action panel */}
      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 px-1">
          Cosa hai fatto adesso?
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setConfirmVice(true)}
            disabled={loading}
            className="rounded-none border-2 border-red-800 bg-red-950/30 p-3 text-left transition-none hover:bg-red-900/40 active:bg-red-900/60 disabled:opacity-50"
          >
            <div className="text-[9px] font-black uppercase tracking-widest text-red-500">
              ⚠ Cedimento
            </div>
            <div className="mt-1 text-xs font-bold uppercase text-red-300">Dichiara Vizio</div>
            <div className="mt-1 text-[10px] text-red-700 leading-tight">
              Hai ceduto (porno, alcol, fuga, scroll, abbuffata...). +100€ debito.
            </div>
          </button>
          <button
            onClick={() => setConfirmSovereign(true)}
            disabled={loading}
            className="rounded-none border-2 border-emerald-800 bg-emerald-950/30 p-3 text-left transition-none hover:bg-emerald-900/40 active:bg-emerald-900/60 disabled:opacity-50"
          >
            <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-500">
              <Zap size={10} /> Sovrano
            </div>
            <div className="mt-1 text-xs font-bold uppercase text-emerald-300">Azione Sovrana</div>
            <div className="mt-1 text-[10px] text-emerald-700 leading-tight">
              Hai agito (lavoro vero, allenamento, disciplina). +1 streak.
            </div>
          </button>
        </div>
        <Link
          to="/manuale"
          className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground py-1"
        >
          <HelpCircle size={11} /> Non sai cosa scegliere? Apri il manuale
        </Link>
      </div>

      {/* Confirm Vice */}
      <AlertDialog open={confirmVice} onOpenChange={setConfirmVice}>
        <AlertDialogContent className="rounded-none border-2 border-red-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive uppercase font-black">
              <AlertTriangle size={18} /> Stai dichiarando un Cedimento
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-sm">
              <span className="block">
                Premi <strong>SOLO</strong> se hai davvero ceduto a un vizio (porno, alcol, scroll compulsivo, abbuffata, fuga, procrastinazione grave...).
              </span>
              <span className="block text-destructive font-bold">
                Conseguenze: +100€ debito · −15 lucidità · streak azzerata · app grigia.
              </span>
              <span className="block text-muted-foreground text-xs">
                Non mentire al sistema. Se ti dichiari vittima quando non lo sei, stai sabotando il tuo cruscotto.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={declareVice}
              className="rounded-none bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sì, ho ceduto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Sovereign */}
      <AlertDialog open={confirmSovereign} onOpenChange={setConfirmSovereign}>
        <AlertDialogContent className="rounded-none border-2 border-emerald-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-emerald-500 uppercase font-black">
              <Zap size={18} /> Stai dichiarando un'Azione Sovrana
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-sm">
              <span className="block">
                Premi <strong>SOLO</strong> se hai compiuto un'azione reale e difficile: lavoro concentrato, allenamento, una conversazione che evitavi, una decisione dura.
              </span>
              <span className="block text-emerald-500 font-bold">
                Conseguenze: +1 streak · +2 lucidità.
              </span>
              <span className="block text-muted-foreground text-xs">
                Non gonfiare la streak con azioni banali. Il numero serve a te, non al sistema.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={declareSovereignAction}
              className="rounded-none bg-emerald-700 text-white hover:bg-emerald-600"
            >
              Sì, l'ho fatto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
