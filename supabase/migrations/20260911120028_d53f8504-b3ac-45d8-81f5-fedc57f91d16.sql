DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can read own roles" ON public.user_roles;
CREATE POLICY "users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;

DROP POLICY IF EXISTS "demo orders public read" ON public.orders;
DROP POLICY IF EXISTS "demo orders public insert" ON public.orders;
DROP POLICY IF EXISTS "demo orders public update" ON public.orders;

DROP POLICY IF EXISTS "demo order_items public read" ON public.order_items;
DROP POLICY IF EXISTS "demo order_items public insert" ON public.order_items;

DROP POLICY IF EXISTS "demo giveaway_entries public read" ON public.giveaway_entries;
DROP POLICY IF EXISTS "demo giveaway_entries public insert" ON public.giveaway_entries;
DROP POLICY IF EXISTS "demo giveaway_entries public delete" ON public.giveaway_entries;

DROP POLICY IF EXISTS "demo giveaway_winners public read" ON public.giveaway_winners;
DROP POLICY IF EXISTS "demo giveaway_winners public insert" ON public.giveaway_winners;

DROP POLICY IF EXISTS "demo giveaway_prizes public insert" ON public.giveaway_prizes;
DROP POLICY IF EXISTS "demo giveaway_prizes public update" ON public.giveaway_prizes;
DROP POLICY IF EXISTS "demo giveaway_prizes public delete" ON public.giveaway_prizes;

DROP POLICY IF EXISTS "demo products public insert" ON public.products;
DROP POLICY IF EXISTS "demo products public update" ON public.products;
DROP POLICY IF EXISTS "demo products public delete" ON public.products;

REVOKE ALL ON public.orders FROM anon, authenticated;
REVOKE ALL ON public.order_items FROM anon, authenticated;
REVOKE ALL ON public.giveaway_entries FROM anon, authenticated;
REVOKE ALL ON public.giveaway_winners FROM anon, authenticated;
REVOKE ALL ON public.products FROM anon, authenticated;
REVOKE ALL ON public.giveaway_prizes FROM anon, authenticated;

GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.giveaway_prizes TO anon, authenticated;
GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.order_items TO service_role;
GRANT ALL ON public.giveaway_entries TO service_role;
GRANT ALL ON public.giveaway_winners TO service_role;
GRANT ALL ON public.products TO service_role;
GRANT ALL ON public.giveaway_prizes TO service_role;

REVOKE ALL ON FUNCTION public.create_giveaway_entry_for_order() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_giveaway_entry_for_order() FROM anon;
REVOKE ALL ON FUNCTION public.create_giveaway_entry_for_order() FROM authenticated;

DROP POLICY IF EXISTS "payment screenshots public read" ON storage.objects;
DROP POLICY IF EXISTS "payment screenshots public write" ON storage.objects;
DROP POLICY IF EXISTS "product images public write" ON storage.objects;
DROP POLICY IF EXISTS "product images public update" ON storage.objects;
DROP POLICY IF EXISTS "product images public delete" ON storage.objects;
