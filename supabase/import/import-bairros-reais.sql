-- ════════════════════════════════════════════════════════════════
-- AVILEZ BURGUER — import-bairros-reais.sql   (IMPORTAÇÃO ÚNICA)
-- Carga inicial dos bairros/taxas reais no Supabase.
--
-- >>> NÃO É MIGRATION <<<  Não roda sozinho, não fica em supabase/migrations/.
-- Rode UMA vez, manualmente, no SQL Editor, DEPOIS da 009_delivery_zones_sync.sql
-- (a 009 resolve nomes duplicados e cria o unique(name) que este import usa).
--
-- Idempotente: casa por NOME (unique). Se o bairro existe → atualiza a taxa e
-- reativa (mantém o id atual). Se não existe → insere com id-slug. NÃO apaga
-- ninguém. Ao final, LISTA os bairros extras do banco fora desta lista.
-- ════════════════════════════════════════════════════════════════

insert into delivery_zones (id, name, delivery_fee, active, sort_order) values
  ('acampamento', 'Acampamento', 7.00, true, 0),
  ('apara', 'Apara', 12.00, true, 1),
  ('centro', 'Centro', 7.00, true, 2),
  ('club-med', 'Club med', 25.00, true, 3),
  ('condominio', 'Condominio', 15.00, true, 4),
  ('condominio-alto-do-sahy', 'Condominio Alto do Sahy', 12.00, true, 5),
  ('condominio-mar-azul', 'Condominio Mar Azul', 15.00, true, 6),
  ('condominio-naturalle', 'Condominio Naturalle', 15.00, true, 7),
  ('ibicui', 'Ibicui', 12.00, true, 8),
  ('ingaiba', 'Ingaiba', 30.00, true, 9),
  ('junqueira', 'Junqueira', 20.00, true, 10),
  ('morro-do-cristo', 'Morro do Cristo', 8.00, true, 11),
  ('muriqui', 'Muriqui', 30.00, true, 12),
  ('nova-mangaratiba', 'Nova Mangaratiba', 5.00, true, 13),
  ('parque-bela-vista', 'Parque Bela vista', 10.00, true, 14),
  ('pier-51', 'Pier 51', 25.00, true, 15),
  ('portobello', 'Portobello', 20.00, true, 16),
  ('praia-brava', 'Praia Brava', 12.00, true, 17),
  ('praia-do-saco', 'Praia do Saco', 5.00, true, 18),
  ('praia-grande', 'Praia Grande', 17.00, true, 19),
  ('praia-pequena', 'Praia pequena', 12.00, true, 20),
  ('reserva-do-sahy', 'Reserva do Sahy', 15.00, true, 21),
  ('retirada-no-local', 'RETIRADA NO LOCAL', 0.00, true, 22),
  ('ribeira', 'Ribeira', 12.00, true, 23),
  ('sahy', 'Sahy', 15.00, true, 24),
  ('santa-barbara-sahy', 'Santa Barbara - Sahy', 25.00, true, 25),
  ('serra-do-piloto', 'Serra do Piloto', 25.00, true, 26),
  ('sitio-bom', 'Sítio Bom', 30.00, true, 27)
on conflict (name) do update
  set delivery_fee = excluded.delivery_fee,
      active       = true;

-- Bairros EXTRAS (no banco, fora desta lista) — revise/apague manualmente se quiser.
-- (Ex.: nomes antigos com grafia diferente, como "Ibicuí" vs "Ibicui".)
select name as bairro_extra_no_banco, delivery_fee, active
  from delivery_zones
 where name not in ('Acampamento', 'Apara', 'Centro', 'Club med', 'Condominio', 'Condominio Alto do Sahy', 'Condominio Mar Azul', 'Condominio Naturalle', 'Ibicui', 'Ingaiba', 'Junqueira', 'Morro do Cristo', 'Muriqui', 'Nova Mangaratiba', 'Parque Bela vista', 'Pier 51', 'Portobello', 'Praia Brava', 'Praia do Saco', 'Praia Grande', 'Praia pequena', 'Reserva do Sahy', 'RETIRADA NO LOCAL', 'Ribeira', 'Sahy', 'Santa Barbara - Sahy', 'Serra do Piloto', 'Sítio Bom')
 order by name;
