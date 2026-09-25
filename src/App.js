import './App.css';
import { Analytics } from '@vercel/analytics/react';
import Sidebar from './components/Sidebar/Sidebar';
import MainDash from './components/MainDash/MainDash';
import LandingPage from './components/LandingPage/LandingPage';
import Onboarding from './components/Onboarding/Onboarding';
import Toast from './components/Toast/Toast';
import useToast from './hooks/useToast';
import { useState, useEffect } from "react";
import { logout, getTickets } from './api';

const parseContactId = (pathname) => {
  const match = pathname.match(/^\/contacts\/([^/]+)\/?$/);
  return match ? match[1] : null;
};

const isOnboardingDone = () => {
  try { return localStorage.getItem("agentcrm_onboarding_done") === "1"; } catch (_) { return false; }
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeView, setActiveView] = useState("Dashboard");
  const [activeTicket, setActiveTicket] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [contactDetailId, setContactDetailId] = useState(null);
  const { toasts, addToast, removeToast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get("invite");
    const gmailConnected = params.get("gmailConnected") === "true";

    // If invite link, force show register form
    if (inviteToken) {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      setIsLoggedIn(false);
      return;
    }

    const token = sessionStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
      // Returning from the Gmail OAuth redirect mid-onboarding — resume the
      // wizard instead of dropping the user on a bare dashboard.
      if (gmailConnected && !isOnboardingDone()) {
        setShowOnboarding(true);
      }
    }

    const id = parseContactId(window.location.pathname);
    if (id) {
      setActiveView("Contacts");
      setContactDetailId(id);
    }
  }, []);

  useEffect(() => {
    const onPopState = () => setContactDetailId(parseContactId(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const openContact = (id) => {
    window.history.pushState({}, "", `/contacts/${id}`);
    setActiveView("Contacts");
    setContactDetailId(id);
  };

  const closeContactDetail = () => {
    window.history.pushState({}, "", "/");
    setContactDetailId(null);
  };

  // Fetch tickets on login, then keep polling so new emails/WhatsApp
  // messages (which create new tickets) show up without a manual reload.
  useEffect(() => {
    if (!isLoggedIn) return;

    const fetchTickets = () => getTickets().then(setTickets).catch(console.error);

    fetchTickets();
    const interval = setInterval(fetchTickets, 15000); // poll every 15s

    return () => clearInterval(interval);
  }, [isLoggedIn]);

  const handleTicketUpdate = (updatedTicket) => {
    setTickets((prev) => {
      const exists = prev.find((t) => t.id === updatedTicket.id);
      if (exists) {
        return prev.map((t) => t.id === updatedTicket.id ? { ...t, ...updatedTicket } : t);
      }
      return [updatedTicket, ...prev];
    });
    setActiveTicket((prev) =>
      prev?.id === updatedTicket.id ? { ...prev, ...updatedTicket } : prev
    );
  };

  const handleLogout = () => {
    logout();
    setIsLoggedIn(false);
    addToast("Logged out successfully", "info");
  };

  const handleMenuSelect = (view) => {
    if (view === 'Logout') { handleLogout(); return; }
    if (contactDetailId) {
      window.history.pushState({}, "", "/");
      setContactDetailId(null);
    }
    setActiveView(view);
  };

  if (!isLoggedIn) {
    return (
      <LandingPage
        onEnterApp={() => setIsLoggedIn(true)}
        onSignupSuccess={() => {
          setIsLoggedIn(true);
          if (!isOnboardingDone()) setShowOnboarding(true);
        }}
      />
    );
  }

  if (showOnboarding) {
    return <Onboarding onFinish={() => setShowOnboarding(false)} />;
  }

  return (
    <div className="App">
      <div className="AppGlass flex">
        <Sidebar
          onMenuSelect={handleMenuSelect}
          openTicketCount={tickets.filter(t => t.status === "OPEN").length}
        />
        <MainDash
          activeView={activeView}
          setActiveView={setActiveView}
          activeTicket={activeTicket}
          setActiveTicket={setActiveTicket}
          tickets={tickets}
          onTicketUpdate={handleTicketUpdate}
          addToast={addToast}
          contactDetailId={contactDetailId}
          onOpenContact={openContact}
          onCloseContactDetail={closeContactDetail}
        />
      </div>
      <Toast toasts={toasts} removeToast={removeToast} />
      <Analytics />
    </div>
  );
}

export default App;