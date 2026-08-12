// api/config.js
//
// Função serverless da Vercel. Lê as variáveis de ambiente do projeto
// (Vercel → Settings → Environment Variables, preenchidas a partir do
// .env — veja GUIA-1-SUPABASE.md) e devolve só o que o navegador
// precisa: a URL do Supabase e a "anon key" (chave pública).
//
// A SUPABASE_SERVICE_ROLE_KEY e as credenciais do Google NUNCA passam
// por aqui — ficam só no lado do servidor (Edge Functions do Supabase).

export default function handler(req, res) {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    res.status(500).json({ error: 'Variáveis SUPABASE_URL / SUPABASE_ANON_KEY não configuradas na Vercel.' });
    return;
  }

  // Cache leve no CDN da Vercel — esses valores não mudam a cada request.
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).json({
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: SUPABASE_ANON_KEY,
  });
}
