// supabase/functions/sync-google-calendar/index.ts
//
// Chamada automaticamente por um Database Webhook do Supabase toda vez
// que uma linha é inserida em public.calendario. Cria o evento
// correspondente no Google Agenda do Nicolas e grava o google_event_id
// de volta na linha.
//
// Deploy: supabase functions deploy sync-google-calendar --no-verify-jwt
//
// Variáveis de ambiente necessárias:
//   GOOGLE_CALENDAR_CLIENT_ID
//   GOOGLE_CALENDAR_CLIENT_SECRET
//   SUPABASE_URL                (automática)
//   SUPABASE_SERVICE_ROLE_KEY   (automática)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

async function getAccessToken(): Promise<{ accessToken: string; calendarId: string } | null> {
  const { data: tokenRow } = await supabase
    .from('google_calendar_tokens')
    .select('*')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!tokenRow) return null;

  // Se o access_token ainda é válido (com 60s de folga), usa direto.
  if (new Date(tokenRow.expiry_date).getTime() - 60_000 > Date.now()) {
    return { accessToken: tokenRow.access_token, calendarId: tokenRow.calendar_id };
  }

  // Senão, usa o refresh_token para pegar um novo access_token.
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CALENDAR_CLIENT_SECRET')!,
      refresh_token: tokenRow.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  const data = await resp.json();
  if (!resp.ok) {
    console.error('Erro ao renovar token', data);
    return null;
  }

  const newExpiry = new Date(Date.now() + data.expires_in * 1000).toISOString();
  await supabase
    .from('google_calendar_tokens')
    .update({ access_token: data.access_token, expiry_date: newExpiry })
    .eq('id', tokenRow.id);

  return { accessToken: data.access_token, calendarId: tokenRow.calendar_id };
}

Deno.serve(async (req) => {
  const payload = await req.json();

  // Formato padrão de um Database Webhook do Supabase:
  // { type: "INSERT", table: "calendario", record: {...}, old_record: null }
  if (payload.type !== 'INSERT' || payload.table !== 'calendario') {
    return new Response('ignorado', { status: 200 });
  }

  const agendamento = payload.record;

  const auth = await getAccessToken();
  if (!auth) {
    console.error('Nenhuma conta Google conectada ainda (tabela google_calendar_tokens vazia).');
    return new Response('sem token', { status: 200 }); // 200 pra não travar o webhook em retry infinito
  }

  const inicio = new Date(`${agendamento.data_agendamento}T${agendamento.horario}`);
  const fim = new Date(inicio.getTime() + 60 * 60 * 1000); // duração padrão: 1h — ajuste se quiser

  const evento = {
    summary: `${agendamento.tiposessao} — ${agendamento.nome}`,
    location: agendamento.local,
    description:
      `Cliente: ${agendamento.nome}\n` +
      `WhatsApp: ${agendamento.telefone}\n` +
      `Tipo de sessão: ${agendamento.tiposessao}\n` +
      (agendamento.observacao ? `Observações: ${agendamento.observacao}\n` : '') +
      `\nCriado automaticamente pelo site.`,
    start: { dateTime: inicio.toISOString(), timeZone: 'America/Sao_Paulo' },
    end: { dateTime: fim.toISOString(), timeZone: 'America/Sao_Paulo' },
  };

  const resp = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(auth.calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(evento),
    }
  );

  const eventoCriado = await resp.json();

  if (!resp.ok) {
    console.error('Erro ao criar evento no Google Agenda', eventoCriado);
    return new Response('erro ao criar evento', { status: 200 });
  }

  await supabase
    .from('calendario')
    .update({ google_event_id: eventoCriado.id })
    .eq('id', agendamento.id);

  return new Response('ok', { status: 200 });
});
