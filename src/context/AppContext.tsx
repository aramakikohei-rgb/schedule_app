import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { supabase, type DbEvent, type DbDateCandidate, type DbParticipantResponse } from '../lib/supabase';
import type { ScheduleEvent, AppView, Availability } from '../types';

const WEB3FORMS_KEY = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY || 'ef54615d-06a6-4b54-a79a-a0663e248cae';

// Send email notification using Web3Forms
async function sendEmailNotification(
  organizerEmail: string,
  eventTitle: string,
  participantName: string,
  viewUrl: string
): Promise<void> {
  console.log('Sending email notification:', { organizerEmail, eventTitle, participantName, viewUrl });

  try {
    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_key: WEB3FORMS_KEY,
        subject: `[ちょうせいくん] New response for "${eventTitle}"`,
        from_name: 'ちょうせいくん',
        to: organizerEmail,
        name: participantName,
        message: `${participantName} has submitted their availability.`,
        'View Responses': viewUrl,
      }),
    });

    const result = await response.json();
    console.log('Email notification result:', result);

    if (!response.ok) console.error('Failed to send email notification');
  } catch (error) {
    console.error('Error sending email notification:', error);
  }
}

interface AppContextType {
  events: ScheduleEvent[];
  currentEventId: string | null;
  currentView: AppView;
  editingResponseId: string | null;
  isLoading: boolean;
  error: string | null;
  setCurrentEventId: (id: string | null) => void;
  setCurrentView: (view: AppView) => void;
  setEditingResponseId: (id: string | null) => void;
  createEvent: (title: string, memo: string, dateCandidates: { datetime: string }[], organizerEmail?: string) => Promise<string>;
  getEvent: (id: string) => ScheduleEvent | undefined;
  fetchEvent: (id: string) => Promise<ScheduleEvent | null>;
  getShareableUrl: (eventId: string) => string;
  addParticipantResponse: (eventId: string, name: string, comment: string, responses: Record<string, Availability>) => Promise<void>;
  updateParticipantResponse: (eventId: string, responseId: string, name: string, comment: string, responses: Record<string, Availability>) => Promise<void>;
  deleteParticipantResponse: (eventId: string, responseId: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [currentEventId, setCurrentEventId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [editingResponseId, setEditingResponseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate shareable URL (now simple with just the event ID)
  const getShareableUrl = useCallback((eventId: string): string => {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}#/event/${eventId}`;
  }, []);

  // Fetch a single event from Supabase
  const fetchEvent = useCallback(async (id: string): Promise<ScheduleEvent | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch event
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (eventError) {
        if (eventError.code === 'PGRST116') {
          // Event not found
          return null;
        }
        throw eventError;
      }
      if (!eventData) return null;

      const dbEvent = eventData as DbEvent;

      // Fetch date candidates
      const { data: dateCandidatesData, error: dcError } = await supabase
        .from('date_candidates')
        .select('*')
        .eq('event_id', id)
        .order('sort_order');

      if (dcError) throw dcError;

      const dateCandidates = (dateCandidatesData || []) as DbDateCandidate[];

      // Fetch participant responses with availability
      const { data: responsesData, error: respError } = await supabase
        .from('participant_responses')
        .select(`
          *,
          response_availability (
            date_candidate_id,
            availability
          )
        `)
        .eq('event_id', id)
        .order('created_at');

      if (respError) throw respError;

      const responses = (responsesData || []) as DbParticipantResponse[];

      // Transform to ScheduleEvent format
      const event: ScheduleEvent = {
        id: dbEvent.id,
        title: dbEvent.title,
        memo: dbEvent.memo || '',
        organizerEmail: dbEvent.organizer_email || undefined,
        createdAt: dbEvent.created_at,
        dateCandidates: dateCandidates.map(dc => ({
          id: dc.id,
          datetime: dc.datetime,
        })),
        participants: responses.map(r => ({
          id: r.id,
          name: r.name,
          comment: r.comment || '',
          createdAt: r.created_at,
          responses: Object.fromEntries(
            (r.response_availability || []).map(ra => [
              ra.date_candidate_id,
              ra.availability as Availability,
            ])
          ),
        })),
      };

      // Update local cache
      setEvents(prev => {
        const exists = prev.find(e => e.id === id);
        if (exists) {
          return prev.map(e => (e.id === id ? event : e));
        }
        return [...prev, event];
      });

      return event;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch event';
      setError(message);
      console.error('Error fetching event:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Parse URL hash on mount
  useEffect(() => {
    const hash = window.location.hash;

    // New format: #/event/{id} or #/event/{id}/respond
    if (hash.startsWith('#/event/')) {
      const parts = hash.replace('#/event/', '').split('/');
      const eventId = parts[0];

      if (eventId) {
        setCurrentEventId(eventId);
        fetchEvent(eventId);

        if (parts[1] === 'respond') {
          setCurrentView('respond');
        } else {
          setCurrentView('event');
        }
      }
    }
  }, [fetchEvent]);

  // Update URL when view changes
  useEffect(() => {
    if (currentEventId && currentView === 'event') {
      window.history.replaceState(null, '', `#/event/${currentEventId}`);
    } else if (currentEventId && currentView === 'respond') {
      window.history.replaceState(null, '', `#/event/${currentEventId}/respond`);
    } else if (currentView === 'home') {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [currentEventId, currentView]);

  // Create a new event
  const createEvent = async (
    title: string,
    memo: string,
    dateCandidates: { datetime: string }[],
    organizerEmail?: string
  ): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      // Insert event
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .insert({
          title,
          memo,
          organizer_email: organizerEmail || null,
        })
        .select()
        .single();

      if (eventError) throw eventError;

      const dbEvent = eventData as DbEvent;

      // Insert date candidates
      if (dateCandidates.length > 0) {
        const { error: dcError } = await supabase
          .from('date_candidates')
          .insert(
            dateCandidates.map((dc, index) => ({
              event_id: dbEvent.id,
              datetime: dc.datetime,
              sort_order: index,
            }))
          );

        if (dcError) throw dcError;
      }

      // Fetch the complete event
      await fetchEvent(dbEvent.id);

      return dbEvent.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create event';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Get event from local cache
  const getEvent = (id: string): ScheduleEvent | undefined => {
    return events.find(e => e.id === id);
  };

  // Add a participant response
  const addParticipantResponse = async (
    eventId: string,
    name: string,
    comment: string,
    responses: Record<string, Availability>
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Insert participant response
      const { data: responseData, error: respError } = await supabase
        .from('participant_responses')
        .insert({
          event_id: eventId,
          name,
          comment,
        })
        .select()
        .single();

      if (respError) throw respError;

      const dbResponse = responseData as DbParticipantResponse;

      // Insert availability records
      const availabilityRecords = Object.entries(responses)
        .filter(([_, availability]) => availability !== null)
        .map(([dateCandidateId, availability]) => ({
          response_id: dbResponse.id,
          date_candidate_id: dateCandidateId,
          availability,
        }));

      if (availabilityRecords.length > 0) {
        const { error: avError } = await supabase
          .from('response_availability')
          .insert(availabilityRecords);

        if (avError) throw avError;
      }

      // Refresh event data
      const event = await fetchEvent(eventId);

      console.log('Event after fetch:', event);
      console.log('Organizer email:', event?.organizerEmail);

      // Send email notification
      if (event?.organizerEmail) {
        const viewUrl = getShareableUrl(eventId);
        console.log('Sending email to:', event.organizerEmail, 'with URL:', viewUrl);
        await sendEmailNotification(event.organizerEmail, event.title, name, viewUrl);
      } else {
        console.log('No organizer email found, skipping email notification');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add response';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Update a participant response
  const updateParticipantResponse = async (
    eventId: string,
    responseId: string,
    name: string,
    comment: string,
    responses: Record<string, Availability>
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Update participant response
      const { error: respError } = await supabase
        .from('participant_responses')
        .update({ name, comment })
        .eq('id', responseId);

      if (respError) throw respError;

      // Delete existing availability records
      const { error: delError } = await supabase
        .from('response_availability')
        .delete()
        .eq('response_id', responseId);

      if (delError) throw delError;

      // Insert new availability records
      const availabilityRecords = Object.entries(responses)
        .filter(([_, availability]) => availability !== null)
        .map(([dateCandidateId, availability]) => ({
          response_id: responseId,
          date_candidate_id: dateCandidateId,
          availability,
        }));

      if (availabilityRecords.length > 0) {
        const { error: avError } = await supabase
          .from('response_availability')
          .insert(availabilityRecords);

        if (avError) throw avError;
      }

      // Refresh event data
      await fetchEvent(eventId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update response';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a participant response
  const deleteParticipantResponse = async (
    eventId: string,
    responseId: string
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Delete participant response (availability records cascade)
      const { error } = await supabase
        .from('participant_responses')
        .delete()
        .eq('id', responseId);

      if (error) throw error;

      // Refresh event data
      await fetchEvent(eventId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete response';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppContext.Provider
      value={{
        events,
        currentEventId,
        currentView,
        editingResponseId,
        isLoading,
        error,
        setCurrentEventId,
        setCurrentView,
        setEditingResponseId,
        createEvent,
        getEvent,
        fetchEvent,
        getShareableUrl,
        addParticipantResponse,
        updateParticipantResponse,
        deleteParticipantResponse,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
