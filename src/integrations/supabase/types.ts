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
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          target_id: string | null
          target_name: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_name?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_name?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_log: {
        Row: {
          completion_tokens: number
          created_at: string
          duration_ms: number | null
          error_message: string | null
          feature: string
          id: string
          input_preview: string | null
          model: string | null
          organization_id: string
          output_preview: string | null
          prompt_tokens: number
          status: string
          total_tokens: number
          user_id: string
        }
        Insert: {
          completion_tokens?: number
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          feature: string
          id?: string
          input_preview?: string | null
          model?: string | null
          organization_id: string
          output_preview?: string | null
          prompt_tokens?: number
          status?: string
          total_tokens?: number
          user_id: string
        }
        Update: {
          completion_tokens?: number
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          feature?: string
          id?: string
          input_preview?: string | null
          model?: string | null
          organization_id?: string
          output_preview?: string | null
          prompt_tokens?: number
          status?: string
          total_tokens?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_schedules: {
        Row: {
          created_at: string
          created_by: string
          day_of_month: number | null
          day_of_week: number | null
          frequency: string
          id: string
          includes_database: boolean
          includes_storage: boolean
          is_active: boolean
          last_run_at: string | null
          last_run_status: string | null
          max_backups: number
          name: string
          next_run_at: string | null
          organization_id: string | null
          preferred_time: string
          retention_days: number
          scope: string
          tables_included: string[] | null
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          day_of_month?: number | null
          day_of_week?: number | null
          frequency: string
          id?: string
          includes_database?: boolean
          includes_storage?: boolean
          is_active?: boolean
          last_run_at?: string | null
          last_run_status?: string | null
          max_backups?: number
          name: string
          next_run_at?: string | null
          organization_id?: string | null
          preferred_time?: string
          retention_days?: number
          scope: string
          tables_included?: string[] | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          day_of_month?: number | null
          day_of_week?: number | null
          frequency?: string
          id?: string
          includes_database?: boolean
          includes_storage?: boolean
          is_active?: boolean
          last_run_at?: string | null
          last_run_status?: string | null
          max_backups?: number
          name?: string
          next_run_at?: string | null
          organization_id?: string | null
          preferred_time?: string
          retention_days?: number
          scope?: string
          tables_included?: string[] | null
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "backup_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backup_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_rates: {
        Row: {
          case_id: string | null
          created_at: string
          currency: string
          effective_from: string
          effective_to: string | null
          id: string
          is_default: boolean | null
          organization_id: string
          rate: number
          user_id: string | null
        }
        Insert: {
          case_id?: string | null
          created_at?: string
          currency?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_default?: boolean | null
          organization_id: string
          rate: number
          user_id?: string | null
        }
        Update: {
          case_id?: string | null
          created_at?: string
          currency?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_default?: boolean | null
          organization_id?: string
          rate?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_rates_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_rates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          case_id: string | null
          color: string | null
          created_at: string
          created_by: string
          description: string | null
          description_ar: string | null
          end_date: string | null
          end_time: string | null
          entity_id: string | null
          event_type: string
          id: string
          is_all_day: boolean | null
          is_recurring: boolean | null
          is_virtual: boolean | null
          location: string | null
          location_ar: string | null
          organization_id: string
          participants: string[] | null
          party_type: string | null
          person_id: string | null
          recurrence_end_date: string | null
          recurrence_pattern: string | null
          start_date: string
          start_time: string | null
          title: string
          title_ar: string | null
          updated_at: string
          virtual_link: string | null
        }
        Insert: {
          case_id?: string | null
          color?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          description_ar?: string | null
          end_date?: string | null
          end_time?: string | null
          entity_id?: string | null
          event_type?: string
          id?: string
          is_all_day?: boolean | null
          is_recurring?: boolean | null
          is_virtual?: boolean | null
          location?: string | null
          location_ar?: string | null
          organization_id: string
          participants?: string[] | null
          party_type?: string | null
          person_id?: string | null
          recurrence_end_date?: string | null
          recurrence_pattern?: string | null
          start_date: string
          start_time?: string | null
          title: string
          title_ar?: string | null
          updated_at?: string
          virtual_link?: string | null
        }
        Update: {
          case_id?: string | null
          color?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          description_ar?: string | null
          end_date?: string | null
          end_time?: string | null
          entity_id?: string | null
          event_type?: string
          id?: string
          is_all_day?: boolean | null
          is_recurring?: boolean | null
          is_virtual?: boolean | null
          location?: string | null
          location_ar?: string | null
          organization_id?: string
          participants?: string[] | null
          party_type?: string | null
          person_id?: string | null
          recurrence_end_date?: string | null
          recurrence_pattern?: string | null
          start_date?: string
          start_time?: string | null
          title?: string
          title_ar?: string | null
          updated_at?: string
          virtual_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
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
      case_notification_recipients: {
        Row: {
          case_id: string
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          person_id: string
          receives_email: boolean
          receives_in_app: boolean
          receives_whatsapp: boolean
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          person_id: string
          receives_email?: boolean
          receives_in_app?: boolean
          receives_whatsapp?: boolean
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          person_id?: string
          receives_email?: boolean
          receives_in_app?: boolean
          receives_whatsapp?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "case_notification_recipients_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_notification_recipients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_notification_recipients_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      case_parties: {
        Row: {
          case_id: string
          created_at: string
          entity_id: string | null
          id: string
          is_primary: boolean
          notes: string | null
          organization_id: string
          party_type: string
          person_id: string | null
          represented_by_person_id: string | null
          role: string
        }
        Insert: {
          case_id: string
          created_at?: string
          entity_id?: string | null
          id?: string
          is_primary?: boolean
          notes?: string | null
          organization_id: string
          party_type: string
          person_id?: string | null
          represented_by_person_id?: string | null
          role?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          entity_id?: string | null
          id?: string
          is_primary?: boolean
          notes?: string | null
          organization_id?: string
          party_type?: string
          person_id?: string | null
          represented_by_person_id?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_parties_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_parties_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_parties_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_parties_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_parties_represented_by_person_id_fkey"
            columns: ["represented_by_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
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
          ai_summary: Json | null
          ai_summary_generated_at: string | null
          billing_type: string | null
          case_number: string
          case_type: string
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
          ai_summary?: Json | null
          ai_summary_generated_at?: string | null
          billing_type?: string | null
          case_number: string
          case_type: string
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
          ai_summary?: Json | null
          ai_summary_generated_at?: string | null
          billing_type?: string | null
          case_number?: string
          case_type?: string
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
      client_messages: {
        Row: {
          attachments: Json | null
          case_id: string | null
          content: string
          created_at: string
          entity_id: string | null
          errand_id: string | null
          id: string
          is_read: boolean
          organization_id: string
          party_type: string
          person_id: string | null
          read_at: string | null
          sender_id: string
          sender_type: string
        }
        Insert: {
          attachments?: Json | null
          case_id?: string | null
          content: string
          created_at?: string
          entity_id?: string | null
          errand_id?: string | null
          id?: string
          is_read?: boolean
          organization_id: string
          party_type: string
          person_id?: string | null
          read_at?: string | null
          sender_id: string
          sender_type?: string
        }
        Update: {
          attachments?: Json | null
          case_id?: string | null
          content?: string
          created_at?: string
          entity_id?: string | null
          errand_id?: string | null
          id?: string
          is_read?: boolean
          organization_id?: string
          party_type?: string
          person_id?: string | null
          read_at?: string | null
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_messages_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_messages_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_messages_errand_id_fkey"
            columns: ["errand_id"]
            isOneToOne: false
            referencedRelation: "errands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_messages_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_activities: {
        Row: {
          activity_type: string
          actor_id: string | null
          created_at: string
          document_id: string
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
          document_id: string
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
          document_id?: string
          id?: string
          metadata?: Json | null
          organization_id?: string
          title?: string
          title_ar?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_activities_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_activities_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      document_comments: {
        Row: {
          author_id: string
          author_type: string
          content: string
          content_ar: string | null
          created_at: string
          document_id: string
          id: string
          is_visible_to_client: boolean
          organization_id: string
          parent_comment_id: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          author_type?: string
          content: string
          content_ar?: string | null
          created_at?: string
          document_id: string
          id?: string
          is_visible_to_client?: boolean
          organization_id: string
          parent_comment_id?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          author_type?: string
          content?: string
          content_ar?: string | null
          created_at?: string
          document_id?: string
          id?: string
          is_visible_to_client?: boolean
          organization_id?: string
          parent_comment_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_comments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_comments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "document_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string | null
          description: string | null
          description_ar: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          language: string
          name: string
          name_ar: string | null
          organization_id: string | null
          placeholders: Json | null
          updated_at: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_ar?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          language?: string
          name: string
          name_ar?: string | null
          organization_id?: string | null
          placeholders?: Json | null
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_ar?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          language?: string
          name?: string
          name_ar?: string | null
          organization_id?: string | null
          placeholders?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          ai_dates: Json | null
          ai_doc_type: string | null
          ai_language: string | null
          ai_organizations: string[] | null
          ai_people: string[] | null
          ai_places: string[] | null
          ai_summary: string | null
          ai_tags: string[] | null
          case_id: string | null
          created_at: string
          description: string | null
          description_ar: string | null
          document_category: string
          entity_id: string | null
          errand_id: string | null
          extracted_text: string | null
          file_name: string
          file_name_ar: string | null
          file_path: string
          file_size_bytes: number
          file_type: string
          folder_path: string | null
          id: string
          indexed_at: string | null
          indexing_attempts: number
          indexing_error: string | null
          indexing_status: string
          is_latest_version: boolean
          is_visible_to_client: boolean
          last_accessed_at: string | null
          last_accessed_by: string | null
          library_tags: string[] | null
          mime_type: string | null
          organization_id: string
          parent_document_id: string | null
          party_type: string | null
          person_id: string | null
          search_tsv: unknown
          status: string
          tags: string[] | null
          title: string | null
          title_ar: string | null
          updated_at: string
          uploaded_by: string
          version: number
          visibility_scope: string
        }
        Insert: {
          ai_dates?: Json | null
          ai_doc_type?: string | null
          ai_language?: string | null
          ai_organizations?: string[] | null
          ai_people?: string[] | null
          ai_places?: string[] | null
          ai_summary?: string | null
          ai_tags?: string[] | null
          case_id?: string | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          document_category?: string
          entity_id?: string | null
          errand_id?: string | null
          extracted_text?: string | null
          file_name: string
          file_name_ar?: string | null
          file_path: string
          file_size_bytes: number
          file_type: string
          folder_path?: string | null
          id?: string
          indexed_at?: string | null
          indexing_attempts?: number
          indexing_error?: string | null
          indexing_status?: string
          is_latest_version?: boolean
          is_visible_to_client?: boolean
          last_accessed_at?: string | null
          last_accessed_by?: string | null
          library_tags?: string[] | null
          mime_type?: string | null
          organization_id: string
          parent_document_id?: string | null
          party_type?: string | null
          person_id?: string | null
          search_tsv?: unknown
          status?: string
          tags?: string[] | null
          title?: string | null
          title_ar?: string | null
          updated_at?: string
          uploaded_by: string
          version?: number
          visibility_scope?: string
        }
        Update: {
          ai_dates?: Json | null
          ai_doc_type?: string | null
          ai_language?: string | null
          ai_organizations?: string[] | null
          ai_people?: string[] | null
          ai_places?: string[] | null
          ai_summary?: string | null
          ai_tags?: string[] | null
          case_id?: string | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          document_category?: string
          entity_id?: string | null
          errand_id?: string | null
          extracted_text?: string | null
          file_name?: string
          file_name_ar?: string | null
          file_path?: string
          file_size_bytes?: number
          file_type?: string
          folder_path?: string | null
          id?: string
          indexed_at?: string | null
          indexing_attempts?: number
          indexing_error?: string | null
          indexing_status?: string
          is_latest_version?: boolean
          is_visible_to_client?: boolean
          last_accessed_at?: string | null
          last_accessed_by?: string | null
          library_tags?: string[] | null
          mime_type?: string | null
          organization_id?: string
          parent_document_id?: string | null
          party_type?: string | null
          person_id?: string | null
          search_tsv?: unknown
          status?: string
          tags?: string[] | null
          title?: string | null
          title_ar?: string | null
          updated_at?: string
          uploaded_by?: string
          version?: number
          visibility_scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_errand_id_fkey"
            columns: ["errand_id"]
            isOneToOne: false
            referencedRelation: "errands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_last_accessed_by_fkey"
            columns: ["last_accessed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_queue: {
        Row: {
          attempts: number | null
          body_html: string
          body_text: string | null
          created_at: string
          error_message: string | null
          id: string
          max_attempts: number | null
          notification_id: string | null
          organization_id: string
          scheduled_at: string | null
          sent_at: string | null
          status: string
          subject: string
          subject_ar: string | null
          to_email: string
          to_name: string | null
        }
        Insert: {
          attempts?: number | null
          body_html: string
          body_text?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          max_attempts?: number | null
          notification_id?: string | null
          organization_id: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          subject_ar?: string | null
          to_email: string
          to_name?: string | null
        }
        Update: {
          attempts?: number | null
          body_html?: string
          body_text?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          max_attempts?: number | null
          notification_id?: string | null
          organization_id?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          subject_ar?: string | null
          to_email?: string
          to_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      entities: {
        Row: {
          address: string | null
          address_ar: string | null
          city: string | null
          city_ar: string | null
          company_name: string
          company_name_ar: string | null
          company_registration_number: string | null
          company_type: string | null
          country: string | null
          created_at: string
          created_by: string | null
          credit_limit: number | null
          email: string | null
          governorate: string | null
          id: string
          industry: string | null
          industry_ar: string | null
          is_visible_to_client: boolean
          notes: string | null
          notes_ar: string | null
          organization_id: string
          payment_terms_days: number | null
          phone: string | null
          postal_code: string | null
          preferred_currency: string | null
          status: string
          tags: string[] | null
          tax_id: string | null
          updated_at: string
          updated_by: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          address_ar?: string | null
          city?: string | null
          city_ar?: string | null
          company_name: string
          company_name_ar?: string | null
          company_registration_number?: string | null
          company_type?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          credit_limit?: number | null
          email?: string | null
          governorate?: string | null
          id?: string
          industry?: string | null
          industry_ar?: string | null
          is_visible_to_client?: boolean
          notes?: string | null
          notes_ar?: string | null
          organization_id: string
          payment_terms_days?: number | null
          phone?: string | null
          postal_code?: string | null
          preferred_currency?: string | null
          status?: string
          tags?: string[] | null
          tax_id?: string | null
          updated_at?: string
          updated_by?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          address_ar?: string | null
          city?: string | null
          city_ar?: string | null
          company_name?: string
          company_name_ar?: string | null
          company_registration_number?: string | null
          company_type?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          credit_limit?: number | null
          email?: string | null
          governorate?: string | null
          id?: string
          industry?: string | null
          industry_ar?: string | null
          is_visible_to_client?: boolean
          notes?: string | null
          notes_ar?: string | null
          organization_id?: string
          payment_terms_days?: number | null
          phone?: string | null
          postal_code?: string | null
          preferred_currency?: string | null
          status?: string
          tags?: string[] | null
          tax_id?: string | null
          updated_at?: string
          updated_by?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entities_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_representatives: {
        Row: {
          created_at: string
          department: string | null
          end_date: string | null
          entity_id: string
          id: string
          is_primary: boolean
          job_title: string | null
          job_title_ar: string | null
          notes: string | null
          organization_id: string
          person_id: string
          receives_notifications: boolean
          role: string
          start_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          end_date?: string | null
          entity_id: string
          id?: string
          is_primary?: boolean
          job_title?: string | null
          job_title_ar?: string | null
          notes?: string | null
          organization_id: string
          person_id: string
          receives_notifications?: boolean
          role?: string
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          end_date?: string | null
          entity_id?: string
          id?: string
          is_primary?: boolean
          job_title?: string | null
          job_title_ar?: string | null
          notes?: string | null
          organization_id?: string
          person_id?: string
          receives_notifications?: boolean
          role?: string
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_representatives_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_representatives_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_representatives_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
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
      errand_notes: {
        Row: {
          author_id: string
          content: string
          content_ar: string | null
          created_at: string
          errand_id: string
          id: string
          is_pinned: boolean
          is_visible_to_client: boolean
          organization_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          content_ar?: string | null
          created_at?: string
          errand_id: string
          id?: string
          is_pinned?: boolean
          is_visible_to_client?: boolean
          organization_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          content_ar?: string | null
          created_at?: string
          errand_id?: string
          id?: string
          is_pinned?: boolean
          is_visible_to_client?: boolean
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "errand_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "errand_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      errand_steps: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          description: string | null
          description_ar: string | null
          errand_id: string
          id: string
          notes: string | null
          organization_id: string
          status: string
          step_order: number
          title: string
          title_ar: string | null
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          errand_id: string
          id?: string
          notes?: string | null
          organization_id: string
          status?: string
          step_order: number
          title: string
          title_ar?: string | null
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          errand_id?: string
          id?: string
          notes?: string | null
          organization_id?: string
          status?: string
          step_order?: number
          title?: string
          title_ar?: string | null
        }
        Relationships: [
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
          completed_at: string | null
          completed_steps: number
          created_at: string
          created_by: string | null
          description: string | null
          description_ar: string | null
          due_date: string | null
          entity_id: string | null
          errand_number: string
          errand_type: string
          id: string
          is_visible_to_client: boolean
          organization_id: string
          party_type: string | null
          person_id: string | null
          priority: string
          status: string
          title: string
          title_ar: string | null
          total_steps: number
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          case_id?: string | null
          completed_at?: string | null
          completed_steps?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_ar?: string | null
          due_date?: string | null
          entity_id?: string | null
          errand_number: string
          errand_type: string
          id?: string
          is_visible_to_client?: boolean
          organization_id: string
          party_type?: string | null
          person_id?: string | null
          priority?: string
          status?: string
          title: string
          title_ar?: string | null
          total_steps?: number
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          case_id?: string | null
          completed_at?: string | null
          completed_steps?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_ar?: string | null
          due_date?: string | null
          entity_id?: string | null
          errand_number?: string
          errand_type?: string
          id?: string
          is_visible_to_client?: boolean
          organization_id?: string
          party_type?: string | null
          person_id?: string | null
          priority?: string
          status?: string
          title?: string
          title_ar?: string | null
          total_steps?: number
          updated_at?: string
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
            foreignKeyName: "errands_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "errands_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
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
            foreignKeyName: "errands_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
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
          personal_message: string | null
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
          personal_message?: string | null
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
          personal_message?: string | null
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
      invoice_line_items: {
        Row: {
          created_at: string
          description: string
          description_ar: string | null
          id: string
          invoice_id: string
          line_type: string
          organization_id: string
          quantity: number
          sort_order: number
          time_entry_id: string | null
          total: number | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          description_ar?: string | null
          id?: string
          invoice_id: string
          line_type?: string
          organization_id: string
          quantity?: number
          sort_order?: number
          time_entry_id?: string | null
          total?: number | null
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          description_ar?: string | null
          id?: string
          invoice_id?: string
          line_type?: string
          organization_id?: string
          quantity?: number
          sort_order?: number
          time_entry_id?: string | null
          total?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: false
            referencedRelation: "time_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          case_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          discount_amount: number
          due_date: string | null
          entity_id: string | null
          id: string
          invoice_number: string
          issue_date: string
          notes: string | null
          notes_ar: string | null
          organization_id: string
          paid_at: string | null
          party_type: string
          person_id: string | null
          status: string
          subtotal: number
          tax_amount: number
          total_amount: number
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          amount_paid?: number
          case_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          discount_amount?: number
          due_date?: string | null
          entity_id?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          notes?: string | null
          notes_ar?: string | null
          organization_id: string
          paid_at?: string | null
          party_type: string
          person_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          amount_paid?: number
          case_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          discount_amount?: number
          due_date?: string | null
          entity_id?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          notes_ar?: string | null
          organization_id?: string
          paid_at?: string | null
          party_type?: string
          person_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_enabled: boolean | null
          id: string
          organization_id: string
          preferences: Json
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sound_enabled: boolean | null
          updated_at: string
          user_id: string
          whatsapp_enabled: boolean | null
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean | null
          id?: string
          organization_id: string
          preferences?: Json
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sound_enabled?: boolean | null
          updated_at?: string
          user_id: string
          whatsapp_enabled?: boolean | null
        }
        Update: {
          created_at?: string
          email_enabled?: boolean | null
          id?: string
          organization_id?: string
          preferences?: Json
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sound_enabled?: boolean | null
          updated_at?: string
          user_id?: string
          whatsapp_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          body: string | null
          body_ar: string | null
          created_at: string
          email_delivered: boolean | null
          email_delivered_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          in_app_delivered: boolean | null
          is_read: boolean
          notification_type: string
          organization_id: string
          priority: string
          read_at: string | null
          title: string
          title_ar: string | null
          user_id: string
          whatsapp_delivered: boolean | null
          whatsapp_delivered_at: string | null
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          body_ar?: string | null
          created_at?: string
          email_delivered?: boolean | null
          email_delivered_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          in_app_delivered?: boolean | null
          is_read?: boolean
          notification_type: string
          organization_id: string
          priority?: string
          read_at?: string | null
          title: string
          title_ar?: string | null
          user_id: string
          whatsapp_delivered?: boolean | null
          whatsapp_delivered_at?: string | null
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          body_ar?: string | null
          created_at?: string
          email_delivered?: boolean | null
          email_delivered_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          in_app_delivered?: boolean | null
          is_read?: boolean
          notification_type?: string
          organization_id?: string
          priority?: string
          read_at?: string | null
          title?: string
          title_ar?: string | null
          user_id?: string
          whatsapp_delivered?: boolean | null
          whatsapp_delivered_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          address_ar: string | null
          ai_api_key_encrypted: string | null
          ai_base_url: string | null
          ai_enabled: boolean | null
          ai_fallback_to_platform: boolean
          ai_last_reset_date: string | null
          ai_model: string | null
          ai_monthly_token_limit: number | null
          ai_provider: string | null
          ai_tokens_used_this_month: number | null
          bank_account_number: string | null
          bank_iban: string | null
          bank_name: string | null
          bank_name_ar: string | null
          bank_swift_code: string | null
          case_next_number: number | null
          case_prefix: string | null
          city: string | null
          city_ar: string | null
          created_at: string
          default_currency: string
          default_hourly_rate: number | null
          default_language: string
          default_payment_terms_days: number | null
          default_tax_rate: number | null
          default_terms: string | null
          default_terms_ar: string | null
          email: string | null
          errand_next_number: number | null
          errand_prefix: string | null
          governorate: string | null
          id: string
          industry_focus: string | null
          invoice_footer_text: string | null
          invoice_footer_text_ar: string | null
          invoice_header_text: string | null
          invoice_header_text_ar: string | null
          invoice_next_number: number | null
          invoice_prefix: string | null
          is_active: boolean
          letterhead_url: string | null
          logo_url: string | null
          max_storage_mb: number
          max_users: number
          name: string
          name_ar: string
          org_type: string | null
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
          ai_api_key_encrypted?: string | null
          ai_base_url?: string | null
          ai_enabled?: boolean | null
          ai_fallback_to_platform?: boolean
          ai_last_reset_date?: string | null
          ai_model?: string | null
          ai_monthly_token_limit?: number | null
          ai_provider?: string | null
          ai_tokens_used_this_month?: number | null
          bank_account_number?: string | null
          bank_iban?: string | null
          bank_name?: string | null
          bank_name_ar?: string | null
          bank_swift_code?: string | null
          case_next_number?: number | null
          case_prefix?: string | null
          city?: string | null
          city_ar?: string | null
          created_at?: string
          default_currency?: string
          default_hourly_rate?: number | null
          default_language?: string
          default_payment_terms_days?: number | null
          default_tax_rate?: number | null
          default_terms?: string | null
          default_terms_ar?: string | null
          email?: string | null
          errand_next_number?: number | null
          errand_prefix?: string | null
          governorate?: string | null
          id?: string
          industry_focus?: string | null
          invoice_footer_text?: string | null
          invoice_footer_text_ar?: string | null
          invoice_header_text?: string | null
          invoice_header_text_ar?: string | null
          invoice_next_number?: number | null
          invoice_prefix?: string | null
          is_active?: boolean
          letterhead_url?: string | null
          logo_url?: string | null
          max_storage_mb?: number
          max_users?: number
          name: string
          name_ar: string
          org_type?: string | null
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
          ai_api_key_encrypted?: string | null
          ai_base_url?: string | null
          ai_enabled?: boolean | null
          ai_fallback_to_platform?: boolean
          ai_last_reset_date?: string | null
          ai_model?: string | null
          ai_monthly_token_limit?: number | null
          ai_provider?: string | null
          ai_tokens_used_this_month?: number | null
          bank_account_number?: string | null
          bank_iban?: string | null
          bank_name?: string | null
          bank_name_ar?: string | null
          bank_swift_code?: string | null
          case_next_number?: number | null
          case_prefix?: string | null
          city?: string | null
          city_ar?: string | null
          created_at?: string
          default_currency?: string
          default_hourly_rate?: number | null
          default_language?: string
          default_payment_terms_days?: number | null
          default_tax_rate?: number | null
          default_terms?: string | null
          default_terms_ar?: string | null
          email?: string | null
          errand_next_number?: number | null
          errand_prefix?: string | null
          governorate?: string | null
          id?: string
          industry_focus?: string | null
          invoice_footer_text?: string | null
          invoice_footer_text_ar?: string | null
          invoice_header_text?: string | null
          invoice_header_text_ar?: string | null
          invoice_next_number?: number | null
          invoice_prefix?: string | null
          is_active?: boolean
          letterhead_url?: string | null
          logo_url?: string | null
          max_storage_mb?: number
          max_users?: number
          name?: string
          name_ar?: string
          org_type?: string | null
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
      party_activities: {
        Row: {
          activity_type: string
          actor_id: string | null
          created_at: string
          description: string | null
          description_ar: string | null
          entity_id: string | null
          id: string
          metadata: Json | null
          organization_id: string
          party_type: string
          person_id: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          title: string
          title_ar: string | null
        }
        Insert: {
          activity_type: string
          actor_id?: string | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          party_type: string
          person_id?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title: string
          title_ar?: string | null
        }
        Update: {
          activity_type?: string
          actor_id?: string | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          party_type?: string
          person_id?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title?: string
          title_ar?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "party_activities_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_activities_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_activities_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          currency: string
          id: string
          invoice_id: string
          notes: string | null
          organization_id: string
          payment_date: string
          payment_method: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          invoice_id: string
          notes?: string | null
          organization_id: string
          payment_date?: string
          payment_method?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          invoice_id?: string
          notes?: string | null
          organization_id?: string
          payment_date?: string
          payment_method?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      persons: {
        Row: {
          address: string | null
          address_ar: string | null
          city: string | null
          city_ar: string | null
          country: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          email: string | null
          first_name: string
          first_name_ar: string | null
          gender: string | null
          governorate: string | null
          id: string
          is_visible_to_client: boolean
          last_name: string | null
          last_name_ar: string | null
          national_id_number: string | null
          nationality: string | null
          notes: string | null
          notes_ar: string | null
          organization_id: string
          phone: string | null
          postal_code: string | null
          preferred_currency: string | null
          profile_image_url: string | null
          secondary_phone: string | null
          status: string
          tags: string[] | null
          updated_at: string
          updated_by: string | null
          whatsapp_number: string | null
        }
        Insert: {
          address?: string | null
          address_ar?: string | null
          city?: string | null
          city_ar?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name: string
          first_name_ar?: string | null
          gender?: string | null
          governorate?: string | null
          id?: string
          is_visible_to_client?: boolean
          last_name?: string | null
          last_name_ar?: string | null
          national_id_number?: string | null
          nationality?: string | null
          notes?: string | null
          notes_ar?: string | null
          organization_id: string
          phone?: string | null
          postal_code?: string | null
          preferred_currency?: string | null
          profile_image_url?: string | null
          secondary_phone?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          updated_by?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          address?: string | null
          address_ar?: string | null
          city?: string | null
          city_ar?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string
          first_name_ar?: string | null
          gender?: string | null
          governorate?: string | null
          id?: string
          is_visible_to_client?: boolean
          last_name?: string | null
          last_name_ar?: string | null
          national_id_number?: string | null
          nationality?: string | null
          notes?: string | null
          notes_ar?: string | null
          organization_id?: string
          phone?: string | null
          postal_code?: string | null
          preferred_currency?: string | null
          profile_image_url?: string | null
          secondary_phone?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          updated_by?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "persons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persons_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_user_links: {
        Row: {
          id: string
          invited_at: string
          is_active: boolean
          last_accessed_at: string | null
          organization_id: string
          person_id: string
          portal_user_id: string
        }
        Insert: {
          id?: string
          invited_at?: string
          is_active?: boolean
          last_accessed_at?: string | null
          organization_id: string
          person_id: string
          portal_user_id: string
        }
        Update: {
          id?: string
          invited_at?: string
          is_active?: boolean
          last_accessed_at?: string | null
          organization_id?: string
          person_id?: string
          portal_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_user_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_user_links_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_user_links_portal_user_id_fkey"
            columns: ["portal_user_id"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_users: {
        Row: {
          auth_user_id: string
          created_at: string
          email: string
          full_name: string | null
          full_name_ar: string | null
          id: string
          last_login_at: string | null
          last_selected_org_id: string | null
          phone: string | null
          preferred_language: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          email: string
          full_name?: string | null
          full_name_ar?: string | null
          id?: string
          last_login_at?: string | null
          last_selected_org_id?: string | null
          phone?: string | null
          preferred_language?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          email?: string
          full_name?: string | null
          full_name_ar?: string | null
          id?: string
          last_login_at?: string | null
          last_selected_org_id?: string | null
          phone?: string | null
          preferred_language?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_users_last_selected_org_id_fkey"
            columns: ["last_selected_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          onboarding_completed: boolean | null
          onboarding_step: number | null
          organization_id: string | null
          password_changed_by: string | null
          password_last_changed_at: string | null
          password_set_by_admin: boolean | null
          phone: string | null
          role: string
          secondary_phone: string | null
          timezone: string | null
          updated_at: string
          whatsapp_number: string | null
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
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          organization_id?: string | null
          password_changed_by?: string | null
          password_last_changed_at?: string | null
          password_set_by_admin?: boolean | null
          phone?: string | null
          role?: string
          secondary_phone?: string | null
          timezone?: string | null
          updated_at?: string
          whatsapp_number?: string | null
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
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          organization_id?: string | null
          password_changed_by?: string | null
          password_last_changed_at?: string | null
          password_set_by_admin?: boolean | null
          phone?: string | null
          role?: string
          secondary_phone?: string | null
          timezone?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_password_changed_by_fkey"
            columns: ["password_changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_reports: {
        Row: {
          created_at: string
          created_by: string
          date_range_end: string | null
          date_range_start: string | null
          description: string | null
          description_ar: string | null
          filters: Json | null
          id: string
          is_scheduled: boolean | null
          last_generated_at: string | null
          name: string
          name_ar: string | null
          organization_id: string
          report_type: string
          schedule_frequency: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          date_range_end?: string | null
          date_range_start?: string | null
          description?: string | null
          description_ar?: string | null
          filters?: Json | null
          id?: string
          is_scheduled?: boolean | null
          last_generated_at?: string | null
          name: string
          name_ar?: string | null
          organization_id: string
          report_type: string
          schedule_frequency?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          date_range_end?: string | null
          date_range_start?: string | null
          description?: string | null
          description_ar?: string | null
          filters?: Json | null
          id?: string
          is_scheduled?: boolean | null
          last_generated_at?: string | null
          name?: string
          name_ar?: string | null
          organization_id?: string
          report_type?: string
          schedule_frequency?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      system_backups: {
        Row: {
          backup_name: string
          backup_type: string
          completed_at: string | null
          created_at: string
          created_by: string
          data_file_path: string | null
          data_size_bytes: number | null
          error_message: string | null
          expires_at: string | null
          id: string
          includes_database: boolean
          includes_storage: boolean
          organization_id: string | null
          record_counts: Json | null
          scope: string
          started_at: string
          status: string
          tables_included: string[] | null
        }
        Insert: {
          backup_name: string
          backup_type: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          data_file_path?: string | null
          data_size_bytes?: number | null
          error_message?: string | null
          expires_at?: string | null
          id?: string
          includes_database?: boolean
          includes_storage?: boolean
          organization_id?: string | null
          record_counts?: Json | null
          scope: string
          started_at?: string
          status?: string
          tables_included?: string[] | null
        }
        Update: {
          backup_name?: string
          backup_type?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          data_file_path?: string | null
          data_size_bytes?: number | null
          error_message?: string | null
          expires_at?: string | null
          id?: string
          includes_database?: boolean
          includes_storage?: boolean
          organization_id?: string | null
          record_counts?: Json | null
          scope?: string
          started_at?: string
          status?: string
          tables_included?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "system_backups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_backups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          author_id: string
          content: string
          content_ar: string | null
          created_at: string
          id: string
          organization_id: string
          task_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          content_ar?: string | null
          created_at?: string
          id?: string
          organization_id: string
          task_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          content_ar?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          actual_minutes: number | null
          assigned_by: string | null
          assigned_to: string | null
          case_id: string | null
          checklist: Json | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string
          description: string | null
          description_ar: string | null
          due_date: string | null
          due_time: string | null
          entity_id: string | null
          errand_id: string | null
          estimated_minutes: number | null
          id: string
          is_recurring: boolean | null
          organization_id: string
          parent_task_id: string | null
          party_type: string | null
          person_id: string | null
          priority: string
          recurrence_end_date: string | null
          recurrence_pattern: string | null
          reminder_sent: boolean | null
          start_date: string | null
          status: string
          tags: string[] | null
          task_type: string
          title: string
          title_ar: string | null
          updated_at: string
        }
        Insert: {
          actual_minutes?: number | null
          assigned_by?: string | null
          assigned_to?: string | null
          case_id?: string | null
          checklist?: Json | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          description_ar?: string | null
          due_date?: string | null
          due_time?: string | null
          entity_id?: string | null
          errand_id?: string | null
          estimated_minutes?: number | null
          id?: string
          is_recurring?: boolean | null
          organization_id: string
          parent_task_id?: string | null
          party_type?: string | null
          person_id?: string | null
          priority?: string
          recurrence_end_date?: string | null
          recurrence_pattern?: string | null
          reminder_sent?: boolean | null
          start_date?: string | null
          status?: string
          tags?: string[] | null
          task_type?: string
          title: string
          title_ar?: string | null
          updated_at?: string
        }
        Update: {
          actual_minutes?: number | null
          assigned_by?: string | null
          assigned_to?: string | null
          case_id?: string | null
          checklist?: Json | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          description_ar?: string | null
          due_date?: string | null
          due_time?: string | null
          entity_id?: string | null
          errand_id?: string | null
          estimated_minutes?: number | null
          id?: string
          is_recurring?: boolean | null
          organization_id?: string
          parent_task_id?: string | null
          party_type?: string | null
          person_id?: string | null
          priority?: string
          recurrence_end_date?: string | null
          recurrence_pattern?: string | null
          reminder_sent?: boolean | null
          start_date?: string | null
          status?: string
          tags?: string[] | null
          task_type?: string
          title?: string
          title_ar?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          billing_rate: number | null
          billing_rate_currency: string | null
          case_id: string | null
          created_at: string
          date: string
          description: string
          description_ar: string | null
          duration_minutes: number
          end_time: string | null
          entity_id: string | null
          errand_id: string | null
          id: string
          invoice_id: string | null
          invoice_line_item_id: string | null
          is_billable: boolean
          is_timer_running: boolean | null
          organization_id: string
          party_type: string | null
          person_id: string | null
          start_time: string | null
          status: string
          timer_started_at: string | null
          total_amount: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          billing_rate?: number | null
          billing_rate_currency?: string | null
          case_id?: string | null
          created_at?: string
          date?: string
          description: string
          description_ar?: string | null
          duration_minutes: number
          end_time?: string | null
          entity_id?: string | null
          errand_id?: string | null
          id?: string
          invoice_id?: string | null
          invoice_line_item_id?: string | null
          is_billable?: boolean
          is_timer_running?: boolean | null
          organization_id: string
          party_type?: string | null
          person_id?: string | null
          start_time?: string | null
          status?: string
          timer_started_at?: string | null
          total_amount?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          billing_rate?: number | null
          billing_rate_currency?: string | null
          case_id?: string | null
          created_at?: string
          date?: string
          description?: string
          description_ar?: string | null
          duration_minutes?: number
          end_time?: string | null
          entity_id?: string | null
          errand_id?: string | null
          id?: string
          invoice_id?: string | null
          invoice_line_item_id?: string | null
          is_billable?: boolean
          is_timer_running?: boolean | null
          organization_id?: string
          party_type?: string | null
          person_id?: string | null
          start_time?: string | null
          status?: string
          timer_started_at?: string | null
          total_amount?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_queue: {
        Row: {
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          message_template: string
          notification_id: string | null
          organization_id: string
          phone_number: string
          read_at: string | null
          sent_at: string | null
          status: string
          template_params: Json | null
          whatsapp_message_id: string | null
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_template: string
          notification_id?: string | null
          organization_id: string
          phone_number: string
          read_at?: string | null
          sent_at?: string | null
          status?: string
          template_params?: Json | null
          whatsapp_message_id?: string | null
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_template?: string
          notification_id?: string | null
          organization_id?: string
          phone_number?: string
          read_at?: string | null
          sent_at?: string | null
          status?: string
          template_params?: Json | null
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_queue_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_queue_organization_id_fkey"
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
      _ai_key_passphrase: { Args: never; Returns: string }
      client_can_access_document_object: {
        Args: { object_name: string }
        Returns: boolean
      }
      client_mark_invoice_viewed: {
        Args: { p_invoice_id: string }
        Returns: undefined
      }
      create_notification: {
        Args: {
          p_actor_id?: string
          p_body?: string
          p_body_ar?: string
          p_entity_id?: string
          p_entity_type?: string
          p_notification_type: string
          p_organization_id: string
          p_priority?: string
          p_title: string
          p_title_ar?: string
          p_user_id: string
        }
        Returns: string
      }
      get_org_ai_key: { Args: { _org_id: string }; Returns: string }
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: { Args: { _user_id: string }; Returns: string }
      org_has_ai_key: { Args: { _org_id: string }; Returns: boolean }
      portal_user_can_access_case: {
        Args: { _case_id: string }
        Returns: boolean
      }
      portal_user_can_access_entity: {
        Args: { _entity_id: string }
        Returns: boolean
      }
      portal_user_can_access_person: {
        Args: { _person_id: string }
        Returns: boolean
      }
      set_org_ai_key: {
        Args: { _org_id: string; _plaintext: string }
        Returns: undefined
      }
      user_can_access_case: {
        Args: { _case_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_access_errand: {
        Args: { _errand_id: string; _user_id: string }
        Returns: boolean
      }
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
