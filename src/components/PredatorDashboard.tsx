import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Skull, Flame, Shield, Zap, HelpCircle, BookOpen, X, AlertTriangle, Sun } from 'lucide-react';
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
import DNACore from './DNACore';
import { ChevronDown } from 'lucide-react';

// Status banner for the DNA Core — explains the current necrosis stage
function NucleusStatusBanner({ debt, streak }: { debt: number; streak: number }) {
  const [expanded, setExpanded] = useState(false);

  let stage: { label: string; color: string; explain: string; remedy: string };
  if (debt <= 0) {
    stage = {
      label: 'NUCLEO STABILE',
      color: '#d97706',
      explain: 'Sei in pieno controllo. Il DNA pulsa libero, ambra brillante. Nessuna corruzione attiva.',
      remedy: 'Mantieni: ogni giorno una conferma (Azione Sovrana o Giorno Pulito) per non scivolare.',
    };
  } else if (debt <= 100) {
    stage = {
      label: 'NECROSI INIZIALE',
      color: '#b8821a',
      explain: 'Primo glitch. Il Nucleo perde brillantezza. Hai ceduto una volta o sei stato passivo.',
      remedy: streak >= 14 ? '1 azione = pulito.' : streak >= 7 ? '2 azioni = pulito.' : '4 azioni sovrane = pulito.',
    };
  } else if (debt <= 300) {
    stage = {
      label: 'NECROSI ATTIVA',
      color: '#a87a30',
      explain: 'Il colore svanisce, frammenti visibili, scanline. Il Nucleo si sta corrompendo.',
      remedy: 'Inverti la rotta ORA. Azioni Sovrane consecutive + Giorno Pulito quotidiano.',
    };
  } else if (debt <= 500) {
    stage = {
      label: 'NECROSI GRAVE',
      color: '#8b3a3a',
      explain: 'Cenere e glitch violenti. Il DNA si sta spezzando. Sei vicino al collasso.',
      remedy: 'Stop totale ai vizi. Solo lavoro vero. Ogni Azione Sovrana è un mattone contro la deriva.',
    };
  } else {
    stage = {
      label: 'NUCLEO TERMINALE',
      color: '#7f1d1d',
      explain: 'Quasi nero, frammentato. Sei un fantasma di te stesso. Il Consiglio ti osserva.',
      remedy: 'Ricostruzione totale. Riapri il Patto. Una azione, poi un\'altra. Niente giustificazioni.',
    };
  }

  return (
    <button
      type="button"
      onClick={() => setExpanded(!expanded)}
      className="w-full rounded-none border-2 p-2.5 text-left transition-none"
      style={{ borderColor: `${stage.color}66`, backgroundColor: 'rgba(20,18,16,0.5)' }}
      aria-expanded={expanded}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="inline-block h-2 w-2 shrink-0"
            style={{ backgroundColor: stage.color, boxShadow: `0 0 6px ${stage.color}` }}
          />
          <p className="text-[10px] font-black uppercase tracking-widest truncate" style={{ color: stage.color }}>
            {stage.label}
          </p>
        </div>
        <ChevronDown
          size={12}
          className="shrink-0 text-neutral-500 transition-transform"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </div>
      {expanded && (
        <div className="mt-2 space-y-1.5">
          <p className="text-[11px] text-foreground leading-relaxed">{stage.explain}</p>
          <p className="text-[11px] leading-relaxed" style={{ color: stage.color }}>
            <strong className="uppercase">→ Cosa fare:</strong> {stage.remedy}
          </p>
        </div>
      )}
    </button>
  );
}

interface PredatorStats {
  financial_debt: number;
  lucidity_level: number;
  sovereign_streak: number;
  last_vice_timestamp: string | null;
  last_clean_day_at: string | null;
  last_activity_at: string | null;
}

