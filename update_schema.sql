
-- Update supermarkets table structure
-- Add new fields
alter table supermarkets add column if not exists area text;
alter table supermarkets add column if not exists phone_no text;
alter table supermarkets add column if not exists type text check (type in ('Chain', 'Batch'));
alter table supermarkets add column if not exists comments text;

-- Drop old field
alter table supermarkets drop column if exists credit_period_days;

-- Update products table for new pricing structure
alter table products add column if not exists vendor_cost_per_kg numeric default 0;
alter table products add column if not exists cgst_percent numeric default 0;
alter table products add column if not exists sgst_percent numeric default 0;

-- Update skus table for new pricing structure
alter table skus add column if not exists basic_price numeric default 0;
alter table skus add column if not exists ahadhiyas_price numeric default 0;

-- Rename existing columns to match new structure
-- Note: vendor_cost becomes calculated_vendor_cost, selling_price becomes min_selling_price
-- If data exists, you may want to migrate it before renaming

-- Safe rename for vendor_cost
do $$
begin
  if exists(select column_name from information_schema.columns where table_name='skus' and column_name='vendor_cost') then
    alter table skus rename column vendor_cost to calculated_vendor_cost;
  end if;
end $$;

-- Safe rename for selling_price
do $$
begin
  if exists(select column_name from information_schema.columns where table_name='skus' and column_name='selling_price') then
    alter table skus rename column selling_price to min_selling_price;
  end if;
end $$;

-- SALES LOG & ORDER MANAGEMENT

-- 1. Orders Table
create table if not exists orders (
  id uuid default uuid_generate_v4() primary key,
  distributor_id uuid references distributors(id) on delete cascade not null,
  order_ref text not null, -- e.g. "08-02-01"
  sales_channel text not null check (sales_channel in ('Supermarket', 'Whatsapp', 'Instagram', 'Website', 'Other')),
  customer_name text, -- For non-supermarket channels
  supermarket_id uuid references supermarkets(id) on delete set null, -- For Supermarket channel
  total_amount numeric not null default 0,
  amount_received numeric default 0,
  payment_status text check (payment_status in ('PAID', 'PENDING', 'CANCELLED')) default 'PENDING',
  status text check (status in ('COMPLETED', 'CANCELLED')) default 'COMPLETED',
  comments text,
  order_date timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Order Items Table
create table if not exists order_items (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references orders(id) on delete cascade not null,
  sku_id uuid references skus(id) on delete cascade not null,
  quantity integer not null check (quantity > 0),
  price_per_unit numeric not null, -- Snapshot price at time of order
  total_price numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table orders enable row level security;
alter table order_items enable row level security;

-- Policies for Orders
create policy "Admins manage all orders" on orders for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN')
);

create policy "Distributors manage own orders" on orders for all using (
  exists (select 1 from distributors where id = orders.distributor_id and profile_id = auth.uid())
);

-- Policies for Order Items
create policy "Admins manage all order items" on order_items for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN')
);

create policy "Distributors manage own order items" on order_items for all using (
  exists (select 1 from orders where id = order_items.order_id and 
    exists (select 1 from distributors where id = orders.distributor_id and profile_id = auth.uid())
  )
);
