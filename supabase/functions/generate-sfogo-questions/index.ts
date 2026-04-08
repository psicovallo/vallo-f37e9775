import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SYSTEM_PROMPT = `Sei il Consiglio dei 15 Maestri — un tavolo di esperti che analizza lo sfogo dell'utente per generare domande di riflessione profonda.

I 15 Maestri:
- Richard Bandler (PNL): smonta i pattern linguistici
- Albert Ellis (REBT): demolisce le convinzioni irrazionali
- Allen Carr: smaschera le false gratificazioni
- Sigmund Freud: scava nei meccanismi di difesa
- Carl Jung: esplora l'ombra interiore
- Viktor Frankl: elimina il vittimismo
- Milton Erickson: pianta dubbi dove c'è certezza
- Paul Watzlawick: ristruttura la realtà comunicativa (reframing)
- Robert Cialdini: analizza leve di influenza e vulnerabilità
- Dale Carnegie: disarma l'ostilità con comunicazione strategica
- Marco Aurelio: zero spazio ai lamenti
- Jordan Peterson: attacca la mancanza di disciplina
- Niccolò Machiavelli: analizza rapporti di forza e potere
- Socrate: porta all'autocontraddizione logica
- Friedrich Nietzsche: distrugge il risentimento e la morale vittimistica

CONTESTO: L'utente sta lavorando sull'obiettivo di DIMAGRIMENTO. Ha scritto uno sfogo libero. Genera 3-5 domande di riflessione che:
1. Sono legate specificamente a ciò che ha scritto
2. Lo costringono a guardare più in profondità
3. Non permettono risposte a monosillabi
4. Non offrono scuse implicite
5. Sono taglienti ma empatiche — il tono è "ti vedo, e non ti lascio scappare"

Rispondi SOLO con un JSON array di stringhe, ogni stringa è una domanda. Esempio:
["Domanda 1?", "Domanda 2?", "Domanda 3?"]`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sfogo_text, objective } = await req.json();

    if (!sfogo_text || sfogo_text.trim().length < 10) {
      return new Response(JSON.stringify({ error: 'Scrivi almeno qualche riga prima di chiedere aiuto.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const systemPrompt = SYSTEM_PROMPT.replace('DIMAGRIMENTO', (objective || 'Dimagrimento').toUpperCase());

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Ecco il mio sfogo:\n\n${sfogo_text}` },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'generate_questions',
            description: 'Generate reflection questions based on user venting',
            parameters: {
              type: 'object',
              properties: {
                questions: {
                  type: 'array',
                  items: { type: 'string' },
                  minItems: 3,
                  maxItems: 5,
                }
              },
              required: ['questions'],
              additionalProperties: false,
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'generate_questions' } },
      }),
    });

    if (aiResponse.status === 429) {
      return new Response(JSON.stringify({ error: 'Troppe richieste. Riprova tra qualche minuto.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (aiResponse.status === 402) {
      return new Response(JSON.stringify({ error: 'Crediti AI esauriti.' }), {
        status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!aiResponse.ok) {
      const t = await aiResponse.text();
      console.error('AI error:', aiResponse.status, t);
      throw new Error('AI gateway error');
    }

    const data = await aiResponse.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let questions: string[];

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      questions = parsed.questions;
    } else {
      // Fallback: try parsing content directly
      const content = data.choices?.[0]?.message?.content || '[]';
      const match = content.match(/\[[\s\S]*\]/);
      questions = match ? JSON.parse(match[0]) : [];
    }

    if (!questions?.length) {
      questions = [
        "Cosa stai cercando di evitare nascondendoti dietro queste parole?",
        "Se rileggessi quello che hai scritto tra un anno, cosa vorresti dire a te stesso?",
        "Quale azione concreta potresti fare ORA invece di continuare a parlarne?",
      ];
    }

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('generate-sfogo-questions error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
