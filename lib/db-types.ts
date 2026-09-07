export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      appeal_letters: {
        Row: {
          claim_id: string
          created_at: string | null
          generated_at: string | null
          generated_by: string
          id: string
          letter_content: string
          letter_type: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          claim_id: string
          created_at?: string | null
          generated_at?: string | null
          generated_by: string
          id?: string
          letter_content: string
          letter_type?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          claim_id?: string
          created_at?: string | null
          generated_at?: string | null
          generated_by?: string
          id?: string
          letter_content?: string
          letter_type?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appeal_letters_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appeal_letters_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims_with_patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appeal_letters_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_documents: {
        Row: {
          claim_id: string | null
          content_type: string | null
          file_name: string
          id: string
          s3_key: string
          size: number | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          claim_id?: string | null
          content_type?: string | null
          file_name: string
          id?: string
          s3_key: string
          size?: number | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          claim_id?: string | null
          content_type?: string | null
          file_name?: string
          id?: string
          s3_key?: string
          size?: number | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_documents_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_documents_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims_with_patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_notes: {
        Row: {
          claim_id: string
          created_at: string | null
          created_by: string
          id: string
          note: string
        }
        Insert: {
          claim_id: string
          created_at?: string | null
          created_by: string
          id?: string
          note: string
        }
        Update: {
          claim_id?: string
          created_at?: string | null
          created_by?: string
          id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "appeal_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_notes_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_notes_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims_with_patients"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_timeline: {
        Row: {
          claim_id: string
          created_at: string | null
          created_by: string | null
          event_description: string
          event_type: string
          id: string
        }
        Insert: {
          claim_id: string
          created_at?: string | null
          created_by?: string | null
          event_description: string
          event_type: string
          id?: string
        }
        Update: {
          claim_id?: string
          created_at?: string | null
          created_by?: string | null
          event_description?: string
          event_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appeal_timeline_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_timeline_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_timeline_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims_with_patients"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_insurance: {
        Row: {
          claim_address: string | null
          claim_id: string
          created_at: string | null
          effective_date: string | null
          group_number: string | null
          id: string
          insurance_provider: string
          member_dob: string | null
          member_name: string | null
          payer_id: string | null
          payer_phone_number: string | null
          plan_type: string | null
          policy_number: string
          priority: number
          termination_date: string | null
          updated_at: string | null
        }
        Insert: {
          claim_address?: string | null
          claim_id: string
          created_at?: string | null
          effective_date?: string | null
          group_number?: string | null
          id?: string
          insurance_provider: string
          member_dob?: string | null
          member_name?: string | null
          payer_id?: string | null
          payer_phone_number?: string | null
          plan_type?: string | null
          policy_number: string
          priority: number
          termination_date?: string | null
          updated_at?: string | null
        }
        Update: {
          claim_address?: string | null
          claim_id?: string
          created_at?: string | null
          effective_date?: string | null
          group_number?: string | null
          id?: string
          insurance_provider?: string
          member_dob?: string | null
          member_name?: string | null
          payer_id?: string | null
          payer_phone_number?: string | null
          plan_type?: string | null
          policy_number?: string
          priority?: number
          termination_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_claim"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_claim"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims_with_patients"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          answer: string
          category: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          question: string
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          question: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          question?: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          category: string | null
          claim_id: string | null
          created_at: string | null
          id: string
          priority: string | null
          profile_id: string | null
          status: string | null
          subject: string
          ticket_id: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          claim_id?: string | null
          created_at?: string | null
          id?: string
          priority?: string | null
          profile_id?: string | null
          status?: string | null
          subject: string
          ticket_id: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          claim_id?: string | null
          created_at?: string | null
          id?: string
          priority?: string | null
          profile_id?: string | null
          status?: string | null
          subject?: string
          ticket_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims_with_patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          attachments: string[] | null
          created_at: string | null
          id: string
          message: string
          sender_type: string
          ticket_id: string | null
        }
        Insert: {
          attachments?: string[] | null
          created_at?: string | null
          id?: string
          message: string
          sender_type: string
          ticket_id?: string | null
        }
        Update: {
          attachments?: string[] | null
          created_at?: string | null
          id?: string
          message?: string
          sender_type?: string
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      claims: {
        Row: {
          appeal_description: string
          appeal_reason: string
          appeal_type: string
          claim_id: string
          created_at: string | null
          denial_date: string
          denial_reason: string
          diagnosis_code: string
          facility_name: string | null
          follow_up_date: string | null
          group_number: string | null
          id: string
          insurance_plan: string
          insurance_provider: string
          letter_status: string | null
          original_claim_amount: number
          patient_id: string | null
          policy_number: string
          priority: string | null
          procedure_code: string
          provider_id: string
          provider_name: string
          service_date: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          appeal_description: string
          appeal_reason: string
          appeal_type: string
          claim_id: string
          created_at?: string | null
          denial_date: string
          denial_reason: string
          diagnosis_code: string
          facility_name?: string | null
          follow_up_date?: string | null
          group_number?: string | null
          id?: string
          insurance_plan: string
          insurance_provider: string
          letter_status?: string | null
          original_claim_amount: number
          patient_id?: string | null
          policy_number: string
          priority?: string | null
          procedure_code: string
          provider_id: string
          provider_name: string
          service_date: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          appeal_description?: string
          appeal_reason?: string
          appeal_type?: string
          claim_id?: string
          created_at?: string | null
          denial_date?: string
          denial_reason?: string
          diagnosis_code?: string
          facility_name?: string | null
          follow_up_date?: string | null
          group_number?: string | null
          id?: string
          insurance_plan?: string
          insurance_provider?: string
          letter_status?: string | null
          original_claim_amount?: number
          patient_id?: string | null
          policy_number?: string
          priority?: string | null
          procedure_code?: string
          provider_id?: string
          provider_name?: string
          service_date?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appeals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_patient_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          created_at: string | null
          dob: string | null
          first_name: string
          id: string
          last_name: string
          patient_external_id: string
          ssn: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dob?: string | null
          first_name: string
          id?: string
          last_name: string
          patient_external_id: string
          ssn?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dob?: string | null
          first_name?: string
          id?: string
          last_name?: string
          patient_external_id?: string
          ssn?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_insurance: {
        Row: {
          claim_address: string | null
          created_at: string | null
          effective_date: string | null
          group_number: string | null
          id: string
          insurance_provider: string
          member_dob: string | null
          member_name: string | null
          patient_id: string
          payer_id: string | null
          payer_phone_number: string | null
          plan_type: string | null
          policy_number: string
          priority: number
          termination_date: string | null
          updated_at: string | null
        }
        Insert: {
          claim_address?: string | null
          created_at?: string | null
          effective_date?: string | null
          group_number?: string | null
          id?: string
          insurance_provider: string
          member_dob?: string | null
          member_name?: string | null
          patient_id: string
          payer_id?: string | null
          payer_phone_number?: string | null
          plan_type?: string | null
          policy_number: string
          priority: number
          termination_date?: string | null
          updated_at?: string | null
        }
        Update: {
          claim_address?: string | null
          created_at?: string | null
          effective_date?: string | null
          group_number?: string | null
          id?: string
          insurance_provider?: string
          member_dob?: string | null
          member_name?: string | null
          patient_id?: string
          payer_id?: string | null
          payer_phone_number?: string | null
          plan_type?: string | null
          policy_number?: string
          priority?: number
          termination_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_patient"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          check_number: string | null
          claim_id: string
          created_at: string | null
          id: string
          notes: string | null
          payment_date: string
          payment_method: string
          payment_status: string
          reference_number: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          check_number?: string | null
          claim_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_date: string
          payment_method?: string
          payment_status?: string
          reference_number?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          check_number?: string | null
          claim_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          payment_status?: string
          reference_number?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims_with_patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          organization: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          organization?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          organization?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      claims_with_patients: {
        Row: {
          appeal_description: string
          appeal_reason: string
          appeal_type: string
          claim_id: string
          created_at: string | null
          denial_date: string
          denial_reason: string
          diagnosis_code: string
          dob: string | null
          facility_name: string | null
          first_name: string
          follow_up_date: string | null
          group_number: string | null
          id: string
          insurance_plan: string
          insurance_provider: string
          last_name: string
          letter_status: string | null
          original_claim_amount: number
          patient_id: string | null
          patient_name: string | null
          policy_number: string
          priority: string | null
          procedure_code: string
          provider_id: string
          provider_name: string
          service_date: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Relationships: [
          {
            foreignKeyName: "appeals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_patient_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_profile_if_missing: { Args: { user_id: string }; Returns: boolean }
      get_appeal_status_counts: {
        Args: never
        Returns: {
          count: number
          status: string
        }[]
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

type DefaultSchema = Database["public"]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof Database
}
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
