-- ════════════════════════════════════════════════════════════════
-- AVILEZ BURGUER — 007_coupons_stock.sql
-- Bloco 5: uso de cupom (coupon_usages), validação de estoque insuficiente
-- na baixa automática, e registro/limite por cliente no create_order.
-- Rode DEPOIS do 006_realtime.sql.
-- ════════════════════════════════════════════════════════════════

-- 1) Registro de uso de cupom (idempotente por pedido)
create table if not exists coupon_usages (
  id          uuid primary key default gen_random_uuid(),
  coupon_id   text not null references coupons(id) on delete cascade,
  order_id    uuid not null references orders(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  used_at     timestamptz not null default now(),
  unique (coupon_id, order_id)   -- 1 uso por (cupom, pedido) → sem consumo duplo
);
create index if not exists idx_coupon_usages_coupon on coupon_usages(coupon_id);
create index if not exists idx_coupon_usages_customer on coupon_usages(customer_id);

alter table coupon_usages enable row level security;
drop policy if exists cu_admin_all on coupon_usages;
create policy cu_admin_all on coupon_usages for all using (is_admin()) with check (is_admin());

-- coupons.id no schema é text; garanta o tipo do FK acima (ajuste defensivo)
-- (se o seu coupons.id for uuid, troque "text" por "uuid" na tabela acima.)

-- 2) Baixa de estoque com VALIDAÇÃO de estoque insuficiente (idempotente)
--    Lança 'ESTOQUE_INSUFICIENTE: <ingredientes>' se faltar algo — assim a
--    transação que confirma o pedido é revertida por inteiro (nada parcial).
create or replace function consume_stock_for_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  r record; v_prev numeric; v_new numeric; v_falta text := '';
begin
  -- idempotência: já consumido? então não faz nada
  if exists (select 1 from stock_movements where order_id = p_order_id and type = 'saida_automatica') then
    return;
  end if;

  -- 1) valida ANTES de descontar: soma o necessário por ingrediente e compara
  for r in
    select rec.ingredient_id, i.name, i.current_stock, sum(rec.quantity * oi.quantity) as need
      from order_items oi
      join recipes rec on rec.product_id = oi.product_id
      join ingredients i on i.id = rec.ingredient_id
     where oi.order_id = p_order_id and oi.product_id is not null
     group by rec.ingredient_id, i.name, i.current_stock
  loop
    if coalesce(r.current_stock,0) < r.need then
      v_falta := v_falta || case when v_falta = '' then '' else ', ' end || r.name;
    end if;
  end loop;

  if v_falta <> '' then
    raise exception 'ESTOQUE_INSUFICIENTE: %', v_falta;
  end if;

  -- 2) desconta e registra a movimentação de cada ingrediente
  for r in
    select rec.ingredient_id, sum(rec.quantity * oi.quantity) as need
      from order_items oi
      join recipes rec on rec.product_id = oi.product_id
     where oi.order_id = p_order_id and oi.product_id is not null
     group by rec.ingredient_id
  loop
    select current_stock into v_prev from ingredients where id = r.ingredient_id for update;
    v_new := coalesce(v_prev,0) - r.need;
    update ingredients set current_stock = v_new where id = r.ingredient_id;
    insert into stock_movements(ingredient_id, type, quantity, previous_stock, new_stock, order_id, reason, created_by)
    values (r.ingredient_id, 'saida_automatica', r.need, v_prev, v_new, p_order_id,
            'Baixa automática por confirmação de pedido', auth.uid());
  end loop;
end $$;

-- 3) create_order: registra uso do cupom e respeita o limite POR CLIENTE.
--    (recria a função do 003 com esses acréscimos; restante idêntico.)
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
   where id = (payload->>'delivery_zone_id')::uuid and active;
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
grant execute on function consume_stock_for_order(uuid) to authenticated;
