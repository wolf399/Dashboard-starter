import React, { useState, useEffect } from "react";
import "./LandingPage.css";
import { login, register, validateInvite, markInviteUsed } from "../../api";

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

const LandingPage = ({ onEnterApp }) => {
  const [mode, setMode] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", orgName: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [inviteToken, setInviteToken] = useState(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);

    const params = new URLSearchParams(window.location.search);
    const token = params.get("invite");
    if (token && token.length < 200) {
      setInviteToken(token);
      setMode("register");
    }

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSubmit = async () => {
    setError("");

    if (mode === "register") {
      if (!form.name.trim()) { setError("Please enter your name."); return; }
      if (!form.email.trim()) { setError("Please enter your email."); return; }
      if (!form.password.trim()) { setError("Please enter a password."); return; }
      if (!inviteToken && !form.orgName.trim()) { setError("Please enter your company name."); return; }
    }

    setLoading(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        if (inviteToken) {
          const result = await validateInvite(inviteToken);
          if (!result.valid) {
            setError(result.message || "Invalid or expired invite link.");
            setLoading(false);
            return;
          }
        }
        await register(form.name, form.email, form.password, 'AGENT', inviteToken, form.orgName);
      }
      onEnterApp();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

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
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#testimonials">Reviews</a>
          </div>
          <div className="nav-actions">
            <button className="nav-login" onClick={() => setMode("login")}>Log in</button>
            <button className="nav-signup" onClick={() => setMode("register")}>Get Started Free</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-badge">Trusted by 2,000+ support teams</div>
        <h1 className="hero-title">
          Support that feels like<br />
          <span className="hero-highlight">magic</span> to your customers
        </h1>
        <p className="hero-sub">
          AgentCRM brings all your customer conversations, tasks, and analytics into one beautiful workspace. Respond faster, resolve smarter, retain longer.
        </p>
        <div className="hero-ctas">
          <button className="hero-cta-primary" onClick={() => setMode("register")}>Start for free — no credit card</button>
          <button className="hero-cta-secondary" onClick={() => setMode("login")}>Sign in →</button>
        </div>
        <div className="hero-social-proof">
          <div className="hero-avatars">
            {["A", "B", "C", "D", "E"].map((l, i) => (
              <div key={i} className="hero-avatar" style={{ zIndex: 5 - i, background: ["#16a34a","#3b82f6","#a855f7","#f97316","#ef4444"][i] }}>{l}</div>
            ))}
          </div>
          <span>Join <strong>2,000+</strong> teams already using AgentCRM</span>
        </div>
        <div className="hero-preview">
          <div className="preview-bar"><span /><span /><span /></div>
          <div className="preview-body">
            <div className="preview-sidebar">
              {["Dashboard","Inbox","Customers","Tasks"].map((item, i) => (
                <div key={i} className={`preview-nav-item ${i === 1 ? "active" : ""}`}>{item}</div>
              ))}
            </div>
            <div className="preview-content">
              <div className="preview-ticket">
                <div className="preview-ticket-avatar">J</div>
                <div className="preview-ticket-body">
                  <div className="preview-ticket-name">Jenny Wilson</div>
                  <div className="preview-ticket-msg">I was charged twice for my order...</div>
                </div>
                <div className="preview-ticket-badge open">OPEN</div>
              </div>
              <div className="preview-ticket">
                <div className="preview-ticket-avatar" style={{background:"#3b82f6"}}>D</div>
                <div className="preview-ticket-body">
                  <div className="preview-ticket-name">David Martinez</div>
                  <div className="preview-ticket-msg">Login error on mobile app</div>
                </div>
                <div className="preview-ticket-badge pending">PENDING</div>
              </div>
              <div className="preview-ticket">
                <div className="preview-ticket-avatar" style={{background:"#a855f7"}}>R</div>
                <div className="preview-ticket-body">
                  <div className="preview-ticket-name">Rachel Green</div>
                  <div className="preview-ticket-msg">Issue with order #12345</div>
                </div>
                <div className="preview-ticket-badge closed">CLOSED</div>
              </div>
            </div>
          </div>
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

      {/* Trusted by */}
      <div className="trusted-section">
        <p className="trusted-label">Trusted by teams at</p>
        <div className="trusted-logos">
          {["Flowmint", "Stacklabs", "Orbio", "Meridian", "Crestline", "Aether"].map((name, i) => (
            <span key={i} className="trusted-logo">{name}</span>
          ))}
        </div>
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
      <footer className="landing-footer">
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

      {/* Auth Modal */}
      {mode && (
        <div className="auth-overlay" onClick={() => { setMode(null); setInviteToken(null); }}>
          <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
            <button className="auth-close" onClick={() => { setMode(null); setInviteToken(null); }}>×</button>
            <div className="auth-logo">
              <div className="nav-logo-icon">A</div>
              <span>Agent<strong>CRM</strong></span>
            </div>
            {inviteToken && mode === "register" && (
              <div className="invite-banner">
                You've been invited! Create your account to join the workspace.
              </div>
            )}
            <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
            <p className="auth-sub">{mode === "login" ? "Sign in to your workspace" : "Start your free trial today"}</p>
            {error && <div className="auth-error">{error}</div>}

            {mode === "register" && (
              <input
                placeholder="Full name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            )}
            {mode === "register" && !inviteToken && (
              <input
                placeholder="Company / Workspace name"
                value={form.orgName}
                onChange={(e) => setForm({ ...form, orgName: e.target.value })}
              />
            )}
            <input
              placeholder="Email address"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <input
              placeholder="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
            <button className="auth-submit" onClick={handleSubmit} disabled={loading}>
              {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
            </button>
            <p className="auth-switch">
              {mode === "login" ? "Don't have an account? " : "Already have an account? "}
              <button onClick={() => setMode(mode === "login" ? "register" : "login")}>
                {mode === "login" ? "Sign up free" : "Sign in"}
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
