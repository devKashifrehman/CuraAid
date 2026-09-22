import React, { useContext, useState } from "react";
import {
  FaTimes,
  FaStar,
  FaCheckCircle,
  FaUserMd,
  FaUser,
  FaRegStar,
} from "react-icons/fa";
import axios from "axios";
import { ThemeContext } from "../../Theme/ThemeContext";
import { AuthContext } from "../../HeadFoot/Auth/AuthContext";
import "./FeedbackModal.css";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

const RATINGS = [
  { value: 5, label: "Excellent" },
  { value: 4, label: "Good" },
  { value: 3, label: "Average" },
  { value: 2, label: "Poor" },
  { value: 1, label: "Very Poor" },
];

const FeedbackModal = ({ against, contextLabel, onClose, onSubmit, consultationId }) => {
  const { darkMode } = useContext(ThemeContext);
  const { token } = useContext(AuthContext);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const validate = () => {
    const errs = {};
    if (!rating) errs.rating = "Rating is required.";
    if (!comment.trim()) {
      errs.comment = "Feedback is required.";
    } else if (comment.trim().length < 10) {
      errs.comment = "Feedback must be at least 10 characters.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    // Optimistic: instant UI update
    setSubmitted(true);
    onSubmit({ rating, comment: comment.trim() });

    // Background API call
    if (consultationId && token) {
      axios.post(
        `${API_BASE_URL}/api/consultations/${consultationId}/review`,
        { rating, review_comment: comment.trim() },
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, timeout: 15000 }
      ).catch((err) => console.error("Feedback API error:", err?.response?.data || err?.message));
    }
  };

  if (submitted) {
    return (
      <div
        className={`fbm-modal-overlay ${darkMode ? "dark" : "light"}`}
        onClick={onClose}
      >
        <div className="fbm-modal-box fbm-success-box" onClick={(e) => e.stopPropagation()}>
          <div className="fbm-success-icon">
            <FaCheckCircle />
          </div>
          <h3>Feedback Submitted</h3>
          <p>
            Thank you for your feedback. It will help us improve our services.
          </p>
          <button className="fbm-modal-btn primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`fbm-modal-overlay ${darkMode ? "dark" : "light"}`} onClick={onClose}>
      <div className="fbm-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="fbm-modal-header">
          <div className="fbm-modal-title">
            <FaStar />
            <h3>Give Feedback</h3>
          </div>
          <button className="fbm-modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        {contextLabel && <p className="fbm-context-label">{contextLabel}</p>}

        {against && (
          <div className="fbm-against">
            {against.role === "Doctor" ? <FaUserMd /> : <FaUser />}
            <div>
              <span className="fbm-against-label">Feedback About</span>
              <strong>
                {against.name}{" "}
                <span className="fbm-against-role">({against.role})</span>
              </strong>
            </div>
          </div>
        )}

        <div className="fbm-field">
          <label>
            Rating <span className="fbm-required">*</span>
          </label>
          <div className="fbm-rating-group">
            {RATINGS.map((r) => (
              <button
                key={r.value}
                type="button"
                className={`fbm-star ${(hoverRating || rating) >= r.value ? "active" : ""}`}
                onMouseEnter={() => setHoverRating(r.value)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => {
                  setRating(r.value);
                  if (errors.rating) setErrors((prev) => ({ ...prev, rating: "" }));
                }}
                title={r.label}
              >
                {(hoverRating || rating) >= r.value ? <FaStar /> : <FaRegStar />}
              </button>
            ))}
            <span className="fbm-rating-label">
              {RATINGS.find((r) => r.value === (hoverRating || rating))?.label ||
                "Select a rating"}
            </span>
          </div>
          {errors.rating && <p className="fbm-error-text">{errors.rating}</p>}
        </div>

        <div className="fbm-field">
          <label>
            Feedback <span className="fbm-required">*</span>
          </label>
          <textarea
            rows="4"
            placeholder="Share your experience (at least 10 characters)..."
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              if (errors.comment) setErrors((prev) => ({ ...prev, comment: "" }));
            }}
            className={errors.comment ? "error" : ""}
          />
          {errors.comment && <p className="fbm-error-text">{errors.comment}</p>}
        </div>

        <div className="fbm-modal-actions">
          <button className="fbm-modal-btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="fbm-modal-btn primary" onClick={handleSubmit}>
            Submit Feedback
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;
