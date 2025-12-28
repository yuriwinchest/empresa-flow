CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_company_id uuid;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(COALESCE(NEW.email, ''), '@', 1), 'Usuário'),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    updated_at = now();

  INSERT INTO public.user_companies (user_id, company_id, is_default)
  SELECT NEW.id, c.id, false
  FROM public.companies c
  ON CONFLICT (user_id, company_id) DO NOTHING;

  SELECT c.id
  INTO default_company_id
  FROM public.companies c
  WHERE c.is_active
  ORDER BY c.created_at ASC
  LIMIT 1;

  IF default_company_id IS NOT NULL THEN
    UPDATE public.user_companies
    SET is_default = (company_id = default_company_id)
    WHERE user_id = NEW.id
      AND NOT EXISTS (
        SELECT 1
        FROM public.user_companies uc2
        WHERE uc2.user_id = NEW.id
          AND uc2.is_default
      );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_companies (user_id, company_id, is_default)
  SELECT u.id, NEW.id, false
  FROM auth.users u
  ON CONFLICT (user_id, company_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_company_created ON public.companies;
CREATE TRIGGER on_company_created
AFTER INSERT ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_company();

INSERT INTO public.user_companies (user_id, company_id, is_default)
SELECT u.id, c.id, false
FROM auth.users u
CROSS JOIN public.companies c
ON CONFLICT (user_id, company_id) DO NOTHING;

WITH default_company AS (
  SELECT id
  FROM public.companies
  WHERE is_active
  ORDER BY created_at ASC
  LIMIT 1
),
users_without_default AS (
  SELECT DISTINCT user_id
  FROM public.user_companies uc
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.user_companies uc2
    WHERE uc2.user_id = uc.user_id
      AND uc2.is_default
  )
)
UPDATE public.user_companies uc
SET is_default = (uc.company_id = (SELECT id FROM default_company))
WHERE uc.user_id IN (SELECT user_id FROM users_without_default);

