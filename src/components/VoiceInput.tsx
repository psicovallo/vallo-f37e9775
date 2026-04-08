import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  currentValue?: string;
  className?: string;
}

export default function VoiceInput({ onTranscript, currentValue = '', className = '' }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [showClean, setShowClean] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const accumulatedRef = useRef(currentValue);

  useEffect(() => {
    if (!isRecording) {
      accumulatedRef.current = currentValue;
    }
  }, [currentValue, isRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Pick best supported format
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(t => t.stop());
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        setDuration(0);

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size < 1000) {
          toast.error('Registrazione troppo breve');
          setIsRecording(false);
          return;
        }

        // Transcribe via Groq
        setIsTranscribing(true);
        try {
          const formData = new FormData();
          formData.append('audio', blob, 'recording.webm');
          formData.append('language', 'it');

          const { data, error } = await supabase.functions.invoke('transcribe-audio', {
            body: formData,
          });

          if (error) throw error;
          if (data?.error) { toast.error(data.error); return; }

          const transcript = data?.transcript?.trim();
          if (transcript) {
            const separator = accumulatedRef.current.trim() ? ' ' : '';
            accumulatedRef.current = accumulatedRef.current + separator + transcript;
            onTranscript(accumulatedRef.current);
            setShowClean(accumulatedRef.current.trim().length > 20);
          } else {
            toast.info('Nessun parlato rilevato');
          }
        } catch (e) {
          console.error('Transcription error:', e);
          toast.error('Errore nella trascrizione');
        } finally {
          setIsTranscribing(false);
          setIsRecording(false);
        }
      };

      recorder.start(1000); // collect chunks every second
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setShowClean(false);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    } catch {
      toast.error('Permesso microfono negato.');
    }
  }, [onTranscript]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const toggle = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else if (!isTranscribing) {
      startRecording();
    }
  }, [isRecording, isTranscribing, startRecording, stopRecording]);

  const cleanTranscription = useCallback(async () => {
    const textToClean = accumulatedRef.current.trim();
    if (!textToClean) return;

    setIsCleaning(true);
    setShowClean(false);

    try {
      const { data, error } = await supabase.functions.invoke('clean-transcription', {
        body: { text: textToClean },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        setShowClean(true);
        return;
      }

      const cleaned = data?.cleaned || textToClean;
      accumulatedRef.current = cleaned;
      onTranscript(cleaned);
      toast.success('Testo pulito dal Consiglio ✨');
    } catch (e) {
      console.error('Clean transcription error:', e);
      toast.error('Errore nella pulizia del testo');
      setShowClean(true);
    } finally {
      setIsCleaning(false);
    }
  }, [onTranscript]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`inline-flex flex-col items-center gap-1 ${className}`}>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={toggle}
          disabled={isTranscribing}
          className={`rounded-full p-2 transition-all ${
            isRecording
              ? 'bg-destructive text-destructive-foreground animate-pulse shadow-lg shadow-destructive/30'
              : isTranscribing
                ? 'bg-muted text-muted-foreground cursor-wait'
                : 'bg-muted text-muted-foreground hover:bg-primary/20 hover:text-primary'
          }`}
          title={isRecording ? 'Ferma registrazione' : 'Avvia registrazione vocale'}
        >
          {isTranscribing ? (
            <Loader2 size={18} className="animate-spin" />
          ) : isRecording ? (
            <Square size={18} />
          ) : (
            <Mic size={18} />
          )}
        </button>

        {showClean && !isRecording && !isTranscribing && (
          <button
            type="button"
            onClick={cleanTranscription}
            disabled={isCleaning}
            className="rounded-full p-2 bg-primary/10 text-primary hover:bg-primary/20 transition-all animate-in fade-in"
            title="Pulisci e ordina il testo dettato"
          >
            <Sparkles size={16} className={isCleaning ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      {isRecording && (
        <span className="text-[10px] text-destructive font-medium animate-pulse">
          🔴 {formatDuration(duration)}
        </span>
      )}
      {isTranscribing && (
        <span className="text-[10px] text-primary font-medium animate-pulse">
          Trascrizione...
        </span>
      )}
      {isCleaning && (
        <span className="text-[10px] text-primary font-medium animate-pulse">
          Pulizia...
        </span>
      )}
    </div>
  );
}
