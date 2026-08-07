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
      analytics_modules: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          icon: string | null
          id: string
          is_included: boolean
          name: string
          position: number
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          icon?: string | null
          id?: string
          is_included?: boolean
          name: string
          position?: number
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          icon?: string | null
          id?: string
          is_included?: boolean
          name?: string
          position?: number
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_modules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_modules_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          badge_label: string | null
          created_at: string
          created_by: string | null
          ends_at: string | null
          href: string | null
          id: string
          is_dismissible: boolean
          link_label: string | null
          message: string
          position: number
          starts_at: string | null
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          badge_label?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          href?: string | null
          id?: string
          is_dismissible?: boolean
          link_label?: string | null
          message: string
          position?: number
          starts_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          badge_label?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          href?: string | null
          id?: string
          is_dismissible?: boolean
          link_label?: string | null
          message?: string
          position?: number
          starts_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          scopes: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          scopes?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          scopes?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          entity: string
          entity_id: string | null
          id: number
          ip_address: unknown
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: never
          ip_address?: unknown
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: never
          ip_address?: unknown
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string | null
          body: string | null
          cover_media_id: string | null
          created_at: string
          created_by: string | null
          excerpt: string | null
          id: string
          position: number
          published_at: string | null
          reading_minutes: number | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          tags: string[]
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          author_id?: string | null
          body?: string | null
          cover_media_id?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: string
          position?: number
          published_at?: string | null
          reading_minutes?: number | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          tags?: string[]
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          author_id?: string | null
          body?: string | null
          cover_media_id?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: string
          position?: number
          published_at?: string | null
          reading_minutes?: number | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          tags?: string[]
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_cover_fk"
            columns: ["cover_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      company: {
        Row: {
          address: string | null
          copyright_notice: string | null
          created_at: string
          created_by: string | null
          description: string | null
          email: string | null
          favicon_media_id: string | null
          id: string
          legal_name: string | null
          logo_dark_media_id: string | null
          logo_media_id: string | null
          name: string
          phone: string | null
          position: number
          social_links: Json
          status: Database["public"]["Enums"]["content_status"]
          tagline: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          copyright_notice?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          email?: string | null
          favicon_media_id?: string | null
          id?: string
          legal_name?: string | null
          logo_dark_media_id?: string | null
          logo_media_id?: string | null
          name?: string
          phone?: string | null
          position?: number
          social_links?: Json
          status?: Database["public"]["Enums"]["content_status"]
          tagline?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          copyright_notice?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          email?: string | null
          favicon_media_id?: string | null
          id?: string
          legal_name?: string | null
          logo_dark_media_id?: string | null
          logo_media_id?: string | null
          name?: string
          phone?: string | null
          position?: number
          social_links?: Json
          status?: Database["public"]["Enums"]["content_status"]
          tagline?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_favicon_fk"
            columns: ["favicon_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_logo_dark_fk"
            columns: ["logo_dark_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_logo_fk"
            columns: ["logo_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          answer: string
          category: string | null
          created_at: string
          created_by: string | null
          id: string
          position: number
          question: string
          show_on_landing: boolean
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          position?: number
          question: string
          show_on_landing?: boolean
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          position?: number
          question?: string
          show_on_landing?: boolean
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faqs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faqs_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      features: {
        Row: {
          collection: string
          created_at: string
          created_by: string | null
          cta_label: string | null
          description: string
          href: string | null
          icon: string | null
          id: string
          metric: number | null
          metric_unit: string | null
          position: number
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          collection?: string
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          description: string
          href?: string | null
          icon?: string | null
          id?: string
          metric?: number | null
          metric_unit?: string | null
          position?: number
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          collection?: string
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          description?: string
          href?: string | null
          icon?: string | null
          id?: string
          metric?: number | null
          metric_unit?: string | null
          position?: number
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "features_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "features_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      footer_links: {
        Row: {
          column_label: string
          created_at: string
          created_by: string | null
          href: string
          id: string
          label: string
          opens_in_new_tab: boolean
          position: number
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          column_label: string
          created_at?: string
          created_by?: string | null
          href: string
          id?: string
          label: string
          opens_in_new_tab?: boolean
          position?: number
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          column_label?: string
          created_at?: string
          created_by?: string | null
          href?: string
          id?: string
          label?: string
          opens_in_new_tab?: boolean
          position?: number
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "footer_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "footer_links_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      hero_sections: {
        Row: {
          created_at: string
          created_by: string | null
          eyebrow: string | null
          headline: string
          headline_accent: string | null
          headline_after: string | null
          id: string
          position: number
          primary_cta_href: string | null
          primary_cta_label: string | null
          route: string
          secondary_cta_href: string | null
          secondary_cta_label: string | null
          status: Database["public"]["Enums"]["content_status"]
          subheadline: string | null
          trust_points: string[]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          eyebrow?: string | null
          headline: string
          headline_accent?: string | null
          headline_after?: string | null
          id?: string
          position?: number
          primary_cta_href?: string | null
          primary_cta_label?: string | null
          route: string
          secondary_cta_href?: string | null
          secondary_cta_label?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          subheadline?: string | null
          trust_points?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          eyebrow?: string | null
          headline?: string
          headline_accent?: string | null
          headline_after?: string | null
          id?: string
          position?: number
          primary_cta_href?: string | null
          primary_cta_label?: string | null
          route?: string
          secondary_cta_href?: string | null
          secondary_cta_label?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          subheadline?: string | null
          trust_points?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hero_sections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hero_sections_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          availability: string
          created_at: string
          created_by: string | null
          description: string | null
          href: string | null
          icon_slug: string | null
          id: string
          logo_media_id: string | null
          name: string
          position: number
          ring: string
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          availability?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          href?: string | null
          icon_slug?: string | null
          id?: string
          logo_media_id?: string | null
          name: string
          position?: number
          ring?: string
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          availability?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          href?: string | null
          icon_slug?: string | null
          id?: string
          logo_media_id?: string | null
          name?: string
          position?: number
          ring?: string
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integrations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integrations_logo_fk"
            columns: ["logo_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integrations_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_settings: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          position: number
          primary_cta_href: string
          primary_cta_label: string
          secondary_cta_href: string | null
          secondary_cta_label: string | null
          show_announcement: boolean
          show_partners: boolean
          show_pricing: boolean
          show_testimonials: boolean
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          position?: number
          primary_cta_href?: string
          primary_cta_label?: string
          secondary_cta_href?: string | null
          secondary_cta_label?: string | null
          show_announcement?: boolean
          show_partners?: boolean
          show_pricing?: boolean
          show_testimonials?: boolean
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          position?: number
          primary_cta_href?: string
          primary_cta_label?: string
          secondary_cta_href?: string | null
          secondary_cta_label?: string | null
          show_announcement?: boolean
          show_partners?: boolean
          show_pricing?: boolean
          show_testimonials?: boolean
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "landing_settings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          alt_text: string | null
          blur_data_url: string | null
          bucket: string
          caption: string | null
          created_at: string
          duration_seconds: number | null
          filename: string
          height: number | null
          id: string
          kind: Database["public"]["Enums"]["media_kind"]
          mime_type: string
          path: string
          size_bytes: number
          updated_at: string
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          blur_data_url?: string | null
          bucket?: string
          caption?: string | null
          created_at?: string
          duration_seconds?: number | null
          filename: string
          height?: number | null
          id?: string
          kind: Database["public"]["Enums"]["media_kind"]
          mime_type: string
          path: string
          size_bytes: number
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          blur_data_url?: string | null
          bucket?: string
          caption?: string | null
          created_at?: string
          duration_seconds?: number | null
          filename?: string
          height?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["media_kind"]
          mime_type?: string
          path?: string
          size_bytes?: number
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      navigation: {
        Row: {
          blurb: string | null
          created_at: string
          created_by: string | null
          description: string | null
          href: string | null
          icon: string | null
          id: string
          label: string
          location: string
          opens_in_new_tab: boolean
          parent_id: string | null
          position: number
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          blurb?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          href?: string | null
          icon?: string | null
          id?: string
          label: string
          location?: string
          opens_in_new_tab?: boolean
          parent_id?: string | null
          position?: number
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          blurb?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          href?: string | null
          icon?: string | null
          id?: string
          label?: string
          location?: string
          opens_in_new_tab?: boolean
          parent_id?: string | null
          position?: number
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "navigation_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navigation_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "navigation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navigation_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      pages: {
        Row: {
          body: string | null
          created_at: string
          created_by: string | null
          excerpt: string | null
          id: string
          kind: string
          parent_slug: string | null
          position: number
          published_at: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: string
          kind?: string
          parent_slug?: string | null
          position?: number
          published_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: string
          kind?: string
          parent_slug?: string | null
          position?: number
          published_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pages_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          href: string | null
          icon_slug: string | null
          id: string
          logo_media_id: string | null
          name: string
          position: number
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          href?: string | null
          icon_slug?: string | null
          id?: string
          logo_media_id?: string | null
          name: string
          position?: number
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          href?: string | null
          icon_slug?: string | null
          id?: string
          logo_media_id?: string | null
          name?: string
          position?: number
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partners_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partners_logo_fk"
            columns: ["logo_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partners_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      popups: {
        Row: {
          body: string | null
          created_at: string
          created_by: string | null
          cta_href: string | null
          cta_label: string | null
          ends_at: string | null
          id: string
          image_media_id: string | null
          position: number
          starts_at: string | null
          status: Database["public"]["Enums"]["content_status"]
          suppress_days: number
          title: string
          trigger_type: string
          trigger_value: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          cta_href?: string | null
          cta_label?: string | null
          ends_at?: string | null
          id?: string
          image_media_id?: string | null
          position?: number
          starts_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          suppress_days?: number
          title: string
          trigger_type?: string
          trigger_value?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          cta_href?: string | null
          cta_label?: string | null
          ends_at?: string | null
          id?: string
          image_media_id?: string | null
          position?: number
          starts_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          suppress_days?: number
          title?: string
          trigger_type?: string
          trigger_value?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "popups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "popups_image_fk"
            columns: ["image_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "popups_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_plans: {
        Row: {
          amount: number | null
          blurb: string | null
          cadence: string
          created_at: string
          created_by: string | null
          cta_href: string
          cta_label: string
          currency: string
          id: string
          is_highlighted: boolean
          limits: string[]
          name: string
          position: number
          price_label: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount?: number | null
          blurb?: string | null
          cadence?: string
          created_at?: string
          created_by?: string | null
          cta_href?: string
          cta_label?: string
          currency?: string
          id?: string
          is_highlighted?: boolean
          limits?: string[]
          name: string
          position?: number
          price_label?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number | null
          blurb?: string | null
          cadence?: string
          created_at?: string
          created_by?: string | null
          cta_href?: string
          cta_label?: string
          currency?: string
          id?: string
          is_highlighted?: boolean
          limits?: string[]
          name?: string
          position?: number
          price_label?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_plans_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      release_notes: {
        Row: {
          body: string | null
          category: string
          created_at: string
          created_by: string | null
          id: string
          position: number
          released_at: string
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
          updated_by: string | null
          version: string
        }
        Insert: {
          body?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          position?: number
          released_at?: string
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at?: string
          updated_by?: string | null
          version: string
        }
        Update: {
          body?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          position?: number
          released_at?: string
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
          updated_by?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "release_notes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_entries: {
        Row: {
          canonical_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          include_in_sitemap: boolean
          keywords: string[]
          og_description: string | null
          og_image_media_id: string | null
          og_title: string | null
          position: number
          robots_follow: boolean
          robots_index: boolean
          route: string
          sitemap_changefreq: string
          sitemap_priority: number
          status: Database["public"]["Enums"]["content_status"]
          structured_data: Json | null
          title: string | null
          twitter_card: string
          twitter_description: string | null
          twitter_image_media_id: string | null
          twitter_title: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          canonical_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          include_in_sitemap?: boolean
          keywords?: string[]
          og_description?: string | null
          og_image_media_id?: string | null
          og_title?: string | null
          position?: number
          robots_follow?: boolean
          robots_index?: boolean
          route: string
          sitemap_changefreq?: string
          sitemap_priority?: number
          status?: Database["public"]["Enums"]["content_status"]
          structured_data?: Json | null
          title?: string | null
          twitter_card?: string
          twitter_description?: string | null
          twitter_image_media_id?: string | null
          twitter_title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          canonical_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          include_in_sitemap?: boolean
          keywords?: string[]
          og_description?: string | null
          og_image_media_id?: string | null
          og_title?: string | null
          position?: number
          robots_follow?: boolean
          robots_index?: boolean
          route?: string
          sitemap_changefreq?: string
          sitemap_priority?: number
          status?: Database["public"]["Enums"]["content_status"]
          structured_data?: Json | null
          title?: string | null
          twitter_card?: string
          twitter_description?: string | null
          twitter_image_media_id?: string | null
          twitter_title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seo_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_entries_og_image_fk"
            columns: ["og_image_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_entries_twitter_image_fk"
            columns: ["twitter_image_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_entries_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string
          description: string | null
          group_label: string
          is_public: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          group_label?: string
          is_public?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          group_label?: string
          is_public?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          connected_by: string | null
          consumer_key: string
          consumer_secret_encrypted: string
          created_at: string
          history_months: number
          id: string
          is_active: boolean
          last_synced_at: string | null
          max_pages: number
          name: string | null
          organization_id: string
          updated_at: string
          url: string
        }
        Insert: {
          connected_by?: string | null
          consumer_key: string
          consumer_secret_encrypted: string
          created_at?: string
          history_months?: number
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          max_pages?: number
          name?: string | null
          organization_id: string
          updated_at?: string
          url: string
        }
        Update: {
          connected_by?: string | null
          consumer_key?: string
          consumer_secret_encrypted?: string
          created_at?: string
          history_months?: number
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          max_pages?: number
          name?: string | null
          organization_id?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_connected_by_fkey"
            columns: ["connected_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          author_context: string | null
          author_name: string | null
          author_role: string
          avatar_media_id: string | null
          company: string | null
          created_at: string
          created_by: string | null
          id: string
          is_verified: boolean
          position: number
          quote: string
          rating: number | null
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          author_context?: string | null
          author_name?: string | null
          author_role: string
          avatar_media_id?: string | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_verified?: boolean
          position?: number
          quote: string
          rating?: number | null
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          author_context?: string | null
          author_name?: string | null
          author_role?: string
          avatar_media_id?: string | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_verified?: boolean
          position?: number
          quote?: string
          rating?: number | null
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "testimonials_avatar_fk"
            columns: ["avatar_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "testimonials_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "testimonials_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          last_seen_at: string | null
          organization_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          last_seen_at?: string | null
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_gateways: {
        Row: {
          api_token_encrypted: string | null
          base_url: string | null
          created_at: string
          id: string
          is_connected: boolean
          last_checked_at: string | null
          organization_id: string
          phone_number: string | null
          provider: string
          updated_at: string
        }
        Insert: {
          api_token_encrypted?: string | null
          base_url?: string | null
          created_at?: string
          id?: string
          is_connected?: boolean
          last_checked_at?: string | null
          organization_id: string
          phone_number?: string | null
          provider?: string
          updated_at?: string
        }
        Update: {
          api_token_encrypted?: string | null
          base_url?: string | null
          created_at?: string
          id?: string
          is_connected?: boolean
          last_checked_at?: string | null
          organization_id?: string
          phone_number?: string | null
          provider?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_gateways_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      stores_redacted: {
        Row: {
          created_at: string | null
          history_months: number | null
          id: string | null
          is_active: boolean | null
          last_synced_at: string | null
          max_pages: number | null
          name: string | null
          organization_id: string | null
          updated_at: string | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          history_months?: number | null
          id?: string | null
          is_active?: boolean | null
          last_synced_at?: string | null
          max_pages?: number | null
          name?: string | null
          organization_id?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          history_months?: number | null
          id?: string | null
          is_active?: boolean | null
          last_synced_at?: string | null
          max_pages?: number | null
          name?: string | null
          organization_id?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_content_columns: { Args: { target: unknown }; Returns: undefined }
      apply_content_rls: { Args: { target: unknown }; Returns: undefined }
      attach_updated_at: { Args: { target: unknown }; Returns: undefined }
      current_organization: { Args: never; Returns: string }
      current_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_min_role: {
        Args: { minimum: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      is_staff: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "customer" | "viewer" | "support" | "editor" | "admin"
      content_status: "draft" | "published" | "archived"
      media_kind: "image" | "video" | "document"
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
      app_role: ["customer", "viewer", "support", "editor", "admin"],
      content_status: ["draft", "published", "archived"],
      media_kind: ["image", "video", "document"],
    },
  },
} as const
