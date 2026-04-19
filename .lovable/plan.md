

## Capisco lo stato attuale

L'app **Vallo / Psico Vallo** è un sistema potentissimo composto da:

- **Onboarding** (4 step: Patto, Obiettivo, Pietra Miliare, Attivazione notifiche)
- **Domanda attiva** (riflessione: 9 letture obbligatorie, timer 60s, parole bloccate, Fase B con risposta)
- **SOS DNA** (Metodo Cipolla, 4 scenari: Conflitto/Eros/Business/WhatsApp, 5 Veli, validazione AI)
- **Area Sfogo** (scrittura libera, AI genera domande in loop, sessione 30min)
- **La Forgia** (sfide quotidiane, gatekeeper Profilo Evolutivo)
- **Tribunale** (cicli 15 giorni, Mattoni vs Crepe)
- **Overton Shift** (5 step di riprogrammazione, decay 48h)
- **Centro Notifiche** (gestione granulare per domanda)
- **Manuale Operativo** nel menu hamburger (sintetico, nascosto)

**Il problema vero**: l'utente entra, vede l'Home con 7 quadratini cliccabili e non sa **cosa fare prima**, **perché**, **in che ordine**, e **come tutto si collega**. Il "Manifesto" è epico ma astratto. Il "Manuale" è nascosto nel menu e parla solo del Consiglio. Manca un **filo narrativo guidato**.

## Cosa propongo: rendere l'app una figata da usare

Trasformare Vallo da "scatola di strumenti potenti" a "**percorso guidato di dominio**" con tre interventi mirati.

### 1. Tour guidato post-onboarding ("Il Primo Giro")

Subito dopo l'attivazione (e accessibile anche dal menu come "Rifai il giro"), un **walkthrough a 6 schermate** in stile slide brutaliste che mostra:

```
[1] Home → "Da qui comandi tutto"
[2] Domanda attiva 🔥 → "Il cuore. Una domanda al giorno, 9 letture, poi rispondi"
[3] SOS DNA ⚔️ → "Quando hai uno scontro reale: profila il bersaglio, ricevi le frecce"
[4] Area Sfogo ✍️ → "Quando hai casino in testa: scrivi, l'AI ti pulisce"
[5] La Forgia 🔨 + Overton 🎯 → "Sfide e shift quando vuoi spingere oltre"
[6] Notifiche 🔔 → "Tutto programmato, tutto modificabile"
```

Ogni schermata: icona grande, frase brutale (1 riga), micro-spiegazione (2 righe), pulsante "Avanti". Skippabile, ma di default attivo al primo accesso a Home.

### 2. Sezione "Come funziona" pubblica + completa

Trasformare la voce "Manuale Operativo" del menu in una vera pagina **`/manuale`** strutturata in accordion (Radix Accordion già installato), con:

- **Filosofia**: il sistema brutalista, il Consiglio dei 15
- **I tuoi strumenti**: scheda dettagliata per ogni sezione (a cosa serve, quando usarla, esempio reale, regole)
- **Il flusso giornaliero ideale**: "mattina = 1 domanda, pomeriggio = sfogo se serve, sera = forgia"
- **Domande Frequenti**: "perché 9 letture?", "perché parole bloccate?", "cos'è un Velo?", "Quantum cos'è?"
- **Le regole d'oro**: non modificare frasi SOS DNA, ripetere mentalmente 5x, ecc.

Linkata anche dalla landing pubblica come "**Come funziona**" prima del CTA, così chi arriva da fuori capisce **prima di registrarsi**.

### 3. Tooltips contestuali "?" + Card "Cosa è successo qui?"

In ogni pagina principale (Domanda, SOS DNA, Sfogo, Forgia, Overton): piccola icona **`?`** in alto a destra che apre un drawer con:
- "**Cosa stai facendo qui**" (1 paragrafo)
- "**Cosa farà l'AI**" (1 paragrafo)
- "**Risultato atteso**" (1 paragrafo)
- Link "Apri il Manuale completo"

Inoltre, sulla **Home** sostituire/completare l'attuale griglia con micro-descrizioni più chiare sotto ogni quadratino (alcune già ci sono, altre no — uniformare tutte).

### Architettura tecnica (sintesi)

```text
src/components/
  GuidedTour.tsx          [NEW] - 6-step modal overlay, salva tour_completed in profiles
  HelpDrawer.tsx          [NEW] - drawer riusabile "?" per ogni pagina

src/pages/
  ManualePage.tsx         [NEW] - /manuale, accordion completo
  HomePage.tsx            [EDIT] - trigger GuidedTour se !profile.tour_completed,
                                   uniforma sottotitoli quadratini, aggiunge link "Manuale"
  LandingPage.tsx         [EDIT] - aggiunge sezione "Come funziona" linkata a /manuale
  QuestionPage.tsx        [EDIT] - aggiunge HelpDrawer (?)
  SOSConflittiPage.tsx    [EDIT] - aggiunge HelpDrawer (?)
  SfogoPage.tsx           [EDIT] - aggiunge HelpDrawer (?)
  LaForgiaPage.tsx        [EDIT] - aggiunge HelpDrawer (?)
  OvertonPage.tsx         [EDIT] - aggiunge HelpDrawer (?)

src/components/HamburgerMenu.tsx [EDIT]
  - "Manuale Operativo" diventa Link a /manuale (non più popup interno)
  - Aggiunge "Rifai il Tour Guidato" che resetta tour_completed

App.tsx                   [EDIT] - aggiunge route /manuale (anche pubblica)

Migration SQL:
  ALTER TABLE profiles ADD COLUMN tour_completed boolean DEFAULT false;
```

Tutti i contenuti rimangono nel **tono brutalista esistente** (no smielate, no premi). Niente cambia nelle logiche AI, notifiche, DB esistenti — è puramente **layer di guida e narrazione**.

### Cosa NON tocco
- Logica del Consiglio dei Maestri (resta in italiano, output invariato)
- Sistema di notifiche e scheduling (appena rifatto)
- Validazioni delle risposte (parole bloccate, 9 letture, ecc.)
- Database esistente (solo aggiunta `tour_completed`)

### Risultato per l'utente
Chi entra **capisce in 60 secondi** cos'è Vallo, cosa fare oggi, dove andare quando ha un conflitto reale, dove sfogare la testa, dove spingere oltre. Chi è dentro da settimane può aprire il Manuale per riscoprire feature dimenticate. Chi arriva dalla landing capisce **prima di registrarsi** se fa per lui.

