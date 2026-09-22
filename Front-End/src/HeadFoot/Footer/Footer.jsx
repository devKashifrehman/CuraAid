import React, { useContext } from 'react';
import './Footer.css';
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaYoutube,
  FaEnvelope,
  FaRobot,
  FaUserMd,
  FaComments,
  FaFilePrescription,
  FaPills,
  FaNotesMedical,
  FaFlask,
  FaShieldAlt,
  FaFileContract,
  FaLock,
  FaQuestionCircle,
  FaHeadset,
  FaUndo,
  FaInfoCircle,
  FaCogs,
  FaBlog,
  FaBriefcase,
  FaNewspaper,
  FaHandshake,
  FaUserCheck,
  FaShieldVirus,
  FaHeart,
  FaHome,
  FaArrowRight
} from 'react-icons/fa';
import { ThemeContext } from '../../Theme/ThemeContext';
import Logo from '../../images/Web-logo.png';

const Footer = () => {
  const { darkMode } = useContext(ThemeContext);

  return (
    <footer className={`footer ${darkMode ? "dark" : "light"}`}>
      <div className="footer-main">
        {/* Column 1: Brand */}
        <div className="footer-col brand-col">
            <div className="brand">
            <img className="logo" src={Logo} alt="CuraAid" />
            <div>
              <div className="brand-title">CuraAid</div>
              <div className="brand-sub">Smart Healthcare</div>
            </div>
          </div>

          <p className="brand-desc">
            CuraAid helps you find the right doctor with smart guidance, online
            consultation and complete health management – all in one secure
            platform.
          </p>
          <ul className="trust-list">
            <li>
              <FaLock /> Secure & Encrypted Data
            </li>
            <li>
              <FaUserCheck /> Verified Doctors Only
            </li>
            <li>
              <FaShieldVirus /> HIPAA Compliant System
            </li>
            <li>
              <FaHeart /> Your Health, Our Priority
            </li>
          </ul>
        </div>

        {/* Column 2: Services */}
        <div className="footer-col">
          <h3 className="col-title">
            <span className="title-icon services-icon">
              <FaCogs />
            </span>
            SERVICES
          </h3>
          <ul className="link-list">
            <li>
              <FaRobot /> AI Symptom Checker
            </li>
            <li>
              <FaUserMd /> Doctor Matching System
            </li>
            <li>
              <FaComments /> Online Consultation
            </li>
            <li>
              <FaFilePrescription /> Digital Prescription
            </li>
            <li>
              <FaPills /> Pharmacy Integration
            </li>
            <li>
              <FaNotesMedical /> Health Records Management
            </li>
            <li>
              <FaFlask /> Lab & Diagnostic Upload
            </li>
          </ul>
        </div>

        {/* Column 3: Legal & Support */}
        <div className="footer-col">
          <h3 className="col-title">
            <span className="title-icon legal-icon">
              <FaShieldAlt />
            </span>
            LEGAL & SUPPORT
          </h3>
          <ul className="link-list">
            <li>
              <FaLock /> Privacy Policy
            </li>
            <li>
              <FaFileContract /> Terms & Conditions
            </li>
            <li>
              <FaShieldAlt /> Data Security
            </li>
            <li>
              <FaQuestionCircle /> Help Center
            </li>
            <li>
              <FaHeadset /> Contact Support
            </li>
            <li>
              <FaUndo /> Refund & Cancellation
            </li>
          </ul>
        </div>

        {/* Column 4: Quick Links */}
        <div className="footer-col">
          <h3 className="col-title quick-title">QUICK LINKS</h3>
          <ul className="link-list">
            <li>
              <FaInfoCircle /> About CuraAid
            </li>
            <li>
              <FaCogs /> How It Works
            </li>
            <li>
              <FaBlog /> Blog & Health Articles
            </li>
            <li>
              <FaBriefcase /> Careers
            </li>
            <li>
              <FaNewspaper /> Press & Media
            </li>
            <li>
              <FaHandshake /> Become a Partner
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="footer-bottom">
        <div className="bottom-left">
          <div className="copyright">
            <span className="copy-icon">
              <FaHome />
            </span>
            <div>
              <p>© 2026 CuraAid. All rights reserved.</p>
              <p className="powered">
                Powered by smart healthcare system{" "}
                <FaHeart className="inline-heart" />
              </p>
            </div>
          </div>
          <div className="badges">
            <div className="badge">
              <FaShieldVirus />
              <span>
                HIPAA
                <br />
                COMPLIANT
              </span>
            </div>
            <div className="badge">
              <FaLock />
              <span>
                SSL
                <br />
                SECURED
              </span>
            </div>
            <div className="badge">
              <FaUserCheck />
              <span>
                VERIFIED
                <br />
                DOCTORS
              </span>
            </div>
          </div>
        </div>

        <div className="bottom-center">
          <h3>Follow Us On</h3>
          <div className="social-icons">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="social-btn facebook"
            >
              <FaFacebookF />
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="social-btn instagram"
            >
              <FaInstagram />
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="social-btn linkedin"
            >
              <FaLinkedinIn />
            </a>
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              className="social-btn youtube"
            >
              <FaYoutube />
            </a>
            <a href="mailto:info@yourcompany.com" className="social-btn email">
              <FaEnvelope />
            </a>
          </div>
        </div>

        <div className="bottom-right">
          <div className="help-box">
            <div className="help-icon">
              <FaHeadset />
            </div>
            <div className="help-text">
              <h4>Need Help?</h4>
              <p>Our support team is available 24/7</p>
            </div>
          </div>
          <button className="contact-btn">
            Contact Support <FaArrowRight />
          </button>
        </div>
      </div>

      {/* Bottom Strip */}
      <div className="footer-strip">
        <div className="strip-left">
          <FaShieldVirus />
          <span>Your Health. Our Priority. Always with You.</span>
        </div>
        <div className="strip-divider" />
        <div className="strip-right">
          <FaHeart />
          <span>Trusted by Thousands, Every Day.</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
