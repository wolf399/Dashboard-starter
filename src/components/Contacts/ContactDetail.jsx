import React, { useState, useEffect, useMemo } from "react";
import "./ContactDetail.css";
import {
  getContact, getContactTimeline, getContactCalls, logContactCall,
  getContactNotesList, addContactNote, deleteContactNote,
  getTasks, createTask, updateTask, getUsers, createDeal, convertContact,
} from "../../api";
import { ContactForm, STATUS_CFG, SOURCE_CFG, fmt } from "./Contacts";
import {
  UilEdit, UilNotes, UilEnvelope, UilPhone, UilClipboardAlt, UilBriefcase,
  UilUserCheck, UilBuilding, UilTicket, UilCheck, UilPlus, UilSearch, UilTrashAlt,
} from "@iconscout/react-unicons";

const STAGES = [
  { key: "LEAD",        label: "Lead",        color: "#6366f1", bg: "#ede9fe" },
  { key: "QUALIFIED",   label: "Qualified",   color: "#f59e0b", bg: "#fef3c7" },
  { key: "PROPOSAL",    label: "Proposal",    color: "#3b82f6", bg: "#dbeafe" },
  { key: "NEGOTIATION", label: "Negotiation", color: "#f97316", bg: "#ffedd5" },
  { key: "WON",         label: "Won",         color: "#16a34a", bg: "#dcfce7" },
  { key: "LOST",        label: "Lost",        color: "#dc2626", bg: "#fee2e2" },
];

const TYPE_ICON = { note: UilNotes, call: UilPhone, deal: UilBriefcase, task: UilClipboardAlt, ticket: UilTicket, email: UilEnvelope };
const TYPE_COLOR = { note: "#6366f1", call: "#16a34a", deal: "#f59e0b", task: "#3b82f6", ticket: "#a855f7", email: "#0891b2" };

const dt = (d) => d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
const money = (v) => v != null ? `$${Number(v).toLocaleString()}` : "—";

// ── Timeline item row ──────────────────────────────────────────
const TimelineRow = ({ item }) => {
  const Icon = TYPE_ICON[item.type] || UilNotes;
  const color = TYPE_COLOR[item.type] || "#6b7280";
  return (
    <div className="tl-row">
      <div className="tl-icon" style={{ background: color + "1a", color }}><Icon size={15} /></div>
      <div className="tl-body">
        <div className="tl-title">{item.title}</div>
        {item.description && <p className="tl-desc">{item.description}</p>}
        <div className="tl-meta">
          {item.agentName && <span>{item.agentName}</span>}
          <span>{dt(item.createdAt)}</span>
        </div>
      </div>
    </div>
  );
};

