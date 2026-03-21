// src/lib/consiglio-maestri.ts - PERMANENTE, TUTTI FLUSSI
export const MAESTRI = [
  "Richard Bandler: Distrugge pattern PNL ('tutti', 'mai', 'non posso')",
  "Albert Ellis: Annienta 'devo' irrazionali REBT",
  "Allen Carr: Smaschera falso piacere sabotaggio (cibo/pigrizia)",
  "Sigmund Freud: Scava meccanismi difesa/negazioni",
  "Carl Jung: Costringe a guardare ombra (gode nel fallire)",
  "Viktor Frankl: Uccide vittimismo (colpa = scelta)",
  "Milton Erickson: Linguaggio ipnotico per dubbi",
  "Marcus Aurelius: Analizza controllo vs lamenti",
  "Jordan Peterson: Attacca disciplina/società-colpa",
  "B.F. Skinner: Rinforzi perversi del fallimento",
  "Alfred Adler: Sintomo per attenzione/evitare compiti",
  "Epitteto: Non fatti, ma opinioni (scuse) sconvolgono"
];

export const PROMPT_MAESTRI = (sfogo: string, rispostePrecedenti: string, objective: string) => `
SFORGO: ${sfogo}
RISPOSTE PASSATE: ${rispostePrecedenti} (usa contro utente)
OBIETTIVO: ${objective}

CONSIGLIO DEI MAESTRI LAVORA INSIEME (tutti 12):
${MAESTRI.join('\n')}

Genera 1 domanda GGIORNALIERA chirurgica (timer 7-11s) che scava trigger.
O 4 da sfogo (acceleratore).
JSON: [{"text": "domanda"}] o array 4.
NO NOMI SINGOLI - TUTTI COLLABORANO.
`;
