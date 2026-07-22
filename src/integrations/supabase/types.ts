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
      academy_activity_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          payload: Json
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          payload?: Json
          user_id?: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          payload?: Json
          user_id?: string
        }
        Relationships: []
      }
      academy_certifications: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_published: boolean
          minimum_score: number
          required_course_ids: string[]
          required_skill_tags: string[]
          requires_manual_validation: boolean
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_published?: boolean
          minimum_score?: number
          required_course_ids?: string[]
          required_skill_tags?: string[]
          requires_manual_validation?: boolean
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_published?: boolean
          minimum_score?: number
          required_course_ids?: string[]
          required_skill_tags?: string[]
          requires_manual_validation?: boolean
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      academy_courses: {
        Row: {
          content: Json
          course_type: string
          created_at: string
          created_by: string | null
          description: string | null
          estimated_minutes: number
          id: string
          is_active: boolean
          is_published: boolean
          is_required: boolean
          level: string
          pass_score: number
          path_id: string | null
          prerequisites: string[]
          skills: string[]
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json
          course_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_minutes?: number
          id?: string
          is_active?: boolean
          is_published?: boolean
          is_required?: boolean
          level?: string
          pass_score?: number
          path_id?: string | null
          prerequisites?: string[]
          skills?: string[]
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          content?: Json
          course_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_minutes?: number
          id?: string
          is_active?: boolean
          is_published?: boolean
          is_required?: boolean
          level?: string
          pass_score?: number
          path_id?: string | null
          prerequisites?: string[]
          skills?: string[]
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_courses_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "academy_learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_learning_paths: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          difficulty: string
          estimated_minutes: number
          id: string
          is_active: boolean
          is_published: boolean
          slug: string
          sort_order: number
          target_roles: string[]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string
          estimated_minutes?: number
          id?: string
          is_active?: boolean
          is_published?: boolean
          slug: string
          sort_order?: number
          target_roles?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string
          estimated_minutes?: number
          id?: string
          is_active?: boolean
          is_published?: boolean
          slug?: string
          sort_order?: number
          target_roles?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      academy_lessons: {
        Row: {
          content: Json
          course_id: string
          created_at: string
          estimated_minutes: number
          id: string
          is_active: boolean
          is_required: boolean
          lesson_type: string
          resource_url: string | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json
          course_id: string
          created_at?: string
          estimated_minutes?: number
          id?: string
          is_active?: boolean
          is_required?: boolean
          lesson_type?: string
          resource_url?: string | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          content?: Json
          course_id?: string
          created_at?: string
          estimated_minutes?: number
          id?: string
          is_active?: boolean
          is_required?: boolean
          lesson_type?: string
          resource_url?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "academy_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "admin_academy_report"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "academy_lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "advisor_academy_dashboard"
            referencedColumns: ["course_id"]
          },
        ]
      }
      academy_quiz_attempts: {
        Row: {
          answers: Json
          attempt_number: number
          completed_at: string | null
          course_id: string
          id: string
          quiz_id: string
          score: number | null
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          answers?: Json
          attempt_number?: number
          completed_at?: string | null
          course_id: string
          id?: string
          quiz_id: string
          score?: number | null
          started_at?: string
          status?: string
          user_id?: string
        }
        Update: {
          answers?: Json
          attempt_number?: number
          completed_at?: string | null
          course_id?: string
          id?: string
          quiz_id?: string
          score?: number | null
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_quiz_attempts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "academy_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_quiz_attempts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "admin_academy_report"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "academy_quiz_attempts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "advisor_academy_dashboard"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "academy_quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "academy_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_quiz_questions: {
        Row: {
          correct_answers: Json
          explanation: string | null
          id: string
          is_active: boolean
          options: Json
          points: number
          question: string
          question_type: string
          quiz_id: string
          sort_order: number
        }
        Insert: {
          correct_answers?: Json
          explanation?: string | null
          id?: string
          is_active?: boolean
          options?: Json
          points?: number
          question: string
          question_type: string
          quiz_id: string
          sort_order?: number
        }
        Update: {
          correct_answers?: Json
          explanation?: string | null
          id?: string
          is_active?: boolean
          options?: Json
          points?: number
          question?: string
          question_type?: string
          quiz_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "academy_quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "academy_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_quizzes: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_final: boolean
          max_attempts: number
          passing_score: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_final?: boolean
          max_attempts?: number
          passing_score?: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_final?: boolean
          max_attempts?: number
          passing_score?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "academy_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "admin_academy_report"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "academy_quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "advisor_academy_dashboard"
            referencedColumns: ["course_id"]
          },
        ]
      }
      academy_user_certifications: {
        Row: {
          certificate_code: string | null
          certification_id: string
          created_at: string
          id: string
          issued_at: string | null
          metadata: Json
          score: number | null
          status: string
          updated_at: string
          user_id: string
          validated_by: string | null
        }
        Insert: {
          certificate_code?: string | null
          certification_id: string
          created_at?: string
          id?: string
          issued_at?: string | null
          metadata?: Json
          score?: number | null
          status?: string
          updated_at?: string
          user_id?: string
          validated_by?: string | null
        }
        Update: {
          certificate_code?: string | null
          certification_id?: string
          created_at?: string
          id?: string
          issued_at?: string | null
          metadata?: Json
          score?: number | null
          status?: string
          updated_at?: string
          user_id?: string
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academy_user_certifications_certification_id_fkey"
            columns: ["certification_id"]
            isOneToOne: false
            referencedRelation: "academy_certifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_user_certifications_certification_id_fkey"
            columns: ["certification_id"]
            isOneToOne: false
            referencedRelation: "advisor_academy_certifications"
            referencedColumns: ["certification_id"]
          },
        ]
      }
      academy_user_progress: {
        Row: {
          completed_at: string | null
          course_id: string
          id: string
          last_activity_at: string
          metadata: Json
          path_id: string | null
          progress_percent: number
          score: number | null
          skills_acquired: string[]
          started_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          id?: string
          last_activity_at?: string
          metadata?: Json
          path_id?: string | null
          progress_percent?: number
          score?: number | null
          skills_acquired?: string[]
          started_at?: string | null
          status?: string
          user_id?: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          id?: string
          last_activity_at?: string
          metadata?: Json
          path_id?: string | null
          progress_percent?: number
          score?: number | null
          skills_acquired?: string[]
          started_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_user_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "academy_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_user_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "admin_academy_report"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "academy_user_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "advisor_academy_dashboard"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "academy_user_progress_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "academy_learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      addresses: {
        Row: {
          additional_info: string | null
          city: string
          created_at: string | null
          full_name: string
          id: string
          is_default: boolean | null
          label: string | null
          neighborhood: string | null
          phone: string
          street_address: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          additional_info?: string | null
          city: string
          created_at?: string | null
          full_name: string
          id?: string
          is_default?: boolean | null
          label?: string | null
          neighborhood?: string | null
          phone: string
          street_address: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          additional_info?: string | null
          city?: string
          created_at?: string | null
          full_name?: string
          id?: string
          is_default?: boolean | null
          label?: string | null
          neighborhood?: string | null
          phone?: string
          street_address?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      admin_2fa: {
        Row: {
          backup_codes: string[] | null
          created_at: string
          id: string
          is_enabled: boolean
          last_verified_at: string | null
          totp_secret: string
          updated_at: string
          user_id: string
        }
        Insert: {
          backup_codes?: string[] | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          last_verified_at?: string | null
          totp_secret: string
          updated_at?: string
          user_id: string
        }
        Update: {
          backup_codes?: string[] | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          last_verified_at?: string | null
          totp_secret?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_2fa_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      admin_audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_email?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_permissions: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          id: string
          permission: Database["public"]["Enums"]["admin_permission"]
          user_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission: Database["public"]["Enums"]["admin_permission"]
          user_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission?: Database["public"]["Enums"]["admin_permission"]
          user_id?: string
        }
        Relationships: []
      }
      advisor_goal_assignments: {
        Row: {
          advisor_id: string
          ai_rationale: Json
          ai_suggestion: string | null
          cadence: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          current_value: number
          description: string | null
          difficulty: string
          due_at: string
          goal_type: string
          id: string
          priority: string
          progress_percent: number | null
          reward_hint: Json
          source_campaign_id: string | null
          source_context: Json
          source_event_id: string | null
          starts_at: string
          status: string
          target_metric: string
          target_value: number
          template_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          advisor_id: string
          ai_rationale?: Json
          ai_suggestion?: string | null
          cadence: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_value?: number
          description?: string | null
          difficulty?: string
          due_at: string
          goal_type: string
          id?: string
          priority?: string
          progress_percent?: number | null
          reward_hint?: Json
          source_campaign_id?: string | null
          source_context?: Json
          source_event_id?: string | null
          starts_at?: string
          status?: string
          target_metric?: string
          target_value: number
          template_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          advisor_id?: string
          ai_rationale?: Json
          ai_suggestion?: string | null
          cadence?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_value?: number
          description?: string | null
          difficulty?: string
          due_at?: string
          goal_type?: string
          id?: string
          priority?: string
          progress_percent?: number | null
          reward_hint?: Json
          source_campaign_id?: string | null
          source_context?: Json
          source_event_id?: string | null
          starts_at?: string
          status?: string
          target_metric?: string
          target_value?: number
          template_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisor_goal_assignments_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "advisor_goal_assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "advisor_goal_assignments_source_campaign_id_fkey"
            columns: ["source_campaign_id"]
            isOneToOne: false
            referencedRelation: "commercial_opportunity_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_goal_assignments_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "admin_commercial_opportunity_calendar_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_goal_assignments_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "advisor_commercial_opportunity_calendar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_goal_assignments_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "commercial_opportunity_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_goal_assignments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "admin_ai_goals_effectiveness_report"
            referencedColumns: ["template_id"]
          },
          {
            foreignKeyName: "advisor_goal_assignments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "advisor_goal_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_goal_generation_runs: {
        Row: {
          advisors_targeted: number
          assignments_created: number
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          requested_by: string | null
          run_type: string
          source_summary: Json
          status: string
        }
        Insert: {
          advisors_targeted?: number
          assignments_created?: number
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          requested_by?: string | null
          run_type: string
          source_summary?: Json
          status?: string
        }
        Update: {
          advisors_targeted?: number
          assignments_created?: number
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          requested_by?: string | null
          run_type?: string
          source_summary?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisor_goal_generation_runs_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      advisor_goal_profiles: {
        Row: {
          advisor_id: string
          advisor_level: string
          ai_context: Json
          availability: string
          business_score: number | null
          created_at: string
          excluded_goal_types: string[]
          preferred_goal_types: string[]
          specialties: string[]
          trust_score: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          advisor_id: string
          advisor_level?: string
          ai_context?: Json
          availability?: string
          business_score?: number | null
          created_at?: string
          excluded_goal_types?: string[]
          preferred_goal_types?: string[]
          specialties?: string[]
          trust_score?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          advisor_id?: string
          advisor_level?: string
          ai_context?: Json
          availability?: string
          business_score?: number | null
          created_at?: string
          excluded_goal_types?: string[]
          preferred_goal_types?: string[]
          specialties?: string[]
          trust_score?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advisor_goal_profiles_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: true
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "advisor_goal_profiles_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      advisor_goal_progress_events: {
        Row: {
          advisor_id: string
          assignment_id: string
          created_at: string
          created_by: string | null
          delta: number
          evidence: Json
          id: string
          note: string | null
        }
        Insert: {
          advisor_id: string
          assignment_id: string
          created_at?: string
          created_by?: string | null
          delta?: number
          evidence?: Json
          id?: string
          note?: string | null
        }
        Update: {
          advisor_id?: string
          assignment_id?: string
          created_at?: string
          created_by?: string | null
          delta?: number
          evidence?: Json
          id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advisor_goal_progress_events_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "advisor_goal_progress_events_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goals_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_goal_progress_events_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "advisor_goal_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_goal_progress_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      advisor_goal_templates: {
        Row: {
          advisor_levels: string[]
          ai_prompt_template: string | null
          cadence: string
          categories: string[]
          cities: string[]
          client_types: string[]
          code: string
          created_at: string
          created_by: string | null
          default_target_value: number
          description: string | null
          difficulty: string
          ends_at: string | null
          goal_type: string
          id: string
          is_active: boolean
          opportunity_slugs: string[]
          priority: string
          specialties: string[]
          starts_at: string | null
          success_criteria: Json
          suggested_reward: Json
          target_metric: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          advisor_levels?: string[]
          ai_prompt_template?: string | null
          cadence: string
          categories?: string[]
          cities?: string[]
          client_types?: string[]
          code: string
          created_at?: string
          created_by?: string | null
          default_target_value?: number
          description?: string | null
          difficulty?: string
          ends_at?: string | null
          goal_type: string
          id?: string
          is_active?: boolean
          opportunity_slugs?: string[]
          priority?: string
          specialties?: string[]
          starts_at?: string | null
          success_criteria?: Json
          suggested_reward?: Json
          target_metric?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          advisor_levels?: string[]
          ai_prompt_template?: string | null
          cadence?: string
          categories?: string[]
          cities?: string[]
          client_types?: string[]
          code?: string
          created_at?: string
          created_by?: string | null
          default_target_value?: number
          description?: string | null
          difficulty?: string
          ends_at?: string | null
          goal_type?: string
          id?: string
          is_active?: boolean
          opportunity_slugs?: string[]
          priority?: string
          specialties?: string[]
          starts_at?: string | null
          success_criteria?: Json
          suggested_reward?: Json
          target_metric?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advisor_goal_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "advisor_goal_templates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      ambassador_challenges: {
        Row: {
          badge_color: string | null
          badge_icon: string | null
          bonus_amount: number
          challenge_type: string
          created_at: string
          description: string | null
          ends_at: string
          id: string
          is_active: boolean | null
          starts_at: string
          target_value: number
          title: string
          updated_at: string
        }
        Insert: {
          badge_color?: string | null
          badge_icon?: string | null
          bonus_amount: number
          challenge_type: string
          created_at?: string
          description?: string | null
          ends_at: string
          id?: string
          is_active?: boolean | null
          starts_at: string
          target_value: number
          title: string
          updated_at?: string
        }
        Update: {
          badge_color?: string | null
          badge_icon?: string | null
          bonus_amount?: number
          challenge_type?: string
          created_at?: string
          description?: string | null
          ends_at?: string
          id?: string
          is_active?: boolean | null
          starts_at?: string
          target_value?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          category: string
          country: string | null
          currency: string | null
          device: string | null
          event_name: string
          id: number
          occurred_at: string
          path: string | null
          properties: Json
          referrer: string | null
          revenue: number | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          category?: string
          country?: string | null
          currency?: string | null
          device?: string | null
          event_name: string
          id?: number
          occurred_at?: string
          path?: string | null
          properties?: Json
          referrer?: string | null
          revenue?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string
          country?: string | null
          currency?: string | null
          device?: string | null
          event_name?: string
          id?: number
          occurred_at?: string
          path?: string | null
          properties?: Json
          referrer?: string | null
          revenue?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      api_gateway_api_keys: {
        Row: {
          allowed_endpoint_keys: string[]
          allowed_ips: unknown[]
          allowed_modules: string[]
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          key_hash: string
          key_name: string
          key_prefix: string
          last_used_at: string | null
          metadata: Json
          owner_label: string | null
          owner_user_id: string | null
          revoked_at: string | null
          revoked_by: string | null
          rotated_from_key_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          allowed_endpoint_keys?: string[]
          allowed_ips?: unknown[]
          allowed_modules?: string[]
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash: string
          key_name: string
          key_prefix: string
          last_used_at?: string | null
          metadata?: Json
          owner_label?: string | null
          owner_user_id?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          rotated_from_key_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          allowed_endpoint_keys?: string[]
          allowed_ips?: unknown[]
          allowed_modules?: string[]
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_name?: string
          key_prefix?: string
          last_used_at?: string | null
          metadata?: Json
          owner_label?: string | null
          owner_user_id?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          rotated_from_key_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_gateway_api_keys_rotated_from_key_id_fkey"
            columns: ["rotated_from_key_id"]
            isOneToOne: false
            referencedRelation: "admin_developer_portal_api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_gateway_api_keys_rotated_from_key_id_fkey"
            columns: ["rotated_from_key_id"]
            isOneToOne: false
            referencedRelation: "api_gateway_api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_gateway_api_keys_rotated_from_key_id_fkey"
            columns: ["rotated_from_key_id"]
            isOneToOne: false
            referencedRelation: "developer_portal_my_api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      api_gateway_endpoints: {
        Row: {
          auth_modes: string[]
          capability_key: string | null
          created_at: string
          created_by: string | null
          deprecation_notice: string | null
          documentation: Json
          endpoint_key: string
          http_method: string
          id: string
          module_key: string
          observability_policy: Json
          path: string
          rate_limit_policy: Json
          request_schema: Json
          required_permissions: string[]
          required_roles: string[]
          response_schema: Json
          route_type: string
          status: string
          target_name: string
          updated_at: string
          updated_by: string | null
          validation_policy: Json
          version: string
        }
        Insert: {
          auth_modes?: string[]
          capability_key?: string | null
          created_at?: string
          created_by?: string | null
          deprecation_notice?: string | null
          documentation?: Json
          endpoint_key: string
          http_method: string
          id?: string
          module_key: string
          observability_policy?: Json
          path: string
          rate_limit_policy?: Json
          request_schema?: Json
          required_permissions?: string[]
          required_roles?: string[]
          response_schema?: Json
          route_type?: string
          status?: string
          target_name: string
          updated_at?: string
          updated_by?: string | null
          validation_policy?: Json
          version?: string
        }
        Update: {
          auth_modes?: string[]
          capability_key?: string | null
          created_at?: string
          created_by?: string | null
          deprecation_notice?: string | null
          documentation?: Json
          endpoint_key?: string
          http_method?: string
          id?: string
          module_key?: string
          observability_policy?: Json
          path?: string
          rate_limit_policy?: Json
          request_schema?: Json
          required_permissions?: string[]
          required_roles?: string[]
          response_schema?: Json
          route_type?: string
          status?: string
          target_name?: string
          updated_at?: string
          updated_by?: string | null
          validation_policy?: Json
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_gateway_endpoints_capability_key_fkey"
            columns: ["capability_key"]
            isOneToOne: false
            referencedRelation: "admin_platform_capabilities"
            referencedColumns: ["capability_key"]
          },
          {
            foreignKeyName: "api_gateway_endpoints_capability_key_fkey"
            columns: ["capability_key"]
            isOneToOne: false
            referencedRelation: "platform_capability_registry"
            referencedColumns: ["capability_key"]
          },
          {
            foreignKeyName: "api_gateway_endpoints_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "admin_platform_dependency_map"
            referencedColumns: ["module_key"]
          },
          {
            foreignKeyName: "api_gateway_endpoints_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "admin_platform_extension_modules"
            referencedColumns: ["module_key"]
          },
          {
            foreignKeyName: "api_gateway_endpoints_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "platform_extension_modules"
            referencedColumns: ["module_key"]
          },
        ]
      }
      api_gateway_rate_limit_buckets: {
        Row: {
          blocked_until: string | null
          bucket_key: string
          endpoint_key: string | null
          id: string
          identity_type: string
          identity_value: string
          max_requests: number
          request_count: number
          updated_at: string
          window_seconds: number
          window_started_at: string
        }
        Insert: {
          blocked_until?: string | null
          bucket_key: string
          endpoint_key?: string | null
          id?: string
          identity_type: string
          identity_value: string
          max_requests?: number
          request_count?: number
          updated_at?: string
          window_seconds?: number
          window_started_at?: string
        }
        Update: {
          blocked_until?: string | null
          bucket_key?: string
          endpoint_key?: string | null
          id?: string
          identity_type?: string
          identity_value?: string
          max_requests?: number
          request_count?: number
          updated_at?: string
          window_seconds?: number
          window_started_at?: string
        }
        Relationships: []
      }
      api_gateway_request_logs: {
        Row: {
          api_key_id: string | null
          auth_mode: string
          created_at: string
          endpoint_key: string | null
          error_code: string | null
          error_message: string | null
          http_method: string | null
          id: number
          ip_address: unknown
          latency_ms: number | null
          module_key: string | null
          path: string | null
          request_id: string
          request_size_bytes: number | null
          request_summary: Json
          response_size_bytes: number | null
          response_summary: Json
          status_code: number | null
          user_id: string | null
        }
        Insert: {
          api_key_id?: string | null
          auth_mode?: string
          created_at?: string
          endpoint_key?: string | null
          error_code?: string | null
          error_message?: string | null
          http_method?: string | null
          id?: never
          ip_address?: unknown
          latency_ms?: number | null
          module_key?: string | null
          path?: string | null
          request_id?: string
          request_size_bytes?: number | null
          request_summary?: Json
          response_size_bytes?: number | null
          response_summary?: Json
          status_code?: number | null
          user_id?: string | null
        }
        Update: {
          api_key_id?: string | null
          auth_mode?: string
          created_at?: string
          endpoint_key?: string | null
          error_code?: string | null
          error_message?: string | null
          http_method?: string | null
          id?: never
          ip_address?: unknown
          latency_ms?: number | null
          module_key?: string | null
          path?: string | null
          request_id?: string
          request_size_bytes?: number | null
          request_summary?: Json
          response_size_bytes?: number | null
          response_summary?: Json
          status_code?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_gateway_request_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "admin_developer_portal_api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_gateway_request_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_gateway_api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_gateway_request_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "developer_portal_my_api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      api_gateway_webhook_deliveries: {
        Row: {
          attempt_count: number
          created_at: string
          event_id: string
          id: string
          last_attempt_at: string | null
          last_error: string | null
          last_status_code: number | null
          locked_at: string | null
          locked_by: string | null
          next_attempt_at: string
          response_preview: string | null
          signature_preview: string | null
          status: string
          subscription_id: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          event_id: string
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          last_status_code?: number | null
          locked_at?: string | null
          locked_by?: string | null
          next_attempt_at?: string
          response_preview?: string | null
          signature_preview?: string | null
          status?: string
          subscription_id: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          event_id?: string
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          last_status_code?: number | null
          locked_at?: string | null
          locked_by?: string | null
          next_attempt_at?: string
          response_preview?: string | null
          signature_preview?: string | null
          status?: string
          subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_gateway_webhook_deliveries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "api_gateway_webhook_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_gateway_webhook_deliveries_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "admin_api_gateway_webhooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_gateway_webhook_deliveries_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "api_gateway_webhook_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      api_gateway_webhook_events: {
        Row: {
          aggregate_id: string | null
          aggregate_type: string | null
          created_at: string
          created_by: string | null
          event_key: string
          event_version: string
          id: string
          payload: Json
          source_module_key: string | null
          status: string
        }
        Insert: {
          aggregate_id?: string | null
          aggregate_type?: string | null
          created_at?: string
          created_by?: string | null
          event_key: string
          event_version?: string
          id?: string
          payload?: Json
          source_module_key?: string | null
          status?: string
        }
        Update: {
          aggregate_id?: string | null
          aggregate_type?: string | null
          created_at?: string
          created_by?: string | null
          event_key?: string
          event_version?: string
          id?: string
          payload?: Json
          source_module_key?: string | null
          status?: string
        }
        Relationships: []
      }
      api_gateway_webhook_subscriptions: {
        Row: {
          created_at: string
          created_by: string | null
          disabled_reason: string | null
          event_keys: string[]
          failure_count: number
          id: string
          last_failure_at: string | null
          last_success_at: string | null
          max_attempts: number
          metadata: Json
          owner_label: string
          retry_policy: Json
          signing_secret_hash: string
          signing_secret_prefix: string | null
          status: string
          subscription_key: string
          target_url: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          disabled_reason?: string | null
          event_keys?: string[]
          failure_count?: number
          id?: string
          last_failure_at?: string | null
          last_success_at?: string | null
          max_attempts?: number
          metadata?: Json
          owner_label: string
          retry_policy?: Json
          signing_secret_hash: string
          signing_secret_prefix?: string | null
          status?: string
          subscription_key: string
          target_url: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          disabled_reason?: string | null
          event_keys?: string[]
          failure_count?: number
          id?: string
          last_failure_at?: string | null
          last_success_at?: string | null
          max_attempts?: number
          metadata?: Json
          owner_label?: string
          retry_policy?: Json
          signing_secret_hash?: string
          signing_secret_prefix?: string | null
          status?: string
          subscription_key?: string
          target_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      asset_downloads: {
        Row: {
          asset_id: string
          downloaded_at: string
          id: string
          user_id: string
        }
        Insert: {
          asset_id: string
          downloaded_at?: string
          id?: string
          user_id: string
        }
        Update: {
          asset_id?: string
          downloaded_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_downloads_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "shareable_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      attribution_events: {
        Row: {
          actor_user_id: string | null
          attributed_user_id: string | null
          attribution_source: string
          campaign_id: string | null
          code: string | null
          confidence: number
          created_at: string
          event_type: string
          id: string
          metadata: Json
          order_id: string | null
          product_id: string | null
          session_id: string | null
          visitor_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          attributed_user_id?: string | null
          attribution_source: string
          campaign_id?: string | null
          code?: string | null
          confidence?: number
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          order_id?: string | null
          product_id?: string | null
          session_id?: string | null
          visitor_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          attributed_user_id?: string | null
          attribution_source?: string
          campaign_id?: string | null
          code?: string | null
          confidence?: number
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          order_id?: string | null
          product_id?: string | null
          session_id?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attribution_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "attribution_events_attributed_user_id_fkey"
            columns: ["attributed_user_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "attribution_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "admin_finance_overview"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "attribution_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribution_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "attribution_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "attribution_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribution_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribution_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
      back_in_stock_alerts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_notified: boolean | null
          notified_at: string | null
          phone: string | null
          product_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_notified?: boolean | null
          notified_at?: string | null
          phone?: string | null
          product_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_notified?: boolean | null
          notified_at?: string | null
          phone?: string | null
          product_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "back_in_stock_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "back_in_stock_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "back_in_stock_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "back_in_stock_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "back_in_stock_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_entities: {
        Row: {
          blocked_by: string | null
          created_at: string
          entity_type: string
          entity_value: string
          id: string
          reason: string | null
        }
        Insert: {
          blocked_by?: string | null
          created_at?: string
          entity_type: string
          entity_value: string
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_by?: string | null
          created_at?: string
          entity_type?: string
          entity_value?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      business_assistant_alerts: {
        Row: {
          alert_type: string
          created_at: string
          description: string
          explanation: Json
          id: string
          severity: string
          source_entity_id: string | null
          source_entity_type: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          description: string
          explanation?: Json
          id?: string
          severity?: string
          source_entity_id?: string | null
          source_entity_type?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          description?: string
          explanation?: Json
          id?: string
          severity?: string
          source_entity_id?: string | null
          source_entity_type?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      business_assistant_context_snapshots: {
        Row: {
          assistant_version: string
          created_at: string
          created_by: string | null
          data_used: Json
          id: string
          next_best_actions: Json
          period: string
          recommended_campaigns: Json
          recommended_courses: Json
          recommended_products: Json
          rules_applied: Json
          source_versions: Json
          strengths: string[]
          summary_text: string
          summary_title: string
          user_id: string
          weaknesses: string[]
        }
        Insert: {
          assistant_version?: string
          created_at?: string
          created_by?: string | null
          data_used?: Json
          id?: string
          next_best_actions?: Json
          period?: string
          recommended_campaigns?: Json
          recommended_courses?: Json
          recommended_products?: Json
          rules_applied?: Json
          source_versions?: Json
          strengths?: string[]
          summary_text: string
          summary_title?: string
          user_id?: string
          weaknesses?: string[]
        }
        Update: {
          assistant_version?: string
          created_at?: string
          created_by?: string | null
          data_used?: Json
          id?: string
          next_best_actions?: Json
          period?: string
          recommended_campaigns?: Json
          recommended_courses?: Json
          recommended_products?: Json
          rules_applied?: Json
          source_versions?: Json
          strengths?: string[]
          summary_text?: string
          summary_title?: string
          user_id?: string
          weaknesses?: string[]
        }
        Relationships: []
      }
      business_assistant_questions: {
        Row: {
          answer: string
          confidence: number
          created_at: string
          data_used: Json
          id: string
          intent: string
          question: string
          recommended_actions: Json
          rules_applied: Json
          user_id: string
        }
        Insert: {
          answer: string
          confidence?: number
          created_at?: string
          data_used?: Json
          id?: string
          intent?: string
          question: string
          recommended_actions?: Json
          rules_applied?: Json
          user_id?: string
        }
        Update: {
          answer?: string
          confidence?: number
          created_at?: string
          data_used?: Json
          id?: string
          intent?: string
          question?: string
          recommended_actions?: Json
          rules_applied?: Json
          user_id?: string
        }
        Relationships: []
      }
      business_assistant_recommendations: {
        Row: {
          created_at: string
          data_used: Json
          description: string
          due_at: string | null
          expected_impact: Json
          explanation: Json
          id: string
          priority: string
          recommendation_type: string
          rules_applied: Json
          snapshot_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_used?: Json
          description: string
          due_at?: string | null
          expected_impact?: Json
          explanation?: Json
          id?: string
          priority?: string
          recommendation_type: string
          rules_applied?: Json
          snapshot_id?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          data_used?: Json
          description?: string
          due_at?: string | null
          expected_impact?: Json
          explanation?: Json
          id?: string
          priority?: string
          recommendation_type?: string
          rules_applied?: Json
          snapshot_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_assistant_recommendations_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "business_assistant_context_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_assistant_recommendations_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "my_business_assistant_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      business_assistant_summaries: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          metrics: Json
          period_end: string
          period_start: string
          recommendations: Json
          summary_type: string
          title: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          metrics?: Json
          period_end: string
          period_start: string
          recommendations?: Json
          summary_type: string
          title: string
          user_id?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          metrics?: Json
          period_end?: string
          period_start?: string
          recommendations?: Json
          summary_type?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      business_engine_version_comparisons: {
        Row: {
          commission_pool_impact_total: number
          different_decision_count: number
          differently_treated_orders: Json
          id: string
          left_business_rules_version: string | null
          left_engine_version: string
          margin_impact_total: number
          orders_compared: number
          requested_at: string
          requested_by: string
          right_business_rules_version: string | null
          right_engine_version: string
          rule_changes: Json
          summary: Json
        }
        Insert: {
          commission_pool_impact_total?: number
          different_decision_count?: number
          differently_treated_orders?: Json
          id?: string
          left_business_rules_version?: string | null
          left_engine_version: string
          margin_impact_total?: number
          orders_compared?: number
          requested_at?: string
          requested_by: string
          right_business_rules_version?: string | null
          right_engine_version: string
          rule_changes?: Json
          summary?: Json
        }
        Update: {
          commission_pool_impact_total?: number
          different_decision_count?: number
          differently_treated_orders?: Json
          id?: string
          left_business_rules_version?: string | null
          left_engine_version?: string
          margin_impact_total?: number
          orders_compared?: number
          requested_at?: string
          requested_by?: string
          right_business_rules_version?: string | null
          right_engine_version?: string
          rule_changes?: Json
          summary?: Json
        }
        Relationships: [
          {
            foreignKeyName: "business_engine_version_comparisons_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      business_flight_recorder_events: {
        Row: {
          advisor_user_id: string | null
          attribution_user_id: string | null
          block_reason: string | null
          business_rules_version: string
          business_score: number | null
          commission_pool_amount: number | null
          commission_reduction_reason: string | null
          created_by: string | null
          decision: string
          engine_name: string
          engine_version: string
          event_sequence: number
          event_time: string
          event_type: string
          explanation: Json
          final_decision: string | null
          fraud_risk_level: string | null
          id: string
          input_data: Json
          margin_amount: number | null
          order_id: string | null
          order_number: string | null
          output_data: Json
          product_cost_total: number | null
          product_id: string | null
          refusal_reason: string | null
          replay_run_id: string | null
          source_id: string | null
          source_table: string | null
          trust_score: number | null
          user_id: string | null
          vendor_id: string | null
        }
        Insert: {
          advisor_user_id?: string | null
          attribution_user_id?: string | null
          block_reason?: string | null
          business_rules_version?: string
          business_score?: number | null
          commission_pool_amount?: number | null
          commission_reduction_reason?: string | null
          created_by?: string | null
          decision?: string
          engine_name?: string
          engine_version?: string
          event_sequence?: number
          event_time?: string
          event_type: string
          explanation?: Json
          final_decision?: string | null
          fraud_risk_level?: string | null
          id?: string
          input_data?: Json
          margin_amount?: number | null
          order_id?: string | null
          order_number?: string | null
          output_data?: Json
          product_cost_total?: number | null
          product_id?: string | null
          refusal_reason?: string | null
          replay_run_id?: string | null
          source_id?: string | null
          source_table?: string | null
          trust_score?: number | null
          user_id?: string | null
          vendor_id?: string | null
        }
        Update: {
          advisor_user_id?: string | null
          attribution_user_id?: string | null
          block_reason?: string | null
          business_rules_version?: string
          business_score?: number | null
          commission_pool_amount?: number | null
          commission_reduction_reason?: string | null
          created_by?: string | null
          decision?: string
          engine_name?: string
          engine_version?: string
          event_sequence?: number
          event_time?: string
          event_type?: string
          explanation?: Json
          final_decision?: string | null
          fraud_risk_level?: string | null
          id?: string
          input_data?: Json
          margin_amount?: number | null
          order_id?: string | null
          order_number?: string | null
          output_data?: Json
          product_cost_total?: number | null
          product_id?: string | null
          refusal_reason?: string | null
          replay_run_id?: string | null
          source_id?: string | null
          source_table?: string | null
          trust_score?: number | null
          user_id?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_flight_recorder_events_advisor_user_id_fkey"
            columns: ["advisor_user_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "business_flight_recorder_events_attribution_user_id_fkey"
            columns: ["attribution_user_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "business_flight_recorder_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "admin_finance_overview"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "business_flight_recorder_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_flight_recorder_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "business_flight_recorder_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "business_flight_recorder_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_flight_recorder_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_flight_recorder_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_flight_recorder_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      business_flight_replay_runs: {
        Row: {
          business_rules_version: string
          completed_at: string
          engine_version: string
          event_count: number
          final_decision: string
          id: string
          order_id: string
          order_number: string
          requested_at: string
          requested_by: string
          summary: Json
        }
        Insert: {
          business_rules_version?: string
          completed_at?: string
          engine_version?: string
          event_count?: number
          final_decision: string
          id?: string
          order_id: string
          order_number: string
          requested_at?: string
          requested_by: string
          summary?: Json
        }
        Update: {
          business_rules_version?: string
          completed_at?: string
          engine_version?: string
          event_count?: number
          final_decision?: string
          id?: string
          order_id?: string
          order_number?: string
          requested_at?: string
          requested_by?: string
          summary?: Json
        }
        Relationships: [
          {
            foreignKeyName: "business_flight_replay_runs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "admin_finance_overview"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "business_flight_replay_runs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_flight_replay_runs_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      business_score_badges: {
        Row: {
          badge_type: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          min_business_score: number
          min_trust_score: number
          required_metrics: Json
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          badge_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          min_business_score?: number
          min_trust_score?: number
          required_metrics?: Json
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          badge_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          min_business_score?: number
          min_trust_score?: number
          required_metrics?: Json
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      business_score_events: {
        Row: {
          created_at: string
          event_source: string
          event_type: string
          id: string
          impact: number
          occurred_at: string
          payload: Json
          reason: string
          score_dimension: string
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          event_source?: string
          event_type: string
          id?: string
          impact?: number
          occurred_at?: string
          payload?: Json
          reason: string
          score_dimension: string
          user_id: string
          weight?: number
        }
        Update: {
          created_at?: string
          event_source?: string
          event_type?: string
          id?: string
          impact?: number
          occurred_at?: string
          payload?: Json
          reason?: string
          score_dimension?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      business_score_profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          is_active: boolean
          metadata: Json
          profile_type: string
          role_tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          profile_type?: string
          role_tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          profile_type?: string
          role_tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      business_score_recommendations: {
        Row: {
          created_at: string
          description: string
          id: string
          metadata: Json
          priority: string
          recommendation_type: string
          snapshot_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          metadata?: Json
          priority?: string
          recommendation_type: string
          snapshot_id?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          metadata?: Json
          priority?: string
          recommendation_type?: string
          snapshot_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_score_recommendations_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "business_score_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      business_score_snapshots: {
        Row: {
          business_score: number
          calculated_at: string
          calculated_by: string | null
          global_score: number
          id: string
          improvement_areas: string[]
          metrics: Json
          profile_type: string
          recommendations: Json
          rule_version: string
          score_level: string
          scoring_version: string
          strengths: string[]
          trust_score: number
          user_id: string
        }
        Insert: {
          business_score?: number
          calculated_at?: string
          calculated_by?: string | null
          global_score?: number
          id?: string
          improvement_areas?: string[]
          metrics?: Json
          profile_type?: string
          recommendations?: Json
          rule_version?: string
          score_level?: string
          scoring_version?: string
          strengths?: string[]
          trust_score?: number
          user_id: string
        }
        Update: {
          business_score?: number
          calculated_at?: string
          calculated_by?: string | null
          global_score?: number
          id?: string
          improvement_areas?: string[]
          metrics?: Json
          profile_type?: string
          recommendations?: Json
          rule_version?: string
          score_level?: string
          scoring_version?: string
          strengths?: string[]
          trust_score?: number
          user_id?: string
        }
        Relationships: []
      }
      business_score_user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          reason: string | null
          revoked_at: string | null
          snapshot_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          reason?: string | null
          revoked_at?: string | null
          snapshot_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          reason?: string | null
          revoked_at?: string | null
          snapshot_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_score_user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "business_score_badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_score_user_badges_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "business_score_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_deliveries: {
        Row: {
          campaign_id: string
          channel: string
          created_at: string
          delivered_at: string
          error: string | null
          id: string
          status: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          channel: string
          created_at?: string
          delivered_at?: string
          error?: string | null
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          channel?: string
          created_at?: string
          delivered_at?: string
          error?: string | null
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_deliveries_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "retention_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_deliveries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      cart_items: {
        Row: {
          created_at: string | null
          id: string
          packaging_option_id: string | null
          product_id: string
          quantity: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          packaging_option_id?: string | null
          product_id: string
          quantity?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          packaging_option_id?: string | null
          product_id?: string
          quantity?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_packaging_option_id_fkey"
            columns: ["packaging_option_id"]
            isOneToOne: false
            referencedRelation: "active_product_packaging_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_packaging_option_id_fkey"
            columns: ["packaging_option_id"]
            isOneToOne: false
            referencedRelation: "product_packaging_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      catalogue_ai_enrichment_proposals: {
        Row: {
          confidence_score: number
          created_at: string
          created_by: string | null
          current_value: Json
          explanation: string
          id: string
          product_id: string
          proposal_type: string
          proposed_value: Json
          quality_snapshot_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          vendor_owner_id: string | null
          vendor_shop_id: string | null
        }
        Insert: {
          confidence_score?: number
          created_at?: string
          created_by?: string | null
          current_value?: Json
          explanation: string
          id?: string
          product_id: string
          proposal_type: string
          proposed_value?: Json
          quality_snapshot_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          vendor_owner_id?: string | null
          vendor_shop_id?: string | null
        }
        Update: {
          confidence_score?: number
          created_at?: string
          created_by?: string | null
          current_value?: Json
          explanation?: string
          id?: string
          product_id?: string
          proposal_type?: string
          proposed_value?: Json
          quality_snapshot_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          vendor_owner_id?: string | null
          vendor_shop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalogue_ai_enrichment_proposals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "catalogue_ai_enrichment_proposals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "catalogue_ai_enrichment_proposals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_ai_enrichment_proposals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_ai_enrichment_proposals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_ai_enrichment_proposals_quality_snapshot_id_fkey"
            columns: ["quality_snapshot_id"]
            isOneToOne: false
            referencedRelation: "catalogue_product_quality_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_ai_enrichment_proposals_quality_snapshot_id_fkey"
            columns: ["quality_snapshot_id"]
            isOneToOne: false
            referencedRelation: "my_catalogue_quality_latest"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_ai_enrichment_proposals_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "catalogue_ai_enrichment_proposals_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "catalogue_ai_enrichment_proposals_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogue_attribute_definitions: {
        Row: {
          allowed_values: Json
          applies_to_categories: string[]
          code: string
          created_at: string
          created_by: string | null
          data_type: string
          id: string
          is_active: boolean
          is_required: boolean
          label: string
          official_unit: string | null
          synonyms: string[]
          updated_at: string
          validation_rules: Json
        }
        Insert: {
          allowed_values?: Json
          applies_to_categories?: string[]
          code: string
          created_at?: string
          created_by?: string | null
          data_type: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          label: string
          official_unit?: string | null
          synonyms?: string[]
          updated_at?: string
          validation_rules?: Json
        }
        Update: {
          allowed_values?: Json
          applies_to_categories?: string[]
          code?: string
          created_at?: string
          created_by?: string | null
          data_type?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          label?: string
          official_unit?: string | null
          synonyms?: string[]
          updated_at?: string
          validation_rules?: Json
        }
        Relationships: []
      }
      catalogue_brand_references: {
        Row: {
          aliases: string[]
          canonical_name: string
          country: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          normalized_name: string
          notes: string | null
          producer: string | null
          updated_at: string
        }
        Insert: {
          aliases?: string[]
          canonical_name: string
          country?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          normalized_name: string
          notes?: string | null
          producer?: string | null
          updated_at?: string
        }
        Update: {
          aliases?: string[]
          canonical_name?: string
          country?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          normalized_name?: string
          notes?: string | null
          producer?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      catalogue_category_taxonomy: {
        Row: {
          aliases: string[]
          category_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_public: boolean
          label: string
          level: string
          parent_id: string | null
          rules: Json
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          aliases?: string[]
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          label: string
          level: string
          parent_id?: string | null
          rules?: Json
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          aliases?: string[]
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          label?: string
          level?: string
          parent_id?: string | null
          rules?: Json
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalogue_category_taxonomy_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_category_taxonomy_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "catalogue_category_taxonomy"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogue_duplicate_candidates: {
        Row: {
          candidate_product_id: string
          confidence_score: number
          created_at: string
          details: Json
          id: string
          product_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          signals: string[]
          status: string
          updated_at: string
          vendor_shop_id: string | null
        }
        Insert: {
          candidate_product_id: string
          confidence_score?: number
          created_at?: string
          details?: Json
          id?: string
          product_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          signals?: string[]
          status?: string
          updated_at?: string
          vendor_shop_id?: string | null
        }
        Update: {
          candidate_product_id?: string
          confidence_score?: number
          created_at?: string
          details?: Json
          id?: string
          product_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          signals?: string[]
          status?: string
          updated_at?: string
          vendor_shop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalogue_duplicate_candidates_candidate_product_id_fkey"
            columns: ["candidate_product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "catalogue_duplicate_candidates_candidate_product_id_fkey"
            columns: ["candidate_product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "catalogue_duplicate_candidates_candidate_product_id_fkey"
            columns: ["candidate_product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_duplicate_candidates_candidate_product_id_fkey"
            columns: ["candidate_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_duplicate_candidates_candidate_product_id_fkey"
            columns: ["candidate_product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_duplicate_candidates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "catalogue_duplicate_candidates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "catalogue_duplicate_candidates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_duplicate_candidates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_duplicate_candidates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_duplicate_candidates_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "catalogue_duplicate_candidates_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "catalogue_duplicate_candidates_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogue_intelligence_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          explanation: string | null
          id: string
          metadata: Json
          new_status: string | null
          previous_status: string | null
          product_id: string | null
          vendor_shop_id: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          explanation?: string | null
          id?: string
          metadata?: Json
          new_status?: string | null
          previous_status?: string | null
          product_id?: string | null
          vendor_shop_id?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          explanation?: string | null
          id?: string
          metadata?: Json
          new_status?: string | null
          previous_status?: string | null
          product_id?: string | null
          vendor_shop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalogue_intelligence_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "catalogue_intelligence_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "catalogue_intelligence_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_intelligence_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_intelligence_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_intelligence_events_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "catalogue_intelligence_events_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "catalogue_intelligence_events_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogue_product_quality_snapshots: {
        Row: {
          analyzed_at: string
          analyzed_by: string | null
          attribute_score: number
          brand_score: number
          catalogue_quality_score: number
          category_score: number
          completeness_score: number
          consistency_score: number
          created_at: string
          duplicate_signals: Json
          engine_version: string
          id: string
          image_score: number
          missing_attributes: string[]
          normalization_issues: string[]
          product_id: string
          seo_score: number
          suggested_attributes: Json
          suggested_brand_id: string | null
          suggested_taxonomy_id: string | null
          variant_score: number
          vendor_owner_id: string | null
          vendor_shop_id: string | null
        }
        Insert: {
          analyzed_at?: string
          analyzed_by?: string | null
          attribute_score?: number
          brand_score?: number
          catalogue_quality_score?: number
          category_score?: number
          completeness_score?: number
          consistency_score?: number
          created_at?: string
          duplicate_signals?: Json
          engine_version?: string
          id?: string
          image_score?: number
          missing_attributes?: string[]
          normalization_issues?: string[]
          product_id: string
          seo_score?: number
          suggested_attributes?: Json
          suggested_brand_id?: string | null
          suggested_taxonomy_id?: string | null
          variant_score?: number
          vendor_owner_id?: string | null
          vendor_shop_id?: string | null
        }
        Update: {
          analyzed_at?: string
          analyzed_by?: string | null
          attribute_score?: number
          brand_score?: number
          catalogue_quality_score?: number
          category_score?: number
          completeness_score?: number
          consistency_score?: number
          created_at?: string
          duplicate_signals?: Json
          engine_version?: string
          id?: string
          image_score?: number
          missing_attributes?: string[]
          normalization_issues?: string[]
          product_id?: string
          seo_score?: number
          suggested_attributes?: Json
          suggested_brand_id?: string | null
          suggested_taxonomy_id?: string | null
          variant_score?: number
          vendor_owner_id?: string | null
          vendor_shop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalogue_product_quality_snapshots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "catalogue_product_quality_snapshots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "catalogue_product_quality_snapshots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_product_quality_snapshots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_product_quality_snapshots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_product_quality_snapshots_suggested_brand_id_fkey"
            columns: ["suggested_brand_id"]
            isOneToOne: false
            referencedRelation: "catalogue_brand_references"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_product_quality_snapshots_suggested_taxonomy_id_fkey"
            columns: ["suggested_taxonomy_id"]
            isOneToOne: false
            referencedRelation: "catalogue_category_taxonomy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_product_quality_snapshots_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "catalogue_product_quality_snapshots_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "catalogue_product_quality_snapshots_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogue_product_variants: {
        Row: {
          bottle_quantity: number | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_primary: boolean
          metadata: Json
          normalized_value: string | null
          parent_product_id: string | null
          product_id: string
          unit: string | null
          updated_at: string
          variant_label: string
          variant_type: string
        }
        Insert: {
          bottle_quantity?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          metadata?: Json
          normalized_value?: string | null
          parent_product_id?: string | null
          product_id: string
          unit?: string | null
          updated_at?: string
          variant_label: string
          variant_type: string
        }
        Update: {
          bottle_quantity?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          metadata?: Json
          normalized_value?: string | null
          parent_product_id?: string | null
          product_id?: string
          unit?: string | null
          updated_at?: string
          variant_label?: string
          variant_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalogue_product_variants_parent_product_id_fkey"
            columns: ["parent_product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "catalogue_product_variants_parent_product_id_fkey"
            columns: ["parent_product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "catalogue_product_variants_parent_product_id_fkey"
            columns: ["parent_product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_product_variants_parent_product_id_fkey"
            columns: ["parent_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_product_variants_parent_product_id_fkey"
            columns: ["parent_product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "catalogue_product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "catalogue_product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          low_stock_threshold: number | null
          name: string
          parent_id: string | null
          points_tiers_override: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          low_stock_threshold?: number | null
          name: string
          parent_id?: string | null
          points_tiers_override?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          low_stock_threshold?: number | null
          name?: string
          parent_id?: string | null
          points_tiers_override?: Json | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_participations: {
        Row: {
          bonus_claimed: boolean | null
          bonus_claimed_at: string | null
          challenge_id: string
          completed_at: string | null
          created_at: string
          current_progress: number | null
          id: string
          is_completed: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bonus_claimed?: boolean | null
          bonus_claimed_at?: string | null
          challenge_id: string
          completed_at?: string | null
          created_at?: string
          current_progress?: number | null
          id?: string
          is_completed?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bonus_claimed?: boolean | null
          bonus_claimed_at?: string | null
          challenge_id?: string
          completed_at?: string | null
          created_at?: string
          current_progress?: number | null
          id?: string
          is_completed?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participations_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "ambassador_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_activity_log: {
        Row: {
          action: string
          advisor_id: string
          created_at: string
          id: string
          payload: Json
          session_id: string | null
        }
        Insert: {
          action: string
          advisor_id?: string
          created_at?: string
          id?: string
          payload?: Json
          session_id?: string | null
        }
        Update: {
          action?: string
          advisor_id?: string
          created_at?: string
          id?: string
          payload?: Json
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_activity_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "advisor_conversation_coach_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_activity_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "coach_conversation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_conversation_feedback: {
        Row: {
          created_at: string
          created_by: string
          id: string
          outcome: string
          reason: string | null
          selected_variant_id: string | null
          session_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          outcome: string
          reason?: string | null
          selected_variant_id?: string | null
          session_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          outcome?: string
          reason?: string | null
          selected_variant_id?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_conversation_feedback_selected_variant_id_fkey"
            columns: ["selected_variant_id"]
            isOneToOne: false
            referencedRelation: "coach_response_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_conversation_feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "advisor_conversation_coach_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_conversation_feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "coach_conversation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_conversation_recommendations: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          product_id: string | null
          rationale: string | null
          recommendation_type: string
          score: number
          session_id: string
          suggested_message: string | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          product_id?: string | null
          rationale?: string | null
          recommendation_type: string
          score?: number
          session_id: string
          suggested_message?: string | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          product_id?: string | null
          rationale?: string | null
          recommendation_type?: string
          score?: number
          session_id?: string
          suggested_message?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_conversation_recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "coach_conversation_recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "coach_conversation_recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_conversation_recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_conversation_recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_conversation_recommendations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "advisor_conversation_coach_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_conversation_recommendations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "coach_conversation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_conversation_sessions: {
        Row: {
          advisor_id: string
          analysis_summary: Json
          archived_at: string | null
          contact_id: string | null
          conversation_text: string
          created_at: string
          detected_budget: number | null
          detected_city: string | null
          detected_customer_type: string | null
          detected_intent: string | null
          detected_objections: string[]
          detected_occasion: string | null
          detected_people_count: number | null
          detected_risk_flags: string[]
          detected_urgency: string | null
          id: string
          mode: string
          source_channel: string
          status: string
          updated_at: string
        }
        Insert: {
          advisor_id?: string
          analysis_summary?: Json
          archived_at?: string | null
          contact_id?: string | null
          conversation_text: string
          created_at?: string
          detected_budget?: number | null
          detected_city?: string | null
          detected_customer_type?: string | null
          detected_intent?: string | null
          detected_objections?: string[]
          detected_occasion?: string | null
          detected_people_count?: number | null
          detected_risk_flags?: string[]
          detected_urgency?: string | null
          id?: string
          mode?: string
          source_channel?: string
          status?: string
          updated_at?: string
        }
        Update: {
          advisor_id?: string
          analysis_summary?: Json
          archived_at?: string | null
          contact_id?: string | null
          conversation_text?: string
          created_at?: string
          detected_budget?: number | null
          detected_city?: string | null
          detected_customer_type?: string | null
          detected_intent?: string | null
          detected_objections?: string[]
          detected_occasion?: string | null
          detected_people_count?: number | null
          detected_risk_flags?: string[]
          detected_urgency?: string | null
          id?: string
          mode?: string
          source_channel?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_conversation_sessions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_order_summary"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "coach_conversation_sessions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_conversation_sessions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_duplicate_candidates"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "coach_conversation_sessions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_duplicate_candidates"
            referencedColumns: ["possible_duplicate_contact_id"]
          },
        ]
      }
      coach_response_variants: {
        Row: {
          content: string
          created_at: string
          id: string
          is_selected: boolean
          session_id: string
          tone: string
          variant_type: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_selected?: boolean
          session_id: string
          tone: string
          variant_type: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_selected?: boolean
          session_id?: string
          tone?: string
          variant_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_response_variants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "advisor_conversation_coach_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_response_variants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "coach_conversation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_script_templates: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          script_type: string
          title: string
          updated_at: string
          variables: Json
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          script_type: string
          title: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          script_type?: string
          title?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: []
      }
      commercial_asset_events: {
        Row: {
          channel: string | null
          created_at: string
          event_type: string
          generation_id: string | null
          id: string
          metadata: Json
          owner_id: string
        }
        Insert: {
          channel?: string | null
          created_at?: string
          event_type: string
          generation_id?: string | null
          id?: string
          metadata?: Json
          owner_id?: string
        }
        Update: {
          channel?: string | null
          created_at?: string
          event_type?: string
          generation_id?: string | null
          id?: string
          metadata?: Json
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commercial_asset_events_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "advisor_commercial_asset_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_asset_events_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "commercial_asset_generations"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_asset_exports: {
        Row: {
          completed_at: string | null
          created_at: string
          export_format: string
          export_status: string
          file_url: string | null
          generation_id: string
          id: string
          metadata: Json
          requested_by: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          export_format: string
          export_status?: string
          file_url?: string | null
          generation_id: string
          id?: string
          metadata?: Json
          requested_by?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          export_format?: string
          export_status?: string
          file_url?: string | null
          generation_id?: string
          id?: string
          metadata?: Json
          requested_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "commercial_asset_exports_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "advisor_commercial_asset_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_asset_exports_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "commercial_asset_generations"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_asset_generations: {
        Row: {
          archived_at: string | null
          asset_type: string
          brief: string | null
          content_text: string
          created_at: string
          export_formats: string[]
          html_preview: string | null
          id: string
          official_image_urls: string[]
          owner_id: string
          personalization: Json
          recommended_products: Json
          source_context: Json
          status: string
          template_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          asset_type: string
          brief?: string | null
          content_text: string
          created_at?: string
          export_formats?: string[]
          html_preview?: string | null
          id?: string
          official_image_urls?: string[]
          owner_id?: string
          personalization?: Json
          recommended_products?: Json
          source_context?: Json
          status?: string
          template_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          asset_type?: string
          brief?: string | null
          content_text?: string
          created_at?: string
          export_formats?: string[]
          html_preview?: string | null
          id?: string
          official_image_urls?: string[]
          owner_id?: string
          personalization?: Json
          recommended_products?: Json
          source_context?: Json
          status?: string
          template_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commercial_asset_generations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "advisor_commercial_asset_template_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_asset_generations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "commercial_asset_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_asset_templates: {
        Row: {
          allowed_export_formats: string[]
          body_template: string
          created_at: string
          created_by: string | null
          default_tone: string
          description: string | null
          id: string
          is_active: boolean
          is_official: boolean
          layout_schema: Json
          occasion: string
          required_assets: Json
          target_audience: string
          template_type: string
          title: string
          updated_at: string
        }
        Insert: {
          allowed_export_formats?: string[]
          body_template: string
          created_at?: string
          created_by?: string | null
          default_tone?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_official?: boolean
          layout_schema?: Json
          occasion?: string
          required_assets?: Json
          target_audience?: string
          template_type: string
          title: string
          updated_at?: string
        }
        Update: {
          allowed_export_formats?: string[]
          body_template?: string
          created_at?: string
          created_by?: string | null
          default_tone?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_official?: boolean
          layout_schema?: Json
          occasion?: string
          required_assets?: Json
          target_audience?: string
          template_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      commercial_opportunity_activity_log: {
        Row: {
          action: string
          actor_id: string | null
          campaign_id: string | null
          created_at: string
          details: Json
          event_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          campaign_id?: string | null
          created_at?: string
          details?: Json
          event_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          campaign_id?: string | null
          created_at?: string
          details?: Json
          event_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commercial_opportunity_activity_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "commercial_opportunity_activity_log_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "commercial_opportunity_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_opportunity_activity_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "admin_commercial_opportunity_calendar_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_opportunity_activity_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "advisor_commercial_opportunity_calendar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_opportunity_activity_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "commercial_opportunity_events"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_opportunity_campaigns: {
        Row: {
          channel: string
          created_at: string
          created_by: string | null
          ends_at: string
          event_id: string | null
          id: string
          metadata: Json
          name: string
          objective: string | null
          publication_ends_at: string | null
          publication_starts_at: string | null
          starts_at: string
          status: string
          target_cities: string[]
          target_client_types: string[]
          target_partner_ids: string[]
          target_regions: string[]
          target_vendor_ids: string[]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          channel?: string
          created_at?: string
          created_by?: string | null
          ends_at: string
          event_id?: string | null
          id?: string
          metadata?: Json
          name: string
          objective?: string | null
          publication_ends_at?: string | null
          publication_starts_at?: string | null
          starts_at: string
          status?: string
          target_cities?: string[]
          target_client_types?: string[]
          target_partner_ids?: string[]
          target_regions?: string[]
          target_vendor_ids?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string
          event_id?: string | null
          id?: string
          metadata?: Json
          name?: string
          objective?: string | null
          publication_ends_at?: string | null
          publication_starts_at?: string | null
          starts_at?: string
          status?: string
          target_cities?: string[]
          target_client_types?: string[]
          target_partner_ids?: string[]
          target_regions?: string[]
          target_vendor_ids?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commercial_opportunity_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "commercial_opportunity_campaigns_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "admin_commercial_opportunity_calendar_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_opportunity_campaigns_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "advisor_commercial_opportunity_calendar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_opportunity_campaigns_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "commercial_opportunity_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_opportunity_campaigns_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      commercial_opportunity_event_categories: {
        Row: {
          category_id: string
          created_at: string
          event_id: string
          rationale: string | null
          relevance_score: number
          sort_order: number
        }
        Insert: {
          category_id: string
          created_at?: string
          event_id: string
          rationale?: string | null
          relevance_score?: number
          sort_order?: number
        }
        Update: {
          category_id?: string
          created_at?: string
          event_id?: string
          rationale?: string | null
          relevance_score?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "commercial_opportunity_event_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_opportunity_event_categories_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "admin_commercial_opportunity_calendar_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_opportunity_event_categories_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "advisor_commercial_opportunity_calendar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_opportunity_event_categories_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "commercial_opportunity_events"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_opportunity_event_products: {
        Row: {
          created_at: string
          event_id: string
          product_id: string
          rationale: string | null
          recommended_packaging: string | null
          relevance_score: number
          sort_order: number
        }
        Insert: {
          created_at?: string
          event_id: string
          product_id: string
          rationale?: string | null
          recommended_packaging?: string | null
          relevance_score?: number
          sort_order?: number
        }
        Update: {
          created_at?: string
          event_id?: string
          product_id?: string
          rationale?: string | null
          recommended_packaging?: string | null
          relevance_score?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "commercial_opportunity_event_products_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "admin_commercial_opportunity_calendar_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_opportunity_event_products_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "advisor_commercial_opportunity_calendar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_opportunity_event_products_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "commercial_opportunity_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_opportunity_event_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "commercial_opportunity_event_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "commercial_opportunity_event_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_opportunity_event_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_opportunity_event_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_opportunity_events: {
        Row: {
          ai_brief: Json
          archived_at: string | null
          archived_reason: string | null
          auto_publish_at: string | null
          category: string
          commercial_objective: string | null
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string
          event_type: string
          id: string
          is_active: boolean
          marketing_asset_requirements: Json
          name: string
          priority: string
          publication_ends_at: string | null
          publication_starts_at: string | null
          recommended_actions: Json
          recurrence_rule: Json
          slug: string
          starts_at: string
          status: string
          target_cities: string[]
          target_client_types: string[]
          target_partner_ids: string[]
          target_regions: string[]
          target_vendor_ids: string[]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ai_brief?: Json
          archived_at?: string | null
          archived_reason?: string | null
          auto_publish_at?: string | null
          category?: string
          commercial_objective?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at: string
          event_type?: string
          id?: string
          is_active?: boolean
          marketing_asset_requirements?: Json
          name: string
          priority?: string
          publication_ends_at?: string | null
          publication_starts_at?: string | null
          recommended_actions?: Json
          recurrence_rule?: Json
          slug: string
          starts_at: string
          status?: string
          target_cities?: string[]
          target_client_types?: string[]
          target_partner_ids?: string[]
          target_regions?: string[]
          target_vendor_ids?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ai_brief?: Json
          archived_at?: string | null
          archived_reason?: string | null
          auto_publish_at?: string | null
          category?: string
          commercial_objective?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string
          event_type?: string
          id?: string
          is_active?: boolean
          marketing_asset_requirements?: Json
          name?: string
          priority?: string
          publication_ends_at?: string | null
          publication_starts_at?: string | null
          recommended_actions?: Json
          recurrence_rule?: Json
          slug?: string
          starts_at?: string
          status?: string
          target_cities?: string[]
          target_client_types?: string[]
          target_partner_ids?: string[]
          target_regions?: string[]
          target_vendor_ids?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commercial_opportunity_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "commercial_opportunity_events_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      commercial_opportunity_marketing_assets: {
        Row: {
          ai_generation_context: Json
          asset_type: string
          asset_url: string | null
          campaign_id: string | null
          content: string | null
          created_at: string
          created_by: string | null
          event_id: string | null
          id: string
          status: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ai_generation_context?: Json
          asset_type: string
          asset_url?: string | null
          campaign_id?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          id?: string
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ai_generation_context?: Json
          asset_type?: string
          asset_url?: string | null
          campaign_id?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commercial_opportunity_marketing_assets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "commercial_opportunity_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_opportunity_marketing_assets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "commercial_opportunity_marketing_assets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "admin_commercial_opportunity_calendar_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_opportunity_marketing_assets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "advisor_commercial_opportunity_calendar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_opportunity_marketing_assets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "commercial_opportunity_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_opportunity_marketing_assets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      commercial_opportunity_missions: {
        Row: {
          advisor_id: string | null
          ai_prompt_context: Json
          campaign_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_at: string | null
          event_id: string | null
          id: string
          mission_type: string
          priority: string
          status: string
          success_criteria: Json
          suggested_cities: string[]
          suggested_client_types: string[]
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          advisor_id?: string | null
          ai_prompt_context?: Json
          campaign_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          event_id?: string | null
          id?: string
          mission_type?: string
          priority?: string
          status?: string
          success_criteria?: Json
          suggested_cities?: string[]
          suggested_client_types?: string[]
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          advisor_id?: string | null
          ai_prompt_context?: Json
          campaign_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          event_id?: string | null
          id?: string
          mission_type?: string
          priority?: string
          status?: string
          success_criteria?: Json
          suggested_cities?: string[]
          suggested_client_types?: string[]
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commercial_opportunity_missions_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "commercial_opportunity_missions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "commercial_opportunity_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_opportunity_missions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "commercial_opportunity_missions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "admin_commercial_opportunity_calendar_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_opportunity_missions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "advisor_commercial_opportunity_calendar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_opportunity_missions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "commercial_opportunity_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_opportunity_missions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      commission_pool_snapshots: {
        Row: {
          campaign_reserve_amount: number
          campaign_reserve_rate: number
          created_at: string
          decision: string
          direct_pool_amount: number
          direct_share_rate: number
          id: string
          indirect_pool_amount: number
          indirect_share_rate: number
          mode: string
          order_id: string
          pool_available: number
          quality_reserve_amount: number
          quality_reserve_rate: number
          rejection_reasons: Json
          revenue_snapshot_id: string
          rules_version: string
          warnings: Json
        }
        Insert: {
          campaign_reserve_amount?: number
          campaign_reserve_rate?: number
          created_at?: string
          decision?: string
          direct_pool_amount?: number
          direct_share_rate?: number
          id?: string
          indirect_pool_amount?: number
          indirect_share_rate?: number
          mode?: string
          order_id: string
          pool_available?: number
          quality_reserve_amount?: number
          quality_reserve_rate?: number
          rejection_reasons?: Json
          revenue_snapshot_id: string
          rules_version?: string
          warnings?: Json
        }
        Update: {
          campaign_reserve_amount?: number
          campaign_reserve_rate?: number
          created_at?: string
          decision?: string
          direct_pool_amount?: number
          direct_share_rate?: number
          id?: string
          indirect_pool_amount?: number
          indirect_share_rate?: number
          mode?: string
          order_id?: string
          pool_available?: number
          quality_reserve_amount?: number
          quality_reserve_rate?: number
          rejection_reasons?: Json
          revenue_snapshot_id?: string
          rules_version?: string
          warnings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "commission_pool_snapshots_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "admin_finance_overview"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "commission_pool_snapshots_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_pool_snapshots_revenue_snapshot_id_fkey"
            columns: ["revenue_snapshot_id"]
            isOneToOne: false
            referencedRelation: "revenue_engine_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          level: number
          rate_percentage: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          level: number
          rate_percentage: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          level?: number
          rate_percentage?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      commissions: {
        Row: {
          beneficiary_id: string
          bonus_rate: number | null
          commission_amount: number
          commission_rate: number
          created_at: string | null
          dedupe_key: string | null
          id: string
          level: number
          order_amount: number
          order_id: string | null
          paid_at: string | null
          purchaser_id: string | null
          reversal_reason: string | null
          reversal_wallet_recovered_amount: number
          reversed_at: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
        }
        Insert: {
          beneficiary_id: string
          bonus_rate?: number | null
          commission_amount: number
          commission_rate: number
          created_at?: string | null
          dedupe_key?: string | null
          id?: string
          level: number
          order_amount: number
          order_id?: string | null
          paid_at?: string | null
          purchaser_id?: string | null
          reversal_reason?: string | null
          reversal_wallet_recovered_amount?: number
          reversed_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
        }
        Update: {
          beneficiary_id?: string
          bonus_rate?: number | null
          commission_amount?: number
          commission_rate?: number
          created_at?: string | null
          dedupe_key?: string | null
          id?: string
          level?: number
          order_amount?: number
          order_id?: string | null
          paid_at?: string | null
          purchaser_id?: string | null
          reversal_reason?: string | null
          reversal_wallet_recovered_amount?: number
          reversed_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "admin_finance_overview"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_purchaser_id_fkey"
            columns: ["purchaser_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      crm_activity_log: {
        Row: {
          activity_type: string
          advisor_id: string | null
          channel: string | null
          contact_id: string | null
          id: string
          metadata: Json
          occurred_at: string
          summary: string
        }
        Insert: {
          activity_type: string
          advisor_id?: string | null
          channel?: string | null
          contact_id?: string | null
          id?: string
          metadata?: Json
          occurred_at?: string
          summary: string
        }
        Update: {
          activity_type?: string
          advisor_id?: string | null
          channel?: string | null
          contact_id?: string | null
          id?: string
          metadata?: Json
          occurred_at?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_activity_log_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "crm_activity_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_order_summary"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "crm_activity_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activity_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_duplicate_candidates"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "crm_activity_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_duplicate_candidates"
            referencedColumns: ["possible_duplicate_contact_id"]
          },
        ]
      }
      crm_contact_preferences: {
        Row: {
          ai_context: Json
          budget_max: number | null
          budget_min: number | null
          contact_id: string
          dislikes: string[]
          notes: string | null
          preferred_brands: string[]
          preferred_categories: string[]
          preferred_occasions: string[]
          preferred_products: string[]
          updated_at: string
        }
        Insert: {
          ai_context?: Json
          budget_max?: number | null
          budget_min?: number | null
          contact_id: string
          dislikes?: string[]
          notes?: string | null
          preferred_brands?: string[]
          preferred_categories?: string[]
          preferred_occasions?: string[]
          preferred_products?: string[]
          updated_at?: string
        }
        Update: {
          ai_context?: Json
          budget_max?: number | null
          budget_min?: number | null
          contact_id?: string
          dislikes?: string[]
          notes?: string | null
          preferred_brands?: string[]
          preferred_categories?: string[]
          preferred_occasions?: string[]
          preferred_products?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contact_preferences_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "crm_contact_order_summary"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "crm_contact_preferences_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contact_preferences_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "crm_duplicate_candidates"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "crm_contact_preferences_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "crm_duplicate_candidates"
            referencedColumns: ["possible_duplicate_contact_id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          archived_at: string | null
          archived_reason: string | null
          birthday: string | null
          city: string | null
          company_name: string | null
          consent_recorded_at: string | null
          consent_status: string
          contact_type: string
          created_at: string
          do_not_contact: boolean
          duplicate_key: string | null
          email: string | null
          email_normalized: string | null
          first_name: string | null
          id: string
          last_name: string | null
          linked_user_id: string | null
          metadata: Json
          owner_advisor_id: string
          phone: string | null
          phone_normalized: string | null
          pipeline_stage: string
          preferred_channel: string
          relationship_status: string
          retention_until: string | null
          source: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          archived_reason?: string | null
          birthday?: string | null
          city?: string | null
          company_name?: string | null
          consent_recorded_at?: string | null
          consent_status?: string
          contact_type?: string
          created_at?: string
          do_not_contact?: boolean
          duplicate_key?: string | null
          email?: string | null
          email_normalized?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          linked_user_id?: string | null
          metadata?: Json
          owner_advisor_id: string
          phone?: string | null
          phone_normalized?: string | null
          pipeline_stage?: string
          preferred_channel?: string
          relationship_status?: string
          retention_until?: string | null
          source?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          archived_reason?: string | null
          birthday?: string | null
          city?: string | null
          company_name?: string | null
          consent_recorded_at?: string | null
          consent_status?: string
          contact_type?: string
          created_at?: string
          do_not_contact?: boolean
          duplicate_key?: string | null
          email?: string | null
          email_normalized?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          linked_user_id?: string | null
          metadata?: Json
          owner_advisor_id?: string
          phone?: string | null
          phone_normalized?: string | null
          pipeline_stage?: string
          preferred_channel?: string
          relationship_status?: string
          retention_until?: string | null
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_linked_user_id_fkey"
            columns: ["linked_user_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "crm_contacts_owner_advisor_id_fkey"
            columns: ["owner_advisor_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      crm_events: {
        Row: {
          advisor_id: string
          contact_id: string
          created_at: string
          event_date: string
          event_type: string
          id: string
          notes: string | null
          recurrence: string
          updated_at: string
        }
        Insert: {
          advisor_id: string
          contact_id: string
          created_at?: string
          event_date: string
          event_type?: string
          id?: string
          notes?: string | null
          recurrence?: string
          updated_at?: string
        }
        Update: {
          advisor_id?: string
          contact_id?: string
          created_at?: string
          event_date?: string
          event_type?: string
          id?: string
          notes?: string | null
          recurrence?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_events_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "crm_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_order_summary"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "crm_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_duplicate_candidates"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "crm_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_duplicate_candidates"
            referencedColumns: ["possible_duplicate_contact_id"]
          },
        ]
      }
      crm_notes: {
        Row: {
          advisor_id: string
          contact_id: string
          content: string
          created_at: string
          id: string
          is_sensitive: boolean
          updated_at: string
        }
        Insert: {
          advisor_id: string
          contact_id: string
          content: string
          created_at?: string
          id?: string
          is_sensitive?: boolean
          updated_at?: string
        }
        Update: {
          advisor_id?: string
          contact_id?: string
          content?: string
          created_at?: string
          id?: string
          is_sensitive?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_notes_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "crm_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_order_summary"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "crm_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_duplicate_candidates"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "crm_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_duplicate_candidates"
            referencedColumns: ["possible_duplicate_contact_id"]
          },
        ]
      }
      crm_opportunities: {
        Row: {
          advisor_id: string
          contact_id: string
          created_at: string
          estimated_budget: number | null
          expected_date: string | null
          id: string
          notes: string | null
          opportunity_type: string
          probability: number
          stage: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          advisor_id: string
          contact_id: string
          created_at?: string
          estimated_budget?: number | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          opportunity_type?: string
          probability?: number
          stage?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          advisor_id?: string
          contact_id?: string
          created_at?: string
          estimated_budget?: number | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          opportunity_type?: string
          probability?: number
          stage?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_opportunities_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "crm_opportunities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_order_summary"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "crm_opportunities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_opportunities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_duplicate_candidates"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "crm_opportunities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_duplicate_candidates"
            referencedColumns: ["possible_duplicate_contact_id"]
          },
        ]
      }
      crm_tasks: {
        Row: {
          advisor_id: string
          completed_at: string | null
          contact_id: string | null
          created_at: string
          description: string | null
          due_at: string
          id: string
          metadata: Json
          priority: string
          status: string
          task_type: string
          title: string
          updated_at: string
        }
        Insert: {
          advisor_id: string
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          due_at: string
          id?: string
          metadata?: Json
          priority?: string
          status?: string
          task_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          advisor_id?: string
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          due_at?: string
          id?: string
          metadata?: Json
          priority?: string
          status?: string
          task_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tasks_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "crm_tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_order_summary"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "crm_tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_duplicate_candidates"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "crm_tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_duplicate_candidates"
            referencedColumns: ["possible_duplicate_contact_id"]
          },
        ]
      }
      currency_rates: {
        Row: {
          base_currency: string
          created_at: string
          id: string
          metadata: Json
          quote_currency: string
          rate: number
          source: string
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          base_currency: string
          created_at?: string
          id?: string
          metadata?: Json
          quote_currency: string
          rate: number
          source?: string
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          base_currency?: string
          created_at?: string
          id?: string
          metadata?: Json
          quote_currency?: string
          rate?: number
          source?: string
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: []
      }
      customer_segments: {
        Row: {
          computed_at: string
          created_at: string
          f_score: number
          frequency: number
          id: string
          last_order_at: string | null
          m_score: number
          monetary: number
          r_score: number
          recency_days: number
          segment: string
          updated_at: string
          user_id: string
        }
        Insert: {
          computed_at?: string
          created_at?: string
          f_score?: number
          frequency?: number
          id?: string
          last_order_at?: string | null
          m_score?: number
          monetary?: number
          r_score?: number
          recency_days?: number
          segment?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          computed_at?: string
          created_at?: string
          f_score?: number
          frequency?: number
          id?: string
          last_order_at?: string | null
          m_score?: number
          monetary?: number
          r_score?: number
          recency_days?: number
          segment?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_segments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      delivery_zones: {
        Row: {
          city: string
          created_at: string
          delivery_fee: number
          estimated_delay: string | null
          free_delivery_threshold: number | null
          id: string
          is_active: boolean
          metadata: Json
          neighborhood: string | null
          priority: number
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          city: string
          created_at?: string
          delivery_fee: number
          estimated_delay?: string | null
          free_delivery_threshold?: number | null
          id?: string
          is_active?: boolean
          metadata?: Json
          neighborhood?: string | null
          priority?: number
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          city?: string
          created_at?: string
          delivery_fee?: number
          estimated_delay?: string | null
          free_delivery_threshold?: number | null
          id?: string
          is_active?: boolean
          metadata?: Json
          neighborhood?: string | null
          priority?: number
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      developer_portal_api_key_events: {
        Row: {
          actor_user_id: string | null
          api_key_id: string | null
          app_id: string | null
          created_at: string
          event_summary: string | null
          event_type: string
          id: number
          metadata: Json
        }
        Insert: {
          actor_user_id?: string | null
          api_key_id?: string | null
          app_id?: string | null
          created_at?: string
          event_summary?: string | null
          event_type: string
          id?: never
          metadata?: Json
        }
        Update: {
          actor_user_id?: string | null
          api_key_id?: string | null
          app_id?: string | null
          created_at?: string
          event_summary?: string | null
          event_type?: string
          id?: never
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "developer_portal_api_key_events_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "admin_developer_portal_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "developer_portal_api_key_events_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "developer_portal_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "developer_portal_api_key_events_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "developer_portal_my_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      developer_portal_apps: {
        Row: {
          allowed_endpoint_keys: string[]
          allowed_modules: string[]
          app_key: string
          app_name: string
          created_at: string
          created_by: string | null
          description: string | null
          environment: string
          id: string
          metadata: Json
          owner_user_id: string
          quota_per_day: number
          quota_per_minute: number
          status: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          allowed_endpoint_keys?: string[]
          allowed_modules?: string[]
          app_key: string
          app_name: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          environment?: string
          id?: string
          metadata?: Json
          owner_user_id: string
          quota_per_day?: number
          quota_per_minute?: number
          status?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          allowed_endpoint_keys?: string[]
          allowed_modules?: string[]
          app_key?: string
          app_name?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          environment?: string
          id?: string
          metadata?: Json
          owner_user_id?: string
          quota_per_day?: number
          quota_per_minute?: number
          status?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      developer_portal_changelog_entries: {
        Row: {
          affected_modules: string[]
          description: string
          entry_key: string
          entry_type: string
          id: string
          impact_level: string
          metadata: Json
          published_at: string
          title: string
          version: string
        }
        Insert: {
          affected_modules?: string[]
          description: string
          entry_key: string
          entry_type: string
          id?: string
          impact_level?: string
          metadata?: Json
          published_at?: string
          title: string
          version: string
        }
        Update: {
          affected_modules?: string[]
          description?: string
          entry_key?: string
          entry_type?: string
          id?: string
          impact_level?: string
          metadata?: Json
          published_at?: string
          title?: string
          version?: string
        }
        Relationships: []
      }
      developer_portal_docs_pages: {
        Row: {
          content_md: string
          created_at: string
          id: string
          metadata: Json
          section: string
          slug: string
          source_module_key: string | null
          status: string
          summary: string
          title: string
          updated_at: string
          updated_by: string | null
          version: string
          visibility: string
        }
        Insert: {
          content_md?: string
          created_at?: string
          id?: string
          metadata?: Json
          section: string
          slug: string
          source_module_key?: string | null
          status?: string
          summary: string
          title: string
          updated_at?: string
          updated_by?: string | null
          version?: string
          visibility?: string
        }
        Update: {
          content_md?: string
          created_at?: string
          id?: string
          metadata?: Json
          section?: string
          slug?: string
          source_module_key?: string | null
          status?: string
          summary?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          version?: string
          visibility?: string
        }
        Relationships: []
      }
      developer_portal_members: {
        Row: {
          allowed_endpoint_keys: string[]
          allowed_modules: string[]
          created_at: string
          display_name: string | null
          invited_by: string | null
          member_role: string
          metadata: Json
          organization_name: string | null
          status: string
          support_tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allowed_endpoint_keys?: string[]
          allowed_modules?: string[]
          created_at?: string
          display_name?: string | null
          invited_by?: string | null
          member_role?: string
          metadata?: Json
          organization_name?: string | null
          status?: string
          support_tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allowed_endpoint_keys?: string[]
          allowed_modules?: string[]
          created_at?: string
          display_name?: string | null
          invited_by?: string | null
          member_role?: string
          metadata?: Json
          organization_name?: string | null
          status?: string
          support_tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      developer_portal_sandbox_runs: {
        Row: {
          actor_user_id: string | null
          app_id: string | null
          created_at: string
          error_code: string | null
          id: string
          latency_ms: number
          request_payload: Json
          response_payload: Json
          scenario_key: string
          status: string
        }
        Insert: {
          actor_user_id?: string | null
          app_id?: string | null
          created_at?: string
          error_code?: string | null
          id?: string
          latency_ms?: number
          request_payload?: Json
          response_payload?: Json
          scenario_key: string
          status?: string
        }
        Update: {
          actor_user_id?: string | null
          app_id?: string | null
          created_at?: string
          error_code?: string | null
          id?: string
          latency_ms?: number
          request_payload?: Json
          response_payload?: Json
          scenario_key?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "developer_portal_sandbox_runs_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "admin_developer_portal_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "developer_portal_sandbox_runs_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "developer_portal_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "developer_portal_sandbox_runs_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "developer_portal_my_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      developer_portal_sdk_packages: {
        Row: {
          capabilities: string[]
          created_at: string
          documentation_path: string | null
          error_model: Json
          examples: Json
          id: string
          language: string
          metadata: Json
          package_name: string
          repository_path: string | null
          sdk_key: string
          status: string
          updated_at: string
          version: string
        }
        Insert: {
          capabilities?: string[]
          created_at?: string
          documentation_path?: string | null
          error_model?: Json
          examples?: Json
          id?: string
          language: string
          metadata?: Json
          package_name: string
          repository_path?: string | null
          sdk_key: string
          status?: string
          updated_at?: string
          version?: string
        }
        Update: {
          capabilities?: string[]
          created_at?: string
          documentation_path?: string | null
          error_model?: Json
          examples?: Json
          id?: string
          language?: string
          metadata?: Json
          package_name?: string
          repository_path?: string | null
          sdk_key?: string
          status?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      developer_portal_support_tickets: {
        Row: {
          app_id: string | null
          category: string
          created_at: string
          detail: string | null
          id: string
          metadata: Json
          priority: string
          requester_user_id: string | null
          resolution: string | null
          status: string
          subject: string
          ticket_key: string
          updated_at: string
        }
        Insert: {
          app_id?: string | null
          category?: string
          created_at?: string
          detail?: string | null
          id?: string
          metadata?: Json
          priority?: string
          requester_user_id?: string | null
          resolution?: string | null
          status?: string
          subject: string
          ticket_key?: string
          updated_at?: string
        }
        Update: {
          app_id?: string | null
          category?: string
          created_at?: string
          detail?: string | null
          id?: string
          metadata?: Json
          priority?: string
          requester_user_id?: string | null
          resolution?: string | null
          status?: string
          subject?: string
          ticket_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "developer_portal_support_tickets_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "admin_developer_portal_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "developer_portal_support_tickets_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "developer_portal_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "developer_portal_support_tickets_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "developer_portal_my_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_events: {
        Row: {
          actor_id: string | null
          aggregate_id: string | null
          aggregate_type: string
          attempt_count: number
          dead_letter_at: string | null
          error: string | null
          event_type: string
          id: number
          last_attempt_at: string | null
          locked_at: string | null
          locked_by: string | null
          next_attempt_at: string | null
          occurred_at: string
          payload: Json
          processed_at: string | null
          source: string | null
          status: string
        }
        Insert: {
          actor_id?: string | null
          aggregate_id?: string | null
          aggregate_type: string
          attempt_count?: number
          dead_letter_at?: string | null
          error?: string | null
          event_type: string
          id?: number
          last_attempt_at?: string | null
          locked_at?: string | null
          locked_by?: string | null
          next_attempt_at?: string | null
          occurred_at?: string
          payload?: Json
          processed_at?: string | null
          source?: string | null
          status?: string
        }
        Update: {
          actor_id?: string | null
          aggregate_id?: string | null
          aggregate_type?: string
          attempt_count?: number
          dead_letter_at?: string | null
          error?: string | null
          event_type?: string
          id?: number
          last_attempt_at?: string | null
          locked_at?: string | null
          locked_by?: string | null
          next_attempt_at?: string | null
          occurred_at?: string
          payload?: Json
          processed_at?: string | null
          source?: string | null
          status?: string
        }
        Relationships: []
      }
      extension_marketplace_extensions: {
        Row: {
          category: string
          compatibility_policy: Json
          created_at: string
          created_by: string | null
          description: string
          documentation_url: string | null
          extension_key: string
          icon_url: string | null
          id: string
          license: string
          listing_status: string
          metadata: Json
          minimum_platform_version: string
          name: string
          publisher_id: string | null
          support_url: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          category?: string
          compatibility_policy?: Json
          created_at?: string
          created_by?: string | null
          description: string
          documentation_url?: string | null
          extension_key: string
          icon_url?: string | null
          id?: string
          license?: string
          listing_status?: string
          metadata?: Json
          minimum_platform_version?: string
          name: string
          publisher_id?: string | null
          support_url?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          category?: string
          compatibility_policy?: Json
          created_at?: string
          created_by?: string | null
          description?: string
          documentation_url?: string | null
          extension_key?: string
          icon_url?: string | null
          id?: string
          license?: string
          listing_status?: string
          metadata?: Json
          minimum_platform_version?: string
          name?: string
          publisher_id?: string | null
          support_url?: string | null
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "extension_marketplace_extensions_publisher_id_fkey"
            columns: ["publisher_id"]
            isOneToOne: false
            referencedRelation: "extension_marketplace_publishers"
            referencedColumns: ["id"]
          },
        ]
      }
      extension_marketplace_installations: {
        Row: {
          configuration: Json
          created_at: string
          disabled_at: string | null
          environment: string
          extension_id: string
          feature_flag_key: string | null
          id: string
          install_status: string
          installed_at: string
          installed_by: string | null
          last_health_score: number
          last_health_status: string
          metadata: Json
          uninstalled_at: string | null
          updated_at: string
          version_id: string
        }
        Insert: {
          configuration?: Json
          created_at?: string
          disabled_at?: string | null
          environment?: string
          extension_id: string
          feature_flag_key?: string | null
          id?: string
          install_status?: string
          installed_at?: string
          installed_by?: string | null
          last_health_score?: number
          last_health_status?: string
          metadata?: Json
          uninstalled_at?: string | null
          updated_at?: string
          version_id: string
        }
        Update: {
          configuration?: Json
          created_at?: string
          disabled_at?: string | null
          environment?: string
          extension_id?: string
          feature_flag_key?: string | null
          id?: string
          install_status?: string
          installed_at?: string
          installed_by?: string | null
          last_health_score?: number
          last_health_status?: string
          metadata?: Json
          uninstalled_at?: string | null
          updated_at?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "extension_marketplace_installations_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "admin_extension_marketplace_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_installations_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "developer_extension_marketplace_my_extensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_installations_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "extension_marketplace_extensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_installations_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "admin_extension_marketplace_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_installations_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "extension_marketplace_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      extension_marketplace_operations: {
        Row: {
          actor_user_id: string | null
          created_at: string
          extension_id: string | null
          id: number
          installation_id: string | null
          metadata: Json
          new_state: Json
          operation_key: string
          operation_status: string
          operation_type: string
          previous_state: Json
          reason: string | null
          version_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          extension_id?: string | null
          id?: never
          installation_id?: string | null
          metadata?: Json
          new_state?: Json
          operation_key?: string
          operation_status?: string
          operation_type: string
          previous_state?: Json
          reason?: string | null
          version_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          extension_id?: string | null
          id?: never
          installation_id?: string | null
          metadata?: Json
          new_state?: Json
          operation_key?: string
          operation_status?: string
          operation_type?: string
          previous_state?: Json
          reason?: string | null
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extension_marketplace_operations_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "admin_extension_marketplace_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_operations_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "developer_extension_marketplace_my_extensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_operations_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "extension_marketplace_extensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_operations_installation_id_fkey"
            columns: ["installation_id"]
            isOneToOne: false
            referencedRelation: "admin_extension_marketplace_installations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_operations_installation_id_fkey"
            columns: ["installation_id"]
            isOneToOne: false
            referencedRelation: "extension_marketplace_installations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_operations_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "admin_extension_marketplace_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_operations_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "extension_marketplace_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      extension_marketplace_publishers: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          metadata: Json
          name: string
          owner_user_id: string | null
          publisher_key: string
          publisher_type: string
          support_email: string | null
          updated_at: string
          verification_status: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          name: string
          owner_user_id?: string | null
          publisher_key: string
          publisher_type?: string
          support_email?: string | null
          updated_at?: string
          verification_status?: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          name?: string
          owner_user_id?: string | null
          publisher_key?: string
          publisher_type?: string
          support_email?: string | null
          updated_at?: string
          verification_status?: string
          website_url?: string | null
        }
        Relationships: []
      }
      extension_marketplace_sandbox_runs: {
        Row: {
          actor_user_id: string | null
          created_at: string
          extension_id: string | null
          id: string
          rollback_plan: Json
          run_status: string
          scenario_key: string
          side_effects: string
          validation_summary: Json
          version_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          extension_id?: string | null
          id?: string
          rollback_plan?: Json
          run_status?: string
          scenario_key: string
          side_effects?: string
          validation_summary?: Json
          version_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          extension_id?: string | null
          id?: string
          rollback_plan?: Json
          run_status?: string
          scenario_key?: string
          side_effects?: string
          validation_summary?: Json
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extension_marketplace_sandbox_runs_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "admin_extension_marketplace_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_sandbox_runs_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "developer_extension_marketplace_my_extensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_sandbox_runs_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "extension_marketplace_extensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_sandbox_runs_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "admin_extension_marketplace_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_sandbox_runs_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "extension_marketplace_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      extension_marketplace_usage_daily: {
        Row: {
          api_calls: number
          api_errors: number
          avg_latency_ms: number
          created_at: string
          events_processed: number
          extension_id: string | null
          id: string
          metadata: Json
          sync_runs: number
          usage_date: string
        }
        Insert: {
          api_calls?: number
          api_errors?: number
          avg_latency_ms?: number
          created_at?: string
          events_processed?: number
          extension_id?: string | null
          id?: string
          metadata?: Json
          sync_runs?: number
          usage_date?: string
        }
        Update: {
          api_calls?: number
          api_errors?: number
          avg_latency_ms?: number
          created_at?: string
          events_processed?: number
          extension_id?: string | null
          id?: string
          metadata?: Json
          sync_runs?: number
          usage_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "extension_marketplace_usage_daily_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "admin_extension_marketplace_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_usage_daily_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "developer_extension_marketplace_my_extensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_usage_daily_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "extension_marketplace_extensions"
            referencedColumns: ["id"]
          },
        ]
      }
      extension_marketplace_validation_findings: {
        Row: {
          created_at: string
          detail: string
          extension_id: string | null
          finding_type: string
          id: string
          required_action: string | null
          resolved_at: string | null
          severity: string
          status: string
          version_id: string | null
        }
        Insert: {
          created_at?: string
          detail: string
          extension_id?: string | null
          finding_type: string
          id?: string
          required_action?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          version_id?: string | null
        }
        Update: {
          created_at?: string
          detail?: string
          extension_id?: string | null
          finding_type?: string
          id?: string
          required_action?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extension_marketplace_validation_findings_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "admin_extension_marketplace_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_validation_findings_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "developer_extension_marketplace_my_extensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_validation_findings_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "extension_marketplace_extensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_validation_findings_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "admin_extension_marketplace_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_validation_findings_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "extension_marketplace_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      extension_marketplace_versions: {
        Row: {
          changelog: string
          consumed_events: string[]
          created_at: string
          created_by: string | null
          dependencies: string[]
          extension_id: string
          id: string
          integrity_digest: string | null
          metadata: Json
          package_manifest: Json
          produced_events: string[]
          published_at: string | null
          release_status: string
          requested_permissions: string[]
          required_api_endpoints: string[]
          required_capabilities: string[]
          required_connectors: string[]
          rollback_notes: string | null
          signature_digest: string | null
          updated_at: string
          version: string
        }
        Insert: {
          changelog?: string
          consumed_events?: string[]
          created_at?: string
          created_by?: string | null
          dependencies?: string[]
          extension_id: string
          id?: string
          integrity_digest?: string | null
          metadata?: Json
          package_manifest?: Json
          produced_events?: string[]
          published_at?: string | null
          release_status?: string
          requested_permissions?: string[]
          required_api_endpoints?: string[]
          required_capabilities?: string[]
          required_connectors?: string[]
          rollback_notes?: string | null
          signature_digest?: string | null
          updated_at?: string
          version: string
        }
        Update: {
          changelog?: string
          consumed_events?: string[]
          created_at?: string
          created_by?: string | null
          dependencies?: string[]
          extension_id?: string
          id?: string
          integrity_digest?: string | null
          metadata?: Json
          package_manifest?: Json
          produced_events?: string[]
          published_at?: string | null
          release_status?: string
          requested_permissions?: string[]
          required_api_endpoints?: string[]
          required_capabilities?: string[]
          required_connectors?: string[]
          rollback_notes?: string | null
          signature_digest?: string | null
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "extension_marketplace_versions_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "admin_extension_marketplace_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_versions_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "developer_extension_marketplace_my_extensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_versions_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "extension_marketplace_extensions"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_ledger_entries: {
        Row: {
          actor_id: string | null
          amount: number
          balance_after: number | null
          balance_before: number | null
          created_at: string
          credit_wallet_id: string | null
          currency: string
          debit_wallet_id: string | null
          id: string
          idempotency_key: string
          metadata: Json
          movement_type: string
          order_id: string | null
          payment_reference: string | null
          user_id: string | null
        }
        Insert: {
          actor_id?: string | null
          amount: number
          balance_after?: number | null
          balance_before?: number | null
          created_at?: string
          credit_wallet_id?: string | null
          currency?: string
          debit_wallet_id?: string | null
          id?: string
          idempotency_key: string
          metadata?: Json
          movement_type: string
          order_id?: string | null
          payment_reference?: string | null
          user_id?: string | null
        }
        Update: {
          actor_id?: string | null
          amount?: number
          balance_after?: number | null
          balance_before?: number | null
          created_at?: string
          credit_wallet_id?: string | null
          currency?: string
          debit_wallet_id?: string | null
          id?: string
          idempotency_key?: string
          metadata?: Json
          movement_type?: string
          order_id?: string | null
          payment_reference?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_ledger_entries_credit_wallet_id_fkey"
            columns: ["credit_wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_ledger_entries_debit_wallet_id_fkey"
            columns: ["debit_wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_ledger_entries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "admin_finance_overview"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "financial_ledger_entries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_ledger_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      flash_sale_products: {
        Row: {
          created_at: string
          flash_price: number
          flash_sale_id: string
          id: string
          max_quantity: number | null
          product_id: string
          sold_quantity: number | null
        }
        Insert: {
          created_at?: string
          flash_price: number
          flash_sale_id: string
          id?: string
          max_quantity?: number | null
          product_id: string
          sold_quantity?: number | null
        }
        Update: {
          created_at?: string
          flash_price?: number
          flash_sale_id?: string
          id?: string
          max_quantity?: number | null
          product_id?: string
          sold_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "flash_sale_products_flash_sale_id_fkey"
            columns: ["flash_sale_id"]
            isOneToOne: false
            referencedRelation: "flash_sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flash_sale_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "flash_sale_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "flash_sale_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flash_sale_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flash_sale_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
      flash_sales: {
        Row: {
          banner_image_url: string | null
          created_at: string
          description: string | null
          discount_percentage: number
          ends_at: string
          id: string
          is_active: boolean | null
          name: string
          starts_at: string
          updated_at: string
        }
        Insert: {
          banner_image_url?: string | null
          created_at?: string
          description?: string | null
          discount_percentage: number
          ends_at: string
          id?: string
          is_active?: boolean | null
          name: string
          starts_at: string
          updated_at?: string
        }
        Update: {
          banner_image_url?: string | null
          created_at?: string
          description?: string | null
          discount_percentage?: number
          ends_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          starts_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      fraud_risk_signals: {
        Row: {
          created_at: string
          id: string
          order_id: string | null
          related_user_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string
          signal_details: Json
          signal_type: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          order_id?: string | null
          related_user_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          signal_details?: Json
          signal_type: string
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string | null
          related_user_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          signal_details?: Json
          signal_type?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fraud_risk_signals_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "admin_finance_overview"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "fraud_risk_signals_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_risk_signals_related_user_id_fkey"
            columns: ["related_user_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "fraud_risk_signals_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "fraud_risk_signals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      fraud_rules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          label: string
          rule_key: string
          threshold: number
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label: string
          rule_key: string
          threshold?: number
          updated_at?: string
          weight?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label?: string
          rule_key?: string
          threshold?: number
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      gift_packaging_options: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          price: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          price?: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          price?: number
        }
        Relationships: []
      }
      governance_decision_logs: {
        Row: {
          alternatives: Json
          confidence: number
          created_at: string
          data_used: Json
          decision: string
          decision_type: string
          engine_name: string
          estimated_impacts: Json
          id: string
          order_id: string | null
          rejection_reasons: Json
          rules_applied: Json
          user_id: string | null
        }
        Insert: {
          alternatives?: Json
          confidence?: number
          created_at?: string
          data_used?: Json
          decision: string
          decision_type: string
          engine_name: string
          estimated_impacts?: Json
          id?: string
          order_id?: string | null
          rejection_reasons?: Json
          rules_applied?: Json
          user_id?: string | null
        }
        Update: {
          alternatives?: Json
          confidence?: number
          created_at?: string
          data_used?: Json
          decision?: string
          decision_type?: string
          engine_name?: string
          estimated_impacts?: Json
          id?: string
          order_id?: string | null
          rejection_reasons?: Json
          rules_applied?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "governance_decision_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "admin_finance_overview"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "governance_decision_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "governance_decision_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      hero_config: {
        Row: {
          draft: Json
          id: number
          published: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          draft?: Json
          id?: number
          published?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          draft?: Json
          id?: number
          published?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      home_categories: {
        Row: {
          created_at: string
          description_en: string
          description_fr: string
          display_order: number
          href: string
          id: string
          image_url: string
          is_visible: boolean
          slug: string
          title_en: string
          title_fr: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_en?: string
          description_fr?: string
          display_order?: number
          href?: string
          id?: string
          image_url?: string
          is_visible?: boolean
          slug: string
          title_en?: string
          title_fr: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_en?: string
          description_fr?: string
          display_order?: number
          href?: string
          id?: string
          image_url?: string
          is_visible?: boolean
          slug?: string
          title_en?: string
          title_fr?: string
          updated_at?: string
        }
        Relationships: []
      }
      home_categories_history: {
        Row: {
          action: string
          category_id: string | null
          changed_at: string
          changed_by: string | null
          id: string
          snapshot: Json
        }
        Insert: {
          action: string
          category_id?: string | null
          changed_at?: string
          changed_by?: string | null
          id?: string
          snapshot: Json
        }
        Update: {
          action?: string
          category_id?: string | null
          changed_at?: string
          changed_by?: string | null
          id?: string
          snapshot?: Json
        }
        Relationships: []
      }
      home_featured_products: {
        Row: {
          created_at: string
          custom_price: number | null
          custom_title_en: string | null
          custom_title_fr: string | null
          display_order: number
          id: string
          is_visible: boolean
          product_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_price?: number | null
          custom_title_en?: string | null
          custom_title_fr?: string | null
          display_order?: number
          id?: string
          is_visible?: boolean
          product_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_price?: number | null
          custom_title_en?: string | null
          custom_title_fr?: string | null
          display_order?: number
          id?: string
          is_visible?: boolean
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_featured_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "home_featured_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "home_featured_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_featured_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_featured_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_hub_compatibility_findings: {
        Row: {
          connector_id: string | null
          connector_key: string
          created_at: string
          created_by: string | null
          detail: string
          evidence: Json
          finding_type: string
          id: string
          required_action: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
        }
        Insert: {
          connector_id?: string | null
          connector_key: string
          created_at?: string
          created_by?: string | null
          detail: string
          evidence?: Json
          finding_type: string
          id?: string
          required_action?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
        }
        Update: {
          connector_id?: string | null
          connector_key?: string
          created_at?: string
          created_by?: string | null
          detail?: string
          evidence?: Json
          finding_type?: string
          id?: string
          required_action?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_hub_compatibility_findings_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "admin_integration_hub_connectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_hub_compatibility_findings_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "integration_hub_connectors"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_hub_connector_configs: {
        Row: {
          config_schema: Json
          config_values: Json
          connector_id: string
          created_at: string
          created_by: string | null
          environment: string
          id: string
          is_active: boolean
          optional_parameters: string[]
          organization_key: string
          required_parameters: string[]
          secret_refs: Json
          updated_at: string
          updated_by: string | null
          validation_errors: Json
          validation_status: string
        }
        Insert: {
          config_schema?: Json
          config_values?: Json
          connector_id: string
          created_at?: string
          created_by?: string | null
          environment?: string
          id?: string
          is_active?: boolean
          optional_parameters?: string[]
          organization_key?: string
          required_parameters?: string[]
          secret_refs?: Json
          updated_at?: string
          updated_by?: string | null
          validation_errors?: Json
          validation_status?: string
        }
        Update: {
          config_schema?: Json
          config_values?: Json
          connector_id?: string
          created_at?: string
          created_by?: string | null
          environment?: string
          id?: string
          is_active?: boolean
          optional_parameters?: string[]
          organization_key?: string
          required_parameters?: string[]
          secret_refs?: Json
          updated_at?: string
          updated_by?: string | null
          validation_errors?: Json
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_hub_connector_configs_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "admin_integration_hub_connectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_hub_connector_configs_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "integration_hub_connectors"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_hub_connectors: {
        Row: {
          api_min_version: string | null
          capabilities_used: string[]
          category: string
          compatibility_contract: Json
          connector_key: string
          created_at: string
          created_by: string | null
          description: string
          documentation_url: string | null
          environment: string
          events_consumed: string[]
          events_produced: string[]
          feature_flag_key: string | null
          gateway_required_version: string
          health_score: number
          health_status: string
          id: string
          installed_at: string
          last_sync_at: string | null
          metadata: Json
          name: string
          next_sync_at: string | null
          owner_module_key: string
          provider: string
          status: string
          sync_policy: Json
          updated_at: string
          updated_by: string | null
          version: string
        }
        Insert: {
          api_min_version?: string | null
          capabilities_used?: string[]
          category: string
          compatibility_contract?: Json
          connector_key: string
          created_at?: string
          created_by?: string | null
          description: string
          documentation_url?: string | null
          environment?: string
          events_consumed?: string[]
          events_produced?: string[]
          feature_flag_key?: string | null
          gateway_required_version?: string
          health_score?: number
          health_status?: string
          id?: string
          installed_at?: string
          last_sync_at?: string | null
          metadata?: Json
          name: string
          next_sync_at?: string | null
          owner_module_key?: string
          provider?: string
          status?: string
          sync_policy?: Json
          updated_at?: string
          updated_by?: string | null
          version?: string
        }
        Update: {
          api_min_version?: string | null
          capabilities_used?: string[]
          category?: string
          compatibility_contract?: Json
          connector_key?: string
          created_at?: string
          created_by?: string | null
          description?: string
          documentation_url?: string | null
          environment?: string
          events_consumed?: string[]
          events_produced?: string[]
          feature_flag_key?: string | null
          gateway_required_version?: string
          health_score?: number
          health_status?: string
          id?: string
          installed_at?: string
          last_sync_at?: string | null
          metadata?: Json
          name?: string
          next_sync_at?: string | null
          owner_module_key?: string
          provider?: string
          status?: string
          sync_policy?: Json
          updated_at?: string
          updated_by?: string | null
          version?: string
        }
        Relationships: []
      }
      integration_hub_lifecycle_events: {
        Row: {
          actor_id: string | null
          connector_id: string | null
          connector_key: string
          created_at: string
          event_type: string
          id: number
          new_values: Json
          previous_values: Json
          reason: string | null
        }
        Insert: {
          actor_id?: string | null
          connector_id?: string | null
          connector_key: string
          created_at?: string
          event_type: string
          id?: never
          new_values?: Json
          previous_values?: Json
          reason?: string | null
        }
        Update: {
          actor_id?: string | null
          connector_id?: string | null
          connector_key?: string
          created_at?: string
          event_type?: string
          id?: never
          new_values?: Json
          previous_values?: Json
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_hub_lifecycle_events_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "admin_integration_hub_connectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_hub_lifecycle_events_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "integration_hub_connectors"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_hub_sync_jobs: {
        Row: {
          attempt_count: number
          checkpoint: Json
          connector_id: string
          created_at: string
          created_by: string | null
          error_code: string | null
          error_message: string | null
          finished_at: string | null
          id: string
          job_key: string
          lock_token: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          payload: Json
          priority: number
          result_summary: Json
          scheduled_for: string
          started_at: string | null
          status: string
          sync_type: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          checkpoint?: Json
          connector_id: string
          created_at?: string
          created_by?: string | null
          error_code?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          job_key?: string
          lock_token?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          payload?: Json
          priority?: number
          result_summary?: Json
          scheduled_for?: string
          started_at?: string | null
          status?: string
          sync_type?: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          checkpoint?: Json
          connector_id?: string
          created_at?: string
          created_by?: string | null
          error_code?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          job_key?: string
          lock_token?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          payload?: Json
          priority?: number
          result_summary?: Json
          scheduled_for?: string
          started_at?: string | null
          status?: string
          sync_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_hub_sync_jobs_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "admin_integration_hub_connectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_hub_sync_jobs_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "integration_hub_connectors"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_hub_sync_runs: {
        Row: {
          connector_id: string | null
          created_at: string
          created_by: string | null
          duration_ms: number | null
          error_code: string | null
          error_message: string | null
          health_after: string | null
          id: string
          job_id: string | null
          metrics: Json
          records_failed: number
          records_read: number
          records_written: number
          retry_after: string | null
          run_status: string
        }
        Insert: {
          connector_id?: string | null
          created_at?: string
          created_by?: string | null
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          health_after?: string | null
          id?: string
          job_id?: string | null
          metrics?: Json
          records_failed?: number
          records_read?: number
          records_written?: number
          retry_after?: string | null
          run_status: string
        }
        Update: {
          connector_id?: string | null
          created_at?: string
          created_by?: string | null
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          health_after?: string | null
          id?: string
          job_id?: string | null
          metrics?: Json
          records_failed?: number
          records_read?: number
          records_written?: number
          retry_after?: string | null
          run_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_hub_sync_runs_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "admin_integration_hub_connectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_hub_sync_runs_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "integration_hub_connectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_hub_sync_runs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "admin_integration_hub_sync_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_hub_sync_runs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "integration_hub_sync_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_config: {
        Row: {
          birthday_bonus: number | null
          created_at: string | null
          fcfa_per_point: number | null
          id: string
          is_active: boolean | null
          min_points_redeem: number | null
          points_per_fcfa: number | null
          points_value_fcfa: number | null
          updated_at: string | null
          welcome_bonus: number | null
        }
        Insert: {
          birthday_bonus?: number | null
          created_at?: string | null
          fcfa_per_point?: number | null
          id?: string
          is_active?: boolean | null
          min_points_redeem?: number | null
          points_per_fcfa?: number | null
          points_value_fcfa?: number | null
          updated_at?: string | null
          welcome_bonus?: number | null
        }
        Update: {
          birthday_bonus?: number | null
          created_at?: string | null
          fcfa_per_point?: number | null
          id?: string
          is_active?: boolean | null
          min_points_redeem?: number | null
          points_per_fcfa?: number | null
          points_value_fcfa?: number | null
          updated_at?: string | null
          welcome_bonus?: number | null
        }
        Relationships: []
      }
      loyalty_transactions: {
        Row: {
          balance_after: number
          created_at: string | null
          description: string | null
          id: string
          points: number
          reference_id: string | null
          reference_type: string | null
          type: string
          user_id: string
        }
        Insert: {
          balance_after: number
          created_at?: string | null
          description?: string | null
          id?: string
          points: number
          reference_id?: string | null
          reference_type?: string | null
          type: string
          user_id: string
        }
        Update: {
          balance_after?: number
          created_at?: string | null
          description?: string | null
          id?: string
          points?: number
          reference_id?: string | null
          reference_type?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      marketplace_analytics_alerts: {
        Row: {
          alert_type: string
          created_at: string
          description: string
          engine_version: string
          id: string
          metadata: Json
          metric_value: number | null
          severity: string
          snapshot_id: string | null
          status: string
          threshold_value: number | null
          title: string
          vendor_owner_id: string | null
          vendor_shop_id: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string
          description: string
          engine_version?: string
          id?: string
          metadata?: Json
          metric_value?: number | null
          severity?: string
          snapshot_id?: string | null
          status?: string
          threshold_value?: number | null
          title: string
          vendor_owner_id?: string | null
          vendor_shop_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string
          description?: string
          engine_version?: string
          id?: string
          metadata?: Json
          metric_value?: number | null
          severity?: string
          snapshot_id?: string | null
          status?: string
          threshold_value?: number | null
          title?: string
          vendor_owner_id?: string | null
          vendor_shop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_analytics_alerts_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_analytics_shop_rankings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_analytics_alerts_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "marketplace_analytics_daily_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_analytics_alerts_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_analytics_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_analytics_alerts_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_analytics_trends"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_analytics_alerts_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_analytics_alerts_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_analytics_alerts_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_analytics_daily_snapshots: {
        Row: {
          active_product_count: number
          alerts: Json
          approved_enrichments_count: number
          avg_catalogue_quality_score: number
          avg_coach_score: number
          avg_completeness_score: number
          avg_discoverability_score: number
          avg_image_score: number
          avg_seo_score: number
          calculated_at: string
          calculated_by: string | null
          created_at: string
          duplicate_candidates_count: number
          engine_version: string
          id: string
          low_visibility_products: Json
          low_visibility_products_count: number
          marketplace_health_score: number
          new_products_count: number
          pending_catalogue_proposals_count: number
          pending_image_reviews_count: number
          pending_recommendations_count: number
          pending_seo_proposals_count: number
          product_count: number
          products_to_enrich_count: number
          rejected_images_count: number
          shop_name: string | null
          snapshot_date: string
          source_counts: Json
          top_brands: Json
          top_categories: Json
          vendor_owner_id: string
          vendor_shop_id: string
          visibility_score: number
        }
        Insert: {
          active_product_count?: number
          alerts?: Json
          approved_enrichments_count?: number
          avg_catalogue_quality_score?: number
          avg_coach_score?: number
          avg_completeness_score?: number
          avg_discoverability_score?: number
          avg_image_score?: number
          avg_seo_score?: number
          calculated_at?: string
          calculated_by?: string | null
          created_at?: string
          duplicate_candidates_count?: number
          engine_version?: string
          id?: string
          low_visibility_products?: Json
          low_visibility_products_count?: number
          marketplace_health_score?: number
          new_products_count?: number
          pending_catalogue_proposals_count?: number
          pending_image_reviews_count?: number
          pending_recommendations_count?: number
          pending_seo_proposals_count?: number
          product_count?: number
          products_to_enrich_count?: number
          rejected_images_count?: number
          shop_name?: string | null
          snapshot_date?: string
          source_counts?: Json
          top_brands?: Json
          top_categories?: Json
          vendor_owner_id: string
          vendor_shop_id: string
          visibility_score?: number
        }
        Update: {
          active_product_count?: number
          alerts?: Json
          approved_enrichments_count?: number
          avg_catalogue_quality_score?: number
          avg_coach_score?: number
          avg_completeness_score?: number
          avg_discoverability_score?: number
          avg_image_score?: number
          avg_seo_score?: number
          calculated_at?: string
          calculated_by?: string | null
          created_at?: string
          duplicate_candidates_count?: number
          engine_version?: string
          id?: string
          low_visibility_products?: Json
          low_visibility_products_count?: number
          marketplace_health_score?: number
          new_products_count?: number
          pending_catalogue_proposals_count?: number
          pending_image_reviews_count?: number
          pending_recommendations_count?: number
          pending_seo_proposals_count?: number
          product_count?: number
          products_to_enrich_count?: number
          rejected_images_count?: number
          shop_name?: string | null
          snapshot_date?: string
          source_counts?: Json
          top_brands?: Json
          top_categories?: Json
          vendor_owner_id?: string
          vendor_shop_id?: string
          visibility_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_analytics_daily_snapshots_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_analytics_daily_snapshots_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_analytics_daily_snapshots_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_analytics_export_logs: {
        Row: {
          created_at: string
          export_format: string
          export_scope: string
          filters: Json
          id: string
          requested_by: string | null
          row_count: number
          vendor_shop_id: string | null
        }
        Insert: {
          created_at?: string
          export_format: string
          export_scope: string
          filters?: Json
          id?: string
          requested_by?: string | null
          row_count?: number
          vendor_shop_id?: string | null
        }
        Update: {
          created_at?: string
          export_format?: string
          export_scope?: string
          filters?: Json
          id?: string
          requested_by?: string | null
          row_count?: number
          vendor_shop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_analytics_export_logs_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_analytics_export_logs_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_analytics_export_logs_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_case_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          assignee_id: string | null
          case_id: string
          id: string
          is_active: boolean
          note: string | null
          role: string
          team_id: string | null
          unassigned_at: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          assignee_id?: string | null
          case_id: string
          id?: string
          is_active?: boolean
          note?: string | null
          role?: string
          team_id?: string | null
          unassigned_at?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          assignee_id?: string | null
          case_id?: string
          id?: string
          is_active?: boolean
          note?: string | null
          role?: string
          team_id?: string | null
          unassigned_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_case_assignments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_case_resolution_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_assignments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_governance_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_assignments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "marketplace_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_assignments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_case_resolution_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_assignments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_assignments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "marketplace_resolution_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_case_checklist_items: {
        Row: {
          case_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          is_completed: boolean
          label: string
          note: string | null
          position: number
          template_id: string | null
        }
        Insert: {
          case_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          label: string
          note?: string | null
          position?: number
          template_id?: string | null
        }
        Update: {
          case_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          label?: string
          note?: string | null
          position?: number
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_case_checklist_items_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_case_resolution_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_checklist_items_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_governance_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_checklist_items_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "marketplace_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_checklist_items_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_case_resolution_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_checklist_items_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_checklist_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "marketplace_case_checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_case_checklist_templates: {
        Row: {
          case_type: string
          created_at: string
          id: string
          is_active: boolean
          items: Json
          label: string
        }
        Insert: {
          case_type: string
          created_at?: string
          id?: string
          is_active?: boolean
          items?: Json
          label: string
        }
        Update: {
          case_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          items?: Json
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_case_checklist_templates_case_type_fkey"
            columns: ["case_type"]
            isOneToOne: true
            referencedRelation: "marketplace_governance_case_types"
            referencedColumns: ["code"]
          },
        ]
      }
      marketplace_case_comments: {
        Row: {
          attachments: Json
          author_id: string | null
          author_type: string
          body: string
          case_id: string
          comment_type: string
          created_at: string
          id: string
          metadata: Json
          visibility: string
        }
        Insert: {
          attachments?: Json
          author_id?: string | null
          author_type?: string
          body: string
          case_id: string
          comment_type?: string
          created_at?: string
          id?: string
          metadata?: Json
          visibility?: string
        }
        Update: {
          attachments?: Json
          author_id?: string | null
          author_type?: string
          body?: string
          case_id?: string
          comment_type?: string
          created_at?: string
          id?: string
          metadata?: Json
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_case_comments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_case_resolution_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_comments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_governance_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_comments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "marketplace_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_comments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_case_resolution_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_comments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_governance_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_case_escalations: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          case_id: string
          detected_at: string
          escalation_type: string
          id: string
          metadata: Json
          reason: string
          recommended_action: string
          severity: string
          status: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          case_id: string
          detected_at?: string
          escalation_type: string
          id?: string
          metadata?: Json
          reason: string
          recommended_action: string
          severity?: string
          status?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          case_id?: string
          detected_at?: string
          escalation_type?: string
          id?: string
          metadata?: Json
          reason?: string
          recommended_action?: string
          severity?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_case_escalations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_case_resolution_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_escalations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_governance_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_escalations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "marketplace_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_escalations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_case_resolution_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_escalations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_governance_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_case_workflow_events: {
        Row: {
          actor_id: string | null
          actor_type: string
          case_id: string | null
          comment: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json
          new_value: Json | null
          previous_value: Json | null
        }
        Insert: {
          actor_id?: string | null
          actor_type?: string
          case_id?: string | null
          comment?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          new_value?: Json | null
          previous_value?: Json | null
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          case_id?: string | null
          comment?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          new_value?: Json | null
          previous_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_case_workflow_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_case_resolution_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_workflow_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_governance_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_workflow_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "marketplace_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_workflow_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_case_resolution_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_workflow_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_governance_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_coach_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          explanation: string
          id: string
          metadata: Json
          product_id: string | null
          title: string
          vendor_owner_id: string | null
          vendor_shop_id: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          explanation: string
          id?: string
          metadata?: Json
          product_id?: string | null
          title: string
          vendor_owner_id?: string | null
          vendor_shop_id?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          explanation?: string
          id?: string
          metadata?: Json
          product_id?: string | null
          title?: string
          vendor_owner_id?: string | null
          vendor_shop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_coach_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_coach_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_coach_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_coach_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_coach_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_coach_events_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_coach_events_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_coach_events_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_coach_product_analyses: {
        Row: {
          analysis_version: string
          analyzed_at: string
          analyzed_by: string | null
          completeness_score: number
          compliance_score: number
          description_score: number
          explanation: Json
          global_score: number
          id: string
          image_score: number
          issues: string[]
          opportunities: string[]
          product_id: string
          rule_version: string
          seo_score: number
          source_context: Json
          stock_score: number
          strengths: string[]
          suggested_description: string | null
          suggested_keywords: string[]
          suggested_title: string | null
          title_score: number
          vendor_owner_id: string | null
          vendor_shop_id: string | null
          weaknesses: string[]
        }
        Insert: {
          analysis_version?: string
          analyzed_at?: string
          analyzed_by?: string | null
          completeness_score?: number
          compliance_score?: number
          description_score?: number
          explanation?: Json
          global_score?: number
          id?: string
          image_score?: number
          issues?: string[]
          opportunities?: string[]
          product_id: string
          rule_version?: string
          seo_score?: number
          source_context?: Json
          stock_score?: number
          strengths?: string[]
          suggested_description?: string | null
          suggested_keywords?: string[]
          suggested_title?: string | null
          title_score?: number
          vendor_owner_id?: string | null
          vendor_shop_id?: string | null
          weaknesses?: string[]
        }
        Update: {
          analysis_version?: string
          analyzed_at?: string
          analyzed_by?: string | null
          completeness_score?: number
          compliance_score?: number
          description_score?: number
          explanation?: Json
          global_score?: number
          id?: string
          image_score?: number
          issues?: string[]
          opportunities?: string[]
          product_id?: string
          rule_version?: string
          seo_score?: number
          source_context?: Json
          stock_score?: number
          strengths?: string[]
          suggested_description?: string | null
          suggested_keywords?: string[]
          suggested_title?: string | null
          title_score?: number
          vendor_owner_id?: string | null
          vendor_shop_id?: string | null
          weaknesses?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_coach_product_analyses_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_coach_product_analyses_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_coach_product_analyses_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_coach_product_analyses_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_coach_product_analyses_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_coach_product_analyses_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_coach_product_analyses_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_coach_product_analyses_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_coach_recommendations: {
        Row: {
          analysis_id: string | null
          created_at: string
          description: string
          due_at: string | null
          expected_impact: Json
          id: string
          justification: string
          priority: string
          product_id: string | null
          recommendation_type: string
          status: string
          suggested_action: Json
          title: string
          updated_at: string
          vendor_owner_id: string | null
          vendor_shop_id: string | null
        }
        Insert: {
          analysis_id?: string | null
          created_at?: string
          description: string
          due_at?: string | null
          expected_impact?: Json
          id?: string
          justification: string
          priority?: string
          product_id?: string | null
          recommendation_type: string
          status?: string
          suggested_action?: Json
          title: string
          updated_at?: string
          vendor_owner_id?: string | null
          vendor_shop_id?: string | null
        }
        Update: {
          analysis_id?: string | null
          created_at?: string
          description?: string
          due_at?: string | null
          expected_impact?: Json
          id?: string
          justification?: string
          priority?: string
          product_id?: string | null
          recommendation_type?: string
          status?: string
          suggested_action?: Json
          title?: string
          updated_at?: string
          vendor_owner_id?: string | null
          vendor_shop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_coach_recommendations_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "marketplace_coach_product_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_coach_recommendations_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_coach_product_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_coach_recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_coach_recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_coach_recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_coach_recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_coach_recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_coach_recommendations_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_coach_recommendations_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_coach_recommendations_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_coach_shop_snapshots: {
        Row: {
          calculated_at: string
          calculated_by: string | null
          completeness_score: number
          conversion_score: number
          id: string
          image_quality_score: number
          low_visibility_products: Json
          metrics: Json
          opportunities: string[]
          performing_products: Json
          product_quality_score: number
          products_to_optimize: Json
          seo_score: number
          shop_score: number
          snapshot_version: string
          source_context: Json
          strengths: string[]
          vendor_owner_id: string
          vendor_shop_id: string
          weaknesses: string[]
        }
        Insert: {
          calculated_at?: string
          calculated_by?: string | null
          completeness_score?: number
          conversion_score?: number
          id?: string
          image_quality_score?: number
          low_visibility_products?: Json
          metrics?: Json
          opportunities?: string[]
          performing_products?: Json
          product_quality_score?: number
          products_to_optimize?: Json
          seo_score?: number
          shop_score?: number
          snapshot_version?: string
          source_context?: Json
          strengths?: string[]
          vendor_owner_id: string
          vendor_shop_id: string
          weaknesses?: string[]
        }
        Update: {
          calculated_at?: string
          calculated_by?: string | null
          completeness_score?: number
          conversion_score?: number
          id?: string
          image_quality_score?: number
          low_visibility_products?: Json
          metrics?: Json
          opportunities?: string[]
          performing_products?: Json
          product_quality_score?: number
          products_to_optimize?: Json
          seo_score?: number
          shop_score?: number
          snapshot_version?: string
          source_context?: Json
          strengths?: string[]
          vendor_owner_id?: string
          vendor_shop_id?: string
          weaknesses?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_coach_shop_snapshots_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_coach_shop_snapshots_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_coach_shop_snapshots_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_compliance_events: {
        Row: {
          actor_id: string | null
          actor_type: string
          created_at: string
          data_used: Json
          event_type: string
          explanation: string
          finding_id: string | null
          id: string
          metadata: Json
          new_status: string | null
          previous_status: string | null
          product_id: string | null
          vendor_shop_id: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          data_used?: Json
          event_type: string
          explanation: string
          finding_id?: string | null
          id?: string
          metadata?: Json
          new_status?: string | null
          previous_status?: string | null
          product_id?: string | null
          vendor_shop_id?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          data_used?: Json
          event_type?: string
          explanation?: string
          finding_id?: string | null
          id?: string
          metadata?: Json
          new_status?: string | null
          previous_status?: string | null
          product_id?: string | null
          vendor_shop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_compliance_events_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_compliance_events_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "marketplace_compliance_findings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_compliance_events_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_compliance_findings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_compliance_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_compliance_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_compliance_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_compliance_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_compliance_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_compliance_events_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_compliance_events_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_compliance_events_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_compliance_findings: {
        Row: {
          analyzed_elements: Json
          compliance_score: number
          confidence_score: number
          created_at: string
          decided_at: string | null
          decided_by: string | null
          detection_hash: string
          engine_version: string
          estimated_impact: Json
          final_decision: string | null
          finding_number: string
          governance_case_id: string | null
          id: string
          justification: string
          metadata: Json
          policy_id: string
          product_id: string | null
          queue_status: string
          recommended_actions: Json
          resolution_note: string | null
          rule_version: string
          severity: string
          source_module: string
          source_ref_id: string | null
          title: string
          updated_at: string
          vendor_owner_id: string | null
          vendor_shop_id: string | null
        }
        Insert: {
          analyzed_elements?: Json
          compliance_score?: number
          confidence_score?: number
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          detection_hash: string
          engine_version?: string
          estimated_impact?: Json
          final_decision?: string | null
          finding_number?: string
          governance_case_id?: string | null
          id?: string
          justification: string
          metadata?: Json
          policy_id: string
          product_id?: string | null
          queue_status?: string
          recommended_actions?: Json
          resolution_note?: string | null
          rule_version?: string
          severity?: string
          source_module?: string
          source_ref_id?: string | null
          title: string
          updated_at?: string
          vendor_owner_id?: string | null
          vendor_shop_id?: string | null
        }
        Update: {
          analyzed_elements?: Json
          compliance_score?: number
          confidence_score?: number
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          detection_hash?: string
          engine_version?: string
          estimated_impact?: Json
          final_decision?: string | null
          finding_number?: string
          governance_case_id?: string | null
          id?: string
          justification?: string
          metadata?: Json
          policy_id?: string
          product_id?: string | null
          queue_status?: string
          recommended_actions?: Json
          resolution_note?: string | null
          rule_version?: string
          severity?: string
          source_module?: string
          source_ref_id?: string | null
          title?: string
          updated_at?: string
          vendor_owner_id?: string | null
          vendor_shop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_compliance_findings_governance_case_id_fkey"
            columns: ["governance_case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_case_resolution_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_compliance_findings_governance_case_id_fkey"
            columns: ["governance_case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_governance_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_compliance_findings_governance_case_id_fkey"
            columns: ["governance_case_id"]
            isOneToOne: false
            referencedRelation: "marketplace_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_compliance_findings_governance_case_id_fkey"
            columns: ["governance_case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_case_resolution_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_compliance_findings_governance_case_id_fkey"
            columns: ["governance_case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_compliance_findings_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_policy_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_compliance_findings_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "marketplace_compliance_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_compliance_findings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_compliance_findings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_compliance_findings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_compliance_findings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_compliance_findings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_compliance_findings_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_compliance_findings_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_compliance_findings_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_compliance_policies: {
        Row: {
          category: string
          code: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          is_active: boolean
          metadata: Json
          name: string
          priority: number
          remediation_actions: Json
          rules: Json
          severity: string
          updated_at: string
          version: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          is_active?: boolean
          metadata?: Json
          name: string
          priority?: number
          remediation_actions?: Json
          rules?: Json
          severity?: string
          updated_at?: string
          version?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          name?: string
          priority?: number
          remediation_actions?: Json
          rules?: Json
          severity?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      marketplace_compliance_scores: {
        Row: {
          calculated_at: string
          catalogue_compliance_score: number
          created_at: string
          critical_findings_count: number
          engine_version: string
          explanation: string
          findings_count: number
          global_compliance_score: number
          high_findings_count: number
          id: string
          image_compliance_score: number
          marketplace_compliance_score: number
          product_id: string
          queue_status: string
          seo_compliance_score: number
          signals: Json
          vendor_owner_id: string | null
          vendor_shop_id: string | null
        }
        Insert: {
          calculated_at?: string
          catalogue_compliance_score?: number
          created_at?: string
          critical_findings_count?: number
          engine_version?: string
          explanation: string
          findings_count?: number
          global_compliance_score?: number
          high_findings_count?: number
          id?: string
          image_compliance_score?: number
          marketplace_compliance_score?: number
          product_id: string
          queue_status?: string
          seo_compliance_score?: number
          signals?: Json
          vendor_owner_id?: string | null
          vendor_shop_id?: string | null
        }
        Update: {
          calculated_at?: string
          catalogue_compliance_score?: number
          created_at?: string
          critical_findings_count?: number
          engine_version?: string
          explanation?: string
          findings_count?: number
          global_compliance_score?: number
          high_findings_count?: number
          id?: string
          image_compliance_score?: number
          marketplace_compliance_score?: number
          product_id?: string
          queue_status?: string
          seo_compliance_score?: number
          signals?: Json
          vendor_owner_id?: string | null
          vendor_shop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_compliance_scores_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_compliance_scores_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_compliance_scores_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_compliance_scores_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_compliance_scores_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_compliance_scores_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_compliance_scores_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_compliance_scores_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_discoverability_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json
          position: number | null
          product_id: string | null
          query: string | null
          vendor_shop_id: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          position?: number | null
          product_id?: string | null
          query?: string | null
          vendor_shop_id?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          position?: number | null
          product_id?: string | null
          query?: string | null
          vendor_shop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_discoverability_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_discoverability_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_discoverability_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_discoverability_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_discoverability_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_discoverability_events_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_discoverability_events_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_discoverability_events_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_duplicate_candidates: {
        Row: {
          candidate_product_id: string
          confidence: number
          detected_at: string
          id: string
          product_id: string
          signals: Json
          status: string
          updated_at: string
          vendor_shop_id: string | null
        }
        Insert: {
          candidate_product_id: string
          confidence?: number
          detected_at?: string
          id?: string
          product_id: string
          signals?: Json
          status?: string
          updated_at?: string
          vendor_shop_id?: string | null
        }
        Update: {
          candidate_product_id?: string
          confidence?: number
          detected_at?: string
          id?: string
          product_id?: string
          signals?: Json
          status?: string
          updated_at?: string
          vendor_shop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_duplicate_candidates_candidate_product_id_fkey"
            columns: ["candidate_product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_duplicate_candidates_candidate_product_id_fkey"
            columns: ["candidate_product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_duplicate_candidates_candidate_product_id_fkey"
            columns: ["candidate_product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_duplicate_candidates_candidate_product_id_fkey"
            columns: ["candidate_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_duplicate_candidates_candidate_product_id_fkey"
            columns: ["candidate_product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_duplicate_candidates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_duplicate_candidates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_duplicate_candidates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_duplicate_candidates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_duplicate_candidates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_duplicate_candidates_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_duplicate_candidates_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_duplicate_candidates_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_governance_case_history: {
        Row: {
          action_type: string
          actor_id: string | null
          actor_type: string
          case_id: string
          comment: string | null
          created_at: string
          explanation: string | null
          id: string
          metadata: Json
          new_priority: string | null
          new_status: string | null
          old_priority: string | null
          old_status: string | null
        }
        Insert: {
          action_type: string
          actor_id?: string | null
          actor_type?: string
          case_id: string
          comment?: string | null
          created_at?: string
          explanation?: string | null
          id?: string
          metadata?: Json
          new_priority?: string | null
          new_status?: string | null
          old_priority?: string | null
          old_status?: string | null
        }
        Update: {
          action_type?: string
          actor_id?: string | null
          actor_type?: string
          case_id?: string
          comment?: string | null
          created_at?: string
          explanation?: string | null
          id?: string
          metadata?: Json
          new_priority?: string | null
          new_status?: string | null
          old_priority?: string | null
          old_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_governance_case_history_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_case_resolution_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_governance_case_history_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_governance_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_governance_case_history_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "marketplace_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_governance_case_history_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_case_resolution_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_governance_case_history_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_governance_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_governance_case_types: {
        Row: {
          code: string
          created_at: string
          default_priority: string
          description: string | null
          is_active: boolean
          label: string
          source_modules: string[]
        }
        Insert: {
          code: string
          created_at?: string
          default_priority?: string
          description?: string | null
          is_active?: boolean
          label: string
          source_modules?: string[]
        }
        Update: {
          code?: string
          created_at?: string
          default_priority?: string
          description?: string | null
          is_active?: boolean
          label?: string
          source_modules?: string[]
        }
        Relationships: []
      }
      marketplace_governance_cases: {
        Row: {
          assigned_to: string | null
          case_number: string
          case_type: string
          closed_at: string | null
          confidence_score: number
          created_at: string
          created_by: string | null
          created_by_type: string
          data_used: Json
          decided_at: string | null
          decided_by: string | null
          due_at: string | null
          explanation: string
          final_decision: string | null
          first_assigned_at: string | null
          id: string
          is_vendor_visible: boolean
          last_assigned_at: string | null
          metadata: Json
          potential_impacts: Json
          priority: string
          problem: string
          product_id: string | null
          recommended_actions: Json
          reopened_count: number
          resolution_started_at: string | null
          resolved_at: string | null
          responsible_team_id: string | null
          source_module: string
          source_ref_id: string | null
          status: string
          time_spent_minutes: number
          updated_at: string
          vendor_owner_id: string | null
          vendor_shop_id: string | null
          workflow_metadata: Json
          workflow_status_code: string
        }
        Insert: {
          assigned_to?: string | null
          case_number?: string
          case_type: string
          closed_at?: string | null
          confidence_score?: number
          created_at?: string
          created_by?: string | null
          created_by_type?: string
          data_used?: Json
          decided_at?: string | null
          decided_by?: string | null
          due_at?: string | null
          explanation: string
          final_decision?: string | null
          first_assigned_at?: string | null
          id?: string
          is_vendor_visible?: boolean
          last_assigned_at?: string | null
          metadata?: Json
          potential_impacts?: Json
          priority?: string
          problem: string
          product_id?: string | null
          recommended_actions?: Json
          reopened_count?: number
          resolution_started_at?: string | null
          resolved_at?: string | null
          responsible_team_id?: string | null
          source_module?: string
          source_ref_id?: string | null
          status?: string
          time_spent_minutes?: number
          updated_at?: string
          vendor_owner_id?: string | null
          vendor_shop_id?: string | null
          workflow_metadata?: Json
          workflow_status_code?: string
        }
        Update: {
          assigned_to?: string | null
          case_number?: string
          case_type?: string
          closed_at?: string | null
          confidence_score?: number
          created_at?: string
          created_by?: string | null
          created_by_type?: string
          data_used?: Json
          decided_at?: string | null
          decided_by?: string | null
          due_at?: string | null
          explanation?: string
          final_decision?: string | null
          first_assigned_at?: string | null
          id?: string
          is_vendor_visible?: boolean
          last_assigned_at?: string | null
          metadata?: Json
          potential_impacts?: Json
          priority?: string
          problem?: string
          product_id?: string | null
          recommended_actions?: Json
          reopened_count?: number
          resolution_started_at?: string | null
          resolved_at?: string | null
          responsible_team_id?: string | null
          source_module?: string
          source_ref_id?: string | null
          status?: string
          time_spent_minutes?: number
          updated_at?: string
          vendor_owner_id?: string | null
          vendor_shop_id?: string | null
          workflow_metadata?: Json
          workflow_status_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_governance_cases_case_type_fkey"
            columns: ["case_type"]
            isOneToOne: false
            referencedRelation: "marketplace_governance_case_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "marketplace_governance_cases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_governance_cases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_governance_cases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_governance_cases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_governance_cases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_governance_cases_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_governance_cases_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_governance_cases_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_governance_notification_preferences: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          notification_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          notification_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          notification_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      marketplace_governance_notifications: {
        Row: {
          case_id: string | null
          created_at: string
          id: string
          message: string
          metadata: Json
          notification_type: string
          read_at: string | null
          recipient_id: string | null
          recipient_role: string
          severity: string
          title: string
        }
        Insert: {
          case_id?: string | null
          created_at?: string
          id?: string
          message: string
          metadata?: Json
          notification_type: string
          read_at?: string | null
          recipient_id?: string | null
          recipient_role?: string
          severity?: string
          title: string
        }
        Update: {
          case_id?: string | null
          created_at?: string
          id?: string
          message?: string
          metadata?: Json
          notification_type?: string
          read_at?: string | null
          recipient_id?: string | null
          recipient_role?: string
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_governance_notifications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_case_resolution_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_governance_notifications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_governance_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_governance_notifications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "marketplace_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_governance_notifications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_case_resolution_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_governance_notifications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_governance_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_image_studio_events: {
        Row: {
          actor_id: string | null
          compliance_score: number | null
          created_at: string
          decision: string | null
          engine_version: string
          event_type: string
          explanation: string
          id: string
          job_id: string
          metadata: Json
          new_status: string | null
          previous_status: string | null
          product_id: string | null
          vendor_id: string | null
        }
        Insert: {
          actor_id?: string | null
          compliance_score?: number | null
          created_at?: string
          decision?: string | null
          engine_version?: string
          event_type: string
          explanation: string
          id?: string
          job_id: string
          metadata?: Json
          new_status?: string | null
          previous_status?: string | null
          product_id?: string | null
          vendor_id?: string | null
        }
        Update: {
          actor_id?: string | null
          compliance_score?: number | null
          created_at?: string
          decision?: string | null
          engine_version?: string
          event_type?: string
          explanation?: string
          id?: string
          job_id?: string
          metadata?: Json
          new_status?: string | null
          previous_status?: string | null
          product_id?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_image_studio_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_image_studio_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_image_studio_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "marketplace_image_studio_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_image_studio_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "seller_marketplace_image_studio_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_image_studio_jobs: {
        Row: {
          admin_notes: string | null
          ai_analysis: Json
          compliance_score: number | null
          corrected_image_url: string | null
          corrected_storage_path: string | null
          corrections: string[]
          created_at: string
          decision: string
          engine_version: string
          id: string
          issues: string[]
          original_image_url: string
          original_storage_path: string | null
          product_detected: string | null
          product_id: string | null
          published_image_url: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_by: string | null
          thumbnail_urls: Json
          updated_at: string
          vendor_id: string | null
          visual_rules: Json
        }
        Insert: {
          admin_notes?: string | null
          ai_analysis?: Json
          compliance_score?: number | null
          corrected_image_url?: string | null
          corrected_storage_path?: string | null
          corrections?: string[]
          created_at?: string
          decision?: string
          engine_version?: string
          id?: string
          issues?: string[]
          original_image_url: string
          original_storage_path?: string | null
          product_detected?: string | null
          product_id?: string | null
          published_image_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string | null
          thumbnail_urls?: Json
          updated_at?: string
          vendor_id?: string | null
          visual_rules?: Json
        }
        Update: {
          admin_notes?: string | null
          ai_analysis?: Json
          compliance_score?: number | null
          corrected_image_url?: string | null
          corrected_storage_path?: string | null
          corrections?: string[]
          created_at?: string
          decision?: string
          engine_version?: string
          id?: string
          issues?: string[]
          original_image_url?: string
          original_storage_path?: string | null
          product_detected?: string | null
          product_id?: string | null
          published_image_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string | null
          thumbnail_urls?: Json
          updated_at?: string
          vendor_id?: string | null
          visual_rules?: Json
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_image_studio_jobs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_image_studio_jobs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_image_studio_jobs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_image_studio_jobs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_image_studio_jobs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_image_studio_rules: {
        Row: {
          auto_correct_publish_min_score: number
          auto_publish_min_score: number
          background_hex: string
          created_at: string
          id: string
          is_active: boolean
          manual_review_min_score: number
          official_format: string
          prohibited_elements: string[]
          required_rules: Json
          rule_version: string
          target_height: number
          target_width: number
          updated_at: string
        }
        Insert: {
          auto_correct_publish_min_score?: number
          auto_publish_min_score?: number
          background_hex?: string
          created_at?: string
          id?: string
          is_active?: boolean
          manual_review_min_score?: number
          official_format?: string
          prohibited_elements?: string[]
          required_rules?: Json
          rule_version?: string
          target_height?: number
          target_width?: number
          updated_at?: string
        }
        Update: {
          auto_correct_publish_min_score?: number
          auto_publish_min_score?: number
          background_hex?: string
          created_at?: string
          id?: string
          is_active?: boolean
          manual_review_min_score?: number
          official_format?: string
          prohibited_elements?: string[]
          required_rules?: Json
          rule_version?: string
          target_height?: number
          target_width?: number
          updated_at?: string
        }
        Relationships: []
      }
      marketplace_resolution_teams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          skills: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          skills?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          skills?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      marketplace_search_synonyms: {
        Row: {
          canonical_term: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          language: string
          scope: string
          synonyms: string[]
          updated_at: string
        }
        Insert: {
          canonical_term: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          language?: string
          scope?: string
          synonyms?: string[]
          updated_at?: string
        }
        Update: {
          canonical_term?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          language?: string
          scope?: string
          synonyms?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      marketplace_seo_content_proposals: {
        Row: {
          created_at: string
          created_by: string | null
          current_value: Json
          explanation: string
          id: string
          product_id: string | null
          proposal_type: string
          proposed_value: Json
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          vendor_owner_id: string | null
          vendor_shop_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_value?: Json
          explanation?: string
          id?: string
          product_id?: string | null
          proposal_type: string
          proposed_value?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          vendor_owner_id?: string | null
          vendor_shop_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_value?: Json
          explanation?: string
          id?: string
          product_id?: string | null
          proposal_type?: string
          proposed_value?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          vendor_owner_id?: string | null
          vendor_shop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_seo_content_proposals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_seo_content_proposals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_seo_content_proposals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_seo_content_proposals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_seo_content_proposals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_seo_content_proposals_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_seo_content_proposals_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_seo_content_proposals_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_seo_product_scores: {
        Row: {
          analyzed_at: string
          category_score: number
          created_at: string
          description_score: number
          discoverability_score: number
          duplicate_candidates: Json
          engine_version: string
          id: string
          issues: string[]
          media_score: number
          product_id: string
          recommendations: Json
          score_breakdown: Json
          search_score: number
          seo_score: number
          structured_data_score: number
          suggested_keywords: string[]
          title_score: number
          vendor_owner_id: string | null
          vendor_shop_id: string | null
        }
        Insert: {
          analyzed_at?: string
          category_score?: number
          created_at?: string
          description_score?: number
          discoverability_score?: number
          duplicate_candidates?: Json
          engine_version?: string
          id?: string
          issues?: string[]
          media_score?: number
          product_id: string
          recommendations?: Json
          score_breakdown?: Json
          search_score?: number
          seo_score?: number
          structured_data_score?: number
          suggested_keywords?: string[]
          title_score?: number
          vendor_owner_id?: string | null
          vendor_shop_id?: string | null
        }
        Update: {
          analyzed_at?: string
          category_score?: number
          created_at?: string
          description_score?: number
          discoverability_score?: number
          duplicate_candidates?: Json
          engine_version?: string
          id?: string
          issues?: string[]
          media_score?: number
          product_id?: string
          recommendations?: Json
          score_breakdown?: Json
          search_score?: number
          seo_score?: number
          structured_data_score?: number
          suggested_keywords?: string[]
          title_score?: number
          vendor_owner_id?: string | null
          vendor_shop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_seo_product_scores_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_seo_product_scores_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_seo_product_scores_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_seo_product_scores_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_seo_product_scores_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_seo_product_scores_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_seo_product_scores_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_seo_product_scores_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_seo_proposal_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          explanation: string
          id: string
          metadata: Json
          new_status: string | null
          previous_status: string | null
          product_id: string | null
          proposal_id: string | null
          vendor_owner_id: string | null
          vendor_shop_id: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          explanation?: string
          id?: string
          metadata?: Json
          new_status?: string | null
          previous_status?: string | null
          product_id?: string | null
          proposal_id?: string | null
          vendor_owner_id?: string | null
          vendor_shop_id?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          explanation?: string
          id?: string
          metadata?: Json
          new_status?: string | null
          previous_status?: string | null
          product_id?: string | null
          proposal_id?: string | null
          vendor_owner_id?: string | null
          vendor_shop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_seo_proposal_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_seo_proposal_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_seo_proposal_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_seo_proposal_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_seo_proposal_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_seo_proposal_events_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "marketplace_seo_content_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_seo_proposal_events_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_seo_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_seo_proposal_events_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_seo_proposal_events_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_seo_proposal_events_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_seo_shop_scores: {
        Row: {
          analyzed_at: string
          created_at: string
          discoverability_score: number
          engine_version: string
          id: string
          issues: string[]
          optimized_product_count: number
          product_count: number
          recommendations: Json
          score_breakdown: Json
          seo_score: number
          vendor_owner_id: string | null
          vendor_shop_id: string
        }
        Insert: {
          analyzed_at?: string
          created_at?: string
          discoverability_score?: number
          engine_version?: string
          id?: string
          issues?: string[]
          optimized_product_count?: number
          product_count?: number
          recommendations?: Json
          score_breakdown?: Json
          seo_score?: number
          vendor_owner_id?: string | null
          vendor_shop_id: string
        }
        Update: {
          analyzed_at?: string
          created_at?: string
          discoverability_score?: number
          engine_version?: string
          id?: string
          issues?: string[]
          optimized_product_count?: number
          product_count?: number
          recommendations?: Json
          score_breakdown?: Json
          seo_score?: number
          vendor_owner_id?: string | null
          vendor_shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_seo_shop_scores_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_seo_shop_scores_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_seo_shop_scores_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_workflow_automation_executions: {
        Row: {
          actor_type: string
          case_id: string | null
          created_at: string
          duration_ms: number
          error_message: string | null
          finished_at: string
          id: string
          queue_id: string | null
          result: Json
          rule_id: string | null
          started_at: string
          status: string
          trigger_event: string
        }
        Insert: {
          actor_type?: string
          case_id?: string | null
          created_at?: string
          duration_ms?: number
          error_message?: string | null
          finished_at?: string
          id?: string
          queue_id?: string | null
          result?: Json
          rule_id?: string | null
          started_at?: string
          status: string
          trigger_event: string
        }
        Update: {
          actor_type?: string
          case_id?: string | null
          created_at?: string
          duration_ms?: number
          error_message?: string | null
          finished_at?: string
          id?: string
          queue_id?: string | null
          result?: Json
          rule_id?: string | null
          started_at?: string
          status?: string
          trigger_event?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_workflow_automation_executions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_case_resolution_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_executions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_governance_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_executions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "marketplace_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_executions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_case_resolution_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_executions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_executions_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_workflow_automation_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_executions_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "marketplace_workflow_automation_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_executions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_workflow_automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_executions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "marketplace_workflow_automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_workflow_automation_queue: {
        Row: {
          attempt_count: number
          case_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          last_error: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          payload: Json
          rule_id: string
          scheduled_for: string
          status: string
          trigger_event: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          case_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          payload?: Json
          rule_id: string
          scheduled_for?: string
          status?: string
          trigger_event: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          case_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          payload?: Json
          rule_id?: string
          scheduled_for?: string
          status?: string
          trigger_event?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_workflow_automation_queue_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_case_resolution_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_queue_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_governance_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_queue_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "marketplace_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_queue_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_case_resolution_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_queue_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_queue_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_workflow_automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_queue_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "marketplace_workflow_automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_workflow_automation_rules: {
        Row: {
          actions: Json
          conditions: Json
          cooldown_minutes: number
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          last_error: string | null
          last_run_at: string | null
          metadata: Json
          name: string
          priority: number
          run_count: number
          trigger_event: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          actions?: Json
          conditions?: Json
          cooldown_minutes?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_run_at?: string | null
          metadata?: Json
          name: string
          priority?: number
          run_count?: number
          trigger_event: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          actions?: Json
          conditions?: Json
          cooldown_minutes?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_run_at?: string | null
          metadata?: Json
          name?: string
          priority?: number
          run_count?: number
          trigger_event?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      marketplace_workflow_automation_schedules: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          last_run_at: string | null
          name: string
          next_run_at: string
          payload: Json
          rule_id: string | null
          schedule_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name: string
          next_run_at: string
          payload?: Json
          rule_id?: string | null
          schedule_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name?: string
          next_run_at?: string
          payload?: Json
          rule_id?: string | null
          schedule_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_workflow_automation_schedules_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_workflow_automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_schedules_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "marketplace_workflow_automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_workflow_automation_tasks: {
        Row: {
          assigned_to: string | null
          case_id: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_at: string | null
          id: string
          metadata: Json
          rule_id: string | null
          status: string
          task_type: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          case_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          metadata?: Json
          rule_id?: string | null
          status?: string
          task_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          case_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          metadata?: Json
          rule_id?: string | null
          status?: string
          task_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_workflow_automation_tasks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_case_resolution_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_tasks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_governance_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_tasks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "marketplace_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_tasks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_case_resolution_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_tasks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_tasks_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_workflow_automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_tasks_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "marketplace_workflow_automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_workflow_statuses: {
        Row: {
          code: string
          created_at: string
          description: string | null
          is_active: boolean
          is_terminal: boolean
          is_vendor_waiting: boolean
          label: string
          maps_to_governance_status: string
          stage_order: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          is_terminal?: boolean
          is_vendor_waiting?: boolean
          label: string
          maps_to_governance_status?: string
          stage_order: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          is_terminal?: boolean
          is_vendor_waiting?: boolean
          label?: string
          maps_to_governance_status?: string
          stage_order?: number
        }
        Relationships: []
      }
      media_articles: {
        Row: {
          author_id: string | null
          author_name: string | null
          category_id: string | null
          content: string
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          featured: boolean
          id: string
          published_at: string | null
          reading_time_minutes: number
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: string
          tags: string[]
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          category_id?: string | null
          content: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          featured?: boolean
          id?: string
          published_at?: string | null
          reading_time_minutes?: number
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          category_id?: string | null
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          featured?: boolean
          id?: string
          published_at?: string | null
          reading_time_minutes?: number
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "media_articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "media_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "media_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      media_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      mlm_bonuses: {
        Row: {
          achieved_at: string | null
          amount: number
          bonus_name: string
          bonus_type: string
          created_at: string | null
          id: string
          paid: boolean | null
          trigger_condition: string | null
          user_id: string
        }
        Insert: {
          achieved_at?: string | null
          amount: number
          bonus_name: string
          bonus_type: string
          created_at?: string | null
          id?: string
          paid?: boolean | null
          trigger_condition?: string | null
          user_id: string
        }
        Update: {
          achieved_at?: string | null
          amount?: number
          bonus_name?: string
          bonus_type?: string
          created_at?: string | null
          id?: string
          paid?: boolean | null
          trigger_condition?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mlm_bonuses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      order_accounting_snapshots: {
        Row: {
          ambassador_commission_estimate: number
          amount_excluding_tax: number
          amount_including_tax: number
          captured_amount: number
          created_at: string
          created_by: string | null
          currency: string
          delivery_fee: number
          delivery_zone_id: string | null
          discount_amount: number
          estimated_net_margin: number
          gross_margin: number
          guest_email: string | null
          id: string
          items: Json
          metadata: Json
          order_id: string
          order_number: string
          payment_provider_fee: number
          platform_commission_amount: number
          product_cost_total: number
          promo_code: string | null
          refunded_amount: number
          rules: Json
          service_fee: number
          subtotal: number
          tax_amount: number
          tax_rate: number
          user_id: string | null
          vendor_commission_amount: number
        }
        Insert: {
          ambassador_commission_estimate?: number
          amount_excluding_tax?: number
          amount_including_tax?: number
          captured_amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          delivery_fee?: number
          delivery_zone_id?: string | null
          discount_amount?: number
          estimated_net_margin?: number
          gross_margin?: number
          guest_email?: string | null
          id?: string
          items: Json
          metadata?: Json
          order_id: string
          order_number: string
          payment_provider_fee?: number
          platform_commission_amount?: number
          product_cost_total?: number
          promo_code?: string | null
          refunded_amount?: number
          rules?: Json
          service_fee?: number
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          user_id?: string | null
          vendor_commission_amount?: number
        }
        Update: {
          ambassador_commission_estimate?: number
          amount_excluding_tax?: number
          amount_including_tax?: number
          captured_amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          delivery_fee?: number
          delivery_zone_id?: string | null
          discount_amount?: number
          estimated_net_margin?: number
          gross_margin?: number
          guest_email?: string | null
          id?: string
          items?: Json
          metadata?: Json
          order_id?: string
          order_number?: string
          payment_provider_fee?: number
          platform_commission_amount?: number
          product_cost_total?: number
          promo_code?: string | null
          refunded_amount?: number
          rules?: Json
          service_fee?: number
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          user_id?: string | null
          vendor_commission_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_accounting_snapshots_delivery_zone_id_fkey"
            columns: ["delivery_zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_accounting_snapshots_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "admin_finance_overview"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_accounting_snapshots_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_attributions: {
        Row: {
          attributed_user_id: string | null
          attribution_event_id: string | null
          attribution_source: string
          confidence: number
          created_at: string
          decision: string
          explanation: Json
          id: string
          order_id: string
          priority: number
          rejection_reasons: Json
        }
        Insert: {
          attributed_user_id?: string | null
          attribution_event_id?: string | null
          attribution_source: string
          confidence?: number
          created_at?: string
          decision?: string
          explanation?: Json
          id?: string
          order_id: string
          priority?: number
          rejection_reasons?: Json
        }
        Update: {
          attributed_user_id?: string | null
          attribution_event_id?: string | null
          attribution_source?: string
          confidence?: number
          created_at?: string
          decision?: string
          explanation?: Json
          id?: string
          order_id?: string
          priority?: number
          rejection_reasons?: Json
        }
        Relationships: [
          {
            foreignKeyName: "order_attributions_attributed_user_id_fkey"
            columns: ["attributed_user_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "order_attributions_attribution_event_id_fkey"
            columns: ["attribution_event_id"]
            isOneToOne: false
            referencedRelation: "attribution_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_attributions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "admin_finance_overview"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_attributions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_escrows: {
        Row: {
          amount: number
          buyer_id: string
          captured_amount: number
          captured_at: string | null
          created_at: string
          currency: string
          held_at: string
          hold_reason: string | null
          id: string
          metadata: Json
          order_id: string
          refunded_amount: number
          refunded_at: string | null
          release_reason: string | null
          seller_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          buyer_id: string
          captured_amount?: number
          captured_at?: string | null
          created_at?: string
          currency?: string
          held_at?: string
          hold_reason?: string | null
          id?: string
          metadata?: Json
          order_id: string
          refunded_amount?: number
          refunded_at?: string | null
          release_reason?: string | null
          seller_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          buyer_id?: string
          captured_amount?: number
          captured_at?: string | null
          created_at?: string
          currency?: string
          held_at?: string
          hold_reason?: string | null
          id?: string
          metadata?: Json
          order_id?: string
          refunded_amount?: number
          refunded_at?: string | null
          release_reason?: string | null
          seller_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_escrows_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "admin_finance_overview"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_escrows_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          accounting_metadata: Json
          category_id: string | null
          created_at: string | null
          id: string
          line_cost_total: number | null
          order_id: string
          packaging_bottle_quantity: number | null
          packaging_discount_amount: number | null
          packaging_discount_percent: number | null
          packaging_label: string | null
          packaging_option_id: string | null
          packaging_type: string | null
          packaging_unit_price: number | null
          packaging_units: number | null
          product_id: string | null
          product_image: string | null
          product_name: string
          purchase_unit_cost: number | null
          quantity: number
          total_price: number
          unit_price: number
          vendor_id: string | null
          vendor_status: Database["public"]["Enums"]["vendor_fulfillment_status"]
          vendor_updated_at: string
        }
        Insert: {
          accounting_metadata?: Json
          category_id?: string | null
          created_at?: string | null
          id?: string
          line_cost_total?: number | null
          order_id: string
          packaging_bottle_quantity?: number | null
          packaging_discount_amount?: number | null
          packaging_discount_percent?: number | null
          packaging_label?: string | null
          packaging_option_id?: string | null
          packaging_type?: string | null
          packaging_unit_price?: number | null
          packaging_units?: number | null
          product_id?: string | null
          product_image?: string | null
          product_name: string
          purchase_unit_cost?: number | null
          quantity: number
          total_price: number
          unit_price: number
          vendor_id?: string | null
          vendor_status?: Database["public"]["Enums"]["vendor_fulfillment_status"]
          vendor_updated_at?: string
        }
        Update: {
          accounting_metadata?: Json
          category_id?: string | null
          created_at?: string | null
          id?: string
          line_cost_total?: number | null
          order_id?: string
          packaging_bottle_quantity?: number | null
          packaging_discount_amount?: number | null
          packaging_discount_percent?: number | null
          packaging_label?: string | null
          packaging_option_id?: string | null
          packaging_type?: string | null
          packaging_unit_price?: number | null
          packaging_units?: number | null
          product_id?: string | null
          product_image?: string | null
          product_name?: string
          purchase_unit_cost?: number | null
          quantity?: number
          total_price?: number
          unit_price?: number
          vendor_id?: string | null
          vendor_status?: Database["public"]["Enums"]["vendor_fulfillment_status"]
          vendor_updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "admin_finance_overview"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "order_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "order_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      order_risk_scores: {
        Row: {
          created_at: string
          factors: Json
          id: string
          order_id: string
          review_notes: string | null
          review_status: Database["public"]["Enums"]["fraud_review_status"]
          reviewed_at: string | null
          reviewed_by: string | null
          risk_level: Database["public"]["Enums"]["fraud_risk_level"]
          score: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          factors?: Json
          id?: string
          order_id: string
          review_notes?: string | null
          review_status?: Database["public"]["Enums"]["fraud_review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level?: Database["public"]["Enums"]["fraud_risk_level"]
          score?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          factors?: Json
          id?: string
          order_id?: string
          review_notes?: string | null
          review_status?: Database["public"]["Enums"]["fraud_review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level?: Database["public"]["Enums"]["fraud_risk_level"]
          score?: number
          updated_at?: string
        }
        Relationships: []
      }
      order_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_status: string
          notes: string | null
          order_id: string
          previous_status: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_status: string
          notes?: string | null
          order_id: string
          previous_status?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_status?: string
          notes?: string | null
          order_id?: string
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "admin_finance_overview"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          accounting_snapshot_created_at: string | null
          accounting_snapshot_id: string | null
          created_at: string | null
          currency: string
          delivery_fee: number | null
          discount_amount: number | null
          exchange_rate: number
          gift_message: string | null
          gift_packaging_id: string | null
          gift_packaging_price: number | null
          guest_email: string | null
          guest_phone: string | null
          id: string
          loyalty_points_earned: number | null
          loyalty_points_used: number | null
          notes: string | null
          order_lookup_token: string | null
          order_number: string
          parrain_id: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_provider_fee: number
          payment_reference: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          referral_code_used: string | null
          referrer_id: string | null
          refunded_amount: number
          service_fee: number
          shipping_address_id: string | null
          shipping_city: string | null
          shipping_full_name: string | null
          shipping_neighborhood: string | null
          shipping_notes: string | null
          shipping_phone: string | null
          shipping_street: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          stock_restore_reason: string | null
          stock_restored_at: string | null
          subtotal: number
          tax_amount: number
          tax_rate: number
          total: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          accounting_snapshot_created_at?: string | null
          accounting_snapshot_id?: string | null
          created_at?: string | null
          currency?: string
          delivery_fee?: number | null
          discount_amount?: number | null
          exchange_rate?: number
          gift_message?: string | null
          gift_packaging_id?: string | null
          gift_packaging_price?: number | null
          guest_email?: string | null
          guest_phone?: string | null
          id?: string
          loyalty_points_earned?: number | null
          loyalty_points_used?: number | null
          notes?: string | null
          order_lookup_token?: string | null
          order_number: string
          parrain_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_provider_fee?: number
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          referral_code_used?: string | null
          referrer_id?: string | null
          refunded_amount?: number
          service_fee?: number
          shipping_address_id?: string | null
          shipping_city?: string | null
          shipping_full_name?: string | null
          shipping_neighborhood?: string | null
          shipping_notes?: string | null
          shipping_phone?: string | null
          shipping_street?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          stock_restore_reason?: string | null
          stock_restored_at?: string | null
          subtotal: number
          tax_amount?: number
          tax_rate?: number
          total: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          accounting_snapshot_created_at?: string | null
          accounting_snapshot_id?: string | null
          created_at?: string | null
          currency?: string
          delivery_fee?: number | null
          discount_amount?: number | null
          exchange_rate?: number
          gift_message?: string | null
          gift_packaging_id?: string | null
          gift_packaging_price?: number | null
          guest_email?: string | null
          guest_phone?: string | null
          id?: string
          loyalty_points_earned?: number | null
          loyalty_points_used?: number | null
          notes?: string | null
          order_lookup_token?: string | null
          order_number?: string
          parrain_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_provider_fee?: number
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          referral_code_used?: string | null
          referrer_id?: string | null
          refunded_amount?: number
          service_fee?: number
          shipping_address_id?: string | null
          shipping_city?: string | null
          shipping_full_name?: string | null
          shipping_neighborhood?: string | null
          shipping_notes?: string | null
          shipping_phone?: string | null
          shipping_street?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          stock_restore_reason?: string | null
          stock_restored_at?: string | null
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_gift_packaging_id_fkey"
            columns: ["gift_packaging_id"]
            isOneToOne: false
            referencedRelation: "gift_packaging_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "orders_shipping_address_id_fkey"
            columns: ["shipping_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      p05_activation_audit_logs: {
        Row: {
          comment: string
          confirmation_text: string
          decision: string
          engine_version: string
          go_live_score: number
          id: string
          metadata: Json
          orders_analyzed: number
          requested_at: string
          requested_by: string
          requested_mode: string
          simulation_accuracy: number
          simulation_confidence_score: number
          simulation_run_id: string | null
          warnings: Json
        }
        Insert: {
          comment: string
          confirmation_text: string
          decision: string
          engine_version?: string
          go_live_score?: number
          id?: string
          metadata?: Json
          orders_analyzed?: number
          requested_at?: string
          requested_by: string
          requested_mode: string
          simulation_accuracy?: number
          simulation_confidence_score?: number
          simulation_run_id?: string | null
          warnings?: Json
        }
        Update: {
          comment?: string
          confirmation_text?: string
          decision?: string
          engine_version?: string
          go_live_score?: number
          id?: string
          metadata?: Json
          orders_analyzed?: number
          requested_at?: string
          requested_by?: string
          requested_mode?: string
          simulation_accuracy?: number
          simulation_confidence_score?: number
          simulation_run_id?: string | null
          warnings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "p05_activation_audit_logs_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "p05_activation_audit_logs_simulation_run_id_fkey"
            columns: ["simulation_run_id"]
            isOneToOne: false
            referencedRelation: "admin_p05_readiness_dashboard"
            referencedColumns: ["latest_run_id"]
          },
          {
            foreignKeyName: "p05_activation_audit_logs_simulation_run_id_fkey"
            columns: ["simulation_run_id"]
            isOneToOne: false
            referencedRelation: "admin_p05_simulation_dashboard"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "p05_activation_audit_logs_simulation_run_id_fkey"
            columns: ["simulation_run_id"]
            isOneToOne: false
            referencedRelation: "p05_simulation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      p05_engine_activation_controls: {
        Row: {
          confirm_text: string
          decision: string
          id: string
          is_financial_execution_enabled: boolean
          justification: string
          metadata: Json
          orders_analyzed: number
          requested_at: string
          requested_by: string
          requested_mode: string
          simulation_accuracy: number
          simulation_confidence_score: number
          simulation_run_id: string | null
        }
        Insert: {
          confirm_text: string
          decision: string
          id?: string
          is_financial_execution_enabled?: boolean
          justification: string
          metadata?: Json
          orders_analyzed?: number
          requested_at?: string
          requested_by: string
          requested_mode: string
          simulation_accuracy?: number
          simulation_confidence_score?: number
          simulation_run_id?: string | null
        }
        Update: {
          confirm_text?: string
          decision?: string
          id?: string
          is_financial_execution_enabled?: boolean
          justification?: string
          metadata?: Json
          orders_analyzed?: number
          requested_at?: string
          requested_by?: string
          requested_mode?: string
          simulation_accuracy?: number
          simulation_confidence_score?: number
          simulation_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "p05_engine_activation_controls_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "p05_engine_activation_controls_simulation_run_id_fkey"
            columns: ["simulation_run_id"]
            isOneToOne: false
            referencedRelation: "admin_p05_readiness_dashboard"
            referencedColumns: ["latest_run_id"]
          },
          {
            foreignKeyName: "p05_engine_activation_controls_simulation_run_id_fkey"
            columns: ["simulation_run_id"]
            isOneToOne: false
            referencedRelation: "admin_p05_simulation_dashboard"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "p05_engine_activation_controls_simulation_run_id_fkey"
            columns: ["simulation_run_id"]
            isOneToOne: false
            referencedRelation: "p05_simulation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      p05_simulation_order_results: {
        Row: {
          anomaly_count: number
          attribution_difference: boolean
          commission_difference: number
          compatible: boolean
          created_at: string
          differences: Json
          explanation: Json
          governance_decision: string
          id: string
          margin_difference: number
          order_id: string
          order_number: string
          order_status: string | null
          p0_attribution_source: string | null
          p0_attribution_user_id: string | null
          p0_commission_pool: number
          p0_contribution_margin: number
          p0_revenue: number
          payment_status: string | null
          production_attribution_source: string | null
          production_attribution_user_id: string | null
          production_commission: number
          production_margin: number
          production_platform_profit: number
          production_revenue: number
          run_id: string
          theoretical_advisor_gains: number
          theoretical_marketplace_gains: number
          theoretical_platform_profit: number
        }
        Insert: {
          anomaly_count?: number
          attribution_difference?: boolean
          commission_difference?: number
          compatible?: boolean
          created_at?: string
          differences?: Json
          explanation?: Json
          governance_decision?: string
          id?: string
          margin_difference?: number
          order_id: string
          order_number: string
          order_status?: string | null
          p0_attribution_source?: string | null
          p0_attribution_user_id?: string | null
          p0_commission_pool?: number
          p0_contribution_margin?: number
          p0_revenue?: number
          payment_status?: string | null
          production_attribution_source?: string | null
          production_attribution_user_id?: string | null
          production_commission?: number
          production_margin?: number
          production_platform_profit?: number
          production_revenue?: number
          run_id: string
          theoretical_advisor_gains?: number
          theoretical_marketplace_gains?: number
          theoretical_platform_profit?: number
        }
        Update: {
          anomaly_count?: number
          attribution_difference?: boolean
          commission_difference?: number
          compatible?: boolean
          created_at?: string
          differences?: Json
          explanation?: Json
          governance_decision?: string
          id?: string
          margin_difference?: number
          order_id?: string
          order_number?: string
          order_status?: string | null
          p0_attribution_source?: string | null
          p0_attribution_user_id?: string | null
          p0_commission_pool?: number
          p0_contribution_margin?: number
          p0_revenue?: number
          payment_status?: string | null
          production_attribution_source?: string | null
          production_attribution_user_id?: string | null
          production_commission?: number
          production_margin?: number
          production_platform_profit?: number
          production_revenue?: number
          run_id?: string
          theoretical_advisor_gains?: number
          theoretical_marketplace_gains?: number
          theoretical_platform_profit?: number
        }
        Relationships: [
          {
            foreignKeyName: "p05_simulation_order_results_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "admin_finance_overview"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "p05_simulation_order_results_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "p05_simulation_order_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "admin_p05_readiness_dashboard"
            referencedColumns: ["latest_run_id"]
          },
          {
            foreignKeyName: "p05_simulation_order_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "admin_p05_simulation_dashboard"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "p05_simulation_order_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "p05_simulation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      p05_simulation_runs: {
        Row: {
          anomalies_detected: number
          commission_difference_total: number
          commission_extra_total: number
          commission_saved_total: number
          compatible_orders: number
          completed_at: string | null
          different_orders: number
          error: string | null
          id: string
          margin_difference_total: number
          mode: string
          orders_analyzed: number
          orders_requested: number
          production_platform_profit_total: number
          requested_at: string
          requested_by: string | null
          simulated_platform_profit_total: number
          simulation_accuracy: number
          simulation_confidence_score: number
          status: string
          summary: Json
        }
        Insert: {
          anomalies_detected?: number
          commission_difference_total?: number
          commission_extra_total?: number
          commission_saved_total?: number
          compatible_orders?: number
          completed_at?: string | null
          different_orders?: number
          error?: string | null
          id?: string
          margin_difference_total?: number
          mode?: string
          orders_analyzed?: number
          orders_requested?: number
          production_platform_profit_total?: number
          requested_at?: string
          requested_by?: string | null
          simulated_platform_profit_total?: number
          simulation_accuracy?: number
          simulation_confidence_score?: number
          status?: string
          summary?: Json
        }
        Update: {
          anomalies_detected?: number
          commission_difference_total?: number
          commission_extra_total?: number
          commission_saved_total?: number
          compatible_orders?: number
          completed_at?: string | null
          different_orders?: number
          error?: string | null
          id?: string
          margin_difference_total?: number
          mode?: string
          orders_analyzed?: number
          orders_requested?: number
          production_platform_profit_total?: number
          requested_at?: string
          requested_by?: string | null
          simulated_platform_profit_total?: number
          simulation_accuracy?: number
          simulation_confidence_score?: number
          status?: string
          summary?: Json
        }
        Relationships: []
      }
      payment_intents: {
        Row: {
          amount: number
          created_at: string
          currency: string
          exchange_rate: number
          external_reference: string | null
          failure_reason: string | null
          id: string
          metadata: Json
          method: string
          order_id: string | null
          processed_at: string | null
          provider: string
          provider_response: Json
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          exchange_rate?: number
          external_reference?: string | null
          failure_reason?: string | null
          id?: string
          metadata?: Json
          method: string
          order_id?: string | null
          processed_at?: string | null
          provider: string
          provider_response?: Json
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          exchange_rate?: number
          external_reference?: string | null
          failure_reason?: string | null
          id?: string
          metadata?: Json
          method?: string
          order_id?: string | null
          processed_at?: string | null
          provider?: string
          provider_response?: Json
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_intents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "admin_finance_overview"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "payment_intents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      payment_reconciliations: {
        Row: {
          created_at: string
          currency: string
          expected_amount: number
          id: string
          notes: string | null
          order_id: string | null
          payment_intent_id: string | null
          received_amount: number
          reconciled_at: string | null
          reconciled_by: string | null
          status: string
          updated_at: string
          variance: number | null
        }
        Insert: {
          created_at?: string
          currency?: string
          expected_amount: number
          id?: string
          notes?: string | null
          order_id?: string | null
          payment_intent_id?: string | null
          received_amount: number
          reconciled_at?: string | null
          reconciled_by?: string | null
          status?: string
          updated_at?: string
          variance?: number | null
        }
        Update: {
          created_at?: string
          currency?: string
          expected_amount?: number
          id?: string
          notes?: string | null
          order_id?: string | null
          payment_intent_id?: string | null
          received_amount?: number
          reconciled_at?: string | null
          reconciled_by?: string | null
          status?: string
          updated_at?: string
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_reconciliations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "admin_finance_overview"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "payment_reconciliations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reconciliations_payment_intent_id_fkey"
            columns: ["payment_intent_id"]
            isOneToOne: true
            referencedRelation: "admin_finance_overview"
            referencedColumns: ["payment_intent_id"]
          },
          {
            foreignKeyName: "payment_reconciliations_payment_intent_id_fkey"
            columns: ["payment_intent_id"]
            isOneToOne: true
            referencedRelation: "payment_intents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reconciliations_reconciled_by_fkey"
            columns: ["reconciled_by"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      perf_metrics: {
        Row: {
          created_at: string
          id: number
          metric: string
          navigation_type: string | null
          rating: string | null
          route: string
          session_id: string | null
          user_agent: string | null
          user_id: string | null
          value: number
        }
        Insert: {
          created_at?: string
          id?: number
          metric: string
          navigation_type?: string | null
          rating?: string | null
          route: string
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          value: number
        }
        Update: {
          created_at?: string
          id?: number
          metric?: string
          navigation_type?: string | null
          rating?: string | null
          route?: string
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          value?: number
        }
        Relationships: []
      }
      platform_architecture_scan_reports: {
        Row: {
          circular_dependencies: Json
          created_at: string
          edge_functions_detected: number
          findings: Json
          id: string
          modules_detected: number
          report_path: string | null
          rpc_detected: number
          scan_source: string
          status: string
          undocumented_edge_functions: number
          undocumented_rpc: number
        }
        Insert: {
          circular_dependencies?: Json
          created_at?: string
          edge_functions_detected?: number
          findings?: Json
          id?: string
          modules_detected?: number
          report_path?: string | null
          rpc_detected?: number
          scan_source?: string
          status?: string
          undocumented_edge_functions?: number
          undocumented_rpc?: number
        }
        Update: {
          circular_dependencies?: Json
          created_at?: string
          edge_functions_detected?: number
          findings?: Json
          id?: string
          modules_detected?: number
          report_path?: string | null
          rpc_detected?: number
          scan_source?: string
          status?: string
          undocumented_edge_functions?: number
          undocumented_rpc?: number
        }
        Relationships: []
      }
      platform_capability_registry: {
        Row: {
          access_type: string
          capability_key: string
          created_at: string
          dependencies: string[]
          description: string
          documentation_path: string | null
          id: string
          input_contract: Json
          module_key: string
          output_contract: Json
          required_permission: string | null
          status: string
          updated_at: string
          version: string
        }
        Insert: {
          access_type?: string
          capability_key: string
          created_at?: string
          dependencies?: string[]
          description: string
          documentation_path?: string | null
          id?: string
          input_contract?: Json
          module_key: string
          output_contract?: Json
          required_permission?: string | null
          status?: string
          updated_at?: string
          version?: string
        }
        Update: {
          access_type?: string
          capability_key?: string
          created_at?: string
          dependencies?: string[]
          description?: string
          documentation_path?: string | null
          id?: string
          input_contract?: Json
          module_key?: string
          output_contract?: Json
          required_permission?: string | null
          status?: string
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_capability_registry_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "admin_platform_dependency_map"
            referencedColumns: ["module_key"]
          },
          {
            foreignKeyName: "platform_capability_registry_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "admin_platform_extension_modules"
            referencedColumns: ["module_key"]
          },
          {
            foreignKeyName: "platform_capability_registry_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "platform_extension_modules"
            referencedColumns: ["module_key"]
          },
        ]
      }
      platform_edge_function_contracts: {
        Row: {
          auth_policy: string
          authorization_policy: string
          created_at: string
          documentation_path: string | null
          function_name: string
          id: string
          input_contract: Json
          metrics: Json
          module_key: string
          output_contract: Json
          purpose: string
          retry_policy: Json
          status: string
          timeout_ms: number
          updated_at: string
          version: string
        }
        Insert: {
          auth_policy?: string
          authorization_policy?: string
          created_at?: string
          documentation_path?: string | null
          function_name: string
          id?: string
          input_contract?: Json
          metrics?: Json
          module_key: string
          output_contract?: Json
          purpose: string
          retry_policy?: Json
          status?: string
          timeout_ms?: number
          updated_at?: string
          version?: string
        }
        Update: {
          auth_policy?: string
          authorization_policy?: string
          created_at?: string
          documentation_path?: string | null
          function_name?: string
          id?: string
          input_contract?: Json
          metrics?: Json
          module_key?: string
          output_contract?: Json
          purpose?: string
          retry_policy?: Json
          status?: string
          timeout_ms?: number
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_edge_function_contracts_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "admin_platform_dependency_map"
            referencedColumns: ["module_key"]
          },
          {
            foreignKeyName: "platform_edge_function_contracts_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "admin_platform_extension_modules"
            referencedColumns: ["module_key"]
          },
          {
            foreignKeyName: "platform_edge_function_contracts_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "platform_extension_modules"
            referencedColumns: ["module_key"]
          },
        ]
      }
      platform_event_catalog: {
        Row: {
          created_at: string
          description: string
          event_key: string
          id: string
          known_consumers: string[]
          optional_fields: string[]
          payload_schema: Json
          producer_module_key: string
          required_fields: string[]
          retention_policy: string
          sensitivity_level: string
          status: string
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          description: string
          event_key: string
          id?: string
          known_consumers?: string[]
          optional_fields?: string[]
          payload_schema?: Json
          producer_module_key: string
          required_fields?: string[]
          retention_policy?: string
          sensitivity_level?: string
          status?: string
          updated_at?: string
          version?: string
        }
        Update: {
          created_at?: string
          description?: string
          event_key?: string
          id?: string
          known_consumers?: string[]
          optional_fields?: string[]
          payload_schema?: Json
          producer_module_key?: string
          required_fields?: string[]
          retention_policy?: string
          sensitivity_level?: string
          status?: string
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_event_catalog_producer_module_key_fkey"
            columns: ["producer_module_key"]
            isOneToOne: false
            referencedRelation: "admin_platform_dependency_map"
            referencedColumns: ["module_key"]
          },
          {
            foreignKeyName: "platform_event_catalog_producer_module_key_fkey"
            columns: ["producer_module_key"]
            isOneToOne: false
            referencedRelation: "admin_platform_extension_modules"
            referencedColumns: ["module_key"]
          },
          {
            foreignKeyName: "platform_event_catalog_producer_module_key_fkey"
            columns: ["producer_module_key"]
            isOneToOne: false
            referencedRelation: "platform_extension_modules"
            referencedColumns: ["module_key"]
          },
        ]
      }
      platform_extension_modules: {
        Row: {
          can_be_disabled: boolean
          consumed_events: string[]
          contract_version: string
          created_at: string
          created_by: string | null
          dependencies: string[]
          description: string
          documentation_path: string | null
          edge_functions: string[]
          id: string
          logical_owner: string
          metadata: Json
          module_key: string
          name: string
          primary_tables: string[]
          produced_events: string[]
          provided_capabilities: string[]
          required_permissions: string[]
          routes: string[]
          rpc_functions: string[]
          status: string
          updated_at: string
          version: string
        }
        Insert: {
          can_be_disabled?: boolean
          consumed_events?: string[]
          contract_version?: string
          created_at?: string
          created_by?: string | null
          dependencies?: string[]
          description: string
          documentation_path?: string | null
          edge_functions?: string[]
          id?: string
          logical_owner?: string
          metadata?: Json
          module_key: string
          name: string
          primary_tables?: string[]
          produced_events?: string[]
          provided_capabilities?: string[]
          required_permissions?: string[]
          routes?: string[]
          rpc_functions?: string[]
          status?: string
          updated_at?: string
          version?: string
        }
        Update: {
          can_be_disabled?: boolean
          consumed_events?: string[]
          contract_version?: string
          created_at?: string
          created_by?: string | null
          dependencies?: string[]
          description?: string
          documentation_path?: string | null
          edge_functions?: string[]
          id?: string
          logical_owner?: string
          metadata?: Json
          module_key?: string
          name?: string
          primary_tables?: string[]
          produced_events?: string[]
          provided_capabilities?: string[]
          required_permissions?: string[]
          routes?: string[]
          rpc_functions?: string[]
          status?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      platform_feature_flag_history: {
        Row: {
          change_reason: string | null
          changed_by: string | null
          created_at: string
          flag_key: string
          id: string
          new_values: Json
          previous_values: Json
        }
        Insert: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          flag_key: string
          id?: string
          new_values?: Json
          previous_values?: Json
        }
        Update: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          flag_key?: string
          id?: string
          new_values?: Json
          previous_values?: Json
        }
        Relationships: []
      }
      platform_feature_flags: {
        Row: {
          allowed_roles: string[]
          allowed_user_ids: string[]
          created_at: string
          created_by: string | null
          description: string
          eligibility_rules: Json
          environment: string
          flag_key: string
          id: string
          metadata: Json
          module_key: string
          rollout_percent: number
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allowed_roles?: string[]
          allowed_user_ids?: string[]
          created_at?: string
          created_by?: string | null
          description: string
          eligibility_rules?: Json
          environment?: string
          flag_key: string
          id?: string
          metadata?: Json
          module_key: string
          rollout_percent?: number
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allowed_roles?: string[]
          allowed_user_ids?: string[]
          created_at?: string
          created_by?: string | null
          description?: string
          eligibility_rules?: Json
          environment?: string
          flag_key?: string
          id?: string
          metadata?: Json
          module_key?: string
          rollout_percent?: number
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_feature_flags_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "admin_platform_dependency_map"
            referencedColumns: ["module_key"]
          },
          {
            foreignKeyName: "platform_feature_flags_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "admin_platform_extension_modules"
            referencedColumns: ["module_key"]
          },
          {
            foreignKeyName: "platform_feature_flags_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "platform_extension_modules"
            referencedColumns: ["module_key"]
          },
        ]
      }
      platform_observability_alert_rules: {
        Row: {
          code: string
          component_filter: string | null
          condition_operator: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          metric_name: string
          name: string
          probable_causes: Json
          recommendations: Json
          severity: string
          threshold: number
          updated_at: string
          window_minutes: number
        }
        Insert: {
          code: string
          component_filter?: string | null
          condition_operator: string
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          metric_name: string
          name: string
          probable_causes?: Json
          recommendations?: Json
          severity?: string
          threshold: number
          updated_at?: string
          window_minutes?: number
        }
        Update: {
          code?: string
          component_filter?: string | null
          condition_operator?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          metric_name?: string
          name?: string
          probable_causes?: Json
          recommendations?: Json
          severity?: string
          threshold?: number
          updated_at?: string
          window_minutes?: number
        }
        Relationships: []
      }
      platform_observability_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_key: string
          component_name: string
          component_type: string
          created_at: string
          diagnosis: string
          evidence: Json
          id: string
          metric_name: string
          metric_value: number
          opened_at: string
          probable_causes: Json
          recommendations: Json
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          rule_id: string | null
          service_code: string
          service_id: string | null
          severity: string
          status: string
          threshold: number | null
          title: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_key: string
          component_name: string
          component_type: string
          created_at?: string
          diagnosis: string
          evidence?: Json
          id?: string
          metric_name: string
          metric_value?: number
          opened_at?: string
          probable_causes?: Json
          recommendations?: Json
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          rule_id?: string | null
          service_code: string
          service_id?: string | null
          severity?: string
          status?: string
          threshold?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_key?: string
          component_name?: string
          component_type?: string
          created_at?: string
          diagnosis?: string
          evidence?: Json
          id?: string
          metric_name?: string
          metric_value?: number
          opened_at?: string
          probable_causes?: Json
          recommendations?: Json
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          rule_id?: string | null
          service_code?: string
          service_id?: string | null
          severity?: string
          status?: string
          threshold?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_observability_alerts_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "platform_observability_alert_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_observability_alerts_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "admin_platform_observability_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_observability_alerts_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "platform_observability_services"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_observability_logs: {
        Row: {
          actor_id: string | null
          component_name: string
          component_type: string
          context: Json
          correlation_id: string | null
          created_at: string
          event_type: string
          id: string
          message: string
          service_code: string
          service_id: string | null
          severity: string
        }
        Insert: {
          actor_id?: string | null
          component_name: string
          component_type: string
          context?: Json
          correlation_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          message: string
          service_code: string
          service_id?: string | null
          severity?: string
        }
        Update: {
          actor_id?: string | null
          component_name?: string
          component_type?: string
          context?: Json
          correlation_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          message?: string
          service_code?: string
          service_id?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_observability_logs_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "admin_platform_observability_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_observability_logs_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "platform_observability_services"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_observability_metrics: {
        Row: {
          component_name: string
          component_type: string
          correlation_id: string | null
          created_at: string
          engine_version: string
          id: string
          metadata: Json
          metric_name: string
          metric_value: number
          observed_at: string
          service_code: string
          service_id: string | null
          severity: string
          status: string
          unit: string
        }
        Insert: {
          component_name: string
          component_type: string
          correlation_id?: string | null
          created_at?: string
          engine_version?: string
          id?: string
          metadata?: Json
          metric_name: string
          metric_value?: number
          observed_at?: string
          service_code: string
          service_id?: string | null
          severity?: string
          status?: string
          unit?: string
        }
        Update: {
          component_name?: string
          component_type?: string
          correlation_id?: string | null
          created_at?: string
          engine_version?: string
          id?: string
          metadata?: Json
          metric_name?: string
          metric_value?: number
          observed_at?: string
          service_code?: string
          service_id?: string | null
          severity?: string
          status?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_observability_metrics_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "admin_platform_observability_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_observability_metrics_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "platform_observability_services"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_observability_runs: {
        Row: {
          alerts_created: number
          created_at: string
          created_by: string | null
          duration_ms: number
          error_message: string | null
          errors_count: number
          finished_at: string | null
          id: string
          metrics_collected: number
          result_summary: Json
          scan_scope: Json
          started_at: string
          status: string
        }
        Insert: {
          alerts_created?: number
          created_at?: string
          created_by?: string | null
          duration_ms?: number
          error_message?: string | null
          errors_count?: number
          finished_at?: string | null
          id?: string
          metrics_collected?: number
          result_summary?: Json
          scan_scope?: Json
          started_at?: string
          status?: string
        }
        Update: {
          alerts_created?: number
          created_at?: string
          created_by?: string | null
          duration_ms?: number
          error_message?: string | null
          errors_count?: number
          finished_at?: string | null
          id?: string
          metrics_collected?: number
          result_summary?: Json
          scan_scope?: Json
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      platform_observability_services: {
        Row: {
          category: string
          code: string
          created_at: string
          description: string | null
          health_thresholds: Json
          id: string
          is_active: boolean
          metadata: Json
          name: string
          owner_module: string
          retention_days: number
          updated_at: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          description?: string | null
          health_thresholds?: Json
          id?: string
          is_active?: boolean
          metadata?: Json
          name: string
          owner_module: string
          retention_days?: number
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          description?: string | null
          health_thresholds?: Json
          id?: string
          is_active?: boolean
          metadata?: Json
          name?: string
          owner_module?: string
          retention_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      platform_rpc_contracts: {
        Row: {
          created_at: string
          documentation_path: string | null
          error_behavior: Json
          id: string
          idempotency: string
          logging_policy: string
          module_key: string
          parameters: Json
          purpose: string
          required_permissions: string[]
          return_contract: Json
          rpc_name: string
          status: string
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          documentation_path?: string | null
          error_behavior?: Json
          id?: string
          idempotency?: string
          logging_policy?: string
          module_key: string
          parameters?: Json
          purpose: string
          required_permissions?: string[]
          return_contract?: Json
          rpc_name: string
          status?: string
          updated_at?: string
          version?: string
        }
        Update: {
          created_at?: string
          documentation_path?: string | null
          error_behavior?: Json
          id?: string
          idempotency?: string
          logging_policy?: string
          module_key?: string
          parameters?: Json
          purpose?: string
          required_permissions?: string[]
          return_contract?: Json
          rpc_name?: string
          status?: string
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_rpc_contracts_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "admin_platform_dependency_map"
            referencedColumns: ["module_key"]
          },
          {
            foreignKeyName: "platform_rpc_contracts_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "admin_platform_extension_modules"
            referencedColumns: ["module_key"]
          },
          {
            foreignKeyName: "platform_rpc_contracts_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "platform_extension_modules"
            referencedColumns: ["module_key"]
          },
        ]
      }
      platform_scheduled_task_registry: {
        Row: {
          alert_policy: Json
          created_at: string
          description: string
          frequency: string
          id: string
          idempotency_policy: string
          invoked_function: string
          metrics: Json
          module_key: string
          retry_policy: Json
          status: string
          task_key: string
          timeout_ms: number
          updated_at: string
        }
        Insert: {
          alert_policy?: Json
          created_at?: string
          description: string
          frequency: string
          id?: string
          idempotency_policy?: string
          invoked_function: string
          metrics?: Json
          module_key: string
          retry_policy?: Json
          status?: string
          task_key: string
          timeout_ms?: number
          updated_at?: string
        }
        Update: {
          alert_policy?: Json
          created_at?: string
          description?: string
          frequency?: string
          id?: string
          idempotency_policy?: string
          invoked_function?: string
          metrics?: Json
          module_key?: string
          retry_policy?: Json
          status?: string
          task_key?: string
          timeout_ms?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_scheduled_task_registry_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "admin_platform_dependency_map"
            referencedColumns: ["module_key"]
          },
          {
            foreignKeyName: "platform_scheduled_task_registry_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "admin_platform_extension_modules"
            referencedColumns: ["module_key"]
          },
          {
            foreignKeyName: "platform_scheduled_task_registry_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "platform_extension_modules"
            referencedColumns: ["module_key"]
          },
        ]
      }
      pricing_config: {
        Row: {
          ambassador_percent: number
          created_at: string
          global_markup_percent: number
          id: string
          is_active: boolean
          platform_percent: number
          points_tiers: Json
          updated_at: string
        }
        Insert: {
          ambassador_percent?: number
          created_at?: string
          global_markup_percent?: number
          id?: string
          is_active?: boolean
          platform_percent?: number
          points_tiers?: Json
          updated_at?: string
        }
        Update: {
          ambassador_percent?: number
          created_at?: string
          global_markup_percent?: number
          id?: string
          is_active?: boolean
          platform_percent?: number
          points_tiers?: Json
          updated_at?: string
        }
        Relationships: []
      }
      product_affinities: {
        Row: {
          co_count: number
          id: string
          product_a: string
          product_b: string
          score: number
          updated_at: string
        }
        Insert: {
          co_count?: number
          id?: string
          product_a: string
          product_b: string
          score?: number
          updated_at?: string
        }
        Update: {
          co_count?: number
          id?: string
          product_a?: string
          product_b?: string
          score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_affinities_product_a_fkey"
            columns: ["product_a"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_affinities_product_a_fkey"
            columns: ["product_a"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_affinities_product_a_fkey"
            columns: ["product_a"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_affinities_product_a_fkey"
            columns: ["product_a"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_affinities_product_a_fkey"
            columns: ["product_a"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_affinities_product_b_fkey"
            columns: ["product_b"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_affinities_product_b_fkey"
            columns: ["product_b"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_affinities_product_b_fkey"
            columns: ["product_b"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_affinities_product_b_fkey"
            columns: ["product_b"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_affinities_product_b_fkey"
            columns: ["product_b"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_cost_import_batches: {
        Row: {
          applied_at: string | null
          created_at: string
          created_by: string | null
          id: string
          source_filename: string | null
          status: string
          summary: Json
        }
        Insert: {
          applied_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          source_filename?: string | null
          status?: string
          summary?: Json
        }
        Update: {
          applied_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          source_filename?: string | null
          status?: string
          summary?: Json
        }
        Relationships: []
      }
      product_cost_import_rows: {
        Row: {
          applied_at: string | null
          autres_frais: number
          batch_id: string
          commentaire: string | null
          created_at: string
          current_purchase_price: number | null
          date_effet: string | null
          devise: string | null
          estimated_margin: number | null
          fournisseur: string | null
          frais_douane: number
          frais_transport: number
          id: string
          landed_purchase_price: number | null
          line_number: number
          nom_produit: string | null
          prix_achat: number | null
          product_id: string | null
          product_name: string | null
          recent_revenue: number
          recent_sales_count: number
          rejection_reasons: string[]
          sale_price: number | null
          sku: string | null
          status: string
          stock_quantity: number | null
          warnings: string[]
        }
        Insert: {
          applied_at?: string | null
          autres_frais?: number
          batch_id: string
          commentaire?: string | null
          created_at?: string
          current_purchase_price?: number | null
          date_effet?: string | null
          devise?: string | null
          estimated_margin?: number | null
          fournisseur?: string | null
          frais_douane?: number
          frais_transport?: number
          id?: string
          landed_purchase_price?: number | null
          line_number: number
          nom_produit?: string | null
          prix_achat?: number | null
          product_id?: string | null
          product_name?: string | null
          recent_revenue?: number
          recent_sales_count?: number
          rejection_reasons?: string[]
          sale_price?: number | null
          sku?: string | null
          status: string
          stock_quantity?: number | null
          warnings?: string[]
        }
        Update: {
          applied_at?: string | null
          autres_frais?: number
          batch_id?: string
          commentaire?: string | null
          created_at?: string
          current_purchase_price?: number | null
          date_effet?: string | null
          devise?: string | null
          estimated_margin?: number | null
          fournisseur?: string | null
          frais_douane?: number
          frais_transport?: number
          id?: string
          landed_purchase_price?: number | null
          line_number?: number
          nom_produit?: string | null
          prix_achat?: number | null
          product_id?: string | null
          product_name?: string | null
          recent_revenue?: number
          recent_sales_count?: number
          rejection_reasons?: string[]
          sale_price?: number | null
          sku?: string | null
          status?: string
          stock_quantity?: number | null
          warnings?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "product_cost_import_rows_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "product_cost_import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      product_image_history: {
        Row: {
          batch_id: string | null
          created_at: string
          id: string
          new_image_url: string
          previous_image_url: string | null
          product_id: string
          replaced_by: string | null
          source: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          id?: string
          new_image_url: string
          previous_image_url?: string | null
          product_id: string
          replaced_by?: string | null
          source?: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          id?: string
          new_image_url?: string
          previous_image_url?: string | null
          product_id?: string
          replaced_by?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_image_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_image_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_image_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_image_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_image_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_image_history_replaced_by_fkey"
            columns: ["replaced_by"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      product_moderations: {
        Row: {
          analyzed_image_url: string | null
          compliance_ok: boolean
          counterfeit_risk: number
          created_at: string
          id: string
          issues: Json
          model_used: string | null
          product_id: string
          quality_score: number
          reviewed_by: string | null
          suggestions: Json
          summary: string | null
          verdict: Database["public"]["Enums"]["product_moderation_verdict"]
        }
        Insert: {
          analyzed_image_url?: string | null
          compliance_ok?: boolean
          counterfeit_risk?: number
          created_at?: string
          id?: string
          issues?: Json
          model_used?: string | null
          product_id: string
          quality_score?: number
          reviewed_by?: string | null
          suggestions?: Json
          summary?: string | null
          verdict?: Database["public"]["Enums"]["product_moderation_verdict"]
        }
        Update: {
          analyzed_image_url?: string | null
          compliance_ok?: boolean
          counterfeit_risk?: number
          created_at?: string
          id?: string
          issues?: Json
          model_used?: string | null
          product_id?: string
          quality_score?: number
          reviewed_by?: string | null
          suggestions?: Json
          summary?: string | null
          verdict?: Database["public"]["Enums"]["product_moderation_verdict"]
        }
        Relationships: []
      }
      product_packaging_options: {
        Row: {
          bottle_quantity: number
          calculated_savings: number | null
          calculated_unit_price: number | null
          created_at: string
          created_by: string | null
          discount_percent: number | null
          discount_tiers: Json
          id: string
          is_active: boolean
          packaging_label: string
          packaging_type: string
          pricing_mode: string
          product_id: string
          show_discount: boolean
          sku: string | null
          stock_quantity: number | null
          total_price: number
          updated_at: string
          updated_by: string | null
          weight_kg: number | null
        }
        Insert: {
          bottle_quantity: number
          calculated_savings?: number | null
          calculated_unit_price?: number | null
          created_at?: string
          created_by?: string | null
          discount_percent?: number | null
          discount_tiers?: Json
          id?: string
          is_active?: boolean
          packaging_label: string
          packaging_type: string
          pricing_mode?: string
          product_id: string
          show_discount?: boolean
          sku?: string | null
          stock_quantity?: number | null
          total_price: number
          updated_at?: string
          updated_by?: string | null
          weight_kg?: number | null
        }
        Update: {
          bottle_quantity?: number
          calculated_savings?: number | null
          calculated_unit_price?: number | null
          created_at?: string
          created_by?: string | null
          discount_percent?: number | null
          discount_tiers?: Json
          id?: string
          is_active?: boolean
          packaging_label?: string
          packaging_type?: string
          pricing_mode?: string
          product_id?: string
          show_discount?: boolean
          sku?: string | null
          stock_quantity?: number | null
          total_price?: number
          updated_at?: string
          updated_by?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_packaging_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_packaging_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_packaging_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_packaging_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_packaging_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          alcohol_percentage: number | null
          available_as_case: boolean
          average_rating: number | null
          case_price: number | null
          category_id: string | null
          created_at: string | null
          description: string | null
          embedding: string | null
          embedding_source: string | null
          embedding_updated_at: string | null
          food_pairing: string | null
          gallery_urls: string[] | null
          grape_variety: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          low_stock_threshold: number | null
          markup_percent_override: number | null
          moderation_status: Database["public"]["Enums"]["product_moderation_status"]
          name: string
          origin_country: string | null
          original_price: number | null
          points_override: number | null
          points_tiers_override: Json | null
          price: number
          purchase_price: number | null
          region: string | null
          review_count: number | null
          serving_temperature: string | null
          short_description: string | null
          sku: string | null
          slug: string
          stock_quantity: number | null
          tasting_notes: string | null
          units_per_case: number | null
          updated_at: string | null
          vendor_id: string | null
          vintage_year: number | null
          volume_ml: number | null
        }
        Insert: {
          alcohol_percentage?: number | null
          available_as_case?: boolean
          average_rating?: number | null
          case_price?: number | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          embedding?: string | null
          embedding_source?: string | null
          embedding_updated_at?: string | null
          food_pairing?: string | null
          gallery_urls?: string[] | null
          grape_variety?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          low_stock_threshold?: number | null
          markup_percent_override?: number | null
          moderation_status?: Database["public"]["Enums"]["product_moderation_status"]
          name: string
          origin_country?: string | null
          original_price?: number | null
          points_override?: number | null
          points_tiers_override?: Json | null
          price: number
          purchase_price?: number | null
          region?: string | null
          review_count?: number | null
          serving_temperature?: string | null
          short_description?: string | null
          sku?: string | null
          slug: string
          stock_quantity?: number | null
          tasting_notes?: string | null
          units_per_case?: number | null
          updated_at?: string | null
          vendor_id?: string | null
          vintage_year?: number | null
          volume_ml?: number | null
        }
        Update: {
          alcohol_percentage?: number | null
          available_as_case?: boolean
          average_rating?: number | null
          case_price?: number | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          embedding?: string | null
          embedding_source?: string | null
          embedding_updated_at?: string | null
          food_pairing?: string | null
          gallery_urls?: string[] | null
          grape_variety?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          low_stock_threshold?: number | null
          markup_percent_override?: number | null
          moderation_status?: Database["public"]["Enums"]["product_moderation_status"]
          name?: string
          origin_country?: string | null
          original_price?: number | null
          points_override?: number | null
          points_tiers_override?: Json | null
          price?: number
          purchase_price?: number | null
          region?: string | null
          review_count?: number | null
          serving_temperature?: string | null
          short_description?: string | null
          sku?: string | null
          slug?: string
          stock_quantity?: number | null
          tasting_notes?: string | null
          units_per_case?: number | null
          updated_at?: string | null
          vendor_id?: string | null
          vintage_year?: number | null
          volume_ml?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          first_name: string | null
          id: string
          is_age_verified: boolean | null
          last_name: string | null
          phone: string | null
          preferred_language: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          is_age_verified?: boolean | null
          last_name?: string | null
          phone?: string | null
          preferred_language?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_age_verified?: boolean | null
          last_name?: string | null
          phone?: string | null
          preferred_language?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          allow_negative_margin: boolean
          code: string
          created_at: string | null
          description: string | null
          discount_type: string
          discount_value: number
          eligible_category_ids: string[] | null
          eligible_product_ids: string[] | null
          eligible_user_ids: string[] | null
          first_order_only: boolean
          id: string
          incompatible_coupon_ids: string[] | null
          is_active: boolean | null
          max_discount_amount: number | null
          max_discount_percent: number | null
          max_uses_per_order: number
          max_uses_per_user: number | null
          metadata: Json
          min_margin_after_discount: number | null
          min_order_amount: number | null
          stackable: boolean
          usage_limit: number | null
          used_count: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          allow_negative_margin?: boolean
          code: string
          created_at?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          eligible_category_ids?: string[] | null
          eligible_product_ids?: string[] | null
          eligible_user_ids?: string[] | null
          first_order_only?: boolean
          id?: string
          incompatible_coupon_ids?: string[] | null
          is_active?: boolean | null
          max_discount_amount?: number | null
          max_discount_percent?: number | null
          max_uses_per_order?: number
          max_uses_per_user?: number | null
          metadata?: Json
          min_margin_after_discount?: number | null
          min_order_amount?: number | null
          stackable?: boolean
          usage_limit?: number | null
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          allow_negative_margin?: boolean
          code?: string
          created_at?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          eligible_category_ids?: string[] | null
          eligible_product_ids?: string[] | null
          eligible_user_ids?: string[] | null
          first_order_only?: boolean
          id?: string
          incompatible_coupon_ids?: string[] | null
          is_active?: boolean | null
          max_discount_amount?: number | null
          max_discount_percent?: number | null
          max_uses_per_order?: number
          max_uses_per_user?: number | null
          metadata?: Json
          min_margin_after_discount?: number | null
          min_order_amount?: number | null
          stackable?: boolean
          usage_limit?: number | null
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      promo_redemptions: {
        Row: {
          code: string
          discount_amount: number
          guest_email: string | null
          guest_identity_hash: string | null
          guest_phone: string | null
          id: string
          metadata: Json
          order_id: string | null
          order_subtotal: number
          promo_code_id: string
          redeemed_at: string
          user_id: string | null
        }
        Insert: {
          code: string
          discount_amount?: number
          guest_email?: string | null
          guest_identity_hash?: string | null
          guest_phone?: string | null
          id?: string
          metadata?: Json
          order_id?: string | null
          order_subtotal?: number
          promo_code_id: string
          redeemed_at?: string
          user_id?: string | null
        }
        Update: {
          code?: string
          discount_amount?: number
          guest_email?: string | null
          guest_identity_hash?: string | null
          guest_phone?: string | null
          id?: string
          metadata?: Json
          order_id?: string | null
          order_subtotal?: number
          promo_code_id?: string
          redeemed_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "admin_finance_overview"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "promo_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_redemptions_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          is_active: boolean | null
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          is_active?: boolean | null
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          is_active?: boolean | null
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quote_requests: {
        Row: {
          admin_notes: string | null
          city: string
          client_email: string
          client_name: string
          client_phone: string
          company_name: string | null
          created_at: string | null
          id: string
          message: string | null
          niu: string | null
          packaging_type: string
          processed_at: string | null
          processed_by: string | null
          product_id: string | null
          product_name: string
          quantity: number
          status: string
          total_price: number
          unit_price: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          city: string
          client_email: string
          client_name: string
          client_phone: string
          company_name?: string | null
          created_at?: string | null
          id?: string
          message?: string | null
          niu?: string | null
          packaging_type: string
          processed_at?: string | null
          processed_by?: string | null
          product_id?: string | null
          product_name: string
          quantity?: number
          status?: string
          total_price: number
          unit_price: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          city?: string
          client_email?: string
          client_name?: string
          client_phone?: string
          company_name?: string | null
          created_at?: string | null
          id?: string
          message?: string | null
          niu?: string | null
          packaging_type?: string
          processed_at?: string | null
          processed_by?: string | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          status?: string
          total_price?: number
          unit_price?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "quote_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "quote_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
      rank_config: {
        Row: {
          badge_color: string | null
          benefits: string[] | null
          bonus_percentage: number | null
          created_at: string | null
          display_name: string
          id: string
          max_active_referrals: number | null
          min_active_referrals: number
          rank: Database["public"]["Enums"]["ambassador_rank"]
        }
        Insert: {
          badge_color?: string | null
          benefits?: string[] | null
          bonus_percentage?: number | null
          created_at?: string | null
          display_name: string
          id?: string
          max_active_referrals?: number | null
          min_active_referrals: number
          rank: Database["public"]["Enums"]["ambassador_rank"]
        }
        Update: {
          badge_color?: string | null
          benefits?: string[] | null
          bonus_percentage?: number | null
          created_at?: string | null
          display_name?: string
          id?: string
          max_active_referrals?: number | null
          min_active_referrals?: number
          rank?: Database["public"]["Enums"]["ambassador_rank"]
        }
        Relationships: []
      }
      recently_viewed: {
        Row: {
          id: string
          product_id: string
          user_id: string
          view_count: number | null
          viewed_at: string
        }
        Insert: {
          id?: string
          product_id: string
          user_id: string
          view_count?: number | null
          viewed_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          user_id?: string
          view_count?: number | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recently_viewed_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "recently_viewed_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "recently_viewed_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recently_viewed_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recently_viewed_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string | null
          custom_code: string | null
          id: string
          is_active: boolean | null
          total_clicks: number | null
          total_orders: number | null
          total_revenue: number | null
          total_signups: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          custom_code?: string | null
          id?: string
          is_active?: boolean | null
          total_clicks?: number | null
          total_orders?: number | null
          total_revenue?: number | null
          total_signups?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string | null
          custom_code?: string | null
          id?: string
          is_active?: boolean | null
          total_clicks?: number | null
          total_orders?: number | null
          total_revenue?: number | null
          total_signups?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      referral_relationships: {
        Row: {
          created_at: string | null
          id: string
          level: number
          referral_code_used: string | null
          referred_id: string
          referrer_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          level?: number
          referral_code_used?: string | null
          referred_id: string
          referrer_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          level?: number
          referral_code_used?: string | null
          referred_id?: string
          referrer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_relationships_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "referral_relationships_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      report_history: {
        Row: {
          critical_stock_count: number
          email_id: string | null
          error_message: string | null
          id: string
          low_stock_count: number
          out_of_stock_count: number
          recipients: string[]
          report_type: string
          send_status: string
          sent_at: string
          total_alerts_count: number
          trend_percentage: number | null
        }
        Insert: {
          critical_stock_count?: number
          email_id?: string | null
          error_message?: string | null
          id?: string
          low_stock_count?: number
          out_of_stock_count?: number
          recipients?: string[]
          report_type?: string
          send_status?: string
          sent_at?: string
          total_alerts_count?: number
          trend_percentage?: number | null
        }
        Update: {
          critical_stock_count?: number
          email_id?: string | null
          error_message?: string | null
          id?: string
          low_stock_count?: number
          out_of_stock_count?: number
          recipients?: string[]
          report_type?: string
          send_status?: string
          sent_at?: string
          total_alerts_count?: number
          trend_percentage?: number | null
        }
        Relationships: []
      }
      report_schedule_config: {
        Row: {
          created_at: string | null
          cron_expression: string
          day_of_week: string | null
          frequency: string
          hour: number
          id: string
          is_active: boolean
          recipient_emails: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          cron_expression?: string
          day_of_week?: string | null
          frequency?: string
          hour?: number
          id?: string
          is_active?: boolean
          recipient_emails?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          cron_expression?: string
          day_of_week?: string | null
          frequency?: string
          hour?: number
          id?: string
          is_active?: boolean
          recipient_emails?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      retention_campaigns: {
        Row: {
          channel: string
          created_at: string
          created_by: string | null
          cta_label: string | null
          cta_url: string | null
          description: string | null
          id: string
          is_active: boolean
          last_run_at: string | null
          message: string
          name: string
          scheduled_at: string | null
          subject: string | null
          target_segment: string
          updated_at: string
        }
        Insert: {
          channel?: string
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          message: string
          name: string
          scheduled_at?: string | null
          subject?: string | null
          target_segment: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          message?: string
          name?: string
          scheduled_at?: string | null
          subject?: string | null
          target_segment?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "retention_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      revenue_engine_snapshots: {
        Row: {
          accounting_snapshot_id: string | null
          calculation_details: Json
          commission_pool_available: number
          confidence: number
          contribution_margin: number
          created_at: string
          created_by: string | null
          currency: string
          decision: string
          delivery_fee_charged: number
          delivery_fee_estimated_cost: number
          discount_amount: number
          gross_margin: number
          id: string
          is_commissionable: boolean
          min_margin_rate: number
          missing_cost_count: number
          mode: string
          operational_fee_estimate: number
          order_id: string
          order_number: string
          packaging_fee: number
          payment_provider_fee: number
          platform_minimum_profit: number
          product_cost_total: number
          rejection_reasons: Json
          revenue_amount: number
          risk_reserve_amount: number
          rules_version: string
          user_id: string | null
          warnings: Json
        }
        Insert: {
          accounting_snapshot_id?: string | null
          calculation_details?: Json
          commission_pool_available?: number
          confidence?: number
          contribution_margin?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          decision?: string
          delivery_fee_charged?: number
          delivery_fee_estimated_cost?: number
          discount_amount?: number
          gross_margin?: number
          id?: string
          is_commissionable?: boolean
          min_margin_rate?: number
          missing_cost_count?: number
          mode?: string
          operational_fee_estimate?: number
          order_id: string
          order_number: string
          packaging_fee?: number
          payment_provider_fee?: number
          platform_minimum_profit?: number
          product_cost_total?: number
          rejection_reasons?: Json
          revenue_amount?: number
          risk_reserve_amount?: number
          rules_version?: string
          user_id?: string | null
          warnings?: Json
        }
        Update: {
          accounting_snapshot_id?: string | null
          calculation_details?: Json
          commission_pool_available?: number
          confidence?: number
          contribution_margin?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          decision?: string
          delivery_fee_charged?: number
          delivery_fee_estimated_cost?: number
          discount_amount?: number
          gross_margin?: number
          id?: string
          is_commissionable?: boolean
          min_margin_rate?: number
          missing_cost_count?: number
          mode?: string
          operational_fee_estimate?: number
          order_id?: string
          order_number?: string
          packaging_fee?: number
          payment_provider_fee?: number
          platform_minimum_profit?: number
          product_cost_total?: number
          rejection_reasons?: Json
          revenue_amount?: number
          risk_reserve_amount?: number
          rules_version?: string
          user_id?: string | null
          warnings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "revenue_engine_snapshots_accounting_snapshot_id_fkey"
            columns: ["accounting_snapshot_id"]
            isOneToOne: false
            referencedRelation: "admin_accounting_anomalies"
            referencedColumns: ["snapshot_id"]
          },
          {
            foreignKeyName: "revenue_engine_snapshots_accounting_snapshot_id_fkey"
            columns: ["accounting_snapshot_id"]
            isOneToOne: false
            referencedRelation: "admin_accounting_report"
            referencedColumns: ["snapshot_id"]
          },
          {
            foreignKeyName: "revenue_engine_snapshots_accounting_snapshot_id_fkey"
            columns: ["accounting_snapshot_id"]
            isOneToOne: false
            referencedRelation: "order_accounting_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_engine_snapshots_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "admin_finance_overview"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "revenue_engine_snapshots_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          is_approved: boolean | null
          is_verified_purchase: boolean | null
          product_id: string
          rating: number
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          is_approved?: boolean | null
          is_verified_purchase?: boolean | null
          product_id: string
          rating: number
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          is_approved?: boolean | null
          is_verified_purchase?: boolean | null
          product_id?: string
          rating?: number
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      shareable_assets: {
        Row: {
          asset_type: string
          created_at: string
          description: string | null
          display_order: number | null
          download_count: number | null
          id: string
          image_url: string
          is_active: boolean | null
          platform: string
          thumbnail_url: string | null
          title: string
        }
        Insert: {
          asset_type: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          download_count?: number | null
          id?: string
          image_url: string
          is_active?: boolean | null
          platform: string
          thumbnail_url?: string | null
          title: string
        }
        Update: {
          asset_type?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          download_count?: number | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          platform?: string
          thumbnail_url?: string | null
          title?: string
        }
        Relationships: []
      }
      stock_alerts_history: {
        Row: {
          alert_type: string
          email_sent_to: string | null
          email_status: string | null
          id: string
          product_id: string | null
          product_name: string
          product_sku: string | null
          sent_at: string
          stock_quantity: number
          threshold: number
        }
        Insert: {
          alert_type?: string
          email_sent_to?: string | null
          email_status?: string | null
          id?: string
          product_id?: string | null
          product_name: string
          product_sku?: string | null
          sent_at?: string
          stock_quantity: number
          threshold: number
        }
        Update: {
          alert_type?: string
          email_sent_to?: string | null
          email_status?: string | null
          id?: string
          product_id?: string | null
          product_name?: string
          product_sku?: string | null
          sent_at?: string
          stock_quantity?: number
          threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_alerts_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_alerts_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_alerts_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_alerts_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_alerts_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_scores: {
        Row: {
          breakdown: Json
          computed_at: string
          id: string
          negative_count: number
          positive_count: number
          score: number
          subject_id: string
          subject_type: Database["public"]["Enums"]["trust_subject_type"]
          tier: string
        }
        Insert: {
          breakdown?: Json
          computed_at?: string
          id?: string
          negative_count?: number
          positive_count?: number
          score?: number
          subject_id: string
          subject_type: Database["public"]["Enums"]["trust_subject_type"]
          tier?: string
        }
        Update: {
          breakdown?: Json
          computed_at?: string
          id?: string
          negative_count?: number
          positive_count?: number
          score?: number
          subject_id?: string
          subject_type?: Database["public"]["Enums"]["trust_subject_type"]
          tier?: string
        }
        Relationships: []
      }
      trust_signals: {
        Row: {
          id: number
          metadata: Json
          occurred_at: string
          polarity: number
          signal_type: string
          source: string | null
          subject_id: string
          subject_type: Database["public"]["Enums"]["trust_subject_type"]
          weight: number
        }
        Insert: {
          id?: number
          metadata?: Json
          occurred_at?: string
          polarity?: number
          signal_type: string
          source?: string | null
          subject_id: string
          subject_type: Database["public"]["Enums"]["trust_subject_type"]
          weight?: number
        }
        Update: {
          id?: number
          metadata?: Json
          occurred_at?: string
          polarity?: number
          signal_type?: string
          source?: string | null
          subject_id?: string
          subject_type?: Database["public"]["Enums"]["trust_subject_type"]
          weight?: number
        }
        Relationships: []
      }
      user_loyalty: {
        Row: {
          created_at: string | null
          id: string
          lifetime_points: number | null
          tier: string | null
          total_points: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          lifetime_points?: number | null
          tier?: string | null
          total_points?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          lifetime_points?: number | null
          tier?: string | null
          total_points?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_ranks: {
        Row: {
          active_referrals_count: number | null
          current_rank: Database["public"]["Enums"]["ambassador_rank"] | null
          id: string
          rank_achieved_at: string | null
          total_referrals_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active_referrals_count?: number | null
          current_rank?: Database["public"]["Enums"]["ambassador_rank"] | null
          id?: string
          rank_achieved_at?: string | null
          total_referrals_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active_referrals_count?: number | null
          current_rank?: Database["public"]["Enums"]["ambassador_rank"] | null
          id?: string
          rank_achieved_at?: string | null
          total_referrals_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_ranks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      user_recommendations: {
        Row: {
          computed_at: string
          id: string
          product_id: string
          reason: string
          score: number
          user_id: string
        }
        Insert: {
          computed_at?: string
          id?: string
          product_id: string
          reason?: string
          score?: number
          user_id: string
        }
        Update: {
          computed_at?: string
          id?: string
          product_id?: string
          reason?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "user_recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "user_recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_recommendations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      vendor_shops: {
        Row: {
          banner_url: string | null
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_verified: boolean
          logo_url: string | null
          name: string
          owner_id: string
          slug: string
          total_sales: number
          trust_score: number
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_verified?: boolean
          logo_url?: string | null
          name: string
          owner_id: string
          slug: string
          total_sales?: number
          trust_score?: number
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_verified?: boolean
          logo_url?: string | null
          name?: string
          owner_id?: string
          slug?: string
          total_sales?: number
          trust_score?: number
          updated_at?: string
        }
        Relationships: []
      }
      visual_searches: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          match_count: number | null
          user_id: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          match_count?: number | null
          user_id?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          match_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      wallet_ledger: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          currency: string
          entry_type: string
          id: number
          metadata: Json
          reason: string
          reference_id: string | null
          reference_type: string | null
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          currency?: string
          entry_type: string
          id?: number
          metadata?: Json
          reason: string
          reference_id?: string | null
          reference_type?: string | null
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          currency?: string
          entry_type?: string
          id?: number
          metadata?: Json
          reason?: string
          reference_id?: string | null
          reference_type?: string | null
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "wallet_ledger_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string | null
          description: string | null
          id: string
          reference_id: string | null
          reference_type: string | null
          type: Database["public"]["Enums"]["wallet_transaction_type"]
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          type: Database["public"]["Enums"]["wallet_transaction_type"]
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          type?: Database["public"]["Enums"]["wallet_transaction_type"]
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number | null
          created_at: string | null
          id: string
          pending_balance: number | null
          pending_withdrawal_balance: number
          total_earned: number | null
          total_store_credit: number | null
          total_withdrawn: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          id?: string
          pending_balance?: number | null
          pending_withdrawal_balance?: number
          total_earned?: number | null
          total_store_credit?: number | null
          total_withdrawn?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          id?: string
          pending_balance?: number | null
          pending_withdrawal_balance?: number
          total_earned?: number | null
          total_store_credit?: number | null
          total_withdrawn?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      wholesale_invoices: {
        Row: {
          amount_ht: number
          amount_paid: number
          amount_ttc: number
          amount_tva: number
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          invoice_number: string
          issued_at: string
          notes: string | null
          payment_terms: string
          quote_id: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          tva_rate: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_ht: number
          amount_paid?: number
          amount_ttc: number
          amount_tva?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          issued_at?: string
          notes?: string | null
          payment_terms?: string
          quote_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          tva_rate?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_ht?: number
          amount_paid?: number
          amount_ttc?: number
          amount_tva?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          issued_at?: string
          notes?: string | null
          payment_terms?: string
          quote_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          tva_rate?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wholesale_invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "wholesale_invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wholesale_invoices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      wholesale_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          notes: string | null
          paid_at: string
          payment_method: string
          recorded_by: string | null
          reference: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          notes?: string | null
          paid_at?: string
          payment_method?: string
          recorded_by?: string | null
          reference?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          notes?: string | null
          paid_at?: string
          payment_method?: string
          recorded_by?: string | null
          reference?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wholesale_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "wholesale_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wholesale_payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "wholesale_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      wholesale_pricing: {
        Row: {
          created_at: string | null
          custom_price: number | null
          discount_percentage: number
          id: string
          is_active: boolean | null
          packaging_type: string
          product_id: string
          quantity: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custom_price?: number | null
          discount_percentage?: number
          id?: string
          is_active?: boolean | null
          packaging_type: string
          product_id: string
          quantity: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custom_price?: number | null
          discount_percentage?: number
          id?: string
          is_active?: boolean | null
          packaging_type?: string
          product_id?: string
          quantity?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wholesale_pricing_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "wholesale_pricing_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "wholesale_pricing_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wholesale_pricing_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wholesale_pricing_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
      wholesale_tier_config: {
        Row: {
          card_tiers: string[]
          discount_overrides: Json
          enabled: boolean
          id: string
          labels: Json
          tva_rate: number
          updated_at: string | null
          visible_tiers: string[]
        }
        Insert: {
          card_tiers?: string[]
          discount_overrides?: Json
          enabled?: boolean
          id?: string
          labels?: Json
          tva_rate?: number
          updated_at?: string | null
          visible_tiers?: string[]
        }
        Update: {
          card_tiers?: string[]
          discount_overrides?: Json
          enabled?: boolean
          id?: string
          labels?: Json
          tva_rate?: number
          updated_at?: string | null
          visible_tiers?: string[]
        }
        Relationships: []
      }
      wholesaler_applications: {
        Row: {
          admin_notes: string | null
          business_type: string
          city: string
          company_name: string
          contact_email: string | null
          contact_phone: string
          created_at: string
          estimated_monthly_volume: number | null
          id: string
          message: string | null
          niu: string | null
          processed_at: string | null
          processed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          business_type?: string
          city: string
          company_name: string
          contact_email?: string | null
          contact_phone: string
          created_at?: string
          estimated_monthly_volume?: number | null
          id?: string
          message?: string | null
          niu?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          business_type?: string
          city?: string
          company_name?: string
          contact_email?: string | null
          contact_phone?: string
          created_at?: string
          estimated_monthly_volume?: number | null
          id?: string
          message?: string | null
          niu?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wholesaler_applications_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "wholesaler_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      wholesaler_profiles: {
        Row: {
          address: string | null
          business_type: string
          city: string | null
          company_name: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          credit_limit: number
          id: string
          is_active: boolean
          niu: string | null
          payment_terms: string | null
          total_orders: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          business_type?: string
          city?: string | null
          company_name: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          credit_limit?: number
          id?: string
          is_active?: boolean
          niu?: string | null
          payment_terms?: string | null
          total_orders?: number
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          business_type?: string
          city?: string | null
          company_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          credit_limit?: number
          id?: string
          is_active?: boolean
          niu?: string | null
          payment_terms?: string | null
          total_orders?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wholesaler_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      wishlist: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      withdrawal_requests: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          phone_number: string
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["withdrawal_status"] | null
          transaction_reference: string | null
          updated_at: string | null
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          phone_number: string
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"] | null
          transaction_reference?: string | null
          updated_at?: string | null
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          phone_number?: string
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"] | null
          transaction_reference?: string | null
          updated_at?: string | null
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          actions_run: number
          duration_ms: number | null
          error: string | null
          event_id: number | null
          event_type: string | null
          executed_at: string
          id: number
          result: Json | null
          rule_id: string | null
          rule_name: string | null
          status: string
        }
        Insert: {
          actions_run?: number
          duration_ms?: number | null
          error?: string | null
          event_id?: number | null
          event_type?: string | null
          executed_at?: string
          id?: number
          result?: Json | null
          rule_id?: string | null
          rule_name?: string | null
          status: string
        }
        Update: {
          actions_run?: number
          duration_ms?: number | null
          error?: string | null
          event_id?: number | null
          event_type?: string | null
          executed_at?: string
          id?: number
          result?: Json | null
          rule_id?: string | null
          rule_name?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "domain_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "workflow_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_rules: {
        Row: {
          actions: Json
          conditions: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          last_run_at: string | null
          name: string
          priority: number
          run_count: number
          trigger_event: string
          updated_at: string
        }
        Insert: {
          actions?: Json
          conditions?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name: string
          priority?: number
          run_count?: number
          trigger_event: string
          updated_at?: string
        }
        Update: {
          actions?: Json
          conditions?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name?: string
          priority?: number
          run_count?: number
          trigger_event?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      active_product_packaging_options: {
        Row: {
          bottle_quantity: number | null
          calculated_savings: number | null
          calculated_unit_price: number | null
          created_at: string | null
          discount_percent: number | null
          discount_tiers: Json | null
          id: string | null
          is_active: boolean | null
          packaging_label: string | null
          packaging_type: string | null
          pricing_mode: string | null
          product_id: string | null
          show_discount: boolean | null
          sku: string | null
          stock_quantity: number | null
          total_price: number | null
          updated_at: string | null
          weight_kg: number | null
        }
        Insert: {
          bottle_quantity?: number | null
          calculated_savings?: number | null
          calculated_unit_price?: number | null
          created_at?: string | null
          discount_percent?: number | null
          discount_tiers?: Json | null
          id?: string | null
          is_active?: boolean | null
          packaging_label?: string | null
          packaging_type?: string | null
          pricing_mode?: string | null
          product_id?: string | null
          show_discount?: boolean | null
          sku?: string | null
          stock_quantity?: number | null
          total_price?: number | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Update: {
          bottle_quantity?: number | null
          calculated_savings?: number | null
          calculated_unit_price?: number | null
          created_at?: string | null
          discount_percent?: number | null
          discount_tiers?: Json | null
          id?: string | null
          is_active?: boolean | null
          packaging_label?: string | null
          packaging_type?: string | null
          pricing_mode?: string | null
          product_id?: string | null
          show_discount?: boolean | null
          sku?: string | null
          stock_quantity?: number | null
          total_price?: number | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_packaging_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_packaging_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_packaging_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_packaging_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_packaging_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_2fa_status: {
        Row: {
          created_at: string | null
          has_backup_codes: boolean | null
          id: string | null
          is_enabled: boolean | null
          last_verified_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          has_backup_codes?: never
          id?: string | null
          is_enabled?: boolean | null
          last_verified_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          has_backup_codes?: never
          id?: string | null
          is_enabled?: boolean | null
          last_verified_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_2fa_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      admin_academy_report: {
        Row: {
          average_score: number | null
          completed_users: number | null
          completion_rate: number | null
          course_id: string | null
          course_type: string | null
          enrolled_users: number | null
          failed_users: number | null
          level: string | null
          title: string | null
        }
        Relationships: []
      }
      admin_accounting_anomalies: {
        Row: {
          amount_including_tax: number | null
          anomaly_codes: string[] | null
          anomaly_status: string | null
          cost_missing_count: number | null
          cost_missing_sales_total: number | null
          estimated_net_margin: number | null
          order_created_at: string | null
          order_created_ledger_amount: number | null
          order_created_ledger_entries: number | null
          order_id: string | null
          order_number: string | null
          order_status: Database["public"]["Enums"]["order_status"] | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          product_cost_total: number | null
          refund_ledger_amount: number | null
          refund_ledger_entries: number | null
          snapshot_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_accounting_snapshots_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "admin_finance_overview"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_accounting_snapshots_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_accounting_report: {
        Row: {
          amount_excluding_tax: number | null
          amount_including_tax: number | null
          completed_withdrawals: number | null
          currency: string | null
          delivery_fee: number | null
          discount_amount: number | null
          estimated_net_margin: number | null
          gross_margin: number | null
          gross_sales: number | null
          mlm_commissions: number | null
          order_created_at: string | null
          order_id: string | null
          order_number: string | null
          order_status: Database["public"]["Enums"]["order_status"] | null
          paid_sales: number | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_provider_fee: number | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          pending_sales: number | null
          pending_withdrawals: number | null
          product_cost_total: number | null
          refunded_amount: number | null
          service_fee: number | null
          shipping_city: string | null
          snapshot_created_at: string | null
          snapshot_id: string | null
          tax_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_accounting_snapshots_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "admin_finance_overview"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_accounting_snapshots_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_ai_goals_effectiveness_report: {
        Row: {
          assignments_total: number | null
          average_progress_percent: number | null
          cadence: string | null
          code: string | null
          completed_total: number | null
          difficulty: string | null
          goal_type: string | null
          is_active: boolean | null
          last_assigned_at: string | null
          not_completed_total: number | null
          open_total: number | null
          priority: string | null
          template_id: string | null
          title: string | null
        }
        Relationships: []
      }
      admin_api_gateway_endpoints: {
        Row: {
          auth_modes: string[] | null
          capability_key: string | null
          capability_name: string | null
          created_at: string | null
          created_by: string | null
          deprecation_notice: string | null
          documentation: Json | null
          endpoint_key: string | null
          http_method: string | null
          id: string | null
          module_key: string | null
          module_name: string | null
          observability_policy: Json | null
          path: string | null
          rate_limit_policy: Json | null
          request_schema: Json | null
          required_permissions: string[] | null
          required_roles: string[] | null
          response_schema: Json | null
          route_type: string | null
          status: string | null
          target_name: string | null
          updated_at: string | null
          updated_by: string | null
          validation_policy: Json | null
          version: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_gateway_endpoints_capability_key_fkey"
            columns: ["capability_key"]
            isOneToOne: false
            referencedRelation: "admin_platform_capabilities"
            referencedColumns: ["capability_key"]
          },
          {
            foreignKeyName: "api_gateway_endpoints_capability_key_fkey"
            columns: ["capability_key"]
            isOneToOne: false
            referencedRelation: "platform_capability_registry"
            referencedColumns: ["capability_key"]
          },
          {
            foreignKeyName: "api_gateway_endpoints_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "admin_platform_dependency_map"
            referencedColumns: ["module_key"]
          },
          {
            foreignKeyName: "api_gateway_endpoints_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "admin_platform_extension_modules"
            referencedColumns: ["module_key"]
          },
          {
            foreignKeyName: "api_gateway_endpoints_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "platform_extension_modules"
            referencedColumns: ["module_key"]
          },
        ]
      }
      admin_api_gateway_openapi: {
        Row: {
          spec: Json | null
        }
        Relationships: []
      }
      admin_api_gateway_overview: {
        Row: {
          active_api_keys_count: number | null
          active_endpoints_count: number | null
          active_webhooks_count: number | null
          dead_letter_count: number | null
          endpoints_count: number | null
          errors_24h: number | null
          requests_24h: number | null
          webhook_queue_count: number | null
        }
        Relationships: []
      }
      admin_api_gateway_rate_limits: {
        Row: {
          blocked_until: string | null
          bucket_key: string | null
          endpoint_key: string | null
          id: string | null
          identity_type: string | null
          identity_value: string | null
          max_requests: number | null
          request_count: number | null
          updated_at: string | null
          window_seconds: number | null
          window_started_at: string | null
        }
        Insert: {
          blocked_until?: string | null
          bucket_key?: string | null
          endpoint_key?: string | null
          id?: string | null
          identity_type?: string | null
          identity_value?: string | null
          max_requests?: number | null
          request_count?: number | null
          updated_at?: string | null
          window_seconds?: number | null
          window_started_at?: string | null
        }
        Update: {
          blocked_until?: string | null
          bucket_key?: string | null
          endpoint_key?: string | null
          id?: string | null
          identity_type?: string | null
          identity_value?: string | null
          max_requests?: number | null
          request_count?: number | null
          updated_at?: string | null
          window_seconds?: number | null
          window_started_at?: string | null
        }
        Relationships: []
      }
      admin_api_gateway_request_logs: {
        Row: {
          api_key_id: string | null
          auth_mode: string | null
          created_at: string | null
          endpoint_key: string | null
          error_code: string | null
          error_message: string | null
          http_method: string | null
          id: number | null
          ip_address: unknown
          latency_ms: number | null
          module_key: string | null
          path: string | null
          request_id: string | null
          request_size_bytes: number | null
          request_summary: Json | null
          response_size_bytes: number | null
          response_summary: Json | null
          status_code: number | null
          user_id: string | null
        }
        Insert: {
          api_key_id?: string | null
          auth_mode?: string | null
          created_at?: string | null
          endpoint_key?: string | null
          error_code?: string | null
          error_message?: string | null
          http_method?: string | null
          id?: number | null
          ip_address?: unknown
          latency_ms?: number | null
          module_key?: string | null
          path?: string | null
          request_id?: string | null
          request_size_bytes?: number | null
          request_summary?: Json | null
          response_size_bytes?: number | null
          response_summary?: Json | null
          status_code?: number | null
          user_id?: string | null
        }
        Update: {
          api_key_id?: string | null
          auth_mode?: string | null
          created_at?: string | null
          endpoint_key?: string | null
          error_code?: string | null
          error_message?: string | null
          http_method?: string | null
          id?: number | null
          ip_address?: unknown
          latency_ms?: number | null
          module_key?: string | null
          path?: string | null
          request_id?: string | null
          request_size_bytes?: number | null
          request_summary?: Json | null
          response_size_bytes?: number | null
          response_summary?: Json | null
          status_code?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_gateway_request_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "admin_developer_portal_api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_gateway_request_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_gateway_api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_gateway_request_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "developer_portal_my_api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_api_gateway_security_findings: {
        Row: {
          detail: string | null
          endpoint_key: string | null
          finding_type: string | null
          severity: string | null
        }
        Relationships: []
      }
      admin_api_gateway_webhook_deliveries: {
        Row: {
          aggregate_id: string | null
          aggregate_type: string | null
          attempt_count: number | null
          created_at: string | null
          event_id: string | null
          event_key: string | null
          id: string | null
          last_attempt_at: string | null
          last_error: string | null
          last_status_code: number | null
          locked_at: string | null
          locked_by: string | null
          next_attempt_at: string | null
          owner_label: string | null
          response_preview: string | null
          signature_preview: string | null
          status: string | null
          subscription_id: string | null
          subscription_key: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_gateway_webhook_deliveries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "api_gateway_webhook_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_gateway_webhook_deliveries_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "admin_api_gateway_webhooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_gateway_webhook_deliveries_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "api_gateway_webhook_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_api_gateway_webhooks: {
        Row: {
          created_at: string | null
          created_by: string | null
          delivery_count: number | null
          disabled_reason: string | null
          event_keys: string[] | null
          failed_delivery_count: number | null
          failure_count: number | null
          id: string | null
          last_failure_at: string | null
          last_success_at: string | null
          max_attempts: number | null
          metadata: Json | null
          owner_label: string | null
          retry_policy: Json | null
          signing_secret_hash: string | null
          signing_secret_prefix: string | null
          status: string | null
          subscription_key: string | null
          target_url: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          delivery_count?: never
          disabled_reason?: string | null
          event_keys?: string[] | null
          failed_delivery_count?: never
          failure_count?: number | null
          id?: string | null
          last_failure_at?: string | null
          last_success_at?: string | null
          max_attempts?: number | null
          metadata?: Json | null
          owner_label?: string | null
          retry_policy?: Json | null
          signing_secret_hash?: string | null
          signing_secret_prefix?: string | null
          status?: string | null
          subscription_key?: string | null
          target_url?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          delivery_count?: never
          disabled_reason?: string | null
          event_keys?: string[] | null
          failed_delivery_count?: never
          failure_count?: number | null
          id?: string | null
          last_failure_at?: string | null
          last_success_at?: string | null
          max_attempts?: number | null
          metadata?: Json | null
          owner_label?: string | null
          retry_policy?: Json | null
          signing_secret_hash?: string | null
          signing_secret_prefix?: string | null
          status?: string | null
          subscription_key?: string | null
          target_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      admin_business_assistant_overview: {
        Row: {
          high_alerts: number | null
          last_snapshot_at: string | null
          open_alerts: number | null
          open_recommendations: number | null
          questions_total: number | null
          snapshots_total: number | null
          user_id: string | null
        }
        Relationships: []
      }
      admin_business_engine_version_comparisons: {
        Row: {
          commission_pool_impact_total: number | null
          different_decision_count: number | null
          differently_treated_orders: Json | null
          id: string | null
          left_engine_version: string | null
          margin_impact_total: number | null
          orders_compared: number | null
          requested_at: string | null
          right_engine_version: string | null
          rule_changes: Json | null
          summary: Json | null
        }
        Insert: {
          commission_pool_impact_total?: number | null
          different_decision_count?: number | null
          differently_treated_orders?: Json | null
          id?: string | null
          left_engine_version?: string | null
          margin_impact_total?: number | null
          orders_compared?: number | null
          requested_at?: string | null
          right_engine_version?: string | null
          rule_changes?: Json | null
          summary?: Json | null
        }
        Update: {
          commission_pool_impact_total?: number | null
          different_decision_count?: number | null
          differently_treated_orders?: Json | null
          id?: string | null
          left_engine_version?: string | null
          margin_impact_total?: number | null
          orders_compared?: number | null
          requested_at?: string | null
          right_engine_version?: string | null
          rule_changes?: Json | null
          summary?: Json | null
        }
        Relationships: []
      }
      admin_business_flight_recorder_events: {
        Row: {
          advisor_user_id: string | null
          attribution_user_id: string | null
          block_reason: string | null
          business_rules_version: string | null
          business_score: number | null
          commission_pool_amount: number | null
          commission_reduction_reason: string | null
          decision: string | null
          engine_name: string | null
          engine_version: string | null
          event_sequence: number | null
          event_time: string | null
          event_type: string | null
          explanation: Json | null
          final_decision: string | null
          fraud_risk_level: string | null
          id: string | null
          input_data: Json | null
          margin_amount: number | null
          order_id: string | null
          order_number: string | null
          output_data: Json | null
          product_cost_total: number | null
          refusal_reason: string | null
          replay_run_id: string | null
          trust_score: number | null
          user_id: string | null
          vendor_id: string | null
        }
        Insert: {
          advisor_user_id?: string | null
          attribution_user_id?: string | null
          block_reason?: string | null
          business_rules_version?: string | null
          business_score?: number | null
          commission_pool_amount?: number | null
          commission_reduction_reason?: string | null
          decision?: string | null
          engine_name?: string | null
          engine_version?: string | null
          event_sequence?: number | null
          event_time?: string | null
          event_type?: string | null
          explanation?: Json | null
          final_decision?: string | null
          fraud_risk_level?: string | null
          id?: string | null
          input_data?: Json | null
          margin_amount?: number | null
          order_id?: string | null
          order_number?: string | null
          output_data?: Json | null
          product_cost_total?: number | null
          refusal_reason?: string | null
          replay_run_id?: string | null
          trust_score?: number | null
          user_id?: string | null
          vendor_id?: string | null
        }
        Update: {
          advisor_user_id?: string | null
          attribution_user_id?: string | null
          block_reason?: string | null
          business_rules_version?: string | null
          business_score?: number | null
          commission_pool_amount?: number | null
          commission_reduction_reason?: string | null
          decision?: string | null
          engine_name?: string | null
          engine_version?: string | null
          event_sequence?: number | null
          event_time?: string | null
          event_type?: string | null
          explanation?: Json | null
          final_decision?: string | null
          fraud_risk_level?: string | null
          id?: string | null
          input_data?: Json | null
          margin_amount?: number | null
          order_id?: string | null
          order_number?: string | null
          output_data?: Json | null
          product_cost_total?: number | null
          refusal_reason?: string | null
          replay_run_id?: string | null
          trust_score?: number | null
          user_id?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_flight_recorder_events_advisor_user_id_fkey"
            columns: ["advisor_user_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "business_flight_recorder_events_attribution_user_id_fkey"
            columns: ["attribution_user_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "business_flight_recorder_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "admin_finance_overview"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "business_flight_recorder_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_flight_recorder_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      admin_business_flight_replay_runs: {
        Row: {
          business_rules_version: string | null
          completed_at: string | null
          engine_version: string | null
          event_count: number | null
          final_decision: string | null
          id: string | null
          order_id: string | null
          order_number: string | null
          requested_at: string | null
          summary: Json | null
        }
        Insert: {
          business_rules_version?: string | null
          completed_at?: string | null
          engine_version?: string | null
          event_count?: number | null
          final_decision?: string | null
          id?: string | null
          order_id?: string | null
          order_number?: string | null
          requested_at?: string | null
          summary?: Json | null
        }
        Update: {
          business_rules_version?: string | null
          completed_at?: string | null
          engine_version?: string | null
          event_count?: number | null
          final_decision?: string | null
          id?: string | null
          order_id?: string | null
          order_number?: string | null
          requested_at?: string | null
          summary?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "business_flight_replay_runs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "admin_finance_overview"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "business_flight_replay_runs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_business_score_alerts: {
        Row: {
          alert_type: string | null
          business_score: number | null
          calculated_at: string | null
          display_name: string | null
          global_score: number | null
          improvement_areas: string[] | null
          profile_type: string | null
          trust_score: number | null
          user_id: string | null
        }
        Relationships: []
      }
      admin_business_score_leaderboard: {
        Row: {
          business_score: number | null
          calculated_at: string | null
          display_name: string | null
          global_score: number | null
          improvement_areas: string[] | null
          profile_type: string | null
          score_level: string | null
          strengths: string[] | null
          trust_score: number | null
          user_id: string | null
        }
        Relationships: []
      }
      admin_catalogue_duplicate_candidates: {
        Row: {
          candidate_product_id: string | null
          candidate_product_name: string | null
          confidence_score: number | null
          created_at: string | null
          details: Json | null
          id: string | null
          product_id: string | null
          product_name: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          shop_name: string | null
          signals: string[] | null
          status: string | null
          updated_at: string | null
          vendor_shop_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalogue_duplicate_candidates_candidate_product_id_fkey"
            columns: ["candidate_product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "catalogue_duplicate_candidates_candidate_product_id_fkey"
            columns: ["candidate_product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "catalogue_duplicate_candidates_candidate_product_id_fkey"
            columns: ["candidate_product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_duplicate_candidates_candidate_product_id_fkey"
            columns: ["candidate_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_duplicate_candidates_candidate_product_id_fkey"
            columns: ["candidate_product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_duplicate_candidates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "catalogue_duplicate_candidates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "catalogue_duplicate_candidates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_duplicate_candidates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_duplicate_candidates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_duplicate_candidates_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "catalogue_duplicate_candidates_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "catalogue_duplicate_candidates_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_catalogue_intelligence_overview: {
        Row: {
          average_quality_score: number | null
          duplicate_candidates: number | null
          last_analyzed_at: string | null
          pending_proposals: number | null
          product_count: number | null
          shop_name: string | null
          vendor_owner_id: string | null
          vendor_shop_id: string | null
        }
        Relationships: []
      }
      admin_commercial_asset_report: {
        Row: {
          clicks_total: number | null
          conversion_rate: number | null
          conversions_total: number | null
          generated_7d: number | null
          generated_total: number | null
          last_generated_at: string | null
          owner_id: string | null
          shares_total: number | null
        }
        Relationships: []
      }
      admin_commercial_opportunity_calendar_report: {
        Row: {
          campaign_count: number | null
          category: string | null
          created_at: string | null
          ends_at: string | null
          event_type: string | null
          id: string | null
          is_active: boolean | null
          marketing_asset_count: number | null
          mission_count: number | null
          name: string | null
          priority: string | null
          publication_ends_at: string | null
          publication_starts_at: string | null
          recommended_category_count: number | null
          recommended_product_count: number | null
          slug: string | null
          starts_at: string | null
          status: string | null
        }
        Relationships: []
      }
      admin_conversation_coach_report: {
        Row: {
          advisor_id: string | null
          conversations_analyzed: number | null
          estimated_success_rate: number | null
          follow_up_total: number | null
          frequent_objections: Json | null
          last_conversation_at: string | null
          lost_total: number | null
          no_response_total: number | null
          won_total: number | null
        }
        Relationships: []
      }
      admin_developer_portal_api_keys: {
        Row: {
          allowed_endpoint_keys: string[] | null
          allowed_modules: string[] | null
          app_id: string | null
          app_key: string | null
          created_at: string | null
          expires_at: string | null
          id: string | null
          key_name: string | null
          key_prefix: string | null
          last_used_at: string | null
          owner_label: string | null
          status: string | null
        }
        Insert: {
          allowed_endpoint_keys?: string[] | null
          allowed_modules?: string[] | null
          app_id?: never
          app_key?: never
          created_at?: string | null
          expires_at?: string | null
          id?: string | null
          key_name?: string | null
          key_prefix?: string | null
          last_used_at?: string | null
          owner_label?: string | null
          status?: string | null
        }
        Update: {
          allowed_endpoint_keys?: string[] | null
          allowed_modules?: string[] | null
          app_id?: never
          app_key?: never
          created_at?: string | null
          expires_at?: string | null
          id?: string | null
          key_name?: string | null
          key_prefix?: string | null
          last_used_at?: string | null
          owner_label?: string | null
          status?: string | null
        }
        Relationships: []
      }
      admin_developer_portal_apps: {
        Row: {
          allowed_endpoint_keys: string[] | null
          allowed_modules: string[] | null
          app_key: string | null
          app_name: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          environment: string | null
          id: string | null
          metadata: Json | null
          owner_user_id: string | null
          quota_per_day: number | null
          quota_per_minute: number | null
          status: string | null
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          allowed_endpoint_keys?: string[] | null
          allowed_modules?: string[] | null
          app_key?: string | null
          app_name?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          environment?: string | null
          id?: string | null
          metadata?: Json | null
          owner_user_id?: string | null
          quota_per_day?: number | null
          quota_per_minute?: number | null
          status?: string | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          allowed_endpoint_keys?: string[] | null
          allowed_modules?: string[] | null
          app_key?: string | null
          app_name?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          environment?: string | null
          id?: string | null
          metadata?: Json | null
          owner_user_id?: string | null
          quota_per_day?: number | null
          quota_per_minute?: number | null
          status?: string | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      admin_developer_portal_members: {
        Row: {
          allowed_endpoint_keys: string[] | null
          allowed_modules: string[] | null
          created_at: string | null
          display_name: string | null
          invited_by: string | null
          member_role: string | null
          metadata: Json | null
          organization_name: string | null
          status: string | null
          support_tier: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          allowed_endpoint_keys?: string[] | null
          allowed_modules?: string[] | null
          created_at?: string | null
          display_name?: string | null
          invited_by?: string | null
          member_role?: string | null
          metadata?: Json | null
          organization_name?: string | null
          status?: string | null
          support_tier?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          allowed_endpoint_keys?: string[] | null
          allowed_modules?: string[] | null
          created_at?: string | null
          display_name?: string | null
          invited_by?: string | null
          member_role?: string | null
          metadata?: Json | null
          organization_name?: string | null
          status?: string | null
          support_tier?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_developer_portal_overview: {
        Row: {
          active_api_keys: number | null
          active_apps: number | null
          active_developers: number | null
          api_errors_24h: number | null
          api_requests_24h: number | null
          open_support_tickets: number | null
          sandbox_runs_24h: number | null
        }
        Relationships: []
      }
      admin_developer_portal_security_findings: {
        Row: {
          detail: string | null
          finding_type: string | null
          severity: string | null
          subject_key: string | null
        }
        Relationships: []
      }
      admin_extension_marketplace_catalog: {
        Row: {
          category: string | null
          compatibility_policy: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          documentation_url: string | null
          extension_key: string | null
          icon_url: string | null
          id: string | null
          installation_count: number | null
          license: string | null
          listing_status: string | null
          metadata: Json | null
          minimum_platform_version: string | null
          name: string | null
          open_finding_count: number | null
          publisher_id: string | null
          publisher_name: string | null
          support_url: string | null
          updated_at: string | null
          verification_status: string | null
          version_count: number | null
          visibility: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extension_marketplace_extensions_publisher_id_fkey"
            columns: ["publisher_id"]
            isOneToOne: false
            referencedRelation: "extension_marketplace_publishers"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_extension_marketplace_findings: {
        Row: {
          created_at: string | null
          detail: string | null
          extension_id: string | null
          extension_key: string | null
          extension_name: string | null
          finding_type: string | null
          id: string | null
          required_action: string | null
          resolved_at: string | null
          severity: string | null
          status: string | null
          version: string | null
          version_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extension_marketplace_validation_findings_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "admin_extension_marketplace_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_validation_findings_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "developer_extension_marketplace_my_extensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_validation_findings_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "extension_marketplace_extensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_validation_findings_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "admin_extension_marketplace_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_validation_findings_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "extension_marketplace_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_extension_marketplace_health: {
        Row: {
          api_calls_today: number | null
          api_errors_today: number | null
          avg_latency_ms_today: number | null
          blocking_findings: number | null
          extension_key: string | null
          health_score: number | null
          health_status: string | null
          install_status: string | null
          name: string | null
        }
        Relationships: []
      }
      admin_extension_marketplace_installations: {
        Row: {
          category: string | null
          configuration: Json | null
          created_at: string | null
          disabled_at: string | null
          environment: string | null
          extension_id: string | null
          extension_key: string | null
          extension_name: string | null
          feature_flag_key: string | null
          id: string | null
          install_status: string | null
          installed_at: string | null
          installed_by: string | null
          last_health_score: number | null
          last_health_status: string | null
          metadata: Json | null
          uninstalled_at: string | null
          updated_at: string | null
          version: string | null
          version_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extension_marketplace_installations_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "admin_extension_marketplace_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_installations_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "developer_extension_marketplace_my_extensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_installations_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "extension_marketplace_extensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_installations_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "admin_extension_marketplace_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_installations_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "extension_marketplace_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_extension_marketplace_operations: {
        Row: {
          actor_user_id: string | null
          created_at: string | null
          extension_id: string | null
          extension_key: string | null
          extension_name: string | null
          id: number | null
          installation_id: string | null
          metadata: Json | null
          new_state: Json | null
          operation_key: string | null
          operation_status: string | null
          operation_type: string | null
          previous_state: Json | null
          reason: string | null
          version: string | null
          version_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extension_marketplace_operations_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "admin_extension_marketplace_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_operations_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "developer_extension_marketplace_my_extensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_operations_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "extension_marketplace_extensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_operations_installation_id_fkey"
            columns: ["installation_id"]
            isOneToOne: false
            referencedRelation: "admin_extension_marketplace_installations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_operations_installation_id_fkey"
            columns: ["installation_id"]
            isOneToOne: false
            referencedRelation: "extension_marketplace_installations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_operations_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "admin_extension_marketplace_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_operations_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "extension_marketplace_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_extension_marketplace_overview: {
        Row: {
          blocked_versions_count: number | null
          extensions_count: number | null
          installed_extensions_count: number | null
          open_findings_count: number | null
          operations_24h: number | null
          published_extensions_count: number | null
          sandbox_runs_24h: number | null
        }
        Relationships: []
      }
      admin_extension_marketplace_sandbox_runs: {
        Row: {
          actor_user_id: string | null
          created_at: string | null
          extension_id: string | null
          extension_key: string | null
          extension_name: string | null
          id: string | null
          rollback_plan: Json | null
          run_status: string | null
          scenario_key: string | null
          side_effects: string | null
          validation_summary: Json | null
          version: string | null
          version_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extension_marketplace_sandbox_runs_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "admin_extension_marketplace_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_sandbox_runs_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "developer_extension_marketplace_my_extensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_sandbox_runs_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "extension_marketplace_extensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_sandbox_runs_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "admin_extension_marketplace_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_sandbox_runs_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "extension_marketplace_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_extension_marketplace_security_findings: {
        Row: {
          detail: string | null
          finding_type: string | null
          severity: string | null
          subject_key: string | null
        }
        Relationships: []
      }
      admin_extension_marketplace_versions: {
        Row: {
          category: string | null
          changelog: string | null
          consumed_events: string[] | null
          created_at: string | null
          created_by: string | null
          dependencies: string[] | null
          extension_id: string | null
          extension_key: string | null
          extension_name: string | null
          id: string | null
          integrity_digest: string | null
          metadata: Json | null
          package_manifest: Json | null
          produced_events: string[] | null
          published_at: string | null
          release_status: string | null
          requested_permissions: string[] | null
          required_api_endpoints: string[] | null
          required_capabilities: string[] | null
          required_connectors: string[] | null
          rollback_notes: string | null
          signature_digest: string | null
          updated_at: string | null
          version: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extension_marketplace_versions_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "admin_extension_marketplace_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_versions_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "developer_extension_marketplace_my_extensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_marketplace_versions_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "extension_marketplace_extensions"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_finance_overview: {
        Row: {
          buyer_id: string | null
          escrow_amount: number | null
          escrow_captured: number | null
          escrow_hold_reason: string | null
          escrow_id: string | null
          escrow_refunded: number | null
          escrow_status: string | null
          guest_email: string | null
          order_created_at: string | null
          order_id: string | null
          order_status: Database["public"]["Enums"]["order_status"] | null
          order_total: number | null
          payment_amount: number | null
          payment_intent_id: string | null
          payment_method: string | null
          payment_processed_at: string | null
          payment_provider: string | null
          payment_status: string | null
          recon_expected: number | null
          recon_received: number | null
          recon_variance: number | null
          reconciled_at: string | null
          reconciliation_id: string | null
          reconciliation_status: string | null
          risk_level: Database["public"]["Enums"]["fraud_risk_level"] | null
          risk_review_status:
            | Database["public"]["Enums"]["fraud_review_status"]
            | null
          risk_score: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      admin_integration_hub_compatibility_findings: {
        Row: {
          connector_id: string | null
          connector_key: string | null
          connector_name: string | null
          connector_status: string | null
          created_at: string | null
          created_by: string | null
          detail: string | null
          evidence: Json | null
          finding_type: string | null
          id: string | null
          required_action: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_hub_compatibility_findings_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "admin_integration_hub_connectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_hub_compatibility_findings_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "integration_hub_connectors"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_integration_hub_configs: {
        Row: {
          config_schema: Json | null
          connector_key: string | null
          created_at: string | null
          environment: string | null
          id: string | null
          is_active: boolean | null
          optional_parameters: string[] | null
          organization_key: string | null
          required_parameters: string[] | null
          secret_refs: Json | null
          updated_at: string | null
          validation_errors: Json | null
          validation_status: string | null
        }
        Relationships: []
      }
      admin_integration_hub_connectors: {
        Row: {
          active_job_count: number | null
          api_min_version: string | null
          capabilities_used: string[] | null
          category: string | null
          compatibility_contract: Json | null
          config_count: number | null
          connector_key: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          documentation_url: string | null
          environment: string | null
          events_consumed: string[] | null
          events_produced: string[] | null
          feature_flag_key: string | null
          gateway_required_version: string | null
          health_score: number | null
          health_status: string | null
          id: string | null
          installed_at: string | null
          last_sync_at: string | null
          metadata: Json | null
          name: string | null
          next_sync_at: string | null
          open_finding_count: number | null
          owner_module_key: string | null
          provider: string | null
          status: string | null
          sync_policy: Json | null
          updated_at: string | null
          updated_by: string | null
          version: string | null
        }
        Insert: {
          active_job_count?: never
          api_min_version?: string | null
          capabilities_used?: string[] | null
          category?: string | null
          compatibility_contract?: Json | null
          config_count?: never
          connector_key?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          documentation_url?: string | null
          environment?: string | null
          events_consumed?: string[] | null
          events_produced?: string[] | null
          feature_flag_key?: string | null
          gateway_required_version?: string | null
          health_score?: number | null
          health_status?: string | null
          id?: string | null
          installed_at?: string | null
          last_sync_at?: string | null
          metadata?: Json | null
          name?: string | null
          next_sync_at?: string | null
          open_finding_count?: never
          owner_module_key?: string | null
          provider?: string | null
          status?: string | null
          sync_policy?: Json | null
          updated_at?: string | null
          updated_by?: string | null
          version?: string | null
        }
        Update: {
          active_job_count?: never
          api_min_version?: string | null
          capabilities_used?: string[] | null
          category?: string | null
          compatibility_contract?: Json | null
          config_count?: never
          connector_key?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          documentation_url?: string | null
          environment?: string | null
          events_consumed?: string[] | null
          events_produced?: string[] | null
          feature_flag_key?: string | null
          gateway_required_version?: string | null
          health_score?: number | null
          health_status?: string | null
          id?: string | null
          installed_at?: string | null
          last_sync_at?: string | null
          metadata?: Json | null
          name?: string | null
          next_sync_at?: string | null
          open_finding_count?: never
          owner_module_key?: string | null
          provider?: string | null
          status?: string | null
          sync_policy?: Json | null
          updated_at?: string | null
          updated_by?: string | null
          version?: string | null
        }
        Relationships: []
      }
      admin_integration_hub_health: {
        Row: {
          avg_latency_ms_7d: number | null
          category: string | null
          connector_key: string | null
          failed_runs_7d: number | null
          health_score: number | null
          health_status: string | null
          last_sync_at: string | null
          name: string | null
          next_sync_at: string | null
          runs_7d: number | null
          status: string | null
        }
        Relationships: []
      }
      admin_integration_hub_lifecycle_events: {
        Row: {
          actor_id: string | null
          connector_id: string | null
          connector_key: string | null
          created_at: string | null
          event_type: string | null
          id: number | null
          new_values: Json | null
          previous_values: Json | null
          reason: string | null
        }
        Insert: {
          actor_id?: string | null
          connector_id?: string | null
          connector_key?: string | null
          created_at?: string | null
          event_type?: string | null
          id?: number | null
          new_values?: Json | null
          previous_values?: Json | null
          reason?: string | null
        }
        Update: {
          actor_id?: string | null
          connector_id?: string | null
          connector_key?: string | null
          created_at?: string | null
          event_type?: string | null
          id?: number | null
          new_values?: Json | null
          previous_values?: Json | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_hub_lifecycle_events_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "admin_integration_hub_connectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_hub_lifecycle_events_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "integration_hub_connectors"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_integration_hub_overview: {
        Row: {
          connectors_count: number | null
          enabled_connectors_count: number | null
          failed_syncs_24h: number | null
          healthy_connectors_count: number | null
          open_compatibility_findings: number | null
          queued_sync_count: number | null
          running_sync_count: number | null
          sync_runs_24h: number | null
          unhealthy_connectors_count: number | null
        }
        Relationships: []
      }
      admin_integration_hub_security_findings: {
        Row: {
          connector_key: string | null
          detail: string | null
          finding_type: string | null
          severity: string | null
        }
        Relationships: []
      }
      admin_integration_hub_sync_jobs: {
        Row: {
          attempt_count: number | null
          category: string | null
          checkpoint: Json | null
          connector_id: string | null
          connector_key: string | null
          connector_name: string | null
          created_at: string | null
          created_by: string | null
          error_code: string | null
          error_message: string | null
          finished_at: string | null
          id: string | null
          job_key: string | null
          lock_token: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number | null
          payload: Json | null
          priority: number | null
          result_summary: Json | null
          scheduled_for: string | null
          started_at: string | null
          status: string | null
          sync_type: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_hub_sync_jobs_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "admin_integration_hub_connectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_hub_sync_jobs_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "integration_hub_connectors"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_integration_hub_sync_runs: {
        Row: {
          connector_id: string | null
          connector_key: string | null
          connector_name: string | null
          created_at: string | null
          created_by: string | null
          duration_ms: number | null
          error_code: string | null
          error_message: string | null
          health_after: string | null
          id: string | null
          job_id: string | null
          metrics: Json | null
          records_failed: number | null
          records_read: number | null
          records_written: number | null
          retry_after: string | null
          run_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_hub_sync_runs_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "admin_integration_hub_connectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_hub_sync_runs_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "integration_hub_connectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_hub_sync_runs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "admin_integration_hub_sync_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_hub_sync_runs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "integration_hub_sync_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_marketplace_analytics_overview: {
        Row: {
          active_product_count: number | null
          approved_enrichments_count: number | null
          catalogue_quality_score: number | null
          discoverability_score: number | null
          duplicate_candidates_count: number | null
          image_score: number | null
          marketplace_health_score: number | null
          pending_actions_count: number | null
          product_count: number | null
          products_to_enrich_count: number | null
          seo_score: number | null
          shops_analyzed: number | null
          shops_to_support: Json | null
          top_shops: Json | null
        }
        Relationships: []
      }
      admin_marketplace_analytics_shop_rankings: {
        Row: {
          active_product_count: number | null
          alerts: Json | null
          approved_enrichments_count: number | null
          avg_catalogue_quality_score: number | null
          avg_coach_score: number | null
          avg_completeness_score: number | null
          avg_discoverability_score: number | null
          avg_image_score: number | null
          avg_seo_score: number | null
          calculated_at: string | null
          calculated_by: string | null
          created_at: string | null
          duplicate_candidates_count: number | null
          engine_version: string | null
          id: string | null
          low_visibility_products: Json | null
          low_visibility_products_count: number | null
          marketplace_health_score: number | null
          new_products_count: number | null
          pending_catalogue_proposals_count: number | null
          pending_image_reviews_count: number | null
          pending_recommendations_count: number | null
          pending_seo_proposals_count: number | null
          product_count: number | null
          products_to_enrich_count: number | null
          rejected_images_count: number | null
          shop_name: string | null
          snapshot_date: string | null
          source_counts: Json | null
          top_brands: Json | null
          top_categories: Json | null
          vendor_owner_id: string | null
          vendor_shop_id: string | null
          visibility_score: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_analytics_daily_snapshots_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_analytics_daily_snapshots_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_analytics_daily_snapshots_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_marketplace_analytics_trends: {
        Row: {
          approved_enrichments_count: number | null
          catalogue_quality_score: number | null
          duplicate_candidates_count: number | null
          image_score: number | null
          marketplace_health_score: number | null
          product_count: number | null
          seo_score: number | null
          shops_count: number | null
          snapshot_date: string | null
        }
        Relationships: []
      }
      admin_marketplace_case_checklist_items: {
        Row: {
          case_id: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          id: string | null
          is_completed: boolean | null
          label: string | null
          note: string | null
          position: number | null
          template_id: string | null
        }
        Insert: {
          case_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          id?: string | null
          is_completed?: boolean | null
          label?: string | null
          note?: string | null
          position?: number | null
          template_id?: string | null
        }
        Update: {
          case_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          id?: string | null
          is_completed?: boolean | null
          label?: string | null
          note?: string | null
          position?: number | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_case_checklist_items_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_case_resolution_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_checklist_items_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_governance_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_checklist_items_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "marketplace_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_checklist_items_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_case_resolution_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_checklist_items_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_checklist_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "marketplace_case_checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_marketplace_case_comments: {
        Row: {
          attachments: Json | null
          author_id: string | null
          author_type: string | null
          body: string | null
          case_id: string | null
          comment_type: string | null
          created_at: string | null
          id: string | null
          metadata: Json | null
          visibility: string | null
        }
        Insert: {
          attachments?: Json | null
          author_id?: string | null
          author_type?: string | null
          body?: string | null
          case_id?: string | null
          comment_type?: string | null
          created_at?: string | null
          id?: string | null
          metadata?: Json | null
          visibility?: string | null
        }
        Update: {
          attachments?: Json | null
          author_id?: string | null
          author_type?: string | null
          body?: string | null
          case_id?: string | null
          comment_type?: string | null
          created_at?: string | null
          id?: string | null
          metadata?: Json | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_case_comments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_case_resolution_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_comments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_governance_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_comments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "marketplace_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_comments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_case_resolution_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_comments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_governance_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_marketplace_case_escalations: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          case_id: string | null
          detected_at: string | null
          escalation_type: string | null
          id: string | null
          metadata: Json | null
          reason: string | null
          recommended_action: string | null
          severity: string | null
          status: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          case_id?: string | null
          detected_at?: string | null
          escalation_type?: string | null
          id?: string | null
          metadata?: Json | null
          reason?: string | null
          recommended_action?: string | null
          severity?: string | null
          status?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          case_id?: string | null
          detected_at?: string | null
          escalation_type?: string | null
          id?: string | null
          metadata?: Json | null
          reason?: string | null
          recommended_action?: string | null
          severity?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_case_escalations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_case_resolution_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_escalations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_governance_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_escalations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "marketplace_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_escalations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_case_resolution_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_escalations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_governance_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_marketplace_case_resolution_overview: {
        Row: {
          active_cases: number | null
          avg_resolution_hours: number | null
          overdue_cases: number | null
          proposed_escalations: number | null
          unassigned_cases: number | null
          vendor_replied_cases: number | null
          waiting_vendor_cases: number | null
        }
        Relationships: []
      }
      admin_marketplace_case_resolution_queue: {
        Row: {
          assigned_to: string | null
          case_number: string | null
          case_type: string | null
          case_type_label: string | null
          checklist_completed_count: number | null
          checklist_count: number | null
          closed_at: string | null
          comments_count: number | null
          confidence_score: number | null
          created_at: string | null
          created_by: string | null
          created_by_type: string | null
          data_used: Json | null
          decided_at: string | null
          decided_by: string | null
          due_at: string | null
          explanation: string | null
          final_decision: string | null
          first_assigned_at: string | null
          id: string | null
          is_terminal: boolean | null
          is_vendor_visible: boolean | null
          is_vendor_waiting: boolean | null
          last_assigned_at: string | null
          last_escalation_at: string | null
          metadata: Json | null
          open_escalations_count: number | null
          potential_impacts: Json | null
          priority: string | null
          problem: string | null
          product_id: string | null
          product_name: string | null
          recommended_actions: Json | null
          reopened_count: number | null
          resolution_started_at: string | null
          resolved_at: string | null
          responsible_team_id: string | null
          responsible_team_name: string | null
          shop_name: string | null
          source_module: string | null
          source_ref_id: string | null
          stage_order: number | null
          status: string | null
          time_spent_minutes: number | null
          updated_at: string | null
          vendor_owner_id: string | null
          vendor_shop_id: string | null
          workflow_metadata: Json | null
          workflow_status_code: string | null
          workflow_status_label: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_governance_cases_case_type_fkey"
            columns: ["case_type"]
            isOneToOne: false
            referencedRelation: "marketplace_governance_case_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "marketplace_governance_cases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_governance_cases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_governance_cases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_governance_cases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_governance_cases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_governance_cases_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_governance_cases_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_governance_cases_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_marketplace_coach_overview: {
        Row: {
          calculated_at: string | null
          completeness_score: number | null
          conversion_score: number | null
          image_quality_score: number | null
          metrics: Json | null
          open_recommendations: number | null
          opportunities: string[] | null
          product_quality_score: number | null
          seo_score: number | null
          shop_name: string | null
          shop_score: number | null
          vendor_owner_id: string | null
          vendor_shop_id: string | null
          weaknesses: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_coach_shop_snapshots_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_coach_shop_snapshots_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_coach_shop_snapshots_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_marketplace_compliance_overview: {
        Row: {
          active_policies: number | null
          avg_resolution_hours: number | null
          critical_findings: number | null
          findings_24h: number | null
          global_compliance_score: number | null
          open_findings: number | null
          rejection_proposed: number | null
        }
        Relationships: []
      }
      admin_marketplace_compliance_policy_stats: {
        Row: {
          category: string | null
          code: string | null
          findings_7d: number | null
          id: string | null
          is_active: boolean | null
          name: string | null
          open_findings: number | null
          priority: number | null
          severity: string | null
          total_findings: number | null
        }
        Relationships: []
      }
      admin_marketplace_compliance_queue: {
        Row: {
          analyzed_elements: Json | null
          compliance_score: number | null
          confidence_score: number | null
          created_at: string | null
          estimated_impact: Json | null
          finding_number: string | null
          governance_case_id: string | null
          id: string | null
          justification: string | null
          policy_category: string | null
          policy_code: string | null
          policy_name: string | null
          product_image_url: string | null
          product_name: string | null
          product_slug: string | null
          queue_status: string | null
          recommended_actions: Json | null
          severity: string | null
          shop_name: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_compliance_findings_governance_case_id_fkey"
            columns: ["governance_case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_case_resolution_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_compliance_findings_governance_case_id_fkey"
            columns: ["governance_case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_governance_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_compliance_findings_governance_case_id_fkey"
            columns: ["governance_case_id"]
            isOneToOne: false
            referencedRelation: "marketplace_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_compliance_findings_governance_case_id_fkey"
            columns: ["governance_case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_case_resolution_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_compliance_findings_governance_case_id_fkey"
            columns: ["governance_case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_governance_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_marketplace_compliance_shop_stats: {
        Row: {
          avg_compliance_score: number | null
          critical_findings: number | null
          flagged_products: number | null
          open_findings: number | null
          shop_name: string | null
          vendor_shop_id: string | null
        }
        Relationships: []
      }
      admin_marketplace_compliance_trends: {
        Row: {
          admin_decisions: number | null
          day: string | null
          detections: number | null
          resolutions: number | null
          total_events: number | null
        }
        Relationships: []
      }
      admin_marketplace_governance_notifications: {
        Row: {
          case_id: string | null
          created_at: string | null
          id: string | null
          message: string | null
          metadata: Json | null
          notification_type: string | null
          read_at: string | null
          recipient_id: string | null
          recipient_role: string | null
          severity: string | null
          title: string | null
        }
        Insert: {
          case_id?: string | null
          created_at?: string | null
          id?: string | null
          message?: string | null
          metadata?: Json | null
          notification_type?: string | null
          read_at?: string | null
          recipient_id?: string | null
          recipient_role?: string | null
          severity?: string | null
          title?: string | null
        }
        Update: {
          case_id?: string | null
          created_at?: string | null
          id?: string | null
          message?: string | null
          metadata?: Json | null
          notification_type?: string | null
          read_at?: string | null
          recipient_id?: string | null
          recipient_role?: string | null
          severity?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_governance_notifications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_case_resolution_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_governance_notifications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_governance_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_governance_notifications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "marketplace_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_governance_notifications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_case_resolution_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_governance_notifications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_governance_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_marketplace_governance_overview: {
        Row: {
          active_case_types: Json | null
          avg_resolution_hours: number | null
          cases_30d: number | null
          cases_7d: number | null
          closed_cases: number | null
          critical_cases: number | null
          open_cases: number | null
          waiting_cases: number | null
        }
        Relationships: []
      }
      admin_marketplace_governance_queue: {
        Row: {
          assigned_to: string | null
          case_number: string | null
          case_type: string | null
          case_type_label: string | null
          confidence_score: number | null
          created_at: string | null
          created_by: string | null
          created_by_type: string | null
          data_used: Json | null
          decided_at: string | null
          decided_by: string | null
          explanation: string | null
          final_decision: string | null
          history_count: number | null
          id: string | null
          is_vendor_visible: boolean | null
          last_activity_at: string | null
          metadata: Json | null
          potential_impacts: Json | null
          priority: string | null
          problem: string | null
          product_id: string | null
          product_name: string | null
          product_slug: string | null
          recommended_actions: Json | null
          shop_name: string | null
          source_module: string | null
          source_ref_id: string | null
          status: string | null
          updated_at: string | null
          vendor_owner_id: string | null
          vendor_shop_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_governance_cases_case_type_fkey"
            columns: ["case_type"]
            isOneToOne: false
            referencedRelation: "marketplace_governance_case_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "marketplace_governance_cases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_governance_cases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_governance_cases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_governance_cases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_governance_cases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_governance_cases_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_governance_cases_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_governance_cases_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_marketplace_governance_trends: {
        Row: {
          ai_created_cases: number | null
          closed_cases: number | null
          critical_cases: number | null
          day: string | null
          total_cases: number | null
        }
        Relationships: []
      }
      admin_marketplace_image_studio_queue: {
        Row: {
          admin_notes: string | null
          ai_analysis: Json | null
          compliance_score: number | null
          corrected_image_url: string | null
          corrections: string[] | null
          created_at: string | null
          decision: string | null
          id: string | null
          issues: string[] | null
          original_image_url: string | null
          product_detected: string | null
          product_id: string | null
          product_name: string | null
          product_slug: string | null
          product_vendor_id: string | null
          published_image_url: string | null
          reviewed_at: string | null
          status: string | null
          updated_at: string | null
          vendor_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_image_studio_jobs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_image_studio_jobs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_image_studio_jobs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_image_studio_jobs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_image_studio_jobs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["product_vendor_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["product_vendor_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["product_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_marketplace_seo_issues: {
        Row: {
          analyzed_at: string | null
          discoverability_score: number | null
          issues: string[] | null
          product_id: string | null
          product_name: string | null
          product_slug: string | null
          recommendations: Json | null
          seo_score: number | null
          shop_name: string | null
          vendor_shop_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_seo_product_scores_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_seo_product_scores_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_seo_product_scores_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_seo_product_scores_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_seo_product_scores_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_seo_product_scores_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_seo_product_scores_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_seo_product_scores_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_marketplace_seo_overview: {
        Row: {
          analyzed_at: string | null
          discoverability_score: number | null
          issues: string[] | null
          open_proposals: number | null
          optimized_product_count: number | null
          product_count: number | null
          recommendations: Json | null
          seo_score: number | null
          shop_name: string | null
          vendor_owner_id: string | null
          vendor_shop_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_seo_shop_scores_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_seo_shop_scores_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_seo_shop_scores_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_marketplace_workflow_automation_executions: {
        Row: {
          actor_type: string | null
          case_id: string | null
          case_number: string | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          finished_at: string | null
          id: string | null
          queue_id: string | null
          result: Json | null
          rule_id: string | null
          rule_name: string | null
          started_at: string | null
          status: string | null
          trigger_event: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_workflow_automation_executions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_case_resolution_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_executions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_governance_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_executions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "marketplace_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_executions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_case_resolution_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_executions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_executions_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_workflow_automation_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_executions_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "marketplace_workflow_automation_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_executions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_workflow_automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_executions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "marketplace_workflow_automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_marketplace_workflow_automation_overview: {
        Row: {
          active_rules: number | null
          avg_duration_ms_7d: number | null
          executions_24h: number | null
          failed_executions_24h: number | null
          failed_jobs: number | null
          inactive_rules: number | null
          open_tasks: number | null
          pending_jobs: number | null
        }
        Relationships: []
      }
      admin_marketplace_workflow_automation_queue: {
        Row: {
          attempt_count: number | null
          case_id: string | null
          case_number: string | null
          case_priority: string | null
          completed_at: string | null
          created_at: string | null
          id: string | null
          last_error: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number | null
          payload: Json | null
          rule_id: string | null
          rule_name: string | null
          scheduled_for: string | null
          status: string | null
          trigger_event: string | null
          updated_at: string | null
          workflow_status_code: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_workflow_automation_queue_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_case_resolution_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_queue_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_governance_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_queue_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "marketplace_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_queue_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_case_resolution_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_queue_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_queue_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_workflow_automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_queue_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "marketplace_workflow_automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_marketplace_workflow_automation_rules: {
        Row: {
          actions: Json | null
          avg_duration_ms: number | null
          conditions: Json | null
          cooldown_minutes: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          failed_executions: number | null
          id: string | null
          is_active: boolean | null
          last_error: string | null
          last_run_at: string | null
          metadata: Json | null
          name: string | null
          pending_jobs: number | null
          priority: number | null
          run_count: number | null
          trigger_event: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          actions?: Json | null
          avg_duration_ms?: never
          conditions?: Json | null
          cooldown_minutes?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          failed_executions?: never
          id?: string | null
          is_active?: boolean | null
          last_error?: string | null
          last_run_at?: string | null
          metadata?: Json | null
          name?: string | null
          pending_jobs?: never
          priority?: number | null
          run_count?: number | null
          trigger_event?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          actions?: Json | null
          avg_duration_ms?: never
          conditions?: Json | null
          cooldown_minutes?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          failed_executions?: never
          id?: string | null
          is_active?: boolean | null
          last_error?: string | null
          last_run_at?: string | null
          metadata?: Json | null
          name?: string | null
          pending_jobs?: never
          priority?: number | null
          run_count?: number | null
          trigger_event?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      admin_marketplace_workflow_automation_tasks: {
        Row: {
          assigned_to: string | null
          case_id: string | null
          case_number: string | null
          case_priority: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_at: string | null
          id: string | null
          metadata: Json | null
          rule_id: string | null
          rule_name: string | null
          status: string | null
          task_type: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_workflow_automation_tasks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_case_resolution_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_tasks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_governance_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_tasks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "marketplace_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_tasks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_case_resolution_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_tasks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_tasks_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_workflow_automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_workflow_automation_tasks_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "marketplace_workflow_automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_missing_purchase_costs: {
        Row: {
          category_id: string | null
          category_name: string | null
          is_active: boolean | null
          name: string | null
          price: number | null
          priority: string | null
          product_id: string | null
          purchase_price: number | null
          slug: string | null
          snapshot_order_count: number | null
          snapshot_sales_total: number | null
          snapshot_units: number | null
          stock_quantity: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_mlm_commission_anomalies: {
        Row: {
          anomaly_codes: string[] | null
          beneficiary_id: string | null
          commission_amount: number | null
          commission_id: string | null
          commission_status:
            | Database["public"]["Enums"]["payment_status"]
            | null
          created_at: string | null
          level: number | null
          order_id: string | null
          order_number: string | null
          order_status: Database["public"]["Enums"]["order_status"] | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          purchaser_id: string | null
          reversal_wallet_recovered_amount: number | null
          reversed_at: string | null
          unrecovered_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "admin_finance_overview"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_purchaser_id_fkey"
            columns: ["purchaser_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      admin_orchestration_health: {
        Row: {
          dead_letter_events: number | null
          events_24h: number | null
          executions_24h: number | null
          failed_events: number | null
          failed_executions_24h: number | null
          oldest_pending_at: string | null
          pending_events: number | null
        }
        Relationships: []
      }
      admin_p0_governance_decision_report: {
        Row: {
          alternatives: Json | null
          confidence: number | null
          created_at: string | null
          data_used: Json | null
          decision: string | null
          decision_type: string | null
          engine_name: string | null
          estimated_impacts: Json | null
          order_id: string | null
          rejection_reasons: Json | null
          rules_applied: Json | null
          user_id: string | null
        }
        Insert: {
          alternatives?: Json | null
          confidence?: number | null
          created_at?: string | null
          data_used?: Json | null
          decision?: string | null
          decision_type?: string | null
          engine_name?: string | null
          estimated_impacts?: Json | null
          order_id?: string | null
          rejection_reasons?: Json | null
          rules_applied?: Json | null
          user_id?: string | null
        }
        Update: {
          alternatives?: Json | null
          confidence?: number | null
          created_at?: string | null
          data_used?: Json | null
          decision?: string | null
          decision_type?: string | null
          engine_name?: string | null
          estimated_impacts?: Json | null
          order_id?: string | null
          rejection_reasons?: Json | null
          rules_applied?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "governance_decision_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "admin_finance_overview"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "governance_decision_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "governance_decision_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      admin_p0_revenue_observation_report: {
        Row: {
          attributed_user_id: string | null
          attribution_decision: string | null
          attribution_source: string | null
          commission_pool_available: number | null
          contribution_margin: number | null
          created_at: string | null
          decision: string | null
          gross_margin: number | null
          is_commissionable: boolean | null
          min_margin_rate: number | null
          missing_cost_count: number | null
          order_id: string | null
          order_number: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          platform_minimum_profit: number | null
          product_cost_total: number | null
          rejection_reasons: Json | null
          revenue_amount: number | null
          status: Database["public"]["Enums"]["order_status"] | null
          warnings: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "order_attributions_attributed_user_id_fkey"
            columns: ["attributed_user_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "revenue_engine_snapshots_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "admin_finance_overview"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "revenue_engine_snapshots_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_p05_readiness_dashboard: {
        Row: {
          action_plan: Json | null
          activation_rule: string | null
          active_products_missing_purchase_cost: number | null
          anomalies_detected: number | null
          attribution_difference_count: number | null
          commission_difference_count: number | null
          compatible_orders: number | null
          confidence_explanations: Json | null
          different_orders: number | null
          go_live_score: number | null
          latest_run_id: string | null
          margin_difference_count: number | null
          missing_cost_order_count: number | null
          orders_analyzed: number | null
          orders_not_paid: number | null
          p0_readiness_components: Json | null
          p0_readiness_score: number | null
          pending_payment_simulated_count: number | null
          production_blockers: Json | null
          ready_for_production: boolean | null
          simulation_accuracy: number | null
          simulation_confidence_score: number | null
        }
        Relationships: []
      }
      admin_p05_simulation_dashboard: {
        Row: {
          anomalies_detected: number | null
          commandes_differentes: number | null
          commandes_identiques: number | null
          commandes_simulees: number | null
          commission_difference_total: number | null
          commission_extra_total: number | null
          commission_saved_total: number | null
          completed_at: string | null
          confidence_status: string | null
          margin_difference_total: number | null
          profit_plateforme_production: number | null
          profit_plateforme_simule: number | null
          requested_at: string | null
          run_id: string | null
          simulation_accuracy: number | null
          simulation_confidence_score: number | null
          status: string | null
          summary: Json | null
        }
        Insert: {
          anomalies_detected?: number | null
          commandes_differentes?: number | null
          commandes_identiques?: number | null
          commandes_simulees?: number | null
          commission_difference_total?: number | null
          commission_extra_total?: number | null
          commission_saved_total?: number | null
          completed_at?: string | null
          confidence_status?: never
          margin_difference_total?: number | null
          profit_plateforme_production?: number | null
          profit_plateforme_simule?: number | null
          requested_at?: string | null
          run_id?: string | null
          simulation_accuracy?: number | null
          simulation_confidence_score?: number | null
          status?: string | null
          summary?: Json | null
        }
        Update: {
          anomalies_detected?: number | null
          commandes_differentes?: number | null
          commandes_identiques?: number | null
          commandes_simulees?: number | null
          commission_difference_total?: number | null
          commission_extra_total?: number | null
          commission_saved_total?: number | null
          completed_at?: string | null
          confidence_status?: never
          margin_difference_total?: number | null
          profit_plateforme_production?: number | null
          profit_plateforme_simule?: number | null
          requested_at?: string | null
          run_id?: string | null
          simulation_accuracy?: number | null
          simulation_confidence_score?: number | null
          status?: string | null
          summary?: Json | null
        }
        Relationships: []
      }
      admin_p05_simulation_vs_production: {
        Row: {
          calcul_actuel: Json | null
          calcul_p0: Json | null
          created_at: string | null
          difference: Json | null
          differences: Json | null
          explanation: Json | null
          id: string | null
          order_id: string | null
          order_number: string | null
          order_status: string | null
          payment_status: string | null
          run_id: string | null
        }
        Insert: {
          calcul_actuel?: never
          calcul_p0?: never
          created_at?: string | null
          difference?: never
          differences?: Json | null
          explanation?: Json | null
          id?: string | null
          order_id?: string | null
          order_number?: string | null
          order_status?: string | null
          payment_status?: string | null
          run_id?: string | null
        }
        Update: {
          calcul_actuel?: never
          calcul_p0?: never
          created_at?: string | null
          difference?: never
          differences?: Json | null
          explanation?: Json | null
          id?: string | null
          order_id?: string | null
          order_number?: string | null
          order_status?: string | null
          payment_status?: string | null
          run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "p05_simulation_order_results_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "admin_finance_overview"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "p05_simulation_order_results_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "p05_simulation_order_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "admin_p05_readiness_dashboard"
            referencedColumns: ["latest_run_id"]
          },
          {
            foreignKeyName: "p05_simulation_order_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "admin_p05_simulation_dashboard"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "p05_simulation_order_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "p05_simulation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_platform_capabilities: {
        Row: {
          access_type: string | null
          capability_key: string | null
          created_at: string | null
          dependencies: string[] | null
          description: string | null
          documentation_path: string | null
          id: string | null
          input_contract: Json | null
          module_key: string | null
          module_name: string | null
          module_status: string | null
          output_contract: Json | null
          required_permission: string | null
          status: string | null
          updated_at: string | null
          version: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_capability_registry_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "admin_platform_dependency_map"
            referencedColumns: ["module_key"]
          },
          {
            foreignKeyName: "platform_capability_registry_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "admin_platform_extension_modules"
            referencedColumns: ["module_key"]
          },
          {
            foreignKeyName: "platform_capability_registry_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "platform_extension_modules"
            referencedColumns: ["module_key"]
          },
        ]
      }
      admin_platform_compatibility_alerts: {
        Row: {
          alert_type: string | null
          detail: string | null
          module_key: string | null
          severity: string | null
          title: string | null
        }
        Relationships: []
      }
      admin_platform_contracts: {
        Row: {
          contract_name: string | null
          contract_type: string | null
          documentation_path: string | null
          module_key: string | null
          purpose: string | null
          required_permissions: string[] | null
          status: string | null
          version: string | null
        }
        Relationships: []
      }
      admin_platform_dependency_map: {
        Row: {
          dependency_name: string | null
          dependency_status: string | null
          depends_on: string | null
          module_key: string | null
          name: string | null
        }
        Relationships: []
      }
      admin_platform_event_catalog: {
        Row: {
          created_at: string | null
          description: string | null
          event_key: string | null
          id: string | null
          known_consumers: string[] | null
          optional_fields: string[] | null
          payload_schema: Json | null
          producer_module_key: string | null
          producer_module_name: string | null
          required_fields: string[] | null
          retention_policy: string | null
          sensitivity_level: string | null
          status: string | null
          updated_at: string | null
          version: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_event_catalog_producer_module_key_fkey"
            columns: ["producer_module_key"]
            isOneToOne: false
            referencedRelation: "admin_platform_dependency_map"
            referencedColumns: ["module_key"]
          },
          {
            foreignKeyName: "platform_event_catalog_producer_module_key_fkey"
            columns: ["producer_module_key"]
            isOneToOne: false
            referencedRelation: "admin_platform_extension_modules"
            referencedColumns: ["module_key"]
          },
          {
            foreignKeyName: "platform_event_catalog_producer_module_key_fkey"
            columns: ["producer_module_key"]
            isOneToOne: false
            referencedRelation: "platform_extension_modules"
            referencedColumns: ["module_key"]
          },
        ]
      }
      admin_platform_extension_modules: {
        Row: {
          can_be_disabled: boolean | null
          consumed_events: string[] | null
          contract_version: string | null
          created_at: string | null
          created_by: string | null
          dependencies: string[] | null
          description: string | null
          documentation_path: string | null
          edge_functions: string[] | null
          id: string | null
          logical_owner: string | null
          metadata: Json | null
          module_key: string | null
          name: string | null
          primary_tables: string[] | null
          produced_events: string[] | null
          provided_capabilities: string[] | null
          required_permissions: string[] | null
          routes: string[] | null
          rpc_functions: string[] | null
          status: string | null
          updated_at: string | null
          version: string | null
        }
        Insert: {
          can_be_disabled?: boolean | null
          consumed_events?: string[] | null
          contract_version?: string | null
          created_at?: string | null
          created_by?: string | null
          dependencies?: string[] | null
          description?: string | null
          documentation_path?: string | null
          edge_functions?: string[] | null
          id?: string | null
          logical_owner?: string | null
          metadata?: Json | null
          module_key?: string | null
          name?: string | null
          primary_tables?: string[] | null
          produced_events?: string[] | null
          provided_capabilities?: string[] | null
          required_permissions?: string[] | null
          routes?: string[] | null
          rpc_functions?: string[] | null
          status?: string | null
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          can_be_disabled?: boolean | null
          consumed_events?: string[] | null
          contract_version?: string | null
          created_at?: string | null
          created_by?: string | null
          dependencies?: string[] | null
          description?: string | null
          documentation_path?: string | null
          edge_functions?: string[] | null
          id?: string | null
          logical_owner?: string | null
          metadata?: Json | null
          module_key?: string | null
          name?: string | null
          primary_tables?: string[] | null
          produced_events?: string[] | null
          provided_capabilities?: string[] | null
          required_permissions?: string[] | null
          routes?: string[] | null
          rpc_functions?: string[] | null
          status?: string | null
          updated_at?: string | null
          version?: string | null
        }
        Relationships: []
      }
      admin_platform_extension_overview: {
        Row: {
          active_capabilities_count: number | null
          active_events_count: number | null
          active_flags_count: number | null
          active_modules_count: number | null
          active_tasks_count: number | null
          documented_edge_functions_count: number | null
          documented_rpc_count: number | null
          modules_count: number | null
        }
        Relationships: []
      }
      admin_platform_feature_flags: {
        Row: {
          allowed_roles: string[] | null
          allowed_user_ids: string[] | null
          created_at: string | null
          created_by: string | null
          description: string | null
          eligibility_rules: Json | null
          environment: string | null
          flag_key: string | null
          id: string | null
          metadata: Json | null
          module_key: string | null
          rollout_percent: number | null
          status: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          allowed_roles?: string[] | null
          allowed_user_ids?: string[] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          eligibility_rules?: Json | null
          environment?: string | null
          flag_key?: string | null
          id?: string | null
          metadata?: Json | null
          module_key?: string | null
          rollout_percent?: number | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          allowed_roles?: string[] | null
          allowed_user_ids?: string[] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          eligibility_rules?: Json | null
          environment?: string | null
          flag_key?: string | null
          id?: string | null
          metadata?: Json | null
          module_key?: string | null
          rollout_percent?: number | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_feature_flags_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "admin_platform_dependency_map"
            referencedColumns: ["module_key"]
          },
          {
            foreignKeyName: "platform_feature_flags_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "admin_platform_extension_modules"
            referencedColumns: ["module_key"]
          },
          {
            foreignKeyName: "platform_feature_flags_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "platform_extension_modules"
            referencedColumns: ["module_key"]
          },
        ]
      }
      admin_platform_observability_metric_trends: {
        Row: {
          avg_value: number | null
          bucket_hour: string | null
          component_type: string | null
          max_value: number | null
          metric_name: string | null
          samples_count: number | null
          service_code: string | null
        }
        Relationships: []
      }
      admin_platform_observability_overview: {
        Row: {
          critical_alert_count: number | null
          errors_24h: number | null
          failed_runs_24h: number | null
          high_alert_count: number | null
          last_scan_at: string | null
          logs_24h: number | null
          open_alert_count: number | null
          platform_health_score: number | null
          runs_24h: number | null
          service_count: number | null
        }
        Relationships: []
      }
      admin_platform_observability_queue_health: {
        Row: {
          metadata: Json | null
          metric_name: string | null
          metric_value: number | null
          observed_at: string | null
          service_code: string | null
          severity: string | null
          status: string | null
        }
        Insert: {
          metadata?: Json | null
          metric_name?: string | null
          metric_value?: number | null
          observed_at?: string | null
          service_code?: string | null
          severity?: string | null
          status?: string | null
        }
        Update: {
          metadata?: Json | null
          metric_name?: string | null
          metric_value?: number | null
          observed_at?: string | null
          service_code?: string | null
          severity?: string | null
          status?: string | null
        }
        Relationships: []
      }
      admin_platform_observability_recent_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_key: string | null
          component_name: string | null
          component_type: string | null
          created_at: string | null
          diagnosis: string | null
          evidence: Json | null
          id: string | null
          metric_name: string | null
          metric_value: number | null
          opened_at: string | null
          probable_causes: Json | null
          recommendations: Json | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          rule_id: string | null
          service_code: string | null
          service_id: string | null
          severity: string | null
          status: string | null
          threshold: number | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_key?: string | null
          component_name?: string | null
          component_type?: string | null
          created_at?: string | null
          diagnosis?: string | null
          evidence?: Json | null
          id?: string | null
          metric_name?: string | null
          metric_value?: number | null
          opened_at?: string | null
          probable_causes?: Json | null
          recommendations?: Json | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          rule_id?: string | null
          service_code?: string | null
          service_id?: string | null
          severity?: string | null
          status?: string | null
          threshold?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_key?: string | null
          component_name?: string | null
          component_type?: string | null
          created_at?: string | null
          diagnosis?: string | null
          evidence?: Json | null
          id?: string | null
          metric_name?: string | null
          metric_value?: number | null
          opened_at?: string | null
          probable_causes?: Json | null
          recommendations?: Json | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          rule_id?: string | null
          service_code?: string | null
          service_id?: string | null
          severity?: string | null
          status?: string | null
          threshold?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_observability_alerts_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "platform_observability_alert_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_observability_alerts_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "admin_platform_observability_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_observability_alerts_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "platform_observability_services"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_platform_observability_recent_logs: {
        Row: {
          actor_id: string | null
          component_name: string | null
          component_type: string | null
          context: Json | null
          correlation_id: string | null
          created_at: string | null
          event_type: string | null
          id: string | null
          message: string | null
          service_code: string | null
          service_id: string | null
          severity: string | null
        }
        Insert: {
          actor_id?: string | null
          component_name?: string | null
          component_type?: string | null
          context?: Json | null
          correlation_id?: string | null
          created_at?: string | null
          event_type?: string | null
          id?: string | null
          message?: string | null
          service_code?: string | null
          service_id?: string | null
          severity?: string | null
        }
        Update: {
          actor_id?: string | null
          component_name?: string | null
          component_type?: string | null
          context?: Json | null
          correlation_id?: string | null
          created_at?: string | null
          event_type?: string | null
          id?: string | null
          message?: string | null
          service_code?: string | null
          service_id?: string | null
          severity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_observability_logs_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "admin_platform_observability_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_observability_logs_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "platform_observability_services"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_platform_observability_services: {
        Row: {
          category: string | null
          code: string | null
          created_at: string | null
          description: string | null
          health_thresholds: Json | null
          id: string | null
          is_active: boolean | null
          last_metric_name: string | null
          last_metric_severity: string | null
          last_metric_status: string | null
          last_metric_value: number | null
          last_observed_at: string | null
          metadata: Json | null
          name: string | null
          open_alert_count: number | null
          owner_module: string | null
          retention_days: number | null
          updated_at: string | null
        }
        Relationships: []
      }
      admin_platform_scheduled_tasks: {
        Row: {
          alert_policy: Json | null
          created_at: string | null
          description: string | null
          frequency: string | null
          id: string | null
          idempotency_policy: string | null
          invoked_function: string | null
          metrics: Json | null
          module_key: string | null
          module_name: string | null
          retry_policy: Json | null
          status: string | null
          task_key: string | null
          timeout_ms: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_scheduled_task_registry_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "admin_platform_dependency_map"
            referencedColumns: ["module_key"]
          },
          {
            foreignKeyName: "platform_scheduled_task_registry_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "admin_platform_extension_modules"
            referencedColumns: ["module_key"]
          },
          {
            foreignKeyName: "platform_scheduled_task_registry_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "platform_extension_modules"
            referencedColumns: ["module_key"]
          },
        ]
      }
      admin_product_cost_import_template: {
        Row: {
          autres_frais: number | null
          commentaire: string | null
          date_effet: string | null
          devise: string | null
          fournisseur: string | null
          frais_douane: number | null
          frais_transport: number | null
          nom_produit: string | null
          prix_achat: number | null
          sku: string | null
        }
        Insert: {
          autres_frais?: never
          commentaire?: never
          date_effet?: never
          devise?: never
          fournisseur?: never
          frais_douane?: never
          frais_transport?: never
          nom_produit?: string | null
          prix_achat?: never
          sku?: never
        }
        Update: {
          autres_frais?: never
          commentaire?: never
          date_effet?: never
          devise?: never
          fournisseur?: never
          frais_douane?: never
          frais_transport?: never
          nom_produit?: string | null
          prix_achat?: never
          sku?: never
        }
        Relationships: []
      }
      admin_product_cost_validation_report: {
        Row: {
          category_name: string | null
          correction_bucket: string | null
          correction_priority: number | null
          estimated_margin: number | null
          estimated_margin_percent: number | null
          issues: string[] | null
          last_sold_at: string | null
          name: string | null
          product_id: string | null
          purchase_price: number | null
          recent_revenue: number | null
          recent_sales_count: number | null
          recent_units_sold: number | null
          sale_price: number | null
          sku: string | null
          sold_recently_without_reliable_cost: boolean | null
          stock_quantity: number | null
        }
        Relationships: []
      }
      admin_products_secure: {
        Row: {
          alcohol_percentage: number | null
          available_as_case: boolean | null
          average_rating: number | null
          case_price: number | null
          category: Json | null
          category_id: string | null
          created_at: string | null
          description: string | null
          embedding: string | null
          embedding_source: string | null
          embedding_updated_at: string | null
          food_pairing: string | null
          gallery_urls: string[] | null
          grape_variety: string | null
          id: string | null
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          low_stock_threshold: number | null
          markup_percent_override: number | null
          moderation_status:
            | Database["public"]["Enums"]["product_moderation_status"]
            | null
          name: string | null
          origin_country: string | null
          original_price: number | null
          points_override: number | null
          points_tiers_override: Json | null
          price: number | null
          purchase_price: number | null
          region: string | null
          review_count: number | null
          serving_temperature: string | null
          short_description: string | null
          sku: string | null
          slug: string | null
          stock_quantity: number | null
          tasting_notes: string | null
          units_per_case: number | null
          updated_at: string | null
          vendor_id: string | null
          vintage_year: number | null
          volume_ml: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_promo_code_anomalies: {
        Row: {
          anomaly_codes: string[] | null
          code: string | null
          discount_amount: number | null
          guest_identity_hash: string | null
          metadata: Json | null
          order_id: string | null
          order_number: string | null
          order_status: Database["public"]["Enums"]["order_status"] | null
          order_subtotal: number | null
          order_total: number | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          promo_code_id: string | null
          redeemed_at: string | null
          redemption_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "admin_finance_overview"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "promo_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_redemptions_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      advisor_academy_certifications: {
        Row: {
          certificate_code: string | null
          certification_id: string | null
          description: string | null
          issued_at: string | null
          minimum_score: number | null
          requires_manual_validation: boolean | null
          score: number | null
          slug: string | null
          title: string | null
          user_status: string | null
        }
        Relationships: []
      }
      advisor_academy_dashboard: {
        Row: {
          completed_at: string | null
          course_id: string | null
          course_type: string | null
          description: string | null
          estimated_minutes: number | null
          level: string | null
          pass_score: number | null
          path_id: string | null
          path_slug: string | null
          path_title: string | null
          progress_percent: number | null
          score: number | null
          skills: string[] | null
          slug: string | null
          sort_order: number | null
          started_at: string | null
          title: string | null
          user_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academy_courses_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "academy_learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_academy_summary: {
        Row: {
          completed_courses: number | null
          global_progress_percent: number | null
          in_progress_courses: number | null
          issued_certifications: number | null
          pending_certifications: number | null
          skills_acquired: string[] | null
          total_courses: number | null
          user_id: string | null
        }
        Relationships: []
      }
      advisor_ai_goal_source_context: {
        Row: {
          active_commercial_opportunities: number | null
          advisor_id: string | null
          advisor_level: string | null
          availability: string | null
          business_score: number | null
          crm_contacts_total: number | null
          crm_hot_opportunities: number | null
          crm_tasks_due: number | null
          opportunity_preview: Json | null
          specialties: string[] | null
          trust_score: number | null
        }
        Relationships: []
      }
      advisor_ai_goals_dashboard: {
        Row: {
          advisor_id: string | null
          ai_rationale: Json | null
          ai_suggestion: string | null
          cadence: string | null
          completed_at: string | null
          created_at: string | null
          current_value: number | null
          description: string | null
          difficulty: string | null
          due_at: string | null
          goal_type: string | null
          id: string | null
          priority: string | null
          progress_percent: number | null
          reward_hint: Json | null
          source_context: Json | null
          source_event_id: string | null
          source_event_name: string | null
          starts_at: string | null
          status: string | null
          target_metric: string | null
          target_value: number | null
          template_id: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advisor_goal_assignments_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "advisor_goal_assignments_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "admin_commercial_opportunity_calendar_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_goal_assignments_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "advisor_commercial_opportunity_calendar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_goal_assignments_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "commercial_opportunity_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_goal_assignments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "admin_ai_goals_effectiveness_report"
            referencedColumns: ["template_id"]
          },
          {
            foreignKeyName: "advisor_goal_assignments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "advisor_goal_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_ai_goals_summary: {
        Row: {
          advisor_id: string | null
          average_progress: number | null
          completed_total: number | null
          daily_remaining: number | null
          overdue_total: number | null
          remaining_total: number | null
          weekly_remaining: number | null
        }
        Relationships: []
      }
      advisor_coach_script_library: {
        Row: {
          content: string | null
          created_at: string | null
          id: string | null
          is_active: boolean | null
          script_type: string | null
          title: string | null
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          script_type?: string | null
          title?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          script_type?: string | null
          title?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
      advisor_commercial_asset_dashboard: {
        Row: {
          archived_at: string | null
          asset_type: string | null
          brief: string | null
          click_count: number | null
          content_text: string | null
          conversion_count: number | null
          created_at: string | null
          export_formats: string[] | null
          exports: Json | null
          html_preview: string | null
          id: string | null
          official_image_urls: string[] | null
          owner_id: string | null
          personalization: Json | null
          recommended_products: Json | null
          share_count: number | null
          source_context: Json | null
          status: string | null
          template_id: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          archived_at?: string | null
          asset_type?: string | null
          brief?: string | null
          click_count?: never
          content_text?: string | null
          conversion_count?: never
          created_at?: string | null
          export_formats?: string[] | null
          exports?: never
          html_preview?: string | null
          id?: string | null
          official_image_urls?: string[] | null
          owner_id?: string | null
          personalization?: Json | null
          recommended_products?: Json | null
          share_count?: never
          source_context?: Json | null
          status?: string | null
          template_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          archived_at?: string | null
          asset_type?: string | null
          brief?: string | null
          click_count?: never
          content_text?: string | null
          conversion_count?: never
          created_at?: string | null
          export_formats?: string[] | null
          exports?: never
          html_preview?: string | null
          id?: string | null
          official_image_urls?: string[] | null
          owner_id?: string | null
          personalization?: Json | null
          recommended_products?: Json | null
          share_count?: never
          source_context?: Json | null
          status?: string | null
          template_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commercial_asset_generations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "advisor_commercial_asset_template_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_asset_generations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "commercial_asset_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_commercial_asset_template_library: {
        Row: {
          allowed_export_formats: string[] | null
          created_at: string | null
          default_tone: string | null
          description: string | null
          id: string | null
          is_active: boolean | null
          is_official: boolean | null
          occasion: string | null
          target_audience: string | null
          template_type: string | null
          title: string | null
        }
        Insert: {
          allowed_export_formats?: string[] | null
          created_at?: string | null
          default_tone?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          is_official?: boolean | null
          occasion?: string | null
          target_audience?: string | null
          template_type?: string | null
          title?: string | null
        }
        Update: {
          allowed_export_formats?: string[] | null
          created_at?: string | null
          default_tone?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          is_official?: boolean | null
          occasion?: string | null
          target_audience?: string | null
          template_type?: string | null
          title?: string | null
        }
        Relationships: []
      }
      advisor_commercial_mission_board: {
        Row: {
          advisor_id: string | null
          ai_prompt_context: Json | null
          campaign_id: string | null
          created_at: string | null
          description: string | null
          due_at: string | null
          event_id: string | null
          event_name: string | null
          id: string | null
          mission_type: string | null
          priority: string | null
          status: string | null
          success_criteria: Json | null
          suggested_cities: string[] | null
          suggested_client_types: string[] | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commercial_opportunity_missions_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "commercial_opportunity_missions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "commercial_opportunity_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_opportunity_missions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "admin_commercial_opportunity_calendar_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_opportunity_missions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "advisor_commercial_opportunity_calendar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_opportunity_missions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "commercial_opportunity_events"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_commercial_opportunity_calendar: {
        Row: {
          ai_brief: Json | null
          category: string | null
          commercial_objective: string | null
          description: string | null
          ends_at: string | null
          event_type: string | null
          id: string | null
          marketing_asset_requirements: Json | null
          missions: Json | null
          name: string | null
          priority: string | null
          recommended_actions: Json | null
          recommended_categories: Json | null
          recommended_products: Json | null
          recurrence_rule: Json | null
          slug: string | null
          starts_at: string | null
          status: string | null
          target_cities: string[] | null
          target_client_types: string[] | null
          target_regions: string[] | null
        }
        Relationships: []
      }
      advisor_conversation_coach_dashboard: {
        Row: {
          advisor_id: string | null
          analysis_summary: Json | null
          archived_at: string | null
          contact_id: string | null
          conversation_text: string | null
          created_at: string | null
          detected_budget: number | null
          detected_city: string | null
          detected_customer_type: string | null
          detected_intent: string | null
          detected_objections: string[] | null
          detected_occasion: string | null
          detected_people_count: number | null
          detected_risk_flags: string[] | null
          detected_urgency: string | null
          id: string | null
          latest_feedback: Json | null
          mode: string | null
          recommendations: Json | null
          response_variants: Json | null
          source_channel: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          advisor_id?: string | null
          analysis_summary?: Json | null
          archived_at?: string | null
          contact_id?: string | null
          conversation_text?: string | null
          created_at?: string | null
          detected_budget?: number | null
          detected_city?: string | null
          detected_customer_type?: string | null
          detected_intent?: string | null
          detected_objections?: string[] | null
          detected_occasion?: string | null
          detected_people_count?: number | null
          detected_risk_flags?: string[] | null
          detected_urgency?: string | null
          id?: string | null
          latest_feedback?: never
          mode?: string | null
          recommendations?: never
          response_variants?: never
          source_channel?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          advisor_id?: string | null
          analysis_summary?: Json | null
          archived_at?: string | null
          contact_id?: string | null
          conversation_text?: string | null
          created_at?: string | null
          detected_budget?: number | null
          detected_city?: string | null
          detected_customer_type?: string | null
          detected_intent?: string | null
          detected_objections?: string[] | null
          detected_occasion?: string | null
          detected_people_count?: number | null
          detected_risk_flags?: string[] | null
          detected_urgency?: string | null
          id?: string | null
          latest_feedback?: never
          mode?: string | null
          recommendations?: never
          response_variants?: never
          source_channel?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_conversation_sessions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_order_summary"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "coach_conversation_sessions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_conversation_sessions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_duplicate_candidates"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "coach_conversation_sessions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_duplicate_candidates"
            referencedColumns: ["possible_duplicate_contact_id"]
          },
        ]
      }
      business_assistant_source_context: {
        Row: {
          academy_completed_total: number | null
          academy_in_progress_total: number | null
          active_commercial_opportunities: number | null
          asset_shares_7d: number | null
          assets_generated_7d: number | null
          available_products: number | null
          business_score: number | null
          certifications_total: number | null
          crm_contacts_total: number | null
          crm_tasks_due: number | null
          customers_active: number | null
          daily_goals_remaining: number | null
          dormant_contacts: number | null
          featured_products: number | null
          generated_at: string | null
          global_score: number | null
          goals_completed_total: number | null
          hot_opportunities: number | null
          improvement_areas: string[] | null
          overdue_goals: number | null
          priority_opportunities: number | null
          prospects_active: number | null
          score_level: string | null
          strengths: string[] | null
          trust_score: number | null
          user_id: string | null
          weekly_goals_remaining: number | null
        }
        Relationships: []
      }
      crm_contact_order_summary: {
        Row: {
          average_order_total: number | null
          contact_id: string | null
          last_order_at: string | null
          last_shipping_city: string | null
          order_count: number | null
          recent_orders: Json | null
          total_revenue: number | null
        }
        Relationships: []
      }
      crm_dashboard_summary: {
        Row: {
          company_contacts: number | null
          contacts_total: number | null
          customers_active: number | null
          dormant_contacts: number | null
          duplicate_candidates: number | null
          hot_opportunities: number | null
          prospects_active: number | null
          tasks_due: number | null
          viewer_id: string | null
        }
        Relationships: []
      }
      crm_duplicate_candidates: {
        Row: {
          contact_id: string | null
          duplicate_reason: string | null
          owner_advisor_id: string | null
          possible_duplicate_contact_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_owner_advisor_id_fkey"
            columns: ["owner_advisor_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      customer_order_accounting_summary: {
        Row: {
          amount_excluding_tax: number | null
          amount_including_tax: number | null
          captured_amount: number | null
          created_at: string | null
          currency: string | null
          delivery_fee: number | null
          discount_amount: number | null
          guest_email: string | null
          order_id: string | null
          order_number: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          refunded_amount: number | null
          service_fee: number | null
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal: number | null
          tax_amount: number | null
          tax_rate: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_accounting_snapshots_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "admin_finance_overview"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_accounting_snapshots_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_order_items: {
        Row: {
          created_at: string | null
          id: string | null
          order_id: string | null
          product_id: string | null
          product_image: string | null
          product_name: string | null
          quantity: number | null
          total_price: number | null
          unit_price: number | null
          vendor_id: string | null
          vendor_status:
            | Database["public"]["Enums"]["vendor_fulfillment_status"]
            | null
          vendor_updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          order_id?: string | null
          product_id?: string | null
          product_image?: string | null
          product_name?: string | null
          quantity?: number | null
          total_price?: number | null
          unit_price?: number | null
          vendor_id?: string | null
          vendor_status?:
            | Database["public"]["Enums"]["vendor_fulfillment_status"]
            | null
          vendor_updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          order_id?: string | null
          product_id?: string | null
          product_image?: string | null
          product_name?: string | null
          quantity?: number | null
          total_price?: number | null
          unit_price?: number | null
          vendor_id?: string | null
          vendor_status?:
            | Database["public"]["Enums"]["vendor_fulfillment_status"]
            | null
          vendor_updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "admin_finance_overview"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "order_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "order_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      developer_extension_marketplace_my_extensions: {
        Row: {
          category: string | null
          compatibility_policy: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          documentation_url: string | null
          extension_key: string | null
          icon_url: string | null
          id: string | null
          license: string | null
          listing_status: string | null
          metadata: Json | null
          minimum_platform_version: string | null
          name: string | null
          publisher_id: string | null
          publisher_name: string | null
          support_url: string | null
          updated_at: string | null
          visibility: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extension_marketplace_extensions_publisher_id_fkey"
            columns: ["publisher_id"]
            isOneToOne: false
            referencedRelation: "extension_marketplace_publishers"
            referencedColumns: ["id"]
          },
        ]
      }
      developer_portal_changelog: {
        Row: {
          affected_modules: string[] | null
          description: string | null
          entry_key: string | null
          entry_type: string | null
          id: string | null
          impact_level: string | null
          metadata: Json | null
          published_at: string | null
          title: string | null
          version: string | null
        }
        Insert: {
          affected_modules?: string[] | null
          description?: string | null
          entry_key?: string | null
          entry_type?: string | null
          id?: string | null
          impact_level?: string | null
          metadata?: Json | null
          published_at?: string | null
          title?: string | null
          version?: string | null
        }
        Update: {
          affected_modules?: string[] | null
          description?: string | null
          entry_key?: string | null
          entry_type?: string | null
          id?: string | null
          impact_level?: string | null
          metadata?: Json | null
          published_at?: string | null
          title?: string | null
          version?: string | null
        }
        Relationships: []
      }
      developer_portal_docs_catalog: {
        Row: {
          item_key: string | null
          item_type: string | null
          section: string | null
          source_module_key: string | null
          status: string | null
          summary: string | null
          title: string | null
          updated_at: string | null
          version: string | null
          visibility: string | null
        }
        Relationships: []
      }
      developer_portal_my_api_keys: {
        Row: {
          allowed_endpoint_keys: string[] | null
          allowed_modules: string[] | null
          app_id: string | null
          app_key: string | null
          created_at: string | null
          expires_at: string | null
          id: string | null
          key_name: string | null
          key_prefix: string | null
          last_used_at: string | null
          owner_label: string | null
          status: string | null
        }
        Insert: {
          allowed_endpoint_keys?: string[] | null
          allowed_modules?: string[] | null
          app_id?: never
          app_key?: never
          created_at?: string | null
          expires_at?: string | null
          id?: string | null
          key_name?: string | null
          key_prefix?: string | null
          last_used_at?: string | null
          owner_label?: string | null
          status?: string | null
        }
        Update: {
          allowed_endpoint_keys?: string[] | null
          allowed_modules?: string[] | null
          app_id?: never
          app_key?: never
          created_at?: string | null
          expires_at?: string | null
          id?: string | null
          key_name?: string | null
          key_prefix?: string | null
          last_used_at?: string | null
          owner_label?: string | null
          status?: string | null
        }
        Relationships: []
      }
      developer_portal_my_apps: {
        Row: {
          allowed_endpoint_keys: string[] | null
          allowed_modules: string[] | null
          app_key: string | null
          app_name: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          environment: string | null
          id: string | null
          metadata: Json | null
          owner_user_id: string | null
          quota_per_day: number | null
          quota_per_minute: number | null
          status: string | null
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          allowed_endpoint_keys?: string[] | null
          allowed_modules?: string[] | null
          app_key?: string | null
          app_name?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          environment?: string | null
          id?: string | null
          metadata?: Json | null
          owner_user_id?: string | null
          quota_per_day?: number | null
          quota_per_minute?: number | null
          status?: string | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          allowed_endpoint_keys?: string[] | null
          allowed_modules?: string[] | null
          app_key?: string | null
          app_name?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          environment?: string | null
          id?: string | null
          metadata?: Json | null
          owner_user_id?: string | null
          quota_per_day?: number | null
          quota_per_minute?: number | null
          status?: string | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      developer_portal_openapi: {
        Row: {
          spec: Json | null
        }
        Relationships: []
      }
      developer_portal_overview: {
        Row: {
          app_count: number | null
          capability_count: number | null
          docs_count: number | null
          documented_api_count: number | null
          event_count: number | null
          sandbox_runs_count: number | null
          sdk_count: number | null
        }
        Relationships: []
      }
      developer_portal_sandbox_runs_view: {
        Row: {
          actor_user_id: string | null
          app_id: string | null
          app_key: string | null
          app_name: string | null
          created_at: string | null
          error_code: string | null
          id: string | null
          latency_ms: number | null
          request_payload: Json | null
          response_payload: Json | null
          scenario_key: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "developer_portal_sandbox_runs_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "admin_developer_portal_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "developer_portal_sandbox_runs_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "developer_portal_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "developer_portal_sandbox_runs_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "developer_portal_my_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      developer_portal_sdk_packages_view: {
        Row: {
          capabilities: string[] | null
          created_at: string | null
          documentation_path: string | null
          error_model: Json | null
          examples: Json | null
          id: string | null
          language: string | null
          metadata: Json | null
          package_name: string | null
          repository_path: string | null
          sdk_key: string | null
          status: string | null
          updated_at: string | null
          version: string | null
        }
        Insert: {
          capabilities?: string[] | null
          created_at?: string | null
          documentation_path?: string | null
          error_model?: Json | null
          examples?: Json | null
          id?: string | null
          language?: string | null
          metadata?: Json | null
          package_name?: string | null
          repository_path?: string | null
          sdk_key?: string | null
          status?: string | null
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          capabilities?: string[] | null
          created_at?: string | null
          documentation_path?: string | null
          error_model?: Json | null
          examples?: Json | null
          id?: string | null
          language?: string | null
          metadata?: Json | null
          package_name?: string | null
          repository_path?: string | null
          sdk_key?: string | null
          status?: string | null
          updated_at?: string | null
          version?: string | null
        }
        Relationships: []
      }
      marketplace_image_studio_dashboard: {
        Row: {
          auto_correct_publish_decisions: number | null
          auto_publish_decisions: number | null
          average_compliance_score: number | null
          blocked: number | null
          in_pipeline: number | null
          manual_review_decisions: number | null
          pending_admin_review: number | null
          published: number | null
          reject_decisions: number | null
          total_jobs: number | null
        }
        Relationships: []
      }
      monthly_leaderboard: {
        Row: {
          avatar_url: string | null
          badge_color: string | null
          current_rank: Database["public"]["Enums"]["ambassador_rank"] | null
          first_name: string | null
          last_name: string | null
          monthly_earnings: number | null
          monthly_orders: number | null
          new_referrals: number | null
          rank_position: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_beneficiary_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "advisor_ai_goal_source_context"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      my_business_assistant_alerts: {
        Row: {
          alert_type: string | null
          created_at: string | null
          description: string | null
          explanation: Json | null
          id: string | null
          severity: string | null
          source_entity_id: string | null
          source_entity_type: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          alert_type?: string | null
          created_at?: string | null
          description?: string | null
          explanation?: Json | null
          id?: string | null
          severity?: string | null
          source_entity_id?: string | null
          source_entity_type?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          alert_type?: string | null
          created_at?: string | null
          description?: string | null
          explanation?: Json | null
          id?: string | null
          severity?: string | null
          source_entity_id?: string | null
          source_entity_type?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      my_business_assistant_dashboard: {
        Row: {
          assistant_version: string | null
          created_at: string | null
          data_used: Json | null
          id: string | null
          next_best_actions: Json | null
          period: string | null
          recommended_campaigns: Json | null
          recommended_courses: Json | null
          recommended_products: Json | null
          rules_applied: Json | null
          strengths: string[] | null
          summary_text: string | null
          summary_title: string | null
          user_id: string | null
          weaknesses: string[] | null
        }
        Relationships: []
      }
      my_business_assistant_qa_history: {
        Row: {
          answer: string | null
          confidence: number | null
          created_at: string | null
          data_used: Json | null
          id: string | null
          intent: string | null
          question: string | null
          recommended_actions: Json | null
          rules_applied: Json | null
          user_id: string | null
        }
        Insert: {
          answer?: string | null
          confidence?: number | null
          created_at?: string | null
          data_used?: Json | null
          id?: string | null
          intent?: string | null
          question?: string | null
          recommended_actions?: Json | null
          rules_applied?: Json | null
          user_id?: string | null
        }
        Update: {
          answer?: string | null
          confidence?: number | null
          created_at?: string | null
          data_used?: Json | null
          id?: string | null
          intent?: string | null
          question?: string | null
          recommended_actions?: Json | null
          rules_applied?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      my_business_assistant_recommendations: {
        Row: {
          created_at: string | null
          data_used: Json | null
          description: string | null
          due_at: string | null
          expected_impact: Json | null
          explanation: Json | null
          id: string | null
          priority: string | null
          recommendation_type: string | null
          rules_applied: Json | null
          snapshot_id: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data_used?: Json | null
          description?: string | null
          due_at?: string | null
          expected_impact?: Json | null
          explanation?: Json | null
          id?: string | null
          priority?: string | null
          recommendation_type?: string | null
          rules_applied?: Json | null
          snapshot_id?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data_used?: Json | null
          description?: string | null
          due_at?: string | null
          expected_impact?: Json | null
          explanation?: Json | null
          id?: string | null
          priority?: string | null
          recommendation_type?: string | null
          rules_applied?: Json | null
          snapshot_id?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_assistant_recommendations_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "business_assistant_context_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_assistant_recommendations_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "my_business_assistant_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      my_business_assistant_summaries: {
        Row: {
          content: string | null
          created_at: string | null
          created_by: string | null
          id: string | null
          metrics: Json | null
          period_end: string | null
          period_start: string | null
          recommendations: Json | null
          summary_type: string | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          metrics?: Json | null
          period_end?: string | null
          period_start?: string | null
          recommendations?: Json | null
          summary_type?: string | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          metrics?: Json | null
          period_end?: string | null
          period_start?: string | null
          recommendations?: Json | null
          summary_type?: string | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      my_business_score_badges: {
        Row: {
          badge_type: string | null
          description: string | null
          earned_at: string | null
          reason: string | null
          slug: string | null
          status: string | null
          title: string | null
          user_id: string | null
        }
        Relationships: []
      }
      my_business_score_recommendations: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          metadata: Json | null
          priority: string | null
          recommendation_type: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          metadata?: Json | null
          priority?: string | null
          recommendation_type?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          metadata?: Json | null
          priority?: string | null
          recommendation_type?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      my_business_trust_score_dashboard: {
        Row: {
          business_score: number | null
          calculated_at: string | null
          display_name: string | null
          global_score: number | null
          improvement_areas: string[] | null
          metrics: Json | null
          profile_type: string | null
          recommendations: Json | null
          rule_version: string | null
          score_level: string | null
          scoring_version: string | null
          strengths: string[] | null
          trust_score: number | null
          user_id: string | null
        }
        Relationships: []
      }
      my_catalogue_enrichment_proposals: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          created_by: string | null
          current_value: Json | null
          explanation: string | null
          id: string | null
          product_id: string | null
          product_image_url: string | null
          product_name: string | null
          proposal_type: string | null
          proposed_value: Json | null
          quality_snapshot_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          updated_at: string | null
          vendor_owner_id: string | null
          vendor_shop_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalogue_ai_enrichment_proposals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "catalogue_ai_enrichment_proposals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "catalogue_ai_enrichment_proposals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_ai_enrichment_proposals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_ai_enrichment_proposals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_ai_enrichment_proposals_quality_snapshot_id_fkey"
            columns: ["quality_snapshot_id"]
            isOneToOne: false
            referencedRelation: "catalogue_product_quality_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_ai_enrichment_proposals_quality_snapshot_id_fkey"
            columns: ["quality_snapshot_id"]
            isOneToOne: false
            referencedRelation: "my_catalogue_quality_latest"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_ai_enrichment_proposals_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "catalogue_ai_enrichment_proposals_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "catalogue_ai_enrichment_proposals_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      my_catalogue_quality_latest: {
        Row: {
          analyzed_at: string | null
          analyzed_by: string | null
          attribute_score: number | null
          brand_score: number | null
          catalogue_quality_score: number | null
          category_score: number | null
          completeness_score: number | null
          consistency_score: number | null
          created_at: string | null
          duplicate_signals: Json | null
          engine_version: string | null
          id: string | null
          image_score: number | null
          missing_attributes: string[] | null
          normalization_issues: string[] | null
          product_id: string | null
          product_image_url: string | null
          product_name: string | null
          product_price: number | null
          product_slug: string | null
          seo_score: number | null
          suggested_attributes: Json | null
          suggested_brand_id: string | null
          suggested_taxonomy_id: string | null
          variant_score: number | null
          vendor_owner_id: string | null
          vendor_shop_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalogue_product_quality_snapshots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "catalogue_product_quality_snapshots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "catalogue_product_quality_snapshots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_product_quality_snapshots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_product_quality_snapshots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_product_quality_snapshots_suggested_brand_id_fkey"
            columns: ["suggested_brand_id"]
            isOneToOne: false
            referencedRelation: "catalogue_brand_references"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_product_quality_snapshots_suggested_taxonomy_id_fkey"
            columns: ["suggested_taxonomy_id"]
            isOneToOne: false
            referencedRelation: "catalogue_category_taxonomy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_product_quality_snapshots_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "catalogue_product_quality_snapshots_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "catalogue_product_quality_snapshots_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      my_marketplace_analytics_alerts: {
        Row: {
          alert_type: string | null
          created_at: string | null
          description: string | null
          engine_version: string | null
          id: string | null
          metadata: Json | null
          metric_value: number | null
          severity: string | null
          shop_name: string | null
          snapshot_id: string | null
          status: string | null
          threshold_value: number | null
          title: string | null
          vendor_owner_id: string | null
          vendor_shop_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_analytics_alerts_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_analytics_shop_rankings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_analytics_alerts_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "marketplace_analytics_daily_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_analytics_alerts_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_analytics_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_analytics_alerts_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_analytics_trends"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_analytics_alerts_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_analytics_alerts_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_analytics_alerts_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      my_marketplace_analytics_dashboard: {
        Row: {
          active_product_count: number | null
          alerts: Json | null
          approved_enrichments_count: number | null
          avg_catalogue_quality_score: number | null
          avg_coach_score: number | null
          avg_completeness_score: number | null
          avg_discoverability_score: number | null
          avg_image_score: number | null
          avg_seo_score: number | null
          calculated_at: string | null
          calculated_by: string | null
          created_at: string | null
          duplicate_candidates_count: number | null
          engine_version: string | null
          id: string | null
          low_visibility_products: Json | null
          low_visibility_products_count: number | null
          marketplace_health_score: number | null
          new_products_count: number | null
          pending_catalogue_proposals_count: number | null
          pending_image_reviews_count: number | null
          pending_recommendations_count: number | null
          pending_seo_proposals_count: number | null
          product_count: number | null
          products_to_enrich_count: number | null
          rejected_images_count: number | null
          shop_name: string | null
          snapshot_date: string | null
          source_counts: Json | null
          top_brands: Json | null
          top_categories: Json | null
          vendor_owner_id: string | null
          vendor_shop_id: string | null
          visibility_score: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_analytics_daily_snapshots_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_analytics_daily_snapshots_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_analytics_daily_snapshots_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      my_marketplace_analytics_trends: {
        Row: {
          active_product_count: number | null
          alerts: Json | null
          approved_enrichments_count: number | null
          avg_catalogue_quality_score: number | null
          avg_coach_score: number | null
          avg_completeness_score: number | null
          avg_discoverability_score: number | null
          avg_image_score: number | null
          avg_seo_score: number | null
          calculated_at: string | null
          calculated_by: string | null
          created_at: string | null
          duplicate_candidates_count: number | null
          engine_version: string | null
          id: string | null
          low_visibility_products: Json | null
          low_visibility_products_count: number | null
          marketplace_health_score: number | null
          new_products_count: number | null
          pending_catalogue_proposals_count: number | null
          pending_image_reviews_count: number | null
          pending_recommendations_count: number | null
          pending_seo_proposals_count: number | null
          product_count: number | null
          products_to_enrich_count: number | null
          rejected_images_count: number | null
          shop_name: string | null
          snapshot_date: string | null
          source_counts: Json | null
          top_brands: Json | null
          top_categories: Json | null
          vendor_owner_id: string | null
          vendor_shop_id: string | null
          visibility_score: number | null
        }
        Insert: {
          active_product_count?: number | null
          alerts?: Json | null
          approved_enrichments_count?: number | null
          avg_catalogue_quality_score?: number | null
          avg_coach_score?: number | null
          avg_completeness_score?: number | null
          avg_discoverability_score?: number | null
          avg_image_score?: number | null
          avg_seo_score?: number | null
          calculated_at?: string | null
          calculated_by?: string | null
          created_at?: string | null
          duplicate_candidates_count?: number | null
          engine_version?: string | null
          id?: string | null
          low_visibility_products?: Json | null
          low_visibility_products_count?: number | null
          marketplace_health_score?: number | null
          new_products_count?: number | null
          pending_catalogue_proposals_count?: number | null
          pending_image_reviews_count?: number | null
          pending_recommendations_count?: number | null
          pending_seo_proposals_count?: number | null
          product_count?: number | null
          products_to_enrich_count?: number | null
          rejected_images_count?: number | null
          shop_name?: string | null
          snapshot_date?: string | null
          source_counts?: Json | null
          top_brands?: Json | null
          top_categories?: Json | null
          vendor_owner_id?: string | null
          vendor_shop_id?: string | null
          visibility_score?: number | null
        }
        Update: {
          active_product_count?: number | null
          alerts?: Json | null
          approved_enrichments_count?: number | null
          avg_catalogue_quality_score?: number | null
          avg_coach_score?: number | null
          avg_completeness_score?: number | null
          avg_discoverability_score?: number | null
          avg_image_score?: number | null
          avg_seo_score?: number | null
          calculated_at?: string | null
          calculated_by?: string | null
          created_at?: string | null
          duplicate_candidates_count?: number | null
          engine_version?: string | null
          id?: string | null
          low_visibility_products?: Json | null
          low_visibility_products_count?: number | null
          marketplace_health_score?: number | null
          new_products_count?: number | null
          pending_catalogue_proposals_count?: number | null
          pending_image_reviews_count?: number | null
          pending_recommendations_count?: number | null
          pending_seo_proposals_count?: number | null
          product_count?: number | null
          products_to_enrich_count?: number | null
          rejected_images_count?: number | null
          shop_name?: string | null
          snapshot_date?: string | null
          source_counts?: Json | null
          top_brands?: Json | null
          top_categories?: Json | null
          vendor_owner_id?: string | null
          vendor_shop_id?: string | null
          visibility_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_analytics_daily_snapshots_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_analytics_daily_snapshots_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_analytics_daily_snapshots_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      my_marketplace_case_checklist_items: {
        Row: {
          case_id: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          id: string | null
          is_completed: boolean | null
          label: string | null
          note: string | null
          position: number | null
          template_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_case_checklist_items_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_case_resolution_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_checklist_items_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_governance_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_checklist_items_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "marketplace_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_checklist_items_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_case_resolution_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_checklist_items_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_checklist_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "marketplace_case_checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      my_marketplace_case_comments: {
        Row: {
          attachments: Json | null
          author_id: string | null
          author_type: string | null
          body: string | null
          case_id: string | null
          comment_type: string | null
          created_at: string | null
          id: string | null
          metadata: Json | null
          visibility: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_case_comments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_case_resolution_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_comments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_governance_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_comments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "marketplace_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_comments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_case_resolution_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_case_comments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_governance_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      my_marketplace_case_resolution_cases: {
        Row: {
          case_number: string | null
          checklist_completed_count: number | null
          checklist_count: number | null
          created_at: string | null
          due_at: string | null
          explanation: string | null
          final_decision: string | null
          id: string | null
          priority: string | null
          problem: string | null
          product_id: string | null
          product_name: string | null
          recommended_actions: Json | null
          updated_at: string | null
          vendor_shop_id: string | null
          visible_comments_count: number | null
          workflow_status_code: string | null
          workflow_status_label: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_governance_cases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_governance_cases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_governance_cases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_governance_cases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_governance_cases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_governance_cases_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_governance_cases_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_governance_cases_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      my_marketplace_coach_dashboard: {
        Row: {
          calculated_at: string | null
          calculated_by: string | null
          completeness_score: number | null
          conversion_score: number | null
          id: string | null
          image_quality_score: number | null
          low_visibility_products: Json | null
          metrics: Json | null
          opportunities: string[] | null
          performing_products: Json | null
          product_quality_score: number | null
          products_to_optimize: Json | null
          seo_score: number | null
          shop_name: string | null
          shop_score: number | null
          shop_slug: string | null
          snapshot_version: string | null
          source_context: Json | null
          strengths: string[] | null
          vendor_owner_id: string | null
          vendor_shop_id: string | null
          weaknesses: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_coach_shop_snapshots_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_coach_shop_snapshots_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_coach_shop_snapshots_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      my_marketplace_coach_product_analyses: {
        Row: {
          analysis_version: string | null
          analyzed_at: string | null
          analyzed_by: string | null
          completeness_score: number | null
          compliance_score: number | null
          description_score: number | null
          explanation: Json | null
          global_score: number | null
          id: string | null
          image_score: number | null
          issues: string[] | null
          opportunities: string[] | null
          product_id: string | null
          product_image_url: string | null
          product_name: string | null
          product_slug: string | null
          rule_version: string | null
          seo_score: number | null
          source_context: Json | null
          stock_score: number | null
          strengths: string[] | null
          suggested_description: string | null
          suggested_keywords: string[] | null
          suggested_title: string | null
          title_score: number | null
          vendor_owner_id: string | null
          vendor_shop_id: string | null
          weaknesses: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_coach_product_analyses_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_coach_product_analyses_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_coach_product_analyses_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_coach_product_analyses_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_coach_product_analyses_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_coach_product_analyses_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_coach_product_analyses_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_coach_product_analyses_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      my_marketplace_coach_recommendations: {
        Row: {
          analysis_id: string | null
          created_at: string | null
          description: string | null
          due_at: string | null
          expected_impact: Json | null
          id: string | null
          justification: string | null
          priority: string | null
          product_id: string | null
          product_image_url: string | null
          product_name: string | null
          product_slug: string | null
          recommendation_type: string | null
          status: string | null
          suggested_action: Json | null
          title: string | null
          updated_at: string | null
          vendor_owner_id: string | null
          vendor_shop_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_coach_recommendations_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "marketplace_coach_product_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_coach_recommendations_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_coach_product_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_coach_recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_coach_recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_coach_recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_coach_recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_coach_recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_coach_recommendations_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_coach_recommendations_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_coach_recommendations_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      my_marketplace_compliance_findings: {
        Row: {
          compliance_score: number | null
          created_at: string | null
          finding_number: string | null
          id: string | null
          justification: string | null
          policy_category: string | null
          policy_name: string | null
          product_image_url: string | null
          product_name: string | null
          queue_status: string | null
          recommended_actions: Json | null
          severity: string | null
          title: string | null
        }
        Relationships: []
      }
      my_marketplace_governance_case_history: {
        Row: {
          action_type: string | null
          actor_id: string | null
          actor_type: string | null
          case_id: string | null
          comment: string | null
          created_at: string | null
          explanation: string | null
          id: string | null
          metadata: Json | null
          new_priority: string | null
          new_status: string | null
          old_priority: string | null
          old_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_governance_case_history_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_case_resolution_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_governance_case_history_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_governance_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_governance_case_history_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "marketplace_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_governance_case_history_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_case_resolution_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_governance_case_history_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_governance_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      my_marketplace_governance_cases: {
        Row: {
          case_number: string | null
          case_type: string | null
          case_type_label: string | null
          confidence_score: number | null
          created_at: string | null
          explanation: string | null
          final_decision: string | null
          id: string | null
          priority: string | null
          problem: string | null
          product_id: string | null
          product_name: string | null
          recommended_actions: Json | null
          status: string | null
          updated_at: string | null
          vendor_shop_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_governance_cases_case_type_fkey"
            columns: ["case_type"]
            isOneToOne: false
            referencedRelation: "marketplace_governance_case_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "marketplace_governance_cases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_governance_cases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_governance_cases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_governance_cases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_governance_cases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_governance_cases_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_governance_cases_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_governance_cases_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      my_marketplace_governance_notifications: {
        Row: {
          case_id: string | null
          created_at: string | null
          id: string | null
          message: string | null
          metadata: Json | null
          notification_type: string | null
          read_at: string | null
          recipient_id: string | null
          recipient_role: string | null
          severity: string | null
          title: string | null
        }
        Insert: {
          case_id?: string | null
          created_at?: string | null
          id?: string | null
          message?: string | null
          metadata?: Json | null
          notification_type?: string | null
          read_at?: string | null
          recipient_id?: string | null
          recipient_role?: string | null
          severity?: string | null
          title?: string | null
        }
        Update: {
          case_id?: string | null
          created_at?: string | null
          id?: string | null
          message?: string | null
          metadata?: Json | null
          notification_type?: string | null
          read_at?: string | null
          recipient_id?: string | null
          recipient_role?: string | null
          severity?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_governance_notifications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_case_resolution_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_governance_notifications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_governance_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_governance_notifications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "marketplace_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_governance_notifications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_case_resolution_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_governance_notifications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "my_marketplace_governance_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      my_marketplace_seo_latest_products: {
        Row: {
          analyzed_at: string | null
          category_score: number | null
          created_at: string | null
          description_score: number | null
          discoverability_score: number | null
          duplicate_candidates: Json | null
          engine_version: string | null
          id: string | null
          issues: string[] | null
          media_score: number | null
          product_id: string | null
          product_image_url: string | null
          product_name: string | null
          product_price: number | null
          product_slug: string | null
          product_stock_quantity: number | null
          recommendations: Json | null
          score_breakdown: Json | null
          search_score: number | null
          seo_score: number | null
          structured_data_score: number | null
          suggested_keywords: string[] | null
          title_score: number | null
          vendor_owner_id: string | null
          vendor_shop_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_seo_product_scores_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_seo_product_scores_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_seo_product_scores_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_seo_product_scores_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_seo_product_scores_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_seo_product_scores_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_seo_product_scores_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_seo_product_scores_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      my_marketplace_seo_product_scores: {
        Row: {
          analyzed_at: string | null
          category_score: number | null
          created_at: string | null
          description_score: number | null
          discoverability_score: number | null
          duplicate_candidates: Json | null
          engine_version: string | null
          id: string | null
          issues: string[] | null
          media_score: number | null
          product_id: string | null
          product_image_url: string | null
          product_name: string | null
          product_price: number | null
          product_slug: string | null
          product_stock_quantity: number | null
          recommendations: Json | null
          score_breakdown: Json | null
          search_score: number | null
          seo_score: number | null
          structured_data_score: number | null
          suggested_keywords: string[] | null
          title_score: number | null
          vendor_owner_id: string | null
          vendor_shop_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_seo_product_scores_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_seo_product_scores_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_seo_product_scores_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_seo_product_scores_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_seo_product_scores_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_seo_product_scores_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_seo_product_scores_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_seo_product_scores_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      my_marketplace_seo_proposals: {
        Row: {
          created_at: string | null
          created_by: string | null
          current_value: Json | null
          explanation: string | null
          id: string | null
          product_id: string | null
          product_image_url: string | null
          product_name: string | null
          product_slug: string | null
          proposal_type: string | null
          proposed_value: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          shop_name: string | null
          status: string | null
          updated_at: string | null
          vendor_owner_id: string | null
          vendor_shop_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_seo_content_proposals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_seo_content_proposals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_seo_content_proposals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_seo_content_proposals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_seo_content_proposals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_seo_content_proposals_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_seo_content_proposals_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_seo_content_proposals_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      my_marketplace_seo_shop_score: {
        Row: {
          analyzed_at: string | null
          created_at: string | null
          discoverability_score: number | null
          engine_version: string | null
          id: string | null
          issues: string[] | null
          optimized_product_count: number | null
          product_count: number | null
          recommendations: Json | null
          score_breakdown: Json | null
          seo_score: number | null
          shop_name: string | null
          shop_slug: string | null
          vendor_owner_id: string | null
          vendor_shop_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_seo_shop_scores_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_seo_shop_scores_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "marketplace_seo_shop_scores_vendor_shop_id_fkey"
            columns: ["vendor_shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      public_marketplace_sitemap_entries: {
        Row: {
          entry_type: string | null
          path: string | null
          priority: number | null
          updated_at: string | null
        }
        Relationships: []
      }
      public_products: {
        Row: {
          alcohol_percentage: number | null
          available_as_case: boolean | null
          average_rating: number | null
          case_price: number | null
          category_id: string | null
          created_at: string | null
          description: string | null
          food_pairing: string | null
          gallery_urls: string[] | null
          grape_variety: string | null
          id: string | null
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          name: string | null
          origin_country: string | null
          original_price: number | null
          points_tiers_override: Json | null
          price: number | null
          region: string | null
          review_count: number | null
          serving_temperature: string | null
          short_description: string | null
          slug: string | null
          stock_quantity: number | null
          tasting_notes: string | null
          units_per_case: number | null
          updated_at: string | null
          vendor_id: string | null
          vintage_year: number | null
          volume_ml: number | null
        }
        Insert: {
          alcohol_percentage?: number | null
          available_as_case?: boolean | null
          average_rating?: number | null
          case_price?: number | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          food_pairing?: string | null
          gallery_urls?: string[] | null
          grape_variety?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name?: string | null
          origin_country?: string | null
          original_price?: number | null
          points_tiers_override?: Json | null
          price?: number | null
          region?: string | null
          review_count?: number | null
          serving_temperature?: string | null
          short_description?: string | null
          slug?: string | null
          stock_quantity?: number | null
          tasting_notes?: string | null
          units_per_case?: number | null
          updated_at?: string | null
          vendor_id?: string | null
          vintage_year?: number | null
          volume_ml?: number | null
        }
        Update: {
          alcohol_percentage?: number | null
          available_as_case?: boolean | null
          average_rating?: number | null
          case_price?: number | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          food_pairing?: string | null
          gallery_urls?: string[] | null
          grape_variety?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name?: string | null
          origin_country?: string | null
          original_price?: number | null
          points_tiers_override?: Json | null
          price?: number | null
          region?: string | null
          review_count?: number | null
          serving_temperature?: string | null
          short_description?: string | null
          slug?: string | null
          stock_quantity?: number | null
          tasting_notes?: string | null
          units_per_case?: number | null
          updated_at?: string | null
          vendor_id?: string | null
          vintage_year?: number | null
          volume_ml?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "admin_catalogue_intelligence_overview"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "admin_marketplace_compliance_shop_stats"
            referencedColumns: ["vendor_shop_id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews_public: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string | null
          is_approved: boolean | null
          is_verified_purchase: boolean | null
          product_id: string | null
          rating: number | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string | null
          is_approved?: boolean | null
          is_verified_purchase?: boolean | null
          product_id?: string | null
          rating?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string | null
          is_approved?: boolean | null
          is_verified_purchase?: boolean | null
          product_id?: string | null
          rating?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_marketplace_image_studio_jobs: {
        Row: {
          admin_notes: string | null
          ai_analysis: Json | null
          compliance_score: number | null
          corrected_image_url: string | null
          corrected_storage_path: string | null
          corrections: string[] | null
          created_at: string | null
          decision: string | null
          engine_version: string | null
          id: string | null
          issues: string[] | null
          original_image_url: string | null
          original_storage_path: string | null
          product_detected: string | null
          product_id: string | null
          published_image_url: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          submitted_by: string | null
          thumbnail_urls: Json | null
          updated_at: string | null
          vendor_id: string | null
          visual_rules: Json | null
        }
        Insert: {
          admin_notes?: string | null
          ai_analysis?: Json | null
          compliance_score?: number | null
          corrected_image_url?: string | null
          corrected_storage_path?: string | null
          corrections?: string[] | null
          created_at?: string | null
          decision?: string | null
          engine_version?: string | null
          id?: string | null
          issues?: string[] | null
          original_image_url?: string | null
          original_storage_path?: string | null
          product_detected?: string | null
          product_id?: string | null
          published_image_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_by?: string | null
          thumbnail_urls?: Json | null
          updated_at?: string | null
          vendor_id?: string | null
          visual_rules?: Json | null
        }
        Update: {
          admin_notes?: string | null
          ai_analysis?: Json | null
          compliance_score?: number | null
          corrected_image_url?: string | null
          corrected_storage_path?: string | null
          corrections?: string[] | null
          created_at?: string | null
          decision?: string | null
          engine_version?: string | null
          id?: string | null
          issues?: string[] | null
          original_image_url?: string | null
          original_storage_path?: string | null
          product_detected?: string | null
          product_id?: string | null
          published_image_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_by?: string | null
          thumbnail_urls?: Json | null
          updated_at?: string | null
          vendor_id?: string | null
          visual_rules?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_image_studio_jobs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_missing_purchase_costs"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_image_studio_jobs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_cost_validation_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "marketplace_image_studio_jobs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_image_studio_jobs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_image_studio_jobs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      academy_complete_course: {
        Args: { _course_id: string; _score?: number; _skills?: string[] }
        Returns: Json
      }
      academy_evaluate_certifications: {
        Args: { _user_id?: string }
        Returns: Json
      }
      academy_is_admin: { Args: never; Returns: boolean }
      academy_log_activity: {
        Args: {
          _action: string
          _entity_id: string
          _entity_type: string
          _payload?: Json
        }
        Returns: undefined
      }
      academy_start_course: { Args: { _course_id: string }; Returns: Json }
      academy_submit_quiz_attempt: {
        Args: { _answers: Json; _quiz_id: string }
        Returns: Json
      }
      acknowledge_platform_observability_alert: {
        Args: { _alert_id: string; _note?: string; _status?: string }
        Returns: Json
      }
      add_marketplace_case_comment: {
        Args: {
          _attachments?: Json
          _body: string
          _case_id: string
          _comment_type?: string
          _visibility?: string
        }
        Returns: Json
      }
      admin_apply_product_cost_import: {
        Args: { _batch_id: string }
        Returns: Json
      }
      admin_check_integration_connector_compatibility: {
        Args: { _connector_key: string }
        Returns: Json
      }
      admin_compare_business_engine_versions: {
        Args: {
          _left_engine_version: string
          _limit?: number
          _right_engine_version: string
        }
        Returns: Json
      }
      admin_create_marketplace_workflow_automation_rule: {
        Args: {
          _actions?: Json
          _conditions?: Json
          _description: string
          _is_active?: boolean
          _name: string
          _priority?: number
          _trigger_event: string
        }
        Returns: Json
      }
      admin_generate_advisor_ai_goals: {
        Args: { _advisor_id?: string; _cadence?: string; _limit?: number }
        Returns: Json
      }
      admin_install_extension: {
        Args: {
          _configuration?: Json
          _environment?: string
          _version_id: string
        }
        Returns: Json
      }
      admin_preview_product_cost_import: {
        Args: { _rows: Json; _source_filename?: string }
        Returns: Json
      }
      admin_publish_extension_version: {
        Args: { _extension_key: string; _version: Json }
        Returns: Json
      }
      admin_record_integration_connector_sync_result: {
        Args: {
          _error_code?: string
          _error_message?: string
          _job_id: string
          _metrics?: Json
          _run_status: string
        }
        Returns: Json
      }
      admin_register_api_gateway_endpoint: {
        Args: { _endpoint: Json }
        Returns: Json
      }
      admin_register_developer_portal_member: {
        Args: { _member: Json }
        Returns: Json
      }
      admin_register_extension_listing: {
        Args: { _extension: Json }
        Returns: Json
      }
      admin_register_integration_connector: {
        Args: { _connector: Json }
        Returns: Json
      }
      admin_replay_business_flight_order: {
        Args: { _order_ref: string }
        Returns: Json
      }
      admin_rollback_extension: {
        Args: {
          _installation_id: string
          _reason?: string
          _target_version_id: string
        }
        Returns: Json
      }
      admin_run_extension_sandbox: {
        Args: { _scenario_key?: string; _version_id: string }
        Returns: Json
      }
      admin_schedule_integration_connector_sync: {
        Args: {
          _connector_key: string
          _payload?: Json
          _scheduled_for?: string
          _sync_type?: string
        }
        Returns: Json
      }
      admin_schedule_marketplace_workflow_reminder: {
        Args: {
          _assigned_to?: string
          _case_id: string
          _description?: string
          _due_at?: string
          _title: string
        }
        Returns: Json
      }
      admin_set_extension_installation_status: {
        Args: { _installation_id: string; _reason?: string; _status: string }
        Returns: Json
      }
      admin_set_integration_connector_status: {
        Args: { _connector_key: string; _reason?: string; _status: string }
        Returns: Json
      }
      admin_set_product_sensitive_pricing: {
        Args: {
          _markup_percent_override?: number
          _points_override?: number
          _points_tiers_override?: Json
          _product_id: string
          _purchase_price?: number
        }
        Returns: undefined
      }
      admin_toggle_marketplace_workflow_automation_rule: {
        Args: { _is_active: boolean; _rule_id: string }
        Returns: Json
      }
      admin_transfer_crm_contact: {
        Args: {
          _contact_id: string
          _new_owner_advisor_id: string
          _reason: string
        }
        Returns: Json
      }
      admin_update_order_status: {
        Args: {
          _new_status: Database["public"]["Enums"]["order_status"]
          _notes?: string
          _order_id: string
        }
        Returns: Json
      }
      admin_validate_extension_version: {
        Args: { _version_id: string }
        Returns: Json
      }
      advisor_update_ai_goal_progress: {
        Args: {
          _assignment_id: string
          _delta?: number
          _evidence?: Json
          _note?: string
        }
        Returns: Json
      }
      ai_goals_is_admin: { Args: never; Returns: boolean }
      ai_goals_target_for_profile: {
        Args: { _advisor_level: string; _availability: string; _base: number }
        Returns: number
      }
      analytics_customer_cohorts: {
        Args: { _months_back?: number }
        Returns: {
          cohort_month: string
          cohort_size: number
          retained_m1: number
          retained_m3: number
          retained_m6: number
          total_revenue: number
        }[]
      }
      analytics_customer_ltv: {
        Args: { _limit?: number }
        Returns: {
          avg_order_value: number
          customer_key: string
          customer_label: string
          days_active: number
          first_order_at: string
          last_order_at: string
          order_count: number
          total_spent: number
          user_id: string
        }[]
      }
      analytics_mlm_attribution: {
        Args: { _days?: number }
        Returns: {
          ambassador_count: number
          avg_commission: number
          commission_count: number
          level: number
          total_attributed_revenue: number
          total_commissions: number
        }[]
      }
      analytics_revenue_breakdown: {
        Args: { _days?: number }
        Returns: {
          day: string
          direct_revenue: number
          marketplace_revenue: number
          order_count: number
          referral_revenue: number
          total_revenue: number
        }[]
      }
      analytics_top_ambassadors: {
        Args: { _days?: number; _limit?: number }
        Returns: {
          ambassador_email: string
          ambassador_id: string
          ambassador_name: string
          attributed_revenue: number
          conversion_rate: number
          referral_count: number
          total_commissions: number
        }[]
      }
      analyze_catalogue_product: {
        Args: { _product_id: string }
        Returns: Json
      }
      analyze_marketplace_product: {
        Args: { _product_id: string }
        Returns: Json
      }
      api_gateway_check_rate_limit: {
        Args: {
          _endpoint_key: string
          _identity_type: string
          _identity_value: string
          _max_requests?: number
          _window_seconds?: number
        }
        Returns: Json
      }
      api_gateway_enqueue_webhook_event: {
        Args: {
          _aggregate_id?: string
          _aggregate_type?: string
          _event_key: string
          _payload?: Json
          _source_module_key?: string
        }
        Returns: Json
      }
      api_gateway_is_admin: { Args: never; Returns: boolean }
      api_gateway_log_request: { Args: { _log: Json }; Returns: Json }
      api_gateway_mask_secret: { Args: { _value: string }; Returns: string }
      approve_wholesaler_application: {
        Args: { _app_id: string }
        Returns: Json
      }
      ask_business_assistant: { Args: { _question: string }; Returns: Json }
      assign_marketplace_governance_case: {
        Args: {
          _assignee_id?: string
          _case_id: string
          _note?: string
          _observer_ids?: string[]
          _team_id?: string
        }
        Returns: Json
      }
      authorize_p05_activation_gate: {
        Args: {
          _confirm_text: string
          _justification: string
          _requested_mode: string
          _simulation_run_id: string
        }
        Returns: Json
      }
      auto_reconcile_pending: { Args: never; Returns: number }
      auto_release_delivered_escrows: { Args: never; Returns: number }
      business_assistant_is_admin: { Args: never; Returns: boolean }
      business_score_is_admin: { Args: never; Returns: boolean }
      calculate_business_trust_score: {
        Args: { _user_id?: string }
        Returns: Json
      }
      calculate_marketplace_analytics_snapshot: {
        Args: { _snapshot_date?: string; _vendor_shop_id?: string }
        Returns: Json
      }
      calculate_marketplace_product_seo: {
        Args: { _product_id: string }
        Returns: Json
      }
      calculate_marketplace_shop_seo: {
        Args: { _vendor_shop_id?: string }
        Returns: Json
      }
      calculate_order_risk_score: { Args: { _order_id: string }; Returns: Json }
      calculate_p0_revenue_observation: {
        Args: { _order_id: string }
        Returns: Json
      }
      can_insert_order_item_for_current_actor: {
        Args: { _order_id: string }
        Returns: boolean
      }
      capture_escrow: {
        Args: { _escrow_id: string; _reason?: string }
        Returns: boolean
      }
      catalogue_intelligence_is_admin: { Args: never; Returns: boolean }
      catalogue_intelligence_owns_product: {
        Args: { _product_id: string }
        Returns: boolean
      }
      coach_analyze_conversation: {
        Args: {
          _contact_id?: string
          _conversation_text: string
          _mode?: string
          _source_channel?: string
        }
        Returns: Json
      }
      coach_can_access_session: {
        Args: { _session_id: string }
        Returns: boolean
      }
      coach_make_message: {
        Args: {
          _customer_type: string
          _objections: string[]
          _occasion: string
          _variant: string
        }
        Returns: string
      }
      coach_record_feedback: {
        Args: {
          _outcome: string
          _reason?: string
          _selected_variant_id?: string
          _session_id: string
        }
        Returns: Json
      }
      comment_marketplace_governance_case: {
        Args: { _case_id: string; _comment: string }
        Returns: Json
      }
      commercial_asset_can_access_generation: {
        Args: { _generation_id: string }
        Returns: boolean
      }
      commercial_asset_is_admin: { Args: never; Returns: boolean }
      commercial_calendar_archive_event: {
        Args: { _event_id: string; _reason?: string }
        Returns: Json
      }
      commercial_calendar_is_admin: { Args: never; Returns: boolean }
      commercial_calendar_log_event: {
        Args: {
          _action: string
          _campaign_id: string
          _details?: Json
          _event_id: string
        }
        Returns: undefined
      }
      commercial_calendar_toggle_event: {
        Args: { _event_id: string; _is_active: boolean; _reason?: string }
        Returns: Json
      }
      compute_order_risk_score: {
        Args: { _order_id: string }
        Returns: {
          factors: Json
          risk_level: string
          score: number
        }[]
      }
      compute_trust_score: {
        Args: {
          _subject_id: string
          _subject_type: Database["public"]["Enums"]["trust_subject_type"]
        }
        Returns: number
      }
      compute_user_recommendations: {
        Args: { _user_id: string }
        Returns: number
      }
      conversation_coach_is_admin: { Args: never; Returns: boolean }
      convert_currency: {
        Args: { _amount: number; _from: string; _to: string }
        Returns: number
      }
      create_escrow_from_payment: {
        Args: { _intent_id: string }
        Returns: string
      }
      create_invoice_from_quote: {
        Args: { _due_days?: number; _quote_id: string }
        Returns: Json
      }
      create_marketplace_governance_case: {
        Args: {
          _case_type: string
          _confidence_score: number
          _data_used?: Json
          _explanation: string
          _is_vendor_visible?: boolean
          _potential_impacts?: Json
          _priority: string
          _problem: string
          _product_id: string
          _recommended_actions?: Json
          _vendor_shop_id: string
        }
        Returns: Json
      }
      create_order_from_checkout: {
        Args: {
          _address: Json
          _cart_items: Json
          _code?: string
          _code_type?: string
          _gift_message?: string
          _gift_packaging_id?: string
          _payment_method: Database["public"]["Enums"]["payment_method"]
        }
        Returns: Json
      }
      create_referral_relationship: {
        Args: { _referral_code: string }
        Returns: Json
      }
      crm_archive_contact: {
        Args: { _contact_id: string; _reason?: string }
        Returns: Json
      }
      crm_can_access_contact: {
        Args: { _contact_id: string }
        Returns: boolean
      }
      crm_complete_task: {
        Args: { _summary?: string; _task_id: string }
        Returns: Json
      }
      crm_is_admin: { Args: never; Returns: boolean }
      crm_log_activity: {
        Args: {
          _activity_type: string
          _channel?: string
          _contact_id: string
          _metadata?: Json
          _summary: string
        }
        Returns: string
      }
      crm_normalize_email: { Args: { _email: string }; Returns: string }
      crm_normalize_phone: { Args: { _phone: string }; Returns: string }
      developer_create_api_key: {
        Args: { _app_id: string; _key_name?: string }
        Returns: Json
      }
      developer_portal_is_admin: { Args: never; Returns: boolean }
      developer_portal_is_member: { Args: never; Returns: boolean }
      developer_register_app: { Args: { _app: Json }; Returns: Json }
      developer_revoke_api_key: {
        Args: { _api_key_id: string; _reason?: string }
        Returns: Json
      }
      developer_rotate_api_key: { Args: { _api_key_id: string }; Returns: Json }
      developer_run_sandbox: {
        Args: { _app_id: string; _payload?: Json; _scenario_key: string }
        Returns: Json
      }
      enqueue_marketplace_workflow_automations: {
        Args: {
          _case_id: string
          _payload?: Json
          _scheduled_for?: string
          _trigger_event: string
        }
        Returns: Json
      }
      escrow_capture: {
        Args: { _amount?: number; _escrow_id: string; _reason?: string }
        Returns: Json
      }
      escrow_hold: {
        Args: {
          _amount: number
          _buyer_id: string
          _currency?: string
          _order_id: string
          _reason?: string
          _seller_id: string
        }
        Returns: string
      }
      escrow_refund: {
        Args: { _amount?: number; _escrow_id: string; _reason?: string }
        Returns: Json
      }
      export_marketplace_analytics: {
        Args: {
          _days?: number
          _format?: string
          _scope?: string
          _vendor_shop_id?: string
        }
        Returns: Json
      }
      extension_marketplace_is_admin: { Args: never; Returns: boolean }
      extension_marketplace_is_developer: { Args: never; Returns: boolean }
      extension_marketplace_log_operation: {
        Args: {
          _extension_id: string
          _installation_id?: string
          _new_state?: Json
          _operation_type: string
          _previous_state?: Json
          _reason?: string
          _status?: string
          _version_id?: string
        }
        Returns: number
      }
      generate_business_assistant_snapshot: {
        Args: { _period?: string; _user_id?: string }
        Returns: Json
      }
      generate_business_assistant_summary: {
        Args: { _summary_type?: string }
        Returns: Json
      }
      generate_commercial_asset: {
        Args: {
          _asset_type?: string
          _brief?: string
          _product_ids?: string[]
          _template_id?: string
        }
        Returns: Json
      }
      generate_invoice_number: { Args: never; Returns: string }
      generate_marketplace_coach_shop_snapshot: {
        Args: { _vendor_shop_id?: string }
        Returns: Json
      }
      generate_marketplace_seo_product_proposals: {
        Args: { _product_id: string }
        Returns: Json
      }
      generate_mlm_commissions: {
        Args: {
          _order_id: string
          _order_total?: number
          _referrer_id?: string
        }
        Returns: Json
      }
      generate_order_number: { Args: never; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      get_active_rate: { Args: { _from: string; _to: string }; Returns: number }
      get_my_roles: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      get_my_shop_id: { Args: never; Returns: string }
      get_referrer_id_from_code: { Args: { _code: string }; Returns: string }
      get_user_rank: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["ambassador_rank"]
      }
      get_user_recommendations: {
        Args: { _limit?: number; _user_id: string }
        Returns: {
          product_id: string
          reason: string
          score: number
        }[]
      }
      get_vendor_order_lines: {
        Args: never
        Returns: {
          item_id: string
          order_created_at: string
          order_id: string
          order_number: string
          order_status: string
          product_id: string
          product_image: string
          product_name: string
          quantity: number
          shipping_city: string
          shipping_full_name: string
          shipping_phone: string
          total_price: number
          unit_price: number
          vendor_status: Database["public"]["Enums"]["vendor_fulfillment_status"]
          vendor_updated_at: string
        }[]
      }
      get_wholesaler_outstanding: {
        Args: { _user_id: string }
        Returns: number
      }
      has_2fa_enabled: { Args: { _user_id: string }; Returns: boolean }
      has_admin_permission: {
        Args: {
          _permission: Database["public"]["Enums"]["admin_permission"]
          _user_id: string
        }
        Returns: boolean
      }
      has_any_role: {
        Args: { _roles: Database["public"]["Enums"]["app_role"][] }
        Returns: boolean
      }
      has_full_admin_access: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_article_views: { Args: { _slug: string }; Returns: undefined }
      increment_asset_download: {
        Args: { asset_uuid: string }
        Returns: undefined
      }
      increment_referral_clicks: { Args: { _code: string }; Returns: Json }
      initialize_marketplace_case_resolution: {
        Args: { _case_id: string }
        Returns: Json
      }
      integration_hub_calculate_health: {
        Args: {
          _avg_latency_ms: number
          _failed_runs: number
          _pending_retries: number
          _success_rate: number
        }
        Returns: Json
      }
      integration_hub_is_admin: { Args: never; Returns: boolean }
      integration_hub_log_event: {
        Args: {
          _connector_id: string
          _connector_key: string
          _event_type: string
          _new_values?: Json
          _previous_values?: Json
          _reason?: string
        }
        Returns: undefined
      }
      is_2fa_session_valid: { Args: { _user_id: string }; Returns: boolean }
      is_platform_feature_enabled: {
        Args: { _context?: Json; _flag_key: string }
        Returns: boolean
      }
      is_super_admin_for_p0: { Args: never; Returns: boolean }
      label_rfm_segment: {
        Args: { _f: number; _m: number; _r: number }
        Returns: string
      }
      log_financial_ledger_entry: {
        Args: {
          _actor_id?: string
          _amount: number
          _balance_after?: number
          _balance_before?: number
          _credit_wallet_id?: string
          _currency?: string
          _debit_wallet_id?: string
          _idempotency_key: string
          _metadata?: Json
          _movement_type: string
          _order_id?: string
          _payment_reference?: string
          _user_id?: string
        }
        Returns: string
      }
      lookup_guest_order: {
        Args: { _identifier: string; _method?: string; _order_number: string }
        Returns: Json
      }
      mark_marketplace_governance_notification_read: {
        Args: { _notification_id: string }
        Returns: Json
      }
      marketplace_analytics_is_admin: { Args: never; Returns: boolean }
      marketplace_analytics_owns_shop: {
        Args: { _shop_id: string }
        Returns: boolean
      }
      marketplace_coach_is_admin: { Args: never; Returns: boolean }
      marketplace_coach_owns_shop: {
        Args: { _shop_id: string }
        Returns: boolean
      }
      marketplace_compliance_is_admin: { Args: never; Returns: boolean }
      marketplace_compliance_owns_shop: {
        Args: { _shop_id: string }
        Returns: boolean
      }
      marketplace_compliance_queue_for_score: {
        Args: { _critical_count: number; _high_count: number; _score: number }
        Returns: string
      }
      marketplace_compliance_record_finding: {
        Args: {
          _analyzed_elements: Json
          _compliance_score: number
          _confidence_score: number
          _detection_hash: string
          _estimated_impact: Json
          _justification: string
          _policy_code: string
          _product_id: string
          _recommended_actions: Json
          _source_ref_id: string
          _title: string
          _vendor_owner_id: string
          _vendor_shop_id: string
        }
        Returns: string
      }
      marketplace_governance_is_admin: { Args: never; Returns: boolean }
      marketplace_governance_owns_shop: {
        Args: { _shop_id: string }
        Returns: boolean
      }
      marketplace_image_studio_create_job: {
        Args: {
          _original_image_url: string
          _original_storage_path?: string
          _product_id: string
          _vendor_id?: string
        }
        Returns: string
      }
      marketplace_image_studio_is_admin: { Args: never; Returns: boolean }
      marketplace_image_studio_record_analysis: {
        Args: {
          _ai_analysis?: Json
          _compliance_score: number
          _corrected_image_url?: string
          _corrected_storage_path?: string
          _corrections?: string[]
          _issues?: string[]
          _job_id: string
          _product_detected?: string
          _thumbnail_urls?: Json
        }
        Returns: Json
      }
      marketplace_image_studio_review_job: {
        Args: { _action: string; _job_id: string; _note?: string }
        Returns: Json
      }
      marketplace_image_studio_score_decision: {
        Args: { _score: number }
        Returns: string
      }
      marketplace_seo_is_admin: { Args: never; Returns: boolean }
      marketplace_seo_owns_shop: {
        Args: { _shop_id: string }
        Returns: boolean
      }
      marketplace_workflow_automation_is_admin: {
        Args: never
        Returns: boolean
      }
      marketplace_workflow_is_admin: { Args: never; Returns: boolean }
      marketplace_workflow_rule_matches: {
        Args: {
          _case: Database["public"]["Tables"]["marketplace_governance_cases"]["Row"]
          _payload?: Json
          _rule: Database["public"]["Tables"]["marketplace_workflow_automation_rules"]["Row"]
        }
        Returns: boolean
      }
      match_products_by_embedding: {
        Args: {
          match_count?: number
          min_similarity?: number
          query_embedding: string
        }
        Returns: {
          category_id: string
          id: string
          image_url: string
          name: string
          price: number
          short_description: string
          similarity: number
          slug: string
        }[]
      }
      platform_extension_is_admin: { Args: never; Returns: boolean }
      platform_observability_count_rows: {
        Args: { _table_name: string; _where_sql?: string }
        Returns: number
      }
      platform_observability_is_admin: { Args: never; Returns: boolean }
      platform_observability_rule_matches: {
        Args: { _operator: string; _threshold: number; _value: number }
        Returns: boolean
      }
      process_marketplace_workflow_automation_queue: {
        Args: { _limit?: number }
        Returns: Json
      }
      process_marketplace_workflow_scheduler: {
        Args: { _limit?: number }
        Returns: Json
      }
      process_withdrawal_request: {
        Args: {
          _action: string
          _reason?: string
          _transaction_reference?: string
          _withdrawal_id: string
        }
        Returns: Json
      }
      publish_event: {
        Args: {
          _actor_id?: string
          _aggregate_id: string
          _aggregate_type: string
          _event_type: string
          _payload?: Json
          _source?: string
        }
        Returns: number
      }
      purge_old_analytics_events: { Args: never; Returns: undefined }
      purge_old_perf_metrics: { Args: never; Returns: undefined }
      recompute_all_trust_scores: { Args: never; Returns: number }
      recompute_customer_segments: { Args: never; Returns: number }
      recompute_p05_simulation_run_summary: {
        Args: { _run_id: string }
        Returns: Json
      }
      recompute_vendor_trust_score: {
        Args: { _shop_id: string }
        Returns: number
      }
      reconcile_payment: {
        Args: { _note?: string; _recon_id: string }
        Returns: undefined
      }
      reconcile_payment_intent: {
        Args: { _intent_id: string }
        Returns: string
      }
      record_commercial_asset_event: {
        Args: {
          _channel?: string
          _event_type: string
          _generation_id: string
          _metadata?: Json
        }
        Returns: Json
      }
      record_marketplace_discoverability_event: {
        Args: {
          _event_type: string
          _metadata?: Json
          _position?: number
          _product_id?: string
          _query?: string
          _vendor_shop_id?: string
        }
        Returns: string
      }
      record_platform_observability_log: {
        Args: {
          _component_name: string
          _component_type: string
          _context?: Json
          _correlation_id?: string
          _event_type: string
          _message: string
          _service_code: string
          _severity: string
        }
        Returns: string
      }
      record_platform_observability_metric: {
        Args: {
          _component_name: string
          _component_type: string
          _metadata?: Json
          _metric_name: string
          _metric_value: number
          _service_code: string
          _severity?: string
          _status?: string
          _unit?: string
        }
        Returns: Json
      }
      record_trust_signal: {
        Args: {
          _metadata?: Json
          _polarity?: number
          _signal_type: string
          _source?: string
          _subject_id: string
          _subject_type: Database["public"]["Enums"]["trust_subject_type"]
          _weight?: number
        }
        Returns: number
      }
      redeem_loyalty_points: {
        Args: { _points: number; _user_id: string }
        Returns: Json
      }
      refresh_product_affinities: { Args: never; Returns: number }
      refund_escrow: {
        Args: { _amount: number; _escrow_id: string; _reason: string }
        Returns: boolean
      }
      register_invoice_payment: {
        Args: {
          _amount: number
          _invoice_id: string
          _method?: string
          _notes?: string
          _reference?: string
        }
        Returns: Json
      }
      register_platform_extension_module: {
        Args: { _module: Json }
        Returns: Json
      }
      request_commercial_asset_export: {
        Args: { _export_format: string; _generation_id: string }
        Returns: Json
      }
      request_withdrawal: {
        Args: {
          _amount: number
          _payment_method: Database["public"]["Enums"]["payment_method"]
          _phone_number: string
        }
        Returns: Json
      }
      resolve_delivery_zone: {
        Args: { _city: string; _neighborhood: string; _subtotal: number }
        Returns: {
          estimated_delay: string
          fee: number
          free_threshold: number
          matched_rule: string
          zone_id: string
        }[]
      }
      restore_order_stock_once: {
        Args: { _order_id: string; _reason?: string }
        Returns: Json
      }
      reverse_mlm_commissions_for_order: {
        Args: { _order_id: string }
        Returns: Json
      }
      run_p0_revenue_observation_for_recent_orders: {
        Args: { _limit?: number }
        Returns: Json
      }
      run_p05_simulation_replay: { Args: { _limit?: number }; Returns: Json }
      safe_date_from_text: { Args: { _value: string }; Returns: string }
      safe_numeric_from_text: { Args: { _value: string }; Returns: number }
      scan_marketplace_case_escalations: {
        Args: { _limit?: number }
        Returns: Json
      }
      scan_marketplace_compliance: { Args: { _limit?: number }; Returns: Json }
      scan_marketplace_governance_cases: {
        Args: { _limit?: number }
        Returns: Json
      }
      scan_platform_observability: { Args: { _scope?: Json }; Returns: Json }
      score_order_risk: { Args: { _order_id: string }; Returns: string }
      set_platform_feature_flag: {
        Args: {
          _eligibility_rules?: Json
          _flag_key: string
          _reason?: string
          _rollout_percent?: number
          _status: string
        }
        Returns: Json
      }
      simulate_p05_order: {
        Args: { _order_id: string; _run_id: string }
        Returns: Json
      }
      suggest_marketplace_case_assignees: {
        Args: { _case_id: string }
        Returns: Json
      }
      transition_marketplace_governance_case: {
        Args: {
          _case_id: string
          _comment?: string
          _vendor_visible?: boolean
          _workflow_status_code: string
        }
        Returns: Json
      }
      update_catalogue_duplicate_candidate_status: {
        Args: { _candidate_id: string; _explanation?: string; _status: string }
        Returns: Json
      }
      update_catalogue_enrichment_proposal_status: {
        Args: { _explanation?: string; _proposal_id: string; _status: string }
        Returns: Json
      }
      update_marketplace_case_checklist_item: {
        Args: { _is_completed: boolean; _item_id: string; _note?: string }
        Returns: Json
      }
      update_marketplace_coach_recommendation_status: {
        Args: { _recommendation_id: string; _status: string }
        Returns: Json
      }
      update_marketplace_compliance_finding_status: {
        Args: {
          _create_governance_case?: boolean
          _finding_id: string
          _queue_status: string
          _resolution_note?: string
        }
        Returns: Json
      }
      update_marketplace_governance_case: {
        Args: {
          _case_id: string
          _comment?: string
          _final_decision?: string
          _is_vendor_visible?: boolean
          _priority?: string
          _status?: string
        }
        Returns: Json
      }
      update_marketplace_seo_proposal_status: {
        Args: { _explanation?: string; _proposal_id: string; _status: string }
        Returns: Json
      }
      upsert_payment_reconciliation: {
        Args: { _intent_id: string }
        Returns: string
      }
      validate_referral_code: { Args: { _code: string }; Returns: Json }
      verify_2fa_session: { Args: { _user_id: string }; Returns: undefined }
      wallet_credit: {
        Args: {
          _amount: number
          _metadata?: Json
          _reason: string
          _reference_id?: string
          _reference_type?: string
          _user_id: string
        }
        Returns: Json
      }
      wallet_debit: {
        Args: {
          _amount: number
          _metadata?: Json
          _reason: string
          _reference_id?: string
          _reference_type?: string
          _user_id: string
        }
        Returns: Json
      }
      wallet_transfer: {
        Args: {
          _amount: number
          _from_user: string
          _reason: string
          _reference_id?: string
          _reference_type?: string
          _to_user: string
        }
        Returns: Json
      }
    }
    Enums: {
      admin_permission:
        | "orders"
        | "products"
        | "categories"
        | "promo_codes"
        | "stock"
        | "audit"
        | "mlm"
        | "reviews"
        | "full_access"
        | "loyalty"
        | "crm"
        | "commercial_calendar"
        | "ai_goals"
        | "conversation_coach"
        | "commercial_assets"
        | "academy"
        | "business_scores"
        | "business_assistant"
        | "marketplace_image_studio"
        | "marketplace_coach"
        | "marketplace_seo"
        | "catalogue_intelligence"
        | "marketplace_analytics"
        | "marketplace_governance"
      ambassador_rank: "bronze" | "silver" | "gold" | "diamond" | "elite"
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "ambassador"
        | "vendor"
        | "wholesaler"
        | "customer"
      fraud_review_status: "pending" | "approved" | "rejected" | "auto_blocked"
      fraud_risk_level: "low" | "medium" | "high" | "critical"
      invoice_status:
        | "draft"
        | "sent"
        | "partial"
        | "paid"
        | "overdue"
        | "cancelled"
      order_status:
        | "pending"
        | "confirmed"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
      payment_method:
        | "mtn_money"
        | "orange_money"
        | "cash_on_delivery"
        | "credit_card"
      payment_status: "pending" | "completed" | "failed" | "refunded"
      product_moderation_status: "pending" | "approved" | "flagged" | "rejected"
      product_moderation_verdict: "approved" | "review" | "rejected"
      trust_subject_type: "customer" | "vendor" | "ambassador" | "wholesaler"
      vendor_fulfillment_status:
        | "pending"
        | "preparing"
        | "shipped"
        | "delivered"
        | "cancelled"
      wallet_transaction_type:
        | "commission"
        | "bonus"
        | "withdrawal"
        | "store_credit"
        | "adjustment"
      withdrawal_status: "pending" | "approved" | "rejected" | "completed"
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
      admin_permission: [
        "orders",
        "products",
        "categories",
        "promo_codes",
        "stock",
        "audit",
        "mlm",
        "reviews",
        "full_access",
        "loyalty",
        "crm",
        "commercial_calendar",
        "ai_goals",
        "conversation_coach",
        "commercial_assets",
        "academy",
        "business_scores",
        "business_assistant",
        "marketplace_image_studio",
        "marketplace_coach",
        "marketplace_seo",
        "catalogue_intelligence",
        "marketplace_analytics",
        "marketplace_governance",
      ],
      ambassador_rank: ["bronze", "silver", "gold", "diamond", "elite"],
      app_role: [
        "admin",
        "moderator",
        "user",
        "ambassador",
        "vendor",
        "wholesaler",
        "customer",
      ],
      fraud_review_status: ["pending", "approved", "rejected", "auto_blocked"],
      fraud_risk_level: ["low", "medium", "high", "critical"],
      invoice_status: [
        "draft",
        "sent",
        "partial",
        "paid",
        "overdue",
        "cancelled",
      ],
      order_status: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      payment_method: [
        "mtn_money",
        "orange_money",
        "cash_on_delivery",
        "credit_card",
      ],
      payment_status: ["pending", "completed", "failed", "refunded"],
      product_moderation_status: ["pending", "approved", "flagged", "rejected"],
      product_moderation_verdict: ["approved", "review", "rejected"],
      trust_subject_type: ["customer", "vendor", "ambassador", "wholesaler"],
      vendor_fulfillment_status: [
        "pending",
        "preparing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      wallet_transaction_type: [
        "commission",
        "bonus",
        "withdrawal",
        "store_credit",
        "adjustment",
      ],
      withdrawal_status: ["pending", "approved", "rejected", "completed"],
    },
  },
} as const
