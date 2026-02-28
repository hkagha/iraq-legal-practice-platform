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
      client_contacts: {
        Row: {
          client_id: string
          created_at: string
          department: string | null
          department_ar: string | null
          email: string | null
          first_name: string
          first_name_ar: string | null
          id: string
          is_primary: boolean
          job_title: string | null
          job_title_ar: string | null
          last_name: string
          last_name_ar: string | null
          notes: string | null
          organization_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          department?: string | null
          department_ar?: string | null
          email?: string | null
          first_name: string
          first_name_ar?: string | null
          id?: string
          is_primary?: boolean
          job_title?: string | null
          job_title_ar?: string | null
          last_name: string
          last_name_ar?: string | null
          notes?: string | null
          organization_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          department?: string | null
          department_ar?: string | null
          email?: string | null
          first_name?: string
          first_name_ar?: string | null
          id?: string
          is_primary?: boolean
          job_title?: string | null
          job_title_ar?: string | null
          last_name?: string
          last_name_ar?: string | null
          notes?: string | null
          organization_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_user_links: {
        Row: {
          client_id: string
          created_at: string
          id: string
          organization_id: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          organization_id: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_user_links_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_user_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          address_ar: string | null
          city: string | null
          city_ar: string | null
          client_type: string
          company_name: string | null
          company_name_ar: string | null
          company_registration_number: string | null
          company_type: string | null
          country: string | null
          created_at: string
          created_by: string | null
          credit_limit: number | null
          date_of_birth: string | null
          email: string | null
          first_name: string | null
          first_name_ar: string | null
          gender: string | null
          governorate: string
          id: string
          industry: string | null
          industry_ar: string | null
          last_name: string | null
          last_name_ar: string | null
          national_id_number: string | null
          nationality: string | null
          notes: string | null
          notes_ar: string | null
          organization_id: string
          payment_terms_days: number | null
          phone: string | null
          postal_code: string | null
          preferred_currency: string | null
          profile_image_url: string | null
          secondary_phone: string | null
          source: string | null
          source_details: string | null
          status: string
          tags: string[] | null
          tax_id: string | null
          updated_at: string
          updated_by: string | null
          whatsapp_number: string | null
        }
        Insert: {
          address?: string | null
          address_ar?: string | null
          city?: string | null
          city_ar?: string | null
          client_type: string
          company_name?: string | null
          company_name_ar?: string | null
          company_registration_number?: string | null
          company_type?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          credit_limit?: number | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          first_name_ar?: string | null
          gender?: string | null
          governorate?: string
          id?: string
          industry?: string | null
          industry_ar?: string | null
          last_name?: string | null
          last_name_ar?: string | null
          national_id_number?: string | null
          nationality?: string | null
          notes?: string | null
          notes_ar?: string | null
          organization_id: string
          payment_terms_days?: number | null
          phone?: string | null
          postal_code?: string | null
          preferred_currency?: string | null
          profile_image_url?: string | null
          secondary_phone?: string | null
          source?: string | null
          source_details?: string | null
          status?: string
          tags?: string[] | null
          tax_id?: string | null
          updated_at?: string
          updated_by?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          address?: string | null
          address_ar?: string | null
          city?: string | null
          city_ar?: string | null
          client_type?: string
          company_name?: string | null
          company_name_ar?: string | null
          company_registration_number?: string | null
          company_type?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          credit_limit?: number | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          first_name_ar?: string | null
          gender?: string | null
          governorate?: string
          id?: string
          industry?: string | null
          industry_ar?: string | null
          last_name?: string | null
          last_name_ar?: string | null
          national_id_number?: string | null
          nationality?: string | null
          notes?: string | null
          notes_ar?: string | null
          organization_id?: string
          payment_terms_days?: number | null
          phone?: string | null
          postal_code?: string | null
          preferred_currency?: string | null
          profile_image_url?: string | null
          secondary_phone?: string | null
          source?: string | null
          source_details?: string | null
          status?: string
          tags?: string[] | null
          tax_id?: string | null
          updated_at?: string
          updated_by?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          first_name: string | null
          id: string
          invited_by: string
          last_name: string | null
          organization_id: string
          role: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          first_name?: string | null
          id?: string
          invited_by: string
          last_name?: string | null
          organization_id: string
          role: string
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          first_name?: string | null
          id?: string
          invited_by?: string
          last_name?: string | null
          organization_id?: string
          role?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          address_ar: string | null
          bank_account_number: string | null
          bank_iban: string | null
          bank_name: string | null
          case_next_number: number | null
          case_prefix: string | null
          city: string | null
          created_at: string
          default_currency: string
          default_language: string
          default_payment_terms_days: number | null
          default_tax_rate: number | null
          email: string | null
          errand_next_number: number | null
          errand_prefix: string | null
          governorate: string | null
          id: string
          invoice_footer_text: string | null
          invoice_footer_text_ar: string | null
          invoice_next_number: number | null
          invoice_prefix: string | null
          is_active: boolean
          letterhead_url: string | null
          logo_url: string | null
          max_storage_mb: number
          max_users: number
          name: string
          name_ar: string
          phone: string | null
          registration_number: string | null
          slug: string
          subscription_status: string
          subscription_tier: string
          tax_id: string | null
          trial_ends_at: string | null
          updated_at: string
          website: string | null
          working_days: string[] | null
          working_hours_end: string | null
          working_hours_start: string | null
        }
        Insert: {
          address?: string | null
          address_ar?: string | null
          bank_account_number?: string | null
          bank_iban?: string | null
          bank_name?: string | null
          case_next_number?: number | null
          case_prefix?: string | null
          city?: string | null
          created_at?: string
          default_currency?: string
          default_language?: string
          default_payment_terms_days?: number | null
          default_tax_rate?: number | null
          email?: string | null
          errand_next_number?: number | null
          errand_prefix?: string | null
          governorate?: string | null
          id?: string
          invoice_footer_text?: string | null
          invoice_footer_text_ar?: string | null
          invoice_next_number?: number | null
          invoice_prefix?: string | null
          is_active?: boolean
          letterhead_url?: string | null
          logo_url?: string | null
          max_storage_mb?: number
          max_users?: number
          name: string
          name_ar: string
          phone?: string | null
          registration_number?: string | null
          slug: string
          subscription_status?: string
          subscription_tier?: string
          tax_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          website?: string | null
          working_days?: string[] | null
          working_hours_end?: string | null
          working_hours_start?: string | null
        }
        Update: {
          address?: string | null
          address_ar?: string | null
          bank_account_number?: string | null
          bank_iban?: string | null
          bank_name?: string | null
          case_next_number?: number | null
          case_prefix?: string | null
          city?: string | null
          created_at?: string
          default_currency?: string
          default_language?: string
          default_payment_terms_days?: number | null
          default_tax_rate?: number | null
          email?: string | null
          errand_next_number?: number | null
          errand_prefix?: string | null
          governorate?: string | null
          id?: string
          invoice_footer_text?: string | null
          invoice_footer_text_ar?: string | null
          invoice_next_number?: number | null
          invoice_prefix?: string | null
          is_active?: boolean
          letterhead_url?: string | null
          logo_url?: string | null
          max_storage_mb?: number
          max_users?: number
          name?: string
          name_ar?: string
          phone?: string | null
          registration_number?: string | null
          slug?: string
          subscription_status?: string
          subscription_tier?: string
          tax_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          website?: string | null
          working_days?: string[] | null
          working_hours_end?: string | null
          working_hours_start?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          first_name: string
          first_name_ar: string | null
          id: string
          is_active: boolean
          job_title: string | null
          job_title_ar: string | null
          language_preference: string
          last_active_at: string | null
          last_name: string
          last_name_ar: string | null
          notification_preferences: Json | null
          organization_id: string | null
          phone: string | null
          role: string
          secondary_phone: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          first_name?: string
          first_name_ar?: string | null
          id: string
          is_active?: boolean
          job_title?: string | null
          job_title_ar?: string | null
          language_preference?: string
          last_active_at?: string | null
          last_name?: string
          last_name_ar?: string | null
          notification_preferences?: Json | null
          organization_id?: string | null
          phone?: string | null
          role?: string
          secondary_phone?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          first_name?: string
          first_name_ar?: string | null
          id?: string
          is_active?: boolean
          job_title?: string | null
          job_title_ar?: string | null
          language_preference?: string
          last_active_at?: string | null
          last_name?: string
          last_name_ar?: string | null
          notification_preferences?: Json | null
          organization_id?: string | null
          phone?: string | null
          role?: string
          secondary_phone?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
