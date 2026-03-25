import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Plus, Swords, ChevronDown, ChevronUp, Check, PenLine, Trash2, Loader2,
  RotateCcw, MessageSquarePlus, Eye, HelpCircle, X, Layers, Shield,
  Heart, Briefcase, MessageCircle, Crosshair, Sparkles, Brain, Zap, Target, Info
} from 'lucide-react';

const RELATIONSHIP_OPTIONS = [
  'Compagna', 'Moglie', 'Fidanzata', 'Figlio', 'Figlia', 'Amica',
  'Padre', 'Madre', 'Nonna', 'Collega', 'Capo', 'Dipendente', 'Assistente', 'Altro',
];

const SCENARIOS = [
  { id: 'conflitto', label: 'Conflitto', icon: Swords, description: 'Guerra interpersonale. Smonta le difese.' },
  { id: 'eros', label: 'Eros & Tabù', icon: Heart, description: 'Osa di più. Smonta i blocchi intimi.' },
  { id: 'business', label: 'Power Business', icon: Briefcase, description: 'Negoziazione. Aumenti, contratti, forza.' },
  { id: 'whatsapp', label: 'WhatsApp Shield', icon: MessageCircle, description: 'Rispondi a messaggi manipolatori.' },
];

const DNA_STYLES = [
  { id: 'chirurgico', label: 'Chirurgico', icon: Crosshair, description: 'Freddo, preciso, senza emozione. Solo lama.' },
  { id: 'persuasivo', label: 'Persuasivo', icon: Sparkles, description: 'Seduce prima di colpire. Devastazione nascosta.' },
  { id: 'logico', label: 'Logico', icon: Brain, description: 'Ragionamento inattaccabile. Nessuna leva emotiva.' },
];

const PASSIVE_WORDS = ['spero', 'capisca', 'provare', 'magari', 'forse', 'vorrei', 'speriamo', 'cercherò'];

interface ConflictProfile {
  id: string;
  name: string;
  relationship: string;
  profile_description: string;
  failure_history: string;
  scenario: string;
  user_style: string;
  created_at: string;
}

interface ConflictQuestion {
  id: string;
  conflict_profile_id: string;
  question_text: string;
  validation_text: string;
  status: string;
  adjustment_notes: string | null;
  maestri_used: string;
  velo_number: number;
  created_at: string;
}

type SessionMode = 'choose' | 'last_questions' | 'new_event' | 'generating' | 'whatsapp_input' | 'results' | 'focus12';

