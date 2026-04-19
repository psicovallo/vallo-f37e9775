/**
 * DNACore — Nucleo della Sovranità
 * Visual representation of the user's state. Replaces the global grayscale filter.
 * - debt 0       => stable amber pulse, sharp
 * - debt 1-100   => light necrosis (slow glitch, slight blur)
 * - debt 101-300 => medium necrosis (color drain, fragmentation)
 * - debt 301-500 => heavy necrosis (gray ash, strong glitch)
 * - debt 500+    => terminal necrosis (almost black, broken)
 */

interface DNACoreProps {
  debt: number;
  lucidity: number;
}

type NecrosisStage = 'pristine' | 'light' | 'medium' | 'heavy' | 'terminal';

function getStage(debt: number): NecrosisStage {
  if (debt <= 0) return 'pristine';
  if (debt <= 100) return 'light';
  if (debt <= 300) return 'medium';
  if (debt <= 500) return 'heavy';
  return 'terminal';
}

const STAGE_LABELS: Record<NecrosisStage, string> = {
  pristine: 'NUCLEO STABILE',
  light: 'NECROSI INIZIALE',
  medium: 'NECROSI ATTIVA',
  heavy: 'NECROSI GRAVE',
  terminal: 'NUCLEO TERMINALE',
};

const STAGE_COLORS: Record<NecrosisStage, { core: string; ring: string; glow: string }> = {
  pristine: { core: '#f59e0b', ring: '#d97706', glow: 'rgba(217,119,6,0.55)' },
  light: { core: '#b8821a', ring: '#7a5510', glow: 'rgba(217,119,6,0.25)' },
  medium: { core: '#6b5a3a', ring: '#3f3525', glow: 'rgba(120,90,40,0.18)' },
  heavy: { core: '#3a3530', ring: '#1c1a17', glow: 'rgba(60,55,50,0.12)' },
  terminal: { core: '#1a1716', ring: '#0a0908', glow: 'rgba(20,18,16,0.08)' },
};

