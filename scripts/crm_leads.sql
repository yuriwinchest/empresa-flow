INSERT INTO public.crm_leads (company_id, name, cpf_cnpj, vertical, seller, reservation_validity, num_employees, revenue_range, address, complement, cep, neighborhood, city, state, country, phone, email) VALUES (
            '7109ea16-1ec9-43ed-8779-043a17626083',
            'Pessoa Física',
            NULL,
            NULL,
            NULL,
            NULL,
            NULL,
            NULL,
            NULL,
            NULL,
            NULL,
            NULL,
            NULL,
            NULL,
            NULL,
            NULL,
            NULL
        ) ON CONFLICT (company_id, name) DO NOTHING;