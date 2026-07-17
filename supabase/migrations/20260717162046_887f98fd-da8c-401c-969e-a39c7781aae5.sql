
-- Delivery fee column on orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_cents integer NOT NULL DEFAULT 0;

-- Giveaway entries
CREATE TABLE IF NOT EXISTS public.giveaway_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  phone_number text,
  customer_name text NOT NULL,
  month_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id)
);
CREATE INDEX IF NOT EXISTS giveaway_entries_month_idx ON public.giveaway_entries(month_key);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.giveaway_entries TO authenticated;
GRANT SELECT ON public.giveaway_entries TO anon;
GRANT ALL ON public.giveaway_entries TO service_role;
ALTER TABLE public.giveaway_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo giveaway_entries public read" ON public.giveaway_entries FOR SELECT USING (true);
CREATE POLICY "demo giveaway_entries public insert" ON public.giveaway_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "demo giveaway_entries public delete" ON public.giveaway_entries FOR DELETE USING (true);

-- Giveaway winners (one per month)
CREATE TABLE IF NOT EXISTS public.giveaway_winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_key text NOT NULL UNIQUE,
  entry_id uuid REFERENCES public.giveaway_entries(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  phone_number text,
  customer_name text NOT NULL,
  drawn_at timestamptz NOT NULL DEFAULT now(),
  drawn_manually boolean NOT NULL DEFAULT false
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.giveaway_winners TO authenticated;
GRANT SELECT ON public.giveaway_winners TO anon;
GRANT ALL ON public.giveaway_winners TO service_role;
ALTER TABLE public.giveaway_winners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo giveaway_winners public read" ON public.giveaway_winners FOR SELECT USING (true);
CREATE POLICY "demo giveaway_winners public insert" ON public.giveaway_winners FOR INSERT WITH CHECK (true);

-- Trigger: create a giveaway entry for every new order
CREATE OR REPLACE FUNCTION public.create_giveaway_entry_for_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.giveaway_entries (order_id, phone_number, customer_name, month_key)
  VALUES (
    NEW.id,
    NEW.phone_number,
    NEW.shipping_name,
    to_char(NEW.created_at AT TIME ZONE 'UTC', 'YYYY-MM')
  )
  ON CONFLICT (order_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_create_giveaway_entry ON public.orders;
CREATE TRIGGER orders_create_giveaway_entry
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.create_giveaway_entry_for_order();
