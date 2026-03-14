import React, { useEffect, useState } from "react";
import "./CustomerPanel.css";
import { getTickets } from "../../api";
import { UilTimes, UilEnvelope, UilPhone, UilBuilding, UilTicket } from "@iconscout/react-unicons";

const statusColors = {
  OPEN:    { bg: "#dcfce7", color: "#16a34a" },
  PENDING: { bg: "#fef3c7", color: "#d97706" },
  CLOSED:  { bg: "#f3f4f6", color: "#6b7280" },
};

const CustomerPanel = ({ customer, onClose }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customer) return;
    getTickets()
      .then((all) => {
        setTickets(all.filter((t) => t.customerId === customer.id));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [customer?.id]);

  if (!customer) return null;

  const tags = customer.tags
    ? typeof customer.tags === "string"
      ? customer.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : customer.tags
    : [];

  const open = tickets.filter((t) => t.status === "OPEN").length;
  const closed = tickets.filter((t) => t.status === "CLOSED").length;

  return (
    <div className="panel-overlay" onClick={onClose}>
      <div className="customer-panel" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="panel-header">
          <h2>Customer Profile</h2>
          <button className="panel-close" onClick={onClose}>
            <UilTimes size="20" />
          </button>
        </div>

        {/* Profile */}
        <div className="panel-profile">
          <div className="panel-avatar">{customer.name.charAt(0)}</div>
          <div className="panel-identity">
            <h3>{customer.name}</h3>
            {customer.company && (
              <span className="panel-company">
                <UilBuilding size={13} /> {customer.company}
              </span>
            )}
          </div>
          <span
            className="panel-status"
            style={{
              background: customer.status === "ACTIVE" ? "#dcfce7" : "#fee2e2",
              color: customer.status === "ACTIVE" ? "#16a34a" : "#dc2626",
            }}
          >
            {customer.status}
          </span>
        </div>

        {/* Contact */}
        <div className="panel-section">
          <h4>Contact</h4>
          <div className="panel-contact">
            {customer.email && (
              <div className="panel-contact-row">
                <UilEnvelope size={15} />
                <span>{customer.email}</span>
              </div>
            )}
            {customer.phone && (
              <div className="panel-contact-row">
                <UilPhone size={15} />
                <span>{customer.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="panel-section">
            <h4>Tags</h4>
            <div className="panel-tags">
              {tags.map((t) => (
                <span key={t} className="tag">{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="panel-stats">
          <div className="panel-stat">
            <strong>{tickets.length}</strong>
            <span>Total</span>
          </div>
          <div className="panel-stat">
            <strong style={{ color: "#16a34a" }}>{open}</strong>
            <span>Open</span>
          </div>
          <div className="panel-stat">
            <strong style={{ color: "#6b7280" }}>{closed}</strong>
            <span>Closed</span>
          </div>
        </div>

        {/* Ticket History */}
        <div className="panel-section">
          <h4>Ticket History</h4>
          {loading ? (
            <p className="panel-empty">Loading...</p>
          ) : tickets.length === 0 ? (
            <p className="panel-empty">No tickets yet.</p>
          ) : (
            <div className="panel-tickets">
              {tickets.map((t) => {
                const s = statusColors[t.status] || statusColors.CLOSED;
                return (
                  <div key={t.id} className="panel-ticket-row">
                    <div className="panel-ticket-icon">
                      <UilTicket size={16} />
                    </div>
                    <div className="panel-ticket-info">
                      <span className="panel-ticket-subject">{t.subject}</span>
                      <span className="panel-ticket-date">
                        {new Date(t.createdAt).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric"
                        })}
                      </span>
                    </div>
                    <span
                      className="panel-ticket-status"
                      style={{ background: s.bg, color: s.color }}
                    >
                      {t.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default CustomerPanel;