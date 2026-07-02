import React, { useState, useEffect, useCallback } from "react";
import "./Contacts.css";
import {
  getContacts, createContact, updateContact, deleteContact,
} from "../../api";
import {
  UilPlus, UilSearch, UilTimes, UilEdit, UilTrashAlt,
} from "@iconscout/react-unicons";

const STATUS_CFG = {
  LEAD:      { bg: "#dbeafe", color: "#1d4ed8" },
  QUALIFIED: { bg: "#dcfce7", color: "#16a34a" },
  CONVERTED: { bg: "#f3f4f6", color: "#6b7280" },
  LOST:      { bg: "#fee2e2", color: "#dc2626" },
};

const SOURCE_CFG = {
  LinkedIn:       { bg: "#dbeafe", color: "#1d4ed8" },
  Email:          { bg: "#ede9fe", color: "#7c3aed" },
  Referral:       { bg: "#dcfce7", color: "#16a34a" },
  Website:        { bg: "#fff7ed", color: "#ea580c" },
  "Cold Outreach":{ bg: "#fef3c7", color: "#d97706" },
  Other:          { bg: "#f3f4f6", color: "#6b7280" },
};

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

const STATUSES = ["ALL", "LEAD", "QUALIFIED", "CONVERTED", "LOST"];
const SOURCES  = ["LinkedIn", "Email", "Referral", "Website", "Cold Outreach", "Other"];

const initForm = { firstName: "", lastName: "", email: "", phone: "", company: "", jobTitle: "", source: "", status: "LEAD", notes: "", tags: "" };

