
-- CRM Module Tables

-- Pipelines (Um funil de vendas)
CREATE TABLE IF NOT EXISTS crm_pipelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Stages (Etapas do funil)
CREATE TABLE IF NOT EXISTS crm_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pipeline_id UUID REFERENCES crm_pipelines(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    color TEXT DEFAULT '#cbd5e1', -- slate-300 default
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Opportunities (Negócios/Oportunidades)
CREATE TABLE IF NOT EXISTS crm_opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
    pipeline_id UUID REFERENCES crm_pipelines(id) ON DELETE CASCADE NOT NULL, -- Denormalized helper
    stage_id UUID REFERENCES crm_stages(id) ON DELETE SET NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    
    title TEXT NOT NULL,
    value NUMERIC(15, 2) DEFAULT 0,
    probability INTEGER DEFAULT 0, -- 0-100
    expected_close_date DATE,
    description TEXT,
    
    status TEXT DEFAULT 'open', -- 'open', 'won', 'lost', 'abandoned'
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS POLICIES
ALTER TABLE crm_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_opportunities ENABLE ROW LEVEL SECURITY;

-- Pipelines Policy
CREATE POLICY "Users can view pipelines of their companies" ON crm_pipelines
    FOR SELECT USING (
        company_id IN (
            SELECT id FROM companies WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage pipelines of their companies" ON crm_pipelines
    FOR ALL USING (
        company_id IN (
            SELECT id FROM companies WHERE owner_id = auth.uid()
        )
    );

-- Stages Policy
CREATE POLICY "Users can view stages via pipeline access" ON crm_stages
    FOR SELECT USING (
        pipeline_id IN (
            SELECT id FROM crm_pipelines WHERE company_id IN (
                SELECT id FROM companies WHERE owner_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage stages via pipeline" ON crm_stages
    FOR ALL USING (
        pipeline_id IN (
            SELECT id FROM crm_pipelines WHERE company_id IN (
                SELECT id FROM companies WHERE owner_id = auth.uid()
            )
        )
    );

-- Opportunities Policy
CREATE POLICY "Users can view opportunities of their companies" ON crm_opportunities
    FOR SELECT USING (
        company_id IN (
            SELECT id FROM companies WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage opportunities of their companies" ON crm_opportunities
    FOR ALL USING (
        company_id IN (
            SELECT id FROM companies WHERE owner_id = auth.uid()
        )
    );

-- Trigger to create default pipeline for new companies? 
-- Maybe handle this in application logic for now.

