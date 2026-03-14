import React, { useEffect, useState } from "react";
import "./Cards.css";
import { getTickets, getCustomers } from "../../api";

const StatCard = ({ title, value, sub, icon, accent }) => (
  <div className="stat-card-dash" style={{ borderTop: `4px solid ${accent}` }}>
    <div className="stat-icon" style={{ background: `${accent}18`, color: accent }}>
      {icon}
    </div>
    <div className="stat-body">
      <span className="stat-title">{title}</span>
      <span className="stat-value">{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  </div>
);

const Cards = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    Promise.all([getTickets(), getCustomers()]).then(([tickets, customers]) => {
      const open = tickets.filter((t) => t.status === "OPEN").length;
      const pending = tickets.filter((t) => t.status === "PENDING").length;
      const closed = tickets.filter((t) => t.status === "CLOSED").length;
      const active = customers.filter((c) => c.status === "ACTIVE").length;
      setStats({ total: tickets.length, open, pending, closed, customers: customers.length, active });
    });
  }, []);

  if (!stats) return <div className="Cards"><p style={{ color: "#9ca3af" }}>Loading stats...</p></div>;

  return (
    <div className="Cards">
      <StatCard title="Total Tickets" value={stats.total} sub={`${stats.open} open · ${stats.pending} pending`} icon="🎫" accent="#6366f1" />
      <StatCard title="Open" value={stats.open} sub="Needs attention" icon="📬" accent="#16a34a" />
      <StatCard title="Pending" value={stats.pending} sub="Awaiting response" icon="⏳" accent="#d97706" />
      <StatCard title="Closed" value={stats.closed} sub="Resolved" icon="✅" accent="#6b7280" />
      <StatCard title="Customers" value={stats.customers} sub={`${stats.active} active`} icon="👥" accent="#3b82f6" />
    </div>
  );
};

export default Cards;