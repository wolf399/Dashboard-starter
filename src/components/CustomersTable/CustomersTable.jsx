import React, { useState } from "react";
import { UilEnvelope, UilPhone, UilBuilding, UilEllipsisV } from "@iconscout/react-unicons";
import "./CustomersTable.css";
import CustomerPanel from "../CustomerPanel/CustomerPanel";

const statusColors = {
  active:   { bg: "#dcfce7", color: "#16a34a" },
  inactive: { bg: "#fee2e2", color: "#dc2626" },
};

const TAG_COLORS = {
  vip:        { bg: "#fef3c7", color: "#d97706" },
  "at-risk":  { bg: "#fee2e2", color: "#dc2626" },
  prospect:   { bg: "#ede9fe", color: "#7c3aed" },
  churned:    { bg: "#fecaca", color: "#b91c1c" },
  enterprise: { bg: "#dbeafe", color: "#1d4ed8" },
  lead:       { bg: "#f0fdf4", color: "#15803d" },
};

const tagStyle = (t) => TAG_COLORS[t.toLowerCase()] || { bg: "#eff6ff", color: "#3b82f6" };

const CustomerTable = ({ data, onCustomerUpdate }) => {
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const handleUpdate = (updated) => {
    if (selectedCustomer?.id === updated.id) setSelectedCustomer(updated);
    onCustomerUpdate?.(updated);
  };

  return (
    <>
      <div className="customer-table-wrapper">
        <table className="customer-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Contact</th>
              <th>Status</th>
              <th>Last Activity</th>
              <th>Tags</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.map((c) => {
              const tags = c.tags
                ? typeof c.tags === "string"
                  ? c.tags.split(",").map((t) => t.trim()).filter(Boolean)
                  : c.tags
                : [];

              const status = c.status?.toLowerCase();
              const statusStyle = statusColors[status] || { bg: "#f3f4f6", color: "#6b7280" };

              const lastActivity = c.lastActivity
                ? new Date(c.lastActivity).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                  })
                : "—";

              return (
                <tr key={c.id} onClick={() => setSelectedCustomer(c)} style={{ cursor: "pointer" }}>
                  <td className="customer-info">
                    <div className="avatar">{c.name.charAt(0)}</div>
                    <div className="info">
                      <div className="name">{c.name}</div>
                      {c.company && <div className="company"><UilBuilding size={13} /> {c.company}</div>}
                    </div>
                  </td>

                  <td className="contact-cell">
                    {c.email && <div className="email"><UilEnvelope size={13} /> {c.email}</div>}
                    {c.phone && <div className="phone"><UilPhone size={13} /> {c.phone}</div>}
                  </td>

                  <td>
                    <span className="status-badge" style={{ background: statusStyle.bg, color: statusStyle.color }}>
                      {c.status}
                    </span>
                  </td>

                  <td className="last-activity">{lastActivity}</td>

                  <td className="tags">
                    {tags.map((t) => (
                      <span key={t} className="tag" style={tagStyle(t)}>{t}</span>
                    ))}
                  </td>

                  <td className="actions">
                    <button
                      className="action-btn"
                      onClick={(e) => { e.stopPropagation(); setSelectedCustomer(c); }}
                    >
                      <UilEllipsisV size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedCustomer && (
        <CustomerPanel
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onUpdate={handleUpdate}
        />
      )}
    </>
  );
};

export default CustomerTable;
