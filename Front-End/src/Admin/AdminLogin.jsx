import React, { useContext, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEnvelope,
  faLock,
  faSignInAlt,
} from "@fortawesome/free-solid-svg-icons";

import { ThemeContext } from "../Theme/ThemeContext";
import { AuthContext, resolveAuthSession } from "../HeadFoot/Auth/AuthContext";

import "./adminLogin.css";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

export default function AdminLogin() {
  const { darkMode } = useContext(ThemeContext);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const loginPayload = {
      email: (username || "").trim(),
      password: (password || "").trim(),
    };

    const requestUrl = `${API_BASE_URL}/api/admin/login`;

    try {
      const response = await axios.post(requestUrl, loginPayload, {
        headers: { "Content-Type": "application/json" },
        timeout: 20000,
      });

      const session = resolveAuthSession(response.data, "admin");
      const normalizedRole = (session.role || "admin")
        .toString()
        .toLowerCase();
      const frontendRole =
        normalizedRole === "super_admin" || normalizedRole === "sub_admin"
          ? "admin"
          : normalizedRole;
      login(session.userData, frontendRole, session.token);
      navigate(`/dashboard?role=${frontendRole}`, { replace: true });
    } catch (err) {
      const status = err?.response?.status;
      const msg =
        err?.response?.data?.message ||
        err?.response?.data ||
        err?.message ||
        "Admin login failed.";

      if (status === 401) {
        setError("Invalid admin credentials. Please try again.");
      } else if (status === 403) {
        setError("This admin account is inactive.");
      } else if (status === 422) {
        setError("Please enter a valid email and password.");
      } else {
        setError(typeof msg === "string" ? msg : "Admin login failed.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`adminLogin ${darkMode ? "dark" : "light"}`}>
      <div className={`adminLoginCard ${darkMode ? "dark" : "light"}`}>
        <form onSubmit={handleAdminLogin}>
          <h2 className="adminLoginTitle">Admin Login</h2>

          {error && <div className="adminLoginError">{error}</div>}

          <label>Username</label>
          <div className="input-icon-group">
            <FontAwesomeIcon
              icon={faEnvelope}
              className="input-leading-icon"
            />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin username"
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
                onChange={(e) => setPassword(e.target.value)}
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

          <button
            className="adminLoginBtn"
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
                  <FontAwesomeIcon icon={faSignInAlt} className="login-icon" />
                </span>
                Login as Admin
              </>
            )}
          </button>

          <p className="auth-footer">
            <Link
              className="signup-link"
              to="/login"
              state={{ from: location.state?.from }}
            >
              Back to Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
