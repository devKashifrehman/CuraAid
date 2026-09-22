import React, { useContext, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { GoogleLogin } from "@react-oauth/google";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEnvelope,
  faLock,
  faSignInAlt,
  faExclamationCircle,
  faExclamationTriangle,
  faCheckCircle,
} from "@fortawesome/free-solid-svg-icons";
import { ThemeContext } from "../Theme/ThemeContext";
import { AuthContext, resolveAuthSession } from "../HeadFoot/Auth/AuthContext";
import "./Ls.css";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

const GOOGLE_CLIENT_ID =
  "1067027523719-opht14v2816ic3ngeb2iqqth9qkiutv3.apps.googleusercontent.com";

export default function Login({ onClose }) {
  const { darkMode } = useContext(ThemeContext);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ label: "", color: "" });
  const [isLoading, setIsLoading] = useState(false);

  const finalizeLogin = (session, fallbackRole = "admin") => {
    const normalizedRole = session.role || fallbackRole;
    login(session.userData, normalizedRole, session.token);
    if (onClose) onClose();
    navigate(`/dashboard?role=${normalizedRole}`, { replace: true });
  };

 const handleGoogleSuccess = async (credentialResponse) => {
    setError("");
    setIsLoading(true);

    try {
        const idToken = credentialResponse.credential;

        if (!idToken) {
            setError(
                "Google authentication failed. No token received."
            );
            return;
        }

        // Temporary Google token save
        sessionStorage.setItem(
            "google_token",
            idToken
        );

        // Role selection
        navigate("/role-selection", {
            replace: true,
            state: {
                fromGoogle: true,
                googleToken: idToken,
            },
        });

    } catch (err) {

        console.error(
            "Google authentication error:",
            err
        );

        setError(
            "Google login failed. Please try again."
        );

    } finally {
        setIsLoading(false);
    }
};
  const handleGoogleError = () => {
    setError("Google sign-in was cancelled or failed.");
  };

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

  const handleResetPassword = async (e) => {
    e.preventDefault();

    setError("");
    setResetLoading(true);

    try {
      await axios.post(
        `${API_BASE_URL}/api/forgot-password`,
        { email: resetEmail },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 20000,
        }
      );

      setError("Reset link sent! Please check your email to reset your password.");
      setShowReset(false);
      setResetEmail("");
    } catch (err) {
      if (err?.response?.status === 404) {
        setError("Email not found. Please check your email address.");
      } else if (typeof err?.response?.data === "string") {
        setError(err.response.data);
      } else {
        setError("Failed to send reset link. Please try again.");
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const loginPayload = { email, password };

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/login`,
        loginPayload,
        {
          headers: { "Content-Type": "application/json" },
          timeout: 20000,
        }
      );

      const session = resolveAuthSession(response.data, "patient");
      finalizeLogin(session, session.role || "patient");
    } catch (err) {
      const status = err?.response?.status;
      const message =
        err?.response?.data?.message ||
        err?.response?.data ||
        err?.message ||
        "Invalid email or password.";

      if (status === 404) {
        setError("Email not found. Please check your email address.");
      } else if (status === 401) {
        setError("Invalid password. Please try again.");
      } else if (status === 403) {
        setError("This account is inactive. Please contact support.");
      } else if (status === 422) {
        setError("Please enter a valid email and password.");
      } else {
        setError(
          typeof message === "string"
            ? message
            : "Invalid email or password."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="modal-overlay"
      className={`login ${darkMode ? "dark" : "light"}`}
      onClick={onClose}
    >
      <motion.div
        id="modal-card"
        className={darkMode ? "dark" : "light"}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: -30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.98 }}
        transition={{ duration: 0.18 }}
      >
        <button
          id="close-btn"
          className={darkMode ? "dark" : "light"}
          onClick={onClose}
        >
          &times;
        </button>

        {showReset ? (
          <form onSubmit={handleResetPassword}>
            <h2 id="brand">Reset Password</h2>

            {error && (
              <div id="error" className={darkMode ? "dark" : "light"}>
                {error}
              </div>
            )}

            <label>Email</label>
            <div className="input-icon-group">
              <FontAwesomeIcon
                icon={faEnvelope}
                className="input-leading-icon"
              />
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <button
              id="btn"
              className={`btn ${darkMode ? "dark" : "light"}`}
              type="submit"
              disabled={resetLoading}
            >
              {resetLoading ? (
                <>
                  <span className="loader"></span> Sending...
                </>
              ) : (
                "Send Reset Link"
              )}
            </button>

            <p className="auth-footer" style={{ marginTop: 14 }}>
              <button
                type="button"
                className="signup-link"
                style={{
                  textDecoration: "none",
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                }}
                onClick={() => {
                  setError("");
                  setShowReset(false);
                  setResetEmail("");
                }}
              >
                Back to Login
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleLogin}>
            <h2 id="brand">CuraAid Login</h2>

            {error && (
              <div id="error" className={darkMode ? "dark" : "light"}>
                {error}
              </div>
            )}

            <label>Email</label>
            <div className="input-icon-group">
              <FontAwesomeIcon
                icon={faEnvelope}
                className="input-leading-icon"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
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
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="toggle-password"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <div className="auth-footer" style={{ marginTop: 10 }}>
              <button
                type="button"
                className="signup-link"
                style={{
                  textDecoration: "none",
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                }}
                onClick={() => {
                  setError("");
                  setShowReset(true);
                  setResetEmail(email);
                }}
              >
                Forget password?
              </button>
            </div>

            {password && (
              <div
                id="password-feedback"
                style={{ color: passwordStrength.color }}
              >
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
                {passwordStrength.label === "Too weak" &&
                  "Your password is too weak"}
                {passwordStrength.label === "Average" &&
                  "Your password could be stronger"}
                {passwordStrength.label === "Strong" &&
                  "Your password is strong"}
              </div>
            )}

            <button
              id="btn"
              className={`btn ${darkMode ? "dark" : "light"}`}
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="loader"></span> Logging in...
                </>
              ) : (
                <>
                  <span className="login-icon-wrapper">
                    <FontAwesomeIcon
                      icon={faSignInAlt}
                      className="login-icon"
                    />
                  </span>
                  Login
                </>
              )}
            </button>

            <div className="divider">
              <span id="or">OR</span>
            </div>

            <div className="google-login-container">
              <GoogleLogin
                clientId={GOOGLE_CLIENT_ID}
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap
                theme={darkMode ? "filled_black" : "outline"}
                size="large"
                width="100%"
                text="continue_with"
                shape="rectangular"
              />
            </div>

            <p className="auth-footer">
              <span>Don't have an account?</span>
              <Link
                to="/signup"
                className="signup-link"
                state={{ from: location.state?.from }}
              >
                Create Account
              </Link>
            </p>

            {/* Admin login entry */}
            <p className="auth-footer" style={{ marginTop: 10 }}>
              <button
                type="button"
                className="signup-link"
                onClick={() =>
                  navigate("/admin/login", { state: { from: location.state?.from } })
                }
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  textDecoration: "none",
                  color: "inherit",
                  font: "inherit",
                }}
              >
                Login as Admin
              </button>
            </p>
          </form>
        )}
      </motion.div>
    </div>
  );
}

