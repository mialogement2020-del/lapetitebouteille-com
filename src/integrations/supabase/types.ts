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
            referencedRelation: "products"
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
          id: string
          level: number
          order_amount: number
          order_id: string | null
          paid_at: string | null
          purchaser_id: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
        }
        Insert: {
          beneficiary_id: string
          bonus_rate?: number | null
          commission_amount: number
          commission_rate: number
          created_at?: string | null
          id?: string
          level: number
          order_amount: number
          order_id?: string | null
          paid_at?: string | null
          purchaser_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
        }
        Update: {
          beneficiary_id?: string
          bonus_rate?: number | null
          commission_amount?: number
          commission_rate?: number
          created_at?: string | null
          id?: string
          level?: number
          order_amount?: number
          order_id?: string | null
          paid_at?: string | null
          purchaser_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
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
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          product_id: string | null
          product_image: string | null
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          product_id?: string | null
          product_image?: string | null
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          product_id?: string | null
          product_image?: string | null
          product_name?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
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
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          delivery_fee: number | null
          discount_amount: number | null
          guest_email: string | null
          guest_phone: string | null
          id: string
          notes: string | null
          order_lookup_token: string | null
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_reference: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          referral_code_used: string | null
          referrer_id: string | null
          shipping_address_id: string | null
          shipping_city: string | null
          shipping_full_name: string | null
          shipping_neighborhood: string | null
          shipping_notes: string | null
          shipping_phone: string | null
          shipping_street: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal: number
          total: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          delivery_fee?: number | null
          discount_amount?: number | null
          guest_email?: string | null
          guest_phone?: string | null
          id?: string
          notes?: string | null
          order_lookup_token?: string | null
          order_number: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          referral_code_used?: string | null
          referrer_id?: string | null
          shipping_address_id?: string | null
          shipping_city?: string | null
          shipping_full_name?: string | null
          shipping_neighborhood?: string | null
          shipping_notes?: string | null
          shipping_phone?: string | null
          shipping_street?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal: number
          total: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          delivery_fee?: number | null
          discount_amount?: number | null
          guest_email?: string | null
          guest_phone?: string | null
          id?: string
          notes?: string | null
          order_lookup_token?: string | null
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          referral_code_used?: string | null
          referrer_id?: string | null
          shipping_address_id?: string | null
          shipping_city?: string | null
          shipping_full_name?: string | null
          shipping_neighborhood?: string | null
          shipping_notes?: string | null
          shipping_phone?: string | null
          shipping_street?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number
          total?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_shipping_address_id_fkey"
            columns: ["shipping_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          alcohol_percentage: number | null
          average_rating: number | null
          category_id: string | null
          created_at: string | null
          description: string | null
          food_pairing: string | null
          gallery_urls: string[] | null
          grape_variety: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          low_stock_threshold: number | null
          name: string
          origin_country: string | null
          original_price: number | null
          price: number
          region: string | null
          review_count: number | null
          serving_temperature: string | null
          short_description: string | null
          sku: string | null
          slug: string
          stock_quantity: number | null
          tasting_notes: string | null
          updated_at: string | null
          vintage_year: number | null
          volume_ml: number | null
        }
        Insert: {
          alcohol_percentage?: number | null
          average_rating?: number | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          food_pairing?: string | null
          gallery_urls?: string[] | null
          grape_variety?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          low_stock_threshold?: number | null
          name: string
          origin_country?: string | null
          original_price?: number | null
          price: number
          region?: string | null
          review_count?: number | null
          serving_temperature?: string | null
          short_description?: string | null
          sku?: string | null
          slug: string
          stock_quantity?: number | null
          tasting_notes?: string | null
          updated_at?: string | null
          vintage_year?: number | null
          volume_ml?: number | null
        }
        Update: {
          alcohol_percentage?: number | null
          average_rating?: number | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          food_pairing?: string | null
          gallery_urls?: string[] | null
          grape_variety?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          low_stock_threshold?: number | null
          name?: string
          origin_country?: string | null
          original_price?: number | null
          price?: number
          region?: string | null
          review_count?: number | null
          serving_temperature?: string | null
          short_description?: string | null
          sku?: string | null
          slug?: string
          stock_quantity?: number | null
          tasting_notes?: string | null
          updated_at?: string | null
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
          code: string
          created_at: string | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          max_discount_amount: number | null
          min_order_amount: number | null
          usage_limit: number | null
          used_count: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          min_order_amount?: number | null
          usage_limit?: number | null
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          min_order_amount?: number | null
          usage_limit?: number | null
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
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
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
          total_earned?: number | null
          total_store_credit?: number | null
          total_withdrawn?: number | null
          updated_at?: string | null
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
            referencedRelation: "products"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_referral_relationship: {
        Args: { _referral_code: string }
        Returns: Json
      }
      generate_mlm_commissions: {
        Args: { _order_id: string; _order_total: number; _referrer_id: string }
        Returns: Json
      }
      generate_order_number: { Args: never; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      get_user_rank: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["ambassador_rank"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      validate_referral_code: { Args: { _code: string }; Returns: Json }
    }
    Enums: {
      ambassador_rank: "bronze" | "silver" | "gold" | "diamond" | "elite"
      app_role: "admin" | "moderator" | "user"
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
      ambassador_rank: ["bronze", "silver", "gold", "diamond", "elite"],
      app_role: ["admin", "moderator", "user"],
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
