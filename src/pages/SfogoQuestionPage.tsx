import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import VoiceInput from '@/components/VoiceInput';
import QuestionActions from '@/components/QuestionActions';
import { toast } from 'sonner';

export default function SfogoQuestionPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const noteId = params.get('id');

  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!noteId || !user) return;
    (async () => {
      const { data } = await supabase
        .from('notes')
        .select('text')
        .eq('id', noteId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        // Extract Q and A from "[SFOGO-RIFLESSIONE] Q: ... A: ..."
        const match = data.text.match(/\[SFOGO-RIFLESSIONE\]\s*Q:\s*(.*?)\nA:\s*(.*)/s);
        if (match) {
          setQuestion(match[1].trim());
          setAnswer(match[2].trim());
        } else {
          // Fallback: just show the text
          const tagMatch = data.text.match(/^\[([^\]]+)\]\s*/);
          setQuestion(tagMatch ? data.text.slice(tagMatch[0].length) : data.text);
        }
      }
      setLoading(false);
    })();
  }, [noteId, user]);

  const handleGenerateMore = async () => {
    if (!user || !question) return;
    setGenerating(true);
    try {
      const context = answer
        ? `Domanda originale: ${question}\nRisposta dell'utente: ${answer}\n\nGenera nuove domande basate su questa riflessione.`
        : question;

      const { data: profile } = await supabase
        .from('profiles')
        .select('objective')
        .eq('user_id', user.id)
        .maybeSingle();

      const { data, error } = await supabase.functions.invoke('generate-sfogo-questions', {
        body: { sfogo_text: context, objective: profile?.objective || 'Dimagrimento' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setFollowUpQuestions(data.questions || []);
    } catch (err: any) {
      toast.error(err.message || 'Errore nella generazione.');
    }
    setGenerating(false);
  };

  const handleSaveNote = async () => {
    if (!user || !noteText.trim()) {
      navigate('/sfogo');
      return;
    }
    setSaving(true);
    await supabase.from('notes').insert({
      user_id: user.id,
      text: `[SFOGO-COMMENTO] Re: ${question}\n${noteText.trim()}`,
    });
    toast.success('Commento salvato');
    setSaving(false);
    navigate('/sfogo');
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
        <Button variant="ghost" onClick={() => navigate('/sfogo')} className="mt-4 gap-2">
          <ArrowLeft size={16} /> Torna all'Area Sfogo
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 pt-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/sfogo')} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-foreground">Riflessione Sfogo</h1>
      </div>

      {/* Question */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-3 mb-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-base text-foreground font-medium leading-relaxed flex-1">
            "{question}"
          </p>
          <QuestionActions text={question} />
        </div>
        {answer && (
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1">La tua risposta</p>
            <p className="text-sm text-foreground">{answer}</p>
          </div>
        )}
      </div>

      {/* Comment section */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3 mb-4">
        <p className="text-sm font-semibold text-foreground">Commenta</p>
        <div className="relative">
          <Textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Le tue riflessioni su questa domanda..."
            rows={3}
            className="pr-12"
          />
          <div className="absolute right-3 top-3">
            <VoiceInput onTranscript={setNoteText} currentValue={noteText} />
          </div>
        </div>
      </div>

      {/* Generate more */}
      <Button
        onClick={handleGenerateMore}
        disabled={generating}
        variant="outline"
        className="w-full mb-4 gap-2"
      >
        {generating ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        Genera nuove domande da questa riflessione
      </Button>

      {/* Follow-up questions */}
      {followUpQuestions.length > 0 && (
        <div className="space-y-3 mb-6">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">Nuove domande</p>
          {followUpQuestions.map((q, i) => (
            <div key={i} className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-foreground leading-relaxed flex-1">{q}</p>
                <QuestionActions text={q} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Save & back */}
      <Button onClick={handleSaveNote} disabled={saving} className="w-full gap-2">
        {saving ? <Loader2 size={16} className="animate-spin" /> : null}
        {noteText.trim() ? 'Salva e torna' : 'Torna all\'Area Sfogo'}
      </Button>
    </div>
  );
}
