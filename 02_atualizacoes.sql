-- =========================================================
-- ATUALIZAÇÕES — rode isso se você já tinha executado uma versão
-- anterior do 01_supabase_setup.sql no seu projeto Supabase.
-- =========================================================

-- 1) Remove o que era exclusivo da integração com Google Calendar
--    (não é mais usada — agora o site manda a mensagem direto pelo
--    WhatsApp do visitante via link wa.me).
DROP TABLE IF EXISTS public.google_calendar_tokens;
ALTER TABLE public.calendario DROP COLUMN IF EXISTS google_event_id;

-- 2) Libera para o visitante (anon) LER data/horário dos agendamentos
--    já existentes — sem isso, o calendário do site não consegue saber
--    quais horários estão ocupados (a policy anterior só liberava
--    leitura para usuário logado).
DROP POLICY IF EXISTS "publico pode ver horarios ocupados" ON public.calendario;
CREATE POLICY "publico pode ver horarios ocupados"
ON public.calendario
FOR SELECT
TO anon
USING (true);
