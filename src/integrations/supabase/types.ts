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
      case_activities: {
        Row: {
          activity_type: string
          actor_id: string | null
          case_id: string
          created_at: string
          description: string | null
          description_ar: string | null
          id: string
          metadata: Json | null
          organization_id: string
          title: string
          title_ar: string | null
        }
        Insert: {
          activity_type: string
          actor_id?: string | null
          case_id: string
          created_at?: string
          description?: string | null
          description_ar?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          title: string
          title_ar?: string | null
        }
        Update: {
          activity_type?: string
          actor_id?: string | null
          case_id?: string
          created_at?: string
          description?: string | null
          description_ar?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          title?: string
          title_ar?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_activities_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_activities_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      case_hearings: {
        Row: {
          adjournment_reason: string | null
          adjournment_reason_ar: string | null
          case_id: string
          court_room: string | null
          created_at: string
          created_by: string | null
          hearing_date: string
          hearing_time: string | null
          hearing_type: string
          id: string
          is_visible_to_client: boolean
          judge_name: string | null
          judge_name_ar: string | null
          next_hearing_date: string | null
          notes: string | null
          notes_ar: string | null
          organization_id: string
          outcome: string | null
          outcome_ar: string | null
          status: string
          updated_at: string
        }
        Insert: {
          adjournment_reason?: string | null
          adjournment_reason_ar?: string | null
          case_id: string
          court_room?: string | null
          created_at?: string
          created_by?: string | null
          hearing_date: string
          hearing_time?: string | null
          hearing_type: string
          id?: string
          is_visible_to_client?: boolean
          judge_name?: string | null
          judge_name_ar?: string | null
          next_hearing_date?: string | null
          notes?: string | null
          notes_ar?: string | null
          organization_id: string
          outcome?: string | null
          outcome_ar?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          adjournment_reason?: string | null
          adjournment_reason_ar?: string | null
          case_id?: string
          court_room?: string | null
          created_at?: string
          created_by?: string | null
          hearing_date?: string
          hearing_time?: string | null
          hearing_type?: string
          id?: string
          is_visible_to_client?: boolean
          judge_name?: string | null
          judge_name_ar?: string | null
          next_hearing_date?: string | null
          notes?: string | null
          notes_ar?: string | null
          organization_id?: string
          outcome?: string | null
          outcome_ar?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_hearings_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_hearings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_hearings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      case_notes: {
        Row: {
          author_id: string
          case_id: string
          content: string
          content_ar: string | null
          created_at: string
          id: string
          is_pinned: boolean
          is_visible_to_client: boolean
          organization_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          case_id: string
          content: string
          content_ar?: string | null
          created_at?: string
          id?: string
          is_pinned?: boolean
          is_visible_to_client?: boolean
          organization_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          case_id?: string
          content?: string
          content_ar?: string | null
          created_at?: string
          id?: string
          is_pinned?: boolean
          is_visible_to_client?: boolean
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_notes_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      case_team_members: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          case_id: string
          id: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          case_id: string
          id?: string
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          case_id?: string
          id?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_team_members_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_team_members_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_team_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          billing_type: string | null
          case_number: string
          case_type: string
          client_id: string
          closed_at: string | null
          closed_by: string | null
          contingency_percentage: number | null
          court_case_number: string | null
          court_chamber: string | null
          court_location: string | null
          court_location_ar: string | null
          court_name: string | null
          court_name_ar: string | null
          court_type: string | null
          created_at: string
          created_by: string | null
          description: string | null
          description_ar: string | null
          estimated_value: number | null
          estimated_value_currency: string | null
          filing_date: string | null
          fixed_fee_amount: number | null
          hourly_rate: number | null
          id: string
          is_visible_to_client: boolean
          judge_name: string | null
          judge_name_ar: string | null
          opposing_party_lawyer: string | null
          opposing_party_lawyer_ar: string | null
          opposing_party_name: string | null
          opposing_party_name_ar: string | null
          opposing_party_phone: string | null
          organization_id: string
          outcome_date: string | null
          outcome_summary: string | null
          outcome_summary_ar: string | null
          priority: string
          retainer_amount: number | null
          status: string
          statute_of_limitations: string | null
          title: string
          title_ar: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          billing_type?: string | null
          case_number: string
          case_type: string
          client_id: string
          closed_at?: string | null
          closed_by?: string | null
          contingency_percentage?: number | null
          court_case_number?: string | null
          court_chamber?: string | null
          court_location?: string | null
          court_location_ar?: string | null
          court_name?: string | null
          court_name_ar?: string | null
          court_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_ar?: string | null
          estimated_value?: number | null
          estimated_value_currency?: string | null
          filing_date?: string | null
          fixed_fee_amount?: number | null
          hourly_rate?: number | null
          id?: string
          is_visible_to_client?: boolean
          judge_name?: string | null
          judge_name_ar?: string | null
          opposing_party_lawyer?: string | null
          opposing_party_lawyer_ar?: string | null
          opposing_party_name?: string | null
          opposing_party_name_ar?: string | null
          opposing_party_phone?: string | null
          organization_id: string
          outcome_date?: string | null
          outcome_summary?: string | null
          outcome_summary_ar?: string | null
          priority?: string
          retainer_amount?: number | null
          status?: string
          statute_of_limitations?: string | null
          title: string
          title_ar?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          billing_type?: string | null
          case_number?: string
          case_type?: string
          client_id?: string
          closed_at?: string | null
          closed_by?: string | null
          contingency_percentage?: number | null
          court_case_number?: string | null
          court_chamber?: string | null
          court_location?: string | null
          court_location_ar?: string | null
          court_name?: string | null
          court_name_ar?: string | null
          court_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_ar?: string | null
          estimated_value?: number | null
          estimated_value_currency?: string | null
          filing_date?: string | null
          fixed_fee_amount?: number | null
          hourly_rate?: number | null
          id?: string
          is_visible_to_client?: boolean
          judge_name?: string | null
          judge_name_ar?: string | null
          opposing_party_lawyer?: string | null
          opposing_party_lawyer_ar?: string | null
          opposing_party_name?: string | null
          opposing_party_name_ar?: string | null
          opposing_party_phone?: string | null
          organization_id?: string
          outcome_date?: string | null
          outcome_summary?: string | null
          outcome_summary_ar?: string | null
          priority?: string
          retainer_amount?: number | null
          status?: string
          statute_of_limitations?: string | null
          title?: string
          title_ar?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_activities: {
        Row: {
          activity_type: string
          actor_id: string | null
          client_id: string
          created_at: string
          description: string | null
          description_ar: string | null
          id: string
          metadata: Json | null
          organization_id: string
          related_entity_id: string | null
          related_entity_type: string | null
          title: string
          title_ar: string | null
        }
        Insert: {
          activity_type: string
          actor_id?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          description_ar?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          title: string
          title_ar?: string | null
        }
        Update: {
          activity_type?: string
          actor_id?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          description_ar?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          title?: string
          title_ar?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_activities_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
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
      errand_activities: {
        Row: {
          activity_type: string
          actor_id: string | null
          created_at: string
          description: string | null
          description_ar: string | null
          errand_id: string
          id: string
          metadata: Json | null
          organization_id: string
          title: string
          title_ar: string | null
        }
        Insert: {
          activity_type: string
          actor_id?: string | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          errand_id: string
          id?: string
          metadata?: Json | null
          organization_id: string
          title: string
          title_ar?: string | null
        }
        Update: {
          activity_type?: string
          actor_id?: string | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          errand_id?: string
          id?: string
          metadata?: Json | null
          organization_id?: string
          title?: string
          title_ar?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "errand_activities_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "errand_activities_errand_id_fkey"
            columns: ["errand_id"]
            isOneToOne: false
            referencedRelation: "errands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "errand_activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      errand_documents: {
        Row: {
          created_at: string
          document_type: string | null
          errand_id: string
          errand_step_id: string | null
          file_name: string
          file_name_ar: string | null
          file_path: string
          file_size_bytes: number | null
          file_type: string | null
          id: string
          is_visible_to_client: boolean | null
          organization_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          document_type?: string | null
          errand_id: string
          errand_step_id?: string | null
          file_name: string
          file_name_ar?: string | null
          file_path: string
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
          is_visible_to_client?: boolean | null
          organization_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string | null
          errand_id?: string
          errand_step_id?: string | null
          file_name?: string
          file_name_ar?: string | null
          file_path?: string
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
          is_visible_to_client?: boolean | null
          organization_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "errand_documents_errand_id_fkey"
            columns: ["errand_id"]
            isOneToOne: false
            referencedRelation: "errands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "errand_documents_errand_step_id_fkey"
            columns: ["errand_step_id"]
            isOneToOne: false
            referencedRelation: "errand_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "errand_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "errand_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      errand_steps: {
        Row: {
          assigned_to: string | null
          attachments_count: number | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          description: string | null
          description_ar: string | null
          due_date: string | null
          errand_id: string
          id: string
          is_required: boolean | null
          notes: string | null
          notes_ar: string | null
          organization_id: string
          status: string
          step_number: number
          title: string
          title_ar: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          attachments_count?: number | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          due_date?: string | null
          errand_id: string
          id?: string
          is_required?: boolean | null
          notes?: string | null
          notes_ar?: string | null
          organization_id: string
          status?: string
          step_number: number
          title: string
          title_ar?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          attachments_count?: number | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          due_date?: string | null
          errand_id?: string
          id?: string
          is_required?: boolean | null
          notes?: string | null
          notes_ar?: string | null
          organization_id?: string
          status?: string
          step_number?: number
          title?: string
          title_ar?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "errand_steps_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "errand_steps_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "errand_steps_errand_id_fkey"
            columns: ["errand_id"]
            isOneToOne: false
            referencedRelation: "errands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "errand_steps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      errand_templates: {
        Row: {
          category: string
          created_at: string
          description: string | null
          description_ar: string | null
          id: string
          is_system: boolean | null
          name: string
          name_ar: string | null
          organization_id: string | null
          steps: Json
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          description_ar?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          name_ar?: string | null
          organization_id?: string | null
          steps?: Json
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          description_ar?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          name_ar?: string | null
          organization_id?: string | null
          steps?: Json
        }
        Relationships: [
          {
            foreignKeyName: "errand_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      errands: {
        Row: {
          assigned_to: string | null
          case_id: string | null
          category: string
          client_id: string
          completed_date: string | null
          completed_steps: number | null
          created_at: string
          created_by: string | null
          description: string | null
          description_ar: string | null
          due_date: string | null
          errand_number: string
          fees_paid: boolean | null
          government_department: string | null
          government_department_ar: string | null
          government_entity: string | null
          government_entity_ar: string | null
          government_fees: number | null
          government_fees_currency: string | null
          id: string
          is_visible_to_client: boolean
          organization_id: string
          outcome_notes: string | null
          outcome_notes_ar: string | null
          priority: string
          progress_percentage: number | null
          reference_number: string | null
          rejection_reason: string | null
          rejection_reason_ar: string | null
          service_fee: number | null
          service_fee_currency: string | null
          start_date: string | null
          status: string
          title: string
          title_ar: string | null
          total_cost: number | null
          total_steps: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assigned_to?: string | null
          case_id?: string | null
          category: string
          client_id: string
          completed_date?: string | null
          completed_steps?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_ar?: string | null
          due_date?: string | null
          errand_number?: string
          fees_paid?: boolean | null
          government_department?: string | null
          government_department_ar?: string | null
          government_entity?: string | null
          government_entity_ar?: string | null
          government_fees?: number | null
          government_fees_currency?: string | null
          id?: string
          is_visible_to_client?: boolean
          organization_id: string
          outcome_notes?: string | null
          outcome_notes_ar?: string | null
          priority?: string
          progress_percentage?: number | null
          reference_number?: string | null
          rejection_reason?: string | null
          rejection_reason_ar?: string | null
          service_fee?: number | null
          service_fee_currency?: string | null
          start_date?: string | null
          status?: string
          title: string
          title_ar?: string | null
          total_cost?: number | null
          total_steps?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assigned_to?: string | null
          case_id?: string | null
          category?: string
          client_id?: string
          completed_date?: string | null
          completed_steps?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_ar?: string | null
          due_date?: string | null
          errand_number?: string
          fees_paid?: boolean | null
          government_department?: string | null
          government_department_ar?: string | null
          government_entity?: string | null
          government_entity_ar?: string | null
          government_fees?: number | null
          government_fees_currency?: string | null
          id?: string
          is_visible_to_client?: boolean
          organization_id?: string
          outcome_notes?: string | null
          outcome_notes_ar?: string | null
          priority?: string
          progress_percentage?: number | null
          reference_number?: string | null
          rejection_reason?: string | null
          rejection_reason_ar?: string | null
          service_fee?: number | null
          service_fee_currency?: string | null
          start_date?: string | null
          status?: string
          title?: string
          title_ar?: string | null
          total_cost?: number | null
          total_steps?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "errands_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "errands_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "errands_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "errands_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "errands_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "errands_updated_by_fkey"
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
