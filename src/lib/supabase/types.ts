// Auto-generated types matching our Supabase schema
// Re-run: npx supabase gen types typescript --local > src/lib/supabase/types.ts
import type { AgeGroup, ChapterType } from '../chapters'

// Chapter ids live in the single registry (src/lib/chapters.ts); re-exported
// here so existing `@/lib/supabase/types` imports keep working.
export type { ChapterType } from '../chapters'
export type UserRole    = 'parent' | 'learner'
export type InviteStatus = 'pending' | 'accepted' | 'expired'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id:           string
          role:         UserRole
          display_name: string
          avatar_index: number
          created_at:   string
          updated_at:   string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      learners: {
        Row: {
          id:            string
          display_name:  string
          avatar_index:  number
          date_of_birth: string | null
          age_group:     AgeGroup
          grade_id:      string | null
          created_by:    string
          created_at:    string
          updated_at:    string
        }
        Insert: Omit<Database['public']['Tables']['learners']['Row'], 'id' | 'grade_id' | 'created_at' | 'updated_at'>
          & { grade_id?: string | null }
        Update: Partial<Database['public']['Tables']['learners']['Insert']>
      }
      grades: {
        Row: {
          id:         string
          created_by: string
          name:       string
          age_group:  AgeGroup
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['grades']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['grades']['Insert']>
      }
      grade_chapters: {
        Row: {
          grade_id:   string
          chapter_id: ChapterType
          sort_order: number
        }
        Insert: Database['public']['Tables']['grade_chapters']['Row']
        Update: Partial<Database['public']['Tables']['grade_chapters']['Insert']>
      }
      chapters: {
        Row: {
          id:         string
          name:       string
          emoji:      string
          sort_order: number
          age_groups: AgeGroup[]
        }
        Insert: Database['public']['Tables']['chapters']['Row']
        Update: Partial<Database['public']['Tables']['chapters']['Insert']>
      }
      learner_access: {
        Row: {
          id:          string
          learner_id:  string
          parent_id:   string
          access_role: 'owner' | 'viewer'
          granted_at:  string
        }
        Insert: Omit<Database['public']['Tables']['learner_access']['Row'], 'id' | 'granted_at'>
        Update: Partial<Database['public']['Tables']['learner_access']['Insert']>
      }
      learner_invites: {
        Row: {
          id:             string
          learner_id:     string
          invited_by:     string
          invited_email:  string
          status:         InviteStatus
          expires_at:     string
          created_at:     string
        }
        Insert: Omit<Database['public']['Tables']['learner_invites']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['learner_invites']['Insert']>
      }
      sessions: {
        Row: {
          id:            string
          learner_id:    string
          chapter:       ChapterType
          phase:         'lesson' | 'practice'
          started_at:    string
          completed_at:  string | null
          correct_count: number
          wrong_count:   number
          stars_earned:  number
          xp_earned:     number
          coins_earned:  number
          client_id:     string | null
        }
        Insert: Omit<Database['public']['Tables']['sessions']['Row'], 'id' | 'started_at'>
        Update: Partial<Database['public']['Tables']['sessions']['Insert']>
      }
      learner_progress: {
        Row: {
          id:              string
          learner_id:      string
          chapter:         ChapterType
          best_stars:      number
          total_xp:        number
          total_sessions:  number
          last_played_at:  string | null
          current_level:   number
          updated_at:      string
        }
        Insert: Omit<Database['public']['Tables']['learner_progress']['Row'], 'id' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['learner_progress']['Insert']>
      }
      learner_stats: {
        Row: {
          learner_id:      string
          total_xp:        number
          total_coins:     number
          current_level:   number
          current_streak:  number
          longest_streak:  number
          last_played_at:  string | null
          updated_at:      string
        }
        Insert: Omit<Database['public']['Tables']['learner_stats']['Row'], 'updated_at'>
        Update: Partial<Database['public']['Tables']['learner_stats']['Insert']>
      }
      learner_state: {
        Row: {
          learner_id:     string
          coins_spent:    number
          owned_items:    string[]
          equipped_items: Record<string, string>
          updated_at:     string
        }
        Insert: Omit<Database['public']['Tables']['learner_state']['Row'], 'updated_at'>
        Update: Partial<Database['public']['Tables']['learner_state']['Insert']>
      }
    }
  }
}

// Convenience row types
export type Profile        = Database['public']['Tables']['profiles']['Row']
export type Learner        = Database['public']['Tables']['learners']['Row']
export type Grade          = Database['public']['Tables']['grades']['Row']
export type GradeChapter   = Database['public']['Tables']['grade_chapters']['Row']
export type LearnerAccess  = Database['public']['Tables']['learner_access']['Row']
export type LearnerInvite  = Database['public']['Tables']['learner_invites']['Row']
export type Session        = Database['public']['Tables']['sessions']['Row']
export type LearnerProgress = Database['public']['Tables']['learner_progress']['Row']
export type LearnerStats   = Database['public']['Tables']['learner_stats']['Row']
export type LearnerState   = Database['public']['Tables']['learner_state']['Row']

// Invite with optional learner name (joined query result)
export interface InviteWithLearner {
  id:            string
  learner_id:    string
  invited_by:    string
  invited_email: string
  status:        'pending' | 'accepted' | 'expired'
  expires_at:    string
  created_at:    string
  learner_name?: string
}