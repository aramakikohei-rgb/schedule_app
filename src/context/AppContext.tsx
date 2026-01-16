import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { ScheduleEvent, AppData, AppView, ParticipantResponse, Availability } from '../types';

const STORAGE_KEY = 'schedule-coordinator-data';

// Encode event data to base64 for URL sharing
function encodeEventToUrl(event: ScheduleEvent): string {
  const minimalEvent = {
    id: event.id,
    title: event.title,
    memo: event.memo,
    organizerEmail: event.organizerEmail,
    dateCandidates: event.dateCandidates,
    participants: event.participants,
    createdAt: event.createdAt,
  };
  const json = JSON.stringify(minimalEvent);
  return btoa(encodeURIComponent(json));
}

// Send email notification using Web3Forms
async function sendEmailNotification(
  organizerEmail: string,
  eventTitle: string,
  participantName: string
): Promise<void> {
  try {
    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        access_key: 'ef54615d-06a6-4b54-a79a-a0663e248cae',
        subject: `[ちょうせいくん] ${participantName} responded to "${eventTitle}"`,
        from_name: 'ちょうせいくん',
        to: organizerEmail,
        message: `${participantName} has submitted their availability for "${eventTitle}".`,
      }),
    });

    if (!response.ok) {
      console.error('Failed to send email notification');
    }
  } catch (error) {
    console.error('Error sending email notification:', error);
  }
}

// Decode event data from base64 URL
function decodeEventFromUrl(encoded: string): ScheduleEvent | null {
  try {
    const json = decodeURIComponent(atob(encoded));
    return JSON.parse(json) as ScheduleEvent;
  } catch {
    return null;
  }
}

interface AppContextType {
  events: ScheduleEvent[];
  currentEventId: string | null;
  currentView: AppView;
  editingResponseId: string | null;
  setCurrentEventId: (id: string | null) => void;
  setCurrentView: (view: AppView) => void;
  setEditingResponseId: (id: string | null) => void;
  createEvent: (title: string, memo: string, dateCandidates: { datetime: string }[], organizerEmail?: string) => string;
  getEvent: (id: string) => ScheduleEvent | undefined;
  getShareableUrl: (event: ScheduleEvent) => string;
  addParticipantResponse: (eventId: string, name: string, comment: string, responses: Record<string, Availability>) => void;
  updateParticipantResponse: (eventId: string, responseId: string, name: string, comment: string, responses: Record<string, Availability>) => void;
  deleteParticipantResponse: (eventId: string, responseId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function loadFromStorage(): AppData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load data from localStorage:', error);
  }
  return { events: [] };
}

