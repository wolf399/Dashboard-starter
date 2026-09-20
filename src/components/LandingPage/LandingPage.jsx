import React, { useState, useEffect } from "react";
import "./LandingPage.css";
import Login from "../Auth/Login";
import Signup from "../Auth/Signup";
import { loginWithGoogle } from "../../api";

const FeatureIcon = ({ type, accent, bg }) => {
  const content = {
    inbox: (
      <>
        <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
        <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
      </>
    ),
    bolt: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
    chart: (
      <>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
        <line x1="2" y1="20" x2="22" y2="20" />
      </>
    ),
    task: (
      <>
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </>
    ),
    users: (
      <>
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </>
    ),
    sparkle: (
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    ),
  };
  return (
    <div className="feature-icon" style={{ background: bg }}>
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke={accent}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {content[type]}
      </svg>
    </div>
  );
};

const CheckIcon = ({ color = "#16a34a" }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0 }}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

/* Generic, non-brand integration glyphs — abstract shapes standing in for
   email / chat / messaging / broadcast channels, not any specific logo. */
const IntegrationIcon = ({ type, color }) => {
  const paths = {
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 7l9 6 9-6" />
      </>
    ),
    chat: (
      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
    ),
    send: <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />,
    bubble: (
      <>
        <circle cx="9" cy="9" r="4" />
        <circle cx="16" cy="15" r="4" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </>
    ),
  };
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {paths[type]}
    </svg>
  );
};

