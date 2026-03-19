import { Bell, Clock, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ContractPage() {
  return (
    <div className="mx-auto max-w-lg px-4 pt-8 pb-24 min-h-screen flex flex-col">
      <div className="text-center mb-8">
        <Flame size={48} className="text-primary mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Il tuo Contratto
        </h1>
        <p className="text-sm text-muted-foreground">
          Questo è l'accordo che hai accettato.
        </p>
      </div>

      <div className="space-y-4 flex-1">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <Bell size={20} className="text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground text-sm">6 notifiche al giorno</p>
              <p className="text-xs text-muted-foreground mt-1">
                Riceverai 3 domande ripetute in 6 momenti random nella tua fascia oraria.
                Non puoi ignorarle.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <Clock size={20} className="text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground text-sm">Fase Incubazione (2-3 giorni)</p>
              <p className="text-xs text-muted-foreground mt-1">
                Per le prime 6 domande dovrai solo leggerle. Non puoi rispondere.
                Dormici sopra, scrivila su carta. La verità ha bisogno di tempo.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <Flame size={20} className="text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground text-sm">Fase Risposta</p>
              <p className="text-xs text-muted-foreground mt-1">
                Dopo aver letto 6 domande, si sblocca la risposta.
                60 secondi di attesa, minimo 50 caratteri, nessuna scorciatoia.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <p className="text-sm text-foreground font-medium text-center">
            "Se il cibo è il tuo carceriere, queste domande sono la chiave.
            Ma la chiave brucia."
          </p>
        </div>
      </div>

      <Link
        to="/home"
        className="mt-6 w-full flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Torna alla Home
      </Link>
    </div>
  );
}
