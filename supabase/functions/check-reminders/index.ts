import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function generateRandomTimes(start: string, end: string, count: number): string[] {
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (endMinutes <= startMinutes) return [];

  const times: Set<string> = new Set();
  let attempts = 0;

  while (times.size < count && attempts < 100) {
    const randomMin = startMinutes + Math.floor(Math.random() * (endMinutes - startMinutes));
    const h = Math.floor(randomMin / 60);
    const m = randomMin % 60;
    times.add(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    attempts++;
  }

  return [...times].sort();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const now = new Date();
    const romeFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Rome',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const romeDate = romeFormatter.format(now);

    const romeTime = now.toLocaleTimeString('it-IT', {
      timeZone: 'Europe/Rome',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    console.log(`Check reminders at ${romeTime} on ${romeDate}`);

    const { data: questions, error: questionsError } = await supabase
      .from('phrases')
      .select('text')
      .eq('type', 'domanda')
      .order('created_at', { ascending: true });

    if (questionsError) throw questionsError;
    if (!questions?.length) {
      return new Response(JSON.stringify({ checked: romeTime, users: 0, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: allProgress, error: progressError } = await supabase
      .from('question_progress')
      .select('*')
      .eq('onboarding_completed', true);

    if (progressError) throw progressError;
    if (!allProgress?.length) {
      return new Response(JSON.stringify({ checked: romeTime, users: 0, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let totalSent = 0;

    for (const progress of allProgress) {
      const userId = progress.user_id;

      let dailyTimes: string[] = progress.daily_times || [];
      if (progress.daily_times_date !== romeDate) {
        dailyTimes = generateRandomTimes(
          progress.notification_window_start || '08:00',
          progress.notification_window_end || '22:00',
          6
        );

        await supabase
          .from('question_progress')
          .update({ daily_times: dailyTimes, daily_times_date: romeDate })
          .eq('id', progress.id);

        console.log(`Generated times for ${userId}: ${dailyTimes.join(', ')}`);
      }

      if (!dailyTimes.includes(romeTime)) continue;

      let qIndex = progress.current_question_index;
      if (progress.answered) {
        qIndex = qIndex + 1;
        if (qIndex > questions.length) continue;

        await supabase
          .from('question_progress')
          .update({
            current_question_index: qIndex,
            answered: false,
            answer_text: null,
            answer_button: null,
            answered_at: null,
            phase: 'incubation',
            questions_read_count: 0,
          })
          .eq('id', progress.id);
      }

      if (qIndex > questions.length) continue;

      const { error: deliveryError } = await supabase
        .from('question_deliveries')
        .insert({
          user_id: userId,
          question_index: qIndex,
          delivered_at: now.toISOString(),
        });

      if (deliveryError) {
        console.error(`Failed to create delivery for ${userId}:`, deliveryError.message);
        continue;
      }

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
          data: { url: '/question', questionIndex: qIndex },
        }),
      });

      const result = await response.json();
      totalSent += result.sent || 0;
      console.log(`Sent to ${userId}: question ${qIndex}, result: ${JSON.stringify(result)}`);
    }

    return new Response(JSON.stringify({
      checked: romeTime,
      date: romeDate,
      users: allProgress.length,
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
