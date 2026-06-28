import React, { useState, useEffect, useRef } from "react";
import "./TicketDetails.css";
import { getMessages, sendMessage, updateTicket, getUsers, aiSuggestReplies, aiSummarize, aiTranslate, sendEmail, getCannedResponses } from "../../api";

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
  const [expandedMessages, setExpandedMessages] = useState({});
  const [cannedResponses, setCannedResponses]  = useState([]);
  const [slashMenu, setSlashMenu]              = useState({ open: false, query: '', slashIndex: -1 });
  const [slashSelectedIdx, setSlashSelectedIdx] = useState(0);
  const threadEndRef = useRef(null);
  const inputRef     = useRef(null);

  const scrollToBottom = () => threadEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => { getUsers().then(setAgents).catch(console.error); }, []);
  useEffect(() => { getCannedResponses().then(setCannedResponses).catch(console.error); }, []);

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
    setExpandedMessages({});

    getMessages(ticket.id)
      .then((data) => {
        setMessages(data);
        setLoading(false);
        // Auto-expand last message
        if (data.length > 0) {
          setExpandedMessages({ [data[data.length - 1].id]: true });
        }
      })
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

  const fmtDate = (iso) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const isHtml = (str) => /<[a-z][\s\S]*>/i.test(str);

  const stripHtml = (html) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const getPreview = (body) => {
    const text = isHtml(body) ? stripHtml(body) : body;
    return text.replace(/\s+/g, " ").trim().slice(0, 120);
  };

  const toggleExpand = (id) => {
    setExpandedMessages((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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
        body: agentId ? `Assigned to ${agent?.name || "agent"}` : "Ticket unassigned",
        createdAt: new Date().toISOString(),
      }]);
      addToast(agentId ? `Assigned to ${agent?.name}` : "Ticket unassigned", "success");
    } catch { addToast("Failed to assign ticket", "error"); }
    finally  { setAssigning(false); }
  };

  const filteredCanned = cannedResponses.filter((r) => {
    const q = slashMenu.query.toLowerCase();
    return r.title.toLowerCase().includes(q) || r.body.toLowerCase().includes(q);
  });

  const handleReplyChange = (e) => {
    const val = e.target.value;
    setReplyText(val);
    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);
    const slashIdx = textBeforeCursor.lastIndexOf('/');
    if (slashIdx !== -1) {
      const afterSlash = textBeforeCursor.slice(slashIdx + 1);
      if (!afterSlash.includes(' ') && !afterSlash.includes('\n')) {
        setSlashMenu({ open: true, query: afterSlash, slashIndex: slashIdx });
        setSlashSelectedIdx(0);
        return;
      }
    }
    setSlashMenu({ open: false, query: '', slashIndex: -1 });
  };

  const insertCannedResponse = (response) => {
    const cursor = inputRef.current?.selectionStart ?? replyText.length;
    const before = replyText.slice(0, slashMenu.slashIndex);
    const after = replyText.slice(cursor);
    setReplyText(before + response.body + after);
    setSlashMenu({ open: false, query: '', slashIndex: -1 });
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleReplyKeyDown = (e) => {
    if (slashMenu.open && filteredCanned.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSlashSelectedIdx((i) => Math.min(i + 1, filteredCanned.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSlashSelectedIdx((i) => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter')     { e.preventDefault(); insertCannedResponse(filteredCanned[slashSelectedIdx]); return; }
      if (e.key === 'Escape')    { setSlashMenu({ open: false, query: '', slashIndex: -1 }); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
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
      setExpandedMessages((prev) => ({ ...prev, [newMessage.id]: true }));
      if (replyMode === "reply" && ticket.customer?.email) {
        try {
          await sendEmail({ to: ticket.customer.email, subject: ticket.subject, text: replyText, ticketId: ticket.id });
          addToast("Reply sent and email delivered", "success");
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
        body: `Ticket ${newStatus === "CLOSED" ? "closed" : newStatus === "OPEN" ? "reopened" : "marked as pending"}`,
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
    HIGH:   { bg: "#fef2f2", color: "#b91c1c" },
    MEDIUM: { bg: "#fefce8", color: "#854d0e" },
    LOW:    { bg: "#f0fdf4", color: "#15803d" },
  };
  const statusColors = {
    OPEN:    { bg: "#dbeafe", color: "#1d4ed8" },
    PENDING: { bg: "#fefce8", color: "#854d0e" },
    CLOSED:  { bg: "#f3f4f6", color: "#6b7280" },
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
              {currentStatus.charAt(0) + currentStatus.slice(1).toLowerCase()}
            </span>
            <span className="status-badge" style={{ background: priority.bg, color: priority.color }}>
              {ticket.priority.charAt(0) + ticket.priority.slice(1).toLowerCase()}
            </span>
            <button
              className={`status-action-btn ${currentStatus.toLowerCase()}`}
              onClick={() => handleStatusChange(action.next)}
              disabled={updatingStatus}
            >
              {action.label}
            </button>
          </div>
        </div>

        <div className="meta-info">
          <span className="customer-tag">{ticket.customer?.name || "Unknown"}</span>
          <span className="separator">·</span>
          <span className="meta-date">{fmtDate(ticket.createdAt)}</span>
          <span className="separator">·</span>
          <div className="assign-wrapper">
            <span className="assign-label">Assign</span>
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
          <span className="separator">·</span>
          <button
            className="summary-btn"
            onClick={handleGetSummary}
            disabled={loadingSummary || !messages.length}
          >
            {loadingSummary ? "Summarizing..." : "AI Summary"}
          </button>
        </div>
      </div>

      {/* ── AI Summary ── */}
      {showSummary && (
        <div className="ai-summary">
          <div className="ai-summary-header">
            <span>AI Summary</span>
            <button onClick={() => setShowSummary(false)}>×</button>
          </div>
          <p>{loadingSummary ? "Generating summary..." : summary}</p>
        </div>
      )}

      {/* ── Conversation thread ── */}
      <div className="conversation-thread">
        {loading ? (
          <div className="loading-messages">Loading...</div>
        ) : messages.length === 0 ? (
          <div className="loading-messages">No messages yet.</div>
        ) : (
          messages.map((msg, index) => {

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
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  <span className="note-sender">Internal Note</span>
                  <span className="note-time">{fmtTime(msg.createdAt)}</span>
                </div>
                <p className="note-body">{msg.body}</p>
              </div>
            );

            /* Regular message — HubSpot email thread style */
            const isAgent     = msg.senderType === "AGENT";
            const translation = translations[msg.id];
            const senderName  = isAgent ? "Support Team" : (ticket.customer?.name || "Customer");
            const senderEmail = isAgent ? null : ticket.customer?.email;
            const isExpanded  = expandedMessages[msg.id] ?? (index === messages.length - 1);
            const bodyIsHtml  = isHtml(msg.body);
            const preview     = getPreview(msg.body);

            return (
              <div key={msg.id} className={`message-card ${isAgent ? "agent" : "customer"} ${isExpanded ? "expanded" : "collapsed"}`}>
                {/* Always visible header */}
                <div className="card-header" onClick={() => toggleExpand(msg.id)}>
                  <div className={`sender-avatar ${isAgent ? "agent-avatar" : "customer-avatar"}`}>
                    {avatarInitials(senderName)}
                  </div>

                  <div className="sender-info">
                    <div className="sender-top">
                      <span className="sender-name">{senderName}</span>
                      {senderEmail && <span className="sender-email">{senderEmail}</span>}
                    </div>
                    {!isExpanded && (
                      <span className="message-preview">{preview}</span>
                    )}
                  </div>

                  <div className="card-header-right">
                    <span className="timestamp">{fmtTime(msg.createdAt)}</span>
                    {!isExpanded && (
                      <svg className="expand-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    )}
                    {isExpanded && (
                      <button
                        className="translate-btn"
                        onClick={(e) => { e.stopPropagation(); handleTranslate(msg.id, bodyIsHtml ? stripHtml(msg.body) : msg.body); }}
                        disabled={translating === msg.id}
                        title="Translate"
                      >
                        {translating === msg.id ? "..." : translation ? "Original" : "Translate"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded body */}
                {isExpanded && (
                  <div className="card-body">
                    {bodyIsHtml ? (
                      <iframe
                        srcDoc={msg.body}
                        className="email-iframe"
                        sandbox="allow-same-origin"
                        title="Email content"
                        onLoad={(e) => {
                          try {
                            const h = e.target.contentDocument?.body?.scrollHeight;
                            if (h) e.target.style.height = Math.min(h + 20, 600) + "px";
                          } catch {}
                        }}
                      />
                    ) : (
                      <p className="message-text">{msg.body}</p>
                    )}
                    {translation && (
                      <div className="translation-box">
                        <span className="translation-lang">Translated from {translation.language}</span>
                        <p>{translation.translation}</p>
                      </div>
                    )}
                  </div>
                )}
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
            <span>Suggested Replies</span>
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
            Reply
          </button>
          <button
            className={`reply-mode-tab ${replyMode === "note" ? "active-note" : ""}`}
            onClick={() => setReplyMode("note")}
          >
            Internal Note
          </button>
        </div>

        <div className={`editor-container ${replyMode === "note" ? "note-mode" : ""}`}>
          {slashMenu.open && filteredCanned.length > 0 && (
            <div className="canned-slash-dropdown">
              <div className="canned-slash-header">Canned Responses</div>
              {filteredCanned.map((r, i) => (
                <div
                  key={r.id}
                  className={`canned-slash-item ${i === slashSelectedIdx ? "canned-slash-item--selected" : ""}`}
                  onMouseDown={(e) => { e.preventDefault(); insertCannedResponse(r); }}
                  onMouseEnter={() => setSlashSelectedIdx(i)}
                >
                  <div className="canned-slash-title">{r.title}</div>
                  <div className="canned-slash-body">{r.body}</div>
                </div>
              ))}
            </div>
          )}
          <textarea
            ref={inputRef}
            placeholder={replyMode === "note"
              ? "Write an internal note — only your team can see this"
              : "Type your response... (type / to insert a canned response)"}
            value={replyText}
            onChange={handleReplyChange}
            onKeyDown={handleReplyKeyDown}
          />
          <div className="editor-toolbar">
            <div className="toolbar-left">
              <div className="formatting">
                <span title="Bold"><strong>B</strong></span>
                <span title="Italic"><em>I</em></span>
                <span title="Link">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                  </svg>
                </span>
              </div>
              {replyMode === "reply" ? (
                <button
                  className="ai-suggest-btn"
                  onClick={handleGetSuggestions}
                  disabled={loadingSuggestions || !messages.length}
                >
                  {loadingSuggestions ? "Thinking..." : "Suggest replies"}
                </button>
              ) : (
                <span className="note-hint">Only visible to your team</span>
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