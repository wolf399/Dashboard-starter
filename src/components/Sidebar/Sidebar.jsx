import React from "react";
import "./Sidebar.css";
import { SidebarData } from "../../data/Data";
import { UilSignOutAlt } from "@iconscout/react-unicons";

const Sidebar = ({ onMenuSelect, openTicketCount = 0 }) => {
  const [selected, setSelected] = React.useState(0);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "A";

  const navItems = SidebarData.filter((item) => item.heading !== "Logout");

  return (
    <div className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">S</div>
        <span className="sidebar-logo-text">Shops<span>CRM</span></span>
      </div>

      {/* Nav */}
      <div className="sidebar-section-label">Main Menu</div>
      <nav className="sidebar-nav">
        {navItems.map((item, index) => {
          const isInbox = item.heading === "Inbox";
          return (
            <div
              key={index}
              className={`sidebar-item ${selected === index ? "active" : ""}`}
              onClick={() => {
                setSelected(index);
                onMenuSelect(item.heading);
              }}
            >
              <div className="sidebar-item-icon">
                <item.icon size="18" />
              </div>
              <span className="sidebar-item-label">{item.heading}</span>
              {isInbox && openTicketCount > 0 && (
                <span className="sidebar-badge">{openTicketCount}</span>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="sidebar-bottom">
        <div className="sidebar-divider" />
        <div
          className="sidebar-item logout"
          onClick={() => onMenuSelect("Logout")}
        >
          <div className="sidebar-item-icon">
            <UilSignOutAlt size="18" />
          </div>
          <span className="sidebar-item-label">Logout</span>
        </div>
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user.name || "Agent"}</span>
            <span className="sidebar-user-role">{user.role || "Support Agent"}</span>
          </div>
          <div className="sidebar-user-status" title="Online" />
        </div>
      </div>
    </div>
  );
};

export default Sidebar;