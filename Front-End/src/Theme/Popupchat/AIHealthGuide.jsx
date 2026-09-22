import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeContext } from "../ThemeContext";
import "./AIHealthGuide.css";
import aiLogo from "../Logo/1.png";
import "../../DoctorFinder/Agentbot/OPD";

const AIHealthGuide = () => {
  const { darkMode } = useContext(ThemeContext);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate("/ai-health-guide", { state: { userMessage: message } });
  };

  return (
    <div className="ai-assistant-container">
      {/* Floating Button with Hover Expand */}
      <div
        className={`ai-assistant-btn ${darkMode ? "dark" : "light"}`}
        onClick={() => setOpen(!open)}
      >
        <div className="ai-assistant-btn-content">
          <img src={aiLogo} alt="AI Health Guide" className="ai-logo" />
          <span className="btn-text">How can I help you today?</span>
        </div>
      </div>

      {/* Chat Popup */}
      {open && (
        <div className={`ai-chat-popup ${darkMode ? "dark" : "light"}`}>
          {/* Chat Header */}
          <div className="ai-chat-header">
            <div className="ai-chat-header-content">
              <img
                src={aiLogo}
                alt="AI Health Guide"
                className="ai-logo-small"
              />
              <span className="ai-chat-title">AI Health Guide</span>
            </div>
            <button className="close-btn" onClick={() => setOpen(false)}>
              &times;
            </button>
          </div>

          {/* Chat Body */}
          <div className="ai-chat-body">
            <div className="ai-chat-messages">
              <p className="ai-chat-welcome">
                Hello! How can I help you today?
              </p>
            </div>

            {/* Chat Form */}
            <form className="ai-chat-form" onSubmit={handleSubmit}>
              <div className="ai-chat-input-wrapper">
                <input
                  type="text"
                  className="ai-chat-input"
                  placeholder="Type your question..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <button type="submit" className="ai-chat-send-btn">
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIHealthGuide;
