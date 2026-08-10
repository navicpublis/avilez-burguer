-- ════════════════════════════════════════════════════════════════
-- AVILEZ BURGUER — 009_delivery_zones_sync.sql   (INCREMENTAL / SEGURA)
--
-- Para BANCO JÁ EM PRODUÇÃO que rodou o 001 antigo (delivery_zones.id = uuid).
-- Converte delivery_zones.id (e customer_addresses.delivery_zone_id) para TEXT,
-- preservando TODOS os dados e relacionamentos. NÃO apaga nada.
--
-- Também: adiciona unique(name) (necessário para o import por nome),
-- recria create_order com o lookup de zona em TEXT (o antigo fazia ::uuid,
-- que quebraria com ids-slug como "retirada-no-local"), e garante o Realtime
-- de delivery_zones (autossuficiente — não depende de reexecutar o 006).
--
-- Idempotente: pode rodar mais de uma vez sem erro. Rode UMA vez no SQL Editor.
-- ════════════════════════════════════════════════════════════════

-- 1) Converter os tipos de UUID → TEXT preservando os dados ---------------
--    As foreign keys que referenciam delivery_zones(id) são DESCOBERTAS via
--    catálogo (pg_constraint) — não dependemos do nome padrão da constraint.
do $$
declare
  v_type text;
  fk     record;
begin
  select data_type into v_type
    from information_schema.columns
   where table_schema='public' and table_name='delivery_zones' and column_name='id';

  if v_type = 'uuid' then
    -- 1a) solta TODAS as FKs que apontam para delivery_zones (qualquer nome),
    --     guardando os comandos para recriar depois.
    create temp table _fk_backup(
      con_table text, con_name text, con_def text
    ) on commit drop;

    for fk in
      select con.conname,
             rel.relname                    as child_table,
             pg_get_constraintdef(con.oid)  as def
        from pg_constraint con
        join pg_class rel  on rel.oid = con.conrelid           -- tabela filha
        join pg_class fref on fref.oid = con.confrelid         -- tabela referenciada
        join pg_namespace n on n.oid = rel.relnamespace
       where con.contype = 'f'
         and fref.relname = 'delivery_zones'
         and n.nspname = 'public'
    loop
      insert into _fk_backup values (fk.child_table, fk.conname, fk.def);
      execute format('alter table public.%I drop constraint %I', fk.child_table, fk.conname);
    end loop;

    -- 1b) converte as colunas (uuid → text, preservando os valores existentes).
    --     Converte QUALQUER coluna filha que referenciava delivery_zones e a
    --     própria PK. (customer_addresses.delivery_zone_id é o caso conhecido.)
    alter table customer_addresses alter column delivery_zone_id type text using delivery_zone_id::text;
    alter table delivery_zones      alter column id type text using id::text;

    -- 1c) remove o default gen_random_uuid() (agora os ids são slugs do app)
    alter table delivery_zones alter column id drop default;

    -- 1d) recria exatamente as FKs que existiam (mesma definição, mesmo nome),
    --     agora text ↔ text.
    for fk in select * from _fk_backup loop
      execute format('alter table public.%I add constraint %I %s',
                     fk.con_table, fk.con_name, fk.con_def);
    end loop;
  end if;
end $$;

-- 2) unique(name) — necessário para o import por nome (ON CONFLICT (name)) --
--    ESTRATÉGIA SEGURA para produção quando há nomes duplicados:
--    NÃO apagamos dados. Para cada grupo de bairros com o MESMO nome, mantemos
--    UM (o mais antigo por created_at) como canônico; nos DEMAIS: (a) repointamos
--    os customer_addresses para o canônico (preserva os endereços/pedidos) e
--    (b) tornamos o nome único acrescentando um sufixo " (dup N)". Assim nada é
--    removido, os relacionamentos ficam intactos e o unique(name) pode ser criado.
do $$
declare
  grp   record;
  dupe  record;
  n     int;
