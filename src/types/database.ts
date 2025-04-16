type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string
          user_id: string | null
          name: string
          sector: string
          phone_number: string | null
          forwarding_number: string | null
          language: string | null
          voice_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          sector: string
          phone_number?: string | null
          forwarding_number?: string | null
          language?: string | null
          voice_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          sector?: string
          phone_number?: string | null
          forwarding_number?: string | null
          language?: string | null
          voice_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      customers: {
        Row: {
          id: string
          business_id: string | null
          name: string | null
          phone_number: string | null
          email: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          business_id?: string | null
          name?: string | null
          phone_number?: string | null
          email?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          business_id?: string | null
          name?: string | null
          phone_number?: string | null
          email?: string | null
          created_at?: string | null
        }
      }
      conversations: {
        Row: {
          id: string
          business_id: string | null
          customer_id: string | null
          transcript: Json | null
          audio_url: string | null
          language: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          business_id?: string | null
          customer_id?: string | null
          transcript?: Json | null
          audio_url?: string | null
          language?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          business_id?: string | null
          customer_id?: string | null
          transcript?: Json | null
          audio_url?: string | null
          language?: string | null
          created_at?: string | null
        }
      }
      subscriptions: {
        Row: {
          id: string
          business_id: string | null
          stripe_subscription_id: string | null
          stripe_customer_id: string | null
          plan_id: string
          status: string
          current_period_end: string | null
          cancel_at_period_end: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          business_id?: string | null
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          plan_id: string
          status: string
          current_period_end?: string | null
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          business_id?: string | null
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          plan_id?: string
          status?: string
          current_period_end?: string | null
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
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
  }
}