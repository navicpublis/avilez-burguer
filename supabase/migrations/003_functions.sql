-- ════════════════════════════════════════════════════════════════
-- AVILEZ BURGUER — 003_functions.sql
-- Funções seguras (RPC). Rode DEPOIS do 002_rls.sql.
--
-- Estas funções são a "fonte da verdade" das operações críticas:
--  • create_order      → cria o pedido inteiro de forma ATÔMICA (o servidor
--                        calcula taxa e desconto; nada é confiado ao front).
--  • change_order_status → muda status e, ao CONFIRMAR, faz a baixa de estoque
--                        UMA ÚNICA VEZ (idempotente).
--  • validate_coupon   → valida cupom no banco (existência/ativo/datas/limite/mínimo).
--  • get_order_by_token→ rastreio público seguro (só por public_token).
--  • submit_review     → cliente avalia (entra pendente; 1 por pedido).
-- ════════════════════════════════════════════════════════════════

create sequence if not exists order_number_seq start 1;

-- só dígitos do telefone (normalização p/ evitar cliente duplicado)
create or replace function normalize_phone(p text)
returns text language sql immutable as $$
  select nullif(regexp_replace(coalesce(p,''), '\D', '', 'g'), '');
$$;

-- ── validação de cupom (retorna jsonb) ─────────────────────────
create or replace function validate_coupon(p_code text, p_subtotal numeric)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c coupons%rowtype; d numeric := 0;
begin
  if p_code is null or length(trim(p_code)) = 0 then
    return jsonb_build_object('valid', false);
  end if;
  select * into c from coupons where upper(code) = upper(trim(p_code)) limit 1;
  if not found or not c.active then return jsonb_build_object('valid', false); end if;
  if c.starts_at  is not null and now() <  c.starts_at then return jsonb_build_object('valid', false); end if;
  if c.expires_at is not null and now() > (c.expires_at + interval '1 day') then return jsonb_build_object('valid', false); end if;
  if c.usage_limit is not null and c.usage_count >= c.usage_limit then return jsonb_build_object('valid', false); end if;
  if c.minimum_order > 0 and p_subtotal < c.minimum_order then return jsonb_build_object('valid', false); end if;

  if c.discount_type = 'pct' then
    d := round(p_subtotal * coalesce(c.percentage,0) / 100.0, 2);
  else
    d := least(coalesce(c.fixed_amount,0), p_subtotal);
  end if;

  return jsonb_build_object('valid', true, 'coupon_id', c.id, 'code', c.code, 'discount', d);
end $$;

