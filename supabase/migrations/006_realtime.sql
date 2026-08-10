-- ════════════════════════════════════════════════════════════════
-- AVILEZ BURGUER — 006_realtime.sql
-- Habilita Realtime nas tabelas necessárias e cria o BROADCAST seguro
-- para o acompanhamento público (sem liberar SELECT de pedidos para anon).
-- Rode DEPOIS do 005_seed_catalog.sql.
--
-- Estratégia de segurança (item 12):
--  • Admin recebe mudanças de orders/order_status_history via postgres_changes
--    — o RLS já garante que só admin autenticado recebe (anon não recebe nada).
--  • Cliente público NÃO assina a tabela orders. Um gatilho emite um Broadcast
--    no tópico "order:<public_token>" (token = UUID impossível de adivinhar).
--    O cliente escuta só o próprio token e rebusca pela RPC get_order_by_token.
--  • app_settings tem SELECT público → cliente assina o status da loja direto.
-- ════════════════════════════════════════════════════════════════

-- 1) Habilita replicação/Realtime nas tabelas certas (idempotente)
do $$
begin
  if not exists (select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='orders') then
    alter publication supabase_realtime add table orders;
  end if;
  if not exists (select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='order_status_history') then
    alter publication supabase_realtime add table order_status_history;
  end if;
  if not exists (select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='app_settings') then
    alter publication supabase_realtime add table app_settings;
  end if;
  -- catálogo: site público reflete mudanças do Admin em tempo real
  if not exists (select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='categories') then
    alter publication supabase_realtime add table categories;
  end if;
  if not exists (select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='products') then
    alter publication supabase_realtime add table products;
  end if;
  if not exists (select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='addon_groups') then
    alter publication supabase_realtime add table addon_groups;
  end if;
  if not exists (select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='addons') then
    alter publication supabase_realtime add table addons;
  end if;
  if not exists (select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='product_addon_groups') then
    alter publication supabase_realtime add table product_addon_groups;
  end if;
end $$;

-- 2) Broadcast seguro por pedido (keyed pelo public_token)
--    Dispara quando o status muda: avisa o cliente que acompanha aquele token.
--    Payload mínimo (status) — o cliente rebusca os detalhes pela RPC segura.
create or replace function broadcast_order_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
    perform realtime.send(
      jsonb_build_object('status', NEW.status, 'at', now()),
      'status',                              -- nome do evento
      'order:' || NEW.public_token::text,    -- tópico (contém o token secreto)
      false                                  -- público: só recebe quem sabe o token
    );
  exception when others then
    -- se realtime.send não existir/indisponível, não quebra a transação do pedido
    null;
  end;
  return NEW;
end $$;

drop trigger if exists trg_broadcast_order on orders;
create trigger trg_broadcast_order
  after update of status on orders
  for each row execute function broadcast_order_change();

-- também emite no INSERT (recebido) — útil se o cliente abrir o link na hora
drop trigger if exists trg_broadcast_order_new on orders;
create trigger trg_broadcast_order_new
  after insert on orders
  for each row execute function broadcast_order_change();