const LandingPage = ({ onEnterApp, onSignupSuccess }) => {
  const [mode, setMode] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [inviteToken, setInviteToken] = useState(null);
  const [googleAuthLoading, setGoogleAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const oauthError = params.get("error");
    const token = params.get("invite");

    if (code) {
      setGoogleAuthLoading(true);
      loginWithGoogle(code, window.location.origin)
        .then(() => {
          onEnterApp();
        })
        .catch((err) => {
          setAuthError(err.message || "Google sign-in failed. Please try again.");
          setMode("login");
        })
        .finally(() => {
          setGoogleAuthLoading(false);
          window.history.replaceState({}, document.title, window.location.pathname);
        });
    } else if (oauthError) {
      setAuthError("Google sign-in was cancelled.");
      setMode("login");
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (token && token.length < 200) {
      setInviteToken(token);
      setMode("register");
    }

    return () => window.removeEventListener("scroll", handleScroll);
  }, [onEnterApp]);

  if (googleAuthLoading) {
    return (
      <div className="auth-page">
        <div className="auth-loading">Signing you in with Google...</div>
      </div>
    );
  }

  if (mode === "login") {
    return (
      <Login
        onSuccess={onEnterApp}
        onSwitchToSignup={() => setMode("register")}
        initialError={authError}
      />
    );
  }

  if (mode === "register") {
    return (
      <Signup
        onSuccess={onSignupSuccess || onEnterApp}
        onSwitchToLogin={() => setMode("login")}
        inviteToken={inviteToken}
        initialError={authError}
      />
    );
  }

  const features = [
    { icon: "inbox", title: "Smart Inbox", desc: "All your customer conversations in one beautifully organized inbox. Filter by status, search instantly, never miss a message.", color: "#f0fdf4", accent: "#16a34a" },
    { icon: "bolt", title: "Lightning Fast", desc: "Respond to customers in seconds with AI-powered reply suggestions. Canned responses and keyboard shortcuts built in.", color: "#eff6ff", accent: "#3b82f6" },
    { icon: "chart", title: "Analytics", desc: "Real-time dashboards showing ticket volume, resolution rates, team performance, and customer satisfaction scores.", color: "#fdf4ff", accent: "#a855f7" },
    { icon: "task", title: "Task Management", desc: "Create follow-up tasks, assign to teammates, set due dates. Never let a customer fall through the cracks.", color: "#fff7ed", accent: "#f97316" },
    { icon: "users", title: "Customer Profiles", desc: "Rich customer profiles with full ticket history, contact details, and activity timeline all in one place.", color: "#fef2f2", accent: "#ef4444" },
    { icon: "sparkle", title: "AI Powered", desc: "Let AI summarize long threads and suggest the perfect reply. Save hours every week on repetitive support tasks.", color: "#f0fdfa", accent: "#14b8a6" },
  ];

  const testimonials = [
    { quote: "AgentCRM cut our response time by 60%. Our customers can't believe how fast we reply now.", name: "Sarah Chen", role: "Head of Support, Flowmint", avatar: "SC", color: "#16a34a" },
    { quote: "Finally a CRM that doesn't feel like it was built in 2005. The UI is gorgeous and actually intuitive.", name: "Marcus Webb", role: "Founder, Stacklabs", avatar: "MW", color: "#3b82f6" },
    { quote: "The analytics alone are worth it. I finally know exactly where our support team is struggling.", name: "Priya Nair", role: "Customer Success, Orbio", avatar: "PN", color: "#a855f7" },
  ];

  const plans = [
    {
      name: "Starter", price: "$9", period: "/mo", desc: "Perfect for small teams just getting started.",
      planClass: "starter", badge: null,
      features: ["Up to 2 agents", "500 tickets/month", "Inbox & customer profiles", "Canned responses", "Basic analytics", "Email support"],
      cta: "Start Free Trial", ctaStyle: "outline",
    },
    {
      name: "Growth", price: "$29", period: "/mo", desc: "For growing teams that need more power.",
      planClass: "growth", badge: "Most Popular",
      features: ["Up to 10 agents", "Unlimited tickets", "AI reply suggestions", "Pipeline & deals", "Contact management", "Task management", "Advanced analytics", "Priority support"],
      cta: "Start Free Trial", ctaStyle: "solid",
    },
    {
      name: "Business", price: "$79", period: "/mo", desc: "Enterprise-grade for large support teams.",
      planClass: "business", badge: null,
      features: ["Unlimited agents", "Unlimited tickets", "AI summary & suggestions", "Pipeline & deals", "Contact management", "Custom analytics", "Canned responses", "Priority support", "Dedicated onboarding"],
      cta: "Start Free Trial", ctaStyle: "dark",
    },
  ];

  const integrations = [
    { type: "mail", label: "Gmail", color: "#16a34a" },
    { type: "chat", label: "Slack", color: "#3b82f6" },
    { type: "bubble", label: "WhatsApp", color: "#22c55e" },
    { type: "send", label: "Telegram", color: "#0ea5e9" },
    { type: "bell", label: "Alerts", color: "#a855f7" },
  ];

  return (
    <div className="landing">
      {/* Nav */}
      <nav className={`landing-nav ${scrolled ? "scrolled" : ""}`}>
        <div className="nav-inner">
          <div className="nav-logo">
            <div className="nav-logo-icon">A</div>
            <span>Agent<strong>CRM</strong></span>
          </div>
          <div className="nav-links">
            <span className="nav-dropdown">
              Products
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </span>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#testimonials">Reviews</a>
            <a href="#contact">Contact us</a>
          </div>
          <div className="nav-actions">
            <button className="nav-login" onClick={() => setMode("login")}>Log in</button>
            <button className="nav-signup" onClick={() => setMode("register")}>Create account</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <h1 className="hero-title">
          All-in-One CRM<br />
          for <span className="hero-highlight">Support Teams</span>
        </h1>
        <p className="hero-sub">
          Manage customer conversations, sales pipelines, and support tickets in one powerful CRM platform built for modern teams.
        </p>
        <div className="hero-ctas">
          <button className="hero-cta-primary" onClick={() => setMode("register")}>Start your free trial</button>
          <button className="hero-cta-secondary" onClick={() => setMode("login")}>See product demo</button>
        </div>
        <div className="hero-tagline">
          <span>SMART INBOX</span>
          <i />
          <span>AI-POWERED REPLIES</span>
          <i />
          <span>24/7 CUSTOMER SUPPORT</span>
        </div>

        <div className="hero-laptop-wrap">
          <div className="floating-card rating-card">
            <div className="floating-stars">★★★★★</div>
            <div className="floating-card-text">
              <strong>Over 2,000+</strong>
              <span>teams already using AgentCRM</span>
            </div>
          </div>

          <div className="floating-card score-card">
            <div className="score-value">98%</div>
            <div className="floating-card-text">
              <strong>Customer Satisfaction</strong>
              <span>Based on last quarter</span>
            </div>
          </div>

          <div className="product-window">
            <div className="pw-titlebar">
              <div className="window-dots"><span /><span /><span /></div>
              <div className="pw-url">app.agentcrm.company / inbox</div>
              <div className="pw-agent-status"><i className="status-dot" />Sarah K. · Senior Agent · Online</div>
            </div>

            <div className="pw-body">
              {/* icon rail */}
              <div className="pw-rail">
                {[
                  { icon: "inbox", label: "Inbox", active: true },
                  { icon: "task", label: "Tickets" },
                  { icon: "users", label: "Contacts" },
                  { icon: "sparkle", label: "KB" },
                  { icon: "chart", label: "Analytics" },
                ].map((item, i) => (
                  <div key={i} className={`pw-rail-item ${item.active ? "active" : ""}`}>
                    <FeatureIcon type={item.icon} accent={item.active ? "#16a34a" : "#64748b"} bg="transparent" />
                  </div>
                ))}
              </div>

              {/* ticket list */}
              <div className="pw-list">
                <div className="pw-list-header">MY TICKETS · 12</div>
                <div className="pw-list-item active">
                  <span className="pw-chip email">EMAIL</span>
                  <div className="pw-list-name">Jenny Wilson</div>
                  <div className="pw-list-snippet">Order #4192 hasn't arrived, any update?</div>
                </div>
                <div className="pw-list-item">
                  <span className="pw-chip chat">CHAT</span>
                  <div className="pw-list-name">David Martinez</div>
                  <div className="pw-list-snippet">Can't log into the mobile app</div>
                </div>
                <div className="pw-list-item">
                  <span className="pw-chip whatsapp">WHATSAPP</span>
                  <div className="pw-list-name">Rachel Green</div>
                  <div className="pw-list-snippet">Refund status on order #12345</div>
                </div>
                <div className="pw-list-item">
                  <span className="pw-chip email">EMAIL</span>
                  <div className="pw-list-name">Omar Said</div>
                  <div className="pw-list-snippet">Invoice copy needed for renewal</div>
                </div>
              </div>

              {/* conversation */}
              <div className="pw-thread">
                <div className="pw-thread-header">
                  <div className="pw-thread-avatar">J</div>
                  <div className="pw-thread-title">
                    <strong>Jenny Wilson</strong>
                    <span>#4,192 · EN-US</span>
                  </div>
                </div>
                <div className="pw-tags">
                  <span className="pw-tag">INTENT · order_status</span>
                  <span className="pw-tag negative">SENTIMENT · negative</span>
                  <span className="pw-tag">TIER · pro</span>
                </div>

                <div className="pw-msg customer">
                  <span className="pw-msg-meta">Customer · 09:14</span>
                  Hey, my order was supposed to arrive 3 days ago. Any update?
                </div>

                <div className="pw-ai-card">
                  <div className="pw-ai-card-label"><span className="ai-dot">AI</span> AI agent · acted</div>
                  <p>Looked up order #4192 → delayed at regional hub. Reissued delivery and applied a $10 goodwill credit.</p>
                  <div className="pw-ai-checklist">✓ Order updated · delivery reissued · credit applied</div>
                </div>

                <div className="pw-msg customer">
                  <span className="pw-msg-meta">Customer · 09:16</span>
                  This is the second time this has happened...
                </div>

                <div className="pw-escalate">⇄ Escalated — repeat complaint. Matched to Sarah K. (support · 28% load)</div>

                <div className="pw-msg agent">
                  <span className="pw-msg-meta">Sarah K. · agent</span>
                  I'm really sorry about this, Jenny — that's not the experience we want you to have...
                </div>
              </div>

              {/* co-pilot */}
              <div className="pw-copilot">
                <div className="pw-copilot-header"><span className="ai-dot">AI</span> Co-Pilot</div>

                <div className="pw-copilot-card">
                  <div className="pw-copilot-label">Suggested reply</div>
                  <p>Your order was delayed at our regional hub. I've reissued delivery for tomorrow and added a $10 credit to your account for the inconvenience.</p>
                  <div className="pw-copilot-actions">
                    <button className="pw-btn primary">Insert</button>
                    <button className="pw-btn">Rewrite</button>
                  </div>
                </div>

                <div className="pw-copilot-card">
                  <div className="pw-copilot-label">Knowledge source</div>
                  <p className="pw-source-title">Delivery Delay &amp; Goodwill Policy · v3.1</p>
                  <p className="pw-source-sub">Same article served the AI agent above.</p>
                </div>

                <div className="pw-copilot-card">
                  <div className="pw-copilot-label">Applied automatically</div>
                  <div className="pw-kv"><span>Label</span><strong className="chip">delivery-delay</strong></div>
                  <div className="pw-kv"><span>Status</span><strong>Escalated</strong></div>
                  <div className="pw-kv"><span>Follow-up</span><strong>24h</strong></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statement */}
      <section className="statement">
        <h2>
          We help support teams reduce chaos and build stronger customer relationships through better Customer Management.
        </h2>
        <p>
          AgentCRM empowers teams to unlock the value of every conversation. Our platform helps you manage relationships, streamline workflows, and deliver consistent customer experiences across every touchpoint — because customer experience matters, and every business serves customers.
        </p>
      </section>

      {/* Integrations */}
      <section className="integrations">
        <div className="integrations-copy">
          <div className="section-label">Integrations</div>
          <h2 className="section-title">Sync with Powerful Integrations</h2>
          <p className="section-sub" style={{ marginBottom: "2rem" }}>
            AgentCRM brings your support tools into one app. Connect email, chat, and messaging channels. Reduce manual work, keep your team aligned, and reply faster with everything connected.
          </p>
          <button className="hero-cta-primary" onClick={() => setMode("register")}>View all integrations</button>
        </div>
        <div className="integrations-orbit">
          <div className="orbit-center">
            <div className="nav-logo-icon large">A</div>
          </div>
          {integrations.map((item, i) => (
            <div key={i} className={`orbit-icon orbit-icon-${i}`} style={{ color: item.color }}>
              <IntegrationIcon type={item.type} color={item.color} />
            </div>
          ))}
        </div>
      </section>

      {/* Dark CTA band */}
      <section className="cta-band">
        <div className="cta-band-copy">
          <h2>Be More Powerful with AgentCRM</h2>
          <p>AgentCRM is an all-in-one CRM built for support teams. AgentCRM helps you organize data, automate replies, and reply faster without added complexity.</p>
          <button className="hero-cta-secondary light" onClick={() => setMode("login")}>See product demo</button>
        </div>
        <div className="cta-band-card">
          <div className="cta-card-header">
            <span>Today's Tickets</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></svg>
          </div>
          <div className="cta-card-row">
            <div className="cta-card-icon"><IntegrationIcon type="mail" color="#16a34a" /></div>
            <div className="cta-card-text">
              <strong>Order delayed — Jenny W.</strong>
              <span>Opened 2 minutes ago</span>
            </div>
          </div>
          <div className="cta-card-row">
            <div className="cta-card-icon"><IntegrationIcon type="chat" color="#16a34a" /></div>
            <div className="cta-card-text">
              <strong>Renewal call — Flowmint</strong>
              <span>Scheduled tomorrow, 15:30</span>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted */}
      <section className="trust-section">
        <h2 className="section-title">Trusted CRM Software by Growing Support Teams</h2>
        <p className="section-sub" style={{ margin: "0 auto 3rem" }}>
          AgentCRM helps support teams manage customer relationships, streamline workflows, and deliver consistent customer experiences across every channel.
        </p>
        <p className="trusted-label">Trusted by teams at</p>
        <div className="trusted-logos">
          {["Flowmint", "Stacklabs", "Orbio", "Meridian", "Crestline", "Aether"].map((name, i) => (
            <span key={i} className="trusted-logo">{name}</span>
          ))}
        </div>
      </section>

      {/* Stats bar */}
      <div className="stats-bar">
        {[
          { value: "60%", label: "Faster response time" },
          { value: "2,000+", label: "Teams worldwide" },
          { value: "4.9★", label: "Average rating" },
          { value: "99.9%", label: "Uptime SLA" },
        ].map((s, i) => (
          <div key={i} className="stat-item">
            <strong>{s.value}</strong>
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Features */}
      <section className="features" id="features">
        <div className="section-label">Features</div>
        <h2 className="section-title">Everything your support team needs</h2>
        <p className="section-sub">From inbox to analytics — AgentCRM has every tool to make your customers happy and your team efficient.</p>
        <div className="features-grid">
          {features.map((f, i) => (
            <div key={i} className="feature-card" style={{ background: f.color, borderColor: f.accent + "33" }}>
              <FeatureIcon type={f.icon} accent={f.accent} bg={f.accent + "22"} />
              <h3 style={{ color: f.accent }}>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials" id="testimonials">
        <div className="section-label">Testimonials</div>
        <h2 className="section-title">Loved by support teams</h2>
        <div className="testimonials-grid">
          {testimonials.map((t, i) => (
            <div key={i} className="testimonial-card">
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-quote">"{t.quote}"</p>
              <div className="testimonial-author">
                <div className="testimonial-avatar" style={{ background: t.color }}>{t.avatar}</div>
                <div>
                  <div className="testimonial-name">{t.name}</div>
                  <div className="testimonial-role">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="pricing" id="pricing">
        <div className="section-label">Pricing</div>
        <h2 className="section-title">Simple, honest pricing</h2>
        <p className="section-sub">Start free, upgrade when you're ready. No hidden fees, no surprises.</p>
        <div className="pricing-grid">
          {plans.map((plan, i) => (
            <div key={i} className={`pricing-card ${plan.planClass}`}>
              {plan.badge && <div className="pricing-badge">{plan.badge}</div>}
              <div className="pricing-name">{plan.name}</div>
              <div className="pricing-price">
                {plan.price}<span>{plan.period}</span>
              </div>
              <p className="pricing-desc">{plan.desc}</p>
              <ul className="pricing-features">
                {plan.features.map((f, j) => (
                  <li key={j}>
                    <CheckIcon color={plan.planClass === "business" ? "#6366f1" : "#16a34a"} />
                    {f}
                  </li>
                ))}
              </ul>
              <button className={`pricing-cta ${plan.ctaStyle}`} onClick={() => setMode("register")}>{plan.cta}</button>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta">
        <h2>Ready to delight your customers?</h2>
        <p>Join 2,000+ teams using AgentCRM to deliver world-class support.</p>
        <button className="hero-cta-primary" onClick={() => setMode("register")}>Get started for free →</button>
      </section>

      {/* Footer */}
      <footer className="landing-footer" id="contact">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-logo">
              <div className="nav-logo-icon">A</div>
              <span>Agent<strong>CRM</strong></span>
            </div>
            <p>The support platform built for modern teams.</p>
          </div>
          <div className="footer-links">
            <div className="footer-col">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <a href="#testimonials">Reviews</a>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <a href="#">About</a>
              <a href="#">Blog</a>
              <a href="#">Careers</a>
            </div>
            <div className="footer-col">
              <h4>Support</h4>
              <a href="#">Docs</a>
              <a href="#">Status</a>
              <a href="#">Contact</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 AgentCRM. All rights reserved.</span>
          <span>Privacy · Terms</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;