import React, { useState, useEffect, useCallback } from "react";
import "./Contacts.css";
import {
  getContacts, createContact, updateContact, deleteContact, convertContact,
} from "../../api";
import {
  UilPlus, UilSearch, UilTimes, UilEnvelope, UilPhone, UilBuilding,
  UilEdit, UilTrashAlt, UilUserCheck, UilBriefcase,
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

// ── Contact Detail Panel ─────────────────────────────────────────
const ContactDetail = ({ contact, onEdit, onDelete, onConvert, addToast }) => {
  const sc = STATUS_CFG[contact.status] || STATUS_CFG.LEAD;
  const src = contact.source ? SOURCE_CFG[contact.source] || SOURCE_CFG.Other : null;
  const initials = (contact.firstName[0] || "") + (contact.lastName[0] || "");

  const handleDelete = async () => {
    if (!window.confirm(`Delete ${contact.firstName} ${contact.lastName}?`)) return;
    try { await onDelete(contact.id); addToast?.("Contact deleted", "info"); }
    catch (e) { addToast?.(e.message || "Failed to delete", "error"); }
  };

  const handleConvert = async () => {
    if (!window.confirm(`Convert ${contact.firstName} ${contact.lastName} to a Customer?`)) return;
    try {
      await onConvert(contact.id);
      addToast?.("Contact converted to Customer!", "success");
    } catch (e) { addToast?.(e.message || "Conversion failed", "error"); }
  };

  return (
    <div className="cd-panel">
      {/* Profile */}
      <div className="cd-profile">
        <div className="cd-avatar">{initials}</div>
        <div className="cd-identity">
          <h2>{contact.firstName} {contact.lastName}</h2>
          {(contact.jobTitle || contact.company) && (
            <p className="cd-sub">
              {contact.jobTitle}{contact.jobTitle && contact.company ? " · " : ""}{contact.company}
            </p>
          )}
          <div className="cd-badges">
            <span className="cd-badge" style={sc}>{contact.status}</span>
            {src && <span className="cd-badge" style={src}>{contact.source}</span>}
          </div>
        </div>
        <div className="cd-actions">
          <button className="cd-btn cd-btn--edit" onClick={() => onEdit(contact)} title="Edit"><UilEdit size={15} /></button>
          <button className="cd-btn cd-btn--del" onClick={handleDelete} title="Delete"><UilTrashAlt size={15} /></button>
        </div>
      </div>

      {/* Convert button */}
      {(contact.status === "LEAD" || contact.status === "QUALIFIED") && (
        <div className="cd-convert-bar">
          <button className="cd-convert-btn" onClick={handleConvert}>
            <UilUserCheck size={15} /> Convert to Customer
          </button>
        </div>
      )}

      {/* Contact info */}
      <div className="cd-section">
        <h4>Contact Info</h4>
        {contact.email && <div className="cd-row"><UilEnvelope size={14} /><span>{contact.email}</span></div>}
        {contact.phone && <div className="cd-row"><UilPhone    size={14} /><span>{contact.phone}</span></div>}
        {contact.company && <div className="cd-row"><UilBuilding size={14} /><span>{contact.company}</span></div>}
        {!contact.email && !contact.phone && !contact.company && <p className="cd-empty">No contact info.</p>}
      </div>

      {/* Dates */}
      <div className="cd-section cd-dates">
        <div className="cd-date-row"><span>Created</span><span>{fmt(contact.createdAt)}</span></div>
        <div className="cd-date-row"><span>Updated</span><span>{fmt(contact.updatedAt)}</span></div>
      </div>

      {/* Tags */}
      {contact.tags && (
        <div className="cd-section">
          <h4>Tags</h4>
          <div className="cd-tags">
            {contact.tags.split(",").map((t) => t.trim()).filter(Boolean).map((t) => (
              <span key={t} className="cd-tag">{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* Deals */}
      {contact.deals && contact.deals.length > 0 && (
        <div className="cd-section">
          <h4>Linked Deals ({contact.deals.length})</h4>
          <div className="cd-deals">
            {contact.deals.map((d) => (
              <div key={d.id} className="cd-deal">
                <UilBriefcase size={14} />
                <span className="cd-deal-title">{d.title}</span>
                {d.value != null && <span className="cd-deal-value">${d.value.toLocaleString()}</span>}
                <span className="cd-deal-stage">{d.stage}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {contact.notes && (
        <div className="cd-section">
          <h4>Notes</h4>
          <p className="cd-notes">{contact.notes}</p>
        </div>
      )}
    </div>
  );
};

// ── Main Contacts Page ───────────────────────────────────────────
const Contacts = ({ addToast }) => {
  const [contacts, setContacts]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(null);
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
      if (selected?.id === result.id) setSelected(result);
    } else {
      setContacts((prev) => [result, ...prev]);
      setSelected(result);
    }
    addToast?.(isEdit ? "Contact updated" : "Contact created", "success");
  };

  const handleDelete = async (id) => {
    await deleteContact(id);
    setContacts((prev) => prev.filter((c) => c.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const handleConvert = async (id) => {
    await convertContact(id);
    const updated = { ...selected, status: "CONVERTED" };
    setContacts((prev) => prev.map((c) => (c.id === id ? updated : c)));
    setSelected(updated);
  };

  const openEdit = (c) => { setEditContact(c); setShowForm(true); };
  const openAdd  = () => { setEditContact(null); setShowForm(true); };

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
        {/* ── Left pane ── */}
        <div className="contacts-list-pane">
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
                    className={`contact-row ${selected?.id === c.id ? "active" : ""}`}
                    onClick={() => setSelected(c)}
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
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right pane ── */}
        <div className="contacts-detail-pane">
          {selected ? (
            <ContactDetail
              key={selected.id}
              contact={selected}
              onEdit={openEdit}
              onDelete={handleDelete}
              onConvert={handleConvert}
              addToast={addToast}
            />
          ) : (
            <div className="contacts-empty-state">
              <UilUserCheck size={40} />
              <p>Select a contact to view details</p>
            </div>
          )}
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
