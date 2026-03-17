import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get current time in Europe/Rome timezone as HH:MM
    const now = new Date();
    const romeTime = now.toLocaleTimeString('it-IT', {
      timeZone: 'Europe/Rome',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    console.log(`Checking reminders for time: ${romeTime}`);

    // Find active reminders that have the current time in their times array
    const { data: reminders, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('active', true)
      .contains('times', [romeTime]);

    if (error) throw error;

    console.log(`Found ${reminders?.length || 0} reminders matching ${romeTime}`);

    if (!reminders?.length) {
      return new Response(JSON.stringify({ checked: romeTime, found: 0, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get unique user_ids from reminders
    const userIds = [...new Set(reminders.map(r => r.user_id))];
    let totalSent = 0;

    // For each user, check their question progress and send the current question
    for (const userId of userIds) {
      // Get or create progress
      let { data: progress } = await supabase
        .from('question_progress')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!progress) {
        const { data: newProgress } = await supabase
          .from('question_progress')
          .insert({ user_id: userId, current_question_index: 1, answered: false })
          .select()
          .single();
        progress = newProgress;
      }

      if (!progress) continue;

      // If current question is answered, advance
      let qIndex = progress.current_question_index;
      if (progress.answered) {
        qIndex = qIndex + 1;
        if (qIndex > 21) continue; // all done
        await supabase
          .from('question_progress')
          .update({ current_question_index: qIndex, answered: false, answer_text: null, answer_button: null, answered_at: null })
          .eq('user_id', userId);
      }

      // Fetch questions
      const { data: questions } = await supabase
        .from('phrases')
        .select('text')
        .eq('type', 'domanda')
        .order('created_at', { ascending: true });

      if (!questions || qIndex > questions.length) continue;

      const questionText = questions[qIndex - 1].text;
      const title = `🔥 Domanda ${qIndex}/21`;
      const body = questionText;

      const sendUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`;
      const response = await fetch(sendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          user_ids: [userId],
          title,
          body,
          data: { url: '/question' },
        }),
      });

      const result = await response.json();
      totalSent += result.sent || 0;
    }

    return new Response(JSON.stringify({
      checked: romeTime,
      found: reminders.length,
      sent: totalSent,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('check-reminders error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
