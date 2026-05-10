import React, { useState, useEffect, useRef } from "react";
import "./TicketDetails.css";
import { getMessages, sendMessage, updateTicket, getUsers, aiSuggestReplies, aiSummarize, aiTranslate, sendEmail } from "../../api";

const TicketDetails = ({ ticket, onTicketUpdate, addToast }) => {
  const [messages, setMessages]               = useState([]);
  const [replyText, setReplyText]             = useState("");
  const [replyMode, setReplyMode]             = useState("reply");
  const [loading, setLoading]                 = useState(true);
  const [currentStatus, setCurrentStatus]     = useState(ticket?.status);
  const [updatingStatus, setUpdatingStatus]   = useState(false);
  const [suggestions, setSuggestions]         = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [summary, setSummary]                 = useState("");
  const [loadingSummary, setLoadingSummary]   = useState(false);
  const [showSummary, setShowSummary]         = useState(false);
  const [agents, setAgents]                   = useState([]);
  const [assignedAgentId, setAssignedAgentId] = useState(ticket?.assignedAgentId || "");
  const [assigning, setAssigning]             = useState(false);
  const [translating, setTranslating]         = useState(null);
  const [translations, setTranslations]       = useState({});
  const threadEndRef = useRef(null);
  const inputRef     = useRef(null);

  const scrollToBottom = () => threadEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => { getUsers().then(setAgents).catch(console.error); }, []);

  useEffect(() => {
    if (!ticket?.id) return;
    setCurrentStatus(ticket.status);
    setAssignedAgentId(ticket.assignedAgentId || "");
    setLoading(true);
    setSuggestions([]);
    setSummary("");
    setShowSummary(false);
    setReplyMode("reply");
    setTranslations({});
    setReplyText("");

    getMessages(ticket.id)
      .then((data) => { setMessages(data); setLoading(false); })
      .catch((err) => { console.error(err); setLoading(false); });

    inputRef.current?.focus();

    const interval = setInterval(() => {
      getMessages(ticket.id).then(setMessages).catch(console.error);
    }, 10000);

    return () => clearInterval(interval);
  }, [ticket?.id]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  if (!ticket) return null;

  /* ── Helpers ── */
  const buildConversationContext = (msgs) =>
    msgs
      .filter((m) => m.senderType !== "SYSTEM" && m.senderType !== "NOTE")
      .map((m) => `${m.senderType === "AGENT" ? "Support Agent" : "Customer"}: ${m.body}`)
      .join("\n");

  const avatarInitials = (name = "") =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  const fmtTime = (iso) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  /* ── Actions ── */
  const handleAssign = async (agentId) => {
    setAssigning(true);
    try {
      await updateTicket(ticket.id, { assignedAgentId: agentId || null });
      setAssignedAgentId(agentId);
      const agent = agents.find((a) => a.id === agentId);
      if (onTicketUpdate) onTicketUpdate({ ...ticket, assignedAgentId: agentId, assignedAgent: agent || null });
      setMessages((prev) => [...prev, {
        id: `system-${Date.now()}`,
        senderType: "SYSTEM",
        body: agentId ? `Ticket assigned to ${agent?.name || "agent"}` : "Ticket unassigned",
        createdAt: new Date().toISOString(),
      }]);
      addToast(agentId ? `Assigned to ${agent?.name}` : "Ticket unassigned", "success");
    } catch { addToast("Failed to assign ticket", "error"); }
    finally  { setAssigning(false); }
  };

  const handleGetSuggestions = async () => {
    if (!messages.length) return;
    setLoadingSuggestions(true);
    setSuggestions([]);
    try {
      const results = await aiSuggestReplies({
        subject: ticket.subject,
        customerName: ticket.customer?.name || "Customer",
        conversation: buildConversationContext(messages),
      });
      setSuggestions(results);
    } catch { addToast("Failed to get AI suggestions", "error"); }
    finally  { setLoadingSuggestions(false); }
  };

  const handleGetSummary = async () => {
    if (!messages.length) return;
    setLoadingSummary(true);
    setShowSummary(true);
    setSummary("");
    try {
      const result = await aiSummarize({
        subject: ticket.subject,
        conversation: buildConversationContext(messages),
      });
      setSummary(result);
    } catch { addToast("Failed to generate summary", "error"); }
    finally  { setLoadingSummary(false); }
  };

  const handleTranslate = async (msgId, text) => {
    if (translations[msgId]) {
      setTranslations((prev) => { const n = { ...prev }; delete n[msgId]; return n; });
      return;
    }
    setTranslating(msgId);
    try {
      const result = await aiTranslate({ text });
      setTranslations((prev) => ({ ...prev, [msgId]: result }));
    } catch { addToast("Failed to translate", "error"); }
    finally  { setTranslating(null); }
  };

  const handleSend = async () => {
    if (!replyText.trim()) return;
    try {
      const senderType = replyMode === "note" ? "NOTE" : "AGENT";
      const newMessage = await sendMessage(ticket.id, replyText, senderType);
      setMessages((prev) => [...prev, newMessage]);
      if (replyMode === "reply" && ticket.customer?.email) {
        try {
          await sendEmail({ to: ticket.customer.email, subject: ticket.subject, text: replyText, ticketId: ticket.id });
          addToast("Reply sent & email delivered ✉️", "success");
        } catch {
          addToast("Reply saved but email failed", "info");
        }
      } else {
        addToast(replyMode === "note" ? "Note added" : "Message sent", "success");
      }
      setReplyText("");
      setSuggestions([]);
    } catch { addToast("Failed to send", "error"); }
  };

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      await updateTicket(ticket.id, { status: newStatus });
      setMessages((prev) => [...prev, {
        id: `system-${Date.now()}`,
        senderType: "SYSTEM",
        body: `Ticket ${newStatus === "CLOSED" ? "closed" : newStatus === "OPEN" ? "reopened" : "marked as pending"} by Support Team`,
        createdAt: new Date().toISOString(),
      }]);
      setCurrentStatus(newStatus);
      if (onTicketUpdate) onTicketUpdate({ ...ticket, status: newStatus });
      addToast(`Ticket ${newStatus.toLowerCase()}`, "success");
    } catch { addToast("Failed to update ticket", "error"); }
    finally  { setUpdatingStatus(false); }
  };

  /* ── Badge configs ── */
  const priorityColors = {
    HIGH:   { bg: "#feeaea", color: "#b91c1c" },
    MEDIUM: { bg: "#fef6e4", color: "#8a5e00" },
    LOW:    { bg: "#e8f4e8", color: "#1a6a1a" },
  };
  const statusColors = {
    OPEN:    { bg: "#e8f4e8", color: "#1a6a1a" },
    PENDING: { bg: "#fef6e4", color: "#8a5e00" },
    CLOSED:  { bg: "#f0f4f0", color: "#5a745a" },
  };

  const priority = priorityColors[ticket.priority] || priorityColors.MEDIUM;
  const status   = statusColors[currentStatus]     || statusColors.OPEN;

  const nextStatusAction = () => {
    if (currentStatus === "OPEN")    return { label: "Mark Pending", next: "PENDING" };
    if (currentStatus === "PENDING") return { label: "Close Ticket", next: "CLOSED" };
    return                                  { label: "Reopen Ticket", next: "OPEN" };
  };
  const action        = nextStatusAction();
  const assignedAgent = agents.find((a) => a.id === assignedAgentId);

  return (
    <div className="ticket-details">

      {/* ── Header ── */}
      <div className="detail-header">
        <div className="header-top">
          <h1>{ticket.subject}</h1>
          <div className="header-badges">
            <span className="status-badge" style={{ background: status.bg, color: status.color }}>
              {currentStatus}
            </span>
            <span className="status-badge" style={{ background: priority.bg, color: priority.color }}>
              {ticket.priority}
            </span>
            <button
              className={`status-action-btn ${currentStatus.toLowerCase()}`}
              onClick={() => handleStatusChange(action.next)}
              disabled={updatingStatus}
            >
              {updatingStatus ? "Updating…" : action.label}
            </button>
          </div>
        </div>

        <div className="meta-info">
          <span className="customer-tag">{ticket.customer?.name || "Unknown"}</span>
          <span className="separator">•</span>
          <span className="meta-date">
            {new Date(ticket.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
          <span className="separator">•</span>
          <div className="assign-wrapper">
            <span className="assign-label">Assign:</span>
            <select
              className="assign-select"
              value={assignedAgentId}
              onChange={(e) => handleAssign(e.target.value)}
              disabled={assigning}
            >
              <option value="">Unassigned</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            {assignedAgent && (
              <div className="assigned-avatar" title={assignedAgent.name}>
                {assignedAgent.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <span className="separator">•</span>
          <button
            className="summary-btn"
            onClick={handleGetSummary}
            disabled={loadingSummary || !messages.length}
          >
            {loadingSummary ? "Summarizing…" : "✨ AI Summary"}
          </button>
        </div>
      </div>

      {/* ── AI Summary ── */}
      {showSummary && (
        <div className="ai-summary">
          <div className="ai-summary-header">
            <span>✨ AI Summary</span>
            <button onClick={() => setShowSummary(false)}>×</button>
          </div>
          <p>{loadingSummary ? "Generating summary…" : summary}</p>
        </div>
      )}

      {/* ── Conversation thread ── */}
      <div className="conversation-thread">
        {loading ? (
          <div className="loading-messages">Loading messages…</div>
        ) : messages.length === 0 ? (
          <div className="loading-messages">No messages yet.</div>
        ) : (
          messages.map((msg) => {

            /* System event */
            if (msg.senderType === "SYSTEM") return (
              <div key={msg.id} className="system-message">
                <span>{msg.body}</span>
                <span className="system-time">{fmtTime(msg.createdAt)}</span>
              </div>
            );

            /* Internal note */
            if (msg.senderType === "NOTE") return (
              <div key={msg.id} className="note-card">
                <div className="note-header">
                  <span className="note-icon">🔒</span>
                  <span className="note-sender">Internal Note</span>
                  <span className="note-time">{fmtTime(msg.createdAt)}</span>
                </div>
                <p className="note-body">{msg.body}</p>
              </div>
            );

            /* Regular message — Gmail card style */
            const isAgent     = msg.senderType === "AGENT";
            const translation = translations[msg.id];
            const senderName  = isAgent ? "Support Team" : (ticket.customer?.name || "Customer");
            const senderEmail = isAgent ? null : ticket.customer?.email;

            return (
              <div key={msg.id} className={`message-card ${isAgent ? "agent" : "customer"}`}>
                <div className="card-header">
                  <div className="sender-avatar">
                    {avatarInitials(senderName)}
                  </div>

                  <div className="sender-info">
                    <span className="sender-name">{senderName}</span>
                    {senderEmail && (
                      <span className="sender-email">{senderEmail}</span>
                    )}
                  </div>

                  <div className="card-header-right">
                    <span className="timestamp">{fmtTime(msg.createdAt)}</span>
                    <button
                      className="translate-btn"
                      onClick={() => handleTranslate(msg.id, msg.body)}
                      disabled={translating === msg.id}
                      title="Translate"
                    >
                      {translating === msg.id ? "…" : translation ? "🌐 Original" : "🌐"}
                    </button>
                  </div>
                </div>

                <div className="card-body">
                  <p>{msg.body}</p>
                  {translation && (
                    <div className="translation-box">
                      <span className="translation-lang">Translated from {translation.language}</span>
                      <p>{translation.translation}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={threadEndRef} />
      </div>

      {/* ── AI Suggestions ── */}
      {suggestions.length > 0 && (
        <div className="ai-suggestions">
          <div className="ai-suggestions-header">
            <span>✨ AI Suggestions — click to use</span>
            <button onClick={() => setSuggestions([])}>×</button>
          </div>
          <div className="suggestions-list">
            {suggestions.map((s, i) => (
              <button
                key={i}
                className="suggestion-chip"
                onClick={() => { setReplyText(s); setSuggestions([]); inputRef.current?.focus(); }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Reply / Note composer ── */}
      <div className="reply-section">
        <div className="reply-mode-tabs">
          <button
            className={`reply-mode-tab ${replyMode === "reply" ? "active-reply" : ""}`}
            onClick={() => setReplyMode("reply")}
          >
            💬 Reply
          </button>
          <button
            className={`reply-mode-tab ${replyMode === "note" ? "active-note" : ""}`}
            onClick={() => setReplyMode("note")}
          >
            🔒 Internal Note
          </button>
        </div>

        <div className={`editor-container ${replyMode === "note" ? "note-mode" : ""}`}>
          <textarea
            ref={inputRef}
            placeholder={replyMode === "note"
              ? "Write an internal note — only your team can see this…"
              : "Type your response to the customer…"}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
          />
          <div className="editor-toolbar">
            <div className="toolbar-left">
              <div className="formatting">
                <span title="Bold">B</span>
                <span title="Italic" style={{ fontStyle: "italic" }}>I</span>
                <span title="Link">🔗</span>
              </div>
              {replyMode === "reply" ? (
                <button
                  className="ai-suggest-btn"
                  onClick={handleGetSuggestions}
                  disabled={loadingSuggestions || !messages.length}
                >
                  {loadingSuggestions ? "Thinking…" : "✨ Suggest replies"}
                </button>
              ) : (
                <span className="note-hint">🔒 Only visible to your team</span>
              )}
            </div>
            <button
              className={`send-response-btn ${replyMode === "note" ? "note-send-btn" : ""}`}
              onClick={handleSend}
              disabled={!replyText.trim()}
            >
              {replyMode === "note" ? "Add Note" : "Send Response"}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default TicketDetails;