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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      admin_logs: {
        Row: {
          action: string
          admin_email: string
          admin_user_id: string | null
          after_value: Json | null
          before_value: Json | null
          category: string
          created_at: string
          details: Json
          error_message: string | null
          id: string
          success: boolean
          target_name: string | null
          target_public_id: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_email?: string
          admin_user_id?: string | null
          after_value?: Json | null
          before_value?: Json | null
          category?: string
          created_at?: string
          details?: Json
          error_message?: string | null
          id?: string
          success?: boolean
          target_name?: string | null
          target_public_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_email?: string
          admin_user_id?: string | null
          after_value?: Json | null
          before_value?: Json | null
          category?: string
          created_at?: string
          details?: Json
          error_message?: string | null
          id?: string
          success?: boolean
          target_name?: string | null
          target_public_id?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          active: boolean
          audience: string
          audience_value: string | null
          body: string
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          kind: string
          starts_at: string
          target_user_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          audience?: string
          audience_value?: string | null
          body?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          kind?: string
          starts_at?: string
          target_user_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          audience?: string
          audience_value?: string | null
          body?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          kind?: string
          starts_at?: string
          target_user_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      game_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      gift_code_uses: {
        Row: {
          code: string
          created_at: string
          id: string
          public_id: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          public_id?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          public_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_code_uses_code_fkey"
            columns: ["code"]
            isOneToOne: false
            referencedRelation: "gift_codes"
            referencedColumns: ["code"]
          },
        ]
      }
      gift_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          label: string
          max_uses: number | null
          money: number
          monster_id: string | null
          monster_rarity: string | null
          once_per_player: boolean
          shards: number
          updated_at: string
          uses: number
          xp: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          label?: string
          max_uses?: number | null
          money?: number
          monster_id?: string | null
          monster_rarity?: string | null
          once_per_player?: boolean
          shards?: number
          updated_at?: string
          uses?: number
          xp?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          label?: string
          max_uses?: number | null
          money?: number
          monster_id?: string | null
          monster_rarity?: string | null
          once_per_player?: boolean
          shards?: number
          updated_at?: string
          uses?: number
          xp?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar: string
          avatar_monster_id: string | null
          created_at: string
          display_name: string
          level: number
          money: number
          monsters: Json
          public_id: string
          shards: number
          stats: Json
          streak_best: number
          streak_current: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          avatar?: string
          avatar_monster_id?: string | null
          created_at?: string
          display_name?: string
          level?: number
          money?: number
          monsters?: Json
          public_id: string
          shards?: number
          stats?: Json
          streak_best?: number
          streak_current?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          avatar?: string
          avatar_monster_id?: string | null
          created_at?: string
          display_name?: string
          level?: number
          money?: number
          monsters?: Json
          public_id?: string
          shards?: number
          stats?: Json
          streak_best?: number
          streak_current?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      saves: {
        Row: {
          created_at: string
          rev: number
          state: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          rev?: number
          state: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          rev?: number
          state?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_bump_save_rev: { Args: { _user_id: string }; Returns: number }
      generate_public_id: { Args: never; Returns: string }
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
