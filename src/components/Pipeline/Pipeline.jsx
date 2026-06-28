import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import "./Pipeline.css";
import {
  getDeals, getDealStats, createDeal, updateDeal, deleteDeal,
} from "../../api";
import {
  UilPlus, UilTimes, UilEdit, UilTrashAlt, UilDollarSign,
  UilCalendarAlt, UilUserCircle,
} from "@iconscout/react-unicons";

const STAGES = [
  { key: "LEAD",        label: "Lead",        color: "#6366f1", bg: "#ede9fe" },
  { key: "QUALIFIED",   label: "Qualified",   color: "#f59e0b", bg: "#fef3c7" },
  { key: "PROPOSAL",   label: "Proposal",    color: "#3b82f6", bg: "#dbeafe" },
  { key: "NEGOTIATION",label: "Negotiation", color: "#f97316", bg: "#ffedd5" },
  { key: "WON",         label: "Won",         color: "#16a34a", bg: "#dcfce7" },
  { key: "LOST",        label: "Lost",        color: "#dc2626", bg: "#fee2e2" },
];

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;
const fmtMoney = (v) => v != null ? `$${Number(v).toLocaleString()}` : null;

const initForm = { title: "", value: "", currency: "USD", stage: "LEAD", probability: "", expectedCloseDate: "", notes: "" };

