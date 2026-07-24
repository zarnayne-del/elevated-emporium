CREATE TABLE public.giveaway_prizes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  prize_value text NOT NULL DEFAULT '',
  image_url text,
  end_date timestamptz,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.giveaway_prizes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.giveaway_prizes TO authenticated;
GRANT ALL ON public.giveaway_prizes TO service_role;

ALTER TABLE public.giveaway_prizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read giveaway_prizes" ON public.giveaway_prizes FOR SELECT TO public USING (true);
CREATE POLICY "demo giveaway_prizes public insert" ON public.giveaway_prizes FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "demo giveaway_prizes public update" ON public.giveaway_prizes FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "demo giveaway_prizes public delete" ON public.giveaway_prizes FOR DELETE TO public USING (true);

CREATE OR REPLACE FUNCTION public.giveaway_prizes_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER giveaway_prizes_updated_at
BEFORE UPDATE ON public.giveaway_prizes
FOR EACH ROW EXECUTE FUNCTION public.giveaway_prizes_set_updated_at();

-- Enforce single-active
CREATE OR REPLACE FUNCTION public.giveaway_prizes_single_active()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active THEN
    UPDATE public.giveaway_prizes SET is_active = false
    WHERE id <> NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER giveaway_prizes_single_active_trg
AFTER INSERT OR UPDATE OF is_active ON public.giveaway_prizes
FOR EACH ROW WHEN (NEW.is_active) EXECUTE FUNCTION public.giveaway_prizes_single_active();

INSERT INTO public.giveaway_prizes (title, prize_value, is_active)
VALUES ('Walki Talkie Prize Pack', '150,000 Ks', true);