begin
  -- resolve grupos de nomes duplicados (se houver)
  for grp in
    select name, min(created_at) as keep_created
      from delivery_zones
     group by name
    having count(*) > 1
  loop
    -- id canônico do grupo (o mais antigo; desempate por id)
    -- e reaponta/renomeia os demais
    n := 0;
    for dupe in
      select dz.id
        from delivery_zones dz
       where dz.name = grp.name
       order by dz.created_at asc, dz.id asc
      offset 1                      -- pula o canônico (o primeiro)
    loop
      n := n + 1;
      -- (a) preserva endereços: aponta para o canônico do mesmo nome
      update customer_addresses ca
         set delivery_zone_id = (
              select dz.id from delivery_zones dz
               where dz.name = grp.name
               order by dz.created_at asc, dz.id asc
               limit 1)
       where ca.delivery_zone_id = dupe.id;
      -- (b) torna o nome único, sem perder o registro (fica visível como dup)
      update delivery_zones
         set name = grp.name || ' (dup ' || n || ')'
       where id = dupe.id;
    end loop;
  end loop;

  -- agora não há mais nomes duplicados → cria o unique(name) se faltar
  if not exists (select 1 from pg_constraint where conname='delivery_zones_name_key') then
    alter table delivery_zones add constraint delivery_zones_name_key unique (name);
  end if;
end $$;

-- 3) Realtime de delivery_zones (autossuficiente / idempotente) -----------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname='supabase_realtime' and schemaname='public' and tablename='delivery_zones'
  ) then
    alter publication supabase_realtime add table delivery_zones;
  end if;
end $$;