const INTRO_DISMISS_KEY = 'predator_intro_dismissed_v1';
const CLEAN_DAY_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export default function PredatorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<PredatorStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [confirmVice, setConfirmVice] = useState(false);
  const [confirmSovereign, setConfirmSovereign] = useState(false);
  const [confirmCleanDay, setConfirmCleanDay] = useState(false);

  useEffect(() => {
    if (!user) return;
    void loadStatsAndCheckPassivity();
    setShowIntro(localStorage.getItem(INTRO_DISMISS_KEY) !== '1');
  }, [user]);

  // Ensure no leftover global filter from previous version
  useEffect(() => {
    document.documentElement.style.filter = '';
    return () => {
      document.documentElement.style.filter = '';
    };
  }, []);

  async function loadStats() {
    if (!user) return null;
    const { data } = await supabase
      .from('profiles')
      .select(
        'financial_debt, lucidity_level, sovereign_streak, last_vice_timestamp, last_clean_day_at, last_activity_at',
      )
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      setStats(data as PredatorStats);
      return data as PredatorStats;
    }
    return null;
  }

  async function loadStatsAndCheckPassivity() {
    const data = await loadStats();
    if (!data) return;
    // Trigger server-side passivity check (idempotent — server enforces 24h cooldown)
    const { data: result } = await supabase.functions.invoke('calculateVicePenalty', {
      body: { action: 'passivity_check' },
    });
    if (result?.ok && result.applied_tax) {
      setStats({
        financial_debt: result.financial_debt,
        lucidity_level: result.lucidity_level,
        sovereign_streak: result.sovereign_streak,
        last_vice_timestamp: result.last_vice_timestamp,
        last_clean_day_at: result.last_clean_day_at,
        last_activity_at: result.last_activity_at,
      });
      toast.error('+50€ Tassa di Passività. 24h senza azione = debolezza.', {
        duration: 6000,
      });
    }
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
      last_clean_day_at: data.last_clean_day_at,
      last_activity_at: data.last_activity_at,
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
      last_clean_day_at: data.last_clean_day_at,
      last_activity_at: data.last_activity_at,
    });
    toast.success('Azione Sovrana registrata.');
  }

  async function declareCleanDay() {
    if (!user || !stats || loading) return;
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('calculateVicePenalty', {
      body: { action: 'clean_day' },
    });
    setLoading(false);
    if (error || !data?.ok) {
      toast.error('Errore. Riprova.');
      return;
    }
    if (data.blocked === 'cooldown') {
      toast.error('Già dichiarato nelle ultime 24h. Aspetta.');
      return;
    }
    setStats({
      financial_debt: data.financial_debt,
      lucidity_level: data.lucidity_level,
      sovereign_streak: data.sovereign_streak,
      last_vice_timestamp: data.last_vice_timestamp,
      last_clean_day_at: data.last_clean_day_at,
      last_activity_at: data.last_activity_at,
    });
    toast.success('DNA Integrato. Streak +1. Hai guadagnato altre 24 ore di dignità.', {
      duration: 5000,
    });
  }

  if (!stats) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const inDebt = stats.financial_debt > 0;

  // Clean day cooldown
  const lastCleanMs = stats.last_clean_day_at ? new Date(stats.last_clean_day_at).getTime() : 0;
  const cleanCooldownRemaining = Math.max(0, CLEAN_DAY_COOLDOWN_MS - (Date.now() - lastCleanMs));
  const cleanAvailable = cleanCooldownRemaining === 0;
  const cleanHoursLeft = Math.ceil(cleanCooldownRemaining / (60 * 60 * 1000));

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
              <strong className="text-primary">NUCLEO</strong> — il tuo DNA visualizzato. Stabile e ambra = sovrano. Glitchato e grigio = in necrosi.
            </li>
            <li>
              <strong className="text-destructive">DEBITO</strong> — quanto stai derubando il futuro, in euro. Più sale, più il Nucleo si corrompe.
            </li>
            <li>
              <strong className="text-amber-500">LUCIDITÀ</strong> — chiarezza mentale (0–100). Cala con i vizi, sale con le azioni sovrane.
            </li>
            <li>
              <strong className="text-emerald-500">STREAK</strong> — giorni di controllo. Moltiplica lo sconto sul debito (7gg=−50€, 14gg=−100€).
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

      {/* DNA Core — Nucleo della Sovranità */}
      <div className="rounded-none border-2 border-neutral-800 bg-neutral-950 p-4 space-y-3">
        <DNACore debt={stats.financial_debt} lucidity={stats.lucidity_level} />
        <NucleusStatusBanner debt={stats.financial_debt} streak={stats.sovereign_streak} />
      </div>

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
              <p>Soldi virtuali rubati al tuo futuro. Vizio = +100€. Inattività 24h = +50€ (Tassa di Passività). Si paga con le Azioni Sovrane: −25€ base, −50€ con streak ≥7, −100€ con streak ≥14.</p>
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
            ⛓ Stato: Schiavo · Nucleo in Necrosi
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
                <p>La tua chiarezza mentale. Ogni Vizio te ne toglie <strong>15</strong>. Ogni Azione Sovrana te ne ridà <strong>2</strong>.</p>
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
                <p>Giorni di controllo. <strong>+1</strong> ad ogni Azione Sovrana o Giorno Pulito. Un cedimento la <strong>azzera</strong>. Moltiplica lo sconto sul debito.</p>
              </PopoverContent>
            </Popover>
          </div>
          <div className="font-black tabular-nums text-emerald-500" style={{ fontSize: '2rem' }}>
            {stats.sovereign_streak}
            <span className="text-xs text-neutral-600"> gg</span>
          </div>
          <p className="mt-2 text-[9px] uppercase tracking-wider text-neutral-600">
            {stats.sovereign_streak >= 14
              ? '⚡ Riscatto: −100€/azione'
              : stats.sovereign_streak >= 7
                ? '⚡ Riscatto: −50€/azione'
                : 'Riscatto: −25€/azione'}
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
              Droghe, alcol, porno, scroll, abbuffata, gioco... +100€ debito.
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
              Lavoro vero, allenamento, disciplina. +1 streak, paga debito.
            </div>
          </button>
        </div>

        {/* Clean Day button — full width */}
        <button
          onClick={() => cleanAvailable && setConfirmCleanDay(true)}
          disabled={loading || !cleanAvailable}
          className="w-full rounded-none border-2 border-amber-800 bg-amber-950/20 p-3 text-left transition-none hover:bg-amber-900/30 active:bg-amber-900/50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-amber-500">
            <Sun size={10} /> Resistenza Attiva
          </div>
          <div className="mt-1 text-xs font-bold uppercase text-amber-300">
            Dichiaro Giorno Pulito
          </div>
          <div className="mt-1 text-[10px] text-amber-700 leading-tight">
            {cleanAvailable
              ? '24h senza cedimenti. Resistere è un atto attivo. +1 streak, paga debito.'
              : `Già dichiarato. Disponibile tra ~${cleanHoursLeft}h.`}
          </div>
        </button>

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
                Premi <strong>SOLO</strong> se hai davvero ceduto a un vizio (droghe, alcol, porno, scroll, abbuffata, gioco, fuga, procrastinazione grave...).
              </span>
              <span className="block text-destructive font-bold">
                Conseguenze: +100€ debito · −15 lucidità · streak azzerata · Nucleo in necrosi.
              </span>
              <span className="block text-muted-foreground text-xs">
                Non mentire al sistema. Se ti dichiari vittima quando non lo sei, sabotti il tuo cruscotto.
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
                Premi <strong>SOLO</strong> se hai compiuto un'azione reale e difficile: lavoro concentrato, allenamento, conversazione che evitavi, decisione dura.
              </span>
              <span className="block text-emerald-500 font-bold">
                Conseguenze: +1 streak · +2 lucidità · paga il debito (sconto in base alla streak).
              </span>
              <span className="block text-muted-foreground text-xs">
                Non gonfiare la streak con azioni banali. Il numero serve a te.
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

      {/* Confirm Clean Day */}
      <AlertDialog open={confirmCleanDay} onOpenChange={setConfirmCleanDay}>
        <AlertDialogContent className="rounded-none border-2 border-amber-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-500 uppercase font-black">
              <Sun size={18} /> Dichiari un Giorno Pulito
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-sm">
              <span className="block">
                Negli ultimi tempi <strong>NON hai ceduto</strong> a nessun vizio. Resistere è un atto attivo, non un'assenza.
              </span>
              <span className="block text-amber-500 font-bold">
                Conseguenze: +1 streak · +2 lucidità · paga il debito.
              </span>
              <span className="block text-muted-foreground text-xs">
                Disponibile una volta ogni 24h. Non barare: il sistema serve a te.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={declareCleanDay}
              className="rounded-none bg-amber-600 text-white hover:bg-amber-500"
            >
              Sì, ho resistito
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
