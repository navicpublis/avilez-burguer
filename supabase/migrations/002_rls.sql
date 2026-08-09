-- ════════════════════════════════════════════════════════════════
-- AVILEZ BURGUER — 002_rls.sql
-- Row Level Security. Rode DEPOIS do 001_schema.sql.
--
-- Princípios:
--  • Público (anon) LÊ apenas o que o site precisa mostrar (cardápio,
--    bairros ativos, avaliações aprovadas, configurações, cupons p/ validar).
--  • Público NÃO altera catálogo/estoque/config e NÃO lê pedidos/clientes
--    de outras pessoas.
--  • O pedido do cliente é criado por uma FUNÇÃO SEGURA (RPC) no 003 —
--    por isso a tabela orders NÃO recebe INSERT direto para anon aqui.
--  • Admin autenticado (auth.uid() em admin_profiles.active) gerencia tudo.
-- ════════════════════════════════════════════════════════════════

-- helper: o usuário logado é um admin ativo?
create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from admin_profiles p
    where p.id = auth.uid() and p.active
  );
$$;

-- liga RLS em todas as tabelas
do $$
declare t text;
begin
  foreach t in array array[
    'categories','products','addon_groups','addons','product_addon_groups',
    'delivery_zones','customers','customer_addresses','coupons',
    'orders','order_items','order_item_addons','order_status_history',
    'ingredients','recipes','stock_movements','reviews','notes',
    'app_settings','admin_profiles'
  ] loop
    execute format('alter table %I enable row level security;', t);
  end loop;
end $$;

-- ── CATÁLOGO: público lê, admin gerencia ───────────────────────
-- (produtos: público vê só os não-ocultos; admin vê todos)
drop policy if exists cat_public_read on categories;
create policy cat_public_read on categories for select using (true);
drop policy if exists cat_admin_all on categories;
create policy cat_admin_all on categories for all using (is_admin()) with check (is_admin());

drop policy if exists prod_public_read on products;
create policy prod_public_read on products for select using (status <> 'oculto' or is_admin());
drop policy if exists prod_admin_all on products;
create policy prod_admin_all on products for all using (is_admin()) with check (is_admin());

drop policy if exists ag_public_read on addon_groups;
create policy ag_public_read on addon_groups for select using (true);
drop policy if exists ag_admin_all on addon_groups;
create policy ag_admin_all on addon_groups for all using (is_admin()) with check (is_admin());

drop policy if exists ad_public_read on addons;
create policy ad_public_read on addons for select using (true);
drop policy if exists ad_admin_all on addons;
create policy ad_admin_all on addons for all using (is_admin()) with check (is_admin());

drop policy if exists pag_public_read on product_addon_groups;
create policy pag_public_read on product_addon_groups for select using (true);
drop policy if exists pag_admin_all on product_addon_groups;
create policy pag_admin_all on product_addon_groups for all using (is_admin()) with check (is_admin());

-- ── BAIRROS: público lê só ativos; admin gerencia ──────────────
drop policy if exists dz_public_read on delivery_zones;
create policy dz_public_read on delivery_zones for select using (active or is_admin());
drop policy if exists dz_admin_all on delivery_zones;
create policy dz_admin_all on delivery_zones for all using (is_admin()) with check (is_admin());

-- ── CUPONS: público LÊ (para validar no cliente), admin gerencia
--    A validação crítica/atômica fica na RPC do 003; a leitura pública
--    permite feedback imediato mas não concede desconto sozinha.
drop policy if exists coup_public_read on coupons;
create policy coup_public_read on coupons for select using (active or is_admin());
drop policy if exists coup_admin_all on coupons;
create policy coup_admin_all on coupons for all using (is_admin()) with check (is_admin());

-- ── AVALIAÇÕES: público lê só aprovadas; admin gerencia ─────────
--    (o cliente cria avaliação via RPC no 003 — sem INSERT direto aqui)
drop policy if exists rev_public_read on reviews;
create policy rev_public_read on reviews for select using (status = 'aprovada' or is_admin());
drop policy if exists rev_admin_all on reviews;
create policy rev_admin_all on reviews for all using (is_admin()) with check (is_admin());

-- ── CONFIGURAÇÕES: público lê (site precisa), admin escreve ─────
drop policy if exists set_public_read on app_settings;
create policy set_public_read on app_settings for select using (true);
drop policy if exists set_admin_write on app_settings;
create policy set_admin_write on app_settings for all using (is_admin()) with check (is_admin());

-- ── PEDIDOS: SÓ admin lê/gerencia pela tabela ──────────────────
--    O cliente cria via RPC (003) e acompanha via RPC por public_token —
--    nunca lê a tabela orders direto. Nada de SELECT para anon aqui.
drop policy if exists ord_admin_all on orders;
create policy ord_admin_all on orders for all using (is_admin()) with check (is_admin());

drop policy if exists oi_admin_all on order_items;
create policy oi_admin_all on order_items for all using (is_admin()) with check (is_admin());

drop policy if exists oia_admin_all on order_item_addons;
create policy oia_admin_all on order_item_addons for all using (is_admin()) with check (is_admin());

drop policy if exists osh_admin_all on order_status_history;
create policy osh_admin_all on order_status_history for all using (is_admin()) with check (is_admin());

-- ── CLIENTES / ENDEREÇOS: só admin (criação vem por RPC) ───────
drop policy if exists cust_admin_all on customers;
create policy cust_admin_all on customers for all using (is_admin()) with check (is_admin());
drop policy if exists addr_admin_all on customer_addresses;
create policy addr_admin_all on customer_addresses for all using (is_admin()) with check (is_admin());

-- ── ESTOQUE: exclusivo do admin ────────────────────────────────
drop policy if exists ing_admin_all on ingredients;
create policy ing_admin_all on ingredients for all using (is_admin()) with check (is_admin());
drop policy if exists rec_admin_all on recipes;
create policy rec_admin_all on recipes for all using (is_admin()) with check (is_admin());
drop policy if exists mov_admin_all on stock_movements;
create policy mov_admin_all on stock_movements for all using (is_admin()) with check (is_admin());

-- ── ANOTAÇÕES: exclusivo do admin ──────────────────────────────
drop policy if exists note_admin_all on notes;
create policy note_admin_all on notes for all using (is_admin()) with check (is_admin());

-- ── PERFIL ADMIN: cada admin lê/edita o próprio; admin lê todos ─
drop policy if exists prof_read on admin_profiles;
create policy prof_read on admin_profiles for select using (auth.uid() = id or is_admin());
drop policy if exists prof_self_update on admin_profiles;
create policy prof_self_update on admin_profiles for update using (auth.uid() = id) with check (auth.uid() = id);
