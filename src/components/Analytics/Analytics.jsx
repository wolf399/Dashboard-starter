import React, { useEffect, useState } from "react";
import "./Analytics.css";
import { getTickets, getCustomers } from "../../api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from "recharts";

const COLORS = {
  OPEN:    "#16a34a",
  PENDING: "#d97706",
  CLOSED:  "#6b7280",
};

const Analytics = () => {
  const [tickets, setTickets] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getTickets(), getCustomers()])
      .then(([t, c]) => { setTickets(t); setCustomers(c); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="analytics-loading">Loading analytics...</div>;

  // --- Data processing ---

  // 1. Status breakdown for pie chart
  const statusData = ["OPEN", "PENDING", "CLOSED"].map((s) => ({
    name: s,
    value: tickets.filter((t) => t.status === s).length,
  }));

  // 2. Priority breakdown
  const priorityData = ["HIGH", "MEDIUM", "LOW"].map((p) => ({
    name: p,
    value: tickets.filter((t) => t.priority === p).length,
  }));

  // 3. Tickets per day (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });

  const ticketsPerDay = last7Days.map((day) => ({
    date: new Date(day).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    tickets: tickets.filter((t) => t.createdAt?.split("T")[0] === day).length,
  }));

  // 4. Customer activity
  const activeCustomers = customers.filter((c) => c.status === "ACTIVE").length;
  const inactiveCustomers = customers.filter((c) => c.status === "INACTIVE").length;
  const customerData = [
    { name: "Active", value: activeCustomers },
    { name: "Inactive", value: inactiveCustomers },
  ];

  // 5. Resolution rate
  const total = tickets.length;
  const closed = tickets.filter((t) => t.status === "CLOSED").length;
  const resolutionRate = total > 0 ? Math.round((closed / total) * 100) : 0;

  // 6. Top customers by ticket count
  const customerTicketMap = {};
  tickets.forEach((t) => {
    const name = t.customer?.name || "Unknown";
    customerTicketMap[name] = (customerTicketMap[name] || 0) + 1;
  });
  const topCustomers = Object.entries(customerTicketMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return (
    <div className="Analytics">
      {/* Header */}
      <div className="analytics-header">
        <h1>Analytics</h1>
        <span className="analytics-date">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </span>
      </div>

      {/* KPI Row */}
      <div className="kpi-row">
        <div className="kpi-card">
          <span className="kpi-label">Total Tickets</span>
          <strong className="kpi-value">{total}</strong>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Resolution Rate</span>
          <strong className="kpi-value" style={{ color: "#16a34a" }}>{resolutionRate}%</strong>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Open Tickets</span>
          <strong className="kpi-value" style={{ color: "#16a34a" }}>
            {tickets.filter((t) => t.status === "OPEN").length}
          </strong>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Pending</span>
          <strong className="kpi-value" style={{ color: "#d97706" }}>
            {tickets.filter((t) => t.status === "PENDING").length}
          </strong>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Total Customers</span>
          <strong className="kpi-value" style={{ color: "#3b82f6" }}>{customers.length}</strong>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="charts-row">
        {/* Tickets per day */}
        <div className="chart-card wide">
          <h3>Tickets Created — Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={ticketsPerDay}>
              <defs>
                <linearGradient id="ticketGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "0.8rem" }} />
              <Area type="monotone" dataKey="tickets" stroke="#16a34a" strokeWidth={2} fill="url(#ticketGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status pie */}
        <div className="chart-card">
          <h3>Ticket Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                {statusData.map((entry) => (
                  <Cell key={entry.name} fill={COLORS[entry.name]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "0.8rem" }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "0.75rem" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="charts-row">
        {/* Priority breakdown */}
        <div className="chart-card">
          <h3>Tickets by Priority</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={priorityData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "0.8rem" }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {priorityData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={entry.name === "HIGH" ? "#dc2626" : entry.name === "MEDIUM" ? "#d97706" : "#16a34a"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top customers */}
        <div className="chart-card wide">
          <h3>Top Customers by Tickets</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topCustomers} layout="vertical" barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#374151" }} axisLine={false} tickLine={false} width={100} />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "0.8rem" }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Customer breakdown */}
      <div className="charts-row">
        <div className="chart-card">
          <h3>Customer Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={customerData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                <Cell fill="#16a34a" />
                <Cell fill="#e5e7eb" />
              </Pie>
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "0.8rem" }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "0.75rem" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Resolution rate card */}
        <div className="chart-card resolution-card">
          <h3>Resolution Rate</h3>
          <div className="resolution-circle">
            <svg viewBox="0 0 120 120" width="140" height="140">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#f3f4f6" strokeWidth="10" />
              <circle
                cx="60" cy="60" r="50"
                fill="none"
                stroke="#16a34a"
                strokeWidth="10"
                strokeDasharray={`${2 * Math.PI * 50}`}
                strokeDashoffset={`${2 * Math.PI * 50 * (1 - resolutionRate / 100)}`}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
                style={{ transition: "stroke-dashoffset 1s ease" }}
              />
              <text x="60" y="60" textAnchor="middle" dominantBaseline="middle" fontSize="20" fontWeight="800" fill="#111827">
                {resolutionRate}%
              </text>
              <text x="60" y="78" textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="#9ca3af">
                RESOLVED
              </text>
            </svg>
          </div>
          <div className="resolution-stats">
            <div className="resolution-stat">
              <span style={{ color: "#16a34a" }}>●</span>
              <span>Closed: {closed}</span>
            </div>
            <div className="resolution-stat">
              <span style={{ color: "#d97706" }}>●</span>
              <span>Pending: {tickets.filter(t => t.status === "PENDING").length}</span>
            </div>
            <div className="resolution-stat">
              <span style={{ color: "#6b7280" }}>●</span>
              <span>Open: {tickets.filter(t => t.status === "OPEN").length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;