-- ════════════════════════════════════════════════════════════════
-- AVILEZ BURGUER — 010_order_reviews.sql   (INCREMENTAL / SEGURA)
--
-- Avaliação pós-pedido na tela de acompanhamento (público, por public_token).
--
-- A infraestrutura de avaliações JÁ EXISTE e NÃO é recriada aqui:
--   • tabela reviews com UNIQUE(order_id)  (001_schema)
--   • RPC submit_review(p_token,p_rating,p_comment) — valida token + pedido
--     ENTREGUE + ainda não avaliado, insere como 'pendente'  (003_functions)
--   • RLS: público só lê avaliações aprovadas; admin modera  (002_rls)
--
-- Esta migration adiciona SOMENTE uma função de LEITURA para o frontend saber,
-- por public_token, se o pedido já foi avaliado (para, no reload, mostrar o
-- agradecimento em vez do formulário). Ela revela apenas dois booleanos — não
-- expõe telefone, endereço, outros pedidos nem UUIDs internos.
--
-- Idempotente (create or replace). Não apaga nem altera dados. Rode UMA vez.
-- ════════════════════════════════════════════════════════════════

create or replace function order_review_status(p_token uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  o          orders%rowtype;
  v_reviewed boolean;
begin
  select * into o from orders where public_token = p_token;
  if not found then
    return jsonb_build_object('found', false, 'delivered', false, 'reviewed', false);
  end if;

  select exists (select 1 from reviews where order_id = o.id) into v_reviewed;

  return jsonb_build_object(
    'found', true,
    'delivered', (o.status = 'entregue'),
    'reviewed', v_reviewed
  );
end $$;

grant execute on function order_review_status(uuid) to anon, authenticated;