// ── Overview tab ────────────────────────────────────────────────
const OverviewTab = ({ contact, tickets, timeline }) => {
  const deals = contact.deals || [];
  const openTickets = tickets.filter((t) => t.status === "OPEN");
  const totalDealValue = deals.reduce((s, d) => s + (d.value || 0), 0);

  return (
    <div className="ov-tab">
      <div className="ov-stats">
        <div className="ov-stat"><span className="ov-stat-value">{tickets.length}</span><span className="ov-stat-label">Total Tickets</span></div>
        <div className="ov-stat"><span className="ov-stat-value">{openTickets.length}</span><span className="ov-stat-label">Open Tickets</span></div>
        <div className="ov-stat"><span className="ov-stat-value">{deals.length}</span><span className="ov-stat-label">Deals</span></div>
        <div className="ov-stat"><span className="ov-stat-value">{money(totalDealValue)}</span><span className="ov-stat-label">Total Deal Value</span></div>
      </div>

      <div className="ov-section">
        <h4>Recent Activity</h4>
        {timeline.length === 0 ? <p className="cd2-empty">No activity yet.</p> : (
          <div className="tl-list">
            {timeline.slice(0, 10).map((item) => <TimelineRow key={item.id} item={item} />)}
          </div>
        )}
      </div>

      <div className="ov-section">
        <h4>Linked Deals</h4>
        {deals.length === 0 ? <p className="cd2-empty">No deals linked.</p> : (
          <div className="ov-deal-cards">
            {deals.map((d) => {
              const stage = STAGES.find((s) => s.key === d.stage) || STAGES[0];
              return (
                <div key={d.id} className="ov-deal-card">
                  <span className="ov-deal-title">{d.title}</span>
                  <span className="ov-deal-stage" style={{ background: stage.bg, color: stage.color }}>{stage.label}</span>
                  <span className="ov-deal-value">{money(d.value)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="ov-section">
        <h4>Open Tickets</h4>
        {openTickets.length === 0 ? <p className="cd2-empty">No open tickets.</p> : (
          <div className="ov-ticket-list">
            {openTickets.map((t) => (
              <div key={t.id} className="ov-ticket-row">
                <span className="ov-ticket-subject">{t.subject}</span>
                <span className="ov-ticket-date">{dt(t.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Activities tab ──────────────────────────────────────────────
const ACTIVITY_FILTERS = [
  { key: "ALL",  label: "All" },
  { key: "note", label: "Notes" },
  { key: "email",label: "Emails" },
  { key: "call", label: "Calls" },
  { key: "task", label: "Tasks" },
  { key: "deal", label: "Deals" },
];

const ActivitiesTab = ({ timeline, loading }) => {
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const filtered = timeline.filter((item) => {
    if (filter !== "ALL" && item.type !== filter) return false;
    if (search && !`${item.title} ${item.description}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="act-tab">
      <div className="act-toolbar">
        <div className="act-search">
          <UilSearch size={14} />
          <input placeholder="Search activities…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="act-filters">
          {ACTIVITY_FILTERS.map((f) => (
            <button key={f.key} className={`act-filter ${filter === f.key ? "active" : ""}`} onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="cd2-empty">Loading activity…</p>
      ) : filtered.length === 0 ? (
        <p className="cd2-empty">No activity found.</p>
      ) : (
        <div className="tl-list">
          {filtered.map((item) => <TimelineRow key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
};

// ── Emails tab ───────────────────────────────────────────────────
const EmailsTab = ({ tickets, loading }) => {
  const [expanded, setExpanded] = useState(null);

  if (loading) return <p className="cd2-empty">Loading emails…</p>;
  if (tickets.length === 0) {
    return <p className="cd2-empty">No emails found for this contact yet. Emails appear once this contact has a matching customer record with ticket messages.</p>;
  }

  return (
    <div className="em-tab">
      {tickets.map((tk) => {
        const isOpen = expanded === tk.id;
        const lastMessage = tk.messages[tk.messages.length - 1];
        return (
          <div key={tk.id} className="em-thread">
            <div className="em-thread-header" onClick={() => setExpanded(isOpen ? null : tk.id)}>
              <div className="em-thread-info">
                <span className="em-subject">{tk.subject}</span>
                <span className="em-preview">{lastMessage?.body?.replace(/<[^>]+>/g, "").slice(0, 100) || "No messages yet"}</span>
              </div>
              <div className="em-thread-meta">
                <span>{tk.assignedAgent?.name || "Unassigned"}</span>
                <span>{dt(tk.createdAt)}</span>
              </div>
            </div>
            {isOpen && (
              <div className="em-thread-body">
                {tk.messages.map((m) => (
                  <div key={m.id} className={`em-message em-message--${m.senderType?.toLowerCase()}`}>
                    <div className="em-message-meta">
                      <span>{m.senderType === "AGENT" ? "Agent" : "Customer"}</span>
                      <span>{dt(m.createdAt)}</span>
                    </div>
                    <div className="em-message-body" dangerouslySetInnerHTML={{ __html: m.body }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── Calls tab ────────────────────────────────────────────────────
const OUTCOMES = ["Answered", "Voicemail", "No Answer"];

const CallsTab = ({ contactId, calls, onLogged, addToast }) => {
  const [form, setForm] = useState({ outcome: "Answered", duration: "", notes: "", date: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const call = await logContactCall(contactId, {
        outcome: form.outcome,
        duration: form.duration ? Number(form.duration) : undefined,
        notes: form.notes || undefined,
        createdAt: form.date ? new Date(form.date).toISOString() : undefined,
      });
      onLogged(call);
      setForm({ outcome: "Answered", duration: "", notes: "", date: new Date().toISOString().slice(0, 10) });
      addToast?.("Call logged", "success");
    } catch (e) { addToast?.(e.message || "Failed to log call", "error"); }
    finally { setSaving(false); }
  };

  return (
    <div className="calls-tab">
      <div className="calls-form">
        <h4>Log a Call</h4>
        <div className="calls-form-row">
          <div className="calls-form-group">
            <label>Outcome</label>
            <select value={form.outcome} onChange={set("outcome")}>
              {OUTCOMES.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="calls-form-group">
            <label>Duration (min)</label>
            <input type="number" min="0" value={form.duration} onChange={set("duration")} placeholder="5" />
          </div>
          <div className="calls-form-group">
            <label>Date</label>
            <input type="date" value={form.date} onChange={set("date")} />
          </div>
        </div>
        <div className="calls-form-group">
          <label>Notes</label>
          <textarea rows={2} value={form.notes} onChange={set("notes")} placeholder="What was discussed…" />
        </div>
        <button className="cd2-primary-btn" onClick={handleSubmit} disabled={saving}>
          {saving ? "Saving…" : "Log Call"}
        </button>
      </div>

      <div className="calls-list">
        {calls.length === 0 ? <p className="cd2-empty">No calls logged yet.</p> : calls.map((c) => (
          <div key={c.id} className="calls-row">
            <div className="calls-row-icon"><UilPhone size={15} /></div>
            <div className="calls-row-body">
              <div className="calls-row-top">
                <span className="calls-outcome">{c.outcome}</span>
                {c.duration != null && <span className="calls-duration">{c.duration} min</span>}
              </div>
              {c.notes && <p className="calls-notes">{c.notes}</p>}
              <div className="calls-row-meta">
                {c.agent?.name && <span>{c.agent.name}</span>}
                <span>{dt(c.createdAt)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Notes tab ────────────────────────────────────────────────────
const NotesTab = ({ contactId, notes, onAdded, onDeleted, addToast }) => {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const note = await addContactNote(contactId, content.trim());
      onAdded(note);
      setContent("");
    } catch (e) { addToast?.(e.message || "Failed to add note", "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (noteId) => {
    if (!window.confirm("Delete this note?")) return;
    try {
      await deleteContactNote(contactId, noteId);
      onDeleted(noteId);
    } catch (e) { addToast?.(e.message || "Failed to delete note", "error"); }
  };

  return (
    <div className="notes-tab">
      <div className="notes-form">
        <textarea rows={3} placeholder="Write a note…" value={content} onChange={(e) => setContent(e.target.value)} />
        <button className="cd2-primary-btn" onClick={handleSave} disabled={saving || !content.trim()}>
          {saving ? "Saving…" : "Save Note"}
        </button>
      </div>

      <div className="notes-list">
        {notes.length === 0 ? <p className="cd2-empty">No notes yet.</p> : notes.map((n) => (
          <div key={n.id} className="notes-row">
            <p className="notes-content">{n.content}</p>
            <div className="notes-meta">
              <span>{n.agent?.name || "Unknown"}</span>
              <span>{dt(n.createdAt)}</span>
              <button className="notes-delete" onClick={() => handleDelete(n.id)}><UilTrashAlt size={13} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Tasks tab ────────────────────────────────────────────────────
const PRIORITIES = ["LOW", "MEDIUM", "HIGH"];

const TasksTab = ({ contactId, tasks, users, currentUser, onCreated, onUpdated, addToast }) => {
  const [form, setForm] = useState({ title: "", dueDate: "", priority: "MEDIUM", assignedToId: "" });
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const task = await createTask({
        title: form.title.trim(),
        dueDate: form.dueDate || undefined,
        priority: form.priority,
        assignedToId: form.assignedToId || undefined,
        contactId,
        createdById: currentUser.id,
      });
      onCreated(task);
      setForm({ title: "", dueDate: "", priority: "MEDIUM", assignedToId: "" });
    } catch (e) { addToast?.(e.message || "Failed to create task", "error"); }
    finally { setSaving(false); }
  };

  const toggleComplete = async (task) => {
    try {
      const updated = await updateTask(task.id, { status: task.status === "DONE" ? "TODO" : "DONE" });
      onUpdated(updated);
    } catch (e) { addToast?.(e.message || "Failed to update task", "error"); }
  };

  return (
    <div className="tasks-tab">
      <div className="tasks-form">
        <input placeholder="New task title…" value={form.title} onChange={set("title")} />
        <div className="tasks-form-row">
          <input type="date" value={form.dueDate} onChange={set("dueDate")} />
          <select value={form.priority} onChange={set("priority")}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={form.assignedToId} onChange={set("assignedToId")}>
            <option value="">Unassigned</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <button className="cd2-primary-btn" onClick={handleCreate} disabled={saving || !form.title.trim()}>
            {saving ? "Adding…" : "Add Task"}
          </button>
        </div>
      </div>

      <div className="tasks-list">
        {tasks.length === 0 ? <p className="cd2-empty">No tasks linked to this contact.</p> : tasks.map((t) => (
          <div key={t.id} className={`tasks-row ${t.status === "DONE" ? "done" : ""}`}>
            <button className="tasks-check" onClick={() => toggleComplete(t)} title="Toggle complete">
              {t.status === "DONE" && <UilCheck size={14} />}
            </button>
            <div className="tasks-row-body">
              <span className="tasks-title">{t.title}</span>
              <div className="tasks-row-meta">
                <span className={`tasks-priority tasks-priority--${t.priority?.toLowerCase()}`}>{t.priority}</span>
                {t.dueDate && <span>Due {fmt(t.dueDate)}</span>}
                {t.assignedTo?.name && <span>{t.assignedTo.name}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Deals tab ────────────────────────────────────────────────────
const DealsTab = ({ contactId, deals, onCreated, addToast }) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", value: "", stage: "LEAD", probability: "", expectedCloseDate: "" });
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const deal = await createDeal({
        title: form.title.trim(),
        value: form.value ? Number(form.value) : undefined,
        stage: form.stage,
        probability: form.probability ? Number(form.probability) : undefined,
        expectedCloseDate: form.expectedCloseDate || undefined,
        contactId,
      });
      onCreated(deal);
      setForm({ title: "", value: "", stage: "LEAD", probability: "", expectedCloseDate: "" });
      setShowForm(false);
      addToast?.("Deal created", "success");
    } catch (e) { addToast?.(e.message || "Failed to create deal", "error"); }
    finally { setSaving(false); }
  };

  return (
    <div className="deals-tab">
      <div className="deals-tab-header">
        <h4>Deals ({deals.length})</h4>
        <button className="cd2-primary-btn cd2-primary-btn--sm" onClick={() => setShowForm((s) => !s)}>
          <UilPlus size={14} /> Add Deal
        </button>
      </div>

      {showForm && (
        <div className="deals-form">
          <input placeholder="Deal title" value={form.title} onChange={set("title")} />
          <div className="deals-form-row">
            <input type="number" min="0" placeholder="Value ($)" value={form.value} onChange={set("value")} />
            <select value={form.stage} onChange={set("stage")}>
              {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <input type="number" min="0" max="100" placeholder="Probability %" value={form.probability} onChange={set("probability")} />
            <input type="date" value={form.expectedCloseDate} onChange={set("expectedCloseDate")} />
          </div>
          <div className="deals-form-actions">
            <button className="cd2-secondary-btn" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="cd2-primary-btn" onClick={handleSubmit} disabled={saving || !form.title.trim()}>
              {saving ? "Saving…" : "Create Deal"}
            </button>
          </div>
        </div>
      )}

      {deals.length === 0 ? <p className="cd2-empty">No deals linked to this contact.</p> : (
        <div className="deals-list">
          {deals.map((d) => {
            const stage = STAGES.find((s) => s.key === d.stage) || STAGES[0];
            return (
              <div key={d.id} className="deals-card">
                <div className="deals-card-top">
                  <span className="deals-card-title">{d.title}</span>
                  <span className="deals-card-stage" style={{ background: stage.bg, color: stage.color }}>{stage.label}</span>
                </div>
                <div className="deals-card-meta">
                  <span>{money(d.value)}</span>
                  {d.expectedCloseDate && <span>Close {fmt(d.expectedCloseDate)}</span>}
                  {d.probability != null && <span>{d.probability}% probability</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Left sidebar (info card) ──────────────────────────────────────
const ContactSidebar = ({ contact, onEdit, onConvert, onAction }) => {
  const sc = STATUS_CFG[contact.status] || STATUS_CFG.LEAD;
  const src = contact.source ? SOURCE_CFG[contact.source] || SOURCE_CFG.Other : null;
  const initials = (contact.firstName[0] || "") + (contact.lastName[0] || "");

  return (
    <div className="cd2-sidebar">
      <button className="cd2-edit-btn" onClick={onEdit}><UilEdit size={14} /> Edit</button>

      <div className="cd2-avatar">{initials}</div>
      <h2 className="cd2-name">{contact.firstName} {contact.lastName}</h2>
      {(contact.jobTitle || contact.company) && (
        <p className="cd2-role">
          {contact.jobTitle}{contact.jobTitle && contact.company ? " · " : ""}{contact.company}
        </p>
      )}

      <div className="cd2-badges">
        <span className="cd2-badge" style={sc}>{contact.status}</span>
        {src && <span className="cd2-badge" style={src}>{contact.source}</span>}
      </div>

      {(contact.status === "LEAD" || contact.status === "QUALIFIED") && (
        <button className="cd2-convert-btn" onClick={onConvert}>
          <UilUserCheck size={14} /> Convert to Customer
        </button>
      )}

      <div className="cd2-actions">
        <button onClick={() => onAction("Notes")}><UilNotes size={16} /><span>Note</span></button>
        <button onClick={() => onAction("Emails")}><UilEnvelope size={16} /><span>Email</span></button>
        <button onClick={() => onAction("Calls")}><UilPhone size={16} /><span>Call</span></button>
        <button onClick={() => onAction("Tasks")}><UilClipboardAlt size={16} /><span>Task</span></button>
      </div>

      <div className="cd2-info-section">
        <h4>Contact Info</h4>
        {contact.email && <div className="cd2-info-row"><UilEnvelope size={13} /><span>{contact.email}</span></div>}
        {contact.phone && <div className="cd2-info-row"><UilPhone size={13} /><span>{contact.phone}</span></div>}
        {contact.company && <div className="cd2-info-row"><UilBuilding size={13} /><span>{contact.company}</span></div>}
      </div>

      <div className="cd2-info-section">
        <h4>Dates</h4>
        <div className="cd2-date-row"><span>Created</span><span>{fmt(contact.createdAt)}</span></div>
        <div className="cd2-date-row"><span>Last Activity</span><span>{fmt(contact.updatedAt)}</span></div>
      </div>

      {contact.tags && (
        <div className="cd2-info-section">
          <h4>Tags</h4>
          <div className="cd2-tags">
            {contact.tags.split(",").map((t) => t.trim()).filter(Boolean).map((t) => (
              <span key={t} className="cd2-tag">{t}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main Contact Detail Page ──────────────────────────────────────
const TABS = ["Overview", "Activities", "Emails", "Calls", "Notes", "Tasks", "Deals"];

const ContactDetail = ({ contactId, onBack, addToast }) => {
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Activities");
  const [showEditForm, setShowEditForm] = useState(false);

  const [timeline, setTimeline] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(true);

  const [calls, setCalls] = useState([]);
  const [notesList, setNotesList] = useState([]);
  const [tasksList, setTasksList] = useState([]);
  const [users, setUsers] = useState([]);

  const currentUser = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);

  const loadContact = async () => {
    try { setContact(await getContact(contactId)); }
    catch (e) { addToast?.("Failed to load contact", "error"); }
  };

  const loadTimeline = async () => {
    setTimelineLoading(true);
    try {
      const data = await getContactTimeline(contactId);
      setTimeline(data.timeline);
      setTickets(data.tickets);
    } catch (e) { addToast?.("Failed to load activity", "error"); }
    finally { setTimelineLoading(false); }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadContact(),
      loadTimeline(),
      getContactCalls(contactId).then(setCalls).catch(() => {}),
      getContactNotesList(contactId).then(setNotesList).catch(() => {}),
      getTasks({ contactId }).then(setTasksList).catch(() => {}),
      getUsers().then(setUsers).catch(() => {}),
    ]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  const handleConvert = async () => {
    if (!contact) return;
    if (!window.confirm(`Convert ${contact.firstName} ${contact.lastName} to a Customer?`)) return;
    try {
      await convertContact(contact.id);
      setContact((c) => ({ ...c, status: "CONVERTED" }));
      addToast?.("Contact converted to Customer!", "success");
    } catch (e) { addToast?.(e.message || "Conversion failed", "error"); }
  };

  const handleAction = (tab) => setActiveTab(tab);

  if (loading || !contact) {
    return (
      <div className="cd2-page">
        <div className="cd2-loading">Loading contact…</div>
      </div>
    );
  }

  return (
    <div className="cd2-page">
      <div className="cd2-topbar">
        <button className="cd2-back-btn" onClick={onBack}>‹ Back to Contacts</button>
      </div>

      <div className="cd2-layout">
        <ContactSidebar
          contact={contact}
          onEdit={() => setShowEditForm(true)}
          onConvert={handleConvert}
          onAction={handleAction}
        />

        <div className="cd2-main">
          <div className="cd2-tabs">
            {TABS.map((tab) => (
              <button
                key={tab}
                className={`cd2-tab ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="cd2-tab-content">
            {activeTab === "Overview" && (
              <OverviewTab contact={contact} tickets={tickets} timeline={timeline} />
            )}
            {activeTab === "Activities" && (
              <ActivitiesTab timeline={timeline} loading={timelineLoading} />
            )}
            {activeTab === "Emails" && (
              <EmailsTab tickets={tickets} loading={timelineLoading} />
            )}
            {activeTab === "Calls" && (
              <CallsTab
                contactId={contactId}
                calls={calls}
                onLogged={(call) => { setCalls((prev) => [call, ...prev]); loadTimeline(); }}
                addToast={addToast}
              />
            )}
            {activeTab === "Notes" && (
              <NotesTab
                contactId={contactId}
                notes={notesList}
                onAdded={(note) => { setNotesList((prev) => [note, ...prev]); loadTimeline(); addToast?.("Note added", "success"); }}
                onDeleted={(noteId) => { setNotesList((prev) => prev.filter((n) => n.id !== noteId)); loadTimeline(); addToast?.("Note deleted", "info"); }}
                addToast={addToast}
              />
            )}
            {activeTab === "Tasks" && (
              <TasksTab
                contactId={contactId}
                tasks={tasksList}
                users={users}
                currentUser={currentUser}
                onCreated={(task) => { setTasksList((prev) => [task, ...prev]); loadTimeline(); addToast?.("Task created", "success"); }}
                onUpdated={(task) => setTasksList((prev) => prev.map((t) => (t.id === task.id ? task : t)))}
                addToast={addToast}
              />
            )}
            {activeTab === "Deals" && (
              <DealsTab
                contactId={contactId}
                deals={contact.deals || []}
                onCreated={(deal) => { setContact((c) => ({ ...c, deals: [deal, ...(c.deals || [])] })); loadTimeline(); }}
                addToast={addToast}
              />
            )}
          </div>
        </div>
      </div>

      {showEditForm && (
        <ContactForm
          contact={contact}
          onClose={() => setShowEditForm(false)}
          onSave={(result) => { setContact((c) => ({ ...c, ...result })); addToast?.("Contact updated", "success"); }}
          addToast={addToast}
        />
      )}
    </div>
  );
};

export default ContactDetail;
