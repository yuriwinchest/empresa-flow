export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accounts_payable: {
        Row: {
          amount: number
          barcode: string | null
          category_id: string | null
          company_id: string
          created_at: string | null
          description: string
          due_date: string
          file_url: string | null
          id: string
          observations: string | null
          payment_date: string | null
          payment_method: string | null
          recurrence: string | null
          status: Database["public"]["Enums"]["finance_status"] | null
          supplier_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          barcode?: string | null
          category_id?: string | null
          company_id: string
          created_at?: string | null
          description: string
          due_date: string
          file_url?: string | null
          id?: string
          observations?: string | null
          payment_date?: string | null
          payment_method?: string | null
          recurrence?: string | null
          status?: Database["public"]["Enums"]["finance_status"] | null
          supplier_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          barcode?: string | null
          category_id?: string | null
          company_id?: string
          created_at?: string | null
          description?: string
          due_date?: string
          file_url?: string | null
          id?: string
          observations?: string | null
          payment_date?: string | null
          payment_method?: string | null
          recurrence?: string | null
          status?: Database["public"]["Enums"]["finance_status"] | null
          supplier_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_payable_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_payable_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_payable_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts_receivable: {
        Row: {
          amount: number
          category_id: string | null
          client_id: string | null
          company_id: string
          created_at: string | null
          description: string
          due_date: string
          file_url: string | null
          id: string
          observations: string | null
          payment_method: string | null
          receive_date: string | null
          recurrence: string | null
          status: Database["public"]["Enums"]["finance_status"] | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          category_id?: string | null
          client_id?: string | null
          company_id: string
          created_at?: string | null
          description: string
          due_date: string
          file_url?: string | null
          id?: string
          observations?: string | null
          payment_method?: string | null
          receive_date?: string | null
          recurrence?: string | null
          status?: Database["public"]["Enums"]["finance_status"] | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          client_id?: string | null
          company_id?: string
          created_at?: string | null
          description?: string
          due_date?: string
          file_url?: string | null
          id?: string
          observations?: string | null
          payment_method?: string | null
          receive_date?: string | null
          recurrence?: string | null
          status?: Database["public"]["Enums"]["finance_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_receivable_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          agencia: string | null
          banco: string | null
          company_id: string
          conta: string | null
          created_at: string
          credit_limit: number | null
          current_balance: number
          digito: string | null
          id: string
          initial_balance: number
          is_active: boolean
          name: string
          pix_key: string | null
          pix_type: string | null
          type: string
          updated_at: string
        }
        Insert: {
          agencia?: string | null
          banco?: string | null
          company_id: string
          conta?: string | null
          created_at?: string
          credit_limit?: number | null
          current_balance?: number
          digito?: string | null
          id?: string
          initial_balance?: number
          is_active?: boolean
          name: string
          pix_key?: string | null
          pix_type?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          agencia?: string | null
          banco?: string | null
          company_id?: string
          conta?: string | null
          created_at?: string
          credit_limit?: number | null
          current_balance?: number
          digito?: string | null
          id?: string
          initial_balance?: number
          is_active?: boolean
          name?: string
          pix_key?: string | null
          pix_type?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          code: string | null
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          celular: string | null
          cnae: string | null
          company_id: string
          contato_nome: string | null
          contribuinte: boolean | null
          cpf_cnpj: string | null
          created_at: string
          dados_bancarios_agencia: string | null
          dados_bancarios_banco: string | null
          dados_bancarios_conta: string | null
          dados_bancarios_pix: string | null
          dados_bancarios_tipo: string | null
          dados_bancarios_titular_cpf_cnpj: string | null
          dados_bancarios_titular_nome: string | null
          email: string | null
          endereco_bairro: string | null
          endereco_cep: string | null
          endereco_cidade: string | null
          endereco_complemento: string | null
          endereco_estado: string | null
          endereco_logradouro: string | null
          endereco_numero: string | null
          fax: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          inscricao_suframa: string | null
          is_active: boolean
          nome_fantasia: string | null
          observacoes: string | null
          observacoes_internas: string | null
          optante_simples: boolean | null
          produtor_rural: boolean | null
          razao_social: string
          tags: string[] | null
          telefone: string | null
          telefone_2: string | null
          tipo_atividade: string | null
          tipo_pessoa: string
          updated_at: string
          website: string | null
        }
        Insert: {
          celular?: string | null
          cnae?: string | null
          company_id: string
          contato_nome?: string | null
          contribuinte?: boolean | null
          cpf_cnpj?: string | null
          created_at?: string
          dados_bancarios_agencia?: string | null
          dados_bancarios_banco?: string | null
          dados_bancarios_conta?: string | null
          dados_bancarios_pix?: string | null
          dados_bancarios_tipo?: string | null
          dados_bancarios_titular_cpf_cnpj?: string | null
          dados_bancarios_titular_nome?: string | null
          email?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_estado?: string | null
          endereco_logradouro?: string | null
          endereco_numero?: string | null
          fax?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          inscricao_suframa?: string | null
          is_active?: boolean
          nome_fantasia?: string | null
          observacoes?: string | null
          observacoes_internas?: string | null
          optante_simples?: boolean | null
          produtor_rural?: boolean | null
          razao_social: string
          tags?: string[] | null
          telefone?: string | null
          telefone_2?: string | null
          tipo_atividade?: string | null
          tipo_pessoa?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          celular?: string | null
          cnae?: string | null
          company_id?: string
          contato_nome?: string | null
          contribuinte?: boolean | null
          cpf_cnpj?: string | null
          created_at?: string
          dados_bancarios_agencia?: string | null
          dados_bancarios_banco?: string | null
          dados_bancarios_conta?: string | null
          dados_bancarios_pix?: string | null
          dados_bancarios_tipo?: string | null
          dados_bancarios_titular_cpf_cnpj?: string | null
          dados_bancarios_titular_nome?: string | null
          email?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_estado?: string | null
          endereco_logradouro?: string | null
          endereco_numero?: string | null
          fax?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          inscricao_suframa?: string | null
          is_active?: boolean
          nome_fantasia?: string | null
          observacoes?: string | null
          observacoes_internas?: string | null
          optante_simples?: boolean | null
          produtor_rural?: boolean | null
          razao_social?: string
          tags?: string[] | null
          telefone?: string | null
          telefone_2?: string | null
          tipo_atividade?: string | null
          tipo_pessoa?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          celular: string | null
          cnae: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          endereco_bairro: string | null
          endereco_cep: string | null
          endereco_cidade: string | null
          endereco_complemento: string | null
          endereco_estado: string | null
          endereco_logradouro: string | null
          endereco_numero: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          is_active: boolean
          logo_url: string | null
          natureza_juridica: string | null
          nome_fantasia: string | null
          razao_social: string
          regime_tributario: string | null
          site: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          celular?: string | null
          cnae?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_estado?: string | null
          endereco_logradouro?: string | null
          endereco_numero?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          is_active?: boolean
          logo_url?: string | null
          natureza_juridica?: string | null
          nome_fantasia?: string | null
          razao_social: string
          regime_tributario?: string | null
          site?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          celular?: string | null
          cnae?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_estado?: string | null
          endereco_logradouro?: string | null
          endereco_numero?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          is_active?: boolean
          logo_url?: string | null
          natureza_juridica?: string | null
          nome_fantasia?: string | null
          razao_social?: string
          regime_tributario?: string | null
          site?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          celular: string | null
          cnae: string | null
          company_id: string
          contato_nome: string | null
          contribuinte: boolean | null
          cpf_cnpj: string | null
          created_at: string
          dados_bancarios_agencia: string | null
          dados_bancarios_banco: string | null
          dados_bancarios_conta: string | null
          dados_bancarios_pix: string | null
          dados_bancarios_tipo: string | null
          dados_bancarios_titular_cpf_cnpj: string | null
          dados_bancarios_titular_nome: string | null
          email: string | null
          endereco_bairro: string | null
          endereco_cep: string | null
          endereco_cidade: string | null
          endereco_complemento: string | null
          endereco_estado: string | null
          endereco_logradouro: string | null
          endereco_numero: string | null
          fax: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          inscricao_suframa: string | null
          is_active: boolean
          nome_fantasia: string | null
          observacoes: string | null
          observacoes_internas: string | null
          optante_simples: boolean | null
          produtor_rural: boolean | null
          razao_social: string
          tags: string[] | null
          telefone: string | null
          telefone_2: string | null
          tipo_atividade: string | null
          tipo_pessoa: string
          updated_at: string
          website: string | null
        }
        Insert: {
          celular?: string | null
          cnae?: string | null
          company_id: string
          contato_nome?: string | null
          contribuinte?: boolean | null
          cpf_cnpj?: string | null
          created_at?: string
          dados_bancarios_agencia?: string | null
          dados_bancarios_banco?: string | null
          dados_bancarios_conta?: string | null
          dados_bancarios_pix?: string | null
          dados_bancarios_tipo?: string | null
          dados_bancarios_titular_cpf_cnpj?: string | null
          dados_bancarios_titular_nome?: string | null
          email?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_estado?: string | null
          endereco_logradouro?: string | null
          endereco_numero?: string | null
          fax?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          inscricao_suframa?: string | null
          is_active?: boolean
          nome_fantasia?: string | null
          observacoes?: string | null
          observacoes_internas?: string | null
          optante_simples?: boolean | null
          produtor_rural?: boolean | null
          razao_social: string
          tags?: string[] | null
          telefone?: string | null
          telefone_2?: string | null
          tipo_atividade?: string | null
          tipo_pessoa?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          celular?: string | null
          cnae?: string | null
          company_id?: string
          contato_nome?: string | null
          contribuinte?: boolean | null
          cpf_cnpj?: string | null
          created_at?: string
          dados_bancarios_agencia?: string | null
          dados_bancarios_banco?: string | null
          dados_bancarios_conta?: string | null
          dados_bancarios_pix?: string | null
          dados_bancarios_tipo?: string | null
          dados_bancarios_titular_cpf_cnpj?: string | null
          dados_bancarios_titular_nome?: string | null
          email?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_estado?: string | null
          endereco_logradouro?: string | null
          endereco_numero?: string | null
          fax?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          inscricao_suframa?: string | null
          is_active?: boolean
          nome_fantasia?: string | null
          observacoes?: string | null
          observacoes_internas?: string | null
          optante_simples?: boolean | null
          produtor_rural?: boolean | null
          razao_social?: string
          tags?: string[] | null
          telefone?: string | null
          telefone_2?: string | null
          tipo_atividade?: string | null
          tipo_pessoa?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          bank_account_id: string | null
          category_id: string | null
          company_id: string
          created_at: string | null
          date: string
          description: string
          id: string
          related_payable_id: string | null
          related_receivable_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          category_id?: string | null
          company_id: string
          created_at?: string | null
          date: string
          description: string
          id?: string
          related_payable_id?: string | null
          related_receivable_id?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          category_id?: string | null
          company_id?: string
          created_at?: string | null
          date?: string
          description?: string
          id?: string
          related_payable_id?: string | null
          related_receivable_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_related_payable_id_fkey"
            columns: ["related_payable_id"]
            isOneToOne: false
            referencedRelation: "accounts_payable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_related_receivable_id_fkey"
            columns: ["related_receivable_id"]
            isOneToOne: false
            referencedRelation: "accounts_receivable"
            referencedColumns: ["id"]
          },
        ]
      }
      user_companies: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_default: boolean
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_default?: boolean
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_default?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_company_access: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      process_payment: {
        Args: {
          p_account_id: string
          p_amount: number
          p_bank_account_id: string
          p_payment_date: string
        }
        Returns: undefined
      }
      process_receipt: {
        Args: {
          p_account_id: string
          p_amount: number
          p_bank_account_id: string
          p_receive_date: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "user"
      finance_status: "pending" | "paid" | "cancelled" | "overdue"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "manager", "user"],
      finance_status: ["pending", "paid", "cancelled", "overdue"],
    },
  },
} as const
