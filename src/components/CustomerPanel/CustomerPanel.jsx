import React, { useEffect, useState } from "react";
import "./CustomerPanel.css";
import { getTickets, getCustomerNotes, createCustomerNote, deleteCustomerNote, updateCustomer } from "../../api";
import { UilTimes, UilEnvelope, UilPhone, UilBuilding, UilTicket, UilNotes, UilTrashAlt, UilPlus } from "@iconscout/react-unicons";

const TAG_COLORS = {
  vip:        { bg: "#fef3c7", color: "#d97706" },
  "at-risk":  { bg: "#fee2e2", color: "#dc2626" },
  prospect:   { bg: "#ede9fe", color: "#7c3aed" },
  churned:    { bg: "#fecaca", color: "#b91c1c" },
  enterprise: { bg: "#dbeafe", color: "#1d4ed8" },
  lead:       { bg: "#f0fdf4", color: "#15803d" },
};

const tagStyle = (t) => TAG_COLORS[t.toLowerCase()] || { bg: "#eff6ff", color: "#3b82f6" };

const statusColors = {
  OPEN:    { bg: "#dcfce7", color: "#16a34a" },
  PENDING: { bg: "#fef3c7", color: "#d97706" },
  CLOSED:  { bg: "#f3f4f6", color: "#6b7280" },
};