-- ── criação atômica do pedido (chamada pelo checkout público) ──
-- payload esperado (jsonb):
-- {
--   "customer": {"name": "...", "phone": "..."},
--   "address":  {"street":"","number":"","complement":"","reference":"","cep":""},
--   "delivery_zone_id": "uuid",
--   "payment_method": "PIX|Dinheiro|Cartão na Entrega",
--   "change_for": null,
--   "coupon_code": null,
--   "customer_notes": "",
--   "items": [
--     {"product_id":"uuid|null","name":"...","unit_price":0,"quantity":1,"notes":"",
--      "addons":[{"addon_id":"uuid|null","name":"...","price":0}]}
--   ]
-- }
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
  -- bairro precisa existir e estar ativo
  select * into v_zone from delivery_zones
   where id = (payload->>'delivery_zone_id')::uuid and active;
  if not found then
    raise exception 'BAIRRO_INDISPONIVEL';
  end if;
  v_fee := v_zone.delivery_fee;

  -- subtotal recalculado no servidor (preço do adicional vem da tabela quando há id)
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

  -- cupom (validação no banco)
  v_coupon := validate_coupon(payload->>'coupon_code', v_subtotal);
  if (v_coupon->>'valid')::boolean then
    v_discount  := coalesce((v_coupon->>'discount')::numeric, 0);
    v_coupon_id := v_coupon->>'coupon_id';
    v_coupon_code := v_coupon->>'code';
  end if;

  v_total := greatest(v_subtotal + v_fee - v_discount, 0);

  -- cliente (upsert por telefone normalizado)
  v_phone := normalize_phone(payload#>>'{customer,phone}');
  if v_phone is not null then
    select id into v_customer_id from customers where phone_digits = v_phone;
  end if;
  if v_customer_id is null then
    insert into customers(name, phone, phone_digits, last_order_at)
    values (coalesce(payload#>>'{customer,name}',''), payload#>>'{customer,phone}', v_phone, now())
    returning id into v_customer_id;
  else
    update customers set name = coalesce(payload#>>'{customer,name}', name),
           last_order_at = now() where id = v_customer_id;
  end if;

  -- endereço
  insert into customer_addresses(customer_id, street, number, complement, delivery_zone_id, reference, cep)
  values (v_customer_id,
          payload#>>'{address,street}', payload#>>'{address,number}',
          coalesce(payload#>>'{address,complement}',''), v_zone.id,
          coalesce(payload#>>'{address,reference}',''), coalesce(payload#>>'{address,cep}',''))
  returning id into v_address_id;

  -- número legível do pedido
  v_number := 'AVLZ-' || lpad(nextval('order_number_seq')::text, 4, '0');

  -- pedido
  insert into orders(
    order_number, customer_id, address_id, status, payment_method, change_for,
    subtotal, delivery_fee, discount, total, coupon_id, coupon_code, customer_notes,
    customer_name, customer_phone, delivery_zone_name, address_snapshot)
  values (
    v_number, v_customer_id, v_address_id, 'recebido',
    (payload->>'payment_method')::payment_method,
    nullif(payload->>'change_for','')::numeric,
    v_subtotal, v_fee, v_discount, v_total, v_coupon_id, v_coupon_code,
    coalesce(payload->>'customer_notes',''),
    payload#>>'{customer,name}', payload#>>'{customer,phone}', v_zone.name,
    trim(both ' ' from coalesce(payload#>>'{address,street}','') || ', ' || coalesce(payload#>>'{address,number}','')))
  returning id, public_token into v_order_id, v_token;

  -- itens + adicionais (com snapshots de nome/preço)
  for it in select * from jsonb_array_elements(coalesce(payload->'items','[]'::jsonb)) loop
    v_qty  := coalesce((it->>'quantity')::int, 1);
    v_unit := coalesce((it->>'unit_price')::numeric, 0);
    for ad in select * from jsonb_array_elements(coalesce(it->'addons','[]'::jsonb)) loop
      v_unit := v_unit + coalesce(
        (select price from addons where id = nullif(ad->>'addon_id','')),
        (ad->>'price')::numeric, 0);
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

  -- histórico inicial
  insert into order_status_history(order_id, previous_status, new_status, changed_by)
  values (v_order_id, null, 'recebido', null);

  return jsonb_build_object(
    'order_id', v_order_id, 'public_token', v_token,
    'order_number', v_number, 'total', v_total,
    'subtotal', v_subtotal, 'delivery_fee', v_fee, 'discount', v_discount);
end $$;

-- ── baixa de estoque idempotente para um pedido ────────────────
create or replace function consume_stock_for_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r record; v_prev numeric; v_new numeric; v_need numeric;
begin
  -- já consumido? (idempotência)
  if exists (select 1 from stock_movements where order_id = p_order_id and type = 'saida_automatica') then
    return;
  end if;
  -- para cada ingrediente exigido pelas receitas dos itens do pedido
  for r in
    select rec.ingredient_id, sum(rec.quantity * oi.quantity) as need
      from order_items oi
      join recipes rec on rec.product_id = oi.product_id
     where oi.order_id = p_order_id and oi.product_id is not null
     group by rec.ingredient_id
  loop
    select current_stock into v_prev from ingredients where id = r.ingredient_id for update;
    v_need := r.need;
    v_new  := coalesce(v_prev,0) - v_need;
    update ingredients set current_stock = v_new where id = r.ingredient_id;
    insert into stock_movements(ingredient_id, type, quantity, previous_stock, new_stock, order_id, reason)
    values (r.ingredient_id, 'saida_automatica', v_need, v_prev, v_new, p_order_id, 'Baixa automática por confirmação de pedido');
  end loop;
end $$;

-- ── mudança de status (admin) + baixa ao confirmar ─────────────
create or replace function change_order_status(p_order_id uuid, p_new_status order_status)
returns void language plpgsql security definer set search_path = public as $$
declare v_prev order_status;
begin
  if not is_admin() then raise exception 'NAO_AUTORIZADO'; end if;
  select status into v_prev from orders where id = p_order_id for update;  -- serializa chamadas concorrentes
  if not found then raise exception 'PEDIDO_NAO_ENCONTRADO'; end if;
  if v_prev = p_new_status then return; end if;

  update orders set
    status = p_new_status,
    confirmed_at          = case when p_new_status='confirmado' and confirmed_at is null then now() else confirmed_at end,
    production_started_at  = case when p_new_status='producao'  and production_started_at is null then now() else production_started_at end,
    out_for_delivery_at    = case when p_new_status='entrega'   and out_for_delivery_at is null then now() else out_for_delivery_at end,
    delivered_at           = case when p_new_status='entregue'  and delivered_at is null then now() else delivered_at end,
    cancelled_at           = case when p_new_status='cancelado' and cancelled_at is null then now() else cancelled_at end
  where id = p_order_id;

  insert into order_status_history(order_id, previous_status, new_status, changed_by)
  values (p_order_id, v_prev, p_new_status, auth.uid());

  -- baixa de estoque ao entrar em "confirmado" (idempotente)
  if p_new_status = 'confirmado' then
    perform consume_stock_for_order(p_order_id);
  end if;
end $$;

create or replace function cancel_order(p_order_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'NAO_AUTORIZADO'; end if;
  update orders set cancellation_reason = p_reason where id = p_order_id;
  perform change_order_status(p_order_id, 'cancelado');
end $$;

-- ── rastreio público seguro (só por public_token) ──────────────
create or replace function get_order_by_token(p_token uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare o orders%rowtype; v_items jsonb; v_hist jsonb;
begin
  select * into o from orders where public_token = p_token;
  if not found then return null; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'name', product_name_snapshot, 'quantity', quantity,
           'unit_price', unit_price, 'subtotal', subtotal, 'notes', notes)), '[]')
    into v_items from order_items where order_id = o.id;

  select coalesce(jsonb_agg(jsonb_build_object(
           'status', new_status, 'at', created_at) order by created_at), '[]')
    into v_hist from order_status_history where order_id = o.id;

  -- devolve só o necessário para o acompanhamento (sem expor outros dados)
  return jsonb_build_object(
    'order_number', o.order_number, 'status', o.status,
    'payment_method', o.payment_method, 'subtotal', o.subtotal,
    'delivery_fee', o.delivery_fee, 'discount', o.discount, 'total', o.total,
    'customer_name', o.customer_name, 'created_at', o.created_at,
    'delivered_at', o.delivered_at, 'items', v_items, 'history', v_hist);
end $$;

-- ── avaliação pública (entra pendente; 1 por pedido) ───────────
create or replace function submit_review(p_token uuid, p_rating int, p_comment text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o orders%rowtype;
begin
  select * into o from orders where public_token = p_token;
  if not found then raise exception 'PEDIDO_NAO_ENCONTRADO'; end if;
  if o.status <> 'entregue' then raise exception 'PEDIDO_NAO_ENTREGUE'; end if;
  if exists (select 1 from reviews where order_id = o.id) then raise exception 'JA_AVALIADO'; end if;

  insert into reviews(order_id, customer_id, customer_name, rating, comment, status)
  values (o.id, o.customer_id, coalesce(o.customer_name,''),
          greatest(1, least(5, p_rating)), coalesce(p_comment,''), 'pendente');
  return jsonb_build_object('ok', true);
end $$;

-- permissões de execução das RPCs
grant execute on function validate_coupon(text, numeric)      to anon, authenticated;
grant execute on function create_order(jsonb)                 to anon, authenticated;
grant execute on function get_order_by_token(uuid)            to anon, authenticated;
grant execute on function submit_review(uuid, int, text)      to anon, authenticated;
grant execute on function change_order_status(uuid, order_status) to authenticated;
grant execute on function cancel_order(uuid, text)            to authenticated;
grant execute on function consume_stock_for_order(uuid)       to authenticated;
