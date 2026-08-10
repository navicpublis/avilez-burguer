-- ════════════════════════════════════════════════════════════════
-- AVILEZ BURGUER — 004_seed.sql  (dados REAIS iniciais — não fictícios)
-- Rode DEPOIS do 003_functions.sql.
-- Semeia: categorias base, bairros de Mangaratiba, configurações/horários.
-- NÃO semeia produtos/adicionais/estoque aqui — essa migração de dados vem
-- junto com a camada de acesso (Bloco 2), para nomes/preços baterem 1:1.
-- Idempotente (on conflict do nothing / where not exists).
-- ════════════════════════════════════════════════════════════════

-- ── Bairros / taxas (fonte única de entrega) ───────────────────
insert into delivery_zones (id, name, delivery_fee, estimated_time, active, sort_order) values
  ('centro',              'Centro',                6,  '30 a 40 min', true,  0),
  ('praia-do-saco',       'Praia do Saco',         8,  '35 a 45 min', true,  1),
  ('ibicui',              'Ibicuí',                9,  '40 a 50 min', true,  2),
  ('sahy',                'Sahy',                  10, '45 a 55 min', true,  3),
  ('muriqui',             'Muriqui',               12, '50 a 60 min', true,  4),
  ('vila-muriqui',        'Vila Muriqui',          12, '50 a 60 min', true,  5),
  ('conceicao-jacarei',   'Conceição de Jacareí',  14, '55 a 65 min', true,  6),
  ('itacuruca',           'Itacuruçá',             15, '60 a 70 min', false, 7)
on conflict (id) do nothing;

-- ── Configurações do site/painel (linha única em app_settings) ─
insert into app_settings (key, value) values
  ('business', jsonb_build_object(
      'name','Avilez Burguer',
      'description','Hambúrgueres feitos na chapa, preparados na hora com ingredientes selecionados.',
      'whatsapp','5521971902603','whatsappDisplay','(21) 97190-2603',
      'instagram','@avilezburguer','facebook','Avilez Burguer',
      'city','Mangaratiba','state','RJ')),
  ('hours', jsonb_build_array(
      jsonb_build_object('id','seg-qui','days','Segunda a Quinta','time','18h às 23h'),
      jsonb_build_object('id','sex-dom','days','Sexta a Domingo','time','18h às 00h'))),
  ('landing', jsonb_build_object(
      'heroTitle','O melhor da Costa Verde.',
      'ctaTitle','Bateu a fome?',
      'deliveryInfo','Entrega rápida em Mangaratiba e região.',
      'sectionsVisible', jsonb_build_object(
        'hamburgueres',true,'avaliacoes',true,'entrega',true,'localizacao',true,'pedir',true))),
  ('store', jsonb_build_object('open', true))
on conflict (key) do nothing;
