-- ════════════════════════════════════════════════════════════════
-- AVILEZ BURGUER — 005_seed_catalog.sql  (cardápio REAL — do menu-data)
-- Rode DEPOIS do 004_seed.sql. Gerado a partir do cardápio atual do app,
-- então nomes/preços/categorias/disponibilidade batem 1:1 com o site.
-- Idempotente: on conflict (id) do update. ids = slugs estáveis usados
-- também pelo carrinho/landing (não usar UUID aqui).
-- ════════════════════════════════════════════════════════════════

insert into categories (id, name, slug, sort_order, active, visible) values
  ('hamburgueres','Hambúrgueres','hamburgueres',0,true,true),
  ('combos','Combos','combos',1,true,true),
  ('bebidas','Bebidas','bebidas',2,true,true),
  ('sobremesas','Sobremesas','sobremesas',3,true,true),
  ('kids','Kids','kids',4,true,true),
  ('molhos','Molhos','molhos',5,true,true)
on conflict (id) do update set name=excluded.name, sort_order=excluded.sort_order;

insert into addon_groups (id, name, max_choices, required, sort_order) values
  ('grp_extras','Extras',5,false,0),
  ('grp_queijos','Queijos',2,false,1),
  ('grp_molhos','Molhos',3,false,2)
on conflict (id) do update set name=excluded.name, max_choices=excluded.max_choices;

insert into addons (id, group_id, name, price, available, sort_order) values
  ('add_bacon','grp_extras','Bacon',6.00,true,0),
  ('add_cheddar','grp_queijos','Cheddar extra',5.00,true,1),
  ('add_onion','grp_extras','Onion Rings',8.00,true,2),
  ('add_molho','grp_molhos','Molho Especial',3.00,true,3)
on conflict (id) do update set price=excluded.price, name=excluded.name;

