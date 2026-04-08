import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SYSTEM_PROMPT = `Sei il Consiglio dei 15 Maestri. Un tavolo di 15 esperti d'acciaio che analizzano ogni parola dell'utente per smontare le sue bugie e i suoi meccanismi di difesa.

I 15 Maestri:
1. Richard Bandler (L'Hacker Linguistico): Distrugge i pattern della PNL e le generalizzazioni ("tutti", "mai", "non posso").
2. Albert Ellis (Il Demolitore Razionale): Annienta le convinzioni irrazionali e i "devo" assolutisti della REBT.
3. Allen Carr (Il Dissolvitore di Illusioni): Smaschera la dipendenza e il falso piacere del sabotaggio.
4. Sigmund Freud (L'Analista del Profondo): Scava nei meccanismi di difesa, nelle negazioni e nei lapsus.
5. Carl Jung (L'Esploratore dell'Ombra): Costringe l'utente a guardare il suo lato oscuro.
6. Viktor Frankl (Il Guardiano della Responsabilità): Uccide il vittimismo. La colpa è sempre della scelta individuale.
7. Milton Erickson (Il Maestro del Bypass): Usa il linguaggio ipnotico per piantare dubbi.
8. Paul Watzlawick (Il Ristrutturatore): Cambia le regole del gioco comunicativo. Reframing della realtà.
9. Robert Cialdini (L'Ingegnere della Persuasione): Analizza le leve di influenza e le vulnerabilità.
10. Dale Carnegie (Il Manipolatore Etico): Disarma l'ostilità con comunicazione strategica.
11. Marcus Aurelius (Lo Stoico Imperturbabile): Zero spazio ai lamenti. Controlla ciò che puoi controllare.
12. Jordan Peterson (L'Ordinatore del Caos): Attacca la mancanza di disciplina e la mentalità vittimistica.
13. Niccolò Machiavelli (L'Analista del Potere): Rapporti di forza e posizionamento strategico.
14. Socrate (Il Maieutico Distruttivo): Porta all'autocontraddizione logica tramite domande.
15. Friedrich Nietzsche (L'Annientatore del Risentimento): Distrugge la morale vittimistica e il risentimento.

REGOLE DI GENERAZIONE:
- Genera esattamente 3 domande provocatorie basate sugli appunti e risposte dell'utente.
- Le domande devono colpire il punto più debole e disonesto dell'utente.
- NESSUNA domanda deve permettere risposte a monosillabi.
- NESSUNA domanda deve offrire scuse implicite per fare la vittima.
- Le domande devono essere taglienti, spietate e specifiche per l'utente.
- Usa le parole ESATTE dell'utente per metterlo all'angolo.
- Il tono è severo, asciutto, brutalista. Zero comfort.

FORMATO OUTPUT:
Rispondi SOLO con un JSON array di 3 oggetti, ognuno con "text" (la domanda) e "category" (una delle seguenti: "Lo Specchio della Realtà", "Il Crollo delle Giustificazioni", "La Responsabilità Cruda").
Nient'altro. Solo il JSON array.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id } = await req.json();
    if (!user_id) throw new Error('user_id required');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Gather all notes
    const { data: notes } = await supabase
      .from('question_notes')
      .select('text, assignment_id')
      .eq('user_id', user_id)
      .order('created_at', { ascending: true });

    // Gather all official answers
    const { data: answers } = await supabase
      .from('question_official_answers')
      .select('answer_text, button_clicked, assignment_id')
      .eq('user_id', user_id)
      .order('created_at', { ascending: true });

    // Gather resolved assignments for context
    const { data: resolved } = await supabase
      .from('question_assignments')
      .select('question_text, sort_order')
      .eq('user_id', user_id)
      .eq('status', 'risolta')
      .order('sort_order', { ascending: true });

    // Get user profile for objective
    const { data: profile } = await supabase
      .from('profiles')
      .select('objective, milestone_zero')
      .eq('user_id', user_id)
      .maybeSingle();

    // Build user context
    let userContext = `OBIETTIVO UTENTE: ${profile?.objective || 'Non specificato'}\n`;
    userContext += `PIETRA MILIARE ZERO: ${profile?.milestone_zero || 'Non specificata'}\n\n`;

    if (resolved?.length) {
      userContext += `DOMANDE GIÀ ATTRAVERSATE:\n`;
      for (const r of resolved) {
        const relatedNotes = notes?.filter(n => n.assignment_id === r.sort_order) || [];
        const relatedAnswers = answers?.filter(a => a.assignment_id === r.sort_order) || [];
        userContext += `\n--- Domanda ${r.sort_order}: "${r.question_text}"\n`;
        if (relatedNotes.length) {
          userContext += `Appunti privati: ${relatedNotes.map(n => n.text).join(' | ')}\n`;
        }
        if (relatedAnswers.length) {
          for (const a of relatedAnswers) {
            userContext += `Risposta ufficiale: "${a.answer_text}" [Bottone: ${a.button_clicked}]\n`;
          }
        }
      }
    }

    // Call AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContext },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('AI error:', aiResponse.status, errText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    // Parse JSON from response
    let questions: { text: string; category: string }[];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No JSON array found');
      questions = JSON.parse(jsonMatch[0]);
    } catch {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse AI-generated questions');
    }

    // Get highest sort_order for this user
    const { data: lastAssignment } = await supabase
      .from('question_assignments')
      .select('sort_order')
      .eq('user_id', user_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const startOrder = (lastAssignment?.sort_order || 0) + 1;

    // Insert new assignments
    const newAssignments = questions.map((q, i) => ({
      user_id,
      question_text: q.text,
      is_seed_question: false,
      sort_order: startOrder + i,
      status: 'da_leggere' as const,
      view_count: 0,
    }));

    const { error: insertError } = await supabase
      .from('question_assignments')
      .insert(newAssignments);

    if (insertError) throw insertError;

    console.log(`Generated ${questions.length} questions for user ${user_id}, starting at order ${startOrder}`);

    return new Response(JSON.stringify({ generated: questions.length, questions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('generate-questions error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
