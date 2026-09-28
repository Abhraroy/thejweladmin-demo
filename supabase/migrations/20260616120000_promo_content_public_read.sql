GRANT SELECT ON TABLE public.promo_content TO anon;
GRANT SELECT ON TABLE public.promo_content TO authenticated;

CREATE POLICY "Enable read access for all users"
ON public.promo_content
AS PERMISSIVE
FOR SELECT
TO public
USING (true);
