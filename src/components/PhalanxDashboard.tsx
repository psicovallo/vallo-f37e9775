/**
 * PhalanxDashboard — Il Patto della Falange
 * Mostra le reclute del Generale (stato Nucleo, NON i loro segreti),
 * permette di inviare la "CONDANNA" via WhatsApp/Telegram/copia-link,
 * e mostra il moltiplicatore Falange attivo.
 */
import { useEffect, useState } from 'react';
import { Skull, Send, Copy, Trash2, Shield, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DNACore from '@/components/DNACore';
import { toast } from 'sonner';

interface PhalanxPact {
  id: string;
  general_id: string;
  recruit_id: string | null;
  invite_token: string;
  recruit_name: string | null;
  status: 'pending' | 'active' | 'corrupted';
  accepted_at: string | null;
  corrupted_at: string | null;
  created_at: string;
}

interface RecruitState {
  pact: PhalanxPact;
  debt: number;
  lucidity: number;
  streak: number;
  name: string | null;
}

const SHARE_TEXT =
  'Il mio Nucleo su Psico Vallo è integro. Scommetto che il tuo marcirebbe in 48 ore. Entra e dimostrami che hai ancora il controllo della tua vita, o resta dove sei.';

function makeToken(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

export default function PhalanxDashboard() {
  const { user } = useAuth();
  const [pacts, setPacts] = useState<PhalanxPact[]>([]);
  const [recruits, setRecruits] = useState<RecruitState[]>([]);
  const [multiplier, setMultiplier] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const baseUrl = window.location.origin;

  useEffect(() => {
    if (!user) return;
    void loadAll();
  }, [user]);

  const loadAll = async () => {
    if (!user) return;
    setLoading(true);

    // Profile multiplier
    const { data: profile } = await supabase
      .from('profiles')
      .select('phalanx_multiplier' as any)
      .eq('user_id', user.id)
      .maybeSingle();
    setMultiplier(Number((profile as any)?.phalanx_multiplier ?? 1.0));

    // Pacts where I'm the General
    const { data: pactRows } = await supabase
      .from('phalanx_pacts' as any)
      .select('*')
      .eq('general_id', user.id)
      .order('created_at', { ascending: false });

    const list = (pactRows ?? []) as unknown as PhalanxPact[];
    setPacts(list);

    // Load recruit states (debt/lucidity/streak/name) for active/corrupted ones
    const recruitIds = list
      .filter((p) => !!p.recruit_id)
      .map((p) => p.recruit_id as string);

    if (recruitIds.length > 0) {
      const { data: recProfiles } = await supabase
        .from('profiles')
        .select('user_id, financial_debt, lucidity_level, sovereign_streak, name')
        .in('user_id', recruitIds);

      const states: RecruitState[] = list
        .filter((p) => !!p.recruit_id)
        .map((p) => {
          const r = (recProfiles ?? []).find((x: any) => x.user_id === p.recruit_id) as any;
          return {
            pact: p,
            debt: Number(r?.financial_debt ?? 0),
            lucidity: Number(r?.lucidity_level ?? 0),
            streak: Number(r?.sovereign_streak ?? 0),
            name: p.recruit_name || r?.name || null,
          };
        });
      setRecruits(states);
    } else {
      setRecruits([]);
    }
    setLoading(false);
  };

  const createInvite = async () => {
    if (!user) return;
    setCreating(true);
    const token = makeToken();
    const { error } = await supabase.from('phalanx_pacts' as any).insert({
      general_id: user.id,
      invite_token: token,
      status: 'pending',
    });
    setCreating(false);
    if (error) {
      toast.error('Impossibile generare la condanna.');
      return;
    }
    const link = `${baseUrl}/falange/${token}`;
    const fullText = `${SHARE_TEXT}\n\n${link}`;

    // Try Web Share API first
    if (navigator.share) {
      try {
        await navigator.share({ text: fullText });
        toast.success('Condanna inviata. Aspetta che marcisca o si risvegli.');
        await loadAll();
        return;
      } catch {
        // fall through to copy
      }
    }
    await navigator.clipboard.writeText(fullText);
    toast.success('Condanna copiata. Incollala su WhatsApp/Telegram.');
    await loadAll();
  };

  const copyLink = async (token: string) => {
    const link = `${baseUrl}/falange/${token}`;
    await navigator.clipboard.writeText(`${SHARE_TEXT}\n\n${link}`);
    toast.success('Link copiato.');
  };

  const deletePact = async (id: string) => {
    const { error } = await supabase.from('phalanx_pacts' as any).delete().eq('id', id);
    if (error) {
      toast.error('Errore.');
      return;
    }
    toast.success('Patto cancellato.');
    await loadAll();
  };

  const activeRecruits = recruits.filter((r) => r.pact.status === 'active');
  const corrupted = recruits.filter((r) => r.pact.status === 'corrupted');
  const pending = pacts.filter((p) => p.status === 'pending');

  const isPhalanxActive = multiplier > 1.0;

  return (
    <div className="rounded-none border-2 border-red-900/60 bg-neutral-950 p-4 mb-4">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-red-600" />
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-red-500">
              Il Patto della Falange
            </p>
            <p className="text-[10px] uppercase tracking-widest text-neutral-500">
              {activeRecruits.length} reclute attive · Moltiplicatore{' '}
              <span className={isPhalanxActive ? 'text-amber-500 font-black' : 'text-neutral-400'}>
                ×{multiplier.toFixed(1)}
              </span>
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-neutral-500" />
        ) : (
          <ChevronDown size={16} className="text-neutral-500" />
        )}
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          {/* Multiplier explainer */}
          <div
            className={`border-2 p-3 ${
              isPhalanxActive
                ? 'border-amber-700/60 bg-amber-950/20'
                : 'border-neutral-800 bg-neutral-900'
            }`}
          >
            <p
              className={`text-[10px] font-black uppercase tracking-widest ${
                isPhalanxActive ? 'text-amber-500' : 'text-neutral-500'
              }`}
            >
              {isPhalanxActive ? '⚔ Falange Attiva — ×1.5 sulle Azioni Sovrane' : 'Falange Inattiva — ×1.0'}
            </p>
            <p className="mt-1 text-[11px] text-neutral-300 leading-relaxed">
              {isPhalanxActive
                ? `Hai reclute sane che combattono. Ogni Azione Sovrana vale di più (es. -37.5€ invece di -25€). Se una recluta marcisce (debito > 300€), il patto si corrompe e perdi il bonus.`
                : `Servono reclute con Debito = 0 e Streak > 3 per attivare il moltiplicatore ×1.5. Recluta sovrani, non zombie.`}
            </p>
          </div>

          {/* INVIA CONDANNA button */}
          <button
            onClick={createInvite}
            disabled={creating}
            className="w-full rounded-none border-2 border-red-700 bg-red-950 py-3 px-4 text-sm font-black uppercase tracking-widest text-red-200 transition-colors hover:bg-red-900 active:scale-[0.98] disabled:opacity-50"
          >
            <span className="flex items-center justify-center gap-2">
              <Send size={16} /> {creating ? 'Generando...' : 'Invia Condanna'}
            </span>
          </button>
          <p className="text-[9px] uppercase tracking-widest text-neutral-600 text-center">
            Genera link · Apri WhatsApp/Telegram · Sfida un debole
          </p>

          {/* Pending invites */}
          {pending.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">
                Condanne in Sospeso ({pending.length})
              </p>
              <div className="space-y-1">
                {pending.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between border-2 border-neutral-800 bg-neutral-900 p-2"
                  >
                    <span className="text-[10px] text-neutral-400 font-mono truncate">
                      /falange/{p.invite_token.slice(0, 8)}…
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => copyLink(p.invite_token)}
                        className="p-1.5 border border-neutral-700 hover:border-amber-600"
                        aria-label="Copia link"
                      >
                        <Copy size={12} className="text-neutral-400" />
                      </button>
                      <button
                        onClick={() => deletePact(p.id)}
                        className="p-1.5 border border-neutral-700 hover:border-red-600"
                        aria-label="Cancella"
                      >
                        <Trash2 size={12} className="text-neutral-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active recruits */}
          {activeRecruits.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2 flex items-center gap-1">
                <Users size={11} /> Reclute Attive ({activeRecruits.length})
              </p>
              <div className="grid grid-cols-2 gap-2">
                {activeRecruits.map((r) => (
                  <div
                    key={r.pact.id}
                    className="border-2 border-neutral-800 bg-neutral-950 p-2 flex flex-col items-center"
                  >
                    <DNACore debt={r.debt} lucidity={r.lucidity} />
                    <p className="mt-1 text-[10px] uppercase tracking-widest text-neutral-400 truncate w-full text-center">
                      {r.name || 'Recluta'}
                    </p>
                    <p className="text-[9px] uppercase tracking-widest text-neutral-600">
                      Streak {r.streak} · {r.debt}€
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Corrupted */}
          {corrupted.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-red-700 mb-2 flex items-center gap-1">
                <Skull size={11} /> Patti Corrotti ({corrupted.length})
              </p>
              <div className="space-y-1">
                {corrupted.map((r) => (
                  <div
                    key={r.pact.id}
                    className="flex items-center justify-between border-2 border-red-950 bg-red-950/20 p-2"
                  >
                    <span className="text-[10px] text-red-400 truncate">
                      {r.name || 'Recluta'} · {r.debt}€ debito
                    </span>
                    <button
                      onClick={() => deletePact(r.pact.id)}
                      className="p-1 border border-red-900 hover:border-red-600"
                      aria-label="Rimuovi"
                    >
                      <Trash2 size={11} className="text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <p className="text-[10px] uppercase tracking-widest text-neutral-600 text-center">
              Caricamento Falange...
            </p>
          )}

          {!loading && pacts.length === 0 && (
            <p className="text-[10px] uppercase tracking-widest text-neutral-600 text-center py-2">
              Nessuna recluta. Sei un lupo solitario. Invia condanne.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
