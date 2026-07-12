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
        Relationships: []
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
        Relationships: []
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
        ]
      }
      cart_items: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          quantity: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
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
        Relationships: []
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
        Relationships: []
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
            foreignKeyName: "orders_shipping_address_id_fkey"
            columns: ["shipping_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
            foreignKeyName: "wholesale_invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Functions: {
      admin_apply_product_cost_import: {
        Args: { _batch_id: string }
        Returns: Json
      }
      admin_preview_product_cost_import: {
        Args: { _rows: Json; _source_filename?: string }
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
      admin_update_order_status: {
        Args: {
          _new_status: Database["public"]["Enums"]["order_status"]
          _notes?: string
          _order_id: string
        }
        Returns: Json
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
      approve_wholesaler_application: {
        Args: { _app_id: string }
        Returns: Json
      }
      auto_reconcile_pending: { Args: never; Returns: number }
      auto_release_delivered_escrows: { Args: never; Returns: number }
      calculate_order_risk_score: { Args: { _order_id: string }; Returns: Json }
      can_insert_order_item_for_current_actor: {
        Args: { _order_id: string }
        Returns: boolean
      }
      capture_escrow: {
        Args: { _escrow_id: string; _reason?: string }
        Returns: boolean
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
      generate_invoice_number: { Args: never; Returns: string }
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
      is_2fa_session_valid: { Args: { _user_id: string }; Returns: boolean }
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
      safe_date_from_text: { Args: { _value: string }; Returns: string }
      safe_numeric_from_text: { Args: { _value: string }; Returns: number }
      score_order_risk: { Args: { _order_id: string }; Returns: string }
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
