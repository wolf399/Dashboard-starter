import './App.css';
import Sidebar from './components/Sidebar/Sidebar';
import MainDash from './components/MainDash/MainDash';
import LandingPage from './components/LandingPage/LandingPage';
import Toast from './components/Toast/Toast';
import useToast from './hooks/useToast';
import { useState, useEffect } from "react";
import { logout, getTickets } from './api';

const parseContactId = (pathname) => {
  const match = pathname.match(/^\/contacts\/([^/]+)\/?$/);
  return match ? match[1] : null;
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeView, setActiveView] = useState("Dashboard");
  const [activeTicket, setActiveTicket] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [contactDetailId, setContactDetailId] = useState(null);
  const { toasts, addToast, removeToast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get("invite");

    // If invite link, force show register form
    if (inviteToken) {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      setIsLoggedIn(false);
      return;
    }

    const token = sessionStorage.getItem('token');
    if (token) setIsLoggedIn(true);

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

  useEffect(() => {
    if (!isLoggedIn) return;
    getTickets().then(setTickets).catch(console.error);
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
    return <LandingPage onEnterApp={() => setIsLoggedIn(true)} />;
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
    </div>
  );
}

export default App;