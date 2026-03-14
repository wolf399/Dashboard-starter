import React, { useState, useEffect } from "react";
import "./Customers.css";
import CustomerTable from "../CustomersTable/CustomersTable";
import { UilSearch, UilPlus, UilTimes } from "@iconscout/react-unicons";
import { getCustomers, createCustomer } from "../../api";

const AddCustomerModal = ({ onClose, onSave }) => {
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", tags: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError("Name is required."); return; }
    setSaving(true);
    try {
      const newCustomer = await createCustomer({
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        company: form.company || undefined,
        tags: form.tags || undefined,
      });
      onSave(newCustomer);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create customer.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Customer</h2>
          <button className="modal-close" onClick={onClose}><UilTimes size="20" /></button>
        </div>

        <div className="modal-body">
          {error && <div className="modal-error">{error}</div>}

          <div className="form-group">
            <label>Full Name *</label>
            <input name="name" placeholder="Jenny Wilson" value={form.name} onChange={handleChange} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Email</label>
              <input name="email" type="email" placeholder="jenny@example.com" value={form.email} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input name="phone" placeholder="+1 (555) 000-0000" value={form.phone} onChange={handleChange} />
            </div>
          </div>
          <div className="form-group">
            <label>Company</label>
            <input name="company" placeholder="Acme Inc." value={form.company} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Tags <span className="label-hint">(comma separated)</span></label>
            <input name="tags" placeholder="premium, vip, mobile" value={form.tags} onChange={handleChange} />
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-cancel" onClick={onClose}>Cancel</button>
          <button className="modal-save" onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : "Add Customer"}
          </button>
        </div>
      </div>
    </div>
  );
};

const Customers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    getCustomers()
      .then(setCustomers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalCustomers = customers.length;
  const activeCount = customers.filter((c) => c.status === "ACTIVE").length;
  const vipCount = customers.filter((c) => c.tags?.includes("vip") || c.tags?.includes("VIP")).length;
  const inactiveCount = customers.filter((c) => c.status === "INACTIVE").length;

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCustomerAdded = (newCustomer) => {
    setCustomers((prev) => [newCustomer, ...prev]);
  };

  return (
    <div className="Customers">
      {showModal && (
        <AddCustomerModal
          onClose={() => setShowModal(false)}
          onSave={handleCustomerAdded}
        />
      )}

      <div className="header">
        <h1>Customers</h1>
        <button className="add-btn" onClick={() => setShowModal(true)}>
          <UilPlus size="18" /> Add Customer
        </button>
      </div>

      <div className="stats-container">
        <div className="stat-card">
          <span>Total Customers</span>
          <strong>{totalCustomers}</strong>
        </div>
        <div className="stat-card active-box">
          <span>Active</span>
          <strong className="active-text">{activeCount}</strong>
        </div>
        <div className="stat-card vip-box">
          <span>VIP</span>
          <strong className="vip-text">{vipCount}</strong>
        </div>
        <div className="stat-card">
          <span>Inactive</span>
          <strong>{inactiveCount}</strong>
        </div>
      </div>

      <div className="filter-row">
        <div className="search-box">
          <UilSearch size="18" />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-dropdowns">
          <select className="filter-select"><option>Active</option></select>
          <select className="filter-select"><option>Recently Active</option></select>
        </div>
      </div>

      {loading ? (
        <p style={{ padding: "1rem", color: "#aaa" }}>Loading customers...</p>
      ) : filtered.length === 0 ? (
        <p style={{ padding: "1rem", color: "#aaa" }}>No customers found.</p>
      ) : (
        <CustomerTable data={filtered} />
      )}
    </div>
  );
};

export default Customers;