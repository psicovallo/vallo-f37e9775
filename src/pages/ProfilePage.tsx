import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Brain, Loader2, User, Target, MessageCircle, AlertTriangle, Compass, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import VoiceInput from '@/components/VoiceInput';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

interface ProfileData {
  name: string;
  objective: string;
  milestone_zero: string;
  communication_style: string;
  current_problems: string;
  vision: string;
  ai_profile_analysis: string;
  ai_profile_updated_at: string | null;
  lingua_madre: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData>({
    name: '', objective: '', milestone_zero: '', communication_style: '',
    current_problems: '', vision: '', ai_profile_analysis: '',
    ai_profile_updated_at: null, lingua_madre: 'italiano',
  });
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('name, objective, milestone_zero, communication_style, current_problems, vision, ai_profile_analysis, ai_profile_updated_at, lingua_madre')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProfile({
            name: (data as any).name || '',
            objective: (data as any).objective || '',
            milestone_zero: (data as any).milestone_zero || '',
            communication_style: (data as any).communication_style || '',
            current_problems: (data as any).current_problems || '',
            vision: (data as any).vision || '',
            ai_profile_analysis: (data as any).ai_profile_analysis || '',
            ai_profile_updated_at: (data as any).ai_profile_updated_at || null,
            lingua_madre: (data as any).lingua_madre || 'italiano',
          });
        }
        setLoading(false);
      });
  }, [user]);

  const updateField = (field: keyof ProfileData, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      name: profile.name,
      objective: profile.objective,
      milestone_zero: profile.milestone_zero,
      communication_style: profile.communication_style,
      current_problems: profile.current_problems,
      vision: profile.vision,
    } as any).eq('user_id', user.id);
    if (error) {
      toast.error('Errore nel salvataggio');
    } else {
      toast.success('Profilo salvato');
    }
    setSaving(false);
  };

  const requestAnalysis = async () => {
    if (!user) return;
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-profile', {
        body: { user_id: user.id },
      });
      if (error) throw error;
      setProfile(prev => ({
        ...prev,
        ai_profile_analysis: data.analysis,
        ai_profile_updated_at: new Date().toISOString(),
      }));
      toast.success('Il Consiglio ha aggiornato il tuo profilo');
    } catch (err: any) {
      toast.error('Errore nell\'analisi: ' + (err.message || 'Riprova'));
    }
    setAnalyzing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-28 space-y-6">
      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="text-xl font-bold text-foreground flex items-center justify-center gap-2">
          <User size={22} className="text-primary" />
          Il Mio Profilo Evolutivo
        </h1>
        <p className="text-xs text-muted-foreground">
          Scrivi chi sei. Il Consiglio dei 15 leggerà tutto il tuo percorso.
        </p>
      </div>

      {/* User-written section */}
      <div className="space-y-4">
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
          <h2 className="text-sm font-bold text-primary flex items-center gap-2 mb-3">
            <User size={16} /> Il Tuo Profilo
          </h2>

          <div className="space-y-4">
            <FieldWithVoice
              label="Nome"
              icon={<User size={14} />}
              value={profile.name}
              onChange={v => updateField('name', v)}
              placeholder="Il tuo nome"
              multiline={false}
            />

            <FieldWithVoice
              label="Obiettivo Personale"
              icon={<Target size={14} />}
              value={profile.objective || ''}
              onChange={v => updateField('objective', v)}
              placeholder="Cosa vuoi raggiungere? Qual è il tuo obiettivo principale?"
              hint="Non scrivere cosa speri. Scrivi cosa VUOI."
            />

            <FieldWithVoice
              label="Come Parlo — Il Mio Stile"
              icon={<MessageCircle size={14} />}
              value={profile.communication_style}
              onChange={v => updateField('communication_style', v)}
              placeholder="Come comunichi? Quali parole usi di più? Come reagisci sotto pressione?"
              hint="Descrivi il tuo modo di parlare, le tue espressioni tipiche."
            />

            <FieldWithVoice
              label="I Miei Problemi Attuali"
              icon={<AlertTriangle size={14} />}
              value={profile.current_problems}
              onChange={v => updateField('current_problems', v)}
              placeholder="Quali sfide stai affrontando? Dove ti blocchi?"
              hint="Sii brutalmente onesto. Il Consiglio non giudica, analizza."
            />

            <FieldWithVoice
              label="Dove Voglio Andare"
              icon={<Compass size={14} />}
              value={profile.vision}
              onChange={v => updateField('vision', v)}
              placeholder="Chi vuoi diventare? Come ti vedi tra 1 anno? Qual è la versione migliore di te?"
              hint="Descrivi la persona che vuoi essere, non quella che sei."
            />

            <FieldWithVoice
              label="Pietra Miliare Zero"
              icon={<Target size={14} />}
              value={profile.milestone_zero || ''}
              onChange={v => updateField('milestone_zero', v)}
              placeholder="La tua prima riflessione, il punto di partenza del tuo percorso"
            />
          </div>

          <button
            onClick={saveProfile}
            disabled={saving}
            className="w-full mt-4 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Save size={14} /> {saving ? 'Salvataggio...' : 'Salva Profilo'}
          </button>
        </div>
      </div>

      {/* AI-generated section */}
      <div className="rounded-xl border border-primary/30 bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-primary flex items-center gap-2">
            <Brain size={16} /> Analisi del Consiglio dei 15
          </h2>
          {profile.ai_profile_updated_at && (
            <span className="text-[10px] text-muted-foreground">
              Aggiornato {formatDistanceToNow(new Date(profile.ai_profile_updated_at), { addSuffix: true, locale: it })}
            </span>
          )}
        </div>

        {profile.ai_profile_analysis ? (
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
              {profile.ai_profile_analysis}
            </p>
          </div>
        ) : (
          <div className="rounded-lg bg-muted/30 p-4 text-center">
            <Brain size={32} className="mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">
              Il Consiglio non ha ancora analizzato il tuo profilo.
              Clicca il pulsante qui sotto per richiedere l'analisi.
            </p>
          </div>
        )}

        <button
          onClick={requestAnalysis}
          disabled={analyzing}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
        >
          {analyzing ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Il Consiglio sta analizzando...
            </>
          ) : (
            <>
              <Brain size={14} />
              {profile.ai_profile_analysis ? 'Aggiorna Analisi del Consiglio' : 'Richiedi Analisi del Consiglio'}
            </>
          )}
        </button>

        <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
          Il Consiglio leggerà tutti i tuoi appunti, le risposte, i conflitti e il tuo percorso 
          per costruire un profilo psicologico evolutivo.
        </p>
      </div>

      {/* Disclaimer */}
      <p className="text-[10px] text-muted-foreground text-center italic px-4">
        "La comunicazione è lo specchio del tuo DNA. Se vuoi passare dalla reazione alla creazione olografica, 
        vai nel Menu Hamburger → Settings e attiva la Modalità Quantum."
      </p>
    </div>
  );
}

function FieldWithVoice({
  label, icon, value, onChange, placeholder, hint, multiline = true
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  hint?: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
        {icon} {label}
      </label>
      {multiline ? (
        <div className="relative">
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            rows={3}
            className="w-full rounded-xl border border-border bg-card px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
          <div className="absolute right-2 top-2">
            <VoiceInput onTranscript={t => onChange(value ? value + ' ' + t : t)} currentValue={value} />
          </div>
        </div>
      ) : (
        <div className="relative">
          <input
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-border bg-card px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <VoiceInput onTranscript={t => onChange(value ? value + ' ' + t : t)} currentValue={value} />
          </div>
        </div>
      )}
      {hint && <p className="mt-0.5 text-[10px] text-muted-foreground/70">{hint}</p>}
    </div>
  );
}
