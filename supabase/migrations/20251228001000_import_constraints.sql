DO $$ BEGIN
  BEGIN
    ALTER TABLE public.clients
    ADD CONSTRAINT clients_company_razao_social_key UNIQUE (company_id, razao_social);
  EXCEPTION WHEN duplicate_object THEN null;
  END;

  BEGIN
    ALTER TABLE public.suppliers
    ADD CONSTRAINT suppliers_company_razao_social_key UNIQUE (company_id, razao_social);
  EXCEPTION WHEN duplicate_object THEN null;
  END;

  BEGIN
    ALTER TABLE public.categories
    ADD CONSTRAINT categories_company_name_key UNIQUE (company_id, name);
  EXCEPTION WHEN duplicate_object THEN null;
  END;
END $$;

DO $$ DECLARE c record;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'categories'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%type%'
  LOOP
    EXECUTE format('ALTER TABLE public.categories DROP CONSTRAINT %I', c.conname);
  END LOOP;

  BEGIN
    ALTER TABLE public.categories
    ADD CONSTRAINT categories_type_check CHECK (type IN ('income', 'expense'));
  EXCEPTION WHEN duplicate_object THEN null;
  END;
END $$;

DO $$ BEGIN
  IF to_regclass('public.departments') IS NOT NULL THEN
    BEGIN
      ALTER TABLE public.departments
      ADD CONSTRAINT departments_company_name_key UNIQUE (company_id, name);
    EXCEPTION WHEN duplicate_object THEN null;
    END;
  END IF;

  IF to_regclass('public.products') IS NOT NULL THEN
    BEGIN
      ALTER TABLE public.products
      ADD CONSTRAINT products_company_code_key UNIQUE (company_id, code);
    EXCEPTION WHEN duplicate_object THEN null;
    END;
  END IF;

  IF to_regclass('public.crm_leads') IS NOT NULL THEN
    BEGIN
      ALTER TABLE public.crm_leads
      ADD CONSTRAINT crm_leads_company_name_key UNIQUE (company_id, name);
    EXCEPTION WHEN duplicate_object THEN null;
    END;
  END IF;
END $$;

