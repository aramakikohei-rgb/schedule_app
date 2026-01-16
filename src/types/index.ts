export type Availability = 'available' | 'maybe' | 'unavailable' | null;

export interface DateCandidate {
  id: string;
  datetime: string; // Display string like "1/20(月) 19:00〜" or "Jan 20 (Mon) 7pm"
}

export interface ParticipantResponse {
  id: string;
  name: string;
  comment: string;
  responses: Record<string, Availability>; // dateCandidateId -> availability
  createdAt: string;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  memo: string;
  dateCandidates: DateCandidate[];
  participants: ParticipantResponse[];
  createdAt: string;
}

export interface AppData {
  events: ScheduleEvent[];
}

export type Language = 'en' | 'ja';

export type AppView = 'home' | 'create' | 'event' | 'respond';
