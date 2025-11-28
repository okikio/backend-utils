export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      attribute_options: {
        Row: {
          attribute_id: string
          created_at: string | null
          display_value: string
          hex_color: string | null
          id: string
          sort_order: number | null
          value: string
        }
        Insert: {
          attribute_id: string
          created_at?: string | null
          display_value: string
          hex_color?: string | null
          id?: string
          sort_order?: number | null
          value: string
        }
        Update: {
          attribute_id?: string
          created_at?: string | null
          display_value?: string
          hex_color?: string | null
          id?: string
          sort_order?: number | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "attribute_options_attribute_fk"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
        ]
      }
      attributes: {
        Row: {
          applicable_to_mediums: Json | null
          code: string
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          input_type: string
        }
        Insert: {
          applicable_to_mediums?: Json | null
          code: string
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          input_type: string
        }
        Update: {
          applicable_to_mediums?: Json | null
          code?: string
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          input_type?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          added_at: string | null
          cart_id: string
          id: string
          price_cents: number
          quantity: number
          sku_id: string
          updated_at: string | null
        }
        Insert: {
          added_at?: string | null
          cart_id: string
          id?: string
          price_cents: number
          quantity: number
          sku_id: string
          updated_at?: string | null
        }
        Update: {
          added_at?: string | null
          cart_id?: string
          id?: string
          price_cents?: number
          quantity?: number
          sku_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_fk"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_sku_fk"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "in_stock_skus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_sku_fk"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "skus"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          abandoned_at: string | null
          converted_to_order_id: string | null
          created_at: string | null
          id: string
          last_activity_at: string | null
          session_id: string | null
          updated_at: string | null
          user_id: string | null
          version: number | null
        }
        Insert: {
          abandoned_at?: string | null
          converted_to_order_id?: string | null
          created_at?: string | null
          id?: string
          last_activity_at?: string | null
          session_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          version?: number | null
        }
        Update: {
          abandoned_at?: string | null
          converted_to_order_id?: string | null
          created_at?: string | null
          id?: string
          last_activity_at?: string | null
          session_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          version?: number | null
        }
        Relationships: []
      }
      character_appearances: {
        Row: {
          character_uri: string
          created_at: string | null
          id: string
          page_count: number | null
          panel_count: number | null
          persona: string | null
          product_id: string
          role_type: string
          story_id: string | null
        }
        Insert: {
          character_uri: string
          created_at?: string | null
          id?: string
          page_count?: number | null
          panel_count?: number | null
          persona?: string | null
          product_id: string
          role_type: string
          story_id?: string | null
        }
        Update: {
          character_uri?: string
          created_at?: string | null
          id?: string
          page_count?: number | null
          panel_count?: number | null
          persona?: string | null
          product_id?: string
          role_type?: string
          story_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "character_appearances_product_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "available_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_appearances_product_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_appearances_product_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_appearances_product_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "user_owned_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_appearances_product_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "user_wishlist"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_appearances_role_fk"
            columns: ["role_type"]
            isOneToOne: false
            referencedRelation: "character_role_types"
            referencedColumns: ["code"]
          },
        ]
      }
      character_role_types: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          display_name: string
          include_in_stats_by_default: boolean | null
          sort_order: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          display_name: string
          include_in_stats_by_default?: boolean | null
          sort_order?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          display_name?: string
          include_in_stats_by_default?: boolean | null
          sort_order?: number | null
        }
        Relationships: []
      }
      collection_history: {
        Row: {
          action: string
          changed_by_user_id: string
          collection_id: string
          created_at: string | null
          id: string
          notes: string | null
          snapshot: Json | null
        }
        Insert: {
          action: string
          changed_by_user_id: string
          collection_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          snapshot?: Json | null
        }
        Update: {
          action?: string
          changed_by_user_id?: string
          collection_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_history_collection_fk"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "active_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_history_collection_fk"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_history_collection_fk"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_history_collection_fk"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "user_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_items: {
        Row: {
          added_by_user_id: string | null
          collection_id: string
          created_at: string | null
          id: string
          item_id: string
          item_type_code: string
          notes: string | null
          sort_order: number | null
        }
        Insert: {
          added_by_user_id?: string | null
          collection_id: string
          created_at?: string | null
          id?: string
          item_id: string
          item_type_code: string
          notes?: string | null
          sort_order?: number | null
        }
        Update: {
          added_by_user_id?: string | null
          collection_id?: string
          created_at?: string | null
          id?: string
          item_id?: string
          item_type_code?: string
          notes?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_collection_fk"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "active_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_collection_fk"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_collection_fk"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_collection_fk"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "user_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_entity_type_fk"
            columns: ["item_type_code"]
            isOneToOne: false
            referencedRelation: "entity_types"
            referencedColumns: ["code"]
          },
        ]
      }
      collection_visibilities: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          display_name: string
          is_public: boolean
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          display_name: string
          is_public?: boolean
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          display_name?: string
          is_public?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      collections: {
        Row: {
          collaboration_enabled_at: string | null
          collection_type: string | null
          cover_image_url: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by_user_id: string | null
          description: string | null
          follower_count: number | null
          id: string
          item_count: number | null
          like_count: number | null
          name: string
          owner_id: string
          slug: string
          sort_order: string | null
          updated_at: string | null
          visibility_code: string
        }
        Insert: {
          collaboration_enabled_at?: string | null
          collection_type?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          description?: string | null
          follower_count?: number | null
          id?: string
          item_count?: number | null
          like_count?: number | null
          name: string
          owner_id: string
          slug: string
          sort_order?: string | null
          updated_at?: string | null
          visibility_code?: string
        }
        Update: {
          collaboration_enabled_at?: string | null
          collection_type?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          description?: string | null
          follower_count?: number | null
          id?: string
          item_count?: number | null
          like_count?: number | null
          name?: string
          owner_id?: string
          slug?: string
          sort_order?: string | null
          updated_at?: string | null
          visibility_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_visibility_fk"
            columns: ["visibility_code"]
            isOneToOne: false
            referencedRelation: "collection_visibilities"
            referencedColumns: ["code"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          content_html: string | null
          created_at: string | null
          deleted_at: string | null
          depth: number | null
          edited_at: string | null
          id: string
          like_count: number | null
          moderated_at: string | null
          moderated_by_user_id: string | null
          moderation_reason: string | null
          moderation_status_code: string
          parent_comment_id: string | null
          reply_count: number | null
          root_comment_id: string | null
          target_id: string
          target_type_code: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          content_html?: string | null
          created_at?: string | null
          deleted_at?: string | null
          depth?: number | null
          edited_at?: string | null
          id?: string
          like_count?: number | null
          moderated_at?: string | null
          moderated_by_user_id?: string | null
          moderation_reason?: string | null
          moderation_status_code?: string
          parent_comment_id?: string | null
          reply_count?: number | null
          root_comment_id?: string | null
          target_id: string
          target_type_code: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          content_html?: string | null
          created_at?: string | null
          deleted_at?: string | null
          depth?: number | null
          edited_at?: string | null
          id?: string
          like_count?: number | null
          moderated_at?: string | null
          moderated_by_user_id?: string | null
          moderation_reason?: string | null
          moderation_status_code?: string
          parent_comment_id?: string | null
          reply_count?: number | null
          root_comment_id?: string | null
          target_id?: string
          target_type_code?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_entity_type_fk"
            columns: ["target_type_code"]
            isOneToOne: false
            referencedRelation: "entity_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "comments_moderation_fk"
            columns: ["moderation_status_code"]
            isOneToOne: false
            referencedRelation: "moderation_statuses"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "comments_parent_fk"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "active_comments_with_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_fk"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_root_fk"
            columns: ["root_comment_id"]
            isOneToOne: false
            referencedRelation: "active_comments_with_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_root_fk"
            columns: ["root_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      consumption_statuses: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          display_name: string
          implies_ownership: boolean
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          display_name: string
          implies_ownership?: boolean
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          display_name?: string
          implies_ownership?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      entity_types: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          display_name: string
          is_neptune_entity: boolean
          ontology_class_iri: string | null
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          display_name: string
          is_neptune_entity?: boolean
          ontology_class_iri?: string | null
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          display_name?: string
          is_neptune_entity?: boolean
          ontology_class_iri?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      inventory_reservations: {
        Row: {
          cart_id: string | null
          created_at: string | null
          id: string
          order_id: string | null
          quantity: number
          released_at: string | null
          reserved_until: string
          sku_id: string
        }
        Insert: {
          cart_id?: string | null
          created_at?: string | null
          id?: string
          order_id?: string | null
          quantity: number
          released_at?: string | null
          reserved_until: string
          sku_id: string
        }
        Update: {
          cart_id?: string | null
          created_at?: string | null
          id?: string
          order_id?: string | null
          quantity?: number
          released_at?: string | null
          reserved_until?: string
          sku_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_reservations_cart_fk"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reservations_order_fk"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "active_orders_by_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reservations_order_fk"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reservations_sku_fk"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "in_stock_skus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reservations_sku_fk"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "skus"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          order_id: string | null
          order_item_id: string | null
          performed_by_user_id: string | null
          quantity_after: number
          quantity_before: number
          quantity_change: number
          reason: string | null
          sku_id: string
          transaction_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          order_item_id?: string | null
          performed_by_user_id?: string | null
          quantity_after: number
          quantity_before: number
          quantity_change: number
          reason?: string | null
          sku_id: string
          transaction_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          order_item_id?: string | null
          performed_by_user_id?: string | null
          quantity_after?: number
          quantity_before?: number
          quantity_change?: number
          reason?: string | null
          sku_id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_order_fk"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "active_orders_by_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_order_fk"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_order_item_fk"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_sku_fk"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "in_stock_skus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_sku_fk"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "skus"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string | null
          target_id: string
          target_type_code: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          target_id: string
          target_type_code: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          target_id?: string
          target_type_code?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_entity_type_fk"
            columns: ["target_type_code"]
            isOneToOne: false
            referencedRelation: "entity_types"
            referencedColumns: ["code"]
          },
        ]
      }
      moderation_log: {
        Row: {
          action_type: string
          created_at: string | null
          duration_hours: number | null
          id: string
          internal_notes: string | null
          moderator_id: string
          reason: string
          target_user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          duration_hours?: number | null
          id?: string
          internal_notes?: string | null
          moderator_id: string
          reason: string
          target_user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          duration_hours?: number | null
          id?: string
          internal_notes?: string | null
          moderator_id?: string
          reason?: string
          target_user_id?: string
        }
        Relationships: []
      }
      moderation_statuses: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          display_name: string
          is_visible: boolean
          requires_review: boolean
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          display_name: string
          is_visible?: boolean
          requires_review?: boolean
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          display_name?: string
          is_visible?: boolean
          requires_review?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      neptune_sync_cursors: {
        Row: {
          consecutive_errors: number | null
          created_at: string | null
          direction: string
          entity_type: string
          id: string
          is_active: boolean | null
          last_commit_num: number | null
          last_error: string | null
          last_synced_at: string | null
          last_synced_uri: string | null
          sync_type: string
          updated_at: string | null
        }
        Insert: {
          consecutive_errors?: number | null
          created_at?: string | null
          direction: string
          entity_type: string
          id: string
          is_active?: boolean | null
          last_commit_num?: number | null
          last_error?: string | null
          last_synced_at?: string | null
          last_synced_uri?: string | null
          sync_type: string
          updated_at?: string | null
        }
        Update: {
          consecutive_errors?: number | null
          created_at?: string | null
          direction?: string
          entity_type?: string
          id?: string
          is_active?: boolean | null
          last_commit_num?: number | null
          last_error?: string | null
          last_synced_at?: string | null
          last_synced_uri?: string | null
          sync_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      neptune_sync_events: {
        Row: {
          created_at: string | null
          direction: string
          entity_type: string
          entity_uri: string
          error_code: string | null
          error_message: string | null
          id: string
          idempotency_key: string | null
          max_retries: number | null
          neptune_commit_num: number | null
          next_retry_at: string | null
          operation: string
          payload: Json | null
          postgres_id: string | null
          postgres_table: string | null
          retry_count: number | null
          started_at: string | null
          sync_status: string | null
          synced_at: string | null
        }
        Insert: {
          created_at?: string | null
          direction: string
          entity_type: string
          entity_uri: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          max_retries?: number | null
          neptune_commit_num?: number | null
          next_retry_at?: string | null
          operation: string
          payload?: Json | null
          postgres_id?: string | null
          postgres_table?: string | null
          retry_count?: number | null
          started_at?: string | null
          sync_status?: string | null
          synced_at?: string | null
        }
        Update: {
          created_at?: string | null
          direction?: string
          entity_type?: string
          entity_uri?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          max_retries?: number | null
          neptune_commit_num?: number | null
          next_retry_at?: string | null
          operation?: string
          payload?: Json | null
          postgres_id?: string | null
          postgres_table?: string | null
          retry_count?: number | null
          started_at?: string | null
          sync_status?: string | null
          synced_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          data: Json
          expires_at: string | null
          id: string
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          data: Json
          expires_at?: string | null
          id?: string
          read_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          data?: Json
          expires_at?: string | null
          id?: string
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          attributes_snapshot: Json | null
          created_at: string | null
          fulfilled_at: string | null
          id: string
          order_id: string
          product_snapshot: Json | null
          product_title: string
          quantity: number
          sku_code: string
          sku_id: string
          subtotal_cents: number
          unit_price_cents: number
        }
        Insert: {
          attributes_snapshot?: Json | null
          created_at?: string | null
          fulfilled_at?: string | null
          id?: string
          order_id: string
          product_snapshot?: Json | null
          product_title: string
          quantity: number
          sku_code: string
          sku_id: string
          subtotal_cents: number
          unit_price_cents: number
        }
        Update: {
          attributes_snapshot?: Json | null
          created_at?: string | null
          fulfilled_at?: string | null
          id?: string
          order_id?: string
          product_snapshot?: Json | null
          product_title?: string
          quantity?: number
          sku_code?: string
          sku_id?: string
          subtotal_cents?: number
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_fk"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "active_orders_by_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_fk"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_sku_fk"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "in_stock_skus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_sku_fk"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "skus"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by_system: string | null
          changed_by_user_id: string | null
          created_at: string | null
          from_status_code: string | null
          id: string
          metadata: Json | null
          notes: string | null
          order_id: string
          to_status_code: string
        }
        Insert: {
          changed_by_system?: string | null
          changed_by_user_id?: string | null
          created_at?: string | null
          from_status_code?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          order_id: string
          to_status_code: string
        }
        Update: {
          changed_by_system?: string | null
          changed_by_user_id?: string | null
          created_at?: string | null
          from_status_code?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          order_id?: string
          to_status_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_from_fk"
            columns: ["from_status_code"]
            isOneToOne: false
            referencedRelation: "order_statuses"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "order_status_history_order_fk"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "active_orders_by_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_fk"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_to_fk"
            columns: ["to_status_code"]
            isOneToOne: false
            referencedRelation: "order_statuses"
            referencedColumns: ["code"]
          },
        ]
      }
      order_statuses: {
        Row: {
          code: string
          created_at: string | null
          customer_visible: string | null
          description: string | null
          display_name: string
          is_cancellable: boolean
          is_final: boolean
          is_refundable: boolean
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string | null
          customer_visible?: string | null
          description?: string | null
          display_name: string
          is_cancellable?: boolean
          is_final?: boolean
          is_refundable?: boolean
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string | null
          customer_visible?: string | null
          description?: string | null
          display_name?: string
          is_cancellable?: boolean
          is_final?: boolean
          is_refundable?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      orders: {
        Row: {
          billing_address: Json | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cart_id: string | null
          created_at: string | null
          created_by_user_id: string | null
          currency: string | null
          delivered_at: string | null
          discount_cents: number | null
          id: string
          order_number: string
          paid_at: string | null
          payment_method: string | null
          payment_provider: string | null
          payment_provider_id: string | null
          payment_status: string | null
          refund_amount_cents: number | null
          refunded_at: string | null
          shipped_at: string | null
          shipping_address: Json | null
          shipping_cents: number | null
          shipping_method: string | null
          status_code: string
          subtotal_cents: number
          tax_cents: number | null
          total_cents: number
          tracking_number: string | null
          updated_at: string | null
          updated_by_user_id: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          billing_address?: Json | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cart_id?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          currency?: string | null
          delivered_at?: string | null
          discount_cents?: number | null
          id?: string
          order_number: string
          paid_at?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          payment_provider_id?: string | null
          payment_status?: string | null
          refund_amount_cents?: number | null
          refunded_at?: string | null
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_cents?: number | null
          shipping_method?: string | null
          status_code?: string
          subtotal_cents: number
          tax_cents?: number | null
          total_cents: number
          tracking_number?: string | null
          updated_at?: string | null
          updated_by_user_id?: string | null
          user_id: string
          version?: number | null
        }
        Update: {
          billing_address?: Json | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cart_id?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          currency?: string | null
          delivered_at?: string | null
          discount_cents?: number | null
          id?: string
          order_number?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          payment_provider_id?: string | null
          payment_status?: string | null
          refund_amount_cents?: number | null
          refunded_at?: string | null
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_cents?: number | null
          shipping_method?: string | null
          status_code?: string
          subtotal_cents?: number
          tax_cents?: number | null
          total_cents?: number
          tracking_number?: string | null
          updated_at?: string | null
          updated_by_user_id?: string | null
          user_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_cart_fk"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_status_fk"
            columns: ["status_code"]
            isOneToOne: false
            referencedRelation: "order_statuses"
            referencedColumns: ["code"]
          },
        ]
      }
      ownership_types: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          display_name: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          display_name: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          display_name?: string
          sort_order?: number
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount_cents: number
          created_at: string | null
          currency: string
          failure_code: string | null
          failure_message: string | null
          id: string
          metadata: Json | null
          order_id: string
          payment_provider: string
          provider_transaction_id: string | null
          status: string
          transaction_type: string
          updated_at: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string | null
          currency: string
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          metadata?: Json | null
          order_id: string
          payment_provider: string
          provider_transaction_id?: string | null
          status: string
          transaction_type: string
          updated_at?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string | null
          currency?: string
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string
          payment_provider?: string
          provider_transaction_id?: string | null
          status?: string
          transaction_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_order_fk"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "active_orders_by_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_order_fk"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_formats: {
        Row: {
          active_since: string | null
          code: string
          created_at: string | null
          deprecated_at: string | null
          description: string | null
          display_name: string
          requires_shipping: boolean
          sort_order: number
        }
        Insert: {
          active_since?: string | null
          code: string
          created_at?: string | null
          deprecated_at?: string | null
          description?: string | null
          display_name: string
          requires_shipping?: boolean
          sort_order?: number
        }
        Update: {
          active_since?: string | null
          code?: string
          created_at?: string | null
          deprecated_at?: string | null
          description?: string | null
          display_name?: string
          requires_shipping?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      product_mediums: {
        Row: {
          active_since: string | null
          category: string | null
          code: string
          created_at: string | null
          deprecated_at: string | null
          description: string | null
          display_name: string
          sort_order: number
        }
        Insert: {
          active_since?: string | null
          category?: string | null
          code: string
          created_at?: string | null
          deprecated_at?: string | null
          description?: string | null
          display_name: string
          sort_order?: number
        }
        Update: {
          active_since?: string | null
          category?: string | null
          code?: string
          created_at?: string | null
          deprecated_at?: string | null
          description?: string | null
          display_name?: string
          sort_order?: number
        }
        Relationships: []
      }
      product_statuses: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          display_name: string
          is_available_for_purchase: boolean
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          display_name: string
          is_available_for_purchase?: boolean
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          display_name?: string
          is_available_for_purchase?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          archived_at: string | null
          base_price_cents: number
          cover_image_url: string | null
          created_at: string | null
          created_by_user_id: string | null
          currency: string | null
          description: string | null
          featured_until: string | null
          format_code: string
          id: string
          images: Json | null
          last_synced_from_neptune_at: string | null
          medium_code: string
          narrative_unit_uri: string | null
          preorder_closes_at: string | null
          preorder_opens_at: string | null
          publisher_name: string | null
          rating_avg: number | null
          rating_count: number | null
          release_date: string | null
          review_count: number | null
          sales_total: number | null
          sku: string
          slug: string
          status_code: string
          story_expression_uri: string | null
          story_work_uri: string | null
          title: string
          updated_at: string | null
          updated_by_user_id: string | null
        }
        Insert: {
          archived_at?: string | null
          base_price_cents: number
          cover_image_url?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          currency?: string | null
          description?: string | null
          featured_until?: string | null
          format_code: string
          id?: string
          images?: Json | null
          last_synced_from_neptune_at?: string | null
          medium_code: string
          narrative_unit_uri?: string | null
          preorder_closes_at?: string | null
          preorder_opens_at?: string | null
          publisher_name?: string | null
          rating_avg?: number | null
          rating_count?: number | null
          release_date?: string | null
          review_count?: number | null
          sales_total?: number | null
          sku: string
          slug: string
          status_code?: string
          story_expression_uri?: string | null
          story_work_uri?: string | null
          title: string
          updated_at?: string | null
          updated_by_user_id?: string | null
        }
        Update: {
          archived_at?: string | null
          base_price_cents?: number
          cover_image_url?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          currency?: string | null
          description?: string | null
          featured_until?: string | null
          format_code?: string
          id?: string
          images?: Json | null
          last_synced_from_neptune_at?: string | null
          medium_code?: string
          narrative_unit_uri?: string | null
          preorder_closes_at?: string | null
          preorder_opens_at?: string | null
          publisher_name?: string | null
          rating_avg?: number | null
          rating_count?: number | null
          release_date?: string | null
          review_count?: number | null
          sales_total?: number | null
          sku?: string
          slug?: string
          status_code?: string
          story_expression_uri?: string | null
          story_work_uri?: string | null
          title?: string
          updated_at?: string | null
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_format_fk"
            columns: ["format_code"]
            isOneToOne: false
            referencedRelation: "product_formats"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "products_medium_fk"
            columns: ["medium_code"]
            isOneToOne: false
            referencedRelation: "product_mediums"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "products_status_fk"
            columns: ["status_code"]
            isOneToOne: false
            referencedRelation: "product_statuses"
            referencedColumns: ["code"]
          },
        ]
      }
      profile_statuses: {
        Row: {
          can_login: boolean
          code: string
          created_at: string | null
          description: string | null
          display_name: string
          requires_moderation: boolean
          sort_order: number
        }
        Insert: {
          can_login?: boolean
          code: string
          created_at?: string | null
          description?: string | null
          display_name: string
          requires_moderation?: boolean
          sort_order?: number
        }
        Update: {
          can_login?: boolean
          code?: string
          created_at?: string | null
          description?: string | null
          display_name?: string
          requires_moderation?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          birth_date: string | null
          collections_count: number | null
          created_at: string | null
          display_name: string | null
          entity_type_code: string | null
          followers_count: number | null
          following_count: number | null
          id: string
          is_neptune_entity: boolean
          items_owned_count: number | null
          last_active_at: string | null
          location: string | null
          neptune_last_commit_num: number | null
          neptune_metadata: Json | null
          neptune_synced_at: string | null
          neptune_uri: string | null
          preferences: Json | null
          privacy: Json | null
          reviews_count: number | null
          status_code: string
          subscription_expires_at: string | null
          subscription_tier_code: string | null
          suspended_at: string | null
          suspended_by_user_id: string | null
          suspended_until: string | null
          suspension_reason: string | null
          updated_at: string | null
          username: string
          verified_at: string | null
          verified_by_user_id: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          birth_date?: string | null
          collections_count?: number | null
          created_at?: string | null
          display_name?: string | null
          entity_type_code?: string | null
          followers_count?: number | null
          following_count?: number | null
          id: string
          is_neptune_entity?: boolean
          items_owned_count?: number | null
          last_active_at?: string | null
          location?: string | null
          neptune_last_commit_num?: number | null
          neptune_metadata?: Json | null
          neptune_synced_at?: string | null
          neptune_uri?: string | null
          preferences?: Json | null
          privacy?: Json | null
          reviews_count?: number | null
          status_code?: string
          subscription_expires_at?: string | null
          subscription_tier_code?: string | null
          suspended_at?: string | null
          suspended_by_user_id?: string | null
          suspended_until?: string | null
          suspension_reason?: string | null
          updated_at?: string | null
          username: string
          verified_at?: string | null
          verified_by_user_id?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          birth_date?: string | null
          collections_count?: number | null
          created_at?: string | null
          display_name?: string | null
          entity_type_code?: string | null
          followers_count?: number | null
          following_count?: number | null
          id?: string
          is_neptune_entity?: boolean
          items_owned_count?: number | null
          last_active_at?: string | null
          location?: string | null
          neptune_last_commit_num?: number | null
          neptune_metadata?: Json | null
          neptune_synced_at?: string | null
          neptune_uri?: string | null
          preferences?: Json | null
          privacy?: Json | null
          reviews_count?: number | null
          status_code?: string
          subscription_expires_at?: string | null
          subscription_tier_code?: string | null
          suspended_at?: string | null
          suspended_by_user_id?: string | null
          suspended_until?: string | null
          suspension_reason?: string | null
          updated_at?: string | null
          username?: string
          verified_at?: string | null
          verified_by_user_id?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_status_fk"
            columns: ["status_code"]
            isOneToOne: false
            referencedRelation: "profile_statuses"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "profiles_subscription_tier_fk"
            columns: ["subscription_tier_code"]
            isOneToOne: false
            referencedRelation: "subscription_tiers"
            referencedColumns: ["code"]
          },
        ]
      }
      pull_list_items: {
        Row: {
          added_by: string
          created_at: string | null
          follow_id: string | null
          id: string
          notes: string | null
          product_id: string
          quantity: number | null
          release_week: string
          removed_at: string | null
          retailer_confirmed_at: string | null
          retailer_id: string | null
          sent_to_retailer_at: string | null
          sku_id: string | null
          status_code: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          added_by: string
          created_at?: string | null
          follow_id?: string | null
          id?: string
          notes?: string | null
          product_id: string
          quantity?: number | null
          release_week: string
          removed_at?: string | null
          retailer_confirmed_at?: string | null
          retailer_id?: string | null
          sent_to_retailer_at?: string | null
          sku_id?: string | null
          status_code?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          added_by?: string
          created_at?: string | null
          follow_id?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number | null
          release_week?: string
          removed_at?: string | null
          retailer_confirmed_at?: string | null
          retailer_id?: string | null
          sent_to_retailer_at?: string | null
          sku_id?: string | null
          status_code?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pull_list_follow_fk"
            columns: ["follow_id"]
            isOneToOne: false
            referencedRelation: "user_follows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pull_list_product_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "available_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pull_list_product_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pull_list_product_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pull_list_product_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "user_owned_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pull_list_product_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "user_wishlist"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pull_list_sku_fk"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "in_stock_skus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pull_list_sku_fk"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "skus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pull_list_status_fk"
            columns: ["status_code"]
            isOneToOne: false
            referencedRelation: "pull_list_statuses"
            referencedColumns: ["code"]
          },
        ]
      }
      pull_list_statuses: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          display_name: string
          is_cancellable: boolean
          is_final: boolean
          sort_order: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          display_name: string
          is_cancellable?: boolean
          is_final?: boolean
          sort_order?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          display_name?: string
          is_cancellable?: boolean
          is_final?: boolean
          sort_order?: number | null
        }
        Relationships: []
      }
      review_votes: {
        Row: {
          created_at: string | null
          is_helpful: boolean
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          is_helpful: boolean
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          is_helpful?: boolean
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_votes_review_fk"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "approved_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_votes_review_fk"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment_count: number | null
          content: string
          content_html: string | null
          created_at: string | null
          deleted_at: string | null
          edited_at: string | null
          featured_until: string | null
          helpful_count: number | null
          id: string
          moderation_status_code: string
          purchase_verified_at: string | null
          rating: number
          spoiler_marked_at: string | null
          target_id: string
          target_type_code: string
          title: string | null
          unhelpful_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment_count?: number | null
          content: string
          content_html?: string | null
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          featured_until?: string | null
          helpful_count?: number | null
          id?: string
          moderation_status_code?: string
          purchase_verified_at?: string | null
          rating: number
          spoiler_marked_at?: string | null
          target_id: string
          target_type_code: string
          title?: string | null
          unhelpful_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment_count?: number | null
          content?: string
          content_html?: string | null
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          featured_until?: string | null
          helpful_count?: number | null
          id?: string
          moderation_status_code?: string
          purchase_verified_at?: string | null
          rating?: number
          spoiler_marked_at?: string | null
          target_id?: string
          target_type_code?: string
          title?: string | null
          unhelpful_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_entity_type_fk"
            columns: ["target_type_code"]
            isOneToOne: false
            referencedRelation: "entity_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "reviews_moderation_fk"
            columns: ["moderation_status_code"]
            isOneToOne: false
            referencedRelation: "moderation_statuses"
            referencedColumns: ["code"]
          },
        ]
      }
      sku_attributes: {
        Row: {
          attribute_option_id: string
          sku_id: string
        }
        Insert: {
          attribute_option_id: string
          sku_id: string
        }
        Update: {
          attribute_option_id?: string
          sku_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sku_attributes_option_fk"
            columns: ["attribute_option_id"]
            isOneToOne: false
            referencedRelation: "attribute_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sku_attributes_sku_fk"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "in_stock_skus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sku_attributes_sku_fk"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "skus"
            referencedColumns: ["id"]
          },
        ]
      }
      skus: {
        Row: {
          available_from: string | null
          available_until: string | null
          backorder_allowed_until: string | null
          created_at: string | null
          created_by_user_id: string | null
          id: string
          low_stock_threshold: number | null
          original_price_cents: number | null
          price_cents: number
          product_id: string
          sku_code: string
          stock_quantity: number | null
          updated_at: string | null
          updated_by_user_id: string | null
        }
        Insert: {
          available_from?: string | null
          available_until?: string | null
          backorder_allowed_until?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          id?: string
          low_stock_threshold?: number | null
          original_price_cents?: number | null
          price_cents: number
          product_id: string
          sku_code: string
          stock_quantity?: number | null
          updated_at?: string | null
          updated_by_user_id?: string | null
        }
        Update: {
          available_from?: string | null
          available_until?: string | null
          backorder_allowed_until?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          id?: string
          low_stock_threshold?: number | null
          original_price_cents?: number | null
          price_cents?: number
          product_id?: string
          sku_code?: string
          stock_quantity?: number | null
          updated_at?: string | null
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "skus_product_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "available_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skus_product_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skus_product_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skus_product_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "user_owned_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skus_product_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "user_wishlist"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_customers: {
        Row: {
          billing_address: Json | null
          created_at: string | null
          id: string
          payment_method: Json | null
          stripe_customer_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          billing_address?: Json | null
          created_at?: string | null
          id?: string
          payment_method?: Json | null
          stripe_customer_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          billing_address?: Json | null
          created_at?: string | null
          id?: string
          payment_method?: Json | null
          stripe_customer_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      stripe_prices: {
        Row: {
          active: boolean | null
          billing_scheme: string | null
          created_at: string | null
          currency: string
          id: string
          metadata: Json | null
          recurring_interval: string | null
          recurring_interval_count: number | null
          stripe_price_id: string
          stripe_product_id: string
          type: string
          unit_amount: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          billing_scheme?: string | null
          created_at?: string | null
          currency: string
          id?: string
          metadata?: Json | null
          recurring_interval?: string | null
          recurring_interval_count?: number | null
          stripe_price_id: string
          stripe_product_id: string
          type: string
          unit_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          billing_scheme?: string | null
          created_at?: string | null
          currency?: string
          id?: string
          metadata?: Json | null
          recurring_interval?: string | null
          recurring_interval_count?: number | null
          stripe_price_id?: string
          stripe_product_id?: string
          type?: string
          unit_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_prices_product_fk"
            columns: ["stripe_product_id"]
            isOneToOne: false
            referencedRelation: "stripe_products"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_products: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          id: string
          images: string[] | null
          metadata: Json | null
          name: string
          stripe_product_id: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          metadata?: Json | null
          name: string
          stripe_product_id: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          metadata?: Json | null
          name?: string
          stripe_product_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      stripe_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          cancellation_reason: string | null
          created_at: string | null
          current_period_end: string
          current_period_start: string
          id: string
          metadata: Json | null
          status: string
          stripe_customer_id: string
          stripe_price_id: string
          stripe_product_id: string
          stripe_subscription_id: string
          trial_end: string | null
          trial_start: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          cancellation_reason?: string | null
          created_at?: string | null
          current_period_end: string
          current_period_start: string
          id?: string
          metadata?: Json | null
          status: string
          stripe_customer_id: string
          stripe_price_id: string
          stripe_product_id: string
          stripe_subscription_id: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          cancellation_reason?: string | null
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string
          id?: string
          metadata?: Json | null
          status?: string
          stripe_customer_id?: string
          stripe_price_id?: string
          stripe_product_id?: string
          stripe_subscription_id?: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_subs_customer_fk"
            columns: ["stripe_customer_id"]
            isOneToOne: false
            referencedRelation: "stripe_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_subs_price_fk"
            columns: ["stripe_price_id"]
            isOneToOne: false
            referencedRelation: "stripe_prices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_subs_product_fk"
            columns: ["stripe_product_id"]
            isOneToOne: false
            referencedRelation: "stripe_products"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_tiers: {
        Row: {
          active_since: string | null
          code: string
          created_at: string | null
          deprecated_at: string | null
          description: string | null
          display_name: string
          features: Json | null
          price_cents: number | null
          sort_order: number
        }
        Insert: {
          active_since?: string | null
          code: string
          created_at?: string | null
          deprecated_at?: string | null
          description?: string | null
          display_name: string
          features?: Json | null
          price_cents?: number | null
          sort_order?: number
        }
        Update: {
          active_since?: string | null
          code?: string
          created_at?: string | null
          deprecated_at?: string | null
          description?: string | null
          display_name?: string
          features?: Json | null
          price_cents?: number | null
          sort_order?: number
        }
        Relationships: []
      }
      user_character_tracking: {
        Row: {
          preferences: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          preferences?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          preferences?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_follows: {
        Row: {
          created_at: string | null
          id: string
          muted_at: string | null
          preferences: Json | null
          target_id: string
          target_type_code: string
          unfollowed_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          muted_at?: string | null
          preferences?: Json | null
          target_id: string
          target_type_code: string
          unfollowed_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          muted_at?: string | null
          preferences?: Json | null
          target_id?: string
          target_type_code?: string
          unfollowed_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_follows_entity_type_fk"
            columns: ["target_type_code"]
            isOneToOne: false
            referencedRelation: "entity_types"
            referencedColumns: ["code"]
          },
        ]
      }
      user_product_state: {
        Row: {
          completed_at: string | null
          consumption_status_code: string | null
          created_at: string | null
          id: string
          last_interaction_at: string | null
          owned_sku_ids: string[] | null
          ownership_type_code: string | null
          product_id: string
          progress_percentage: number | null
          purchased_at: string | null
          rated_at: string | null
          started_at: string | null
          times_consumed: number | null
          updated_at: string | null
          user_id: string
          user_rating: number | null
          version: number | null
          wishlist_notes: string | null
          wishlist_priority: number | null
          wishlisted_at: string | null
        }
        Insert: {
          completed_at?: string | null
          consumption_status_code?: string | null
          created_at?: string | null
          id?: string
          last_interaction_at?: string | null
          owned_sku_ids?: string[] | null
          ownership_type_code?: string | null
          product_id: string
          progress_percentage?: number | null
          purchased_at?: string | null
          rated_at?: string | null
          started_at?: string | null
          times_consumed?: number | null
          updated_at?: string | null
          user_id: string
          user_rating?: number | null
          version?: number | null
          wishlist_notes?: string | null
          wishlist_priority?: number | null
          wishlisted_at?: string | null
        }
        Update: {
          completed_at?: string | null
          consumption_status_code?: string | null
          created_at?: string | null
          id?: string
          last_interaction_at?: string | null
          owned_sku_ids?: string[] | null
          ownership_type_code?: string | null
          product_id?: string
          progress_percentage?: number | null
          purchased_at?: string | null
          rated_at?: string | null
          started_at?: string | null
          times_consumed?: number | null
          updated_at?: string | null
          user_id?: string
          user_rating?: number | null
          version?: number | null
          wishlist_notes?: string | null
          wishlist_priority?: number | null
          wishlisted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_product_state_consumption_fk"
            columns: ["consumption_status_code"]
            isOneToOne: false
            referencedRelation: "consumption_statuses"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "user_product_state_ownership_fk"
            columns: ["ownership_type_code"]
            isOneToOne: false
            referencedRelation: "ownership_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "user_product_state_product_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "available_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_product_state_product_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_product_state_product_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_product_state_product_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "user_owned_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_product_state_product_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "user_wishlist"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      active_collections: {
        Row: {
          collaboration_enabled_at: string | null
          collection_type: string | null
          cover_image_url: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by_user_id: string | null
          description: string | null
          follower_count: number | null
          id: string | null
          item_count: number | null
          like_count: number | null
          name: string | null
          owner_id: string | null
          slug: string | null
          sort_order: string | null
          updated_at: string | null
          visibility_code: string | null
        }
        Insert: {
          collaboration_enabled_at?: string | null
          collection_type?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          description?: string | null
          follower_count?: number | null
          id?: string | null
          item_count?: number | null
          like_count?: number | null
          name?: string | null
          owner_id?: string | null
          slug?: string | null
          sort_order?: string | null
          updated_at?: string | null
          visibility_code?: string | null
        }
        Update: {
          collaboration_enabled_at?: string | null
          collection_type?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          description?: string | null
          follower_count?: number | null
          id?: string | null
          item_count?: number | null
          like_count?: number | null
          name?: string | null
          owner_id?: string | null
          slug?: string | null
          sort_order?: string | null
          updated_at?: string | null
          visibility_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collections_visibility_fk"
            columns: ["visibility_code"]
            isOneToOne: false
            referencedRelation: "collection_visibilities"
            referencedColumns: ["code"]
          },
        ]
      }
      active_comments_with_replies: {
        Row: {
          actual_reply_count: number | null
          content: string | null
          content_html: string | null
          created_at: string | null
          deleted_at: string | null
          depth: number | null
          edited_at: string | null
          id: string | null
          like_count: number | null
          moderated_at: string | null
          moderated_by_user_id: string | null
          moderation_reason: string | null
          moderation_status_code: string | null
          parent_comment_id: string | null
          reply_count: number | null
          root_comment_id: string | null
          target_id: string | null
          target_type_code: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_entity_type_fk"
            columns: ["target_type_code"]
            isOneToOne: false
            referencedRelation: "entity_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "comments_moderation_fk"
            columns: ["moderation_status_code"]
            isOneToOne: false
            referencedRelation: "moderation_statuses"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "comments_parent_fk"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "active_comments_with_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_fk"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_root_fk"
            columns: ["root_comment_id"]
            isOneToOne: false
            referencedRelation: "active_comments_with_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_root_fk"
            columns: ["root_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      active_orders_by_user: {
        Row: {
          billing_address: Json | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cart_id: string | null
          created_at: string | null
          created_by_user_id: string | null
          currency: string | null
          delivered_at: string | null
          discount_cents: number | null
          id: string | null
          item_count: number | null
          order_number: string | null
          paid_at: string | null
          payment_method: string | null
          payment_provider: string | null
          payment_provider_id: string | null
          payment_status: string | null
          product_titles: string | null
          refund_amount_cents: number | null
          refunded_at: string | null
          shipped_at: string | null
          shipping_address: Json | null
          shipping_cents: number | null
          shipping_method: string | null
          status_code: string | null
          subtotal_cents: number | null
          tax_cents: number | null
          total_cents: number | null
          tracking_number: string | null
          updated_at: string | null
          updated_by_user_id: string | null
          user_id: string | null
          version: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_cart_fk"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_status_fk"
            columns: ["status_code"]
            isOneToOne: false
            referencedRelation: "order_statuses"
            referencedColumns: ["code"]
          },
        ]
      }
      approved_reviews: {
        Row: {
          comment_count: number | null
          computed_helpful_count: number | null
          computed_unhelpful_count: number | null
          content: string | null
          content_html: string | null
          created_at: string | null
          deleted_at: string | null
          edited_at: string | null
          featured_until: string | null
          helpful_count: number | null
          id: string | null
          moderation_status_code: string | null
          purchase_verified_at: string | null
          rating: number | null
          spoiler_marked_at: string | null
          target_id: string | null
          target_type_code: string | null
          title: string | null
          unhelpful_count: number | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_entity_type_fk"
            columns: ["target_type_code"]
            isOneToOne: false
            referencedRelation: "entity_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "reviews_moderation_fk"
            columns: ["moderation_status_code"]
            isOneToOne: false
            referencedRelation: "moderation_statuses"
            referencedColumns: ["code"]
          },
        ]
      }
      available_products: {
        Row: {
          archived_at: string | null
          base_price_cents: number | null
          cover_image_url: string | null
          created_at: string | null
          created_by_user_id: string | null
          currency: string | null
          description: string | null
          featured_until: string | null
          format_code: string | null
          id: string | null
          images: Json | null
          last_synced_from_neptune_at: string | null
          medium_code: string | null
          narrative_unit_uri: string | null
          preorder_closes_at: string | null
          preorder_opens_at: string | null
          publisher_name: string | null
          rating_avg: number | null
          rating_count: number | null
          release_date: string | null
          review_count: number | null
          sales_total: number | null
          sku: string | null
          slug: string | null
          status_code: string | null
          story_expression_uri: string | null
          story_work_uri: string | null
          title: string | null
          updated_at: string | null
          updated_by_user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_format_fk"
            columns: ["format_code"]
            isOneToOne: false
            referencedRelation: "product_formats"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "products_medium_fk"
            columns: ["medium_code"]
            isOneToOne: false
            referencedRelation: "product_mediums"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "products_status_fk"
            columns: ["status_code"]
            isOneToOne: false
            referencedRelation: "product_statuses"
            referencedColumns: ["code"]
          },
        ]
      }
      collections_with_counts: {
        Row: {
          actual_item_count: number | null
          collaboration_enabled_at: string | null
          collection_type: string | null
          cover_image_url: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by_user_id: string | null
          description: string | null
          follower_count: number | null
          id: string | null
          item_count: number | null
          like_count: number | null
          name: string | null
          owner_id: string | null
          slug: string | null
          sort_order: string | null
          updated_at: string | null
          visibility_code: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collections_visibility_fk"
            columns: ["visibility_code"]
            isOneToOne: false
            referencedRelation: "collection_visibilities"
            referencedColumns: ["code"]
          },
        ]
      }
      in_stock_skus: {
        Row: {
          available_from: string | null
          available_until: string | null
          backorder_allowed_until: string | null
          created_at: string | null
          created_by_user_id: string | null
          id: string | null
          low_stock_threshold: number | null
          original_price_cents: number | null
          price_cents: number | null
          product_id: string | null
          product_slug: string | null
          product_title: string | null
          sku_code: string | null
          stock_quantity: number | null
          updated_at: string | null
          updated_by_user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "skus_product_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "available_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skus_product_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skus_product_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skus_product_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "user_owned_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skus_product_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "user_wishlist"
            referencedColumns: ["id"]
          },
        ]
      }
      neptune_sync_cursor_status: {
        Row: {
          consecutive_errors: number | null
          direction: string | null
          entity_type: string | null
          id: string | null
          is_active: boolean | null
          last_commit_num: number | null
          last_error: string | null
          last_synced_at: string | null
          sync_type: string | null
        }
        Insert: {
          consecutive_errors?: number | null
          direction?: string | null
          entity_type?: string | null
          id?: string | null
          is_active?: boolean | null
          last_commit_num?: number | null
          last_error?: string | null
          last_synced_at?: string | null
          sync_type?: string | null
        }
        Update: {
          consecutive_errors?: number | null
          direction?: string | null
          entity_type?: string | null
          id?: string | null
          is_active?: boolean | null
          last_commit_num?: number | null
          last_error?: string | null
          last_synced_at?: string | null
          sync_type?: string | null
        }
        Relationships: []
      }
      neptune_sync_pending_summary: {
        Row: {
          direction: string | null
          entity_type: string | null
          newest_pending: string | null
          oldest_pending: string | null
          pending_count: number | null
        }
        Relationships: []
      }
      neptune_sync_retryable: {
        Row: {
          created_at: string | null
          direction: string | null
          entity_type: string | null
          entity_uri: string | null
          error_code: string | null
          error_message: string | null
          id: string | null
          idempotency_key: string | null
          max_retries: number | null
          neptune_commit_num: number | null
          next_retry_at: string | null
          operation: string | null
          payload: Json | null
          postgres_id: string | null
          postgres_table: string | null
          retry_count: number | null
          started_at: string | null
          sync_status: string | null
          synced_at: string | null
        }
        Insert: {
          created_at?: string | null
          direction?: string | null
          entity_type?: string | null
          entity_uri?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string | null
          idempotency_key?: string | null
          max_retries?: number | null
          neptune_commit_num?: number | null
          next_retry_at?: string | null
          operation?: string | null
          payload?: Json | null
          postgres_id?: string | null
          postgres_table?: string | null
          retry_count?: number | null
          started_at?: string | null
          sync_status?: string | null
          synced_at?: string | null
        }
        Update: {
          created_at?: string | null
          direction?: string | null
          entity_type?: string | null
          entity_uri?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string | null
          idempotency_key?: string | null
          max_retries?: number | null
          neptune_commit_num?: number | null
          next_retry_at?: string | null
          operation?: string | null
          payload?: Json | null
          postgres_id?: string | null
          postgres_table?: string | null
          retry_count?: number | null
          started_at?: string | null
          sync_status?: string | null
          synced_at?: string | null
        }
        Relationships: []
      }
      products_with_stats: {
        Row: {
          archived_at: string | null
          base_price_cents: number | null
          computed_avg_rating: number | null
          computed_review_count: number | null
          cover_image_url: string | null
          created_at: string | null
          created_by_user_id: string | null
          currency: string | null
          description: string | null
          featured_until: string | null
          format_code: string | null
          id: string | null
          images: Json | null
          last_synced_from_neptune_at: string | null
          medium_code: string | null
          narrative_unit_uri: string | null
          owners_count: number | null
          preorder_closes_at: string | null
          preorder_opens_at: string | null
          publisher_name: string | null
          rating_avg: number | null
          rating_count: number | null
          release_date: string | null
          review_count: number | null
          sales_total: number | null
          sku: string | null
          slug: string | null
          status_code: string | null
          story_expression_uri: string | null
          story_work_uri: string | null
          title: string | null
          updated_at: string | null
          updated_by_user_id: string | null
          wishlist_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_format_fk"
            columns: ["format_code"]
            isOneToOne: false
            referencedRelation: "product_formats"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "products_medium_fk"
            columns: ["medium_code"]
            isOneToOne: false
            referencedRelation: "product_mediums"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "products_status_fk"
            columns: ["status_code"]
            isOneToOne: false
            referencedRelation: "product_statuses"
            referencedColumns: ["code"]
          },
        ]
      }
      user_collections: {
        Row: {
          collaboration_enabled_at: string | null
          collection_type: string | null
          cover_image_url: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by_user_id: string | null
          description: string | null
          follower_count: number | null
          id: string | null
          item_count: number | null
          like_count: number | null
          name: string | null
          owner_avatar_url: string | null
          owner_display_name: string | null
          owner_id: string | null
          owner_username: string | null
          slug: string | null
          sort_order: string | null
          updated_at: string | null
          visibility_code: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collections_visibility_fk"
            columns: ["visibility_code"]
            isOneToOne: false
            referencedRelation: "collection_visibilities"
            referencedColumns: ["code"]
          },
        ]
      }
      user_owned_products: {
        Row: {
          archived_at: string | null
          base_price_cents: number | null
          cover_image_url: string | null
          created_at: string | null
          created_by_user_id: string | null
          currency: string | null
          description: string | null
          featured_until: string | null
          format_code: string | null
          id: string | null
          images: Json | null
          last_synced_from_neptune_at: string | null
          medium_code: string | null
          narrative_unit_uri: string | null
          ownership_type_code: string | null
          preorder_closes_at: string | null
          preorder_opens_at: string | null
          publisher_name: string | null
          purchased_at: string | null
          rating_avg: number | null
          rating_count: number | null
          release_date: string | null
          review_count: number | null
          sales_total: number | null
          sku: string | null
          slug: string | null
          status_code: string | null
          story_expression_uri: string | null
          story_work_uri: string | null
          title: string | null
          updated_at: string | null
          updated_by_user_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_format_fk"
            columns: ["format_code"]
            isOneToOne: false
            referencedRelation: "product_formats"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "products_medium_fk"
            columns: ["medium_code"]
            isOneToOne: false
            referencedRelation: "product_mediums"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "products_status_fk"
            columns: ["status_code"]
            isOneToOne: false
            referencedRelation: "product_statuses"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "user_product_state_ownership_fk"
            columns: ["ownership_type_code"]
            isOneToOne: false
            referencedRelation: "ownership_types"
            referencedColumns: ["code"]
          },
        ]
      }
      user_wishlist: {
        Row: {
          archived_at: string | null
          base_price_cents: number | null
          cover_image_url: string | null
          created_at: string | null
          created_by_user_id: string | null
          currency: string | null
          description: string | null
          featured_until: string | null
          format_code: string | null
          id: string | null
          images: Json | null
          last_synced_from_neptune_at: string | null
          medium_code: string | null
          narrative_unit_uri: string | null
          preorder_closes_at: string | null
          preorder_opens_at: string | null
          publisher_name: string | null
          rating_avg: number | null
          rating_count: number | null
          release_date: string | null
          review_count: number | null
          sales_total: number | null
          sku: string | null
          slug: string | null
          status_code: string | null
          story_expression_uri: string | null
          story_work_uri: string | null
          title: string | null
          updated_at: string | null
          updated_by_user_id: string | null
          user_id: string | null
          wishlist_notes: string | null
          wishlist_priority: number | null
          wishlisted_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_format_fk"
            columns: ["format_code"]
            isOneToOne: false
            referencedRelation: "product_formats"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "products_medium_fk"
            columns: ["medium_code"]
            isOneToOne: false
            referencedRelation: "product_mediums"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "products_status_fk"
            columns: ["status_code"]
            isOneToOne: false
            referencedRelation: "product_statuses"
            referencedColumns: ["code"]
          },
        ]
      }
    }
    Functions: {
      claim_neptune_sync_batch: {
        Args: { p_batch_size?: number; p_direction?: string }
        Returns: {
          created_at: string | null
          direction: string
          entity_type: string
          entity_uri: string
          error_code: string | null
          error_message: string | null
          id: string
          idempotency_key: string | null
          max_retries: number | null
          neptune_commit_num: number | null
          next_retry_at: string | null
          operation: string
          payload: Json | null
          postgres_id: string | null
          postgres_table: string | null
          retry_count: number | null
          started_at: string | null
          sync_status: string | null
          synced_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "neptune_sync_events"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      cleanup_old_deleted_records: { Args: never; Returns: undefined }
      complete_neptune_sync: {
        Args: {
          p_error_code?: string
          p_error_message?: string
          p_event_id: string
          p_success: boolean
        }
        Returns: boolean
      }
      enqueue_neptune_sync: {
        Args: {
          p_direction: string
          p_entity_type: string
          p_entity_uri: string
          p_neptune_commit_num?: number
          p_operation: string
          p_payload?: Json
          p_postgres_id?: string
          p_postgres_table?: string
        }
        Returns: string
      }
      get_character_appearance_count: {
        Args: { p_character_uri: string; p_user_id: string }
        Returns: Json
      }
      get_neptune_sync_stats: {
        Args: never
        Returns: {
          count: number
          direction: string
          newest_synced: string
          oldest_pending: string
          status: string
        }[]
      }
      get_pull_list_week_spend: {
        Args: { p_release_week: string; p_user_id: string }
        Returns: Json
      }
      mark_abandoned_carts: { Args: never; Returns: undefined }
      merge_guest_cart: {
        Args: { p_session_id: string; p_user_id: string }
        Returns: Json
      }
      release_expired_cart_reservations: { Args: never; Returns: undefined }
      reset_failed_neptune_syncs: { Args: never; Returns: number }
      restore_collection: { Args: { collection_id: string }; Returns: boolean }
      rls_can_view_activity: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      rls_can_view_collection: {
        Args: { collection_id: string }
        Returns: boolean
      }
      rls_can_view_profile: { Args: { profile_id: string }; Returns: boolean }
      rls_is_following: { Args: { target_user_id: string }; Returns: boolean }
      update_neptune_sync_cursor: {
        Args: {
          p_cursor_id: string
          p_error?: string
          p_last_commit_num?: number
          p_last_synced_uri?: string
        }
        Returns: undefined
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

