import React, { useState, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { ThemeContext } from "../../Theme/ThemeContext";
import { AuthContext } from "../../HeadFoot/Auth/AuthContext";
import { MdPerson } from "react-icons/md";
import { FaUserMd } from "react-icons/fa";
import "./RoleSelection.css";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

const RoleSelection = ({ onClose, onNavigate, onLogin, signUpData }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const { darkMode } = useContext(ThemeContext);
  const { login: contextLogin } = useContext(AuthContext);

  const [selectedRole, setSelectedRole] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // ==========================================
  // SELECT PATIENT / DOCTOR
  // ==========================================
  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setError("");
  };

  // ==========================================
  // CONTINUE
  // NORMAL SIGNUP + GOOGLE SIGNUP
  // ==========================================
  const handleContinue = async () => {
    if (!selectedRole) {
      setError("Please select your role.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      // ==========================================
      // USER TYPE
      // ==========================================
      let usertype_id;

      if (selectedRole === "patient") {
        usertype_id = 1;
      } else if (selectedRole === "doctor") {
        usertype_id = 2;
      } else {
        throw new Error("Invalid role selected.");
      }

      // ==========================================
      // GOOGLE TOKEN
      // ==========================================
      const googleToken =
        location.state?.googleToken || sessionStorage.getItem("google_token");

      // ==========================================
      // CHECK GOOGLE FLOW
      // ==========================================
      const isGoogleSignup =
        location.state?.fromGoogle === true || !!googleToken;

      // ==================================================
      // GOOGLE LOGIN / SIGNUP
      // ==================================================
      if (isGoogleSignup) {
        console.log("Google Signup Flow");
        console.log("Google Token:", !!googleToken);
        console.log("Selected Role:", selectedRole);
        console.log("Usertype ID:", usertype_id);

        // ==========================================
        // GOOGLE TOKEN CHECK
        // ==========================================
        if (!googleToken) {
          throw new Error(
            "Google signup information is missing. Please start Google signup again.",
          );
        }

        // ==========================================
        // GOOGLE LOGIN API
        // ==========================================
        const response = await axios.post(
          `${API_BASE_URL}/api/medi/google-login`,
          {
            token: googleToken,
            usertype_id: usertype_id,
          },
          {
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            timeout: 20000,
          },
        );

        console.log("Google Login Response:", response.data);

        // ==========================================
        // GET USER
        // ==========================================
        const registeredUser = response?.data?.user;

        // ==========================================
        // GET TOKEN
        // ==========================================
        const token = response?.data?.token;

        // ==========================================
        // CHECK USER
        // ==========================================
        if (!registeredUser) {
          throw new Error("User information not received from server.");
        }

        if (!registeredUser.id) {
          throw new Error("User ID not received from server.");
        }

        // ==========================================
        // CHECK TOKEN
        // ==========================================
        if (!token) {
          console.error("Full Google server response:", response.data);

          throw new Error("Authentication token not received from server.");
        }

        // ==========================================
        // SAVE AUTH TOKEN
        // ==========================================
        localStorage.setItem("auth_token", token);

        localStorage.setItem("token", token);

        // ==========================================
        // SAVE USER ID
        // ==========================================
        localStorage.setItem("user_id", String(registeredUser.id));

        // ==========================================
        // SAVE USER
        // ==========================================
        localStorage.setItem("user", JSON.stringify(registeredUser));

        // ==========================================
        // SAVE ROLE
        // ==========================================
        localStorage.setItem("user_role", selectedRole);

        // ==========================================
        // SAVE USER TYPE
        // ==========================================
        localStorage.setItem(
          "usertype_id",
          String(registeredUser?.usertype_id || usertype_id),
        );

        console.log("Google token saved successfully.");

        console.log("Google User ID:", registeredUser.id);

        console.log("Google Role:", selectedRole);

        // ==========================================
        // AUTH CONTEXT LOGIN
        // ==========================================
        if (selectedRole === "doctor") {
          // Doctor signup: DON'T login yet — store temp data until documentation is complete
          sessionStorage.setItem("doc_signup_token", token);
          sessionStorage.setItem("doc_signup_user", JSON.stringify({
            id: registeredUser.id,
            FullName: registeredUser.name || "Google User",
            Email: registeredUser.email || "",
            Mobile: registeredUser.mobile || "",
            Role: selectedRole,
            usertype_id: registeredUser?.usertype_id || usertype_id,
            token: token,
          }));
        } else {
          contextLogin(
            {
              id: registeredUser.id,

              FullName: registeredUser.name || "Google User",

              Email: registeredUser.email || "",

              Mobile: registeredUser.mobile || "",

              Role: selectedRole,

              usertype_id: registeredUser?.usertype_id || usertype_id,

              token: token,
            },

            selectedRole,
          );
        }

        // ==========================================
        // REMOVE TEMP GOOGLE TOKEN
        // ==========================================
        sessionStorage.removeItem("google_token");

        // ==========================================
        // CLOSE MODAL
        // ==========================================
        if (onClose) {
          onClose();
        }

        // ==========================================
        // PATIENT
        // ==========================================
        if (selectedRole === "patient") {
          if (onNavigate) {
            onNavigate("/dashboard?role=patient");
          } else {
            navigate("/dashboard?role=patient", {
              replace: true,
            });
          }

          return;
        }

        // ==========================================
        // DOCTOR
        // ==========================================
        if (selectedRole === "doctor") {
          if (onNavigate) {
            onNavigate("/doctor-documentation");
          } else {
            navigate("/doctor-documentation", {
              replace: true,
            });
          }

          return;
        }
      }

      // ==================================================
      // NORMAL SIGNUP
      // ==================================================

      console.log("Normal Signup Flow");

      // ==========================================
      // CHECK SIGNUP DATA
      // ==========================================
      if (!signUpData) {
        throw new Error(
          "Signup information is missing. Please start signup again.",
        );
      }

      if (!signUpData.email) {
        throw new Error("Email is required.");
      }

      if (!signUpData.password) {
        throw new Error("Password is required.");
      }

      // ==========================================
      // REGISTER API
      // ==========================================
      const response = await axios.post(
        `${API_BASE_URL}/api/register`,
        {
          name: signUpData?.fullName || signUpData?.name || "User",

          mobile: signUpData?.mobile || "",

          email: signUpData?.email || "",

          password: signUpData?.password || "",

          usertype_id: usertype_id,

          status: "active",

          auth_provider: "local",
        },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },

          timeout: 20000,
        },
      );

      console.log("Registration Response:", response.data);

      // ==========================================
      // GET USER
      // ==========================================
      const registeredUser = response?.data?.user;

      // ==========================================
      // GET TOKEN
      // ==========================================
      const token = response?.data?.token;

      // ==========================================
      // CHECK USER
      // ==========================================
      if (!registeredUser) {
        throw new Error("User information not received from server.");
      }

      if (!registeredUser.id) {
        throw new Error("User ID not received from server.");
      }

      // ==========================================
      // CHECK TOKEN
      // ==========================================
      if (!token) {
        console.error("Full server response:", response.data);

        throw new Error("Authentication token not received from server.");
      }

      // ==========================================
      // SAVE TOKEN
      // ==========================================
      localStorage.setItem("auth_token", token);

      // Compatibility
      localStorage.setItem("token", token);

      // ==========================================
      // SAVE USER ID
      // ==========================================
      localStorage.setItem("user_id", String(registeredUser.id));

      // ==========================================
      // SAVE USER
      // ==========================================
      localStorage.setItem("user", JSON.stringify(registeredUser));

      // ==========================================
      // SAVE ROLE
      // ==========================================
      localStorage.setItem("user_role", selectedRole);

      // ==========================================
      // SAVE USER TYPE
      // ==========================================
      localStorage.setItem(
        "usertype_id",
        String(registeredUser?.usertype_id || usertype_id),
      );

      console.log("Token saved successfully.");

      console.log("User ID:", registeredUser.id);

      console.log("Role:", selectedRole);

      // ==========================================
      // AUTH CONTEXT LOGIN
      // ==========================================
      if (selectedRole === "doctor") {
        // Doctor signup: DON'T login yet — store temp data until documentation is complete
        sessionStorage.setItem("doc_signup_token", token);
        sessionStorage.setItem("doc_signup_user", JSON.stringify({
          id: registeredUser.id,
          FullName: registeredUser.name || signUpData?.fullName || "User",
          Email: registeredUser.email || signUpData?.email || "",
          Mobile: registeredUser.mobile || signUpData?.mobile || "",
          Role: selectedRole,
          usertype_id: registeredUser?.usertype_id || usertype_id,
          token: token,
        }));
      } else {
        contextLogin(
          {
            id: registeredUser.id,

            FullName:
              registeredUser.name ||
              signUpData?.fullName ||
              signUpData?.name ||
              "User",

            Email: registeredUser.email || signUpData?.email || "",

            Mobile: registeredUser.mobile || signUpData?.mobile || "",

            Role: selectedRole,

            usertype_id: registeredUser?.usertype_id || usertype_id,

            token: token,
          },

          selectedRole,
        );
      }

      // ==========================================
      // PATIENT
      // ==========================================
      if (selectedRole === "patient") {
        if (onNavigate) {
          onNavigate("/dashboard?role=patient");
        } else {
          navigate("/dashboard?role=patient", {
            replace: true,
          });
        }

        return;
      }

      // ==========================================
      // DOCTOR
      // ==========================================
      if (selectedRole === "doctor") {
        if (onNavigate) {
          onNavigate("/doctor-documentation");
        } else {
          navigate("/doctor-documentation", {
            replace: true,
          });
        }

        return;
      }
    } catch (err) {
      console.error("Registration / Google Login Error:", err);

      console.error("Server Response:", err?.response?.data);

      // ==========================================
      // VALIDATION ERRORS
      // ==========================================
      const validationErrors = err?.response?.data?.errors;

      let message =
        err?.response?.data?.message ||
        validationErrors?.email?.[0] ||
        validationErrors?.mobile?.[0] ||
        validationErrors?.password?.[0] ||
        validationErrors?.usertype_id?.[0] ||
        err?.message ||
        "Registration failed. Please try again.";

      if (typeof message !== "string") {
        message = "Registration failed. Please try again.";
      }

      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // BACK BUTTON
  // ==========================================
  const handleGoBack = () => {
    // Google signup ke case mein
    // temporary token remove kar dein
    if (location.state?.fromGoogle || sessionStorage.getItem("google_token")) {
      sessionStorage.removeItem("google_token");
    }

    if (onClose) {
      onClose();
    } else {
      navigate(-1);
    }
  };

  // ==========================================
  // UI
  // ==========================================
  return (
    <div
      id="modal-overlay"
      className={`${darkMode ? "dark" : "light"} role-selection-overlay`}
      onClick={onClose}
    >
      <div
        className="role-selection-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* BACK BUTTON */}

        <button
          className="back-btn"
          onClick={handleGoBack}
          aria-label="Go back"
          type="button"
        >
          &lt;&lt;
        </button>

        {/* HEADING */}

        <h2 className="role-heading">Select Your Role</h2>

        {/* ERROR */}

        {error && (
          <div
            style={{
              backgroundColor: "#fee",
              color: "#c33",
              padding: "10px 15px",
              borderRadius: "4px",
              marginBottom: "20px",
              fontSize: "14px",
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        {/* ROLE CARDS */}

        <div className="role-cards-wrapper">
          {/* ==========================================
                        PATIENT
                    ========================================== */}

          <div
            className={`role-card ${
              selectedRole === "patient" ? "active" : ""
            }`}
            onClick={() => handleRoleSelect("patient")}
          >
            <div className="role-checkbox">
              {selectedRole === "patient" && (
                <span className="checkmark">✓</span>
              )}
            </div>

            <div className="role-icon">
              <MdPerson size={42} />
            </div>

            <h4 className="role-title">You are a Patient</h4>

            <p className="role-desc">
              Book appointments, track medical history, and consult with doctors
              seamlessly.
            </p>
          </div>

          {/* ==========================================
                        DOCTOR
                    ========================================== */}

          <div
            className={`role-card ${selectedRole === "doctor" ? "active" : ""}`}
            onClick={() => handleRoleSelect("doctor")}
          >
            <div className="role-checkbox">
              {selectedRole === "doctor" && (
                <span className="checkmark">✓</span>
              )}
            </div>

            <div className="role-icon">
              <FaUserMd size={42} />
            </div>

            <h4 className="role-title">You are a Doctor</h4>

            <p className="role-desc">
              Manage your schedule, connect with patients, and grow your
              practice.
            </p>
          </div>
        </div>

        {/* ==========================================
                    CONTINUE BUTTON
                ========================================== */}

        {selectedRole && (
          <button
            className="action-btn"
            id="action"
            onClick={handleContinue}
            disabled={isLoading}
            type="button"
          >
            {isLoading ? (
              <>
                <span className="loader"></span>
                Loading...
              </>
            ) : selectedRole === "patient" ? (
              "Complete Signup"
            ) : (
              "Next"
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default RoleSelection;
