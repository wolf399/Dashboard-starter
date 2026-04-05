import React, { useState, useEffect } from "react";
import "./Settings.css";
import { generateInvite, getOrganization, connectImap, disconnectImap, getImapStatus, syncImap } from "../../api";

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const InviteSection = () => {
  const [inviteLink, setInviteLink] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [expiresAt, setExpiresAt] = useState(null);
  const [supportEmail, setSupportEmail] = useState("");

  useEffect(() => {
    getOrganization().then(org => {
      if (org.inboundEmail) setSupportEmail(org.inboundEmail);
    }).catch(console.error);
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const data = await generateInvite();
      const link = `https://dashboard-starter-self.vercel.app?invite=${data.token}`;
      setInviteLink(link);
      setExpiresAt(data.expiresAt);
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(supportEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <div className="invite-section">
      {supportEmail && (
        <div className="invite-link-box" style={{ background: "#eff6ff", borderColor: "#bfdbfe" }}>
          <div className="invite-link-header">
            <span className="invite-link-label" style={{ color: "#3b82f6" }}>📧 Your Support Email</span>
          </div>
          <div className="invite-link-row">
            <input readOnly value={supportEmail} className="invite-link-input" />
            <button className="invite-copy-btn" style={{ background: "#3b82f6" }} onClick={handleCopyEmail}>
              {copiedEmail ? "✅ Copied!" : "Copy"}
            </button>
          </div>
          <p className="invite-hint">Share this email with your customers. Emails sent here will appear as tickets in your inbox.</p>
        </div>
      )}
      <div className="invite-info">
        <p>Share an invite link with your teammates. Each link is valid for <strong>7 days</strong> and can only be used <strong>once</strong>.</p>
      </div>
      <button className="settings-save-btn" onClick={handleGenerate} disabled={generating}>
        {generating ? "Generating..." : "✨ Generate Invite Link"}
      </button>
      {inviteLink && (
        <div className="invite-link-box">
          <div className="invite-link-header">
            <span className="invite-link-label">🔗 Invite Link</span>
            {expiresAt && (
              <span className="invite-expires">
                Expires {new Date(expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
          </div>
          <div className="invite-link-row">
            <input readOnly value={inviteLink} className="invite-link-input" />
            <button className="invite-copy-btn" onClick={handleCopy}>
              {copied ? "✅ Copied!" : "Copy"}
            </button>
          </div>
          <p className="invite-hint">Send this link to your teammate. They'll create an account and land straight in the app.</p>
        </div>
      )}
    </div>
  );
};

const EmailSection = ({ addToast }) => {
  const [status, setStatus] = useState(null);
  const [form, setForm] = useState({ email: "", password: "", host: "imap.gmail.com", port: 993 });
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    getImapStatus().then(setStatus).catch(console.error);
  }, []);

  const handleConnect = async () => {
    if (!form.email || !form.password) {
      addToast("Email and password are required", "error");
      return;
    }
    setConnecting(true);
    try {
      await connectImap(form);
      setStatus({ imapEmail: form.email, imapEnabled: true, lastImapSync: new Date() });
      addToast("Email connected successfully!", "success");
      setForm({ email: "", password: "", host: "imap.gmail.com", port: 993 });
    } catch (err) {
      addToast(err.message || "Failed to connect", "error");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectImap();
      setStatus({ imapEmail: null, imapEnabled: false, lastImapSync: null });
      addToast("Email disconnected", "info");
    } catch (err) {
      addToast("Failed to disconnect", "error");
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncImap();
      setStatus(prev => ({ ...prev, lastImapSync: new Date() }));
      addToast("Inbox synced!", "success");
    } catch (err) {
      addToast(err.message || "Sync failed", "error");
    } finally {
      setSyncing(false);
    }
  };

  const providerHints = [
    { name: "Gmail", host: "imap.gmail.com", port: 993 },
    { name: "Outlook", host: "outlook.office365.com", port: 993 },
    { name: "Yahoo", host: "imap.mail.yahoo.com", port: 993 },
  ];

  return (
    <div className="email-section">
      {status?.imapEnabled ? (
        <div className="email-connected">
          <div className="email-connected-header">
            <div className="email-status-dot" />
            <div>
              <div className="email-connected-title">Email Connected</div>
              <div className="email-connected-address">{status.imapEmail}</div>
            </div>
            <span className="email-connected-badge">Active</span>
          </div>
          {status.lastImapSync && (
            <p className="email-last-sync">
              Last synced: {new Date(status.lastImapSync).toLocaleString()}
            </p>
          )}
          <div className="email-actions">
            <button className="email-sync-btn" onClick={handleSync} disabled={syncing}>
              {syncing ? "Syncing..." : "🔄 Sync Now"}
            </button>
            <button className="email-disconnect-btn" onClick={handleDisconnect}>
              Disconnect
            </button>
          </div>
          <div className="email-info-box">
            <p>✅ Emails sent to <strong>{status.imapEmail}</strong> will automatically appear as tickets in your inbox. New emails are checked every 60 seconds.</p>
          </div>
        </div>
      ) : (
        <div className="email-connect-form">
          <div className="provider-hints">
            {providerHints.map((p) => (
              <button
                key={p.name}
                className="provider-chip"
                onClick={() => setForm(f => ({ ...f, host: p.host, port: p.port }))}
              >
                {p.name}
              </button>
            ))}
          </div>
          <div className="settings-form">
            <div className="settings-form-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="support@yourcompany.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="settings-form-group">
              <label>
                App Password
                <span className="field-hint" style={{ marginLeft: 6 }}>
                  (Gmail: myaccount.google.com → Security → App Passwords)
                </span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Your app password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  style={{ paddingRight: "3rem" }}
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>
            <div className="form-row">
              <div className="settings-form-group">
                <label>IMAP Host</label>
                <input
                  placeholder="imap.gmail.com"
                  value={form.host}
                  onChange={(e) => setForm({ ...form, host: e.target.value })}
                />
              </div>
              <div className="settings-form-group">
                <label>Port</label>
                <input
                  type="number"
                  placeholder="993"
                  value={form.port}
                  onChange={(e) => setForm({ ...form, port: Number(e.target.value) })}
                />
              </div>
            </div>
            <button className="settings-save-btn" onClick={handleConnect} disabled={connecting}>
              {connecting ? "Connecting & testing..." : "Connect Email"}
            </button>
          </div>
          <div className="email-help-box">
            <strong>How to get a Gmail App Password:</strong>
            <ol>
              <li>Go to myaccount.google.com → Security</li>
              <li>Enable 2-Step Verification if not already on</li>
              <li>Search "App Passwords" → Select app: Mail</li>
              <li>Copy the 16-character password and paste it above</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

const Settings = ({ addToast }) => {
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const [activeTab, setActiveTab] = useState("profile");

  const [profileForm, setProfileForm] = useState({
    name: currentUser.name || "",
    email: currentUser.email || "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const initials = profileForm.name
    ? profileForm.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "A";

  const handleProfileSave = async () => {
    if (!profileForm.name.trim()) { addToast("Name is required", "error"); return; }
    setSavingProfile(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/users/${currentUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: profileForm.name, email: profileForm.email }),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      const updatedUser = { ...currentUser, name: profileForm.name, email: profileForm.email };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      addToast("Profile updated successfully!", "success");
    } catch (err) {
      addToast(err.message || "Failed to update profile", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSave = async () => {
    if (!passwordForm.currentPassword) { addToast("Enter your current password", "error"); return; }
    if (passwordForm.newPassword.length < 6) { addToast("New password must be at least 6 characters", "error"); return; }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { addToast("Passwords don't match", "error"); return; }
    setSavingPassword(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/users/${currentUser.id}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }),
      });
      if (!res.ok) throw new Error("Current password is incorrect");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      addToast("Password changed successfully!", "success");
    } catch (err) {
      addToast(err.message || "Failed to change password", "error");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="Settings">
      <div className="settings-header">
        <h1>Settings</h1>
        <span className="settings-sub">Manage your account and preferences</span>
      </div>

      <div className="settings-layout">
        <div className="settings-tabs">
          {[
            { key: "profile", label: "Profile", icon: "👤" },
            { key: "password", label: "Password", icon: "🔒" },
            { key: "preferences", label: "Preferences", icon: "⚙️" },
            { key: "team", label: "Team & Invites", icon: "👥" },
            { key: "email", label: "Email Inbox", icon: "📧" },
          ].map((tab) => (
            <button
              key={tab.key}
              className={`settings-tab ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="settings-content">
          {activeTab === "profile" && (
            <div className="settings-card">
              <div className="settings-card-header">
                <h2>Profile Information</h2>
                <p>Update your name and email address</p>
              </div>
              <div className="profile-avatar-section">
                <div className="profile-avatar-large">{initials}</div>
                <div>
                  <div className="profile-avatar-name">{profileForm.name}</div>
                  <div className="profile-avatar-role">{currentUser.role || "AGENT"}</div>
                </div>
              </div>
              <div className="settings-form">
                <div className="settings-form-group">
                  <label>Full Name</label>
                  <input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} placeholder="Your full name" />
                </div>
                <div className="settings-form-group">
                  <label>Email Address</label>
                  <input type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} placeholder="your@email.com" />
                </div>
                <div className="settings-form-group">
                  <label>Role</label>
                  <input value={currentUser.role || "AGENT"} disabled className="disabled-input" />
                  <span className="field-hint">Role can only be changed by an admin</span>
                </div>
                <button className="settings-save-btn" onClick={handleProfileSave} disabled={savingProfile}>
                  {savingProfile ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          )}

          {activeTab === "password" && (
            <div className="settings-card">
              <div className="settings-card-header">
                <h2>Change Password</h2>
                <p>Make sure your account is using a strong password</p>
              </div>
              <div className="settings-form">
                <div className="settings-form-group">
                  <label>Current Password</label>
                  <input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} placeholder="Enter current password" />
                </div>
                <div className="settings-form-group">
                  <label>New Password</label>
                  <input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} placeholder="Min. 6 characters" />
                </div>
                <div className="settings-form-group">
                  <label>Confirm New Password</label>
                  <input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} placeholder="Repeat new password" />
                </div>
                {passwordForm.newPassword && (
                  <div className="password-strength">
                    <div className="strength-bars">
                      {[1,2,3,4].map((i) => (
                        <div key={i} className="strength-bar" style={{ background: passwordForm.newPassword.length >= i * 3 ? i <= 1 ? "#dc2626" : i <= 2 ? "#d97706" : "#16a34a" : "#e5e7eb" }} />
                      ))}
                    </div>
                    <span className="strength-label">
                      {passwordForm.newPassword.length < 4 ? "Weak" : passwordForm.newPassword.length < 8 ? "Fair" : passwordForm.newPassword.length < 12 ? "Good" : "Strong"}
                    </span>
                  </div>
                )}
                <button className="settings-save-btn" onClick={handlePasswordSave} disabled={savingPassword}>
                  {savingPassword ? "Changing..." : "Change Password"}
                </button>
              </div>
            </div>
          )}

          {activeTab === "preferences" && (
            <div className="settings-card">
              <div className="settings-card-header">
                <h2>Preferences</h2>
                <p>Customize your ShopsCRM experience</p>
              </div>
              <div className="preferences-list">
                {[
                  { label: "Email notifications", sub: "Get notified when a ticket is assigned to you", key: "emailNotif", default: true },
                  { label: "Sound alerts", sub: "Play a sound when a new message arrives", key: "soundAlerts", default: false },
                  { label: "Show ticket previews", sub: "Show message preview in the inbox list", key: "ticketPreviews", default: true },
                  { label: "Compact inbox view", sub: "Show more tickets with a denser layout", key: "compactInbox", default: false },
                ].map((pref) => (
                  <div key={pref.key} className="preference-row">
                    <div className="preference-info">
                      <span className="preference-label">{pref.label}</span>
                      <span className="preference-sub">{pref.sub}</span>
                    </div>
                    <label className="toggle">
                      <input type="checkbox" defaultChecked={pref.default} />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                ))}
              </div>
              <div className="settings-card-header" style={{ marginTop: "2rem" }}>
                <h2>Danger Zone</h2>
                <p>Irreversible actions — proceed with caution</p>
              </div>
              <button className="danger-btn">Delete Account</button>
            </div>
          )}

          {activeTab === "team" && (
            <div className="settings-card">
              <div className="settings-card-header">
                <h2>Team & Invites</h2>
                <p>Invite teammates to join your workspace</p>
              </div>
              <InviteSection />
            </div>
          )}

          {activeTab === "email" && (
            <div className="settings-card">
              <div className="settings-card-header">
                <h2>Email Inbox</h2>
                <p>Connect your email so customer emails become tickets automatically</p>
              </div>
              <EmailSection addToast={addToast} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;