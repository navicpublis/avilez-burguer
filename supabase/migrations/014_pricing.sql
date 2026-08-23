-- ════════════════════════════════════════════════════════════════
-- AVILEZ BURGUER — 014_pricing.sql   (MÓDULO PRECIFICAÇÃO — FASE 1)
--
-- Cria a base do módulo de Precificação. É 100% ISOLADO: NÃO altera cardápio,
-- preços reais, produtos, pedidos, estoque, nem qualquer dado existente. Só
-- adiciona tabelas novas + RLS. Incremental, idempotente (if not exists /
-- create or replace / drop policy if exists). NÃO usa DROP TABLE/TRUNCATE/reset.
--
-- SEGURANÇA (crítico): custos, lucros e margens são PRIVADOS. Nenhuma leitura
-- pública. Todas as tabelas têm RLS restrita a is_admin() (admin autenticado e
-- ativo em admin_profiles) para SELECT/INSERT/UPDATE/DELETE. Reaproveita a
-- função is_admin() já existente (002_rls).
--
-- Vínculo pelo product_id (products.id é TEXT/slug). Ao apagar um produto, seu
-- perfil de precificação some junto (cascade) — NÃO mexe no produto em si.
-- ════════════════════════════════════════════════════════════════

-- 1) Perfil de precificação — 1 por produto (opcional; produto pode não ter) --
create table if not exists pricing_profiles (
  id                 uuid primary key default gen_random_uuid(),
  product_id         text not null unique references products(id) on delete cascade,
  -- venda considerada no cálculo (cópia editável; NÃO é o preço do cardápio).
  -- Quando null, o app usa o preço atual do produto só para exibir os cálculos.
  sale_price         numeric(10,2),
  -- margens (%) específicas deste produto; quando null, usa as de pricing_settings
  min_margin         numeric(5,2),
  target_margin      numeric(5,2),
  notes              text default '',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_pricing_profiles_product on pricing_profiles(product_id);

-- 2) Itens de custo de cada perfil (matéria-prima, embalagem, etc.) -----------
--    unit_kind define como o custo é medido; o app calcula o custo do uso.
--    Ex.: purchase_qty=1000 (g), purchase_price=30 (R$/kg em g), used_qty=150 (g)
--         → custo = 30 * (150/1000) = 4,50
do $$ begin
  if not exists (select 1 from pg_type where typname = 'pricing_unit_kind') then
    create type pricing_unit_kind as enum ('unidade','peso','volume','pacote','porcao');
  end if;
end $$;

create table if not exists pricing_cost_items (
  id                 uuid primary key default gen_random_uuid(),
  profile_id         uuid not null references pricing_profiles(id) on delete cascade,
  label              text not null default '',
  unit_kind          pricing_unit_kind not null default 'unidade',
  -- quantidade e preço da COMPRA (referência). Ex.: 1000 g por R$30.
  purchase_qty       numeric(12,3) not null default 1,
  purchase_price     numeric(12,2) not null default 0,
  -- quantidade USADA no produto (na mesma unidade base da compra).
  used_qty           numeric(12,3) not null default 0,
  unit_label         text default '',   -- rótulo livre p/ exibição (ex.: "g", "ml", "un")
  sort_order         integer not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_pricing_cost_items_profile on pricing_cost_items(profile_id);

-- 3) Configurações globais do módulo (linha única "default") ------------------
create table if not exists pricing_settings (
  id                 text primary key default 'default',
  default_min_margin    numeric(5,2) not null default 20,
  default_target_margin numeric(5,2) not null default 50,
  updated_at         timestamptz not null default now(),
  constraint pricing_settings_singleton check (id = 'default')
);
insert into pricing_settings (id) values ('default') on conflict (id) do nothing;

-- 4) Histórico (para a Fase 2; já deixamos a tabela criada e protegida) -------
create table if not exists pricing_history (
  id                 uuid primary key default gen_random_uuid(),
  product_id         text references products(id) on delete set null,
  sale_price         numeric(10,2),
  total_cost         numeric(12,2),
  margin_pct         numeric(6,2),
  markup             numeric(8,3),
  created_at         timestamptz not null default now()
);
create index if not exists idx_pricing_history_product on pricing_history(product_id);

-- 5) updated_at automático nas tabelas com essa coluna -----------------------
do $$
declare t text;
begin
  foreach t in array array['pricing_profiles','pricing_cost_items','pricing_settings'] loop
    execute format(
      'drop trigger if exists trg_%1$s_updated on %1$s;
       create trigger trg_%1$s_updated before update on %1$s
       for each row execute function set_updated_at();', t);
  end loop;
end $$;

-- 6) RLS — SOMENTE admin (is_admin). Sem leitura pública em NENHUMA tabela. ---
alter table pricing_profiles   enable row level security;
alter table pricing_cost_items enable row level security;
alter table pricing_settings   enable row level security;
alter table pricing_history    enable row level security;

drop policy if exists pricing_profiles_admin_all on pricing_profiles;
create policy pricing_profiles_admin_all on pricing_profiles
  for all using (is_admin()) with check (is_admin());

drop policy if exists pricing_cost_items_admin_all on pricing_cost_items;
create policy pricing_cost_items_admin_all on pricing_cost_items
  for all using (is_admin()) with check (is_admin());

drop policy if exists pricing_settings_admin_all on pricing_settings;
create policy pricing_settings_admin_all on pricing_settings
  for all using (is_admin()) with check (is_admin());

drop policy if exists pricing_history_admin_all on pricing_history;
create policy pricing_history_admin_all on pricing_history
  for all using (is_admin()) with check (is_admin());
