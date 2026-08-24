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
      bookings: {
        Row: {
          created_at: string
          feedback_comentario: string | null
          feedback_nota: number | null
          id: string
          motivo: string | null
          slot_id: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback_comentario?: string | null
          feedback_nota?: number | null
          id?: string
          motivo?: string | null
          slot_id: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feedback_comentario?: string | null
          feedback_nota?: number | null
          id?: string
          motivo?: string | null
          slot_id?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "service_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_participations: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          pontos: number
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          pontos?: number
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          pontos?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_participations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          ends_on: string | null
          id: string
          kind: Database["public"]["Enums"]["campaign_kind"]
          pontos: number
          starts_on: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          ends_on?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["campaign_kind"]
          pontos?: number
          starts_on?: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          ends_on?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["campaign_kind"]
          pontos?: number
          starts_on?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_views: {
        Row: {
          content_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_views_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
        ]
      }
      contents: {
        Row: {
          created_at: string
          description: string | null
          duracao: string | null
          fonte: string | null
          id: string
          published: boolean
          tema: string
          tipo: Database["public"]["Enums"]["content_type"]
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duracao?: string | null
          fonte?: string | null
          id?: string
          published?: boolean
          tema?: string
          tipo?: Database["public"]["Enums"]["content_type"]
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duracao?: string | null
          fonte?: string | null
          id?: string
          published?: boolean
          tema?: string
          tipo?: Database["public"]["Enums"]["content_type"]
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          alvo: number
          created_at: string
          id: string
          prazo: string | null
          progresso: number
          title: string
          unidade: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alvo?: number
          created_at?: string
          id?: string
          prazo?: string | null
          progresso?: number
          title: string
          unidade?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alvo?: number
          created_at?: string
          id?: string
          prazo?: string | null
          progresso?: number
          title?: string
          unidade?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          setor: string | null
          telefone: string | null
          unidade: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          setor?: string | null
          telefone?: string | null
          unidade?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          setor?: string | null
          telefone?: string | null
          unidade?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      service_slots: {
        Row: {
          cancelled: boolean
          capacity: number
          created_at: string
          ends_at: string
          id: string
          link: string | null
          local: string | null
          provider_id: string | null
          service_id: string
          starts_at: string
          updated_at: string
        }
        Insert: {
          cancelled?: boolean
          capacity?: number
          created_at?: string
          ends_at: string
          id?: string
          link?: string | null
          local?: string | null
          provider_id?: string | null
          service_id: string
          starts_at: string
          updated_at?: string
        }
        Update: {
          cancelled?: boolean
          capacity?: number
          created_at?: string
          ends_at?: string
          id?: string
          link?: string | null
          local?: string | null
          provider_id?: string | null
          service_id?: string
          starts_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_slots_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          categoria: string
          created_at: string
          default_capacity: number
          description: string | null
          duration_min: number
          id: string
          local: string | null
          modality: Database["public"]["Enums"]["service_modality"]
          name: string
          provider_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          categoria?: string
          created_at?: string
          default_capacity?: number
          description?: string | null
          duration_min?: number
          id?: string
          local?: string | null
          modality?: Database["public"]["Enums"]["service_modality"]
          name: string
          provider_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          categoria?: string
          created_at?: string
          default_capacity?: number
          description?: string | null
          duration_min?: number
          id?: string
          local?: string | null
          modality?: Database["public"]["Enums"]["service_modality"]
          name?: string
          provider_id?: string | null
          updated_at?: string
        }
        Relationships: []
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
      wellbeing_checkins: {
        Row: {
          created_at: string
          dor: number
          energia: number
          humor: number
          id: string
          observacao: string | null
          queixa: string | null
          sono_horas: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          dor?: number
          energia: number
          humor: number
          id?: string
          observacao?: string | null
          queixa?: string | null
          sono_horas?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          dor?: number
          energia?: number
          humor?: number
          id?: string
          observacao?: string | null
          queixa?: string | null
          sono_horas?: number | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      indicadores_gerais: { Args: { _desde?: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "gestor" | "ofertador" | "trabalhador"
      booking_status:
        | "agendado"
        | "confirmado"
        | "cancelado"
        | "presente"
        | "falta"
      campaign_kind: "campanha" | "sipat" | "desafio"
      content_type: "video" | "podcast" | "cartilha" | "audio" | "noticia"
      service_modality: "individual" | "coletiva"
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
      app_role: ["admin", "gestor", "ofertador", "trabalhador"],
      booking_status: [
        "agendado",
        "confirmado",
        "cancelado",
        "presente",
        "falta",
      ],
      campaign_kind: ["campanha", "sipat", "desafio"],
      content_type: ["video", "podcast", "cartilha", "audio", "noticia"],
      service_modality: ["individual", "coletiva"],
    },
  },
} as const
