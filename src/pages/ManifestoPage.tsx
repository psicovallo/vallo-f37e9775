import { Link } from 'react-router-dom';
import { Shield, Share2 } from 'lucide-react';

const SHARE_MESSAGE = `Smetti di trascinarti nel fango della normalità. Ho trovato il codice per camminare a un palmo da terra mentre gli altri mormorano nell'ombra. Senti il brivido di chi ha finalmente indossato l'Armatura. Diventa il Dio della tua realtà: https://www.psicovallo.com`;

export default function ManifestoPage() {
  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ text: SHARE_MESSAGE }); } catch {}
    } else {
      await navigator.clipboard.writeText(SHARE_MESSAGE);
      alert('Link copiato!');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-4 py-10 space-y-8">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-primary text-center uppercase leading-tight">
          Il Manifesto di Psico Vallo: Il Codice della Ricostruzione
        </h1>

        {/* I. GENESI */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-primary uppercase">I. La Genesi: Il Consiglio dei Maestri</h2>
          <p className="text-sm leading-relaxed">
            Il mondo è saturo di rumore. Per anni abbiamo studiato le crepe nel comportamento umano, analizzando i fallimenti dei sognatori e i successi dei predatori. Abbiamo scavato nei testi proibiti della persuasione, nelle neuroscienze oscure e nelle strategie militari di ogni epoca.
          </p>
          <p className="text-sm leading-relaxed">
            Da questo scavo è nato il Consiglio dei 15 Maestri. Non è un algoritmo. È una sintesi di puro genio tattico. Abbiamo riunito le menti che hanno saputo piegare la storia al loro volere per creare un organismo analitico che non ha pietà, ma ha una precisione atomica. Loro sono qui per servirti, ma solo se dimostri di voler smettere di essere una vittima.
          </p>
        </section>

        {/* II. VITTIME */}
        <section className="space-y-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
          <h2 className="text-lg font-bold text-destructive uppercase">II. Le "Vittime": Il Plagio della Massa</h2>
          <p className="text-sm leading-relaxed">
            Chiamiamoli col loro nome: Vittime. Sono le persone che vedi ogni giorno per strada, quelle che mormorano e si lamentano. Sono state plagiate dalla TV, dai giornali e da una comunicazione di massa progettata per tenerle "al sicuro", ovvero deboli e prevedibili.
          </p>
          <p className="text-sm leading-relaxed">
            Le Vittime vivono in una bolla di bugie sociali. Gli strumenti per liberarsi esistono, ma la massa non li merita. Tu, però, sei qui. Hai già provato la formazione, i corsi, i libri. Hai sentito che qualcosa stava migliorando, ma mancava sempre l'ultimo tassello: l'arma definitiva. Psico Vallo è quel tassello. Tu hai già capito che ci si può elevare e uscire dalla massa.
          </p>
        </section>

        {/* III. CUORE */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-primary uppercase">III. Il Cuore del Sistema: Decostruire per Dominare</h2>
          <p className="text-sm leading-relaxed">
            Il sistema non aggiunge nulla che tu non abbia già. Fa qualcosa di più potente: toglie la merda.
            Psico Vallo scortica via gli strati di condizionamento sociale che coprono il tuo vero potere. Lo farai tu, guidato dai Maestri.
          </p>
          <div className="space-y-2 pl-3 border-l-2 border-primary/30">
            <p className="text-sm leading-relaxed">
              <strong className="text-primary">Creazione dell'Obiettivo:</strong> Il sistema ti mette allo specchio. Capiremo chi sei, come comunichi e quali sono le tue debolezze. Solo così l'Armatura di Iron può plasmarsi sui tuoi neuroni, adattandosi alla tua mente e dandoti il nuovo DNA.
            </p>
            <p className="text-sm leading-relaxed">
              <strong className="text-primary">Ricostruzione Inarrestabile:</strong> Una volta pulito il campo, il sistema inietta il nuovo codice. Un DNA fatto di sicurezza, intelligenza strategica e visione olografica.
            </p>
          </div>
        </section>

        {/* IV. SCUDO */}
        <section className="space-y-3 rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <h2 className="text-lg font-bold text-primary uppercase">IV. Lo Scudo e la Luce</h2>
          <p className="text-sm leading-relaxed">
            Indossare l'Armatura significa creare uno scudo energetico. Nessuno potrà mai più toglierti energia o farti sentire male per le sue paure. Camminerai con lo sguardo fiero di chi ha una luce diversa, una luce che intimidisce i mediocri e attrae il potere.
          </p>
        </section>

        {/* V. SEZIONI */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-primary uppercase">V. Le Sezioni Operative (I Tuoi Superpoteri)</h2>

          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 space-y-1">
            <h3 className="text-sm font-bold text-red-500 uppercase">Sezione Tabù (Dominio Intimo)</h3>
            <p className="text-xs leading-relaxed">
              Come valere di più a letto. Non è sesso, è scambio di potere. Impara a comunicare col corpo e col respiro per diventare un'ossessione nel cervello dell'altro.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-1">
            <h3 className="text-sm font-bold text-amber-500 uppercase">Sezione Lavoro (Il Dio dei Clienti)</h3>
            <p className="text-xs leading-relaxed">
              Smetti di vendere. Inizia a essere venerato. Impara a parlare diversamente, a usare silenzi e parole d'oro per far sì che i tuoi clienti ti vedano come l'unica soluzione possibile. Diventa il loro Dio.
            </p>
          </div>

          <div className="rounded-2xl border border-green-500/30 bg-green-500/5 p-4 space-y-1">
            <h3 className="text-sm font-bold text-green-500 uppercase">Sezione WhatsApp (Frecce Digitali)</h3>
            <p className="text-xs leading-relaxed">
              La comunicazione scritta è un campo minato. Impara a gestire chi invia messaggi inutili o irritanti. Trasforma ogni chat in un terreno di conquista, dove ogni tua risposta è una freccia dorata che chiude la partita.
            </p>
          </div>

          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-1">
            <h3 className="text-sm font-bold text-primary uppercase">Neural Reminders</h3>
            <p className="text-xs leading-relaxed">
              Il sistema non ti lascia solo. Riceverai impulsi durante il giorno con le domande cruciali per auto-potenziarti e ricordarti chi sei. Eviterai che altra merda copra il tuo potere.
            </p>
          </div>
        </section>

        {/* Closing */}
        <div className="rounded-2xl border-2 border-primary bg-primary/5 p-6 text-center space-y-3">
          <h2 className="text-lg font-bold text-primary uppercase">Il Potere è un Privilegio. Conquistalo.</h2>
          <p className="text-sm leading-relaxed">
            Gli strumenti ci sono. L'armatura è pronta. Ma devi meritarla. Devi decidere che la tua vecchia vita è finita.
          </p>
          <p className="text-sm font-semibold text-primary">
            Sei pronto a diventare l'architetto del tuo ologramma? Registrati ed entra.
          </p>
        </div>

        {/* CTA */}
        <Link to="/auth"
          className="flex items-center justify-center gap-3 w-full rounded-2xl bg-primary py-4 px-6 text-base font-bold text-primary-foreground hover:bg-primary/90 transition-colors">
          <Shield size={20} />
          Indossa l'Armatura ed Entra Ora
        </Link>

        {/* Share */}
        <div className="pb-8">
          <button onClick={handleShare}
            className="flex items-center justify-center gap-2 w-full rounded-2xl border border-border py-3 text-sm text-muted-foreground hover:bg-muted transition-colors">
            <Share2 size={16} /> Condividi
          </button>
        </div>
      </div>
    </div>
  );
}
