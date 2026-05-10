import React, { useState } from "react";
import "./Inbox.css";
import { UilPlus, UilTimes, UilSearch } from "@iconscout/react-unicons";
import { getCustomers, createTicket, aiDetectPriority } from "../../api";

const statusColors = {
  OPEN:    { bg: "#dbeafe", color: "#1d4ed8" },
  PENDING: { bg: "#fef3c7", color: "#b45309" },
  CLOSED:  { bg: "#f3f4f6", color: "#6b7280" },
};

const priorityDot = {
  HIGH:   "#dc2626",
  MEDIUM: "#d97706",
  LOW:    "#16a34a",
};

const NewTicketModal = ({ onClose, onSave }) => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    customerId: "",
    subject: "",
    description: "",
    priority: "MEDIUM",
  });

  React.useEffect(() => {
    getCustomers()
      .then(setCustomers)
      .catch(() => setError("Failed to load customers."))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    if (!form.customerId) { setError("Please select a customer."); return; }
    if (!form.subject.trim()) { setError("Subject is required."); return; }
    if (!form.description.trim()) { setError("Description is required."); return; }
    setSaving(true);
    try {
      let priority = form.priority;
      try {
        priority = await aiDetectPriority({ subject: form.subject, description: form.description });
      } catch (e) {}

      const ticket = await createTicket({
        customerId: form.customerId,
        subject: form.subject,
        description: form.description,
        priority,
        status: "OPEN",
      });

      const customer = customers.find((c) => c.id === form.customerId);
      const fullTicket = { ...ticket, customer };
      onSave(fullTicket);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create ticket.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Ticket</h2>
          <button className="modal-close" onClick={onClose}><UilTimes size="18" /></button>
        </div>
        <div className="modal-body">
          {error && <div className="modal-error">{error}</div>}
          <div className="form-group">
            <label>Customer</label>
            {loading ? (
              <select disabled><option>Loading...</option></select>
            ) : (
              <select name="customerId" value={form.customerId} onChange={handleChange}>
                <option value="">Select a customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.email ? ` — ${c.email}` : ""}</option>
                ))}
              </select>
            )}
          </div>
          <div className="form-group">
            <label>Subject</label>
            <input
              name="subject"
              placeholder="What is the issue about?"
              value={form.subject}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              placeholder="Describe the issue in detail"
              value={form.description}
              onChange={handleChange}
              rows={4}
            />
          </div>
          <div className="form-group">
            <label>Priority <span className="label-hint">AI will auto-detect from description</span></label>
            <div className="priority-options">
              {["LOW", "MEDIUM", "HIGH"].map((p) => (
                <button
                  key={p}
                  className={`priority-option ${form.priority === p ? "selected" : ""}`}
                  style={{
                    borderColor: form.priority === p ? priorityDot[p] : "#e5e7eb",
                    background: form.priority === p ? priorityDot[p] + "15" : "#fff",
                    color: form.priority === p ? priorityDot[p] : "#6b7280",
                  }}
                  onClick={() => setForm({ ...form, priority: p })}
                >
                  <span className="priority-dot" style={{ background: priorityDot[p] }} />
                  {p.charAt(0) + p.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="modal-cancel" onClick={onClose}>Cancel</button>
          <button className="modal-save" onClick={handleSubmit} disabled={saving}>
            {saving ? "Creating..." : "Create Ticket"}
          </button>
        </div>
      </div>
    </div>
  );
};

const Inbox = ({ setActiveTicket, activeTicket, tickets = [], onTicketCreated }) => {
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const filtered = tickets
    .filter((t) => filter === "ALL" || t.status === filter)
    .filter((t) => {
      const q = search.toLowerCase();
      return (
        t.customer?.name?.toLowerCase().includes(q) ||
        t.subject?.toLowerCase().includes(q)
      );
    });

  const handleTicketCreated = (ticket) => {
    if (onTicketCreated) onTicketCreated(ticket);
    setActiveTicket(ticket);
  };

  const countByStatus = (s) => tickets.filter((t) => t.status === s).length;

  return (
    <div className="Inbox">
      {showModal && (
        <NewTicketModal
          onClose={() => setShowModal(false)}
          onSave={handleTicketCreated}
        />
      )}

      <div className="inbox-header">
        <div className="inbox-header-left">
          <h2>Inbox</h2>
          <span className="inbox-count">{tickets.length}</span>
        </div>
        <button className="inbox-new-btn" onClick={() => setShowModal(true)} title="New ticket">
          <UilPlus size="15" />
        </button>
      </div>

      <div className="inbox-search">
        <UilSearch size="14" color="#9ca3af" />
        <input
          type="text"
          placeholder="Search tickets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="inbox-search-clear" onClick={() => setSearch("")}>
            <UilTimes size="13" />
          </button>
        )}
      </div>

      <div className="inbox-filters">
        {["ALL", "OPEN", "PENDING", "CLOSED"].map((f) => (
          <button
            key={f}
            className={`filter-tab ${filter === f ? "active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
            {f !== "ALL" && (
              <span className="filter-count">{countByStatus(f)}</span>
            )}
          </button>
        ))}
      </div>

      <div className="ticketsContainer">
        {tickets.length === 0 ? (
          <div className="inbox-empty">
            <div className="inbox-empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
                <path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4m8-4v4" />
              </svg>
            </div>
            <p>No tickets yet</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="inbox-empty"><p>No results found</p></div>
        ) : (
          filtered.map((ticket) => {
            const status = statusColors[ticket.status] || statusColors.OPEN;
            const dot = priorityDot[ticket.priority] || priorityDot.MEDIUM;
            const isActive = activeTicket?.id === ticket.id;
            const initials = ticket.customer?.name
              ? ticket.customer.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
              : "?";

            return (
              <div
                key={ticket.id}
                className={`ticketRow ${isActive ? "active" : ""}`}
                onClick={() => setActiveTicket(ticket)}
              >
                <div className="ticket-avatar">
                  {initials}
                </div>
                <div className="ticketMiddle">
                  <div className="ticket-top-row">
                    <span className="ticketCustomer">
                      {ticket.customer?.name || "Unknown"}
                    </span>
                    <span className="ticketTime">
                      {new Date(ticket.createdAt).toLocaleDateString("en-US", {
                        month: "short", day: "numeric"
                      })}
                    </span>
                  </div>
                  <span className="ticketSubject">{ticket.subject}</span>
                  <div className="ticket-bottom-row">
                    <span className="ticket-status-badge" style={{ background: status.bg, color: status.color }}>
                      {ticket.status.charAt(0) + ticket.status.slice(1).toLowerCase()}
                    </span>
                    <span className="ticket-priority-dot" style={{ background: dot }} title={ticket.priority} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Inbox;