export default function SOSConflittiPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profili');
  const [profiles, setProfiles] = useState<ConflictProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<ConflictProfile | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '', relationship: 'Compagna', customRelationship: '',
    profile_description: '', failure_history: '',
    scenario: 'conflitto', user_style: 'chirurgico',
  });
  const [objectiveText, setObjectiveText] = useState('');
  const [objectiveWarning, setObjectiveWarning] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sessionQuestions, setSessionQuestions] = useState<ConflictQuestion[]>([]);
  const [archiveQuestions, setArchiveQuestions] = useState<ConflictQuestion[]>([]);
  const [expandedValidation, setExpandedValidation] = useState<Record<string, boolean>>({});
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [adjustmentText, setAdjustmentText] = useState('');
  const [adjustingQuestionId, setAdjustingQuestionId] = useState<string | null>(null);
  const [sessionMode, setSessionMode] = useState<SessionMode>('choose');
  const [newEventText, setNewEventText] = useState('');
  const [lastQuestions, setLastQuestions] = useState<ConflictQuestion[]>([]);
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [currentVelo, setCurrentVelo] = useState(1);
  const [showWelcome, setShowWelcome] = useState(false);
  const [softenQuestionId, setSoftenQuestionId] = useState<string | null>(null);
  const [quantumEnabled, setQuantumEnabled] = useState(false);
  const [focus12Timer, setFocus12Timer] = useState(30);
  const [pendingConvokeArgs, setPendingConvokeArgs] = useState<any>(null);
  const [linguaMadre, setLinguaMadre] = useState('italiano');

  // Load quantum & lingua from profile
  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('quantum_enabled, lingua_madre').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setQuantumEnabled((data as any).quantum_enabled || false);
          setLinguaMadre((data as any).lingua_madre || 'italiano');
        }
      });
  }, [user]);

  const loadProfiles = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('conflict_profiles').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setProfiles((data as ConflictProfile[]) || []);
  }, [user]);

  const loadArchive = useCallback(async () => {
    if (!user || !selectedProfile) return;
    const { data } = await supabase
      .from('conflict_questions').select('*').eq('conflict_profile_id', selectedProfile.id).eq('user_id', user.id)
      .in('status', ['validated', 'adjusted']).order('created_at', { ascending: false });
    setArchiveQuestions((data as ConflictQuestion[]) || []);
  }, [user, selectedProfile]);

  const loadLastQuestions = useCallback(async () => {
    if (!user || !selectedProfile) return;
    const { data } = await supabase
      .from('conflict_questions').select('*').eq('conflict_profile_id', selectedProfile.id).eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(3);
    setLastQuestions((data as ConflictQuestion[]) || []);
  }, [user, selectedProfile]);

  const loadCurrentVelo = useCallback(async () => {
    if (!user || !selectedProfile) return;
    const { data } = await supabase
      .from('conflict_questions').select('velo_number').eq('conflict_profile_id', selectedProfile.id)
      .in('status', ['validated', 'adjusted']).order('velo_number', { ascending: false }).limit(1);
    setCurrentVelo(data?.length ? (data[0] as any).velo_number + 1 : 1);
  }, [user, selectedProfile]);

  useEffect(() => { loadProfiles(); }, [loadProfiles]);
  useEffect(() => { if (activeTab === 'archivio') loadArchive(); }, [activeTab, loadArchive]);
  useEffect(() => { if (selectedProfile) loadCurrentVelo(); }, [selectedProfile, loadCurrentVelo]);

  // Focus 12 timer countdown
  useEffect(() => {
    if (sessionMode !== 'focus12') return;
    if (focus12Timer <= 0) {
      // Timer done, proceed to actual convoke
      if (pendingConvokeArgs) {
        doConvoca(pendingConvokeArgs);
        setPendingConvokeArgs(null);
      }
      return;
    }
    const t = setTimeout(() => setFocus12Timer(prev => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [sessionMode, focus12Timer]);

  // Objective coaching
  const validateObjective = (text: string) => {
    const lower = text.toLowerCase();
    const found = PASSIVE_WORDS.find(w => lower.includes(w));
    if (found) {
      setObjectiveWarning(
        `Il Consiglio dei Maestri rileva un intento debole. L'universo non risponde a desideri passivi. Cosa deve accadere esattamente nel mondo fisico perché tu possa dire di aver vinto questa partita? Riformula l'obiettivo come un ordine alla realtà.`
      );
    } else {
      setObjectiveWarning('');
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!objectiveText.trim()) {
      toast.error("L'Obiettivo Finale è obbligatorio.");
      return;
    }
    setLoading(true);
    const rel = formData.relationship === 'Altro' ? formData.customRelationship : formData.relationship;
    const payload = {
      user_id: user.id, name: formData.name, relationship: rel,
      profile_description: formData.profile_description, failure_history: formData.failure_history,
      scenario: formData.scenario, user_style: formData.user_style,
    };

    if (editingId) {
      await supabase.from('conflict_profiles').update(payload).eq('id', editingId);
      toast.success('Profilo aggiornato');
    } else {
      await supabase.from('conflict_profiles').insert(payload);
      toast.success('Profilo creato');
    }

    setFormData({ name: '', relationship: 'Compagna', customRelationship: '', profile_description: '', failure_history: '', scenario: 'conflitto', user_style: 'chirurgico' });
    setObjectiveText('');
    setObjectiveWarning('');
    setShowForm(false);
    setEditingId(null);
    await loadProfiles();
    setLoading(false);
  };

  const handleDeleteProfile = async (id: string) => {
    await supabase.from('conflict_profiles').delete().eq('id', id);
    if (selectedProfile?.id === id) setSelectedProfile(null);
    toast.success('Profilo eliminato');
    loadProfiles();
  };

  const handleEditProfile = (p: ConflictProfile) => {
    setFormData({
      name: p.name,
      relationship: RELATIONSHIP_OPTIONS.includes(p.relationship) ? p.relationship : 'Altro',
      customRelationship: RELATIONSHIP_OPTIONS.includes(p.relationship) ? '' : p.relationship,
      profile_description: p.profile_description, failure_history: p.failure_history,
      scenario: p.scenario || 'conflitto', user_style: p.user_style || 'chirurgico',
    });
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleSelectProfile = (p: ConflictProfile) => {
    setSelectedProfile(p);
    setSessionQuestions([]);
    setSessionMode('choose');
    setActiveTab('sessione');
  };

  const startConvoca = (opts: any = {}) => {
    if (quantumEnabled) {
      setFocus12Timer(30);
      setPendingConvokeArgs(opts);
      setSessionMode('focus12');
    } else {
      doConvoca(opts);
    }
  };

  const doConvoca = async (opts: { newEvent?: string; whatsapp?: string; soften?: boolean; veloOverride?: number } = {}) => {
    if (!selectedProfile || !user) return;
    setGenerating(true);
    setSessionMode('generating');
    try {
      const velo = opts.veloOverride ?? currentVelo;
      const body: any = {
        conflict_profile_id: selectedProfile.id,
        language: linguaMadre,
        scenario: selectedProfile.scenario || 'conflitto',
        user_style: selectedProfile.user_style || 'chirurgico',
        velo_number: velo,
        objective: objectiveText || undefined,
        quantum: quantumEnabled,
      };
      if (opts.newEvent) body.new_event = opts.newEvent;
      if (opts.whatsapp) body.whatsapp_message = opts.whatsapp;
      if (opts.soften) body.soften = true;

      const { data, error } = await supabase.functions.invoke('generate-conflict-questions', { body });
      if (error) throw error;
      setSessionQuestions(data.questions || []);
      setSessionMode('results');
    } catch (e: any) {
      toast.error(e.message || 'Errore nella generazione');
      setSessionMode('choose');
    }
    setGenerating(false);
  };

  const handleValida = async (q: ConflictQuestion) => {
    await supabase.from('conflict_questions').update({ status: 'validated' }).eq('id', q.id);
    const updateList = (list: ConflictQuestion[]) => list.map(x => x.id === q.id ? { ...x, status: 'validated' } : x);
    setSessionQuestions(updateList);
    setLastQuestions(updateList);
    toast.success('Validata e archiviata');
    loadCurrentVelo();
  };

  const handleAggiusta = async (q: ConflictQuestion, soften = false) => {
    if (!adjustmentText.trim() && !soften) return;
    setAdjustingQuestionId(q.id);
    try {
      const { data, error } = await supabase.functions.invoke('adjust-conflict-question', {
        body: { question_id: q.id, adjustment_notes: soften ? 'Abbassa il calibro ma mantieni la strategia' : adjustmentText, language: linguaMadre, soften },
      });
      if (error) throw error;
      const updated = data.question;
      const updateList = (list: ConflictQuestion[]) => list.map(x => x.id === q.id ? updated : x);
      setSessionQuestions(updateList);
      setLastQuestions(updateList);
      toast.success('Il Consiglio ha riformulato');
    } catch (e: any) {
      toast.error(e.message || 'Errore');
    }
    setAdjustingId(null);
    setAdjustmentText('');
    setAdjustingQuestionId(null);
    setSoftenQuestionId(null);
  };

  const handleSoftenRequest = (q: ConflictQuestion) => {
    setSoftenQuestionId(q.id);
  };

  const handleConfirmSoften = (q: ConflictQuestion) => {
    handleAggiusta(q, true);
  };

  const handleNextVelo = () => {
    setCurrentVelo(prev => prev + 1);
    startConvoca({ veloOverride: currentVelo + 1 });
  };

  const scenarioIcon = (id: string) => {
    const s = SCENARIOS.find(s => s.id === id);
    if (!s) return <Swords size={14} />;
    const Icon = s.icon;
    return <Icon size={14} />;
  };

  const renderQuestionCard = (q: ConflictQuestion, i: number) => (
    <div key={q.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-medium">
          {selectedProfile?.scenario === 'whatsapp' ? `Risposta ${i + 1}` : `Velo ${q.velo_number} — Frase ${i + 1}`}
        </p>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary">
          {DNA_STYLES.find(s => s.id === (selectedProfile?.user_style || 'chirurgico'))?.label}
        </span>
      </div>

      <p className="text-sm text-foreground font-medium leading-relaxed">"{q.question_text}"</p>

      <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
        <p className="text-xs text-destructive font-medium">
          ⚠️ NON TOCCARE LA FRASE. Ripetila mentalmente 5 volte per caricarla nel tuo sistema nervoso. Una volta detta, aspetta la reazione e torna qui per il Velo successivo.
        </p>
      </div>

      <button
        onClick={() => setExpandedValidation(prev => ({ ...prev, [q.id]: !prev[q.id] }))}
        className="flex items-center gap-1 text-xs text-primary"
      >
        {expandedValidation[q.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        Validazione del Consiglio
      </button>

      {expandedValidation[q.id] && (
        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
          <p>{q.validation_text}</p>
          <p className="text-primary font-medium">Maestri: {q.maestri_used}</p>
        </div>
      )}

      {q.status === 'generated' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button size="sm" onClick={() => handleValida(q)} className="gap-1">
              <Check size={14} /> VALIDA
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setAdjustingId(q.id); setAdjustmentText(''); }} disabled={adjustingQuestionId === q.id} className="gap-1">
              {adjustingQuestionId === q.id ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
              AGGIUSTA
            </Button>
          </div>

          {/* SOFTEN - Warning di Resistenza */}
          {softenQuestionId !== q.id && (
            <button onClick={() => handleSoftenRequest(q)} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
              Ritarara / È troppo per me →
            </button>
          )}

          {softenQuestionId === q.id && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 space-y-2">
              <p className="text-xs text-destructive font-bold leading-relaxed">
                Ogni volta che cerchi una via d'uscita morbida, nutri la tua identità da nullità. 
                Il Consiglio ti sta offrendo il potere, ma tu stai scegliendo la sottomissione. 
                Vuoi davvero ritarare o vuoi finalmente dominare la tua realtà?
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={() => handleConfirmSoften(q)} className="text-xs">
                  Sì, ritara
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSoftenQuestionId(null)} className="text-xs">
                  Hai ragione, domino
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {q.status !== 'generated' && (
        <p className="text-xs text-primary font-medium">✓ {q.status === 'validated' ? 'Validata' : 'Aggiustata'}</p>
      )}

      {adjustingId === q.id && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Spiega cosa non va. Il Consiglio riformulerà.</p>
          <Textarea value={adjustmentText} onChange={e => setAdjustmentText(e.target.value)} placeholder="Es: troppo lunga, tono sbagliato, voglio più colpa..." rows={3} />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => handleAggiusta(q)} disabled={adjustingQuestionId === q.id || !adjustmentText.trim()} className="gap-1">
              {adjustingQuestionId === q.id ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
              Riformula
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdjustingId(null)}>Annulla</Button>
          </div>
        </div>
      )}
    </div>
  );

  // WELCOME / INFO SCREEN
  if (showWelcome) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-6 pb-24">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-foreground">Il Consiglio dei 15</h1>
          <button onClick={() => setShowWelcome(false)} className="p-2 text-muted-foreground hover:text-foreground"><X size={20} /></button>
        </div>
        <div className="space-y-6">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-3">
            <h2 className="text-base font-bold text-primary">Chi siamo</h2>
            <p className="text-sm text-foreground leading-relaxed">
              Siamo il Consiglio dei 15 Maestri — 15 geni della psicologia, persuasione e comunicazione strategica. 
              Bandler, Ellis, Freud, Jung, Frankl, Erickson, Watzlawick, Cialdini, Carnegie, Aurelius, Peterson, 
              Machiavelli, Socrate, Nietzsche e Allen Carr. Lavoriamo come un unico organismo analitico.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h2 className="text-base font-bold text-foreground">Perché la Cipolla</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              La verità e il risultato sono sotto strati di bugie sociali. Ogni "Velo" penetra più in profondità 
              nella psiche del bersaglio. Non puoi saltare i veli. Ogni livello prepara il successivo. 
              Il crollo avviene quando tutti gli strati sono stati dissolti.
            </p>
          </div>
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 space-y-3">
            <h2 className="text-base font-bold text-destructive">La Regola d'Oro</h2>
            <p className="text-sm text-foreground leading-relaxed font-medium">
              Se modifichi la frase, l'arma esplode nelle tue mani. Fidati dei Maestri. 
              Ripeti la frase 5 volte nella tua mente prima di usarla. Poi aspetta la reazione.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h2 className="text-base font-bold text-foreground">Scenari</h2>
            <div className="space-y-2">
              {SCENARIOS.map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.id} className="flex items-start gap-3">
                    <Icon size={16} className="text-primary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{s.label}</p>
                      <p className="text-xs text-muted-foreground">{s.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {/* DNA INFO FOOTER */}
          <div className="rounded-xl border border-muted bg-muted/30 p-5 space-y-2">
            <h2 className="text-base font-bold text-foreground">DNA — Decoding & Neural Adaptation</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              La comunicazione è lo specchio del tuo DNA. Se vuoi passare dalla reazione alla creazione olografica, 
              vai nel Menu Hamburger → Settings e attiva la Modalità Quantum.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 pt-6 pb-24">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Swords size={24} className="text-primary" />
          <h1 className="text-xl font-bold text-foreground">SOS DNA</h1>
          {quantumEnabled && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary flex items-center gap-1"><Zap size={10} /> Quantum</span>}
        </div>
        <button onClick={() => setShowWelcome(true)} className="p-2 text-muted-foreground hover:text-primary transition-colors">
          <HelpCircle size={20} />
        </button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="profili" className="flex-1">Profili</TabsTrigger>
          <TabsTrigger value="sessione" className="flex-1" disabled={!selectedProfile}>Sessione</TabsTrigger>
          <TabsTrigger value="archivio" className="flex-1" disabled={!selectedProfile}>Archivio</TabsTrigger>
        </TabsList>

        {/* PROFILI TAB */}
        <TabsContent value="profili" className="space-y-4">
          {!showForm && (
            <Button onClick={() => { setShowForm(true); setEditingId(null); }} className="w-full gap-2">
              <Plus size={16} /> Nuovo Profilo Bersaglio
            </Button>
          )}

          {showForm && (
            <div className="space-y-3 rounded-xl border border-border bg-card p-4">
              <div>
                <Label>Nome</Label>
                <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Nome della persona" />
              </div>
              <div>
                <Label>Relazione</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.relationship} onChange={e => setFormData(p => ({ ...p, relationship: e.target.value }))}>
                  {RELATIONSHIP_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                {formData.relationship === 'Altro' && (
                  <Input className="mt-2" value={formData.customRelationship} onChange={e => setFormData(p => ({ ...p, customRelationship: e.target.value }))} placeholder="Specifica relazione" />
                )}
              </div>

              {/* SCENARIO SELECTOR */}
              <div>
                <Label>Scenario</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {SCENARIOS.map(s => {
                    const Icon = s.icon;
                    const active = formData.scenario === s.id;
                    return (
                      <button key={s.id} type="button" onClick={() => setFormData(p => ({ ...p, scenario: s.id }))}
                        className={`flex items-center gap-2 rounded-lg border p-3 text-left transition-colors ${active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground hover:border-primary/50'}`}>
                        <Icon size={16} /><span className="text-xs font-medium">{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* DNA STYLE SELECTOR */}
              <div>
                <Label>Il tuo DNA (Stile)</Label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {DNA_STYLES.map(s => {
                    const Icon = s.icon;
                    const active = formData.user_style === s.id;
                    return (
                      <button key={s.id} type="button" onClick={() => setFormData(p => ({ ...p, user_style: s.id }))}
                        className={`flex flex-col items-center gap-1 rounded-lg border p-3 transition-colors ${active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground hover:border-primary/50'}`}>
                        <Icon size={16} /><span className="text-[10px] font-medium">{s.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {DNA_STYLES.find(s => s.id === formData.user_style)?.description}
                </p>
              </div>

              {/* OBIETTIVO FINALE — OBBLIGATORIO */}
              <div>
                <Label className="flex items-center gap-1">
                  <Target size={14} /> L'Obiettivo Finale <span className="text-destructive">*</span>
                </Label>
                <Textarea 
                  value={objectiveText} 
                  onChange={e => { setObjectiveText(e.target.value); validateObjective(e.target.value); }} 
                  placeholder="Cosa deve accadere nel mondo fisico? Es: 'Lei mi chiede scusa pubblicamente'" 
                  rows={3} 
                />
                <div className="flex items-start gap-1 mt-1">
                  <Info size={12} className="text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    L'obiettivo non serve all'altro, serve a TE. Solo cambiando il tuo intento vedrai l'altro cambiare. Se l'obiettivo è confuso, la tua forza sarà nulla.
                  </p>
                </div>
                {objectiveWarning && (
                  <div className="mt-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                    <p className="text-xs text-destructive font-medium leading-relaxed">{objectiveWarning}</p>
                  </div>
                )}
              </div>

              <div>
                <Label>Descrizione Profilo</Label>
                <Textarea value={formData.profile_description} onChange={e => setFormData(p => ({ ...p, profile_description: e.target.value }))} placeholder="Carattere, punti deboli, pattern..." rows={4} />
              </div>
              <div>
                <Label>Storico Fallimenti</Label>
                <Textarea value={formData.failure_history} onChange={e => setFormData(p => ({ ...p, failure_history: e.target.value }))} placeholder="Conflitti passati, cosa non ha funzionato..." rows={4} />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveProfile} disabled={loading || !formData.name.trim() || !objectiveText.trim()} className="flex-1">
                  {editingId ? 'Aggiorna' : 'Salva'}
                </Button>
                <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Annulla</Button>
              </div>
            </div>
          )}

          {profiles.map(p => (
            <div key={p.id}
              className={`rounded-xl border p-4 transition-colors cursor-pointer ${selectedProfile?.id === p.id ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/50'}`}
              onClick={() => handleSelectProfile(p)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {scenarioIcon(p.scenario)}
                  <div>
                    <p className="font-medium text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.relationship}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={e => { e.stopPropagation(); handleEditProfile(p); }} className="rounded-lg p-2 text-muted-foreground hover:text-foreground"><PenLine size={14} /></button>
                  <button onClick={e => { e.stopPropagation(); handleDeleteProfile(p.id); }} className="rounded-lg p-2 text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                  {SCENARIOS.find(s => s.id === p.scenario)?.label || 'Conflitto'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {DNA_STYLES.find(s => s.id === p.user_style)?.label || 'Chirurgico'}
                </span>
              </div>
              {p.profile_description && (
                <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{p.profile_description}</p>
              )}
            </div>
          ))}

          {profiles.length === 0 && !showForm && (
            <p className="text-center text-sm text-muted-foreground py-8">Nessun profilo creato. Crea il tuo primo bersaglio.</p>
          )}
        </TabsContent>

        {/* SESSIONE TAB */}
        <TabsContent value="sessione" className="space-y-4">
          {selectedProfile && (
            <>
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {scenarioIcon(selectedProfile.scenario)}
                  <div>
                    <p className="text-sm font-medium text-foreground">{selectedProfile.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedProfile.relationship}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Layers size={14} className="text-primary" />
                  <span className="text-xs text-primary font-medium">Velo {currentVelo}</span>
                </div>
              </div>

              {/* FOCUS 12 — QUANTUM TIMER */}
              {sessionMode === 'focus12' && (
                <div className="space-y-4 py-6">
                  <div className="text-center">
                    <Zap size={40} className="mx-auto text-primary mb-3" />
                    <h2 className="text-lg font-bold text-foreground uppercase tracking-wide">Stabilizzazione dell'Ologramma (Focus 12)</h2>
                  </div>
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4">
                    <p className="text-sm text-foreground leading-relaxed">
                      Fermati. La realtà esterna è solo un riflesso della tua mente.
                    </p>
                    {objectiveText && (
                      <div className="rounded-lg bg-card border border-border p-3">
                        <p className="text-xs text-muted-foreground mb-1">IL TUO OBIETTIVO:</p>
                        <p className="text-sm text-primary font-medium">{objectiveText}</p>
                      </div>
                    )}
                    <p className="text-sm text-foreground leading-relaxed">
                      Non sperare che accada. Visualizzalo come un fatto già avvenuto, una memoria del futuro. 
                      Senti il peso della vittoria e il sollievo nel tuo corpo proprio ora.
                    </p>
                    <p className="text-xs text-muted-foreground italic">
                      Se la tua mente non è ferma, le parole del Consiglio saranno inutili gusci vuoti. 
                      L'intenzione è la forza, la parola è solo il mezzo.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-2 border-primary bg-primary/10">
                      <span className="text-2xl font-bold text-primary">{focus12Timer}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">secondi</p>
                  </div>
                  {focus12Timer <= 0 && (
                    <p className="text-center text-sm text-primary font-medium animate-pulse">Convocazione in corso...</p>
                  )}
                </div>
              )}

              {/* SCELTA INIZIALE */}
              {sessionMode === 'choose' && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground text-center">Cosa vuoi fare?</p>
                  <Button onClick={() => { loadLastQuestions(); setSessionMode('last_questions'); }} variant="outline" className="w-full gap-2 py-5">
                    <Eye size={18} /> Vedi ultime frasi
                  </Button>
                  <Button onClick={() => { setNewEventText(''); setSessionMode('new_event'); }} variant="outline" className="w-full gap-2 py-5">
                    <MessageSquarePlus size={18} /> Descrivi cosa è successo
                  </Button>
                  {selectedProfile.scenario === 'whatsapp' && (
                    <Button onClick={() => { setWhatsappMessage(''); setSessionMode('whatsapp_input'); }} variant="outline" className="w-full gap-2 py-5">
                      <MessageCircle size={18} /> Incolla messaggio WhatsApp
                    </Button>
                  )}
                  <Button onClick={() => startConvoca()} className="w-full gap-2 py-5 text-base">
                    <Swords size={18} /> CONVOCA IL CONSIGLIO — Velo {currentVelo}
                  </Button>
                </div>
              )}

              {/* WHATSAPP INPUT */}
              {sessionMode === 'whatsapp_input' && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
                    <p className="text-sm font-medium text-primary">📱 WhatsApp Shield</p>
                    <p className="text-xs text-muted-foreground">Incolla il messaggio ricevuto. Il Consiglio analizzerà il sottotesto e genererà la risposta perfetta.</p>
                  </div>
                  <Textarea value={whatsappMessage} onChange={e => setWhatsappMessage(e.target.value)} placeholder="Incolla qui il messaggio che hai ricevuto..." rows={6} autoFocus />
                  <div className="flex gap-2">
                    <Button onClick={() => startConvoca({ whatsapp: whatsappMessage.trim() })} disabled={!whatsappMessage.trim()} className="flex-1 gap-2">
                      <Shield size={16} /> ANALIZZA E RISPONDI
                    </Button>
                    <Button variant="ghost" onClick={() => setSessionMode('choose')}>Indietro</Button>
                  </div>
                </div>
              )}

              {/* DESCRIVI COSA È SUCCESSO */}
              {sessionMode === 'new_event' && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Racconta cosa è successo. Il Consiglio preparerà frasi basate su questo evento.</p>
                  <Textarea value={newEventText} onChange={e => setNewEventText(e.target.value)} placeholder="Descrivi l'evento, il conflitto, cosa è stato detto..." rows={6} autoFocus />
                  <div className="flex gap-2">
                    <Button onClick={() => startConvoca({ newEvent: newEventText.trim() })} disabled={!newEventText.trim()} className="flex-1 gap-2">
                      <Swords size={16} /> CONVOCA IL CONSIGLIO
                    </Button>
                    <Button variant="ghost" onClick={() => setSessionMode('choose')}>Indietro</Button>
                  </div>
                </div>
              )}

              {/* GENERAZIONE IN CORSO */}
              {sessionMode === 'generating' && (
                <div className="flex flex-col items-center gap-3 py-8">
                  <Loader2 size={32} className="animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Il Consiglio dei 15 sta deliberando...</p>
                  <p className="text-xs text-muted-foreground italic">Analisi incrociata in corso — Velo {currentVelo}</p>
                </div>
              )}

              {/* ULTIME DOMANDE */}
              {sessionMode === 'last_questions' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Ultime frasi</h3>
                    <Button size="sm" variant="ghost" onClick={() => setSessionMode('choose')}>← Indietro</Button>
                  </div>
                  {lastQuestions.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-6">Nessuna frase generata per questo profilo.</p>
                  ) : (
                    lastQuestions.map((q, i) => renderQuestionCard(q, i))
                  )}
                </div>
              )}

              {/* RISULTATI */}
              {sessionMode === 'results' && sessionQuestions.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                      {selectedProfile.scenario === 'whatsapp' ? 'Risposte Shield' : `La Trinità — Velo ${sessionQuestions[0]?.velo_number || currentVelo}`}
                    </h3>
                    <Button size="sm" variant="ghost" onClick={() => setSessionMode('choose')}>← Indietro</Button>
                  </div>
                  {sessionQuestions.map((q, i) => renderQuestionCard(q, i))}

                  {selectedProfile.scenario !== 'whatsapp' && (
                    <Button onClick={handleNextVelo} className="w-full gap-2 mt-4" variant="outline">
                      <Layers size={16} /> Vai al Velo {currentVelo + 1} — Penetra più in profondità
                    </Button>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground italic text-center mt-6 px-4">
                "Il Consiglio richiede tempo. Una domanda di decostruzione è un seme: lascialo marcire nella mente dell'altro prima di aspettarti il crollo."
              </p>
            </>
          )}
        </TabsContent>

        {/* ARCHIVIO TAB */}
        <TabsContent value="archivio" className="space-y-4">
          {selectedProfile && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 mb-2">
              <p className="text-sm font-medium text-foreground">Archivio: {selectedProfile.name}</p>
            </div>
          )}
          {archiveQuestions.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">Nessuna frase validata per questo profilo.</p>
          )}
          {archiveQuestions.map((q, i) => (
            <div key={q.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Velo {q.velo_number}</span>
                  <p className="text-xs text-muted-foreground">
                    {new Date(q.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${q.status === 'validated' ? 'bg-primary/20 text-primary' : 'bg-accent text-accent-foreground'}`}>
                  {q.status === 'validated' ? 'Validata' : 'Aggiustata'}
                </span>
              </div>
              <p className="text-sm text-foreground">"{q.question_text}"</p>
              <p className="text-xs text-muted-foreground">{q.validation_text}</p>
              <p className="text-xs text-primary">Maestri: {q.maestri_used}</p>
              {q.adjustment_notes && (
                <p className="text-xs text-muted-foreground italic border-l-2 border-primary pl-2">Note: {q.adjustment_notes}</p>
              )}
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