insert into products (id, category_id, name, short_description, description, price, promotional_price, status, active, available, featured, best_seller, new_product, promo, limited, preparation_time, ingredients, sort_order) values
  ('classico','hamburgueres','Avilez Clássico','Blend 160g na chapa, cheddar, alface, tomate e maionese da casa no pão brioche.','Blend 160g na chapa, cheddar, alface, tomate e maionese da casa no pão brioche.',27.90,null,'disponivel',true,true,false,false,false,false,false,20,'{"Pão brioche, Blend bovino 160g, Cheddar, Alface, Tomate, Maionese da casa"}',0),
  ('duplo','hamburgueres','Duplo Cheddar','Dois blends na chapa, cheddar duplo cremoso e cebola caramelizada.','Dois blends na chapa, cheddar duplo cremoso e cebola caramelizada.',34.90,null,'disponivel',true,true,false,false,false,false,false,20,'{"Pão brioche, 2x Blend bovino 160g, Cheddar duplo, Cebola caramelizada"}',1),
  ('salada','hamburgueres','Salada da Casa','Blend na chapa, alface americana, tomate, cebola roxa e picles.','Blend na chapa, alface americana, tomate, cebola roxa e picles.',29.90,null,'disponivel',true,true,false,false,false,false,false,20,'{"Pão brioche, Blend bovino 160g, Alface americana, Tomate, Cebola roxa, Picles"}',2),
  ('bacon','hamburgueres','Bacon Supremo','Blend na chapa, bacon crocante, cheddar e molho barbecue da casa.','Blend na chapa, bacon crocante, cheddar e molho barbecue da casa.',36.90,null,'disponivel',true,true,false,false,false,false,false,20,'{"Pão brioche, Blend bovino 160g, Bacon crocante, Cheddar, Molho barbecue da casa"}',3),
  ('combo-classico','combos','Combo Clássico','Avilez Clássico + batata rústica + refrigerante lata.','Avilez Clássico + batata rústica + refrigerante lata.',49.80,39.90,'disponivel',true,true,false,false,false,false,false,20,'{"Avilez Clássico, Batata rústica, Refrigerante lata 350ml"}',4),
  ('combo-duplo','combos','Combo Duplo','Duplo Cheddar + batata + refrigerante. Perfeito pra fome grande.','Duplo Cheddar + batata + refrigerante. Perfeito pra fome grande.',57.80,46.90,'disponivel',true,true,false,false,false,false,false,20,'{"Duplo Cheddar, Batata rústica, Refrigerante lata 350ml"}',5),
  ('combo-dois','combos','Combo a Dois','2 hambúrgueres + 2 batatas + 2 bebidas. Ideal pra dividir.','2 hambúrgueres + 2 batatas + 2 bebidas. Ideal pra dividir.',99.60,84.90,'disponivel',true,true,false,false,false,false,false,20,'{"2 Hambúrgueres, 2 Batatas rústicas, 2 Bebidas"}',6),
  ('refri','bebidas','Refrigerante Lata','Coca-Cola, Guaraná ou Fanta • 350ml','Coca-Cola, Guaraná ou Fanta • 350ml',6.90,null,'disponivel',true,true,false,false,false,false,false,5,'{"Lata 350ml, gelada"}',7),
  ('suco','bebidas','Suco Natural','Laranja, maracujá ou limão • 400ml','Laranja, maracujá ou limão • 400ml',9.90,null,'disponivel',true,true,false,false,false,false,false,5,'{"Fruta natural, 400ml"}',8),
  ('agua','bebidas','Água Mineral','Com ou sem gás • 500ml','Com ou sem gás • 500ml',4.90,null,'disponivel',true,true,false,false,false,false,false,5,'{"500ml"}',9),
  ('cerveja','bebidas','Cerveja Long Neck','Gelada • 355ml','Gelada • 355ml',10.90,null,'em_falta',true,false,false,false,false,false,false,5,'{"Long neck 355ml"}',10),
  ('brownie','sobremesas','Brownie na Chapa','Brownie quente com sorvete de creme e calda.','Brownie quente com sorvete de creme e calda.',18.90,null,'disponivel',true,true,false,false,false,false,false,5,'{"Brownie, Sorvete de creme, Calda"}',11),
  ('milkshake','sobremesas','Milkshake','Chocolate, morango ou ovomaltine • 400ml','Chocolate, morango ou ovomaltine • 400ml',16.90,null,'disponivel',true,true,false,false,false,false,false,5,'{"400ml, Sabor à escolha"}',12),
  ('petit','sobremesas','Petit Gâteau','Bolo quente de chocolate com sorvete.','Bolo quente de chocolate com sorvete.',19.90,null,'disponivel',true,true,false,false,false,false,false,5,'{"Bolo de chocolate, Sorvete"}',13)
on conflict (id) do update set category_id=excluded.category_id, name=excluded.name, price=excluded.price, promotional_price=excluded.promotional_price, status=excluded.status, available=excluded.available, sort_order=excluded.sort_order;

insert into product_addon_groups (product_id, group_id) values
  ('classico','grp_extras'),
  ('classico','grp_queijos'),
  ('classico','grp_molhos'),
  ('duplo','grp_extras'),
  ('duplo','grp_queijos'),
  ('duplo','grp_molhos'),
  ('salada','grp_extras'),
  ('salada','grp_queijos'),
  ('salada','grp_molhos'),
  ('bacon','grp_extras'),
  ('bacon','grp_queijos'),
  ('bacon','grp_molhos'),
  ('combo-classico','grp_extras'),
  ('combo-classico','grp_queijos'),
  ('combo-classico','grp_molhos'),
  ('combo-duplo','grp_extras'),
  ('combo-duplo','grp_queijos'),
  ('combo-duplo','grp_molhos'),
  ('combo-dois','grp_extras'),
  ('combo-dois','grp_queijos'),
  ('combo-dois','grp_molhos')
on conflict do nothing;
