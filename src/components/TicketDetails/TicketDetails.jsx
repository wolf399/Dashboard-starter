import React, { useState, useEffect, useRef } from "react";
import "./TicketDetails.css";
import { getMessages, sendMessage, updateTicket, getUsers, aiSuggestReplies, aiSummarize, aiTranslate, sendEmail } from "../../api";

const TicketDetails = ({ ticket, onTicketUpdate, addToast }) => {
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [replyMode, setReplyMode] = useState("reply");
  const [loading, setLoading] = useState(true);
  const [currentStatus, setCurrentStatus] = useState(ticket?.status);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [summary, setSummary] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [agents, setAgents] = useState([]);
  const [assignedAgentId, setAssignedAgentId] = useState(ticket?.assignedAgentId || "");
  const [assigning, setAssigning] = useState(false);
  const [translating, setTranslating] = useState(null);
  const [translations, setTranslations] = useState({});
  const threadEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => threadEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    getUsers().then(setAgents).catch(console.error);
  }, []);

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
    getMessages(ticket.id)
      .then((data) => { setMessages(data); setLoading(false); })
      .catch((err) => { console.error(err); setLoading(false); });
    setReplyText("");
    inputRef.current?.focus();
  }, [ticket?.id]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  if (!ticket) return null;

  const handleAssign = async (agentId) => {
    setAssigning(true);
    try {
      await updateTicket(ticket.id, { assignedAgentId: agentId || null });
      setAssignedAgentId(agentId);
      const agent = agents.find((a) => a.id === agentId);
      if (onTicketUpdate) onTicketUpdate({ ...ticket, assignedAgentId: agentId, assignedAgent: agent || null });
      const systemMessage = {
        id: `system-${Date.now()}`,
        senderType: "SYSTEM",
        body: agentId ? `Ticket assigned to ${agent?.name || "agent"}` : "Ticket unassigned",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, systemMessage]);
      addToast(agentId ? `Assigned to ${agent?.name}` : "Ticket unassigned", "success");
    } catch (err) {
      addToast("Failed to assign ticket", "error");
    } finally {
      setAssigning(false);
    }
  };

  const buildConversationContext = (msgs) =>
    msgs
      .filter((m) => m.senderType !== "SYSTEM" && m.senderType !== "NOTE")
      .map((m) => `${m.senderType === "AGENT" ? "Support Agent" : "Customer"}: ${m.body}`)
      .join("\n");

  const handleGetSuggestions = async () => {
    if (messages.length === 0) return;
    setLoadingSuggestions(true);
    setSuggestions([]);
    try {
      const conversation = buildConversationContext(messages);
      const results = await aiSuggestReplies({
        subject: ticket.subject,
        customerName: ticket.customer?.name || "Customer",
        conversation,
      });
      setSuggestions(results);
    } catch (err) {
      addToast("Failed to get AI suggestions", "error");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleGetSummary = async () => {
    if (messages.length === 0) return;
    setLoadingSummary(true);
    setShowSummary(true);
    setSummary("");
    try {
      const conversation = buildConversationContext(messages);
      const result = await aiSummarize({ subject: ticket.subject, conversation });
      setSummary(result);
    } catch (err) {
      addToast("Failed to generate summary", "error");
    } finally {
      setLoadingSummary(false);
    }
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
    } catch (err) {
      addToast("Failed to translate", "error");
    } finally {
      setTranslating(null);
    }
  };

  const handleSend = async () => {
  if (!replyText.trim()) return;
  try {
    const senderType = replyMode === "note" ? "NOTE" : "AGENT";
    const newMessage = await sendMessage(ticket.id, replyText, senderType);
    setMessages((prev) => [...prev, newMessage]);

    // Send email back to customer if they have an email and it's a reply
    if (replyMode === "reply" && ticket.customer?.email) {
      try {
        await sendEmail({
          to: ticket.customer.email,
          subject: ticket.subject,
          text: replyText,
          ticketId: ticket.id,
        });
        addToast("Reply sent + email delivered to customer ✉️", "success");
      } catch (e) {
        addToast("Reply saved but email failed to send", "info");
      }
    } else {
      addToast(replyMode === "note" ? "Note added" : "Message sent", "success");
    }

    setReplyText("");
    setSuggestions([]);
  } catch (err) {
    addToast("Failed to send", "error");
  }
};

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      await updateTicket(ticket.id, { status: newStatus });
      const systemMessage = {
        id: `system-${Date.now()}`,
        senderType: "SYSTEM",
        body: `Ticket ${newStatus === "CLOSED" ? "closed" : newStatus === "OPEN" ? "reopened" : "marked as pending"} by Support Team`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, systemMessage]);
      setCurrentStatus(newStatus);
      if (onTicketUpdate) onTicketUpdate({ ...ticket, status: newStatus });
      addToast(`Ticket ${newStatus.toLowerCase()}`, "success");
    } catch (err) {
      addToast("Failed to update ticket", "error");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const priorityColors = {
    HIGH:   { bg: "#fee2e2", color: "#dc2626" },
    MEDIUM: { bg: "#fef3c7", color: "#d97706" },
    LOW:    { bg: "#dcfce7", color: "#16a34a" },
  };

  const statusColors = {
    OPEN:    { bg: "#dcfce7", color: "#16a34a" },
    PENDING: { bg: "#fef3c7", color: "#d97706" },
    CLOSED:  { bg: "#f3f4f6", color: "#6b7280" },
  };

  const priority = priorityColors[ticket.priority] || priorityColors.MEDIUM;
  const status = statusColors[currentStatus] || statusColors.OPEN;

  const nextStatusAction = () => {
    if (currentStatus === "OPEN")    return { label: "Mark Pending", next: "PENDING" };
    if (currentStatus === "PENDING") return { label: "Close Ticket", next: "CLOSED" };
    if (currentStatus === "CLOSED")  return { label: "Reopen Ticket", next: "OPEN" };
  };

  const action = nextStatusAction();
  const assignedAgent = agents.find((a) => a.id === assignedAgentId);

  return (
    <div className="ticket-details">

      {/* Header */}
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
              {updatingStatus ? "Updating..." : action.label}
            </button>
          </div>
        </div>
        <div className="meta-info">
          <span className="customer-tag">{ticket.customer?.name || "Unknown Customer"}</span>
          <span className="separator">•</span>
          <span className="meta-date">
            {new Date(ticket.createdAt).toLocaleDateString("en-US", {
              month: "short", day: "numeric", year: "numeric"
            })}
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
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
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
            disabled={loadingSummary || messages.length === 0}
          >
            {loadingSummary ? "Summarizing..." : "✨ AI Summary"}
          </button>
        </div>
      </div>

      {/* AI Summary */}
      {showSummary && (
        <div className="ai-summary">
          <div className="ai-summary-header">
            <span>✨ AI Summary</span>
            <button onClick={() => setShowSummary(false)}>×</button>
          </div>
          <p>{loadingSummary ? "Generating summary..." : summary}</p>
        </div>
      )}

      {/* Messages */}
      <div className="conversation-thread">
        {loading ? (
          <div className="loading-messages">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="loading-messages">No messages yet.</div>
        ) : (
          messages.map((msg) => {
            if (msg.senderType === "SYSTEM") {
              return (
                <div key={msg.id} className="system-message">
                  <span>{msg.body}</span>
                  <span className="system-time">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              );
            }
            if (msg.senderType === "NOTE") {
              return (
                <div key={msg.id} className="note-card">
                  <div className="note-header">
                    <span className="note-icon">🔒</span>
                    <span className="note-sender">Internal Note</span>
                    <span className="note-time">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="note-body">{msg.body}</p>
                </div>
              );
            }
            const translation = translations[msg.id];
            return (
              <div key={msg.id} className={`message-card ${msg.senderType === "AGENT" ? "agent" : "customer"}`}>
                <div className="card-header">
                  <div className="sender-avatar">{msg.senderType === "AGENT" ? "A" : "C"}</div>
                  <span className="sender-name">
                    {msg.senderType === "AGENT" ? "Support Team" : ticket.customer?.name || "Customer"}
                  </span>
                  <span className="timestamp">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <button
                    className="translate-btn"
                    onClick={() => handleTranslate(msg.id, msg.body)}
                    disabled={translating === msg.id}
                    title="Translate"
                  >
                    {translating === msg.id ? "..." : translation ? "🌐 Original" : "🌐"}
                  </button>
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

      {/* AI Suggestions */}
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

      {/* Reply / Note */}
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
              ? "Write an internal note — only your team can see this..."
              : "Type your response to the customer..."}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
          />
          <div className="editor-toolbar">
            <div className="toolbar-left">
              <div className="formatting">
                <span>B</span><span>I</span><span>🔗</span>
              </div>
              {replyMode === "reply" && (
                <button
                  className="ai-suggest-btn"
                  onClick={handleGetSuggestions}
                  disabled={loadingSuggestions || messages.length === 0}
                >
                  {loadingSuggestions ? "Thinking..." : "✨ Suggest replies"}
                </button>
              )}
              {replyMode === "note" && (
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