import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Skull, Flame, Shield, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface PredatorStats {
  financial_debt: number;
  lucidity_level: number;
  sovereign_streak: number;
  last_vice_timestamp: string | null;
}

const VICE_DEBT_INCREMENT = 100;
const VICE_LUCIDITY_PENALTY = 15;

export default function PredatorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<PredatorStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    void loadStats();
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
      {/* Giant debt counter */}
      <div
        className={`rounded-none border-2 p-6 text-center ${
          inDebt ? 'border-red-700 bg-red-950/40' : 'border-neutral-800 bg-neutral-950'
        }`}
      >
        <div className="mb-1 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500">
          <Skull size={12} /> Debito al Futuro
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
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={declareVice}
          disabled={loading}
          className="rounded-none border-2 border-red-800 bg-red-950/30 p-3 text-left transition-none hover:bg-red-900/40 active:bg-red-900/60 disabled:opacity-50"
        >
          <div className="text-[9px] font-black uppercase tracking-widest text-red-500">
            ⚠ Cedimento
          </div>
          <div className="mt-1 text-xs font-bold uppercase text-red-300">Dichiara Vizio</div>
          <div className="mt-1 text-[10px] text-red-700">+{VICE_DEBT_INCREMENT}€ debito</div>
        </button>
        <button
          onClick={declareSovereignAction}
          disabled={loading}
          className="rounded-none border-2 border-emerald-800 bg-emerald-950/30 p-3 text-left transition-none hover:bg-emerald-900/40 active:bg-emerald-900/60 disabled:opacity-50"
        >
          <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-500">
            <Zap size={10} /> Sovrano
          </div>
          <div className="mt-1 text-xs font-bold uppercase text-emerald-300">Azione Sovrana</div>
          <div className="mt-1 text-[10px] text-emerald-700">+1 streak</div>
        </button>
      </div>
    </div>
  );
}
