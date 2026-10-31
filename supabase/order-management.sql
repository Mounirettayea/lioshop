-- LioShop order management schema changes.
-- This script has already been applied to Supabase project itqbiqiffhlqmztsbpsz.
-- Guest checkout is intentionally exposed only through this validated RPC.

create or replace function public.submit_cart_order(
  p_customer_name text,
  p_customer_phone text,
  p_customer_city text,
  p_customer_address text,
  p_customer_email text default null,
  p_items jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_item jsonb;
  v_product public.products%rowtype;
  v_order_id uuid;
  v_order_number bigint;
  v_subtotal numeric := 0;
  v_quantity integer;
  v_product_id uuid;
  v_size text;
  v_color text;
  v_phone_digits text;
  v_email text := lower(trim(coalesce(p_customer_email, '')));
  v_items_count integer;
begin
  if nullif(trim(p_customer_name), '') is null
     or nullif(trim(p_customer_phone), '') is null
     or nullif(trim(p_customer_city), '') is null
     or nullif(trim(p_customer_address), '') is null then
    raise exception 'عافاك عمر معلومات التوصيل كاملة';
  end if;
  if length(trim(p_customer_name)) > 120
     or length(trim(p_customer_city)) > 120
     or length(trim(p_customer_address)) > 500 then
    raise exception 'بعض معلومات التوصيل طويلة بزاف';
  end if;

  v_phone_digits := regexp_replace(p_customer_phone, '[^0-9]', '', 'g');
  if length(v_phone_digits) < 9 or length(v_phone_digits) > 15 then
    raise exception 'رقم الهاتف غير صالح';
  end if;
  if v_email <> '' and (
    length(v_email) > 254
    or v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+[.][A-Z]{2,}$'
  ) then
    raise exception 'عافاك دخل بريد إلكتروني صحيح';
  end if;

  if p_items is null or jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'لائحة المنتجات غير صالحة';
  end if;
  v_items_count := jsonb_array_length(p_items);
  if v_items_count < 1 or v_items_count > 30 then
    raise exception 'الطلب خاصو يحتوي على منتج واحد على الأقل وبحد أقصى 30 منتج';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(68290124);
  select coalesce(max(o.order_number), 100000) + 1
    into v_order_number
    from public.orders o;

  -- Validate every item and calculate prices from the database, not the browser.
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    begin
      v_product_id := (v_item->>'product_id')::uuid;
      v_quantity := (v_item->>'quantity')::integer;
    exception when others then
      raise exception 'بيانات المنتج أو الكمية غير صالحة';
    end;

    v_size := nullif(trim(coalesce(v_item->>'selected_size', '')), '');
    v_color := nullif(trim(coalesce(v_item->>'selected_color', '')), '');

    if v_quantity is null or v_quantity < 1 or v_quantity > 20 then
      raise exception 'الكمية غير صالحة';
    end if;

    select * into v_product
      from public.products p
     where p.id = v_product_id and p.is_active = true
     for share;
    if not found then
      raise exception 'واحد من المنتجات ما بقاش متوفر';
    end if;

    if coalesce(cardinality(v_product.sizes), 0) > 0 and v_size is null then
      raise exception 'خاص اختيار المقاس للمنتج: %', v_product.name;
    end if;
    if v_size is not null
       and not (coalesce(v_product.sizes, '{}'::text[]) @> array[v_size]::text[]) then
      raise exception 'المقاس المختار غير متوفر للمنتج: %', v_product.name;
    end if;
    if coalesce(cardinality(v_product.colors), 0) > 0 and v_color is null then
      raise exception 'خاص اختيار اللون للمنتج: %', v_product.name;
    end if;
    if v_color is not null
       and not (coalesce(v_product.colors, '{}'::text[]) @> array[v_color]::text[]) then
      raise exception 'اللون المختار غير متوفر للمنتج: %', v_product.name;
    end if;

    v_subtotal := v_subtotal + (v_product.price * v_quantity);
  end loop;

  insert into public.orders (
    order_number, customer_name, customer_phone, customer_email,
    customer_address, customer_city, status, subtotal, shipping_fee, total, notes
  ) values (
    v_order_number, trim(p_customer_name), trim(p_customer_phone),
    nullif(v_email, ''), trim(p_customer_address), trim(p_customer_city),
    'pending', v_subtotal, 0, v_subtotal, 'تم تسجيل الطلب إلكترونياً عبر LioShop'
  ) returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;
    v_size := nullif(trim(coalesce(v_item->>'selected_size', '')), '');
    v_color := nullif(trim(coalesce(v_item->>'selected_color', '')), '');
    select * into v_product from public.products p where p.id = v_product_id;

    insert into public.order_items (
      order_id, product_id, product_name, unit_price, quantity, selected_size, selected_color
    ) values (
      v_order_id, v_product.id, v_product.name, v_product.price,
      v_quantity, v_size, v_color
    );
  end loop;

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'shipping_fee', 0,
    'total', v_subtotal
  );
end;
$function$;

revoke all on function public.submit_cart_order(text,text,text,text,text,jsonb) from public;
grant execute on function public.submit_cart_order(text,text,text,text,text,jsonb) to anon, authenticated;

drop policy if exists "Public can submit orders" on public.orders;
drop policy if exists "Public can add items to pending orders" on public.order_items;
drop policy if exists "Admins can view orders" on public.orders;
drop policy if exists "Admins can update orders" on public.orders;
drop policy if exists "Admins can view order items" on public.order_items;

create policy "Admins can view orders"
on public.orders for select to authenticated
using (public.is_admin());

create policy "Admins can update orders"
on public.orders for update to authenticated
using (public.is_admin())
with check (
  public.is_admin()
  and status in ('pending','confirmed','preparing','shipped','delivered','cancelled')
);

create policy "Admins can view order items"
on public.order_items for select to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id and public.is_admin()
  )
);

revoke insert on public.orders from anon, authenticated;
revoke insert on public.order_items from anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
