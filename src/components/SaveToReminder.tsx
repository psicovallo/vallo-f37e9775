import { BellPlus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SaveToReminderProps {
  text: string;
  className?: string;
}

export default function SaveToReminder({ text, className = '' }: SaveToReminderProps) {
  const { user } = useAuth();

  const handleSave = async () => {
    if (!user || !text.trim()) return;
    const { error } = await supabase.from('reminders').insert({
      user_id: user.id,
      text: text.trim(),
      times: [],
    });
    if (error) {
      toast.error('Errore nel salvataggio');
      return;
    }
    toast.success('Salvato nei Promemoria ✓');
  };

  return (
    <button
      onClick={handleSave}
      className={`rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-primary hover:bg-primary/10 ${className}`}
      title="Salva nei promemoria"
    >
      <BellPlus size={16} />
    </button>
  );
}