// ── Contact Form Modal ────────────────────────────────────────────
const ContactForm = ({ contact, onClose, onSave, addToast }) => {
  const [form, setForm] = useState(contact
    ? { firstName: contact.firstName, lastName: contact.lastName, email: contact.email || "", phone: contact.phone || "", company: contact.company || "", jobTitle: contact.jobTitle || "", source: contact.source || "", status: contact.status, notes: contact.notes || "", tags: contact.tags || "" }
    : initForm
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) { setError("First and last name are required."); return; }
    setSaving(true); setError("");
    try {
      const result = contact
        ? await updateContact(contact.id, form)
        : await createContact(form);
      onSave(result, !!contact);
      onClose();
    } catch (e) { setError(e.message || "Failed to save."); }
    finally { setSaving(false); }
  };

  return (
    <div className="cf-overlay" onClick={onClose}>
      <div className="cf-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cf-header">
          <h3>{contact ? "Edit Contact" : "New Contact"}</h3>
          <button className="cf-close" onClick={onClose}><UilTimes size={18} /></button>
        </div>
        <div className="cf-body">
          {error && <p className="cf-error">{error}</p>}
          <div className="cf-row">
            <div className="cf-group">
              <label>First Name *</label>
              <input value={form.firstName} onChange={set("firstName")} placeholder="John" />
            </div>
            <div className="cf-group">
              <label>Last Name *</label>
              <input value={form.lastName} onChange={set("lastName")} placeholder="Smith" />
            </div>
          </div>
          <div className="cf-row">
            <div className="cf-group">
              <label>Email</label>
              <input type="email" value={form.email} onChange={set("email")} placeholder="john@company.com" />
            </div>
            <div className="cf-group">
              <label>Phone</label>
              <input value={form.phone} onChange={set("phone")} placeholder="+1 555 000 0000" />
            </div>
          </div>
          <div className="cf-row">
            <div className="cf-group">
              <label>Company</label>
              <input value={form.company} onChange={set("company")} placeholder="Acme Corp" />
            </div>
            <div className="cf-group">
              <label>Job Title</label>
              <input value={form.jobTitle} onChange={set("jobTitle")} placeholder="CEO" />
            </div>
          </div>
          <div className="cf-row">
            <div className="cf-group">
              <label>Source</label>
              <select value={form.source} onChange={set("source")}>
                <option value="">— Select —</option>
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="cf-group">
              <label>Status</label>
              <select value={form.status} onChange={set("status")}>
                {["LEAD", "QUALIFIED", "LOST"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="cf-group">
            <label>Tags (comma separated)</label>
            <input value={form.tags} onChange={set("tags")} placeholder="hot-lead, q2" />
          </div>
          <div className="cf-group">
            <label>Notes</label>
            <textarea value={form.notes} onChange={set("notes")} rows={3} placeholder="Internal notes…" />
          </div>
        </div>
        <div className="cf-footer">
          <button className="cf-cancel" onClick={onClose}>Cancel</button>
          <button className="cf-save" onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving…" : contact ? "Save Changes" : "Create Contact"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Contacts Page ───────────────────────────────────────────
const Contacts = ({ addToast, onOpenContact }) => {
  const [contacts, setContacts]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState("ALL");
  const [showForm, setShowForm]     = useState(false);
  const [editContact, setEditContact] = useState(null);

  const fetch = useCallback(async () => {
    try {
      const data = await getContacts({ search, status: statusFilter });
      setContacts(data);
    } catch (e) { addToast?.("Failed to load contacts", "error"); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSave = (result, isEdit) => {
    if (isEdit) {
      setContacts((prev) => prev.map((c) => (c.id === result.id ? result : c)));
    } else {
      setContacts((prev) => [result, ...prev]);
    }
    addToast?.(isEdit ? "Contact updated" : "Contact created", "success");
  };

  const openEdit = (c) => { setEditContact(c); setShowForm(true); };
  const openAdd  = () => { setEditContact(null); setShowForm(true); };

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete ${c.firstName} ${c.lastName}?`)) return;
    try {
      await deleteContact(c.id);
      setContacts((prev) => prev.filter((x) => x.id !== c.id));
      addToast?.("Contact deleted", "info");
    } catch (e) { addToast?.(e.message || "Failed to delete", "error"); }
  };

  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = s === "ALL" ? contacts.length : contacts.filter((c) => c.status === s).length;
    return acc;
  }, {});

  return (
    <div className="contacts-page">
      {/* Header */}
      <div className="contacts-header">
        <div>
          <h1>Contacts</h1>
          <span className="contacts-count">{contacts.length} contacts</span>
        </div>
        <button className="contacts-add-btn" onClick={openAdd}><UilPlus size={16} /> Add Contact</button>
      </div>

      <div className="contacts-layout">
        {/* ── List ── */}
        <div className="contacts-list-pane contacts-list-pane--full">
          {/* Search */}
          <div className="contacts-search">
            <UilSearch size={15} />
            <input
              placeholder="Search name, email, company…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && <button className="search-clear" onClick={() => setSearch("")}><UilTimes size={13} /></button>}
          </div>

          {/* Status filter */}
          <div className="contacts-status-tabs">
            {STATUSES.map((s) => (
              <button
                key={s}
                className={`status-tab ${statusFilter === s ? "active" : ""}`}
                onClick={() => setStatus(s)}
              >
                {s} <span className="tab-count">{counts[s]}</span>
              </button>
            ))}
          </div>

          {/* List */}
          <div className="contacts-list">
            {loading ? (
              <p className="list-empty">Loading…</p>
            ) : contacts.length === 0 ? (
              <p className="list-empty">No contacts found.</p>
            ) : (
              contacts.map((c) => {
                const sc = STATUS_CFG[c.status] || STATUS_CFG.LEAD;
                const src = c.source ? SOURCE_CFG[c.source] : null;
                return (
                  <div
                    key={c.id}
                    className="contact-row"
                    onClick={() => onOpenContact(c.id)}
                  >
                    <div className="cr-avatar">{c.firstName[0]}{c.lastName[0]}</div>
                    <div className="cr-info">
                      <div className="cr-name">{c.firstName} {c.lastName}</div>
                      <div className="cr-sub">
                        {c.company && <span>{c.company}</span>}
                        {c.jobTitle && <span className="cr-dot">·</span>}
                        {c.jobTitle && <span>{c.jobTitle}</span>}
                      </div>
                    </div>
                    <div className="cr-meta">
                      {src && <span className="cr-badge" style={src}>{c.source}</span>}
                      <span className="cr-badge" style={sc}>{c.status}</span>
                      <span className="cr-date">{fmt(c.createdAt)}</span>
                    </div>
                    <div className="cr-row-actions">
                      <button
                        className="cr-row-btn"
                        title="Edit"
                        onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                      ><UilEdit size={14} /></button>
                      <button
                        className="cr-row-btn cr-row-btn--danger"
                        title="Delete"
                        onClick={(e) => { e.stopPropagation(); handleDelete(c); }}
                      ><UilTrashAlt size={14} /></button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {showForm && (
        <ContactForm
          contact={editContact}
          onClose={() => setShowForm(false)}
          onSave={handleSave}
          addToast={addToast}
        />
      )}
    </div>
  );
};

export default Contacts;
export { ContactForm, STATUS_CFG, SOURCE_CFG, fmt };
