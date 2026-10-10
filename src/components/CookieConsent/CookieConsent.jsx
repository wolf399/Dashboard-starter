import React, { useEffect, useState } from "react";
import "./CookieConsent.css";

const STORAGE_KEY = "agentcrm_cookie_consent";

function updateConsent(granted) {
  if (typeof window.gtag !== "function") return;
  window.gtag("consent", "update", {
    analytics_storage: granted ? "granted" : "denied",
    ad_storage: granted ? "granted" : "denied",
    ad_user_data: granted ? "granted" : "denied",
    ad_personalization: granted ? "granted" : "denied",
  });
}

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "granted") {
      updateConsent(true);
    } else if (stored === "denied") {
      updateConsent(false);
    } else {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    updateConsent(true);
    localStorage.setItem(STORAGE_KEY, "granted");
    setVisible(false);
  };

  const handleReject = () => {
    updateConsent(false);
    localStorage.setItem(STORAGE_KEY, "denied");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="cookie-consent-banner" role="dialog" aria-live="polite" aria-label="Cookie consent">
      <div className="cookie-consent-text">
        <strong>We use cookies.</strong> We use analytics cookies to understand how
        visitors use AgentCRM. You can accept or reject non-essential cookies — see
        our <a href="/privacy.html">Privacy Policy</a> for details.
      </div>
      <div className="cookie-consent-actions">
        <button className="cookie-consent-btn cookie-consent-reject" onClick={handleReject}>
          Reject
        </button>
        <button className="cookie-consent-btn cookie-consent-accept" onClick={handleAccept}>
          Accept
        </button>
      </div>
    </div>
  );
};

export default CookieConsent;