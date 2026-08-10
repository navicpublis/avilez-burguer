-- ════════════════════════════════════════════════════════════════
-- AVILEZ BURGUER — 012_delete_order_admin.sql   (INCREMENTAL / SEGURA)
--
-- Exclusão de pedido pelo ADMIN (para apagar pedidos de teste).
--
-- SEGURANÇA: RPC SECURITY DEFINER protegida por is_admin(). NÃO há UPDATE/DELETE
-- público em orders e a RLS permanece inalterada. Cliente/anon NÃO consegue
-- excluir (o grant é só para authenticated e a função exige admin ativo).
--
-- INTEGRIDADE (nada de erro de FK, nada de órfão): o schema já define o
-- comportamento correto ao apagar um pedido —
--   • order_items            → ON DELETE CASCADE   (some com o pedido)
--   • order_item_addons      → CASCADE via order_items
--   • order_status_history   → ON DELETE CASCADE
--   • coupon_usages          → ON DELETE CASCADE
--   • stock_movements.order_id → ON DELETE SET NULL (movimento PRESERVADO p/ auditoria)
--   • reviews.order_id         → ON DELETE SET NULL (avaliação PRESERVADA)
--
-- ESTOQUE: excluir o pedido NÃO devolve estoque nem re-baixa. A movimentação de
-- baixa (saida_automatica) é PRESERVADA (order_id vira null) — sem baixa dupla,
-- sem reversão silenciosa, com trilha de auditoria intacta.
--
-- Idempotente: se o pedido não existir, retorna ok=false sem erro. create or
-- replace → não apaga nada além do pedido solicitado. Rode UMA vez.
-- ════════════════════════════════════════════════════════════════

create or replace function delete_order_admin(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'NAO_AUTORIZADO';
  end if;

  if not exists (select 1 from orders where id = p_order_id) then
    return jsonb_build_object('ok', false, 'reason', 'nao_encontrado');
  end if;

  -- as relações-filhas são resolvidas pelas regras de FK (cascade / set null)
  delete from orders where id = p_order_id;

  return jsonb_build_object('ok', true);
end $$;

-- acesso só a usuários autenticados; is_admin() garante que é admin ativo.
revoke all on function delete_order_admin(uuid) from public, anon;
grant execute on function delete_order_admin(uuid) to authenticated;
