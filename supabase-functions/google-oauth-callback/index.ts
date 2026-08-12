// supabase/functions/google-oauth-callback/index.ts
//
// Rota de callback do OAuth do Google. O Nicolas acessa a URL de
// autorização (ver GUIA-GOOGLE-CALENDAR.md), autoriza o acesso ao
// Google Agenda dele, e o Google redireciona para ESTA função com
// um "?code=...". Aqui a função troca esse code por access_token +
// refresh_token e salva na tabela google_calendar_tokens.
//
// Deploy: supabase functions deploy google-oauth-callback --no-verify-jwt
//
// Variáveis de ambiente necessárias (supabase secrets set ...):
//   GOOGLE_CALENDAR_CLIENT_ID
//   GOOGLE_CALENDAR_CLIENT_SECRET
//   GOOGLE_OAUTH_REDIRECT_URI   (a mesma URL desta função, https://xxxx.supabase.co/functions/v1/google-oauth-callback)
//   SUPABASE_URL                (já vem pronta no ambiente da função)
//   SUPABASE_SERVICE_ROLE_KEY   (já vem pronta no ambiente da função)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return new Response('Faltou o parâmetro "code" — inicie o fluxo pela URL de autorização.', { status: 400 });
  }

  const clientId = Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID')!;
  const clientSecret = Deno.env.get('GOOGLE_CALENDAR_CLIENT_SECRET')!;
  const redirectUri = Deno.env.get('GOOGLE_OAUTH_REDIRECT_URI')!;

  // Troca o "code" por tokens
  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const tokenData = await tokenResp.json();

  if (!tokenResp.ok) {
    console.error('Erro ao trocar code por token', tokenData);
    return new Response('Falha ao autorizar com o Google. Veja os logs da função.', { status: 500 });
  }

  // Descobre o e-mail da conta autorizada (só para exibir/registrar)
  const userInfoResp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const userInfo = await userInfoResp.json();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const expiryDate = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

  // Apaga token antigo (se houver) e salva o novo — assume 1 fotógrafo só.
  await supabase.from('google_calendar_tokens').delete().neq('id', 0);

  const { error } = await supabase.from('google_calendar_tokens').insert({
    conta_email: userInfo.email ?? 'desconhecido',
    calendar_id: 'primary',
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token, // só vem na 1ª autorização (por isso o prompt=consent na URL de início)
    expiry_date: expiryDate,
  });

  if (error) {
    console.error(error);
    return new Response('Autorizado, mas falhou ao salvar no banco: ' + error.message, { status: 500 });
  }

  return new Response(
    `Conta do Google conectada com sucesso (${userInfo.email}). Pode fechar esta aba.`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
  );
});
