import { Copy, Share2 } from 'lucide-react';
import { toast } from 'sonner';

export default function QuestionActions({ text }: { text: string }) {
  const shareText = `Domanda dal Consiglio dei Maestri:\n\n${text}`;
  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareText);
    toast.success('Domanda copiata ✓');
  };
  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ text: shareText }); } catch {}
    } else {
      await handleCopy();
    }
  };
  return (
    <div className="flex justify-end gap-2">
      <button onClick={handleCopy} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-primary hover:bg-primary/10"><Copy size={16} /></button>
      <button onClick={handleShare} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-primary hover:bg-primary/10"><Share2 size={16} /></button>
    </div>
  );
}
