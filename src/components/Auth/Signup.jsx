import { useMemo, useState } from "react";
import "./Auth.css";
import GoogleButton from "./GoogleButton";
import { register, validateInvite } from "../../api";

const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const capped = Math.min(score, 4);
  const labels = ["Weak", "Weak", "Fair", "Good", "Strong"];
  return { score: capped, label: labels[capped] };
};

const Signup = ({ onSuccess, onSwitchToLogin, inviteToken }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) return setError("Please enter your full name.");
    if (!email.trim()) return setError("Please enter your email.");
    if (!password.trim()) return setError("Please enter a password.");
    if (!inviteToken && !orgName.trim()) return setError("Please enter your organization name.");
    if (!agreedToTerms) return setError("Please accept the Terms of Service to continue.");

    setLoading(true);
    try {
      if (inviteToken) {
        const result = await validateInvite(inviteToken);
        if (!result.valid) {
          setError(result.message || "Invalid or expired invite link.");
          setLoading(false);
          return;
        }
      }
      await register(name, email, password, "AGENT", inviteToken, orgName);
      onSuccess();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo-icon">A</div>
          <span>Agent<strong>CRM</strong></span>
        </div>

        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Start your free trial today</p>

        {error && <div className="auth-error">{error}</div>}

        {inviteToken && (
          <div className="auth-invite-banner">
            You've been invited! Create your account to join the workspace.
          </div>
        )}

        <GoogleButton onSuccess={onSuccess} onError={setError} />

        <div className="auth-divider"><span>or</span></div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label className="auth-label" htmlFor="signup-name">Full name</label>
          <input
            id="signup-name"
            type="text"
            className="auth-input"
            placeholder="Jane Cooper"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <label className="auth-label" htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
            type="email"
            className="auth-input"
            placeholder="you@company.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label className="auth-label" htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            type="password"
            className="auth-input"
            placeholder="••••••••"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {password && (
            <div className="password-strength">
              <div className="password-strength-bar">
                <div
                  className={`password-strength-fill strength-${strength.score}`}
                  style={{ width: `${(strength.score / 4) * 100}%` }}
                />
              </div>
              <span className={`password-strength-label strength-${strength.score}`}>
                {strength.label}
              </span>
            </div>
          )}

          {!inviteToken && (
            <>
              <label className="auth-label" htmlFor="signup-org">Organization name</label>
              <input
                id="signup-org"
                type="text"
                className="auth-input"
                placeholder="Acme Inc."
                autoComplete="organization"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
            </>
          )}

          <label className="auth-terms">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
            />
            <span>I agree to the Terms of Service and Privacy Policy</span>
          </label>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{" "}
          <button type="button" onClick={onSwitchToLogin}>Log in</button>
        </p>
      </div>
    </div>
  );
};

export default Signup;
