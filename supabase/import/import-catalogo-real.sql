-- ════════════════════════════════════════════════════════════════
-- AVILEZ BURGUER — import-catalogo-real.sql  (IMPORTAÇÃO ÚNICA)
-- Cadastra o cardápio real (47 itens) no Supabase.
--
-- >>> ESTE ARQUIVO NÃO É UMA MIGRATION <<<
-- Ele NÃO roda automaticamente e NÃO fica em supabase/migrations/.
-- Rode UMA ÚNICA VEZ, manualmente, no SQL Editor do Supabase, DEPOIS de
-- já ter rodado as migrations 001→008.
--
-- Seguro para rodar de novo: usa "on conflict (id) do nothing" (id = slug
-- determinístico). Não duplica e NÃO sobrescreve edições feitas no Admin.
-- Se você apagar um produto pelo Admin, ele CONTINUA apagado (este script
-- não roda sozinho). Descrição e imagem entram vazias — edite no Admin.
-- ════════════════════════════════════════════════════════════════

-- garante as categorias (caso ainda não existam)
insert into categories (id, name, slug, sort_order, active, visible) values
  ('hamburgueres','Hambúrgueres','hamburgueres',0,true,true),
  ('combos','Combos','combos',1,true,true),
  ('bebidas','Bebidas','bebidas',2,true,true),
  ('porcoes','Porções','porcoes',3,true,true),
  ('kids','Kids','kids',4,true,true),
  ('outros','Outros','outros',5,true,true)
on conflict (id) do nothing;

-- os 47 produtos (classificados por nome; descrição/imagem vazias)
insert into products
  (id, category_id, name, price, status, active, available, sort_order)
values
  ('prod-guarana-1l-zero','bebidas','Guaraná 1L ZERO',10.00,'disponivel',true,true,0),
  ('prod-cerveja-latao-amstel','bebidas','Cerveja Latão Amstel',8.00,'disponivel',true,true,1),
  ('prod-cerveja-latao-heineken','bebidas','Cerveja Latão Heineken',10.00,'disponivel',true,true,2),
  ('prod-pizza-30cm-pre-assada','outros','Pizza 30cm - PRÉ ASSADA',20.00,'disponivel',true,true,3),
  ('prod-avilez-classico','hamburgueres','Avilez Clássico',17.90,'disponivel',true,true,4),
  ('prod-guarana-de-1l','bebidas','Guaraná de 1L',10.00,'disponivel',true,true,5),
  ('prod-fanta-laranja','bebidas','Fanta laranja',7.00,'disponivel',true,true,6),
  ('prod-combo-do-dia-avilez-burguer','combos','Combo do Dia - Avilez Burguer',29.90,'disponivel',true,true,7),
  ('prod-guarana-lata-zero','bebidas','Guaraná Lata Zero',7.00,'disponivel',true,true,8),
  ('prod-coca-cola-lata-zero','bebidas','Coca Cola Lata Zero',7.00,'disponivel',true,true,9),
  ('prod-combo-duplo-domingou','combos','Combo Duplo Domingou',79.90,'disponivel',true,true,10),
  ('prod-combo-artilheiro','combos','Combo Artilheiro',34.90,'disponivel',true,true,11),
  ('prod-romeu-e-julieta-burguer','hamburgueres','Romeu e Julieta Burguer',36.90,'disponivel',true,true,12),
  ('prod-combo-da-semana','combos','Combo da Semana',72.90,'disponivel',true,true,13),
  ('prod-x-picanha','hamburgueres','X-Picanha',23.90,'disponivel',true,true,14),
  ('prod-artilheiro-burguer','hamburgueres','Artilheiro Burguer',26.90,'disponivel',true,true,15),
  ('prod-molho-artesanal-soul-pimenta-abacaxi-520g','outros','Molho Artesanal Soul Pimenta - Abacaxi (520g)',28.90,'disponivel',true,true,16),
  ('prod-x-burguer-tradicional','hamburgueres','X-Burguer Tradicional',10.00,'disponivel',true,true,17),
  ('prod-promocao-do-dia','combos','Promoção do Dia',49.90,'disponivel',true,true,18),
  ('prod-combo-na-caixa-best-friend','combos','Combo na Caixa Best Friend',79.90,'disponivel',true,true,19),
  ('prod-bruto-costela','hamburgueres','Bruto Costela',39.90,'disponivel',true,true,20),
  ('prod-tropical-picante','hamburgueres','Tropical Picante',39.90,'disponivel',true,true,21),
  ('prod-batata-p','porcoes','Batata P',20.00,'disponivel',true,true,22),
  ('prod-piscininha-de-cheddar','porcoes','Piscininha de Cheddar',38.00,'disponivel',true,true,23),
  ('prod-acai-de-garrafa','bebidas','Açaí de Garrafa',15.00,'disponivel',true,true,24),
  ('prod-combo-kids-carne-ou-frango-crocante','kids','Combo Kids - Carne ou Frango Crocante',24.90,'disponivel',true,true,25),
  ('prod-combo-chicken-burguer','combos','Combo Chicken Burguer',37.00,'disponivel',true,true,26),
  ('prod-combo-x-tudo-duplo','combos','Combo X Tudo Duplo',34.00,'disponivel',true,true,27),
  ('prod-combo-x-tudo-tradicional','combos','Combo X-Tudo Tradicional',30.00,'disponivel',true,true,28),
  ('prod-combo-avilez-burguer','combos','Combo Avilez Burguer',37.00,'disponivel',true,true,29),
  ('prod-combo-doritos-burguer','combos','Combo Doritos Burguer',47.00,'disponivel',true,true,30),
  ('prod-combo-duplo-cheddar-bacon','combos','Combo Duplo Cheddar Bacon',42.00,'disponivel',true,true,31),
  ('prod-combo-cheddar-bacon','combos','Combo Cheddar Bacon',37.00,'disponivel',true,true,32),
  ('prod-coca-cola-zero-2l','bebidas','Coca Cola Zero 2L',15.00,'disponivel',true,true,33),
  ('prod-coca-cola-2l','bebidas','Coca Cola 2L',15.00,'disponivel',true,true,34),
  ('prod-x-tudo-duplo','hamburgueres','X Tudo Duplo',22.00,'disponivel',true,true,35),
  ('prod-duplo-cheddar-bacon','hamburgueres','Duplo Cheddar Bacon',30.00,'disponivel',true,true,36),
  ('prod-coca-cola-lata-normal','bebidas','Coca Cola Lata Normal',7.00,'disponivel',true,true,37),
  ('prod-guarana-antarctica-lata','bebidas','Guaraná Antarctica Lata',7.00,'disponivel',true,true,38),
  ('prod-doritos-burguer','hamburgueres','Doritos Burguer',35.00,'disponivel',true,true,39),
  ('prod-batata-da-casa-m','porcoes','Batata da Casa - M',25.00,'disponivel',true,true,40),
  ('prod-chicken-burguer','hamburgueres','Chicken Burguer',25.00,'disponivel',true,true,41),
  ('prod-x-tudo-tradicional','hamburgueres','X Tudo Tradicional',18.00,'disponivel',true,true,42),
  ('prod-batata-da-casa-g','porcoes','Batata da Casa - G',28.00,'disponivel',true,true,43),
  ('prod-avilez-burguer','hamburgueres','Avilez Burguer',25.00,'disponivel',true,true,44),
  ('prod-cheddar-bacon','hamburgueres','Cheddar Bacon',25.00,'disponivel',true,true,45),
  ('prod-guarana-natural','bebidas','Guaraná Natural',3.00,'disponivel',true,true,46)
on conflict (id) do nothing;
