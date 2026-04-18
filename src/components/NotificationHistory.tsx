import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { History, Trash2 } from 'lucide-react';

interface LogRow {
  id: string;
  category: string;
  title: string;
  body: string;
  url: string | null;
  sent_at: string;
}

const CAT_LABEL: Record<string, string> = {
  questions: '🔥 Domanda',
  dna: '⚔️ DNA',
  sfogo: '🔥 Sfogo',
  overton: '🎯 Overton',
  reminder: '⏰ Promemoria',
  manual: '🔔 Manuale',
};

export default function NotificationHistory() {
  const { user } = useAuth();
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const fetchLog = async () => {
    if (!user) return;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('notification_log')
      .select('*')
      .eq('user_id', user.id)
      .gte('sent_at', sevenDaysAgo)
      .order('sent_at', { ascending: false })
      .limit(100);
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchLog(); }, [user]);

  const clearAll = async () => {
    if (!user) return;
    if (!confirm('Cancellare tutto lo storico?')) return;
    await supabase.from('notification_log').delete().eq('user_id', user.id);
    fetchLog();
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('it-IT', {
      timeZone: 'Europe/Rome',
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="mb-6 rounded-2xl border border-border bg-card p-4 space-y-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <History size={16} className="text-primary" />
          Storico inviate (ultimi 7 giorni)
        </h2>
        <span className="text-xs text-muted-foreground">
          {loading ? '…' : `${rows.length} ${expanded ? '▲' : '▼'}`}
        </span>
      </button>

      {expanded && (
        <>
          {rows.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Nessuna notifica inviata negli ultimi 7 giorni.
            </p>
          ) : (
            <>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {rows.map(r => (
                  <div key={r.id} className="rounded-lg border border-border bg-background p-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground truncate">
                        {CAT_LABEL[r.category] || r.category}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatDate(r.sent_at)}
                      </span>
                    </div>
                    <p className="mt-1 text-muted-foreground line-clamp-2">{r.body}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={clearAll}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-destructive hover:border-destructive transition-colors"
              >
                <Trash2 size={12} /> Cancella tutto
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
