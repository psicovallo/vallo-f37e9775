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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      conflict_profiles: {
        Row: {
          created_at: string
          failure_history: string
          id: string
          lingua_bersaglio: string
          name: string
          profile_description: string
          relationship: string
          scenario: string
          updated_at: string
          user_id: string
          user_style: string
        }
        Insert: {
          created_at?: string
          failure_history?: string
          id?: string
          lingua_bersaglio?: string
          name?: string
          profile_description?: string
          relationship?: string
          scenario?: string
          updated_at?: string
          user_id: string
          user_style?: string
        }
        Update: {
          created_at?: string
          failure_history?: string
          id?: string
          lingua_bersaglio?: string
          name?: string
          profile_description?: string
          relationship?: string
          scenario?: string
          updated_at?: string
          user_id?: string
          user_style?: string
        }
        Relationships: []
      }
      conflict_questions: {
        Row: {
          adjustment_notes: string | null
          archived: boolean
          conflict_profile_id: string
          created_at: string
          id: string
          maestri_used: string
          question_text: string
          question_text_translated: string | null
          status: string
          times: string[] | null
          user_id: string
          validation_text: string
          velo_number: number
        }
        Insert: {
          adjustment_notes?: string | null
          archived?: boolean
          conflict_profile_id: string
          created_at?: string
          id?: string
          maestri_used?: string
          question_text?: string
          question_text_translated?: string | null
          status?: string
          times?: string[] | null
          user_id: string
          validation_text?: string
          velo_number?: number
        }
        Update: {
          adjustment_notes?: string | null
          archived?: boolean
          conflict_profile_id?: string
          created_at?: string
          id?: string
          maestri_used?: string
          question_text?: string
          question_text_translated?: string | null
          status?: string
          times?: string[] | null
          user_id?: string
          validation_text?: string
          velo_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "conflict_questions_conflict_profile_id_fkey"
            columns: ["conflict_profile_id"]
            isOneToOne: false
            referencedRelation: "conflict_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      forgia_challenges: {
        Row: {
          challenge_type: string
          created_at: string
          cycle_id: string | null
          day_number: number
          id: string
          options: string[] | null
          question: string
          submitted_at: string | null
          user_id: string
          user_response: string | null
        }
        Insert: {
          challenge_type?: string
          created_at?: string
          cycle_id?: string | null
          day_number?: number
          id?: string
          options?: string[] | null
          question: string
          submitted_at?: string | null
          user_id: string
          user_response?: string | null
        }
        Update: {
          challenge_type?: string
          created_at?: string
          cycle_id?: string | null
          day_number?: number
          id?: string
          options?: string[] | null
          question?: string
          submitted_at?: string | null
          user_id?: string
          user_response?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forgia_challenges_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "forgia_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      forgia_cycles: {
        Row: {
          created_at: string
          critical_areas: string[] | null
          cycle_number: number
          ended_at: string | null
          id: string
          improvements: string[] | null
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          critical_areas?: string[] | null
          cycle_number?: number
          ended_at?: string | null
          id?: string
          improvements?: string[] | null
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          critical_areas?: string[] | null
          cycle_number?: number
          ended_at?: string | null
          id?: string
          improvements?: string[] | null
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          created_at: string
          from_role: Database["public"]["Enums"]["message_role"]
          id: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          from_role?: Database["public"]["Enums"]["message_role"]
          id?: string
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          from_role?: Database["public"]["Enums"]["message_role"]
          id?: string
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          created_at: string
          id: string
          text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          body: string
          category: string
          id: string
          sent_at: string
          title: string
          url: string | null
          user_id: string
        }
        Insert: {
          body: string
          category: string
          id?: string
          sent_at?: string
          title: string
          url?: string | null
          user_id: string
        }
        Update: {
          body?: string
          category?: string
          id?: string
          sent_at?: string
          title?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      overton_shifts: {
        Row: {
          created_at: string
          current_step: number
          goal_text: string
          id: string
          status: string
          step_confirmed_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_step?: number
          goal_text: string
          id?: string
          status?: string
          step_confirmed_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_step?: number
          goal_text?: string
          id?: string
          status?: string
          step_confirmed_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      overton_steps: {
        Row: {
          action_text: string
          archived: boolean
          confirmed: boolean
          confirmed_at: string | null
          created_at: string
          id: string
          label: string
          shift_id: string
          step_number: number
          times: string[] | null
          user_id: string
        }
        Insert: {
          action_text: string
          archived?: boolean
          confirmed?: boolean
          confirmed_at?: string | null
          created_at?: string
          id?: string
          label: string
          shift_id: string
          step_number: number
          times?: string[] | null
          user_id: string
        }
        Update: {
          action_text?: string
          archived?: boolean
          confirmed?: boolean
          confirmed_at?: string | null
          created_at?: string
          id?: string
          label?: string
          shift_id?: string
          step_number?: number
          times?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "overton_steps_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "overton_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      phalanx_pacts: {
        Row: {
          accepted_at: string | null
          corrupted_at: string | null
          created_at: string
          general_id: string
          id: string
          invite_token: string
          recruit_id: string | null
          recruit_name: string | null
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          corrupted_at?: string | null
          created_at?: string
          general_id: string
          id?: string
          invite_token: string
          recruit_id?: string | null
          recruit_name?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          corrupted_at?: string | null
          created_at?: string
          general_id?: string
          id?: string
          invite_token?: string
          recruit_id?: string | null
          recruit_name?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      phone_verifications: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          phone_number: string
          user_id: string | null
          verified_at: string | null
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          phone_number: string
          user_id?: string | null
          verified_at?: string | null
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone_number?: string
          user_id?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      phrases: {
        Row: {
          category: string
          created_at: string
          id: string
          text: string
          type: Database["public"]["Enums"]["phrase_type"]
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          text: string
          type: Database["public"]["Enums"]["phrase_type"]
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          text?: string
          type?: Database["public"]["Enums"]["phrase_type"]
        }
        Relationships: []
      }
      profile_analysis_archive: {
        Row: {
          analysis_text: string
          archived_at: string
          created_at: string
          cycle_number: number
          id: string
          user_id: string
        }
        Insert: {
          analysis_text: string
          archived_at?: string
          created_at?: string
          cycle_number?: number
          id?: string
          user_id: string
        }
        Update: {
          analysis_text?: string
          archived_at?: string
          created_at?: string
          cycle_number?: number
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ai_profile_analysis: string | null
          ai_profile_updated_at: string | null
          communication_style: string | null
          consecutive_silent_days: number
          created_at: string
          current_problems: string | null
          email: string | null
          financial_debt: number
          id: string
          last_activity_at: string | null
          last_clean_day_at: string | null
          last_mandato_email_sent_at: string | null
          last_passivity_tax_at: string | null
          last_roll_call_check_date: string | null
          last_vice_timestamp: string | null
          lingua_madre: string
          lucidity_level: number
          milestone_zero: string | null
          monthly_financial_target: number
          name: string | null
          objective: string | null
          phalanx_multiplier: number
          phone_number: string | null
          quantum_enabled: boolean
          sovereign_streak: number
          tour_completed: boolean
          triage_focus: string | null
          triage_goal: string | null
          triage_reason: string | null
          user_id: string
          vision: string | null
          wa_notifications_enabled: boolean
        }
        Insert: {
          ai_profile_analysis?: string | null
          ai_profile_updated_at?: string | null
          communication_style?: string | null
          consecutive_silent_days?: number
          created_at?: string
          current_problems?: string | null
          email?: string | null
          financial_debt?: number
          id?: string
          last_activity_at?: string | null
          last_clean_day_at?: string | null
          last_mandato_email_sent_at?: string | null
          last_passivity_tax_at?: string | null
          last_roll_call_check_date?: string | null
          last_vice_timestamp?: string | null
          lingua_madre?: string
          lucidity_level?: number
          milestone_zero?: string | null
          monthly_financial_target?: number
          name?: string | null
          objective?: string | null
          phalanx_multiplier?: number
          phone_number?: string | null
          quantum_enabled?: boolean
          sovereign_streak?: number
          tour_completed?: boolean
          triage_focus?: string | null
          triage_goal?: string | null
          triage_reason?: string | null
          user_id: string
          vision?: string | null
          wa_notifications_enabled?: boolean
        }
        Update: {
          ai_profile_analysis?: string | null
          ai_profile_updated_at?: string | null
          communication_style?: string | null
          consecutive_silent_days?: number
          created_at?: string
          current_problems?: string | null
          email?: string | null
          financial_debt?: number
          id?: string
          last_activity_at?: string | null
          last_clean_day_at?: string | null
          last_mandato_email_sent_at?: string | null
          last_passivity_tax_at?: string | null
          last_roll_call_check_date?: string | null
          last_vice_timestamp?: string | null
          lingua_madre?: string
          lucidity_level?: number
          milestone_zero?: string | null
          monthly_financial_target?: number
          name?: string | null
          objective?: string | null
          phalanx_multiplier?: number
          phone_number?: string | null
          quantum_enabled?: boolean
          sovereign_streak?: number
          tour_completed?: boolean
          triage_focus?: string | null
          triage_goal?: string | null
          triage_reason?: string | null
          user_id?: string
          vision?: string | null
          wa_notifications_enabled?: boolean
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string | null
        }
        Relationships: []
      }
      question_answers: {
        Row: {
          answer_button: string
          answer_text: string
          created_at: string
          id: string
          question_index: number
          question_text: string
          user_id: string
        }
        Insert: {
          answer_button: string
          answer_text: string
          created_at?: string
          id?: string
          question_index: number
          question_text: string
          user_id: string
        }
        Update: {
          answer_button?: string
          answer_text?: string
          created_at?: string
          id?: string
          question_index?: number
          question_text?: string
          user_id?: string
        }
        Relationships: []
      }
      question_assignments: {
        Row: {
          archived: boolean
          created_at: string
          id: string
          is_seed_question: boolean
          phase_b_unlock_at: string | null
          question_text: string
          sort_order: number
          status: Database["public"]["Enums"]["assignment_status"]
          times: string[] | null
          user_id: string
          view_count: number
        }
        Insert: {
          archived?: boolean
          created_at?: string
          id?: string
          is_seed_question?: boolean
          phase_b_unlock_at?: string | null
          question_text: string
          sort_order?: number
          status?: Database["public"]["Enums"]["assignment_status"]
          times?: string[] | null
          user_id: string
          view_count?: number
        }
        Update: {
          archived?: boolean
          created_at?: string
          id?: string
          is_seed_question?: boolean
          phase_b_unlock_at?: string | null
          question_text?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["assignment_status"]
          times?: string[] | null
          user_id?: string
          view_count?: number
        }
        Relationships: []
      }
      question_deliveries: {
        Row: {
          created_at: string
          delivered_at: string
          id: string
          question_index: number
          read_at: string | null
          read_completed: boolean
          read_duration_seconds: number
          user_id: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string
          id?: string
          question_index: number
          read_at?: string | null
          read_completed?: boolean
          read_duration_seconds?: number
          user_id: string
        }
        Update: {
          created_at?: string
          delivered_at?: string
          id?: string
          question_index?: number
          read_at?: string | null
          read_completed?: boolean
          read_duration_seconds?: number
          user_id?: string
        }
        Relationships: []
      }
      question_notes: {
        Row: {
          assignment_id: string
          created_at: string
          id: string
          text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          id?: string
          text?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          id?: string
          text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_notes_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "question_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      question_official_answers: {
        Row: {
          answer_text: string
          assignment_id: string
          button_clicked: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          answer_text: string
          assignment_id: string
          button_clicked: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          answer_text?: string
          assignment_id?: string
          button_clicked?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_official_answers_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "question_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      question_progress: {
        Row: {
          answer_button: string | null
          answer_text: string | null
          answered: boolean
          answered_at: string | null
          created_at: string
          current_question_index: number
          custom_dna_text: string | null
          custom_overton_text: string | null
          custom_questions_text: string | null
          custom_sfogo_text: string | null
          daily_times: string[] | null
          daily_times_date: string | null
          dna_daily_times: string[] | null
          dna_daily_times_date: string | null
          dna_frequency: string
          dna_per_day: number
          id: string
          notification_window_end: string | null
          notification_window_start: string | null
          notify_days: string[]
          notify_dna: boolean
          notify_overton: boolean
          notify_questions: boolean
          notify_sfogo: boolean
          onboarding_completed: boolean
          phase: string
          questions_frequency: string
          questions_per_day: number
          questions_read_count: number
          sfogo_daily_times: string[] | null
          sfogo_daily_times_date: string | null
          sfogo_frequency: string
          sfogo_per_day: number
          updated_at: string
          user_id: string
        }
        Insert: {
          answer_button?: string | null
          answer_text?: string | null
          answered?: boolean
          answered_at?: string | null
          created_at?: string
          current_question_index?: number
          custom_dna_text?: string | null
          custom_overton_text?: string | null
          custom_questions_text?: string | null
          custom_sfogo_text?: string | null
          daily_times?: string[] | null
          daily_times_date?: string | null
          dna_daily_times?: string[] | null
          dna_daily_times_date?: string | null
          dna_frequency?: string
          dna_per_day?: number
          id?: string
          notification_window_end?: string | null
          notification_window_start?: string | null
          notify_days?: string[]
          notify_dna?: boolean
          notify_overton?: boolean
          notify_questions?: boolean
          notify_sfogo?: boolean
          onboarding_completed?: boolean
          phase?: string
          questions_frequency?: string
          questions_per_day?: number
          questions_read_count?: number
          sfogo_daily_times?: string[] | null
          sfogo_daily_times_date?: string | null
          sfogo_frequency?: string
          sfogo_per_day?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          answer_button?: string | null
          answer_text?: string | null
          answered?: boolean
          answered_at?: string | null
          created_at?: string
          current_question_index?: number
          custom_dna_text?: string | null
          custom_overton_text?: string | null
          custom_questions_text?: string | null
          custom_sfogo_text?: string | null
          daily_times?: string[] | null
          daily_times_date?: string | null
          dna_daily_times?: string[] | null
          dna_daily_times_date?: string | null
          dna_frequency?: string
          dna_per_day?: number
          id?: string
          notification_window_end?: string | null
          notification_window_start?: string | null
          notify_days?: string[]
          notify_dna?: boolean
          notify_overton?: boolean
          notify_questions?: boolean
          notify_sfogo?: boolean
          onboarding_completed?: boolean
          phase?: string
          questions_frequency?: string
          questions_per_day?: number
          questions_read_count?: number
          sfogo_daily_times?: string[] | null
          sfogo_daily_times_date?: string | null
          sfogo_frequency?: string
          sfogo_per_day?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          active: boolean
          created_at: string
          id: string
          text: string
          times: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          text: string
          times?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          text?: string
          times?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sfogo_questions: {
        Row: {
          active: boolean
          archived: boolean
          created_at: string
          id: string
          question_text: string
          times: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          archived?: boolean
          created_at?: string
          id?: string
          question_text: string
          times?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          archived?: boolean
          created_at?: string
          id?: string
          question_text?: string
          times?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_chat_messages: {
        Row: {
          audio_duration_sec: number | null
          audio_path: string | null
          body: string
          chat_id: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
          transcript: string | null
          transcript_lang: string
        }
        Insert: {
          audio_duration_sec?: number | null
          audio_path?: string | null
          body?: string
          chat_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
          transcript?: string | null
          transcript_lang?: string
        }
        Update: {
          audio_duration_sec?: number | null
          audio_path?: string | null
          body?: string
          chat_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
          transcript?: string | null
          transcript_lang?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "user_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      user_chats: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
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
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_chat_member: {
        Args: { _chat_id: string; _user_id: string }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      assignment_status: "da_leggere" | "in_incubazione" | "risolta"
      message_role: "user" | "admin"
      phrase_type: "mantra" | "domanda"
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
      app_role: ["admin", "moderator", "user"],
      assignment_status: ["da_leggere", "in_incubazione", "risolta"],
      message_role: ["user", "admin"],
      phrase_type: ["mantra", "domanda"],
    },
  },
} as const