const fmt = (d) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const CustomerPanel = ({ customer, onClose, onUpdate }) => {
  const [tickets, setTickets]       = useState([]);
  const [notes, setNotes]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState("overview");
  const [noteText, setNoteText]     = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [tagInput, setTagInput]     = useState("");
  const [tags, setTags]             = useState([]);

  useEffect(() => {
    if (!customer) return;
    setTags(
      customer.tags
        ? customer.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : []
    );
    setTab("overview");
    setNoteText("");
    setLoading(true);
    Promise.all([
      getTickets().then((all) => all.filter((t) => t.customerId === customer.id)),
      getCustomerNotes(customer.id),
    ])
      .then(([t, n]) => { setTickets(t); setNotes(n); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [customer?.id]);

  if (!customer) return null;

  const open   = tickets.filter((t) => t.status === "OPEN").length;
  const closed = tickets.filter((t) => t.status === "CLOSED").length;

  const handleAddTag = async () => {
    const newTag = tagInput.trim();
    if (!newTag || tags.map((t) => t.toLowerCase()).includes(newTag.toLowerCase())) {
      setTagInput(""); return;
    }
    const newTags = [...tags, newTag];
    setTags(newTags);
    setTagInput("");
    try {
      const updated = await updateCustomer(customer.id, { tags: newTags.join(",") });
      onUpdate?.(updated);
    } catch (e) { console.error(e); }
  };

  const handleRemoveTag = async (tag) => {
    const newTags = tags.filter((t) => t !== tag);
    setTags(newTags);
    try {
      const updated = await updateCustomer(customer.id, { tags: newTags.join(",") });
      onUpdate?.(updated);
    } catch (e) { console.error(e); }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      const note = await createCustomerNote(customer.id, noteText.trim());
      setNotes([note, ...notes]);
      setNoteText("");
    } catch (e) { console.error(e); }
    finally { setSavingNote(false); }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await deleteCustomerNote(customer.id, noteId);
      setNotes(notes.filter((n) => n.id !== noteId));
    } catch (e) { console.error(e); }
  };

  const timeline = [
    ...tickets.map((t) => ({ type: "ticket", date: new Date(t.createdAt), data: t })),
    ...notes.map((n)   => ({ type: "note",   date: new Date(n.createdAt), data: n })),
  ].sort((a, b) => b.date - a.date);

  return (
    <div className="panel-overlay" onClick={onClose}>
      <div className="customer-panel" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="panel-header">
          <h2>Customer Profile</h2>
          <button className="panel-close" onClick={onClose}><UilTimes size="20" /></button>
        </div>

        {/* Profile */}
        <div className="panel-profile">
          <div className="panel-avatar">{customer.name.charAt(0)}</div>
          <div className="panel-identity">
            <h3>{customer.name}</h3>
            {customer.company && (
              <span className="panel-company"><UilBuilding size={13} /> {customer.company}</span>
            )}
          </div>
          <span className="panel-status" style={{
            background: customer.status === "ACTIVE" ? "#dcfce7" : "#fee2e2",
            color:      customer.status === "ACTIVE" ? "#16a34a" : "#dc2626",
          }}>{customer.status}</span>
        </div>

        {/* Tabs */}
        <div className="panel-tabs">
          {[
            { key: "overview", label: "Overview" },
            { key: "notes",    label: `Notes${notes.length ? ` (${notes.length})` : ""}` },
            { key: "timeline", label: "Timeline" },
          ].map(({ key, label }) => (
            <button key={key} className={`panel-tab ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <>
            <div className="panel-stats">
              <div className="panel-stat"><strong>{tickets.length}</strong><span>Total</span></div>
              <div className="panel-stat"><strong style={{ color: "#16a34a" }}>{open}</strong><span>Open</span></div>
              <div className="panel-stat"><strong style={{ color: "#6b7280" }}>{closed}</strong><span>Closed</span></div>
            </div>

            <div className="panel-dates">
              <div className="panel-date-row">
                <span className="panel-date-label">First contact</span>
                <span className="panel-date-value">{customer.createdAt ? fmt(customer.createdAt) : "—"}</span>
              </div>
              <div className="panel-date-row">
                <span className="panel-date-label">Last activity</span>
                <span className="panel-date-value">{customer.lastActivity ? fmt(customer.lastActivity) : "—"}</span>
              </div>
            </div>

            <div className="panel-section">
              <h4>Contact</h4>
              <div className="panel-contact">
                {customer.email && <div className="panel-contact-row"><UilEnvelope size={15} /><span>{customer.email}</span></div>}
                {customer.phone && <div className="panel-contact-row"><UilPhone size={15} /><span>{customer.phone}</span></div>}
                {!customer.email && !customer.phone && <p className="panel-empty">No contact info.</p>}
              </div>
            </div>

            <div className="panel-section">
              <h4>Tags</h4>
              <div className="panel-tags">
                {tags.map((t) => (
                  <span key={t} className="tag tag--removable" style={tagStyle(t)}>
                    {t}
                    <button className="tag-remove" onClick={() => handleRemoveTag(t)}>×</button>
                  </span>
                ))}
              </div>
              <div className="tag-input-row">
                <input
                  className="tag-input"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                  placeholder="Add tag (VIP, prospect, at-risk…)"
                />
                <button className="tag-add-btn" onClick={handleAddTag}><UilPlus size={14} /></button>
              </div>
            </div>
          </>
        )}

        {/* ── NOTES ── */}
        {tab === "notes" && (
          <div className="panel-section panel-notes">
            <div className="note-compose">
              <textarea
                className="note-textarea"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) handleAddNote(); }}
                placeholder="Write an internal note… (⌘+Enter to save)"
                rows={3}
              />
              <button className="note-save-btn" onClick={handleAddNote} disabled={savingNote || !noteText.trim()}>
                {savingNote ? "Saving…" : "Add Note"}
              </button>
            </div>

            {loading ? (
              <p className="panel-empty">Loading…</p>
            ) : notes.length === 0 ? (
              <p className="panel-empty">No notes yet. Add one above.</p>
            ) : (
              <div className="notes-list">
                {notes.map((n) => (
                  <div key={n.id} className="note-item">
                    <p className="note-content">{n.content}</p>
                    <div className="note-footer">
                      <span className="note-date">{fmt(n.createdAt)}</span>
                      <button className="note-delete-btn" onClick={() => handleDeleteNote(n.id)}>
                        <UilTrashAlt size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TIMELINE ── */}
        {tab === "timeline" && (
          <div className="panel-section panel-timeline">
            {loading ? (
              <p className="panel-empty">Loading…</p>
            ) : timeline.length === 0 ? (
              <p className="panel-empty">No activity yet.</p>
            ) : (
              <div className="timeline-list">
                {timeline.map((item, i) => {
                  const s = statusColors[item.data.status] || statusColors.CLOSED;
                  return (
                    <div key={i} className={`timeline-item timeline-item--${item.type}`}>
                      <div className="timeline-dot" />
                      <div className="timeline-body">
                        <div className="timeline-label">
                          {item.type === "ticket"
                            ? <><UilTicket size={12} /> Ticket</>
                            : <><UilNotes size={12} /> Note</>}
                          {item.type === "ticket" && (
                            <span className="tl-badge" style={{ background: s.bg, color: s.color }}>
                              {item.data.status}
                            </span>
                          )}
                        </div>
                        <div className="timeline-text">
                          {item.type === "ticket" ? item.data.subject : item.data.content}
                        </div>
                        <div className="timeline-date">{fmt(item.data.createdAt)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default CustomerPanel;
