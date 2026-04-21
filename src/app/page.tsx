"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import { CreateEventForm } from "./components/CreateEventForm";
import { EventAdminView } from "./components/EventAdminView";
import { EventRsvpView } from "./components/EventRsvpView"; // Import the new component

const TABS_STORAGE_KEY = 'bookings_open_tabs';

interface Tab {
  id: string; // "create", "rsvp", or eventId
  title: string;
  type: 'create' | 'rsvp' | 'admin';
  token?: string; // Only for admin tabs
  respondentToken?: string; // Only for RSVP tabs
}

const defaultTabs: Tab[] = [
  { id: 'create', title: 'Create new event', type: 'create' },
];

function HomePage() {
  const [tabs, setTabs] = useState<Tab[]>(defaultTabs);
  const [activeTabId, setActiveTabId] = useState<string>('create');
  const [isMounted, setIsMounted] = useState(false); // To prevent SSR hydration issues with localStorage

  const searchParams = useSearchParams();
  const router = useRouter();

  // Effect to load tabs from localStorage and handle incoming links
  useEffect(() => {
    setIsMounted(true);
    let initialTabs = [...defaultTabs];
    try {
      const storedTabs = localStorage.getItem(TABS_STORAGE_KEY);
      if (storedTabs) {
        initialTabs = JSON.parse(storedTabs);
      }
    } catch (error) {
      console.error("Failed to parse tabs from localStorage", error);
      // Keep default tabs if parsing fails
    }

    const eventId = searchParams.get('eventId');
    const adminToken = searchParams.get('adminToken');
    const respondentToken = searchParams.get('respondentToken'); // Get respondentToken
    
    if (eventId && adminToken) {
      const existingTab = initialTabs.find(tab => tab.id === eventId);
      if (!existingTab) {
        const newTab: Tab = {
          id: eventId,
          title: `Admin: ${eventId.substring(0, 8)}...`, // Temporary title
          type: 'admin',
          token: adminToken,
        };
        initialTabs.push(newTab);
      }
      setActiveTabId(eventId);
      router.replace('/'); // Clean up URL
    } else if (eventId) { // Handle RSVP links (with or without respondentToken)
        const existingTab = initialTabs.find(tab => tab.id === eventId);
        if (!existingTab) {
            const newTab: Tab = {
                id: eventId,
                title: `RSVP: ${eventId.substring(0, 8)}...`, // Temporary title
                type: 'rsvp',
                respondentToken: respondentToken || undefined, // Store respondentToken
            };
            initialTabs.push(newTab);
        } else if (respondentToken && existingTab.type === 'rsvp' && !existingTab.respondentToken) {
            // Update existing RSVP tab with respondentToken if it's new
            existingTab.respondentToken = respondentToken;
        }
        setActiveTabId(eventId);
        router.replace('/'); // Clean up URL
    }
    
    setTabs(initialTabs);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Effect to save tabs to localStorage whenever they change
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabs));
    }
  }, [tabs, isMounted]);

  const handleEventCreated = (event: { eventId: string; adminToken: string; eventName: string }) => {
    const newTab: Tab = {
      id: event.eventId,
      title: event.eventName,
      type: 'admin',
      token: event.adminToken,
    };
    
    if (!tabs.find(tab => tab.id === newTab.id)) {
      setTabs([...tabs, newTab]);
    }
    setActiveTabId(newTab.id);
  };

  const handleCloseTab = (tabIdToClose: string) => {
    if (defaultTabs.some(tab => tab.id === tabIdToClose)) return;

    const tabIndex = tabs.findIndex(tab => tab.id === tabIdToClose);
    const newTabs = tabs.filter(tab => tab.id !== tabIdToClose);
    
    if (activeTabId === tabIdToClose) {
      const newActiveTab = newTabs[tabIndex - 1] || newTabs[0];
      if (newActiveTab) setActiveTabId(newActiveTab.id);
    }
    setTabs(newTabs);
  };

  const handleTitleLoaded = useCallback((eventId: string, newTitle: string, type: 'admin' | 'rsvp') => {
    setTabs(prevTabs => prevTabs.map(tab => 
      tab.id === eventId ? { ...tab, title: newTitle, type: type } : tab
    ));
  }, []);

  const activeTab = tabs.find(tab => tab.id === activeTabId) || tabs[0];
  
  const onTitleLoadedForAdmin = useCallback((newTitle: string) => {
    if (activeTab) {
      handleTitleLoaded(activeTab.id, newTitle, 'admin');
    }
  }, [activeTab?.id, handleTitleLoaded]);

  const onTitleLoadedForRsvp = useCallback((newTitle: string, type: 'admin' | 'rsvp') => {
    if (activeTab) {
      handleTitleLoaded(activeTab.id, newTitle, type);
    }
  }, [activeTab?.id, handleTitleLoaded]);

  const truncate = (str: string, len: number) => {
    return str.length > len ? str.substring(0, len) + "..." : str;
  }

  return (
    <main className="page-container">
      <div className="window main-window">
        <div className="title-bar">
          <div className="title-bar-text">Bookings</div>
          <div className="title-bar-controls">
            <button aria-label="Minimize"></button>
            <button aria-label="Maximize"></button>
            <button aria-label="Close"></button>
          </div>
        </div>
        <div
          className="window-body"
          style={{ display: "flex", flexDirection: "column", flexGrow: 1, minHeight: 0 }}
        >
          <menu role="tablist">
            {tabs.map(tab => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTabId === tab.id}
                onClick={() => setActiveTabId(tab.id)}
              >
                {truncate(tab.title, 20)}
                {(tab.type === 'admin' || tab.type === 'rsvp') && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseTab(tab.id);
                    }}
                    style={{ marginLeft: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    x
                  </span>
                )}
              </button>
            ))}
          </menu>
          <div
            className="sunken-panel"
            role="tabpanel"
            style={{
              flexGrow: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              padding: "1rem",
              overflowY: "auto",
            }}
          >
            {activeTab?.type === 'create' && <CreateEventForm onEventCreated={handleEventCreated} />}
            {activeTab?.type === 'rsvp' && (
              <EventRsvpView 
                eventId={activeTab.id} 
                respondentToken={activeTab.respondentToken}
                onTitleLoaded={onTitleLoadedForRsvp}
                onRsvpCreated={(eventId, token) => {
                  setTabs(prevTabs => prevTabs.map(tab =>
                    tab.id === eventId ? { ...tab, respondentToken: token } : tab
                  ));
                }}
              />
            )}
            {activeTab?.type === 'admin' && activeTab.token && (
              <EventAdminView 
                eventId={activeTab.id} 
                token={activeTab.token}
                onTitleLoaded={onTitleLoadedForAdmin}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomePage />
    </Suspense>
  );
}
