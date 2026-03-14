import React, { useState } from "react";
import "./Inbox.css";
import { UilPlus, UilTimes } from "@iconscout/react-unicons";
import { getCustomers, createTicket, aiDetectPriority } from "../../api";

const statusColors = {
  OPEN:    { bg: "#dcfce7", color: "#16a34a" },
  PENDING: { bg: "#fef3c7", color: "#d97706" },
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
      // AI auto-detect priority, fallback to selected
      let priority = form.priority;
      try {
        priority = await aiDetectPriority({ subject: form.subject, description: form.description });
      } catch (e) {
        // silently fallback
      }

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
          <button className="modal-close" onClick={onClose}><UilTimes size="20" /></button>
        </div>
        <div className="modal-body">
          {error && <div className="modal-error">{error}</div>}
          <div className="form-group">
            <label>Customer *</label>
            {loading ? (
              <select disabled><option>Loading customers...</option></select>
            ) : (
              <select name="customerId" value={form.customerId} onChange={handleChange}>
                <option value="">Select a customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} {c.email ? `(${c.email})` : ""}</option>
                ))}
              </select>
            )}
          </div>
          <div className="form-group">
            <label>Subject *</label>
            <input
              name="subject"
              placeholder="What's the issue about?"
              value={form.subject}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Description *</label>
            <textarea
              name="description"
              placeholder="Describe the issue in detail..."
              value={form.description}
              onChange={handleChange}
              rows={4}
            />
          </div>
          <div className="form-group">
            <label>Priority <span className="label-hint">(AI will auto-detect from description)</span></label>
            <div className="priority-options">
              {["LOW", "MEDIUM", "HIGH"].map((p) => (
                <button
                  key={p}
                  className={`priority-option ${form.priority === p ? "selected" : ""}`}
                  style={{
                    borderColor: form.priority === p ? priorityDot[p] : "#e5e7eb",
                    background: form.priority === p ? priorityDot[p] + "18" : "#fff",
                    color: form.priority === p ? priorityDot[p] : "#6b7280",
                  }}
                  onClick={() => setForm({ ...form, priority: p })}
                >
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: priorityDot[p], display: "inline-block", marginRight: 6
                  }} />
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="modal-cancel" onClick={onClose}>Cancel</button>
          <button className="modal-save" onClick={handleSubmit} disabled={saving}>
            {saving ? "Analyzing & Creating..." : "Create Ticket"}
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

  return (
    <div className="Inbox">
      {showModal && (
        <NewTicketModal
          onClose={() => setShowModal(false)}
          onSave={handleTicketCreated}
        />
      )}

      <div className="inbox-header">
        <h2>Inbox</h2>
        <div className="inbox-header-right">
          <span className="inbox-count">{tickets.length}</span>
          <button className="inbox-new-btn" onClick={() => setShowModal(true)}>
            <UilPlus size="16" />
          </button>
        </div>
      </div>

      <div className="inbox-filters">
        {["ALL", "OPEN", "PENDING", "CLOSED"].map((f) => (
          <button
            key={f}
            className={`filter-tab ${filter === f ? "active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="inbox-search">
        <span className="inbox-search-icon">🔍</span>
        <input
          type="text"
          placeholder="Search by name or subject..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="inbox-search-clear" onClick={() => setSearch("")}>×</button>
        )}
      </div>

      <div className="ticketsContainer">
        {tickets.length === 0 ? (
          <div className="inbox-empty">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="inbox-empty">No tickets found.</div>
        ) : (
          filtered.map((ticket) => {
            const status = statusColors[ticket.status] || statusColors.OPEN;
            const dot = priorityDot[ticket.priority] || priorityDot.MEDIUM;
            const isActive = activeTicket?.id === ticket.id;

            return (
              <div
                key={ticket.id}
                className={`ticketRow ${isActive ? "active" : ""}`}
                onClick={() => setActiveTicket(ticket)}
              >
                <div className="ticket-avatar">
                  {ticket.customer?.name?.charAt(0) || "?"}
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
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      backgroundColor: status.bg,
                      color: status.color,
                      border: `1px solid ${status.color}44`,
                      fontSize: "0.58rem",
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: "999px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      whiteSpace: "nowrap",
                      lineHeight: 1,
                      flexShrink: 0,
                    }}>
                      {ticket.status}
                    </span>
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        minWidth: "6px",
                        borderRadius: "50%",
                        backgroundColor: dot,
                        flexShrink: 0,
                      }}
                      title={ticket.priority}
                    />
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