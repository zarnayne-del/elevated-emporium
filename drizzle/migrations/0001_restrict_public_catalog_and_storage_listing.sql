DROP POLICY IF EXISTS "products are public" ON public.products;
CREATE POLICY "lawful apparel public read" ON public.products FOR SELECT TO anon, authenticated USING (lower(trim(category)) = 'streetwear' AND concat_ws(' ',name,slug,description) !~* 'cannabis|marijuana|flower|weed|thc|cbd|edible|pre.?roll|haze|kush|ဆေးခြောက်');
DROP POLICY IF EXISTS "product images public read" ON storage.objects;
COMMENT ON POLICY "lawful apparel public read" ON public.products IS 'Public discovery is limited to verified non-controlled apparel; staff records remain unchanged.';