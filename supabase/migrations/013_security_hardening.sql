-- ════════════════════════════════════════════════════════════════
-- AVILEZ BURGUER — 013_security_hardening.sql   (INCREMENTAL / SEGURA)
--
-- Endurecimento de segurança (auditoria). NÃO altera dados: só policies/grants.
-- Idempotente. Não dá DROP em tabela, não reseta, não toca no cardápio.
--
-- 1) app_settings: a leitura pública liberava TODAS as chaves, inclusive a
--    chave "admin" (que guarda nome/e-mail/foto do administrador). Agora o
--    público (anon) lê tudo MENOS a chave "admin". O admin autenticado continua
--    lendo tudo (via a policy de admin). A landing só usa business/hours/
--    landing/store — segue funcionando.
--
-- 2) consume_stock_for_order: é chamada só INTERNAMENTE por change_order_status
--    (que já exige is_admin()). O grant direto a anon/authenticated era
--    desnecessário e ampliava a superfície de ataque. Revogado — a chamada
--    interna continua funcionando (SECURITY DEFINER roda como dono da função).
-- ════════════════════════════════════════════════════════════════

-- 1) leitura pública de app_settings exclui a chave "admin"
drop policy if exists set_public_read on app_settings;
create policy set_public_read on app_settings
  for select using (key <> 'admin');
-- (a policy set_admin_write "for all using (is_admin())" já cobre a leitura da
--  chave "admin" pelo administrador autenticado.)

-- 2) remove o grant direto da função de baixa de estoque (uso é só interno)
revoke execute on function consume_stock_for_order(uuid) from anon, authenticated;
