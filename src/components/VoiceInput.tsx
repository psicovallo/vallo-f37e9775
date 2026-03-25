import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { toast } from 'sonner';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  currentValue?: string;
  className?: string;
}

// Extend window for SpeechRecognition
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

export default function VoiceInput({ onTranscript, currentValue = '', className = '' }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const accumulatedRef = useRef(currentValue);

  // Keep accumulated text in sync with external value
  useEffect(() => {
    if (!isListening) {
      accumulatedRef.current = currentValue;
    }
  }, [currentValue, isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Il tuo browser non supporta il riconoscimento vocale.');
      return;
    }

    // Request mic permission
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error('Permesso microfono negato.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'it-IT';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    accumulatedRef.current = currentValue;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        const separator = accumulatedRef.current.trim() ? ' ' : '';
        accumulatedRef.current = accumulatedRef.current + separator + finalTranscript;
        onTranscript(accumulatedRef.current);
      } else if (interimTranscript) {
        const separator = accumulatedRef.current.trim() ? ' ' : '';
        onTranscript(accumulatedRef.current + separator + interimTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'aborted') {
        toast.error('Errore riconoscimento vocale: ' + event.error);
      }
      stopListening();
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [currentValue, onTranscript, stopListening]);

  const toggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <button
        type="button"
        onClick={toggle}
        className={`rounded-full p-2 transition-all ${
          isListening
            ? 'bg-destructive text-destructive-foreground animate-pulse shadow-lg shadow-destructive/30'
            : 'bg-muted text-muted-foreground hover:bg-primary/20 hover:text-primary'
        }`}
        title={isListening ? 'Ferma dettatura' : 'Avvia dettatura vocale'}
      >
        {isListening ? <MicOff size={18} /> : <Mic size={18} />}
      </button>
      {isListening && (
        <span className="mt-1 text-[10px] text-destructive font-medium animate-pulse">
          Parla ora...
        </span>
      )}
    </div>
  );
}
