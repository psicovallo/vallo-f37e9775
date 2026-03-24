import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Swords, ChevronDown, ChevronUp, Check, PenLine, Trash2, Loader2, RotateCcw, MessageSquarePlus, Eye } from 'lucide-react';

const RELATIONSHIP_OPTIONS = [
  'Compagna', 'Moglie', 'Fidanzata', 'Figlio', 'Figlia', 'Amica',
  'Padre', 'Madre', 'Nonna', 'Collega', 'Capo', 'Dipendente', 'Assistente', 'Altro',
];

interface ConflictProfile {
  id: string;
  name: string;
  relationship: string;
  profile_description: string;
  failure_history: string;
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
  created_at: string;
}

type SessionMode = 'choose' | 'last_questions' | 'new_event' | 'generating';

export default function SOSConflittiPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profili');
  const [profiles, setProfiles] = useState<ConflictProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<ConflictProfile | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', relationship: 'Compagna', customRelationship: '', profile_description: '', failure_history: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [adjustingQuestionId, setAdjustingQuestionId] = useState<string | null>(null);
  const [language, setLanguage] = useState('italiano');
  const [sessionQuestions, setSessionQuestions] = useState<ConflictQuestion[]>([]);
  const [archiveQuestions, setArchiveQuestions] = useState<ConflictQuestion[]>([]);
  const [expandedValidation, setExpandedValidation] = useState<Record<string, boolean>>({});
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [adjustmentText, setAdjustmentText] = useState('');
  const [sessionMode, setSessionMode] = useState<SessionMode>('choose');
  const [newEventText, setNewEventText] = useState('');
  const [lastQuestions, setLastQuestions] = useState<ConflictQuestion[]>([]);

  const loadProfiles = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('conflict_profiles')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setProfiles((data as ConflictProfile[]) || []);
  }, [user]);

  const loadArchive = useCallback(async () => {
    if (!user || !selectedProfile) return;
    const { data } = await supabase
      .from('conflict_questions')
      .select('*')
      .eq('conflict_profile_id', selectedProfile.id)
      .eq('user_id', user.id)
      .in('status', ['validated', 'adjusted'])
      .order('created_at', { ascending: false });
    setArchiveQuestions((data as ConflictQuestion[]) || []);
  }, [user, selectedProfile]);

  const loadLastQuestions = useCallback(async () => {
    if (!user || !selectedProfile) return;
    const { data } = await supabase
      .from('conflict_questions')
      .select('*')
      .eq('conflict_profile_id', selectedProfile.id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3);
    setLastQuestions((data as ConflictQuestion[]) || []);
  }, [user, selectedProfile]);

  useEffect(() => { loadProfiles(); }, [loadProfiles]);
  useEffect(() => { if (activeTab === 'archivio') loadArchive(); }, [activeTab, loadArchive]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setLoading(true);
    const rel = formData.relationship === 'Altro' ? formData.customRelationship : formData.relationship;
    const payload = { user_id: user.id, name: formData.name, relationship: rel, profile_description: formData.profile_description, failure_history: formData.failure_history };

    if (editingId) {
      await supabase.from('conflict_profiles').update(payload).eq('id', editingId);
      toast.success('Profilo aggiornato');
    } else {
      await supabase.from('conflict_profiles').insert(payload);
      toast.success('Profilo creato');
    }

    setFormData({ name: '', relationship: 'Compagna', customRelationship: '', profile_description: '', failure_history: '' });
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
      profile_description: p.profile_description,
      failure_history: p.failure_history,
    });
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleSelectProfile = async (p: ConflictProfile) => {
    setSelectedProfile(p);
    setSessionQuestions([]);
    setSessionMode('choose');
    setActiveTab('sessione');
  };

  const handleConvoca = async (newEvent?: string) => {
    if (!selectedProfile || !user) return;
    setGenerating(true);
    setSessionMode('generating');
    try {
      const body: any = { conflict_profile_id: selectedProfile.id, language };
      if (newEvent) body.new_event = newEvent;
      const { data, error } = await supabase.functions.invoke('generate-conflict-questions', { body });
      if (error) throw error;
      setSessionQuestions(data.questions || []);
    } catch (e: any) {
      toast.error(e.message || 'Errore nella generazione');
      setSessionMode('choose');
    }
    setGenerating(false);
  };

  const handleViewLastQuestions = async () => {
    await loadLastQuestions();
    setSessionMode('last_questions');
  };

  const handleNewEvent = () => {
    setNewEventText('');
    setSessionMode('new_event');
  };

  const handleSubmitNewEvent = () => {
    if (!newEventText.trim()) return;
    handleConvoca(newEventText.trim());
  };

  const handleValida = async (q: ConflictQuestion) => {
    await supabase.from('conflict_questions').update({ status: 'validated' }).eq('id', q.id);
    const updateList = (list: ConflictQuestion[]) => list.map(x => x.id === q.id ? { ...x, status: 'validated' } : x);
    setSessionQuestions(updateList);
    setLastQuestions(updateList);
    toast.success('Domanda validata e archiviata');
  };

  const handleAggiusta = async (q: ConflictQuestion) => {
    if (!adjustmentText.trim()) return;
    setAdjustingQuestionId(q.id);
    try {
      const { data, error } = await supabase.functions.invoke('adjust-conflict-question', {
        body: { question_id: q.id, adjustment_notes: adjustmentText, language },
      });
      if (error) throw error;
      const updated = data.question;
      const updateList = (list: ConflictQuestion[]) => list.map(x => x.id === q.id ? updated : x);
      setSessionQuestions(updateList);
      setLastQuestions(updateList);
      toast.success('Il Consiglio ha riformulato la domanda');
    } catch (e: any) {
      toast.error(e.message || 'Errore nella riformulazione');
    }
    setAdjustingId(null);
    setAdjustmentText('');
    setAdjustingQuestionId(null);
  };

  const renderQuestionCard = (q: ConflictQuestion, i: number) => (
    <div key={q.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
      <p className="text-xs text-muted-foreground font-medium">Domanda {i + 1}</p>
      <p className="text-sm text-foreground font-medium leading-relaxed">"{q.question_text}"</p>

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
        <div className="flex gap-2">
          <Button size="sm" onClick={() => handleValida(q)} className="gap-1">
            <Check size={14} /> VALIDA
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setAdjustingId(q.id); setAdjustmentText(''); }}
            className="gap-1"
            disabled={adjustingQuestionId === q.id}
          >
            {adjustingQuestionId === q.id ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
            AGGIUSTA
          </Button>
        </div>
      )}

      {q.status !== 'generated' && (
        <p className="text-xs text-primary font-medium">
          ✓ {q.status === 'validated' ? 'Validata' : 'Aggiustata'}
        </p>
      )}

      {adjustingId === q.id && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Spiega cosa non va e come vorresti la domanda. Il Consiglio la riformulerà.</p>
          <Textarea
            value={adjustmentText}
            onChange={e => setAdjustmentText(e.target.value)}
            placeholder="Es: troppo lunga, il tono è sbagliato, voglio che punti più sulla colpa..."
            rows={3}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => handleAggiusta(q)} disabled={adjustingQuestionId === q.id || !adjustmentText.trim()} className="gap-1">
              {adjustingQuestionId === q.id ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
              Riformula dal Consiglio
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdjustingId(null)}>Annulla</Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-lg px-4 pt-6 pb-24">
      <div className="mb-6 flex items-center gap-3">
        <Swords size={24} className="text-primary" />
        <h1 className="text-xl font-bold text-foreground">SOS Conflitti</h1>
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
              <div>
                <Label>Descrizione Profilo</Label>
                <Textarea value={formData.profile_description} onChange={e => setFormData(p => ({ ...p, profile_description: e.target.value }))} placeholder="Carattere, punti deboli, pattern comportamentali..." rows={4} />
              </div>
              <div>
                <Label>Storico Fallimenti</Label>
                <Textarea value={formData.failure_history} onChange={e => setFormData(p => ({ ...p, failure_history: e.target.value }))} placeholder="Conflitti passati, cosa non ha funzionato..." rows={4} />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveProfile} disabled={loading || !formData.name.trim()} className="flex-1">
                  {editingId ? 'Aggiorna' : 'Salva'}
                </Button>
                <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Annulla</Button>
              </div>
            </div>
          )}

          {profiles.map(p => (
            <div
              key={p.id}
              className={`rounded-xl border p-4 transition-colors cursor-pointer ${selectedProfile?.id === p.id ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/50'}`}
              onClick={() => handleSelectProfile(p)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.relationship}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={e => { e.stopPropagation(); handleEditProfile(p); }} className="rounded-lg p-2 text-muted-foreground hover:text-foreground">
                    <PenLine size={14} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); handleDeleteProfile(p.id); }} className="rounded-lg p-2 text-muted-foreground hover:text-destructive">
                    <Trash2 size={14} />
                  </button>
                </div>
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
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                <p className="text-sm font-medium text-foreground">{selectedProfile.name}</p>
                <p className="text-xs text-muted-foreground">{selectedProfile.relationship}</p>
              </div>

              <div>
                <Label>Lingua delle domande</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={language} onChange={e => setLanguage(e.target.value)}>
                  <option value="italiano">Italiano</option>
                  <option value="inglese">English</option>
                  <option value="spagnolo">Español</option>
                  <option value="francese">Français</option>
                  <option value="tedesco">Deutsch</option>
                </select>
              </div>

              {/* SCELTA INIZIALE */}
              {sessionMode === 'choose' && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground text-center">Cosa vuoi fare?</p>
                  <Button onClick={handleViewLastQuestions} variant="outline" className="w-full gap-2 py-5">
                    <Eye size={18} /> Vedi ultime domande
                  </Button>
                  <Button onClick={handleNewEvent} variant="outline" className="w-full gap-2 py-5">
                    <MessageSquarePlus size={18} /> Descrivi cosa è successo
                  </Button>
                  <Button onClick={() => handleConvoca()} className="w-full gap-2 py-5 text-base">
                    <Swords size={18} /> CONVOCA IL CONSIGLIO
                  </Button>
                </div>
              )}

              {/* DESCRIVI COSA È SUCCESSO */}
              {sessionMode === 'new_event' && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Racconta cosa è successo. Il Consiglio preparerà domande basate su questo evento e sullo storico.</p>
                  <Textarea
                    value={newEventText}
                    onChange={e => setNewEventText(e.target.value)}
                    placeholder="Descrivi l'evento, il conflitto, cosa è stato detto..."
                    rows={6}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleSubmitNewEvent} disabled={!newEventText.trim()} className="flex-1 gap-2">
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
                  <p className="text-sm text-muted-foreground">Il Consiglio sta deliberando...</p>
                </div>
              )}

              {/* ULTIME DOMANDE */}
              {sessionMode === 'last_questions' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Ultime domande</h3>
                    <Button size="sm" variant="ghost" onClick={() => setSessionMode('choose')}>← Indietro</Button>
                  </div>
                  {lastQuestions.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-6">Nessuna domanda generata per questo profilo.</p>
                  ) : (
                    lastQuestions.map((q, i) => renderQuestionCard(q, i))
                  )}
                </div>
              )}

              {/* RISULTATI NUOVA GENERAZIONE */}
              {!generating && sessionQuestions.length > 0 && sessionMode !== 'choose' && sessionMode !== 'new_event' && sessionMode !== 'last_questions' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">La Trinità</h3>
                    <Button size="sm" variant="ghost" onClick={() => setSessionMode('choose')}>← Indietro</Button>
                  </div>
                  {sessionQuestions.map((q, i) => renderQuestionCard(q, i))}
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
            <p className="text-center text-sm text-muted-foreground py-8">Nessuna domanda validata per questo profilo.</p>
          )}

          {archiveQuestions.map((q, i) => (
            <div key={q.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {new Date(q.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
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
