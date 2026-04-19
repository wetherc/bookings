"use client";

import { useState, useEffect } from "react";
import { CreateEventForm } from "./components/CreateEventForm";
import { EventAdminView } from "./components/EventAdminView";

const TABS_STORAGE_KEY = 'bookings_open_tabs';

interface Tab {
  id: string; // "create", "rsvp", or eventId
  title: string;
  type: 'create' | 'rsvp' | 'admin';
  token?: string; // Only for admin tabs
}

const defaultTabs: Tab[] = [
  { id: 'create', title: 'Create new event', type: 'create' },
  { id: 'rsvp', title: 'RSVP / Edit', type: 'rsvp' },
];

export default function Home() {
  const [tabs, setTabs] = useState<Tab[]>(defaultTabs);
  const [activeTabId, setActiveTabId] = useState<string>('create');
  const [isMounted, setIsMounted] = useState(false); // To prevent SSR hydration issues with localStorage

  useEffect(() => {
    setIsMounted(true);
    try {
      const storedTabs = localStorage.getItem(TABS_STORAGE_KEY);
      if (storedTabs) {
        setTabs(JSON.parse(storedTabs));
      }
    } catch (error) {
      console.error("Failed to parse tabs from localStorage", error);
      setTabs(defaultTabs);
    }
  }, []);

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

    // Avoid adding a duplicate tab
    if (!tabs.find(tab => tab.id === newTab.id)) {
      setTabs([...tabs, newTab]);
    }
    setActiveTabId(newTab.id);
  };

  const handleCloseTab = (tabIdToClose: string) => {
    // Prevent closing default tabs
    if (defaultTabs.some(tab => tab.id === tabIdToClose)) {
      return;
    }

    const tabIndex = tabs.findIndex(tab => tab.id === tabIdToClose);
    const newTabs = tabs.filter(tab => tab.id !== tabIdToClose);

    // If the closed tab was active, switch to a new tab
    if (activeTabId === tabIdToClose) {
      const newActiveTab = newTabs[tabIndex - 1] || newTabs[0];
      if (newActiveTab) {
        setActiveTabId(newActiveTab.id);
      }
    }
    setTabs(newTabs);
  };

  const activeTab = tabs.find(tab => tab.id === activeTabId) || tabs[0];

  const truncate = (str: string, len: number) => {
    return str.length > len ? str.substring(0, len) + "..." : str;
  }

  return (
    <main
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        padding: "2rem",
        boxSizing: "border-box",
      }}
    >
      <div className="window" style={{ width: "75%", height: "85%", display: 'flex', flexDirection: 'column' }}>
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
                {tab.type === 'admin' && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent tab selection when closing
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
              <div>
                <h2>RSVP / Edit</h2>
                {/* Content for RSVP tab will go here */}
              </div>
            )}
            {activeTab?.type === 'admin' && activeTab.token && (
              <EventAdminView eventId={activeTab.id} token={activeTab.token} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
