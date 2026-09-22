import React, { useState, useContext, useEffect } from "react";
import { ThemeContext } from "../Theme/ThemeContext";
import { AuthContext } from "../HeadFoot/Auth/AuthContext";
import "./FeedbackForm.css";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faEnvelope,
  faComment,
  faPaperPlane,
  faCommentMedical,
  faCircleCheck,
} from "@fortawesome/free-solid-svg-icons";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

const FeedbackForm = () => {
  // Dark/Light theme
  const { darkMode } = useContext(ThemeContext);
  const { user } = useContext(AuthContext);

  // State
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [authWarning, setAuthWarning] = useState("");
  // const [isChatOpen, setIsChatOpen] = useState(false);   // 🔒 Chat disabled
  // const [chatMessage, setChatMessage] = useState("");   // 🔒 Chat disabled
  // const [chatReply, setChatReply] = useState("");       // 🔒 Chat disabled
  const [submitState, setSubmitState] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Prefill on login
  useEffect(() => { 
    if (user) {
      // Name from FullName, fallback to prefix of email
      const nameFromUser = user.FullName?.trim() || (user.Email ? user.Email.split("@")[0] : "");
      setFormData({
        name: nameFromUser,
        email: user.Email || "",
        message: "",
      });
      setAuthWarning("");
    } else {
      setFormData({ name: "", email: "", message: "" });
      setAuthWarning("You don't have an account. Please login or signup to submit feedback.");
    }
  }, [user]);

  // Input change handler
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // Email stays read-only; guard against accidental changes via devtools
    if (name === "email") return;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!user || !user.Email) {
      setErrorMessage("You don't have an account. Please login or signup to submit feedback.");
      setAuthWarning("You don't have an account. Please login or signup to submit feedback.");
      return;
    }

    const name = (formData.name || "").trim();
    const email = (user.Email || "").trim();
    const message = (formData.message || "").trim();

    if (!message) {
      setErrorMessage("Message is required.");
      return;
    }

    // Optimistic: UI turant update
    setSubmitState("success");
    setFormData({ name: name, email: user.Email || "", message: "" });

    // Background API call
    try {
      await axios.post(
        `${API_BASE_URL}/api/medi/FeedbackForm`,
        { Name: name, Email: email, Message: message },
        { headers: { "Content-Type": "application/json" }, timeout: 15000 }
      );
    } catch (error) {
      console.error("Error submitting feedback:", error?.response?.status, error?.message);
    }
  };

  // 🔒 Chat related code commented
  /*
  // Simulate auto-reply for chat
  const simulateAutoReply = async (message) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(
          `Auto-reply: Thanks for your message: "${message}"! Our team will respond soon.`
        );
      }, 1000);
    });
  };

  // Chat submit
  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (chatMessage.trim()) {
      const reply = await simulateAutoReply(chatMessage);
      setChatReply(reply);
      setChatMessage("");

      // Clear reply after 3 seconds
      setTimeout(() => setChatReply(""), 3000);
    }
  };
  */

  return (
    <div className={`feedback-container ${darkMode ? "dark" : "light"}`}>
      <h2 className="feedback-title">
        <FontAwesomeIcon icon={faCommentMedical} className="mr-2" />
        We Value Your Feedback
      </h2>

      {/* Feedback Form */}
      <form onSubmit={handleSubmit} className="feedback-form">
        <div className="input-group" id="group">
          <FontAwesomeIcon icon={faUser} className="input-icon" id="icon" />
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Your Name"
            required
          />
        </div>

        <div className="input-group">
          <FontAwesomeIcon icon={faEnvelope} className="input-icon" id="icon" />
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="Your Email"
            required
            disabled={!!user}
            title={
              user ? "Email is fixed to your account email" : "Enter your email"
            }
          />
        </div>

        <div className="input-group">
          <FontAwesomeIcon icon={faComment} className="input-icon" id="icon" />
          <textarea
            name="message"
            value={formData.message}
            onChange={handleInputChange}
            placeholder="Your Message"
            required
          ></textarea>
        </div>

        {authWarning && <div className="auth-warning">{authWarning}</div>}

        <button
          type="submit"
          className={`submit-button ${submitState}`}
          disabled={submitState === "loading"}
        >
          {submitState === "idle" && (
            <>
              <FontAwesomeIcon icon={faPaperPlane} className="mr-2" />
              Submit
            </>
          )}
          {submitState === "loading" && (
            <>
              <span className="btn-loader" aria-hidden="true"></span>
              Submitting...
            </>
          )}
          {submitState === "success" && (
            <>
              <FontAwesomeIcon icon={faCircleCheck} className="mr-2" />
              Thanks for submission
            </>
          )}
        </button>
        {errorMessage && (
          <div style={{ color: "red", marginTop: "8px" }}>{errorMessage}</div>
        )}
      </form>

      {/* 🔒 Chat Toggle Button Disabled
      <button
        className="chat-toggle"
        onClick={() => setIsChatOpen((prev) => !prev)}
      >
        <FontAwesomeIcon icon={faCommentMedical} />
      </button>
      */}

      {/* 🔒 Chat Widget Disabled
      {isChatOpen && (
        <div className="chat-widget">
          <form onSubmit={handleChatSubmit} className="chat-form">
            <input
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="Type your message..."
              className="chat-input"
            />
            <button type="submit" className="chat-submit">
              <FontAwesomeIcon icon={faPaperPlane} />
            </button>
          </form>
          {chatReply && <p className="chat-reply">{chatReply}</p>}
        </div>
      )}
      */}
    </div>
  );
};

export default FeedbackForm;
