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
      attendance_logs: {
        Row: {
          check_in: string
          check_out: string | null
          created_at: string | null
          guard_id: string | null
          id: string
          latitude: number | null
          longitude: number | null
          post_id: string | null
          status: string | null
          type: string | null
        }
        Insert: {
          check_in: string
          check_out?: string | null
          created_at?: string | null
          guard_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          post_id?: string | null
          status?: string | null
          type?: string | null
        }
        Update: {
          check_in?: string
          check_out?: string | null
          created_at?: string | null
          guard_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          post_id?: string | null
          status?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_logs_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "guards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_logs_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          contact_person: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          ruc: string | null
          status: string | null
        }
        Insert: {
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          ruc?: string | null
          status?: string | null
        }
        Update: {
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          ruc?: string | null
          status?: string | null
        }
        Relationships: []
      }
      contracts: {
        Row: {
          billing_cycle: string | null
          client_id: string | null
          contract_number: string
          created_at: string | null
          end_date: string
          id: string
          start_date: string
          status: string | null
          total_value: number
        }
        Insert: {
          billing_cycle?: string | null
          client_id?: string | null
          contract_number: string
          created_at?: string | null
          end_date: string
          id?: string
          start_date: string
          status?: string | null
          total_value: number
        }
        Update: {
          billing_cycle?: string | null
          client_id?: string | null
          contract_number?: string
          created_at?: string | null
          end_date?: string
          id?: string
          start_date?: string
          status?: string | null
          total_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_orders: {
        Row: {
          amount: number
          category: string
          contract_id: string | null
          created_at: string | null
          id: string
          items_count: number | null
          notes: string | null
          order_date: string
          status: string | null
          supplier_name: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          category: string
          contract_id?: string | null
          created_at?: string | null
          id?: string
          items_count?: number | null
          notes?: string | null
          order_date: string
          status?: string | null
          supplier_name: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: string
          contract_id?: string | null
          created_at?: string | null
          id?: string
          items_count?: number | null
          notes?: string | null
          order_date?: string
          status?: string | null
          supplier_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_orders_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      guards: {
        Row: {
          address: string | null
          birth_date: string | null
          ci: string
          created_at: string | null
          current_post_id: string | null
          first_name: string
          hire_date: string | null
          id: string
          ips_number: string | null
          last_name: string
          phone: string | null
          status: string | null
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          ci: string
          created_at?: string | null
          current_post_id?: string | null
          first_name: string
          hire_date?: string | null
          id?: string
          ips_number?: string | null
          last_name: string
          phone?: string | null
          status?: string | null
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          ci?: string
          created_at?: string | null
          current_post_id?: string | null
          first_name?: string
          hire_date?: string | null
          id?: string
          ips_number?: string | null
          last_name?: string
          phone?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guards_current_post_id_fkey"
            columns: ["current_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          created_at: string | null
          description: string
          guard_id: string | null
          id: string
          post_id: string | null
          resolved_at: string | null
          severity: string | null
          status: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          description: string
          guard_id?: string | null
          id?: string
          post_id?: string | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          description?: string
          guard_id?: string | null
          id?: string
          post_id?: string | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "guards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_id: string | null
          contract_id: string | null
          created_at: string | null
          due_date: string
          ekuatia_number: string | null
          id: string
          invoice_number: string | null
          issue_date: string
          payment_date: string | null
          status: string | null
          subtotal: number
          tax_amount: number
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          contract_id?: string | null
          created_at?: string | null
          due_date: string
          ekuatia_number?: string | null
          id?: string
          invoice_number?: string | null
          issue_date: string
          payment_date?: string | null
          status?: string | null
          subtotal: number
          tax_amount: number
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          contract_id?: string | null
          created_at?: string | null
          due_date?: string
          ekuatia_number?: string | null
          id?: string
          invoice_number?: string | null
          issue_date?: string
          payment_date?: string | null
          status?: string | null
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          address: string
          client_id: string | null
          contract_id: string | null
          created_at: string | null
          guards_required: number | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          status: string | null
          type: string | null
        }
        Insert: {
          address: string
          client_id?: string | null
          contract_id?: string | null
          created_at?: string | null
          guards_required?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          status?: string | null
          type?: string | null
        }
        Update: {
          address?: string
          client_id?: string | null
          contract_id?: string | null
          created_at?: string | null
          guards_required?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          status?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      weapon_logs: {
        Row: {
          checked_in_at: string | null
          checked_out_at: string
          created_at: string | null
          guard_id: string | null
          id: string
          notes: string | null
          post_id: string | null
          weapon_id: string | null
        }
        Insert: {
          checked_in_at?: string | null
          checked_out_at?: string
          created_at?: string | null
          guard_id?: string | null
          id?: string
          notes?: string | null
          post_id?: string | null
          weapon_id?: string | null
        }
        Update: {
          checked_in_at?: string | null
          checked_out_at?: string
          created_at?: string | null
          guard_id?: string | null
          id?: string
          notes?: string | null
          post_id?: string | null
          weapon_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weapon_logs_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "guards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weapon_logs_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weapon_logs_weapon_id_fkey"
            columns: ["weapon_id"]
            isOneToOne: false
            referencedRelation: "weapons"
            referencedColumns: ["id"]
          },
        ]
      }
      weapons: {
        Row: {
          brand: string | null
          caliber: string | null
          created_at: string | null
          dimabel_expiration: string | null
          id: string
          model: string | null
          registration_number: string | null
          serial_number: string
          status: string | null
          type: string
        }
        Insert: {
          brand?: string | null
          caliber?: string | null
          created_at?: string | null
          dimabel_expiration?: string | null
          id?: string
          model?: string | null
          registration_number?: string | null
          serial_number: string
          status?: string | null
          type: string
        }
        Update: {
          brand?: string | null
          caliber?: string | null
          created_at?: string | null
          dimabel_expiration?: string | null
          id?: string
          model?: string | null
          registration_number?: string | null
          serial_number?: string
          status?: string | null
          type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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

