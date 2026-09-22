import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ThemeContext } from "../Theme/ThemeContext";
import { AuthContext } from "../HeadFoot/Auth/AuthContext";
import RoleSelection from "./RoleSelection/RoleSelection";
import "./Ls.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faPhone,
  faEnvelope,
  faLock,
  faUserAlt,
  faExclamationCircle,
  faExclamationTriangle,
  faCheckCircle,
} from "@fortawesome/free-solid-svg-icons";

export default function Signup({ onClose }) {
  const { darkMode } = useContext(ThemeContext);
  const { user, login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState({ label: "", color: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showRoleSelection, setShowRoleSelection] = useState(false);

  useEffect(() => {
    if (user) {
      if (onClose) {
        onClose();
      } else {
        navigate("/dashboard?role=" + (user.Role || "patient"), { replace: true });
      }
    }
  }, [user, onClose, navigate]);

  const evaluatePasswordStrength = (pw) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    if (score <= 2) return { label: "Too weak", color: "red" };
    if (score <= 4) return { label: "Average", color: "orange" };
    return { label: "Strong", color: "green" };
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!fullName.trim() || !email.trim()) {
      setError("Please enter your name and email.");
      return;
    }

    setError("");
    
    // Just show RoleSelection - no API call yet
    setShowRoleSelection(true);
  };

  const handleClose = (e) => {
    if (e) e.stopPropagation();
    onClose && onClose();
  };

  const handleRoleSelectionClose = () => {
    setShowRoleSelection(false);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  if (showRoleSelection) {
    return (
      <RoleSelection
        onClose={handleRoleSelectionClose}
        onNavigate={navigate}
        onLogin={login}
        signUpData={{ fullName, email, mobile, password }}
      />
    );
  }

  return (
    <div
      id="modal-overlay"
      className={darkMode ? "dark" : "light"}
      onClick={onClose}
    >
      <motion.div
        id="modal-card"
        className={darkMode ? "dark" : "light"}
        onClick={(e) => e.stopPropagation()}
      >
        <button id="close-btn" onClick={handleClose} aria-label="Close">
          &times;
        </button>

        <form onSubmit={handleSignup}>
          <h2 id="brand">Create Account</h2>

          {error && (
            <div id="error" className={darkMode ? "dark" : "light"}>
              {error}
            </div>
          )}

          <label>Full Name</label>
          <div className="input-icon-group">
            <FontAwesomeIcon icon={faUser} className="input-leading-icon" />
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              className={darkMode ? "dark" : "light"}
              required
            />
          </div>

          <label>Mobile Number</label>
          <div className="input-icon-group">
            <FontAwesomeIcon icon={faPhone} className="input-leading-icon" />
            <input
              type="text"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="03XXXXXXXXX"
              className={darkMode ? "dark" : "light"}
            />
          </div>

          <label>Email</label>
          <div className="input-icon-group">
            <FontAwesomeIcon icon={faEnvelope} className="input-leading-icon" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={darkMode ? "dark" : "light"}
              required
            />
          </div>

          <label>Password</label>
          <div className="password-container">
            <div className="input-icon-group">
              <FontAwesomeIcon icon={faLock} className="input-leading-icon" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  const val = e.target.value;
                  setPassword(val);
                  setPasswordStrength(evaluatePasswordStrength(val));
                }}
                placeholder="Min 6 chars"
                className={darkMode ? "dark" : "light"}
                required
              />
            </div>

            <button type="button" onClick={togglePasswordVisibility} className="toggle-password">
              <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
            </button>
          </div>

          {password && (
            <div id="password-feedback" style={{ color: passwordStrength.color }}>
              <FontAwesomeIcon
                icon={
                  passwordStrength.label === "Too weak"
                    ? faExclamationCircle
                    : passwordStrength.label === "Average"
                    ? faExclamationTriangle
                    : faCheckCircle
                }
                className="feedback-icon"
              />
              {passwordStrength.label === "Too weak" && "Your password is too weak"}
              {passwordStrength.label === "Average" && "Your password could be stronger"}
              {passwordStrength.label === "Strong" && "Your password is strong"}
            </div>
          )}

          <label>Confirm Password</label>
          <div className="password-container">
            <div className="input-icon-group">
              <FontAwesomeIcon icon={faLock} className="input-leading-icon" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className={darkMode ? "dark" : "light"}
                required
              />
            </div>

            <button type="button" onClick={toggleConfirmPasswordVisibility} className="toggle-password">
              <i className={`fas ${showConfirmPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
            </button>
          </div>

          <button id="btn" className={`btn ${darkMode ? "dark" : "light"}`} type="submit">
            <>
              <span className="login-icon-wrapper">
                <FontAwesomeIcon icon={faUserAlt} className="login-icon" />
              </span>
              Signup
            </>
          </button>
        </form>
      </motion.div>
    </div>
  );
}
