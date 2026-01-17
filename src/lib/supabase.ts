import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types for reference
export interface DbEvent {
  id: string;
  title: string;
  memo: string;
  organizer_email: string | null;
  created_at: string;
}

export interface DbDateCandidate {
  id: string;
  event_id: string;
  datetime: string;
  sort_order: number;
  created_at: string;
}

export interface DbParticipantResponse {
  id: string;
  event_id: string;
  name: string;
  comment: string;
  created_at: string;
  response_availability?: DbResponseAvailability[];
}

export interface DbResponseAvailability {
  id: string;
  response_id: string;
  date_candidate_id: string;
  availability: 'available' | 'maybe' | 'unavailable' | null;
}
