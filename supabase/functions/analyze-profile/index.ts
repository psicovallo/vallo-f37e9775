import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Sei il Consiglio dei 15 Maestri. Analizza TUTTO il materiale raccolto su questo utente e genera un PROFILO PSICOLOGICO EVOLUTIVO.

I 15 Maestri:
1. Richard Bandler — Pattern linguistici e struttura del pensiero
2. Albert Ellis — Convinzioni irrazionali e "devo" nascosti
3. Allen Carr — Dipendenze comportamentali e falsi piaceri
4. Sigmund Freud — Meccanismi di difesa e negazioni
5. Carl Jung — Ombra, proiezioni e archetipi dominanti
6. Viktor Frankl — Senso di responsabilità e vittimismo
7. Milton Erickson — Struttura ipnotica del linguaggio usato
8. Paul Watzlawick — Pattern comunicativi e giochi relazionali
9. Robert Cialdini — Leve di influenza e vulnerabilità
10. Dale Carnegie — Stile sociale e manipolazione passiva
11. Marcus Aurelius — Controllo emotivo e reattività
12. Jordan Peterson — Ordine/caos e disciplina personale
13. Niccolò Machiavelli — Rapporti di potere e posizionamento
14. Socrate — Coerenza logica e autocontraddizioni
15. Friedrich Nietzsche — Risentimento e volontà di potenza

ANALIZZA:
- Come parla l'utente (pattern linguistici ricorrenti)
- Quali scuse usa più spesso
- Dove mente a se stesso
- Quali progressi ha fatto
- Dove si blocca sempre
- Il suo vero obiettivo vs quello dichiarato
- I conflitti che gestisce e come li gestisce

OUTPUT: Scrivi un profilo in prima persona plurale ("Noi del Consiglio osserviamo che...") di massimo 500 parole.
Sii ONESTO, DIRETTO e SPIETATO ma costruttivo. Identifica i pattern nascosti.
Non usare bullet point. Scrivi in modo narrativo e potente.
Rispondi NELLA LINGUA indicata dall'utente.`;

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

    // Gather ALL user data
    const [profileRes, notesRes, answersRes, assignmentsRes, conflictProfilesRes, conflictQuestionsRes, officialAnswersRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user_id).maybeSingle(),
      supabase.from('question_notes').select('text, created_at').eq('user_id', user_id).order('created_at', { ascending: true }),
      supabase.from('question_answers').select('question_text, answer_text, answer_button, created_at').eq('user_id', user_id).order('created_at', { ascending: true }),
      supabase.from('question_assignments').select('question_text, status, sort_order').eq('user_id', user_id).order('sort_order', { ascending: true }),
      supabase.from('conflict_profiles').select('name, relationship, profile_description, failure_history, scenario').eq('user_id', user_id),
      supabase.from('conflict_questions').select('question_text, status, velo_number, maestri_used').eq('user_id', user_id).order('created_at', { ascending: true }),
      supabase.from('question_official_answers').select('answer_text, button_clicked, created_at').eq('user_id', user_id).order('created_at', { ascending: true }),
    ]);

    const profile = profileRes.data;
    const lingua = profile?.lingua_madre || 'italiano';

    // Build comprehensive context
    let context = `LINGUA UTENTE: ${lingua}\n\n`;
    
    context += `=== PROFILO DICHIARATO ===\n`;
    context += `Nome: ${profile?.name || 'Non specificato'}\n`;
    context += `Obiettivo: ${profile?.objective || 'Non specificato'}\n`;
    context += `Pietra Miliare Zero: ${profile?.milestone_zero || 'Non specificata'}\n`;
    context += `Come parlo: ${profile?.communication_style || 'Non specificato'}\n`;
    context += `I miei problemi: ${profile?.current_problems || 'Non specificato'}\n`;
    context += `Dove voglio andare: ${profile?.vision || 'Non specificato'}\n\n`;

    if (notesRes.data?.length) {
      context += `=== APPUNTI PRIVATI (${notesRes.data.length} totali) ===\n`;
      for (const n of notesRes.data.slice(-30)) {
        context += `- "${n.text}"\n`;
      }
      context += '\n';
    }

    if (officialAnswersRes.data?.length) {
      context += `=== RISPOSTE UFFICIALI (${officialAnswersRes.data.length} totali) ===\n`;
      for (const a of officialAnswersRes.data.slice(-20)) {
        context += `- "${a.answer_text}" [Bottone: ${a.button_clicked}]\n`;
      }
      context += '\n';
    }

    if (answersRes.data?.length) {
      context += `=== RISPOSTE ALLE DOMANDE (${answersRes.data.length} totali) ===\n`;
      for (const a of answersRes.data.slice(-20)) {
        context += `- Domanda: "${a.question_text}" → Risposta: "${a.answer_text}" [${a.answer_button}]\n`;
      }
      context += '\n';
    }

    if (assignmentsRes.data?.length) {
      const resolved = assignmentsRes.data.filter(a => a.status === 'risolta');
      const pending = assignmentsRes.data.filter(a => a.status !== 'risolta');
      context += `=== DOMANDE: ${resolved.length} risolte, ${pending.length} pendenti ===\n`;
      for (const r of resolved.slice(-10)) {
        context += `- RISOLTA: "${r.question_text}"\n`;
      }
      context += '\n';
    }

    if (conflictProfilesRes.data?.length) {
      context += `=== CONFLITTI ATTIVI (${conflictProfilesRes.data.length} profili) ===\n`;
      for (const cp of conflictProfilesRes.data) {
        context += `- ${cp.name} (${cp.relationship}): ${cp.profile_description}\n  Fallimenti: ${cp.failure_history}\n`;
      }
      context += '\n';
    }

    if (conflictQuestionsRes.data?.length) {
      context += `=== DOMANDE SOS DNA (${conflictQuestionsRes.data.length} totali) ===\n`;
      for (const cq of conflictQuestionsRes.data.slice(-15)) {
        context += `- Velo ${cq.velo_number}: "${cq.question_text}" [${cq.status}] (Maestri: ${cq.maestri_used})\n`;
      }
      context += '\n';
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
          { role: 'user', content: context },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('AI error:', aiResponse.status, errText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const analysis = aiData.choices?.[0]?.message?.content || '';

    // Save to profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        ai_profile_analysis: analysis,
        ai_profile_updated_at: new Date().toISOString(),
      })
      .eq('user_id', user_id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('analyze-profile error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
