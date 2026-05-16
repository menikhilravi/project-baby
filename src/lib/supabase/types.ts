/**
 * Hand-written types matching supabase/migrations/0001_init.sql.
 * Regenerate with: supabase gen types typescript --project-id <ref> > src/lib/supabase/types.ts
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          couple_id: string | null;
          role: "mom" | "dad" | null;
          birth_date: string | null;
          phase_override: "prenatal" | "postnatal" | null;
          hidden_sections: string[];
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          couple_id?: string | null;
          role?: "mom" | "dad" | null;
          birth_date?: string | null;
          phase_override?: "prenatal" | "postnatal" | null;
          hidden_sections?: string[];
          created_at?: string;
        };
        Update: {
          email?: string | null;
          couple_id?: string | null;
          role?: "mom" | "dad" | null;
          birth_date?: string | null;
          phase_override?: "prenatal" | "postnatal" | null;
          hidden_sections?: string[];
        };
        Relationships: [];
      };
      couples: {
        Row: {
          id: string;
          invite_code: string;
          created_at: string;
        };
        Insert: { id?: string; invite_code: string; created_at?: string };
        Update: { invite_code?: string };
        Relationships: [];
      };
      gear_items: {
        Row: {
          id: string;
          user_id: string;
          couple_id: string | null;
          name: string;
          emoji: string;
          target_price: number | null;
          last_target_hit_at: string | null;
          is_target_hit_acknowledged: boolean;
          kind: "registry" | "supplies";
          quantity: number;
          low_threshold: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          couple_id?: string | null;
          name: string;
          emoji?: string;
          target_price?: number | null;
          last_target_hit_at?: string | null;
          is_target_hit_acknowledged?: boolean;
          kind?: "registry" | "supplies";
          quantity?: number;
          low_threshold?: number;
        };
        Update: {
          name?: string;
          emoji?: string;
          target_price?: number | null;
          couple_id?: string | null;
          last_target_hit_at?: string | null;
          is_target_hit_acknowledged?: boolean;
          kind?: "registry" | "supplies";
          quantity?: number;
          low_threshold?: number;
        };
        Relationships: [];
      };
      gear_watchers: {
        Row: {
          id: string;
          item_id: string;
          retailer: string;
          url: string;
          current_price: number | null;
          last_checked_at: string | null;
          last_checked_status: "pending" | "ok" | "failed";
          last_error: string | null;
          is_paused: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          retailer: string;
          url: string;
          current_price?: number | null;
          last_checked_at?: string | null;
          last_checked_status?: "pending" | "ok" | "failed";
          last_error?: string | null;
          is_paused?: boolean;
        };
        Update: {
          retailer?: string;
          url?: string;
          current_price?: number | null;
          last_checked_at?: string | null;
          last_checked_status?: "pending" | "ok" | "failed";
          last_error?: string | null;
          is_paused?: boolean;
        };
        Relationships: [];
      };
      gear_price_history: {
        Row: {
          id: number;
          watcher_id: string;
          price: number;
          recorded_at: string;
        };
        Insert: { id?: number; watcher_id: string; price: number; recorded_at?: string };
        Update: { price?: number };
        Relationships: [];
      };
      name_swipes: {
        Row: {
          id: number;
          user_id: string;
          name: string;
          verdict: "like" | "pass";
          rank: number | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          name: string;
          verdict: "like" | "pass";
          rank?: number | null;
          created_at?: string;
        };
        Update: { verdict?: "like" | "pass"; rank?: number | null };
        Relationships: [];
      };
      hospital_checklist: {
        Row: {
          id: number;
          user_id: string;
          couple_id: string | null;
          owner: "mom" | "dad" | "baby";
          item: string;
          checked: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          couple_id?: string | null;
          owner: "mom" | "dad" | "baby";
          item: string;
          checked?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          item?: string;
          couple_id?: string | null;
          checked?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };
      generated_names: {
        Row: {
          id: number;
          user_id: string;
          name: string;
          origin: string;
          meaning: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          name: string;
          origin: string;
          meaning: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      cards: {
        Row: {
          id: string;
          name: string;
          issuer: string;
          network: string;
          base_multiplier: number;
          point_value_cents: number;
        };
        Insert: {
          id: string;
          name: string;
          issuer: string;
          network: string;
          base_multiplier?: number;
          point_value_cents?: number;
        };
        Update: {
          name?: string;
          issuer?: string;
          network?: string;
          base_multiplier?: number;
          point_value_cents?: number;
        };
        Relationships: [];
      };
      card_categories: {
        Row: {
          card_id: string;
          category: string;
          multiplier: number;
        };
        Insert: { card_id: string; category: string; multiplier: number };
        Update: { multiplier?: number };
        Relationships: [];
      };
      nursery_checklist: {
        Row: {
          id: number;
          user_id: string;
          couple_id: string | null;
          owner: "room" | "safety" | "supplies";
          item: string;
          checked: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          couple_id?: string | null;
          owner: "room" | "safety" | "supplies";
          item: string;
          checked?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          item?: string;
          couple_id?: string | null;
          checked?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };
      baby_events: {
        Row: {
          id: number;
          user_id: string;
          couple_id: string | null;
          kind: "feed" | "diaper" | "sleep" | "kick";
          occurred_at: string;
          ended_at: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          couple_id?: string | null;
          kind: "feed" | "diaper" | "sleep" | "kick";
          occurred_at?: string;
          ended_at?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          kind?: "feed" | "diaper" | "sleep" | "kick";
          occurred_at?: string;
          ended_at?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      notes: {
        Row: {
          id: number;
          user_id: string;
          couple_id: string | null;
          title: string;
          body: string;
          pinned: boolean;
          embedding: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          couple_id?: string | null;
          title: string;
          body?: string;
          pinned?: boolean;
          embedding?: string | null;
        };
        Update: {
          title?: string;
          body?: string;
          pinned?: boolean;
          embedding?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      kick_sessions_for_couple: {
        Args: {
          p_couple_id: string | null;
          p_user_id: string;
          p_since: string;
        };
        Returns: {
          session_start: string;
          session_end: string;
          kick_count: number;
          reached_ten_at: string | null;
        }[];
      };
      search_notes: {
        Args: {
          p_query: string;
          p_query_embedding: string | null;
          p_couple_id: string | null;
          p_user_id: string;
          p_limit?: number;
          p_rrf_k?: number;
        };
        Returns: {
          id: number;
          title: string;
          body: string;
          pinned: boolean;
          updated_at: string;
          score: number;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
