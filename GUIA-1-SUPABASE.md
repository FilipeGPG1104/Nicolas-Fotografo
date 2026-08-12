# Guia — Configurar o Supabase do site do Nicolas

## Passo 1 — Criar o projeto
1. Acesse [supabase.com](https://supabase.com) e faça login (ou crie uma conta).
2. **New project** → escolha uma organização → nome sugerido: `nicolas-fotografo`.
3. Defina uma senha do banco (guarde em local seguro) e a região **South America (São Paulo)**.
4. Aguarde ~2 min até o projeto ficar pronto.

## Passo 2 — Rodar o SQL
1. No menu lateral, abra **SQL Editor**.
2. Clique em **New query**.
3. Cole todo o conteúdo do arquivo `01_supabase_setup.sql` (anexo).
4. Clique em **Run**. Deve aparecer "Success. No rows returned".
5. Confira em **Table Editor** se apareceram as tabelas `clientes` e `calendario`.

> Se você já tinha rodado uma versão anterior deste SQL (com a tabela
> `google_calendar_tokens` e a coluna `google_event_id`), rode também o
> arquivo `02_atualizacoes.sql` — ele remove o que não é mais usado e
> corrige uma policy que faltava (leitura pública dos horários ocupados,
> necessária pro calendário do site funcionar).

## Passo 3 — Pegar a URL e a chave pública (anon key)
1. No menu lateral, vá em **Project Settings** (ícone de engrenagem) → **API**.
2. Copie o campo **Project URL** → cole no arquivo `.env` (raiz do projeto), na variável `SUPABASE_URL`.
3. Copie o campo **anon public** (em "Project API keys") → cole no `.env`, na variável `SUPABASE_ANON_KEY`.
4. Copie também o **service_role** (secret) → cole em `SUPABASE_SERVICE_ROLE_KEY` no `.env` (fica só de referência local; **nunca** vai para o front-end nem para a Vercel).

> O front-end não lê o `.env` diretamente (navegador não tem acesso a
> arquivos do servidor). Quem lê essas variáveis é a função
> `api/config.js`, que roda na Vercel e devolve só `SUPABASE_URL` e
> `SUPABASE_ANON_KEY` para o site — por isso o próximo passo é cadastrar
> essas duas na Vercel.

## Passo 3.1 — Cadastrar as variáveis na Vercel
1. No painel da Vercel, abra o projeto → **Settings → Environment Variables**.
2. Adicione `SUPABASE_URL` e `SUPABASE_ANON_KEY` com os mesmos valores do seu `.env`
   (pode colar o `.env` inteiro de uma vez — a Vercel tem um campo "paste .env" nessa tela).
3. Marque para os ambientes **Production**, **Preview** e **Development**.
4. Faça um novo deploy (ou "Redeploy") para as variáveis entrarem em vigor.
5. Confira testando `https://SEU-SITE.vercel.app/api/config` no navegador —
   deve responder um JSON com `supabaseUrl` e `supabaseAnonKey`.

> O `.env` na raiz do projeto **não deve ser commitado no Git** (já está
> no `.gitignore`). Use o `.env.example` como referência do que precisa
> ser preenchido.

## Passo 4 — Criar um usuário admin (para ver o painel depois)
1. Menu **Authentication** → **Users** → **Add user**.
2. Crie com seu e-mail e uma senha. Esse é o login que poderá ler/editar
   `clientes` e `calendario` (as policies "authenticated" do SQL liberam
   isso só pra quem estiver logado).

## Passo 5 — Publicar os arquivos do site
Substitua no seu projeto (repositório conectado à Vercel) os arquivos:
- `index.html` (novo — carrega o SDK do Supabase)
- `main.js` (novo — agora grava o agendamento no banco, busca a config em `/api/config` e abre o WhatsApp)
- `api/config.js` (novo — função serverless da Vercel que expõe `SUPABASE_URL`/`SUPABASE_ANON_KEY` a partir das env vars)
- `style.css` (pequeno ajuste visual para horário ocupado)
- `.env.example` (documentação de quais variáveis existem — pode commitar)
- `.gitignore` (garante que o `.env` real nunca vá pro Git)

Preencha o `.env` local com os valores reais (Passo 3) e cadastre as
mesmas duas variáveis na Vercel (Passo 3.1).

Depois disso, todo agendamento feito no site vai:
1. Criar/achar o cliente em `clientes`;
2. Criar a linha em `calendario` com `status = 'pendente'`;
3. Abrir o WhatsApp do visitante já com a mensagem pronta (nome, telefone,
   tipo de sessão, local, data e horário) para ele mandar pro Nicolas
   confirmar. Não precisa de nenhuma API do WhatsApp nem custo extra —
   é o link `wa.me` padrão.

## Observação importante sobre o site atual
No arquivo `main.js` original que veio no seu zip, o botão "Enviar pedido
de agendamento" montava a mensagem do WhatsApp mas **não fazia nada com
ela** (não salvava no banco, não abria o WhatsApp). Corrigi isso.

**Lembre de trocar o número em `main.js`** — a constante `WHATSAPP_NUMERO`
está com um número de exemplo (`5511999999999`); troque pelo WhatsApp real
do Nicolas antes de publicar.
