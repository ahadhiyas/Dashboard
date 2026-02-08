
-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- PROFILES (Linked to Auth Users)
create type user_role as enum ('ADMIN', 'DISTRIBUTOR', 'REFERRER');

create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  role user_role not null default 'DISTRIBUTOR',
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS: Profiles
alter table profiles enable row level security;
create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can insert their own profile." on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

-- TRIGGER: Create profile on signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, role, full_name)
  values (new.id, new.email, 'DISTRIBUTOR', new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- PRODUCTS
create table products (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  category text,
  description text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table products enable row level security;
create policy "Admins can do everything on products" on products for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN')
);
create policy "Others can view active products" on products for select using (is_active = true);

-- SKUS (Variants)
create table skus (
  id uuid default uuid_generate_v4() primary key,
  product_id uuid references products(id) on delete cascade not null,
  weight_label text not null, -- e.g. "100g", "1kg"
  weight_grams numeric not null,
  vendor_cost numeric not null,
  packing_cost numeric default 0,
  mrp numeric not null,
  selling_price numeric not null, -- Default selling price
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table skus enable row level security;
create policy "Admins can do everything on skus" on skus for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN')
);
create policy "Others can view skus" on skus for select using (true);

-- DISTRIBUTORS
create table distributors (
  id uuid default uuid_generate_v4() primary key,
  profile_id uuid references profiles(id) on delete set null, -- Link to a user login
  name text not null,
  location text,
  contact_info text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table distributors enable row level security;
create policy "Admins can manage distributors" on distributors for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN')
);
create policy "Distributors can view own data" on distributors for select using (
  profile_id = auth.uid()
);

-- SUPERMARKETS
create table supermarkets (
  id uuid default uuid_generate_v4() primary key,
  distributor_id uuid references distributors(id) on delete cascade not null,
  name text not null,
  location text,
  contact_person text,
  credit_period_days integer default 30,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table supermarkets enable row level security;
create policy "Admins can manage all supermarkets" on supermarkets for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN')
);
create policy "Distributors can manage their own supermarkets" on supermarkets for all using (
  exists (select 1 from distributors where id = supermarkets.distributor_id and profile_id = auth.uid())
);

-- PRICING (Supermarket Specific)
create table pricing (
  supermarket_id uuid references supermarkets(id) on delete cascade not null,
  sku_id uuid references skus(id) on delete cascade not null,
  selling_price numeric not null,
  commission_type text check (commission_type in ('PERCENTAGE', 'FLAT')), -- PERCENTAGE or FLAT
  commission_value numeric default 0,
  primary key (supermarket_id, sku_id)
);

alter table pricing enable row level security;
create policy "Admins can manage pricing" on pricing for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN')
);
create policy "Distributors can manage their supermarket pricing" on pricing for all using (
  exists (select 1 from supermarkets s join distributors d on s.distributor_id = d.id where s.id = pricing.supermarket_id and d.profile_id = auth.uid())
);

-- INVENTORY EVENTS
create type inventory_event_type as enum ('OPENING', 'IN', 'SENT', 'SOLD', 'RETURN');

create table inventory_events (
  id uuid default uuid_generate_v4() primary key,
  distributor_id uuid references distributors(id) on delete cascade not null,
  sku_id uuid references skus(id) on delete cascade not null,
  type inventory_event_type not null,
  quantity numeric not null, -- Positive for IN, Negative for OUT usually handled by application logic, but here we store absolute value and type determines direction
  event_date timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table inventory_events enable row level security;
create policy "Admins can view all inventory" on inventory_events for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN')
);
create policy "Distributors see own inventory" on inventory_events for select using (
  exists (select 1 from distributors where id = inventory_events.distributor_id and profile_id = auth.uid())
);
-- Allow distributors to insert events for themselves
create policy "Distributors insert own inventory" on inventory_events for insert with check (
   exists (select 1 from distributors where id = distributor_id and profile_id = auth.uid())
);

-- SALES & SHIPMENTS
create table sales (
  id uuid default uuid_generate_v4() primary key,
  distributor_id uuid references distributors(id) on delete cascade not null,
  supermarket_id uuid references supermarkets(id) on delete cascade not null,
  sku_id uuid references skus(id) on delete cascade not null,
  quantity numeric not null,
  amount_received numeric default 0,
  sale_date timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table sales enable row level security;
create policy "Admins view all sales" on sales for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN')
);
create policy "Distributors manage own sales" on sales for all using (
  exists (select 1 from distributors where id = sales.distributor_id and profile_id = auth.uid())
);

-- REFERRAL EARNINGS
create table referrals (
  id uuid default uuid_generate_v4() primary key,
  referrer_id uuid references profiles(id) not null,
  referee_id uuid references profiles(id), -- The distributor/supermarket user
  amount numeric not null,
  status text default 'PENDING', -- PENDING, PAID
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table referrals enable row level security;
create policy "Admins manage referrals" on referrals for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN')
);
create policy "Referrers view own earnings" on referrals for select using (
  referrer_id = auth.uid()
);
