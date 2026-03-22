import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Swords, ChevronDown, ChevronUp, Check, PenLine, Trash2, Loader2 } from 'lucide-react';

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
  const [language, setLanguage] = useState('italiano');
  const [sessionQuestions, setSessionQuestions] = useState<ConflictQuestion[]>([]);
  const [archiveQuestions, setArchiveQuestions] = useState<ConflictQuestion[]>([]);
  const [expandedValidation, setExpandedValidation] = useState<Record<string, boolean>>({});
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [adjustmentText, setAdjustmentText] = useState('');

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

  useEffect(() => { loadProfiles(); }, [loadProfiles]);
  useEffect(() => { if (activeTab === 'archivio') loadArchive(); }, [activeTab, loadArchive]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setLoading(true);
    const rel = formData.relationship === 'Altro' ? formData.customRelationship : formData.relationship;
    const payload = {
      user_id: user.id,
      name: formData.name,
      relationship: rel,
      profile_description: formData.profile_description,
      failure_history: formData.failure_history,
    };

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

  const handleSelectProfile = (p: ConflictProfile) => {
    setSelectedProfile(p);
    setSessionQuestions([]);
    setActiveTab('sessione');
  };

  const handleConvoca = async () => {
    if (!selectedProfile || !user) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-conflict-questions', {
        body: { conflict_profile_id: selectedProfile.id, language },
      });
      if (error) throw error;
      setSessionQuestions(data.questions || []);
    } catch (e: any) {
      toast.error(e.message || 'Errore nella generazione');
    }
    setGenerating(false);
  };

  const handleValida = async (q: ConflictQuestion) => {
    await supabase.from('conflict_questions').update({ status: 'validated' }).eq('id', q.id);
    setSessionQuestions(prev => prev.map(x => x.id === q.id ? { ...x, status: 'validated' } : x));
    toast.success('Domanda validata e archiviata');
  };

  const handleAggiusta = async (q: ConflictQuestion) => {
    if (!adjustmentText.trim()) return;
    await supabase.from('conflict_questions').update({ status: 'adjusted', adjustment_notes: adjustmentText }).eq('id', q.id);
    setSessionQuestions(prev => prev.map(x => x.id === q.id ? { ...x, status: 'adjusted', adjustment_notes: adjustmentText } : x));
    setAdjustingId(null);
    setAdjustmentText('');
    toast.success('Domanda aggiustata e archiviata');
  };

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
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.relationship}
                  onChange={e => setFormData(p => ({ ...p, relationship: e.target.value }))}
                >
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
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                >
                  <option value="italiano">Italiano</option>
                  <option value="inglese">English</option>
                  <option value="spagnolo">Español</option>
                  <option value="francese">Français</option>
                  <option value="tedesco">Deutsch</option>
                </select>
              </div>

              <Button onClick={handleConvoca} disabled={generating} className="w-full gap-2 text-base py-6">
                {generating ? <Loader2 size={20} className="animate-spin" /> : <Swords size={20} />}
                {generating ? 'Il Consiglio sta deliberando...' : 'CONVOCA IL CONSIGLIO'}
              </Button>

              {/* Display della Trinità */}
              {sessionQuestions.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">La Trinità</h3>
                  {sessionQuestions.map((q, i) => (
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
                          <Button size="sm" variant="outline" onClick={() => { setAdjustingId(q.id); setAdjustmentText(''); }} className="gap-1">
                            <PenLine size={14} /> AGGIUSTA
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
                          <Textarea
                            value={adjustmentText}
                            onChange={e => setAdjustmentText(e.target.value)}
                            placeholder="Note per ricalibrazione..."
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleAggiusta(q)}>Salva</Button>
                            <Button size="sm" variant="ghost" onClick={() => setAdjustingId(null)}>Annulla</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
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
