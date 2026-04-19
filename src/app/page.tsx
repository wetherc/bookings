"use client";

import { useState } from "react";
import { CreateEventForm } from "./components/CreateEventForm";

export default function Home() {
  const [activeTab, setActiveTab] = useState("create");

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
            <button
              role="tab"
              aria-selected={activeTab === "create"}
              onClick={() => setActiveTab("create")}
            >
              Create new event
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "rsvp"}
              onClick={() => setActiveTab("rsvp")}
            >
              RSVP / Edit
            </button>
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
            {activeTab === "create" && <CreateEventForm />}
            {activeTab === "rsvp" && (
              <div>
                <h2>RSVP / Edit</h2>
                {/* Content for RSVP tab will go here */}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
