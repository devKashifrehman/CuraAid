import React, { useContext, useState, useRef } from "react";
import {
  FaTimes,
  FaExclamationTriangle,
  FaPaperclip,
  FaCheckCircle,
  FaFlag,
  FaUserMd,
  FaUser,
} from "react-icons/fa";
import axios from "axios";
import { ThemeContext } from "../../Theme/ThemeContext";
import { AuthContext } from "../../HeadFoot/Auth/AuthContext";
import "./ComplaintModal.css";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

const CATEGORIES = [
  "Unprofessional Behavior",
  "Wrong Advice",
  "Misdiagnosis",
  "Charging Issue",
  "Late Response",
  "Follow-up",
  "Other",
];

const PRIORITIES = ["High", "Average", "Low"];

const ComplaintModal = ({ against, contextLabel, onClose, onSubmit, appointmentId, consultationId }) => {
  const { darkMode } = useContext(ThemeContext);
  const { token } = useContext(AuthContext);
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [description, setDescription] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [proofName, setProofName] = useState("");
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef(null);

  const validate = () => {
    const errs = {};
    if (!category) errs.category = "Category is required.";
    if (!priority) errs.priority = "Priority is required.";
    if (!description.trim()) {
      errs.description = "Description is required.";
    } else if (description.trim().length < 20) {
      errs.description = "Description must be at least 20 characters.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    setProofName(file.name);
    setErrors((prev) => ({ ...prev, proof: "" }));
  };

  const handleSubmit = () => {
    if (!validate()) return;
    // Optimistic: instant UI update
    setSubmitted(true);
    onSubmit({ category, priority, description: description.trim(), proof: proofName || null });

    // Background API call with FormData (for file upload)
    if (token && (appointmentId || consultationId)) {
      const formData = new FormData();
      formData.append("category", category);
      formData.append("priority", priority.toLowerCase());
      formData.append("description", description.trim());
      if (appointmentId) formData.append("appointment_id", appointmentId);
      if (consultationId) formData.append("consultation_id", consultationId);
      if (proofFile) formData.append("proof", proofFile);

      axios.post(`${API_BASE_URL}/api/complaints`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        timeout: 30000,
      }).catch((err) => console.error("Complaint API error:", err?.response?.data || err?.message));
    }
  };

  if (submitted) {
    return (
      <div
        className={`cmp-modal-overlay ${darkMode ? "dark" : "light"}`}
        onClick={onClose}
      >
        <div className="cmp-modal-box cmp-success-box" onClick={(e) => e.stopPropagation()}>
          <div className="cmp-success-icon">
            <FaCheckCircle />
          </div>
          <h3>Complaint Submitted</h3>
          <p>
            Your complaint has been sent to our review team. You will be
            notified about the action taken.
          </p>
          <button className="cmp-modal-btn primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`cmp-modal-overlay ${darkMode ? "dark" : "light"}`} onClick={onClose}>
      <div className="cmp-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="cmp-modal-header">
          <div className="cmp-modal-title">
            <FaFlag />
            <h3>File a Complaint</h3>
          </div>
          <button className="cmp-modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        {contextLabel && <p className="cmp-context-label">{contextLabel}</p>}

        {against && (
          <div className="cmp-against">
            {against.role === "Doctor" ? <FaUserMd /> : <FaUser />}
            <div>
              <span className="cmp-against-label">Complaint Against</span>
              <strong>
                {against.name}{" "}
                <span className="cmp-against-role">({against.role})</span>
              </strong>
            </div>
          </div>
        )}

        <div className="cmp-field">
          <label>
            Category <span className="cmp-required">*</span>
          </label>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              if (errors.category)
                setErrors((prev) => ({ ...prev, category: "" }));
            }}
            className={errors.category ? "error" : ""}
          >
            <option value="">Select a category</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {errors.category && <p className="cmp-error-text">{errors.category}</p>}
        </div>

        <div className="cmp-field">
          <label>
            Priority <span className="cmp-required">*</span>
          </label>
          <div className="cmp-priority-group">
            {PRIORITIES.map((p) => (
              <button
                key={p}
                type="button"
                className={`cmp-priority ${priority === p ? p.toLowerCase() : ""}`}
                onClick={() => {
                  setPriority(p);
                  if (errors.priority)
                    setErrors((prev) => ({ ...prev, priority: "" }));
                }}
              >
                {p}
              </button>
            ))}
          </div>
          {errors.priority && <p className="cmp-error-text">{errors.priority}</p>}
        </div>

        <div className="cmp-field">
          <label>
            Description <span className="cmp-required">*</span>
          </label>
          <textarea
            rows="4"
            placeholder="Describe your complaint in detail (at least 20 characters)..."
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (errors.description)
                setErrors((prev) => ({ ...prev, description: "" }));
            }}
            className={errors.description ? "error" : ""}
          />
          {errors.description && (
            <p className="cmp-error-text">{errors.description}</p>
          )}
        </div>

        <div className="cmp-field">
          <label>Attach Proof (optional)</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf"
            style={{ display: "none" }}
            onChange={handleFile}
          />
          <button
            type="button"
            className="cmp-attach-btn"
            onClick={() => fileRef.current?.click()}
          >
            <FaPaperclip /> {proofName || "Attach a file"}
          </button>
        </div>

        <div className="cmp-modal-actions">
          <button className="cmp-modal-btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="cmp-modal-btn primary" onClick={handleSubmit}>
            <FaExclamationTriangle /> Submit Complaint
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComplaintModal;
