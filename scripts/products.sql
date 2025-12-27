INSERT INTO public.products (company_id, code, description, family, ncm, cest, ean, price, type_sped, is_active) VALUES (
        '7109ea16-1ec9-43ed-8779-043a17626083', 
        'PRD00001', 
        'Minoxidil', 
        NULL, 
        '2933.59.91', 
        NULL, 
        NULL, 
        150, 
        '99 - Outras', 
        true
    ) ON CONFLICT (company_id, code) DO NOTHING;
INSERT INTO public.products (company_id, code, description, family, ncm, cest, ean, price, type_sped, is_active) VALUES (
        '7109ea16-1ec9-43ed-8779-043a17626083', 
        'PRD00004', 
        'Óleo de ozônio', 
        NULL, 
        '3307.90.00', 
        NULL, 
        NULL, 
        120, 
        '99 - Outras', 
        true
    ) ON CONFLICT (company_id, code) DO NOTHING;
INSERT INTO public.products (company_id, code, description, family, ncm, cest, ean, price, type_sped, is_active) VALUES (
        '7109ea16-1ec9-43ed-8779-043a17626083', 
        'PRD00003', 
        'Shampoo', 
        NULL, 
        '3305.10.00', 
        NULL, 
        NULL, 
        130, 
        '99 - Outras', 
        true
    ) ON CONFLICT (company_id, code) DO NOTHING;
INSERT INTO public.products (company_id, code, description, family, ncm, cest, ean, price, type_sped, is_active) VALUES (
        '7109ea16-1ec9-43ed-8779-043a17626083', 
        'PRD00002', 
        'Suplemento vitamínico', 
        NULL, 
        '2936.29.90', 
        NULL, 
        NULL, 
        550, 
        '99 - Outras', 
        true
    ) ON CONFLICT (company_id, code) DO NOTHING;