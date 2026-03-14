import React from "react";
import Cards from "../Cards/Cards";
import Inbox from "../Inbox/Inbox";
import TicketDetails from "../TicketDetails/TicketDetails";
import Customers from "../Customers/Customers";
import Analytics from "../Analytics/Analytics";
import Tasks from "../Tasks/Tasks";
import Settings from "../Settings/Settings";
import "./MainDash.css";



const MainDash = ({
  activeView,
  setActiveView,
  setActiveTicket,
  activeTicket,
  tickets,
  onTicketUpdate,
  addToast
}) => {
  return (
    <div className="MainDash">
      {activeView === "Dashboard" && (
  <div className="dashboard-view">
    <div className="dashboard-header">
      <h1>Dashboard</h1>
      <span className="dashboard-date">
        {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
      </span>
    </div>
    <Cards />
    <div className="recent-tickets">
      <h2>Recent Tickets</h2>
      <div className="recent-list">
        {tickets.slice(0, 5).map((t) => (
          <div key={t.id} className="recent-row" onClick={() => { setActiveTicket(t); setActiveView("Inbox"); }}>
            <div className="recent-avatar">{t.customer?.name?.charAt(0) || "?"}</div>
            <div className="recent-info">
              <span className="recent-customer">{t.customer?.name || "Unknown"}</span>
              <span className="recent-subject">{t.subject}</span>
            </div>
            <span className="recent-status" style={{
              background: t.status === "OPEN" ? "#dcfce7" : t.status === "PENDING" ? "#fef3c7" : "#f3f4f6",
              color: t.status === "OPEN" ? "#16a34a" : t.status === "PENDING" ? "#d97706" : "#6b7280"
            }}>{t.status}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
)}

        {activeView === "Inbox" && (
      <div className="inboxContainer">
        <Inbox
          setActiveView={setActiveView}
          setActiveTicket={setActiveTicket}
          activeTicket={activeTicket}
          tickets={tickets}
          onTicketCreated={(ticket) => {
            onTicketUpdate(ticket);
            setActiveTicket(ticket);
          }}
        />
        <div className="detailsWrapper">
          {activeTicket ? (
            <TicketDetails
              key={activeTicket.id}
              ticket={activeTicket}
              onTicketUpdate={onTicketUpdate}
              addToast={addToast}
            />
          ) : (
            <div className="empty-state">
              Select a ticket to join the conversation
            </div>
          )}
        </div>
      </div>
    )}

      {activeView === "Customers" && (
      <div className="customers-view-container">
        <Customers addToast={addToast} />
      </div>
    )}
    {activeView === "Analytics" && (
      <div className="analytics-view-container">
        <Analytics />
      </div>
    )}
    {activeView === "Tasks" && (
      <div className="tasks-view-container">
        <Tasks addToast={addToast} />
      </div>
    )}
    {activeView === "Settings" && (
    <div className="settings-view-container">
      <Settings addToast={addToast} />
        </div>
      )}
    </div>
    
  );
};

export default MainDash;