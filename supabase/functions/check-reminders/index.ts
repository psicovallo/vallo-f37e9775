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

  if (endMinutes <= startMinutes || count < 2) return [];

  const fmt = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const times: Set<string> = new Set();

  const firstEnd = Math.min(startMinutes + 60, endMinutes);
  times.add(fmt(startMinutes + Math.floor(Math.random() * (firstEnd - startMinutes))));

  const lastStart = Math.max(endMinutes - 60, startMinutes);
  times.add(fmt(lastStart + Math.floor(Math.random() * (endMinutes - lastStart))));

  let attempts = 0;
  while (times.size < count && attempts < 200) {
    const randomMin = startMinutes + Math.floor(Math.random() * (endMinutes - startMinutes));
    times.add(fmt(randomMin));
    attempts++;
  }

  return [...times].sort();
}

async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data: Record<string, string>,
) {
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
      data,
    }),
  });

  const resultText = await response.text();
  let result: { sent?: number } = {};

  try {
    result = JSON.parse(resultText);
  } catch {
    console.error(`Invalid push response for ${userId}:`, resultText);
  }

  if (!response.ok) {
    console.error(`Push failed for ${userId}:`, resultText);
  }

  return {
    response,
    sent: Number(result.sent || 0),
  };
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

    const { data: allProgress, error: progressError } = await supabase
      .from('question_progress')
      .select('*')
      .eq('onboarding_completed', true);

    if (progressError) throw progressError;

    let totalSent = 0;
    let reminderSent = 0;

    for (const progress of allProgress || []) {
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

      const { data: assignments } = await supabase
        .from('question_assignments')
        .select('*')
        .eq('user_id', userId)
        .neq('status', 'risolta')
        .order('sort_order', { ascending: true })
        .limit(1);

      if (!assignments?.length) continue;

      const assignment = assignments[0];

      const { data: todayDeliveries } = await supabase
        .from('question_deliveries')
        .select('id')
        .eq('user_id', userId)
        .eq('question_index', assignment.sort_order)
        .eq('read_completed', true)
        .gte('delivered_at', `${romeDate}T00:00:00`)
        .lte('delivered_at', `${romeDate}T23:59:59`);

      if ((todayDeliveries?.length || 0) >= 2) continue;

      await supabase
        .from('question_deliveries')
        .update({ read_completed: true, read_at: now.toISOString() })
        .eq('user_id', userId)
        .eq('read_completed', false)
        .lt('delivered_at', `${romeDate}T00:00:00`);

      const { data: pendingDelivery } = await supabase
        .from('question_deliveries')
        .select('id')
        .eq('user_id', userId)
        .eq('question_index', assignment.sort_order)
        .eq('read_completed', false)
        .gte('delivered_at', `${romeDate}T00:00:00`)
        .lte('delivered_at', `${romeDate}T23:59:59`)
        .limit(1)
        .maybeSingle();

      if (!pendingDelivery) {
        await supabase.from('question_deliveries').insert({
          user_id: userId,
          question_index: assignment.sort_order,
          delivered_at: now.toISOString(),
        });
      } else {
        console.log(`Resending pending question ${assignment.sort_order} to ${userId}`);
      }

      const title = `🔥 Domanda ${assignment.sort_order}`;
      const body = assignment.question_text.slice(0, 100) + (assignment.question_text.length > 100 ? '...' : '');
      const pushResult = await sendPushNotification(userId, title, body, { url: '/question' });

      totalSent += pushResult.sent;
      console.log(`Question push for ${userId}: status=${pushResult.response.status} sent=${pushResult.sent}`);
    }

    const { data: scheduledReminders, error: remindersError } = await supabase
      .from('reminders')
      .select('id, user_id, text')
      .eq('active', true)
      .contains('times', [romeTime]);

    if (remindersError) throw remindersError;

    for (const reminder of scheduledReminders || []) {
      const pushResult = await sendPushNotification(
        reminder.user_id,
        '⏰ Promemoria',
        reminder.text,
        { url: '/reminders' }
      );

      reminderSent += pushResult.sent;
      console.log(`Reminder push for ${reminder.user_id}: status=${pushResult.response.status} sent=${pushResult.sent}`);
    }

    return new Response(JSON.stringify({
      checked: romeTime,
      date: romeDate,
      users: allProgress?.length || 0,
      sent: totalSent + reminderSent,
      question_sent: totalSent,
      reminder_sent: reminderSent,
      reminders_checked: scheduledReminders?.length || 0,
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