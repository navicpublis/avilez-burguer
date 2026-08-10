-- ════════════════════════════════════════════════════════════════
-- AVILEZ BURGUER — 011_confirm_order_received.sql   (INCREMENTAL / SEGURA)
--
-- Permite que o PRÓPRIO CLIENTE confirme o recebimento na tela de
-- acompanhamento (público, por public_token), passando o pedido de
-- "saiu para entrega" (enum 'entrega') para "entregue".
--
-- SEGURANÇA: não existe UPDATE público em orders. Esta RPC é SECURITY DEFINER
-- e é o ÚNICO poder do cliente sobre o pedido — e SOMENTE a transição
-- 'entrega' → 'entregue'. Ela NÃO deixa escolher status, voltar status,
-- alterar outro pedido, preço, itens, endereço, pagamento ou dados do cliente.
-- A RLS de orders permanece inalterada.
--
-- Reaproveita o que já existe: grava delivered_at (mesmo timestamp usado pelo
-- Admin) e registra a mudança em order_status_history. O trigger de realtime
-- (after update of status on orders) já dispara sozinho → acompanhamento e
-- Admin refletem sem F5. O Admin continua podendo marcar entregue normalmente
-- (via change_order_status) — as duas formas levam ao mesmo status final.
--
-- Idempotente: se já estiver 'entregue', devolve o estado atual sem novo
-- histórico e sem erro (blindagem contra duplo clique / reload). Usa FOR UPDATE
-- para serializar chamadas concorrentes.
--
-- create or replace → não apaga nada. Rode UMA vez no SQL Editor.
-- ════════════════════════════════════════════════════════════════

create or replace function confirm_order_received(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  o orders%rowtype;
begin
  select * into o from orders where public_token = p_token for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'nao_encontrado');
  end if;

  -- idempotente: já entregue → devolve o estado atual, sem novo histórico
  if o.status = 'entregue' then
    return jsonb_build_object('ok', true, 'status', 'entregue', 'already', true);
  end if;

  -- só permite a transição saiu-para-entrega ('entrega') → 'entregue'
  if o.status <> 'entrega' then
    raise exception 'STATUS_INVALIDO';
  end if;

  update orders
     set status = 'entregue',
         delivered_at = coalesce(delivered_at, now())
   where id = o.id;

  -- registra no histórico existente (changed_by null = confirmação do cliente)
  insert into order_status_history(order_id, previous_status, new_status, changed_by)
  values (o.id, o.status, 'entregue', null);

  return jsonb_build_object('ok', true, 'status', 'entregue', 'already', false);
end $$;

grant execute on function confirm_order_received(uuid) to anon, authenticated;
