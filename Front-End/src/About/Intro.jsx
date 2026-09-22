import React, { useEffect, useContext } from "react";
import { ThemeContext } from "../Theme/ThemeContext";
import "./Intro.css";
import img1 from "../images/5.jpg";
import img2 from "../images/6.jpg";
import AIHealthGuide from '../Theme/Popupchat/AIHealthGuide';
const Aboutus = () => { 
  const { darkMode } = useContext(ThemeContext);
 
  useEffect(() => {
    const elements = document.querySelectorAll(".fade-in");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.animationPlayState = "running";
        }
      });
    });

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);  

  return (
    <div className={`about-us  ${darkMode ? 'dark' : 'light'}`}> 
      {/* Team Section */}
      <div className="team-section fade-in delay-2">
        <h2 id="story" className="center-text">Meet the Team</h2>
        <div className="team-grid">
          <div className="team-card glass">
            <img src={img1} alt="Founder" />
            <h3>Dr. Sarah Khan</h3>
            <p><strong>CEO &amp; Co-Founder</strong></p>
          </div>
          <div className="team-card glass">
            <img src={img2} alt="CTO" />
            <h3>Kashif Rehman</h3>
            <p><strong>CTO &amp; Co-Founder</strong></p>
          </div>
        </div>
      </div>

      {/* Mission Section with Overlay and centered text */}
      <div className="about-section fade-in delay-1">
        {/* Overlay div shows only in dark mode */}
        {/* {theme === "dark" && <div className="overlay"></div>} */}

        <h2 id="story" className="center-text">Our Mission</h2>
        <p style={{ maxWidth: "600px", fontSize: "1.2rem", lineHeight: "1.5" }}>
          <strong>Smart healthcare for all</strong> — We strive to empower people
          with real-time health insights, AI-driven care, and trustworthy
          connections with healthcare professionals.
        </p>
      </div>

      {/* Trust Badges */}
      {/* <div className="trust-section fade-in delay-3">
        <h2 id="story" className="center-text">Trusted &amp; Secure</h2>
        <div className="trust-badges">
          <div className="badge glass">
            <img src={img2} alt="Secure Payments" />
            <span>Secure Payments</span>
          </div>
          <div className="badge glass">
            <img src={img2} alt="HIPAA Compliant" />
            <span>HIPAA Compliant</span>
          </div>
          <div className="badge glass">
            <img src={img2} alt="Data Encryption" />
            <span>Data Encryption</span>
          </div>
        </div>
      </div> */}
      <AIHealthGuide/>
    </div>
  );
};

export default Aboutus;
