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
      images: {
        Row: {
          created_at: string
          id: string
          public_url: string | null
          reading_id: string
          source: string
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          public_url?: string | null
          reading_id: string
          source: string
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          public_url?: string | null
          reading_id?: string
          source?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "images_reading_id_fkey"
            columns: ["reading_id"]
            isOneToOne: false
            referencedRelation: "admin_reading_overview"
            referencedColumns: ["reading_id"]
          },
          {
            foreignKeyName: "images_reading_id_fkey"
            columns: ["reading_id"]
            isOneToOne: false
            referencedRelation: "palm_readings"
            referencedColumns: ["id"]
          },
        ]
      }
      palm_features: {
        Row: {
          created_at: string
          extracted_features: Json
          head_line: string | null
          heart_line: string | null
          id: string
          life_line_clarity: string | null
          major_mounts: Json | null
          palm_shape: string | null
          reading_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          extracted_features: Json
          head_line?: string | null
          heart_line?: string | null
          id?: string
          life_line_clarity?: string | null
          major_mounts?: Json | null
          palm_shape?: string | null
          reading_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          extracted_features?: Json
          head_line?: string | null
          heart_line?: string | null
          id?: string
          life_line_clarity?: string | null
          major_mounts?: Json | null
          palm_shape?: string | null
          reading_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "palm_features_reading_id_fkey"
            columns: ["reading_id"]
            isOneToOne: true
            referencedRelation: "admin_reading_overview"
            referencedColumns: ["reading_id"]
          },
          {
            foreignKeyName: "palm_features_reading_id_fkey"
            columns: ["reading_id"]
            isOneToOne: true
            referencedRelation: "palm_readings"
            referencedColumns: ["id"]
          },
        ]
      }
      palm_readings: {
        Row: {
          age: number | null
          analysis_status: string
          created_at: string
          dominant_hand: Database["public"]["Enums"]["hand_side"]
          gender: string | null
          hand_side: Database["public"]["Enums"]["hand_side"]
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number | null
          analysis_status?: string
          created_at?: string
          dominant_hand: Database["public"]["Enums"]["hand_side"]
          gender?: string | null
          hand_side: Database["public"]["Enums"]["hand_side"]
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number | null
          analysis_status?: string
          created_at?: string
          dominant_hand?: Database["public"]["Enums"]["hand_side"]
          gender?: string | null
          hand_side?: Database["public"]["Enums"]["hand_side"]
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_inr: number
          created_at: string
          currency: string
          id: string
          paid_at: string | null
          provider: string
          provider_order_id: string | null
          provider_payment_id: string | null
          provider_signature: string | null
          reading_id: string
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_inr: number
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          provider?: string
          provider_order_id?: string | null
          provider_payment_id?: string | null
          provider_signature?: string | null
          reading_id: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_inr?: number
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          provider?: string
          provider_order_id?: string | null
          provider_payment_id?: string | null
          provider_signature?: string | null
          reading_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_reading_id_fkey"
            columns: ["reading_id"]
            isOneToOne: false
            referencedRelation: "admin_reading_overview"
            referencedColumns: ["reading_id"]
          },
          {
            foreignKeyName: "payments_reading_id_fkey"
            columns: ["reading_id"]
            isOneToOne: false
            referencedRelation: "palm_readings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          created_at: string
          full_name: string | null
          gender: string | null
          id: string
          updated_at: string
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          gender?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          gender?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          free_preview: string
          full_report: string
          generated_from_features: Json
          id: string
          is_unlocked: boolean
          reading_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          free_preview: string
          full_report: string
          generated_from_features: Json
          id?: string
          is_unlocked?: boolean
          reading_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          free_preview?: string
          full_report?: string
          generated_from_features?: Json
          id?: string
          is_unlocked?: boolean
          reading_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reading_id_fkey"
            columns: ["reading_id"]
            isOneToOne: true
            referencedRelation: "admin_reading_overview"
            referencedColumns: ["reading_id"]
          },
          {
            foreignKeyName: "reports_reading_id_fkey"
            columns: ["reading_id"]
            isOneToOne: true
            referencedRelation: "palm_readings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      admin_reading_overview: {
        Row: {
          amount_inr: number | null
          analysis_status: string | null
          dominant_hand: Database["public"]["Enums"]["hand_side"] | null
          hand_side: Database["public"]["Enums"]["hand_side"] | null
          is_unlocked: boolean | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          provider_payment_id: string | null
          reading_id: string | null
          report_id: string | null
          submitted_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      hand_side: "left" | "right"
      payment_status: "pending" | "successful" | "failed"
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
      app_role: ["admin", "user"],
      hand_side: ["left", "right"],
      payment_status: ["pending", "successful", "failed"],
    },
  },
} as const
