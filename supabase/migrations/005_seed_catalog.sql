-- ════════════════════════════════════════════════════════════════
-- AVILEZ BURGUER — 005_seed_catalog.sql
-- Estrutura base do catálogo: as CATEGORIAS e os GRUPOS DE ADICIONAIS.
-- NÃO semeia produtos — o cardápio é a fonte oficial no Supabase e é
-- importado UMA VEZ por supabase/import/import-catalogo-real.sql.
-- Assim, um projeto novo começa com as categorias prontas e SEM produtos
-- (o site mostra cardápio vazio até você importar/cadastrar).
-- Rode DEPOIS do 004_seed.sql. Idempotente (on conflict do nothing/update).
-- ════════════════════════════════════════════════════════════════

-- Categorias (ids = slugs estáveis; ordem define a sequência das seções)
insert into categories (id, name, slug, sort_order, active, visible) values
  ('hamburgueres','Hambúrgueres','hamburgueres',0,true,true),
  ('combos','Combos','combos',1,true,true),
  ('bebidas','Bebidas','bebidas',2,true,true),
  ('porcoes','Porções','porcoes',3,true,true),
  ('kids','Kids','kids',4,true,true),
  ('outros','Outros','outros',5,true,true)
on conflict (id) do update set name = excluded.name, sort_order = excluded.sort_order;

-- Grupos de adicionais + adicionais (estrutura; produtos podem vinculá-los depois)
insert into addon_groups (id, name, max_choices, required, sort_order) values
  ('grp_extras','Extras',5,false,0),
  ('grp_queijos','Queijos',2,false,1),
  ('grp_molhos','Molhos',3,false,2)
on conflict (id) do update set name = excluded.name, max_choices = excluded.max_choices;

insert into addons (id, group_id, name, price, available, sort_order) values
  ('add_bacon','grp_extras','Bacon',6.00,true,0),
  ('add_cheddar','grp_queijos','Cheddar extra',5.00,true,1),
  ('add_onion','grp_extras','Cebola caramelizada',4.00,true,2),
  ('add_molho','grp_molhos','Molho da casa',3.00,true,3)
on conflict (id) do update set price = excluded.price, name = excluded.name;