// ── Deal Form Modal ───────────────────────────────────────────────
const DealForm = ({ deal, defaultStage, onClose, onSave }) => {
  const [form, setForm] = useState(deal ? {
    title: deal.title, value: deal.value ?? "", currency: deal.currency || "USD",
    stage: deal.stage, probability: deal.probability ?? "",
    expectedCloseDate: deal.expectedCloseDate ? deal.expectedCloseDate.split("T")[0] : "",
    notes: deal.notes || "",
  } : { ...initForm, stage: defaultStage || "LEAD" });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError("Title is required."); return; }
    setSaving(true); setError("");
    try {
      const body = {
        ...form,
        value: form.value !== "" ? parseFloat(form.value) : undefined,
        probability: form.probability !== "" ? parseInt(form.probability) : undefined,
        expectedCloseDate: form.expectedCloseDate || undefined,
      };
      const result = deal ? await updateDeal(deal.id, body) : await createDeal(body);
      onSave(result, !!deal);
      onClose();
    } catch (e) { setError(e.message || "Failed to save."); }
    finally { setSaving(false); }
  };

  return (
    <div className="df-overlay" onClick={onClose}>
      <div className="df-modal" onClick={(e) => e.stopPropagation()}>
        <div className="df-header">
          <h3>{deal ? "Edit Deal" : "New Deal"}</h3>
          <button className="df-close" onClick={onClose}><UilTimes size={18} /></button>
        </div>
        <div className="df-body">
          {error && <p className="df-error">{error}</p>}
          <div className="df-group">
            <label>Deal Title *</label>
            <input value={form.title} onChange={set("title")} placeholder="Enterprise License - Acme Corp" />
          </div>
          <div className="df-row">
            <div className="df-group">
              <label>Value</label>
              <input type="number" min="0" value={form.value} onChange={set("value")} placeholder="0" />
            </div>
            <div className="df-group">
              <label>Currency</label>
              <select value={form.currency} onChange={set("currency")}>
                {["USD","EUR","GBP","CAD","AUD"].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="df-row">
            <div className="df-group">
              <label>Stage</label>
              <select value={form.stage} onChange={set("stage")}>
                {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div className="df-group">
              <label>Probability (%)</label>
              <input type="number" min="0" max="100" value={form.probability} onChange={set("probability")} placeholder="50" />
            </div>
          </div>
          <div className="df-group">
            <label>Expected Close Date</label>
            <input type="date" value={form.expectedCloseDate} onChange={set("expectedCloseDate")} />
          </div>
          <div className="df-group">
            <label>Notes</label>
            <textarea value={form.notes} onChange={set("notes")} rows={3} placeholder="Deal notes…" />
          </div>
        </div>
        <div className="df-footer">
          <button className="df-cancel" onClick={onClose}>Cancel</button>
          <button className="df-save" onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving…" : deal ? "Save Changes" : "Create Deal"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Deal Card ─────────────────────────────────────────────────────
const DealCard = ({ deal, index, onEdit, onDelete, onClick }) => {
  const stage = STAGES.find((s) => s.key === deal.stage) || STAGES[0];

  const handleEdit = (e) => { e.stopPropagation(); onEdit(deal); };
  const handleDel  = (e) => {
    e.stopPropagation();
    if (window.confirm(`Delete "${deal.title}"?`)) onDelete(deal.id);
  };

  return (
    <Draggable draggableId={deal.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`deal-card ${snapshot.isDragging ? "dragging" : ""}`}
          onClick={() => onClick(deal)}
        >
          <div className="dc-header">
            <span className="dc-title">{deal.title}</span>
            <div className="dc-card-actions">
              <button className="dc-act" onClick={handleEdit} title="Edit"><UilEdit size={13} /></button>
              <button className="dc-act dc-act--del" onClick={handleDel} title="Delete"><UilTrashAlt size={13} /></button>
            </div>
          </div>
          {deal.value != null && (
            <div className="dc-value"><UilDollarSign size={13} />{fmtMoney(deal.value)} {deal.currency}</div>
          )}
          <div className="dc-meta">
            {deal.contact && (
              <span className="dc-contact"><UilUserCircle size={12} />{deal.contact.firstName} {deal.contact.lastName}</span>
            )}
            {deal.expectedCloseDate && (
              <span className="dc-date"><UilCalendarAlt size={12} />{fmt(deal.expectedCloseDate)}</span>
            )}
          </div>
          {deal.probability != null && (
            <div className="dc-prob-bar">
              <div className="dc-prob-fill" style={{ width: `${deal.probability}%`, background: stage.color }} />
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
};

// ── Kanban Column ─────────────────────────────────────────────────
const KanbanColumn = ({ stage, deals, onAddDeal, onEdit, onDelete, onCardClick }) => {
  const total = deals.reduce((s, d) => s + (d.value || 0), 0);

  return (
    <div className="kb-col">
      <div className="kb-col-header" style={{ borderTopColor: stage.color }}>
        <div className="kb-col-title">
          <span className="kb-col-dot" style={{ background: stage.color }} />
          <span>{stage.label}</span>
          <span className="kb-col-count">{deals.length}</span>
        </div>
        {total > 0 && <span className="kb-col-total">{fmtMoney(total)}</span>}
      </div>

      <Droppable droppableId={stage.key}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`kb-col-body ${snapshot.isDraggingOver ? "drag-over" : ""}`}
          >
            {deals.map((d, i) => (
              <DealCard
                key={d.id}
                deal={d}
                index={i}
                onEdit={onEdit}
                onDelete={onDelete}
                onClick={onCardClick}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      <button className="kb-add-btn" onClick={() => onAddDeal(stage.key)}>
        <UilPlus size={14} /> Add Deal
      </button>
    </div>
  );
};

// ── Deal Detail Side Panel ────────────────────────────────────────
const DealDetail = ({ deal, onClose, onEdit, onDelete }) => {
  const stage = STAGES.find((s) => s.key === deal.stage) || STAGES[0];

  const handleDelete = () => {
    if (window.confirm(`Delete "${deal.title}"?`)) { onDelete(deal.id); onClose(); }
  };

  return (
    <div className="dd-panel">
      <div className="dd-panel-header">
        <h3>{deal.title}</h3>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="cd-btn cd-btn--edit" onClick={() => onEdit(deal)} title="Edit"><UilEdit size={14} /></button>
          <button className="cd-btn cd-btn--del" onClick={handleDelete} title="Delete"><UilTrashAlt size={14} /></button>
          <button className="cd-btn" onClick={onClose} title="Close"><UilTimes size={14} /></button>
        </div>
      </div>
      <div className="dd-stage">
        <span style={{ background: stage.bg, color: stage.color }}>{stage.label}</span>
      </div>
      <div className="dd-section">
        {deal.value != null && <div className="dd-row"><span>Value</span><strong>{fmtMoney(deal.value)} {deal.currency}</strong></div>}
        {deal.probability != null && <div className="dd-row"><span>Probability</span><strong>{deal.probability}%</strong></div>}
        {deal.expectedCloseDate && <div className="dd-row"><span>Close Date</span><strong>{fmt(deal.expectedCloseDate)}</strong></div>}
        <div className="dd-row"><span>Created</span><strong>{fmt(deal.createdAt)}</strong></div>
      </div>
      {deal.contact && (
        <div className="dd-section">
          <h4>Contact</h4>
          <div className="dd-contact">
            <div className="dd-c-avatar">{deal.contact.firstName[0]}{deal.contact.lastName[0]}</div>
            <div>
              <div className="dd-c-name">{deal.contact.firstName} {deal.contact.lastName}</div>
              {deal.contact.company && <div className="dd-c-co">{deal.contact.company}</div>}
            </div>
          </div>
        </div>
      )}
      {deal.notes && (
        <div className="dd-section">
          <h4>Notes</h4>
          <p className="dd-notes">{deal.notes}</p>
        </div>
      )}
    </div>
  );
};

// ── Main Pipeline Page ────────────────────────────────────────────
const Pipeline = ({ addToast }) => {
  const [deals, setDeals]         = useState([]);
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editDeal, setEditDeal]   = useState(null);
  const [defStage, setDefStage]   = useState("LEAD");
  const [selectedDeal, setSelectedDeal] = useState(null);

  useEffect(() => {
    Promise.all([getDeals(), getDealStats()])
      .then(([d, s]) => { setDeals(d); setStats(s); })
      .catch(() => addToast?.("Failed to load pipeline", "error"))
      .finally(() => setLoading(false));
  }, []);

  const dealsByStage = STAGES.reduce((acc, s) => {
    acc[s.key] = deals.filter((d) => d.stage === s.key);
    return acc;
  }, {});

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStage = destination.droppableId;
    const deal = deals.find((d) => d.id === draggableId);
    if (!deal || deal.stage === newStage) return;

    // Optimistic update
    setDeals((prev) => prev.map((d) => d.id === draggableId ? { ...d, stage: newStage } : d));
    if (selectedDeal?.id === draggableId) setSelectedDeal((p) => ({ ...p, stage: newStage }));

    try {
      await updateDeal(draggableId, { stage: newStage });
    } catch (e) {
      // Revert
      setDeals((prev) => prev.map((d) => d.id === draggableId ? { ...d, stage: deal.stage } : d));
      addToast?.("Failed to move deal", "error");
    }
  };

  const handleSave = (result, isEdit) => {
    if (isEdit) {
      setDeals((prev) => prev.map((d) => d.id === result.id ? result : d));
      if (selectedDeal?.id === result.id) setSelectedDeal(result);
    } else {
      setDeals((prev) => [result, ...prev]);
    }
    addToast?.(isEdit ? "Deal updated" : "Deal created", "success");
  };

  const handleDelete = async (id) => {
    try {
      await deleteDeal(id);
      setDeals((prev) => prev.filter((d) => d.id !== id));
      if (selectedDeal?.id === id) setSelectedDeal(null);
      addToast?.("Deal deleted", "info");
    } catch (e) { addToast?.(e.message || "Failed to delete deal", "error"); }
  };

  const openAdd = (stage = "LEAD") => { setDefStage(stage); setEditDeal(null); setShowForm(true); };
  const openEdit = (deal) => { setEditDeal(deal); setShowForm(true); };

  if (loading) return <div className="pipeline-loading">Loading pipeline…</div>;

  return (
    <div className="pipeline-page">
      {/* Header */}
      <div className="pipeline-header">
        <div>
          <h1>Pipeline</h1>
          <span className="pipeline-sub">{deals.length} deals</span>
        </div>
        <button className="pipeline-add-btn" onClick={() => openAdd("LEAD")}><UilPlus size={16} /> Add Deal</button>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="pipeline-stats">
          <div className="pstat">
            <span className="pstat-label">Total Pipeline</span>
            <span className="pstat-value">{fmtMoney(stats.totalPipeline) || "$0"}</span>
          </div>
          <div className="pstat">
            <span className="pstat-label">Deals This Month</span>
            <span className="pstat-value">{stats.dealsThisMonth}</span>
          </div>
          <div className="pstat">
            <span className="pstat-label">Win Rate</span>
            <span className="pstat-value">{stats.winRate != null ? `${stats.winRate}%` : "—"}</span>
          </div>
          <div className="pstat">
            <span className="pstat-label">Avg Deal Value</span>
            <span className="pstat-value">{fmtMoney(stats.avgDealValue) || "—"}</span>
          </div>
        </div>
      )}

      {/* Board + optional detail panel */}
      <div className="pipeline-body">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="kb-board">
            {STAGES.map((stage) => (
              <KanbanColumn
                key={stage.key}
                stage={stage}
                deals={dealsByStage[stage.key] || []}
                onAddDeal={openAdd}
                onEdit={openEdit}
                onDelete={handleDelete}
                onCardClick={setSelectedDeal}
              />
            ))}
          </div>
        </DragDropContext>

        {selectedDeal && (
          <DealDetail
            deal={selectedDeal}
            onClose={() => setSelectedDeal(null)}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        )}
      </div>

      {showForm && (
        <DealForm
          deal={editDeal}
          defaultStage={defStage}
          onClose={() => setShowForm(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default Pipeline;
