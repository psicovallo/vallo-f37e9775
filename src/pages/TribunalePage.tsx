import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function TribunalePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);
  const [cycle, setCycle] = useState<any>(null);
  const [improvements, setImprovements] = useState<string[]>([]);
  const [criticalAreas, setCriticalAreas] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    loadCycle();
  }, [user]);

  const loadCycle = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('forgia_cycles')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setCycle(data);
      setImprovements(data.improvements || []);
      setCriticalAreas(data.critical_areas || []);
    } else {
      // Mock data for demo
      setImprovements([
        'Hai mostrato maggiore consapevolezza nelle risposte',
        'Diminuito il tempo di reazione emotiva',
        'Riconosciuto pattern ricorrenti',
      ]);
      setCriticalAreas([
        'Tendenza a giustificare le proprie azioni',
        'Resistenza al cambiamento di prospettiva',
      ]);
    }
    setLoading(false);
  };

  const handleArchiveAndReset = async () => {
    if (!user) return;
    setArchiving(true);

    try {
      // Get current analysis
      const { data: profile } = await supabase
        .from('profiles')
        .select('ai_profile_analysis')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile?.ai_profile_analysis) {
        // Get next cycle number
        const { count } = await supabase
          .from('profile_analysis_archive')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // Archive current analysis
        await supabase.from('profile_analysis_archive').insert({
          user_id: user.id,
          analysis_text: profile.ai_profile_analysis,
          cycle_number: (count || 0) + 1,
        });

        // Clear current analysis
        await supabase.from('profiles').update({
          ai_profile_analysis: null,
          ai_profile_updated_at: null,
        } as any).eq('user_id', user.id);
      }

      // Close active cycle
      if (cycle) {
        await supabase
          .from('forgia_cycles')
          .update({ status: 'completed', ended_at: new Date().toISOString() })
          .eq('id', cycle.id);
      }

      toast.success('Ciclo archiviato. Ricompila il tuo profilo per iniziare un nuovo ciclo.');
      navigate('/profile');
    } catch (err) {
      toast.error('Errore nell\'archiviazione');
    }
    setArchiving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-red-600" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-[#E0E0E0]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-neutral-800">
        <button onClick={() => navigate(-1)} className="p-2 text-neutral-400 hover:text-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-black tracking-widest uppercase text-white">IL TRIBUNALE</h1>
        <div className="w-10" />
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-8">
        {/* Improvements */}
        <div>
          <h2 className="text-xs uppercase tracking-[0.3em] text-green-500 mb-4 font-bold">
            🧱 Mattoni Posati
          </h2>
          <div className="space-y-3">
            {improvements.length > 0 ? improvements.map((item, i) => (
              <div key={i} className="flex items-start gap-3 border border-neutral-800 p-3">
                <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
                <p className="text-sm text-neutral-300">{item}</p>
              </div>
            )) : (
              <p className="text-sm text-neutral-500 italic">Nessun miglioramento registrato in questo ciclo.</p>
            )}
          </div>
        </div>

        {/* Critical areas */}
        <div>
          <h2 className="text-xs uppercase tracking-[0.3em] text-red-500 mb-4 font-bold">
            ⚡ Crepe Strutturali
          </h2>
          <div className="space-y-3">
            {criticalAreas.length > 0 ? criticalAreas.map((item, i) => (
              <div key={i} className="flex items-start gap-3 border border-neutral-800 p-3">
                <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-neutral-300">{item}</p>
              </div>
            )) : (
              <p className="text-sm text-neutral-500 italic">Nessuna area critica identificata.</p>
            )}
          </div>
        </div>

        {/* Archive button */}
        <button
          onClick={handleArchiveAndReset}
          disabled={archiving}
          className="w-full py-4 mt-8 border-2 border-red-800 bg-red-900/30 text-sm font-black uppercase tracking-wider text-white hover:bg-red-900/60 active:scale-95 transition-all disabled:opacity-50"
        >
          {archiving ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Archiviazione...
            </span>
          ) : (
            'ARCHIVIA E INIZIA NUOVO CICLO'
          )}
        </button>

        <p className="text-[10px] text-neutral-500 text-center">
          L'analisi corrente verrà spostata nel Cimitero delle Illusioni.
          Dovrai ricompilare il Profilo Evolutivo con la tua nuova consapevolezza.
        </p>
      </div>
    </div>
  );
}
