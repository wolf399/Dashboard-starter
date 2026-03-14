import React, { useState, useEffect } from "react";
import "./Tasks.css";
import { getTasks, createTask, updateTask, deleteTask, getUsers } from "../../api";
import { UilPlus, UilTimes, UilCheck, UilTrash, UilTicket, UilCalender, UilUser } from "@iconscout/react-unicons";

const priorityColors = {
  HIGH:   { bg: "#fee2e2", color: "#dc2626" },
  MEDIUM: { bg: "#fef3c7", color: "#d97706" },
  LOW:    { bg: "#dcfce7", color: "#16a34a" },
};

const statusColumns = ["TODO", "IN_PROGRESS", "DONE"];
const statusLabels = { TODO: "To Do", IN_PROGRESS: "In Progress", DONE: "Done" };
const statusColors = {
  TODO:        { bg: "#f3f4f6", color: "#6b7280", border: "#e5e7eb" },
  IN_PROGRESS: { bg: "#eff6ff", color: "#3b82f6", border: "#bfdbfe" },
  DONE:        { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
};

const AddTaskModal = ({ onClose, onSave, users }) => {
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const [form, setForm] = useState({
    title: "",
    description: "",
    dueDate: "",
    priority: "MEDIUM",
    assignedToId: "",
    createdById: currentUser.id || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError("Title is required."); return; }
    setSaving(true);
    try {
      const newTask = await createTask({
        ...form,
        assignedToId: form.assignedToId || undefined,
        dueDate: form.dueDate || undefined,
      });
      onSave(newTask);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create task.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Task</h2>
          <button className="modal-close" onClick={onClose}><UilTimes size="20" /></button>
        </div>
        <div className="modal-body">
          {error && <div className="modal-error">{error}</div>}
          <div className="form-group">
            <label>Title *</label>
            <input name="title" placeholder="Follow up with customer..." value={form.title} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea name="description" placeholder="Add more details..." value={form.description} onChange={handleChange} rows={3} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Due Date</label>
              <input name="dueDate" type="date" value={form.dueDate} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select name="priority" value={form.priority} onChange={handleChange}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Assign To</label>
            <select name="assignedToId" value={form.assignedToId} onChange={handleChange}>
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button className="modal-cancel" onClick={onClose}>Cancel</button>
          <button className="modal-save" onClick={handleSubmit} disabled={saving}>
            {saving ? "Creating..." : "Create Task"}
          </button>
        </div>
      </div>
    </div>
  );
};

const TaskCard = ({ task, onStatusChange, onDelete }) => {
  const priority = priorityColors[task.priority] || priorityColors.MEDIUM;
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE";

  const nextStatus = { TODO: "IN_PROGRESS", IN_PROGRESS: "DONE", DONE: "TODO" };

  return (
    <div className={`task-card ${task.status === "DONE" ? "done" : ""} ${isOverdue ? "overdue" : ""}`}>
      <div className="task-card-header">
        <span className="task-priority" style={{ background: priority.bg, color: priority.color }}>
          {task.priority}
        </span>
        <div className="task-card-actions">
          <button
            className="task-action-btn check"
            onClick={() => onStatusChange(task.id, nextStatus[task.status])}
            title={task.status === "DONE" ? "Reopen" : "Advance"}
          >
            <UilCheck size="14" />
          </button>
          <button
            className="task-action-btn delete"
            onClick={() => onDelete(task.id)}
            title="Delete"
          >
            <UilTrash size="14" />
          </button>
        </div>
      </div>

      <h4 className="task-title">{task.title}</h4>
      {task.description && <p className="task-desc">{task.description}</p>}

      <div className="task-meta">
        {task.dueDate && (
          <span className={`task-due ${isOverdue ? "overdue-text" : ""}`}>
            <UilCalender size="12" />
            {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            {isOverdue && " · Overdue"}
          </span>
        )}
        {task.assignedTo && (
          <span className="task-assignee">
            <UilUser size="12" />
            {task.assignedTo.name}
          </span>
        )}
        {task.ticket && (
          <span className="task-ticket">
            <UilTicket size="12" />
            {task.ticket.subject?.slice(0, 20)}...
          </span>
        )}
      </div>
    </div>
  );
};

const Tasks = ({ addToast }) => {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    Promise.all([getTasks(), getUsers()])
      .then(([t, u]) => { setTasks(t); setUsers(u); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleTaskAdded = (newTask) => {
    setTasks((prev) => [newTask, ...prev]);
    addToast("Task created!", "success");
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const updated = await updateTask(id, { status: newStatus });
      setTasks((prev) => prev.map((t) => t.id === id ? updated : t));
      if (newStatus === "DONE") addToast("Task completed! ✅", "success");
    } catch (err) {
      addToast("Failed to update task", "error");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      addToast("Task deleted", "info");
    } catch (err) {
      addToast("Failed to delete task", "error");
    }
  };

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  const filteredTasks = tasks.filter((t) => {
    if (filter === "MINE") return t.assignedToId === currentUser.id;
    if (filter === "OVERDUE") return t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE";
    return true;
  });

  const todoCount = tasks.filter((t) => t.status === "TODO").length;
  const inProgressCount = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const doneCount = tasks.filter((t) => t.status === "DONE").length;
  const overdueCount = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE").length;

  return (
    <div className="Tasks">
      {showModal && (
        <AddTaskModal
          onClose={() => setShowModal(false)}
          onSave={handleTaskAdded}
          users={users}
        />
      )}

      {/* Header */}
      <div className="tasks-header">
        <h1>Tasks</h1>
        <button className="add-btn" onClick={() => setShowModal(true)}>
          <UilPlus size="18" /> New Task
        </button>
      </div>

      {/* Stats */}
      <div className="tasks-stats">
        <div className="task-stat-card">
          <span>To Do</span>
          <strong>{todoCount}</strong>
        </div>
        <div className="task-stat-card in-progress">
          <span>In Progress</span>
          <strong style={{ color: "#3b82f6" }}>{inProgressCount}</strong>
        </div>
        <div className="task-stat-card done">
          <span>Done</span>
          <strong style={{ color: "#16a34a" }}>{doneCount}</strong>
        </div>
        <div className="task-stat-card overdue">
          <span>Overdue</span>
          <strong style={{ color: "#dc2626" }}>{overdueCount}</strong>
        </div>
      </div>

      {/* Filters */}
      <div className="tasks-filters">
        {["ALL", "MINE", "OVERDUE"].map((f) => (
          <button
            key={f}
            className={`filter-tab ${filter === f ? "active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f === "ALL" ? "All Tasks" : f === "MINE" ? "Assigned to Me" : "Overdue"}
          </button>
        ))}
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="tasks-loading">Loading tasks...</div>
      ) : (
        <div className="kanban-board">
          {statusColumns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col);
            const colStyle = statusColors[col];
            return (
              <div key={col} className="kanban-column">
                <div className="kanban-column-header" style={{ borderTop: `3px solid ${colStyle.border}` }}>
                  <span className="kanban-column-title" style={{ color: colStyle.color }}>
                    {statusLabels[col]}
                  </span>
                  <span className="kanban-column-count" style={{ background: colStyle.bg, color: colStyle.color }}>
                    {colTasks.length}
                  </span>
                </div>
                <div className="kanban-column-body">
                  {colTasks.length === 0 ? (
                    <div className="kanban-empty">No tasks here</div>
                  ) : (
                    colTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Tasks;