export default function DNACore({ debt, lucidity }: DNACoreProps) {
  const stage = getStage(debt);
  const colors = STAGE_COLORS[stage];
  const isPristine = stage === 'pristine';

  // Dynamic intensity for glitch (used in inline style)
  const glitchIntensity = isPristine
    ? 0
    : stage === 'light'
      ? 1
      : stage === 'medium'
        ? 2
        : stage === 'heavy'
          ? 3
          : 4;

  const blurPx = isPristine ? 0 : Math.min(glitchIntensity * 0.6, 2.4);

  return (
    <div className="flex flex-col items-center justify-center py-2">
      <style>{`
        @keyframes dnaPulse {
          0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
          50% { transform: scale(1.06) rotate(180deg); opacity: 0.92; }
        }
        @keyframes dnaRingSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes dnaGlitch {
          0%, 100% { transform: translate(0,0) skew(0deg); }
          10% { transform: translate(-2px, 1px) skew(-1deg); }
          20% { transform: translate(2px, -1px) skew(1deg); }
          30% { transform: translate(-1px, 2px) skew(0deg); }
          40% { transform: translate(3px, 0) skew(-2deg); }
          50% { transform: translate(-3px, -2px) skew(1deg); }
          60% { transform: translate(1px, 3px) skew(0deg); }
          70% { transform: translate(-2px, -1px) skew(2deg); }
          80% { transform: translate(2px, 2px) skew(-1deg); }
          90% { transform: translate(-1px, 0) skew(0deg); }
        }
        @keyframes dnaScanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        .dna-pulse { animation: dnaPulse 4s ease-in-out infinite !important; }
        .dna-ring-spin { animation: dnaRingSpin 18s linear infinite !important; }
        .dna-glitch-1 { animation: dnaGlitch 1.6s steps(8) infinite !important; }
        .dna-glitch-2 { animation: dnaGlitch 0.9s steps(10) infinite !important; }
        .dna-glitch-3 { animation: dnaGlitch 0.5s steps(12) infinite !important; }
        .dna-glitch-4 { animation: dnaGlitch 0.25s steps(16) infinite !important; }
        .dna-scanline { animation: dnaScanline 2.5s linear infinite !important; }
      `}</style>

      <div
        className="relative"
        style={{ width: 140, height: 140 }}
      >
        {/* Outer rotating ring */}
        <svg
          viewBox="0 0 140 140"
          className={isPristine ? 'dna-ring-spin' : ''}
          style={{
            position: 'absolute',
            inset: 0,
            opacity: isPristine ? 0.9 : Math.max(0.15, 0.7 - glitchIntensity * 0.15),
            filter: blurPx ? `blur(${blurPx * 0.5}px)` : 'none',
          }}
        >
          <polygon
            points="70,8 128,40 128,100 70,132 12,100 12,40"
            fill="none"
            stroke={colors.ring}
            strokeWidth={isPristine ? 1.5 : 1}
            strokeDasharray={isPristine ? '0' : `${4 + glitchIntensity * 2} ${2 + glitchIntensity}`}
          />
        </svg>

        {/* Glitch wrapper */}
        <div
          className={
            glitchIntensity === 0
              ? ''
              : `dna-glitch-${glitchIntensity}`
          }
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            filter: blurPx ? `blur(${blurPx}px)` : 'none',
          }}
        >
          {/* Core diamond */}
          <svg
            viewBox="0 0 100 100"
            className={isPristine ? 'dna-pulse' : ''}
            style={{
              width: 90,
              height: 90,
              filter: isPristine
                ? `drop-shadow(0 0 18px ${colors.glow}) drop-shadow(0 0 6px ${colors.glow})`
                : `drop-shadow(0 0 4px ${colors.glow})`,
            }}
          >
            <defs>
              <linearGradient id={`dnaGrad-${stage}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={colors.core} stopOpacity={isPristine ? 1 : 0.7} />
                <stop offset="100%" stopColor={colors.ring} stopOpacity={isPristine ? 1 : 0.4} />
              </linearGradient>
            </defs>
            {/* Outer diamond */}
            <polygon
              points="50,4 96,50 50,96 4,50"
              fill={`url(#dnaGrad-${stage})`}
              stroke={colors.core}
              strokeWidth={isPristine ? 2 : 1}
              opacity={isPristine ? 1 : Math.max(0.3, 1 - glitchIntensity * 0.18)}
            />
            {/* Inner diamond (fragmented when necrotic) */}
            {isPristine ? (
              <polygon points="50,22 78,50 50,78 22,50" fill="none" stroke={colors.core} strokeWidth={1.5} opacity={0.85} />
            ) : (
              <>
                <polyline
                  points="50,22 78,50"
                  fill="none"
                  stroke={colors.core}
                  strokeWidth={1}
                  opacity={Math.max(0.2, 0.8 - glitchIntensity * 0.15)}
                />
                <polyline
                  points="50,78 22,50"
                  fill="none"
                  stroke={colors.core}
                  strokeWidth={1}
                  opacity={Math.max(0.2, 0.8 - glitchIntensity * 0.15)}
                />
                {glitchIntensity >= 3 && (
                  <line x1="20" y1="60" x2="80" y2="40" stroke={colors.ring} strokeWidth={0.5} opacity={0.5} />
                )}
                {glitchIntensity >= 4 && (
                  <line x1="30" y1="20" x2="70" y2="85" stroke={colors.ring} strokeWidth={0.5} opacity={0.4} />
                )}
              </>
            )}
            {/* Center dot */}
            <circle cx="50" cy="50" r={isPristine ? 4 : 2} fill={colors.core} opacity={isPristine ? 1 : 0.6} />
          </svg>
        </div>

        {/* Scanline overlay (only when necrotic) */}
        {!isPristine && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              overflow: 'hidden',
              pointerEvents: 'none',
              opacity: 0.3,
            }}
          >
            <div
              className="dna-scanline"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: 2,
                background: `linear-gradient(to right, transparent, ${colors.ring}, transparent)`,
              }}
            />
          </div>
        )}
      </div>

      <div className="mt-2 text-center">
        <p
          className="text-[9px] font-black uppercase tracking-[0.3em]"
          style={{ color: isPristine ? '#d97706' : '#666' }}
        >
          {STAGE_LABELS[stage]}
        </p>
        <p className="text-[8px] uppercase tracking-widest text-neutral-600 mt-0.5">
          Lucidità {lucidity}/100
        </p>
      </div>
    </div>
  );
}
