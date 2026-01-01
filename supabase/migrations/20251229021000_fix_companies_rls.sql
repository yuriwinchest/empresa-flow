DROP POLICY IF EXISTS "Admins can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can update companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can delete companies" ON public.companies;
DROP POLICY IF EXISTS "Users can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Users can update accessible companies" ON public.companies;
DROP POLICY IF EXISTS "Users can delete accessible companies" ON public.companies;

CREATE POLICY "Users can insert companies"
  ON public.companies
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update accessible companies"
  ON public.companies
  FOR UPDATE
  TO authenticated
  USING (public.has_company_access(auth.uid(), id))
  WITH CHECK (public.has_company_access(auth.uid(), id));

CREATE POLICY "Users can delete accessible companies"
  ON public.companies
  FOR DELETE
  TO authenticated
  USING (public.has_company_access(auth.uid(), id));

DROP POLICY IF EXISTS "Admins can manage company access" ON public.user_companies;
DROP POLICY IF EXISTS "Users can insert own company access" ON public.user_companies;
DROP POLICY IF EXISTS "Users can update own company access" ON public.user_companies;
DROP POLICY IF EXISTS "Users can delete own company access" ON public.user_companies;

CREATE POLICY "Users can insert own company access"
  ON public.user_companies
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own company access"
  ON public.user_companies
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own company access"
  ON public.user_companies
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
