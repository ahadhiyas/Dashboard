
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

-- Add sales channel to sales table
alter table sales add column if not exists sales_channel text check (sales_channel in ('Supermarket', 'Whatsapp', 'Instagram', 'Website', 'Other')) default 'Supermarket';
