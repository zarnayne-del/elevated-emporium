
-- Extend tables
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_screenshot_url text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url text;

-- Demo open policies (no auth in demo)
CREATE POLICY "demo orders public read" ON public.orders FOR SELECT TO public USING (true);
CREATE POLICY "demo orders public insert" ON public.orders FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "demo orders public update" ON public.orders FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "demo order_items public read" ON public.order_items FOR SELECT TO public USING (true);
CREATE POLICY "demo order_items public insert" ON public.order_items FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "demo products public insert" ON public.products FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "demo products public update" ON public.products FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "demo products public delete" ON public.products FOR DELETE TO public USING (true);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-screenshots', 'payment-screenshots', true)
  ON CONFLICT (id) DO NOTHING;

-- Storage policies (open for demo)
CREATE POLICY "product images public read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'product-images');
CREATE POLICY "product images public write" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'product-images');
CREATE POLICY "product images public update" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'product-images');
CREATE POLICY "product images public delete" ON storage.objects FOR DELETE TO public USING (bucket_id = 'product-images');

CREATE POLICY "payment screenshots public read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'payment-screenshots');
CREATE POLICY "payment screenshots public write" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'payment-screenshots');
