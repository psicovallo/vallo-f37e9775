/**
 * NecrosisDemo — Demo interattiva del Nucleo della Sovranità
 * Permette all'utente di trascinare uno slider e vedere come il Nucleo
 * si trasforma attraverso i 5 stadi di necrosi.
 */
import { useState } from 'react';
import DNACore from './DNACore';
import { Skull, Sparkles } from 'lucide-react';

const STAGES = [
  { max: 0, label: 'NUCLEO PURO', desc: 'DNA stabile. Ambra brillante. Pulsazione lenta. Sei sovrano.', color: '#f59e0b' },
  { max: 100, label: 'NECROSI INIZIALE', desc: 'Primi glitch. Il Nucleo perde brillantezza. Hai aperto la porta.', color: '#b8821a' },
  { max: 300, label: 'NECROSI ATTIVA', desc: 'Colore che svanisce, frammenti. La corruzione lavora.', color: '#6b5a3a' },
  { max: 500, label: 'NECROSI GRAVE', desc: 'Cenere. Glitch violenti. Il DNA si sta spezzando.', color: '#3a3530' },
  { max: 999, label: 'NUCLEO TERMINALE', desc: 'Quasi nero. Frammentato. Sei un fantasma di te stesso.', color: '#1a1716' },
];

function getStageInfo(debt: number) {
  for (const s of STAGES) {
    if (debt <= s.max) return s;
  }
  return STAGES[STAGES.length - 1];
}

export default function NecrosisDemo() {
  const [debt, setDebt] = useState(0);
  const stage = getStageInfo(debt);

  return (
    <div className="rounded-none border-2 border-amber-700/40 bg-amber-950/10 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-amber-500" />
        <p className="text-xs font-black uppercase tracking-widest text-amber-500">
          Demo Interattiva — Vedi cosa rischi
        </p>
      </div>

      <p className="text-xs text-foreground leading-relaxed">
        Trascina lo slider. Guarda il Nucleo trasformarsi. Questi sono i <strong>5 stadi</strong> che
        attraversi quando smetti di essere sovrano.
      </p>

      {/* Live preview */}
      <div className="flex justify-center rounded-none border-2 border-neutral-800 bg-neutral-950 py-3">
        <DNACore debt={debt} lucidity={Math.max(0, 100 - Math.floor(debt / 6))} />
      </div>

      {/* Slider */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Debito al Futuro
          </label>
          <span className="text-2xl font-black tabular-nums text-destructive leading-none">
            {debt}<span className="text-sm">€</span>
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={700}
          step={10}
          value={debt}
          onChange={(e) => setDebt(Number(e.target.value))}
          className="w-full accent-amber-600"
          aria-label="Simula il debito al futuro"
        />
        <div className="flex justify-between text-[9px] uppercase tracking-widest text-neutral-600">
          <span>0€</span>
          <span>100€</span>
          <span>300€</span>
          <span>500€</span>
          <span>700€+</span>
        </div>
      </div>

      {/* Stage description */}
      <div
        className="rounded-none border-2 p-3"
        style={{ borderColor: stage.color, backgroundColor: 'rgba(20,18,16,0.5)' }}
      >
        <div className="flex items-center gap-2">
          <Skull size={14} style={{ color: stage.color }} />
          <p className="text-xs font-black uppercase tracking-widest" style={{ color: stage.color }}>
            {stage.label}
          </p>
        </div>
        <p className="mt-1 text-xs text-foreground leading-relaxed">{stage.desc}</p>
      </div>

      <p className="text-[10px] uppercase tracking-widest text-amber-700 leading-relaxed">
        ⚠ Ogni vizio = +100€. Inattività 24h = +50€. Solo le Azioni Sovrane e i Giorni Puliti pagano il debito.
      </p>
    </div>
  );
}
