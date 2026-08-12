# Guia — Sincronizar os agendamentos com o Google Agenda do Nicolas

O texto que você colou parece vir de um template pensado para um produto
multiusuário ("cada pessoa do time conecta o próprio Google Agenda em
Configurações → Integrações"). O site do Nicolas é de **1 fotógrafo só** e
não tem painel de "Configurações", então simplifiquei para: **o Nicolas
autoriza o Google 1 vez, e todo agendamento novo vira um evento na
Agenda dele automaticamente.**

Arquitetura:

```
Site (booking) → grava em public.calendario (Supabase)
                        │
                        ▼
        Database Webhook do Supabase (INSERT em calendario)
                        │
                        ▼
     Edge Function "sync-google-calendar" (Supabase)
                        │
                        ▼
            Google Calendar API → cria o evento
```

---

## Passo 1 — Google Cloud Console
1. Acesse [console.cloud.google.com](https://console.cloud.google.com) com o
   e-mail que vai gerenciar isso (pode ser o do Google Workspace, se houver).
2. Seletor de projetos (topo) → **Novo projeto** → nome `Nicolas Fotografo`.
3. Menu **APIs e serviços → Biblioteca** → busque **Google Calendar API** →
   **Ativar**.

## Passo 2 — Tela de consentimento OAuth
1. **APIs e serviços → Tela de permissão OAuth**.
2. Tipo: **Externo**. Nome do app: `Nicolas Fotografo`. E-mail de contato: o seu.
3. Em **Escopos**, adicione:
   ```
   https://www.googleapis.com/auth/calendar.events
   ```
   (esse escopo permite criar/editar eventos, sem dar acesso a outras
   informações da conta Google).
4. Em **Usuários de teste** (enquanto o app não é publicado/verificado pelo
   Google), adicione o e-mail do Google Agenda do Nicolas — é a conta que
   vai autorizar e onde os eventos vão aparecer.

## Passo 3 — Credenciais OAuth
1. **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth**.
2. Tipo de aplicativo: **Aplicativo da Web**.
3. Em **URIs de redirecionamento autorizados**, cole exatamente (troque
   `SEU-PROJETO` pela referência do seu projeto Supabase, que você pega em
   Project Settings → API → Project URL):
   ```
   https://SEU-PROJETO.supabase.co/functions/v1/google-oauth-callback
   ```
4. Salve e copie o **Client ID** e o **Client secret**.

## Passo 4 — Deploy das Edge Functions no Supabase
1. Preencha o arquivo `supabase-functions/.env` com os valores reais:
   `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET` (do Passo 3) e
   `GOOGLE_OAUTH_REDIRECT_URI` (a URL de callback, trocando `SEU-PROJETO`
   pela referência do seu projeto Supabase).
2. No seu computador, com a [Supabase CLI](https://supabase.com/docs/guides/cli) instalada:

```bash
supabase login
supabase link --project-ref SEU-PROJETO

# Envia todos os segredos do .env de uma vez só
supabase secrets set --env-file supabase-functions/.env

# Deploy (arquivos em supabase-functions/ — copie para supabase/functions/ no seu repo)
supabase functions deploy google-oauth-callback --no-verify-jwt
supabase functions deploy sync-google-calendar --no-verify-jwt
```

> `--no-verify-jwt` é necessário porque quem chama essas duas functions é o
> Google (callback) e o próprio Supabase (webhook), não um usuário logado.
> `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` **não** precisam estar no
> `.env` — o Supabase já injeta as duas automaticamente dentro de toda
> Edge Function. O `supabase-functions/.env` também está no `.gitignore`
> — nunca commite ele com os valores reais.

## Passo 5 — O Nicolas autoriza o acesso (só uma vez)
Monte esta URL (troque `CLIENT_ID` e `SEU-PROJETO`) e mande para o Nicolas
abrir no navegador, logado com a conta Google que ele usa como agenda:

```
https://accounts.google.com/o/oauth2/v2/auth?
  client_id=CLIENT_ID&
  redirect_uri=https://SEU-PROJETO.supabase.co/functions/v1/google-oauth-callback&
  response_type=code&
  scope=https://www.googleapis.com/auth/calendar.events&
  access_type=offline&
  prompt=consent
```

Ele vai ver a tela de permissão do Google, clicar em **Permitir**, e cair
numa página simples dizendo "Conta do Google conectada com sucesso". Isso
significa que o token já foi salvo na tabela `google_calendar_tokens`.

`access_type=offline` + `prompt=consent` são o que garante que o Google
manda o `refresh_token` (necessário para a function renovar o acesso
sozinha depois — sem isso, o acesso expira em ~1h e para de funcionar).

## Passo 6 — Criar o Database Webhook
1. No painel do Supabase: **Database → Webhooks → Create a new hook**.
2. Nome: `sync-google-calendar`.
3. Tabela: `calendario`. Evento: **Insert**.
4. Tipo: **Supabase Edge Functions** → escolha a function `sync-google-calendar`.
5. Salve.

Pronto: a partir de agora, todo novo agendamento criado pelo site (via
`main.js`) dispara o webhook → a function pega/renova o token do Nicolas →
cria o evento na Agenda dele com nome do cliente, tipo de sessão, local e
horário.

## Testando
1. Faça um agendamento de teste pelo site.
2. Confira em **Table Editor → calendario** se a linha apareceu e se o
   campo `google_event_id` foi preenchido (pode levar alguns segundos).
3. Confira na Google Agenda do Nicolas se o evento apareceu.
4. Se `google_event_id` ficar vazio, veja os logs em **Edge Functions →
   sync-google-calendar → Logs** no painel do Supabase.

## Alternativa mais simples (sem escrever código)
Se preferir não mexer em Edge Functions, dá para fazer a mesma coisa com
**Zapier** ou **Make**: gatilho "novo registro no Supabase" (ou "webhook
recebido") → ação "criar evento no Google Calendar". É mais rápido de
configurar, mas depende de um serviço pago a partir de certo volume de
agendamentos por mês.
