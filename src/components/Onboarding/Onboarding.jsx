import { useEffect, useRef, useState } from "react";
import "./Onboarding.css";
import { getGmailAuthUrl, getGmailStatus, syncGmail, getTickets, sendMessage } from "../../api";

// Steps: 0 = connect Gmail, 1 = waiting for first email, 2 = send first reply, 3 = done
const STEP_LABELS = ["Connect your inbox", "First email arrives", "Send your first reply"];
const MAX_POLL_ATTEMPTS = 20; // ~60s at 3s intervals
const POLL_INTERVAL_MS = 3000;

const Onboarding = ({ onFinish }) => {
  const [step, setStep] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const [gmailEmail, setGmailEmail] = useState("");
  const [error, setError] = useState("");
  const [ticket, setTicket] = useState(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const pollingRef = useRef(false);

  // On mount: were we just redirected back from Google? Is Gmail already connected?
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const justConnected = params.get("gmailConnected") === "true";
    if (justConnected) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    getGmailStatus()
      .then((status) => {
        if (status?.gmailConnected) {
          setGmailEmail(status.gmailEmail || "");
          setStep(1);
        } else if (justConnected) {
          // Redirected back but the record hasn't propagated yet — move on,
          // the sync step below will confirm on its own.
          setStep(1);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Step 1: trigger a sync, then poll until the first ticket shows up
  useEffect(() => {
    if (step !== 1 || pollingRef.current) return;
    pollingRef.current = true;
    let cancelled = false;
    let attempts = 0;

    const checkForTicket = async () => {
      if (cancelled) return;
      try {
        const list = await getTickets();
        if (list && list.length > 0) {
          setTicket(list[0]);
          setStep(2);
          return;
        }
      } catch (_) {
        // ignore transient errors while polling
      }
      attempts += 1;
      if (attempts >= MAX_POLL_ATTEMPTS) {
        setPollTimedOut(true);
        return;
      }
      setTimeout(checkForTicket, POLL_INTERVAL_MS);
    };

    (async () => {
      try {
        await syncGmail();
      } catch (_) {
        // sync failure isn't fatal — keep polling, the 5-min background poller will catch up
      }
      checkForTicket();
    })();

    return () => { cancelled = true; };
  }, [step]);

  const handleConnect = async () => {
    setError("");
    setConnecting(true);
    try {
      const { url } = await getGmailAuthUrl();
      window.location.href = url;
    } catch (err) {
      setError(err.message || "Couldn't start the Gmail connection. Try again.");
      setConnecting(false);
    }
  };

  const handleSendReply = async () => {
    if (!reply.trim() || !ticket) return;
    setSending(true);
    setError("");
    try {
      await sendMessage(ticket.id, reply.trim(), "AGENT");
      setStep(3);
    } catch (err) {
      setError(err.message || "Couldn't send your reply. Try again.");
    } finally {
      setSending(false);
    }
  };

  const finish = () => {
    try { localStorage.setItem("agentcrm_onboarding_done", "1"); } catch (_) {}
    onFinish();
  };

  const customerName = ticket?.customer?.name || ticket?.customerName || "your customer";

  return (
    <div className="onboarding-page">
      <div className="onboarding-card">
        <div className="onboarding-brand">
          <div className="onboarding-logo-icon">A</div>
          <span>Agent<strong>CRM</strong></span>
        </div>

        <div className="onboarding-steps">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className={`onboarding-step-pill ${step >= i ? "done" : ""} ${step === i ? "active" : ""}`}>
              <span className="pill-dot">{step > i ? "✓" : i + 1}</span>
              <span className="pill-label">{label}</span>
            </div>
          ))}
        </div>

        {error && <div className="onboarding-error">{error}</div>}

        {/* ── Step 0: connect Gmail ── */}
        {step === 0 && (
          <div className="onboarding-panel">
            <h1 className="onboarding-title">Connect your inbox</h1>
            <p className="onboarding-sub">
              AgentCRM turns your Gmail into a shared team inbox. Connect it now and your first
              customer email will show up here in a couple of minutes.
            </p>
            <button className="onboarding-connect-btn" onClick={handleConnect} disabled={connecting}>
              {connecting ? "Redirecting to Google..." : "Connect Gmail"}
            </button>
            <p className="onboarding-note">
              We only read and send email on your behalf — we never touch anything outside your inbox.
            </p>
            <button className="onboarding-skip" onClick={finish}>Skip for now</button>
          </div>
        )}

        {/* ── Step 1: waiting for first email ── */}
        {step === 1 && (
          <div className="onboarding-panel">
            <div className="onboarding-spinner" />
            <h1 className="onboarding-title">
              {gmailEmail ? `Connected as ${gmailEmail}` : "Gmail connected"}
            </h1>
            <p className="onboarding-sub">
              We're syncing your inbox now — as soon as an unread customer email comes in, it'll
              turn into a ticket right here.
            </p>
            {pollTimedOut ? (
              <>
                <p className="onboarding-note">
                  Still waiting on a new email — that's fine, it can take a few minutes depending on
                  your inbox. You can head into AgentCRM now and it'll appear automatically.
                </p>
                <button className="onboarding-skip" onClick={finish}>Go to my dashboard</button>
              </>
            ) : (
              <button className="onboarding-skip" onClick={finish}>I'll check back later</button>
            )}
          </div>
        )}

        {/* ── Step 2: send first reply ── */}
        {step === 2 && ticket && (
          <div className="onboarding-panel">
            <h1 className="onboarding-title">Your first email arrived 🎉</h1>
            <p className="onboarding-sub">Reply right here — it'll send for real, straight to {customerName}.</p>

            <div className="onboarding-ticket-preview">
              <div className="ticket-preview-header">
                <div className="ticket-preview-avatar">{customerName.charAt(0).toUpperCase()}</div>
                <div>
                  <div className="ticket-preview-name">{customerName}</div>
                  <div className="ticket-preview-subject">{ticket.subject}</div>
                </div>
              </div>
              {ticket.description && <p className="ticket-preview-body">{ticket.description}</p>}
            </div>

            <textarea
              className="onboarding-reply-input"
              placeholder="Type your reply..."
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={4}
            />
            <button
              className="onboarding-connect-btn"
              onClick={handleSendReply}
              disabled={sending || !reply.trim()}
            >
              {sending ? "Sending..." : "Send reply"}
            </button>
            <button className="onboarding-skip" onClick={finish}>Skip for now</button>
          </div>
        )}

        {/* ── Step 3: done ── */}
        {step === 3 && (
          <div className="onboarding-panel">
            <div className="onboarding-success-icon">✓</div>
            <h1 className="onboarding-title">You're all set</h1>
            <p className="onboarding-sub">
              Your inbox is connected and you've sent your first reply. New emails will keep
              landing in AgentCRM automatically from here on.
            </p>
            <button className="onboarding-connect-btn" onClick={finish}>Go to my dashboard</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;