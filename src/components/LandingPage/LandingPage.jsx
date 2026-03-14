import React, { useState, useEffect } from "react";
import "./LandingPage.css";
import { login, register, validateInvite, markInviteUsed } from "../../api";

const LandingPage = ({ onEnterApp }) => {
  const [mode, setMode] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [inviteToken, setInviteToken] = useState(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);

    // Check for invite token in URL
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
        await register(form.name, form.email, form.password);
        if (inviteToken) {
          try { await markInviteUsed(inviteToken); } catch (e) { console.warn("Could not mark invite used", e); }
        }
      }
      onEnterApp();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { emoji: "🎯", title: "Smart Inbox", desc: "All your customer conversations in one beautifully organized inbox. Filter by status, search instantly, never miss a message.", color: "#f0fdf4", accent: "#16a34a" },
    { emoji: "⚡", title: "Lightning Fast", desc: "Respond to customers in seconds with AI-powered reply suggestions. Canned responses and keyboard shortcuts built in.", color: "#eff6ff", accent: "#3b82f6" },
    { emoji: "📊", title: "Analytics", desc: "Real-time dashboards showing ticket volume, resolution rates, team performance, and customer satisfaction scores.", color: "#fdf4ff", accent: "#a855f7" },
    { emoji: "✅", title: "Task Management", desc: "Create follow-up tasks, assign to teammates, set due dates. Never let a customer fall through the cracks.", color: "#fff7ed", accent: "#f97316" },
    { emoji: "👥", title: "Customer Profiles", desc: "Rich customer profiles with full ticket history, contact details, and activity timeline all in one place.", color: "#fef2f2", accent: "#ef4444" },
    { emoji: "🤖", title: "AI Powered", desc: "Let AI summarize long threads and suggest the perfect reply. Save hours every week on repetitive support tasks.", color: "#f0fdfa", accent: "#14b8a6" },
  ];

  const testimonials = [
    { quote: "ShopsCRM cut our response time by 60%. Our customers can't believe how fast we reply now.", name: "Sarah Chen", role: "Head of Support, Flowmint", avatar: "SC", color: "#16a34a" },
    { quote: "Finally a CRM that doesn't feel like it was built in 2005. The UI is gorgeous and actually intuitive.", name: "Marcus Webb", role: "Founder, Stacklabs", avatar: "MW", color: "#3b82f6" },
    { quote: "The analytics alone are worth it. I finally know exactly where our support team is struggling.", name: "Priya Nair", role: "Customer Success, Orbio", avatar: "PN", color: "#a855f7" },
  ];

  const plans = [
    {
      name: "Basic", price: "$29", period: "/mo", desc: "Perfect for small teams just getting started.",
      color: "#f9fafb", border: "#e5e7eb", badge: null,
      features: ["Up to 3 agents", "500 tickets/month", "Inbox & customer profiles", "Basic analytics", "Email support"],
      cta: "Start Free Trial", ctaStyle: "outline",
    },
    {
      name: "Professional", price: "$79", period: "/mo", desc: "For growing teams that need more power.",
      color: "#f0fdf4", border: "#16a34a", badge: "Most Popular",
      features: ["Up to 15 agents", "Unlimited tickets", "AI reply suggestions", "Advanced analytics", "Task management", "Priority support"],
      cta: "Start Free Trial", ctaStyle: "solid",
    },
    {
      name: "Business", price: "$199", period: "/mo", desc: "Enterprise-grade for large support teams.",
      color: "#0f172a", border: "#1e293b", badge: null,
      features: ["Unlimited agents", "Unlimited tickets", "AI summary & suggestions", "Custom analytics", "API access", "Dedicated account manager", "SLA guarantee"],
      cta: "Contact Sales", ctaStyle: "dark",
    },
  ];

  return (
    <div className="landing">
      {/* Nav */}
      <nav className={`landing-nav ${scrolled ? "scrolled" : ""}`}>
        <div className="nav-inner">
          <div className="nav-logo">
            <div className="nav-logo-icon">S</div>
            <span>Shops<strong>CRM</strong></span>
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
        <div className="hero-badge">🚀 Trusted by 2,000+ support teams</div>
        <h1 className="hero-title">
          Support that feels like<br />
          <span className="hero-highlight">magic</span> to your customers
        </h1>
        <p className="hero-sub">
          ShopsCRM brings all your customer conversations, tasks, and analytics into one beautiful workspace. Respond faster, resolve smarter, retain longer.
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
          <span>Join <strong>2,000+</strong> teams already using ShopsCRM</span>
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

      {/* Features */}
      <section className="features" id="features">
        <div className="section-label">Features</div>
        <h2 className="section-title">Everything your support team needs</h2>
        <p className="section-sub">From inbox to analytics — ShopsCRM has every tool to make your customers happy and your team efficient.</p>
        <div className="features-grid">
          {features.map((f, i) => (
            <div key={i} className="feature-card" style={{ background: f.color, borderColor: f.accent + "33" }}>
              <div className="feature-emoji" style={{ background: f.accent + "22" }}>{f.emoji}</div>
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
            <div key={i} className="pricing-card" style={{ background: plan.color, borderColor: plan.border, border: `2px solid ${plan.border}` }}>
              {plan.badge && <div className="pricing-badge">{plan.badge}</div>}
              <div className="pricing-name" style={{ color: plan.name === "Business" ? "#94a3b8" : "#6b7280" }}>{plan.name}</div>
              <div className="pricing-price" style={{ color: plan.name === "Business" ? "#fff" : "#111827" }}>
                {plan.price}<span style={{ color: plan.name === "Business" ? "#64748b" : "#9ca3af" }}>{plan.period}</span>
              </div>
              <p className="pricing-desc" style={{ color: plan.name === "Business" ? "#64748b" : "#6b7280" }}>{plan.desc}</p>
              <ul className="pricing-features">
                {plan.features.map((f, j) => (
                  <li key={j} style={{ color: plan.name === "Business" ? "#cbd5e1" : "#374151" }}>
                    <span style={{ color: "#16a34a" }}>✓</span> {f}
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
        <p>Join 2,000+ teams using ShopsCRM to deliver world-class support.</p>
        <button className="hero-cta-primary" onClick={() => setMode("register")}>Get started for free →</button>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-logo">
          <div className="nav-logo-icon">S</div>
          <span>Shops<strong>CRM</strong></span>
        </div>
        <p>© 2026 ShopsCRM. Built for modern support teams.</p>
      </footer>

      {/* Auth Modal */}
      {mode && (
        <div className="auth-overlay" onClick={() => { setMode(null); setInviteToken(null); }}>
          <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
            <button className="auth-close" onClick={() => { setMode(null); setInviteToken(null); }}>×</button>
            <div className="auth-logo">
              <div className="nav-logo-icon">S</div>
              <span>Shops<strong>CRM</strong></span>
            </div>
            {inviteToken && mode === "register" && (
              <div className="invite-banner">
                🎉 You've been invited! Create your account to join the workspace.
              </div>
            )}
            <h2>{mode === "login" ? "Welcome back 👋" : "Create your account"}</h2>
            <p className="auth-sub">{mode === "login" ? "Sign in to your workspace" : "Start your free trial today"}</p>
            {error && <div className="auth-error">{error}</div>}
            {mode === "register" && (
              <input
                placeholder="Full name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
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