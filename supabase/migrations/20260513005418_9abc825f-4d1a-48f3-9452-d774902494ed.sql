ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE public.orders ALTER COLUMN email DROP NOT NULL;