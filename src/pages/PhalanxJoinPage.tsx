/**
 * PhalanxJoinPage — /falange/:token
 * Recluta atterra qui, vede la sfida del Generale, accetta il patto.
 * Se non loggato: redirect a /auth e poi torna qui per accettare.
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Skull, Flame } from 'lucide-react';
import { toast } from 'sonner';

interface PactRow {
  id: string;
  general_id: string;
  recruit_id: string | null;
  status: string;
}

export default function PhalanxJoinPage() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [pact, setPact] = useState<PactRow | null>(null);
  const [generalName, setGeneralName] = useState<string>('Un Generale');
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) return;
    void loadPact();
  }, [token, user]);

  const loadPact = async () => {
    if (!token) return;
    setLoading(true);
    const { data } = await supabase
      .from('phalanx_pacts' as any)
      .select('id, general_id, recruit_id, status')
      .eq('invite_token', token)
      .maybeSingle();

    const row = data as unknown as PactRow | null;
    setPact(row);

    if (row?.general_id) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', row.general_id)
        .maybeSingle();
      setGeneralName((prof as any)?.name || 'Un Sovrano');
    }
    setLoading(false);
  };

  const handleAccept = async () => {
    if (!user) {
      // Save token and redirect to auth
      sessionStorage.setItem('pendingPhalanxToken', token || '');
      navigate('/auth');
      return;
    }
    if (!pact) return;
    if (pact.general_id === user.id) {
      toast.error('Non puoi reclutare te stesso.');
      return;
    }
    setAccepting(true);
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('user_id', user.id)
      .maybeSingle();

    const { error } = await supabase
      .from('phalanx_pacts' as any)
      .update({
        recruit_id: user.id,
        recruit_name: (profile as any)?.name || user.email?.split('@')[0] || 'Recluta',
        status: 'active',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', pact.id);

    setAccepting(false);
    if (error) {
      toast.error('Errore accettazione patto.');
      return;
    }
    sessionStorage.removeItem('pendingPhalanxToken');
    toast.success('Patto della Falange accettato. Ora il tuo Nucleo è osservato.');
    navigate('/home');
  };

  // Auto-accept if user just logged in with pending token
  useEffect(() => {
    if (!authLoading && user && pact && pact.status === 'pending' && !pact.recruit_id) {
      const pending = sessionStorage.getItem('pendingPhalanxToken');
      if (pending && pending === token) {
        void handleAccept();
      }
    }
  }, [authLoading, user, pact]);

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  if (!pact) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black p-6 text-center">
        <Skull size={48} className="text-red-700 mb-4" />
        <p className="text-sm font-black uppercase tracking-widest text-red-500">
          Patto Inesistente
        </p>
        <p className="mt-2 text-xs text-neutral-400 max-w-sm">
          Il link è scaduto, falsificato, o il Generale ha revocato la condanna.
        </p>
        <Link
          to="/"
          className="mt-6 border-2 border-amber-700 px-4 py-2 text-xs uppercase tracking-widest text-amber-500 hover:bg-amber-950"
        >
          Torna alla Base
        </Link>
      </div>
    );
  }

  if (pact.status === 'active' && pact.recruit_id !== user?.id) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black p-6 text-center">
        <Shield size={48} className="text-neutral-600 mb-4" />
        <p className="text-sm font-black uppercase tracking-widest text-neutral-400">
          Patto Già Accettato
        </p>
        <p className="mt-2 text-xs text-neutral-500 max-w-sm">
          Un'altra anima ha raccolto questa sfida prima di te.
        </p>
        <Link
          to="/"
          className="mt-6 border-2 border-amber-700 px-4 py-2 text-xs uppercase tracking-widest text-amber-500 hover:bg-amber-950"
        >
          Trova la tua battaglia
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black px-4 py-12">
      <div className="mx-auto max-w-md space-y-6">
        <div className="text-center">
          <Flame size={40} className="mx-auto text-red-600 mb-3" />
          <h1 className="text-xl font-black uppercase tracking-widest text-red-500">
            Sei stato Condannato
          </h1>
          <p className="mt-1 text-[10px] uppercase tracking-widest text-neutral-500">
            Da {generalName}
          </p>
        </div>

        <div className="border-2 border-red-900 bg-red-950/20 p-5">
          <p className="text-sm text-foreground leading-relaxed italic">
            "Il mio Nucleo su Psico Vallo è integro. Scommetto che il tuo marcirebbe in 48 ore.
            Entra e dimostrami che hai ancora il controllo della tua vita, o resta dove sei."
          </p>
        </div>

        <div className="border-2 border-amber-900/60 bg-amber-950/10 p-4 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">
            Cosa significa accettare
          </p>
          <ul className="text-[11px] text-neutral-300 leading-relaxed space-y-1 list-disc list-inside">
            <li>Il tuo Nucleo sarà visibile al Generale (solo stato, non i tuoi segreti).</li>
            <li>Se resti sovrano, lo rendi più forte (×1.5 sulle sue azioni).</li>
            <li>Se marcisci oltre 300€ di debito, il patto si corrompe e lo umili.</li>
          </ul>
        </div>

        <button
          onClick={handleAccept}
          disabled={accepting}
          className="w-full rounded-none border-2 border-red-700 bg-red-950 py-4 px-4 text-sm font-black uppercase tracking-widest text-red-200 transition-colors hover:bg-red-900 active:scale-[0.98] disabled:opacity-50"
        >
          {accepting ? 'Accettazione...' : user ? 'Accetto la Sfida' : 'Registrati & Accetta'}
        </button>

        <p className="text-[9px] text-center uppercase tracking-widest text-neutral-700">
          Oppure chiudi questa pagina e resta dove sei.
        </p>
      </div>
    </div>
  );
}