function saveToStorage(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save data to localStorage:', error);
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [currentEventId, setCurrentEventId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [editingResponseId, setEditingResponseId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [sharedEvent, setSharedEvent] = useState<ScheduleEvent | null>(null);

  // Generate shareable URL for an event
  const getShareableUrl = useCallback((event: ScheduleEvent): string => {
    const encoded = encodeEventToUrl(event);
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}#/e/${encoded}`;
  }, []);

  // Parse URL hash on mount - handle both old format and new encoded format
  useEffect(() => {
    const hash = window.location.hash;

    // New format: #/e/{encoded_data} or #/e/{encoded_data}/respond
    if (hash.startsWith('#/e/')) {
      const parts = hash.replace('#/e/', '').split('/');
      const encodedData = parts[0];
      const decodedEvent = decodeEventFromUrl(encodedData);

      if (decodedEvent) {
        setSharedEvent(decodedEvent);
        setCurrentEventId(decodedEvent.id);
        if (parts[1] === 'respond') {
          setCurrentView('respond');
        } else {
          setCurrentView('event');
        }
      }
    }
    // Legacy format: #/event/{id}
    else if (hash.startsWith('#/event/')) {
      const eventId = hash.replace('#/event/', '').split('/')[0];
      setCurrentEventId(eventId);
      if (hash.includes('/respond')) {
        setCurrentView('respond');
      } else {
        setCurrentView('event');
      }
    }
  }, []);

  // Load data from localStorage on mount
  useEffect(() => {
    const data = loadFromStorage();
    setEvents(data.events);
    setIsInitialized(true);
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    if (isInitialized) {
      saveToStorage({ events });
    }
  }, [events, isInitialized]);

  // Update URL hash when shared event changes (for syncing responses)
  useEffect(() => {
    if (sharedEvent && currentView === 'event') {
      const encoded = encodeEventToUrl(sharedEvent);
      window.history.replaceState(null, '', `#/e/${encoded}`);
    } else if (sharedEvent && currentView === 'respond') {
      const encoded = encodeEventToUrl(sharedEvent);
      window.history.replaceState(null, '', `#/e/${encoded}/respond`);
    }
  }, [sharedEvent, currentView]);

  const createEvent = (title: string, memo: string, dateCandidates: { datetime: string }[], organizerEmail?: string): string => {
    const id = uuidv4();
    const newEvent: ScheduleEvent = {
      id,
      title,
      memo,
      organizerEmail,
      dateCandidates: dateCandidates.map(dc => ({
        id: uuidv4(),
        datetime: dc.datetime,
      })),
      participants: [],
      createdAt: new Date().toISOString(),
    };
    setEvents(prev => [...prev, newEvent]);
    // Also set as shared event so URL gets updated
    setSharedEvent(newEvent);
    return id;
  };

  const getEvent = (id: string): ScheduleEvent | undefined => {
    // First check shared event (from URL)
    if (sharedEvent && sharedEvent.id === id) {
      return sharedEvent;
    }
    // Then check local events
    return events.find(e => e.id === id);
  };

  const addParticipantResponse = (
    eventId: string,
    name: string,
    comment: string,
    responses: Record<string, Availability>
  ): void => {
    const newResponse: ParticipantResponse = {
      id: uuidv4(),
      name,
      comment,
      responses,
      createdAt: new Date().toISOString(),
    };

    // Get the event to check for organizer email
    const event = sharedEvent?.id === eventId ? sharedEvent : events.find(e => e.id === eventId);

    // Update shared event if it matches
    if (sharedEvent && sharedEvent.id === eventId) {
      const updatedEvent = {
        ...sharedEvent,
        participants: [...sharedEvent.participants, newResponse],
      };
      setSharedEvent(updatedEvent);

      // Send email notification if organizer email exists
      if (updatedEvent.organizerEmail) {
        sendEmailNotification(updatedEvent.organizerEmail, updatedEvent.title, name);
      }
    } else if (event?.organizerEmail) {
      // Send email notification for local events
      sendEmailNotification(event.organizerEmail, event.title, name);
    }

    // Update local events
    setEvents(prev =>
      prev.map(event =>
        event.id === eventId
          ? { ...event, participants: [...event.participants, newResponse] }
          : event
      )
    );
  };

  const updateParticipantResponse = (
    eventId: string,
    responseId: string,
    name: string,
    comment: string,
    responses: Record<string, Availability>
  ): void => {
    // Update shared event if it matches
    if (sharedEvent && sharedEvent.id === eventId) {
      const updatedEvent = {
        ...sharedEvent,
        participants: sharedEvent.participants.map(p =>
          p.id === responseId ? { ...p, name, comment, responses } : p
        ),
      };
      setSharedEvent(updatedEvent);
    }

    // Update local events
    setEvents(prev =>
      prev.map(event =>
        event.id === eventId
          ? {
              ...event,
              participants: event.participants.map(p =>
                p.id === responseId
                  ? { ...p, name, comment, responses }
                  : p
              ),
            }
          : event
      )
    );
  };

  const deleteParticipantResponse = (eventId: string, responseId: string): void => {
    // Update shared event if it matches
    if (sharedEvent && sharedEvent.id === eventId) {
      const updatedEvent = {
        ...sharedEvent,
        participants: sharedEvent.participants.filter(p => p.id !== responseId),
      };
      setSharedEvent(updatedEvent);
    }

    // Update local events
    setEvents(prev =>
      prev.map(event =>
        event.id === eventId
          ? {
              ...event,
              participants: event.participants.filter(p => p.id !== responseId),
            }
          : event
      )
    );
  };

  return (
    <AppContext.Provider
      value={{
        events,
        currentEventId,
        currentView,
        editingResponseId,
        setCurrentEventId,
        setCurrentView,
        setEditingResponseId,
        createEvent,
        getEvent,
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
