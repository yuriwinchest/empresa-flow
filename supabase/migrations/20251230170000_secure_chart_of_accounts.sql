-- Enable RLS on chart_of_accounts
ALTER TABLE "public"."chart_of_accounts" ENABLE ROW LEVEL SECURITY;

-- Remove existing permissive policies if any (optional, but good practice to be clean)
-- DROP POLICY IF EXISTS "Enable all for users" ON "public"."chart_of_accounts";

-- Policy for Select
CREATE POLICY "Users can view chart of accounts for their companies"
ON "public"."chart_of_accounts"
FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id
    FROM "public"."user_companies"
    WHERE user_id = auth.uid()
  )
);

-- Policy for Insert
CREATE POLICY "Users can insert chart of accounts for their companies"
ON "public"."chart_of_accounts"
FOR INSERT
TO authenticated
WITH CHECK (
  company_id IN (
    SELECT company_id
    FROM "public"."user_companies"
    WHERE user_id = auth.uid()
  )
);

-- Policy for Update
CREATE POLICY "Users can update chart of accounts for their companies"
ON "public"."chart_of_accounts"
FOR UPDATE
TO authenticated
USING (
  company_id IN (
    SELECT company_id
    FROM "public"."user_companies"
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id
    FROM "public"."user_companies"
    WHERE user_id = auth.uid()
  )
);

-- Policy for Delete
CREATE POLICY "Users can delete chart of accounts for their companies"
ON "public"."chart_of_accounts"
FOR DELETE
TO authenticated
USING (
  company_id IN (
    SELECT company_id
    FROM "public"."user_companies"
    WHERE user_id = auth.uid()
  )
);
