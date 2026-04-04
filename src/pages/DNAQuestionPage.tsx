import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import VoiceInput from '@/components/VoiceInput';
import QuestionActions from '@/components/QuestionActions';
import { toast } from 'sonner';

export default function DNAQuestionPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const questionId = params.get('id');

  const [question, setQuestion] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!questionId || !user) return;
    (async () => {
      const { data: q } = await supabase
        .from('conflict_questions')
        .select('*')
        .eq('id', questionId)
        .eq('user_id', user.id)
        .maybeSingle();
      setQuestion(q);
      if (q) {
        const { data: p } = await supabase
          .from('conflict_profiles')
          .select('*')
          .eq('id', (q as any).conflict_profile_id)
          .maybeSingle();
        setProfile(p);
      }
      if (q?.adjustment_notes) setNoteText(q.adjustment_notes);
      setLoading(false);
    })();
  }, [questionId, user]);

  const handleSaveNote = async () => {
    if (!noteText.trim()) {
      handleBack();
      return;
    }
    setSaving(true);
    // Save note as adjustment_notes on the question
    await supabase
      .from('conflict_questions')
      .update({ adjustment_notes: noteText.trim() })
      .eq('id', questionId);
    toast.success('Appunti salvati');
    setSaving(false);
    handleBack();
  };

  const handleBack = () => {
    navigate('/sos-conflitti');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!question) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-8 pb-24 text-center">
        <p className="text-muted-foreground">Domanda non trovata.</p>
        <Button variant="ghost" onClick={handleBack} className="mt-4 gap-2">
          <ArrowLeft size={16} /> Torna a SOS DNA
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 pt-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={handleBack} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">Domanda DNA</h1>
          {profile && (
            <p className="text-xs text-muted-foreground">
              Bersaglio: {profile.name} — Velo {question.velo_number}
            </p>
          )}
        </div>
      </div>

      {/* Question card */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4 mb-6">
        <div className="flex items-start justify-between gap-2">
          <p className="text-base text-foreground font-medium leading-relaxed flex-1">
            "{question.question_text}"
          </p>
          <QuestionActions text={question.question_text} />
        </div>

        {/* Translated version */}
        {question.question_text_translated && question.question_text_translated !== question.question_text && (
          <div className="rounded-lg border border-muted bg-muted/30 p-3 space-y-1">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">🌐 Lingua bersaglio</p>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-foreground italic leading-relaxed flex-1">
                "{question.question_text_translated}"
              </p>
              <QuestionActions text={question.question_text_translated} />
            </div>
          </div>
        )}
      </div>

      {/* Validation / Explanation */}
      {question.validation_text && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-2 mb-6">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">Analisi del Consiglio</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{question.validation_text}</p>
          {question.maestri_used && (
            <p className="text-xs text-primary font-medium">Maestri: {question.maestri_used}</p>
          )}
        </div>
      )}

      {/* Warning */}
      <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 mb-6">
        <p className="text-xs text-destructive font-medium leading-relaxed">
          ⚠️ NON TOCCARE LA FRASE. Ripetila mentalmente 5 volte per caricarla nel tuo sistema nervoso. 
          Una volta detta, aspetta la reazione e torna qui per il Velo successivo.
        </p>
      </div>

      {/* Notes section */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3 mb-6">
        <p className="text-sm font-semibold text-foreground">Appunti ai Maestri</p>
        <p className="text-xs text-muted-foreground">
          Scrivi qui le tue osservazioni, cosa è successo dopo aver usato la frase, o cosa vuoi comunicare al Consiglio.
        </p>
        <div className="relative">
          <Textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Es: L'ho detta e lei ha reagito così..."
            rows={4}
            className="pr-12"
            
          />
          <div className="absolute right-3 top-3">
            <VoiceInput onTranscript={setNoteText} currentValue={noteText} />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={handleSaveNote} disabled={saving} className="flex-1 gap-2">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {noteText.trim() ? 'Salva e torna' : 'Torna alla sessione'}
        </Button>
      </div>
    </div>
  );
}
