import React, { useEffect, useState } from "react";
import Inbox from "../Inbox/Inbox";
import TicketDetails from "../TicketDetails/TicketDetails";
import Customers from "../Customers/Customers";
import Analytics from "../Analytics/Analytics";
import Tasks from "../Tasks/Tasks";
import Settings from "../Settings/Settings";
import Contacts from "../Contacts/Contacts";
import ContactDetail from "../Contacts/ContactDetail";
import Pipeline from "../Pipeline/Pipeline";
import { getTasks, getDeals, getContacts, getDealStats, updateTicket } from "../../api";
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
  const [dashContacts, setDashContacts] = useState([]);
  const [dashDealStats, setDashDealStats] = useState(null);
  const [dashLoading, setDashLoading] = useState(true);

  useEffect(() => {
    if (activeView !== "Dashboard") return;
    Promise.all([getTasks(), getDeals(), getContacts(), getDealStats()])
      .then(([t, d, c, stats]) => {
        setDashTasks(t.tasks || t || []);
        setDashDeals(d.deals || d || []);
        setDashContacts(c.contacts || c || []);
        setDashDealStats(stats);
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

  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const newContacts = dashContacts
    .filter((c) => c.createdAt && new Date(c.createdAt) > last24h)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const closedThisWeek = tickets.filter(
    (t) => t.status === "CLOSED" && t.updatedAt && t.createdAt && new Date(t.updatedAt) >= weekAgo
  );
  const avgResolutionHours = closedThisWeek.length > 0
    ? Math.round(
        closedThisWeek.reduce((sum, t) => sum + (new Date(t.updatedAt) - new Date(t.createdAt)), 0) /
          closedThisWeek.length /
          (1000 * 60 * 60)
      )
    : null;

  const handleResolve = async (e, ticket) => {
    e.stopPropagation();
    try {
      const updated = await updateTicket(ticket.id, { status: "CLOSED" });
      onTicketUpdate(updated?.id ? updated : { ...ticket, status: "CLOSED" });
      if (addToast) addToast("Ticket marked resolved");
    } catch (err) {
      console.error(err);
      if (addToast) addToast("Failed to resolve ticket");
    }
  };

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

          <div className="dashboard-quick-actions">
            <button className="dashboard-quick-btn" onClick={() => setActiveView("Tasks")}>+ New Task</button>
            <button className="dashboard-quick-btn" onClick={() => setActiveView("Contacts")}>+ New Contact</button>
            <button className="dashboard-quick-btn" onClick={() => setActiveView("Pipeline")}>+ New Deal</button>
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
            <div className="dashboard-stat-card">
              <span className="dashboard-stat-label">New Contacts (24h)</span>
              <strong className="dashboard-stat-value" style={{ color: "#2563eb" }}>{newContacts.length}</strong>
            </div>
            <div className="dashboard-stat-card">
              <span className="dashboard-stat-label">Avg Resolution Time</span>
              <strong className="dashboard-stat-value" style={{ color: "#111827" }}>
                {avgResolutionHours !== null ? `${avgResolutionHours}h` : "—"}
              </strong>
            </div>
            <div className="dashboard-stat-card">
              <span className="dashboard-stat-label">Pipeline Value</span>
              <strong className="dashboard-stat-value" style={{ color: "#111827" }}>
                {dashDealStats ? `$${Number(dashDealStats.totalPipeline || 0).toLocaleString()}` : "—"}
              </strong>
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
                      <button className="dashboard-row-action" onClick={(e) => handleResolve(e, t)}>Resolve</button>
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

            <div className="dashboard-panel">
              <h2>New Signups (24h)</h2>
              {dashLoading ? (
                <div className="dashboard-empty">Loading...</div>
              ) : newContacts.length === 0 ? (
                <div className="dashboard-empty">No new contacts in the last 24 hours.</div>
              ) : (
                <div className="recent-list">
                  {newContacts.map((c) => (
                    <div key={c.id} className="recent-row" onClick={() => setActiveView("Contacts")}>
                      <div className="recent-avatar">{c.firstName?.charAt(0) || "?"}</div>
                      <div className="recent-info">
                        <span className="recent-customer">{c.firstName} {c.lastName}</span>
                        <span className="recent-subject">{c.company || c.email || ""}</span>
                      </div>
                      <span className="recent-status" style={{ background: "#dbeafe", color: "#2563eb" }}>New</span>
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