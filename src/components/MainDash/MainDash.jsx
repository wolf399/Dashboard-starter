import React, { useEffect, useState } from "react";
import Cards from "../Cards/Cards";
import Inbox from "../Inbox/Inbox";
import TicketDetails from "../TicketDetails/TicketDetails";
import Customers from "../Customers/Customers";
import Analytics from "../Analytics/Analytics";
import Tasks from "../Tasks/Tasks";
import Settings from "../Settings/Settings";
import Contacts from "../Contacts/Contacts";
import ContactDetail from "../Contacts/ContactDetail";
import Pipeline from "../Pipeline/Pipeline";
import { getTasks, getDeals } from "../../api";
import "./MainDash.css";

const STALE_DEAL_DAYS = 5;

const MainDash = ({
  activeView,
  setActiveView,
  setActiveTicket,
  activeTicket,
  tickets,
  onTicketUpdate,
  addToast,
  contactDetailId,
  onOpenContact,
  onCloseContactDetail,
}) => {
  const [dashTasks, setDashTasks] = useState([]);
  const [dashDeals, setDashDeals] = useState([]);
  const [dashLoading, setDashLoading] = useState(true);

  useEffect(() => {
    if (activeView !== "Dashboard") return;
    Promise.all([getTasks(), getDeals()])
      .then(([t, d]) => {
        setDashTasks(t.tasks || t || []);
        setDashDeals(d.deals || d || []);
      })
      .catch(console.error)
      .finally(() => setDashLoading(false));
  }, [activeView]);

  const needsAttention = [...tickets]
    .filter((t) => t.status === "OPEN")
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .slice(0, 5);

  const today = new Date().toDateString();
  const resolvedToday = tickets.filter(
    (t) => t.status === "CLOSED" && t.updatedAt && new Date(t.updatedAt).toDateString() === today
  ).length;

  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const dueTasks = dashTasks
    .filter((task) => task.status !== "DONE" && task.dueDate && new Date(task.dueDate) <= endOfToday)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 5);

  const staleCutoff = new Date(Date.now() - STALE_DEAL_DAYS * 24 * 60 * 60 * 1000);
  const staleDeals = dashDeals
    .filter((d) => d.stage !== "WON" && d.stage !== "LOST" && d.lastActivityAt && new Date(d.lastActivityAt) < staleCutoff)
    .sort((a, b) => new Date(a.lastActivityAt) - new Date(b.lastActivityAt))
    .slice(0, 5);

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

          <div className="dashboard-stat-row">
            <div className="dashboard-stat-card">
              <span className="dashboard-stat-label">Needs Attention</span>
              <strong className="dashboard-stat-value" style={{ color: "#dc2626" }}>{needsAttention.length}</strong>
            </div>
            <div className="dashboard-stat-card">
              <span className="dashboard-stat-label">Due / Overdue Tasks</span>
              <strong className="dashboard-stat-value" style={{ color: "#d97706" }}>{dueTasks.length}</strong>
            </div>
            <div className="dashboard-stat-card">
              <span className="dashboard-stat-label">Stale Deals</span>
              <strong className="dashboard-stat-value" style={{ color: "#6b7280" }}>{staleDeals.length}</strong>
            </div>
            <div className="dashboard-stat-card">
              <span className="dashboard-stat-label">Resolved Today</span>
              <strong className="dashboard-stat-value" style={{ color: "#16a34a" }}>{resolvedToday}</strong>
            </div>
          </div>

          <div className="dashboard-panels">
            <div className="dashboard-panel">
              <h2>Needs Your Attention</h2>
              {needsAttention.length === 0 ? (
                <div className="dashboard-empty">Nothing open right now — you're caught up.</div>
              ) : (
                <div className="recent-list">
                  {needsAttention.map((t) => (
                    <div key={t.id} className="recent-row" onClick={() => { setActiveTicket(t); setActiveView("Inbox"); }}>
                      <div className="recent-avatar">{t.customer?.name?.charAt(0) || "?"}</div>
                      <div className="recent-info">
                        <span className="recent-customer">{t.customer?.name || "Unknown"}</span>
                        <span className="recent-subject">{t.subject}</span>
                      </div>
                      <span className="recent-status" style={{ background: "#fee2e2", color: "#dc2626" }}>
                        {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="dashboard-panel">
              <h2>Today's & Overdue Tasks</h2>
              {dashLoading ? (
                <div className="dashboard-empty">Loading...</div>
              ) : dueTasks.length === 0 ? (
                <div className="dashboard-empty">No tasks due — nice.</div>
              ) : (
                <div className="recent-list">
                  {dueTasks.map((task) => {
                    const overdue = new Date(task.dueDate) < new Date(now.toDateString());
                    return (
                      <div key={task.id} className="recent-row" onClick={() => setActiveView("Tasks")}>
                        <div className="recent-info">
                          <span className="recent-customer">{task.title}</span>
                          <span className="recent-subject">{task.priority}</span>
                        </div>
                        <span className="recent-status" style={{
                          background: overdue ? "#fee2e2" : "#fef3c7",
                          color: overdue ? "#dc2626" : "#d97706",
                        }}>
                          {overdue ? "Overdue" : "Today"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="dashboard-panel">
              <h2>Stale Deals</h2>
              {dashLoading ? (
                <div className="dashboard-empty">Loading...</div>
              ) : staleDeals.length === 0 ? (
                <div className="dashboard-empty">No deals have gone quiet.</div>
              ) : (
                <div className="recent-list">
                  {staleDeals.map((deal) => (
                    <div key={deal.id} className="recent-row" onClick={() => setActiveView("Pipeline")}>
                      <div className="recent-info">
                        <span className="recent-customer">{deal.title}</span>
                        <span className="recent-subject">{deal.stage}</span>
                      </div>
                      <span className="recent-status" style={{ background: "#f3f4f6", color: "#6b7280" }}>
                        {deal.lastActivityAt ? new Date(deal.lastActivityAt).toLocaleDateString() : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
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
            onTicketCreated={(ticket) => { onTicketUpdate(ticket); setActiveTicket(ticket); }}
            onTicketsUpdated={(ids, newStatus) => { ids.forEach((id) => onTicketUpdate({ id, status: newStatus })); }}
          />
          <div className="detailsWrapper">
            {activeTicket ? (
              <TicketDetails key={activeTicket.id} ticket={activeTicket} onTicketUpdate={onTicketUpdate} addToast={addToast} />
            ) : (
              <div className="empty-state">Select a ticket to join the conversation</div>
            )}
          </div>
        </div>
      )}

      {activeView === "Customers" && (
        <div className="customers-view-container">
          <Customers addToast={addToast} />
        </div>
      )}

      {activeView === "Contacts" && (
        <div className="contacts-view-container">
          {contactDetailId ? (
            <ContactDetail
              key={contactDetailId}
              contactId={contactDetailId}
              onBack={onCloseContactDetail}
              addToast={addToast}
            />
          ) : (
            <Contacts addToast={addToast} onOpenContact={onOpenContact} />
          )}
        </div>
      )}

      {activeView === "Pipeline" && (
        <div className="pipeline-view-container">
          <Pipeline addToast={addToast} />
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