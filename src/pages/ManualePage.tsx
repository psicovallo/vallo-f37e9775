import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Flame, Swords, PenLine, Hammer, Target, Bell, Scale, Shield, Zap, ScrollText } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function ManualePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-4 py-8 pb-24 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/home" className="text-muted-foreground hover:text-foreground" aria-label="Indietro">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-2">
            <BookOpen size={22} className="text-primary" />
            <h1 className="text-2xl font-black uppercase text-foreground">Manuale Operativo</h1>
          </div>
        </div>

        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-2">
          <h2 className="text-base font-black uppercase text-primary">Cos'è Vallo</h2>
          <p className="text-sm text-foreground leading-relaxed">
            Vallo non è un'app di motivazione. È un <strong>sistema di ingegneria relazionale</strong> che ti
            costringe a smontare le tue bugie, profilare gli altri e agire con precisione chirurgica.
            Niente premi, niente sconti, niente scorciatoie. Solo strumenti brutali che funzionano se li usi.
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-2">
          {/* Filosofia */}
          <AccordionItem value="filosofia" className="rounded-xl border border-border bg-card px-4">
            <AccordionTrigger className="text-sm font-bold uppercase">
              <div className="flex items-center gap-2"><ScrollText size={16} className="text-primary" /> La filosofia</div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm leading-relaxed text-foreground">
              <p>
                Il mondo è diviso in due: chi viene programmato e chi programma. Tu, finora, sei stato programmato.
                Vallo ti dà gli strumenti per passare dall'altra parte.
              </p>
              <p>
                Non ti chiediamo di "essere positivo" o di "credere in te stesso". Ti chiediamo di
                <strong> guardare in faccia la realtà</strong>, smontare le scuse e agire.
              </p>
              <p className="text-destructive font-medium">
                Se cerchi conforto, sei nel posto sbagliato. Se cerchi risultati, sei a casa.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Consiglio */}
          <AccordionItem value="consiglio" className="rounded-xl border border-border bg-card px-4">
            <AccordionTrigger className="text-sm font-bold uppercase">
              <div className="flex items-center gap-2"><Shield size={16} className="text-primary" /> Il Consiglio dei 15 Maestri</div>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm leading-relaxed text-foreground">
              <p>L'autorità analitica del sistema. 15 menti che lavorano come un unico organismo:</p>
              <p className="text-xs text-muted-foreground">
                Bandler, Ellis, Freud, Jung, Frankl, Erickson, Watzlawick, Cialdini, Carnegie, Aurelius,
                Peterson, Machiavelli, Socrate, Nietzsche, Carr.
              </p>
              <p>
                Ti parlano sempre in italiano, sempre in modo brutalista. Non ti consolano.
                Ti smontano e ti rimontano.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Domanda */}
          <AccordionItem value="domanda" className="rounded-xl border border-primary/30 bg-card px-4">
            <AccordionTrigger className="text-sm font-bold uppercase">
              <div className="flex items-center gap-2"><Flame size={16} className="text-primary" /> Domanda Attiva (Riflessione)</div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm leading-relaxed text-foreground">
              <p><strong>A cosa serve:</strong> a forzarti a guardare un punto cieco di te stesso, una domanda alla volta.</p>
              <p><strong>Come funziona:</strong> ricevi una domanda. La devi leggere <strong>9 volte</strong> in 9 momenti diversi (con timer di 60s di osservazione). Solo dopo si sblocca la Fase B: rispondi.</p>
              <p><strong>Le regole:</strong> nella risposta sono vietate parole come "spero", "forse", "domani", "ma". Devi scrivere almeno 50 caratteri di verità grezza.</p>
              <p><strong>Quando usarla:</strong> ogni giorno. È il battito del sistema.</p>
            </AccordionContent>
          </AccordionItem>

          {/* SOS DNA */}
          <AccordionItem value="sos" className="rounded-xl border border-amber-500/30 bg-card px-4">
            <AccordionTrigger className="text-sm font-bold uppercase">
              <div className="flex items-center gap-2"><Swords size={16} className="text-amber-500" /> SOS DNA (Metodo Cipolla)</div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm leading-relaxed text-foreground">
              <p><strong>A cosa serve:</strong> quando hai uno scontro reale con qualcuno (compagna, capo, figlio, ex...).</p>
              <p><strong>Come funziona:</strong> profili il bersaglio (relazione, scenario, obiettivo finale, storia dei fallimenti). Il Consiglio genera frasi a strati — i <strong>5 Veli</strong> — da usare in sequenza.</p>
              <p><strong>I 4 scenari:</strong></p>
              <ul className="list-disc pl-5 text-xs space-y-1">
                <li><span className="text-amber-500 font-bold">Conflitto</span> — guerra interpersonale</li>
                <li><span className="text-red-500 font-bold">Eros & Tabù</span> — blocchi intimi</li>
                <li><span className="text-purple-400 font-bold">Power Business</span> — negoziazioni e potere</li>
                <li><span className="text-green-500 font-bold">WhatsApp Shield</span> — risposte a manipolatori</li>
              </ul>
              <p className="text-destructive font-bold">⚠️ Regola d'oro: NON modificare la frase. Ripetila 5 volte mentalmente prima di usarla. Poi aspetta la reazione.</p>
            </AccordionContent>
          </AccordionItem>

          {/* Sfogo */}
          <AccordionItem value="sfogo" className="rounded-xl border border-primary/30 bg-card px-4">
            <AccordionTrigger className="text-sm font-bold uppercase">
              <div className="flex items-center gap-2"><PenLine size={16} className="text-primary" /> Area Sfogo</div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm leading-relaxed text-foreground">
              <p><strong>A cosa serve:</strong> quando hai casino in testa e devi scaricare prima di poter ragionare.</p>
              <p><strong>Come funziona:</strong> scrivi tutto quello che hai dentro, senza censure. L'AI raccoglie il fango e te lo restituisce sotto forma di domande chirurgiche, in loop. La sessione dura 30 minuti.</p>
              <p><strong>Quando usarla:</strong> quando senti la pressione che sale, l'ansia che ti blocca, o quando la testa gira a vuoto.</p>
            </AccordionContent>
          </AccordionItem>

          {/* Forgia */}
          <AccordionItem value="forgia" className="rounded-xl border border-red-700/40 bg-card px-4">
            <AccordionTrigger className="text-sm font-bold uppercase">
              <div className="flex items-center gap-2"><Hammer size={16} className="text-red-500" /> La Forgia</div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm leading-relaxed text-foreground">
              <p><strong>A cosa serve:</strong> sfide quotidiane brutali per riprogrammare comportamenti.</p>
              <p><strong>Gatekeeper:</strong> per accedere devi prima compilare il Profilo Evolutivo (obiettivi, stile, problemi attuali, visione).</p>
              <p><strong>Come funziona:</strong> ogni giorno una sfida diversa. Se la salti, perdi il ciclo. Se la completi, costruisci un mattone.</p>
            </AccordionContent>
          </AccordionItem>

          {/* Tribunale */}
          <AccordionItem value="tribunale" className="rounded-xl border border-border bg-card px-4">
            <AccordionTrigger className="text-sm font-bold uppercase">
              <div className="flex items-center gap-2"><Scale size={16} className="text-foreground" /> Il Tribunale</div>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm leading-relaxed text-foreground">
              <p>Cicli di valutazione di <strong>15 giorni</strong>. Il Consiglio analizza i tuoi <strong>Mattoni Posati</strong> (azioni concrete) contro le tue <strong>Crepe</strong> (mancanze, scuse, bypass).</p>
              <p>Verdetto brutalista: niente sconti, niente premi di partecipazione.</p>
            </AccordionContent>
          </AccordionItem>

          {/* Overton */}
          <AccordionItem value="overton" className="rounded-xl border border-amber-700/40 bg-card px-4">
            <AccordionTrigger className="text-sm font-bold uppercase">
              <div className="flex items-center gap-2"><Target size={16} className="text-amber-500" /> Overton Shift</div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm leading-relaxed text-foreground">
              <p><strong>A cosa serve:</strong> a spostare l'impossibile dentro di te. Una scala in 5 step:</p>
              <ol className="list-decimal pl-5 text-xs space-y-1">
                <li><strong>IMPENSABILE</strong> — il tabù</li>
                <li><strong>RADICALE</strong> — la frattura</li>
                <li><strong>ACCETTABILE</strong> — l'azione</li>
                <li><strong>NORMA</strong> — l'abitudine</li>
                <li><strong>DOMINIO</strong> — il nuovo DNA</li>
              </ol>
              <p>Ogni step ha 48h di decadimento: se non lo confermi in tempo, devi ricominciare.</p>
            </AccordionContent>
          </AccordionItem>

          {/* Notifiche */}
          <AccordionItem value="notifiche" className="rounded-xl border border-border bg-card px-4">
            <AccordionTrigger className="text-sm font-bold uppercase">
              <div className="flex items-center gap-2"><Bell size={16} className="text-primary" /> Centro Notifiche</div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm leading-relaxed text-foreground">
              <p>Nei <strong>Promemoria</strong> trovi ogni domanda generata (Riflessione, SOS DNA, Sfogo, Overton). Per ognuna puoi:</p>
              <ul className="list-disc pl-5 text-xs space-y-1">
                <li>impostare orari fissi specifici</li>
                <li>archiviare (la disattiva senza cancellarla)</li>
                <li>eliminare</li>
                <li>modificare il testo</li>
              </ul>
              <p>Le push arrivano sempre, indipendentemente dal fatto che tu le abbia lette.</p>
            </AccordionContent>
          </AccordionItem>

          {/* Quantum */}
          <AccordionItem value="quantum" className="rounded-xl border border-primary/30 bg-card px-4">
            <AccordionTrigger className="text-sm font-bold uppercase">
              <div className="flex items-center gap-2"><Zap size={16} className="text-primary" /> Settings Quantum (Focus 12)</div>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm leading-relaxed text-foreground">
              <p>Modalità sperimentale (BETA). Attiva la <strong>Modellazione Olografica</strong>: prima di ogni sessione SOS DNA si avvia un timer di stabilizzazione di 30 secondi.</p>
              <p className="text-xs text-destructive">⚠️ Non è una terapia. Non sostituisce uno specialista. Usalo a tuo rischio.</p>
            </AccordionContent>
          </AccordionItem>

          {/* Flusso giornaliero */}
          <AccordionItem value="flusso" className="rounded-xl border border-primary/40 bg-primary/5 px-4">
            <AccordionTrigger className="text-sm font-bold uppercase text-primary">
              📅 Il flusso giornaliero ideale
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm leading-relaxed text-foreground">
              <div>
                <p className="font-bold text-primary">🌅 Mattina</p>
                <p className="text-xs">Apri la Domanda Attiva. Una lettura. 60s di osservazione. Poi avanti con la giornata.</p>
              </div>
              <div>
                <p className="font-bold text-primary">☀️ Giorno</p>
                <p className="text-xs">Ricevi le push. Quando puoi, leggi (servono 9 letture totali per sbloccare la Fase B).</p>
              </div>
              <div>
                <p className="font-bold text-primary">🌆 Pomeriggio (se hai casino)</p>
                <p className="text-xs">Apri l'Area Sfogo. 30 minuti di scarico. L'AI ti pulisce la testa.</p>
              </div>
              <div>
                <p className="font-bold text-primary">⚔️ Quando arriva uno scontro</p>
                <p className="text-xs">Apri SOS DNA. Profila il bersaglio. Ricevi le frecce. Ripeti 5 volte. Lancia.</p>
              </div>
              <div>
                <p className="font-bold text-primary">🌙 Sera</p>
                <p className="text-xs">Rispondi alla Domanda Attiva (se hai sbloccato la Fase B). Confronta i Mattoni della giornata.</p>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* FAQ */}
          <AccordionItem value="faq" className="rounded-xl border border-border bg-card px-4">
            <AccordionTrigger className="text-sm font-bold uppercase">❓ Domande frequenti</AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm leading-relaxed text-foreground">
              <div>
                <p className="font-bold">Perché 9 letture?</p>
                <p className="text-xs text-muted-foreground">Perché una domanda non si interiorizza alla prima. Serve ripetizione spaziata per scendere sotto la superficie.</p>
              </div>
              <div>
                <p className="font-bold">Perché ci sono parole bloccate nelle risposte?</p>
                <p className="text-xs text-muted-foreground">Perché parole come "spero", "forse", "domani" sono fughe. Il sistema ti costringe a stare nel presente concreto.</p>
              </div>
              <div>
                <p className="font-bold">Cos'è un Velo?</p>
                <p className="text-xs text-muted-foreground">Uno strato di difesa del bersaglio. Devi smontarli in ordine: salti un velo, esplodi.</p>
              </div>
              <div>
                <p className="font-bold">Posso modificare le frasi SOS DNA?</p>
                <p className="text-xs text-destructive font-bold">No. Mai. Sono calibrate. Modificarle = disinnescarle.</p>
              </div>
              <div>
                <p className="font-bold">Cosa succede se salto un giorno?</p>
                <p className="text-xs text-muted-foreground">Niente premi, niente punizioni infantili. Ma nel Tribunale conterà come Crepa.</p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5 space-y-2">
          <h3 className="text-sm font-black uppercase text-destructive">Le 3 regole d'oro</h3>
          <ol className="list-decimal pl-5 text-sm space-y-2 text-foreground">
            <li><strong>Non modificare le frasi del Consiglio.</strong> Sono armi calibrate.</li>
            <li><strong>Ripeti 5 volte mentalmente</strong> ogni frase SOS DNA prima di usarla.</li>
            <li><strong>Non saltare i Veli.</strong> L'ordine è la potenza.</li>
          </ol>
        </div>

        <Link
          to="/home"
          className="flex items-center justify-center gap-2 w-full rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground hover:bg-primary/90"
        >
          Torna alla Home e inizia
        </Link>
      </div>
    </div>
  );
}