-- 4) create_order: lookup da zona em TEXT (recria a função com esse ajuste)
--    (corpo idêntico ao 007, só o WHERE da zona já vem sem ::uuid.)
create or replace function create_order(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_zone        delivery_zones%rowtype;
  v_phone       text;
  v_customer_id uuid;
  v_address_id  uuid;
  v_subtotal    numeric := 0;
  v_fee         numeric := 0;
  v_discount    numeric := 0;
  v_total       numeric := 0;
  v_coupon      jsonb;
  v_coupon_id   text := null;
  v_coupon_code text := null;
  v_per_customer int;
  v_used_by_customer int;
  v_order_id    uuid;
  v_token       uuid;
  v_number      text;
  it            jsonb;
  ad            jsonb;
  v_item_id     uuid;
  v_unit        numeric;
  v_qty         int;
  v_line        numeric;
begin
  select * into v_zone from delivery_zones
   where id = payload->>'delivery_zone_id' and active;
  if not found then raise exception 'BAIRRO_INDISPONIVEL'; end if;
  v_fee := v_zone.delivery_fee;

  for it in select * from jsonb_array_elements(coalesce(payload->'items','[]'::jsonb)) loop
    v_qty  := coalesce((it->>'quantity')::int, 1);
    v_unit := coalesce((it->>'unit_price')::numeric, 0);
    for ad in select * from jsonb_array_elements(coalesce(it->'addons','[]'::jsonb)) loop
      if (ad->>'addon_id') is not null then
        v_unit := v_unit + coalesce((select price from addons where id = nullif(ad->>'addon_id','')), (ad->>'price')::numeric, 0);
      else
        v_unit := v_unit + coalesce((ad->>'price')::numeric, 0);
      end if;
    end loop;
    v_subtotal := v_subtotal + v_unit * v_qty;
  end loop;

  -- cliente (upsert por telefone normalizado) — precisa vir antes do limite por cliente
  v_phone := normalize_phone(payload#>>'{customer,phone}');
  if v_phone is not null then
    select id into v_customer_id from customers where phone_digits = v_phone;
  end if;
  if v_customer_id is null then
    insert into customers(name, phone, phone_digits, last_order_at)
    values (coalesce(payload#>>'{customer,name}',''), payload#>>'{customer,phone}', v_phone, now())
    returning id into v_customer_id;
  else
    update customers set name = coalesce(payload#>>'{customer,name}', name), last_order_at = now()
     where id = v_customer_id;
  end if;

  -- cupom: validação global no banco + limite POR CLIENTE
  v_coupon := validate_coupon(payload->>'coupon_code', v_subtotal);
  if (v_coupon->>'valid')::boolean then
    v_coupon_id := v_coupon->>'coupon_id';
    v_coupon_code := v_coupon->>'code';
    select usage_limit_per_customer into v_per_customer from coupons where id = v_coupon_id;
    if v_per_customer is not null and v_per_customer > 0 then
      select count(*) into v_used_by_customer from coupon_usages
        where coupon_id = v_coupon_id and customer_id = v_customer_id;
      if v_used_by_customer >= v_per_customer then
        -- estourou o limite por cliente → sem desconto
        v_coupon_id := null; v_coupon_code := null;
      end if;
    end if;
  end if;

  if v_coupon_id is not null then
    v_discount := coalesce((v_coupon->>'discount')::numeric, 0);
  end if;
  v_total := greatest(v_subtotal + v_fee - v_discount, 0);

  insert into customer_addresses(customer_id, street, number, complement, delivery_zone_id, reference, cep)
  values (v_customer_id, payload#>>'{address,street}', payload#>>'{address,number}',
          coalesce(payload#>>'{address,complement}',''), v_zone.id,
          coalesce(payload#>>'{address,reference}',''), coalesce(payload#>>'{address,cep}',''))
  returning id into v_address_id;

  v_number := 'AVLZ-' || lpad(nextval('order_number_seq')::text, 4, '0');

  insert into orders(
    order_number, customer_id, address_id, status, payment_method, change_for,
    subtotal, delivery_fee, discount, total, coupon_id, coupon_code, customer_notes,
    customer_name, customer_phone, delivery_zone_name, address_snapshot)
  values (
    v_number, v_customer_id, v_address_id, 'recebido',
    (payload->>'payment_method')::payment_method, nullif(payload->>'change_for','')::numeric,
    v_subtotal, v_fee, v_discount, v_total, v_coupon_id, v_coupon_code,
    coalesce(payload->>'customer_notes',''),
    payload#>>'{customer,name}', payload#>>'{customer,phone}', v_zone.name,
    trim(both ' ' from coalesce(payload#>>'{address,street}','') || ', ' || coalesce(payload#>>'{address,number}','')))
  returning id, public_token into v_order_id, v_token;

  for it in select * from jsonb_array_elements(coalesce(payload->'items','[]'::jsonb)) loop
    v_qty  := coalesce((it->>'quantity')::int, 1);
    v_unit := coalesce((it->>'unit_price')::numeric, 0);
    for ad in select * from jsonb_array_elements(coalesce(it->'addons','[]'::jsonb)) loop
      v_unit := v_unit + coalesce((select price from addons where id = nullif(ad->>'addon_id','')), (ad->>'price')::numeric, 0);
    end loop;
    v_line := v_unit * v_qty;
    insert into order_items(order_id, product_id, product_name_snapshot, quantity, unit_price, subtotal, notes)
    values (v_order_id, nullif(it->>'product_id',''), coalesce(it->>'name',''), v_qty, v_unit, v_line, coalesce(it->>'notes',''))
    returning id into v_item_id;
    for ad in select * from jsonb_array_elements(coalesce(it->'addons','[]'::jsonb)) loop
      insert into order_item_addons(order_item_id, addon_id, addon_name_snapshot, price_snapshot)
      values (v_item_id, nullif(ad->>'addon_id',''), coalesce(ad->>'name',''),
              coalesce((select price from addons where id = nullif(ad->>'addon_id','')), (ad->>'price')::numeric, 0));
    end loop;
  end loop;

  insert into order_status_history(order_id, previous_status, new_status, changed_by)
  values (v_order_id, null, 'recebido', null);

  -- registra uso do cupom (idempotente) + incrementa o contador global
  if v_coupon_id is not null then
    insert into coupon_usages(coupon_id, order_id, customer_id)
    values (v_coupon_id, v_order_id, v_customer_id)
    on conflict (coupon_id, order_id) do nothing;
    update coupons set usage_count = usage_count + 1 where id = v_coupon_id;
  end if;

  return jsonb_build_object(
    'order_id', v_order_id, 'public_token', v_token, 'order_number', v_number,
    'total', v_total, 'subtotal', v_subtotal, 'delivery_fee', v_fee, 'discount', v_discount);
end $$;

grant execute on function create_order(jsonb) to anon, authenticated;
