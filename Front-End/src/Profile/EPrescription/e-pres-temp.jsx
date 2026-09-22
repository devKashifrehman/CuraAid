// =============================================================================
// PRESCRIPTION TEMPLATE EDITOR
// Pick a design and customize clinic header (logo, name, contact)
// =============================================================================
import React, { useContext, useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaCheck,
  FaCheckCircle,
  FaImage,
  FaSave,
  FaUndo,
} from "react-icons/fa";
// import Sidebar from "../sidebar";
import { ThemeContext } from "../../Theme/ThemeContext";
import { AuthContext } from "../../HeadFoot/Auth/AuthContext";
import PrescriptionSlip from "./PrescriptionSlip";
import { normalizeData } from "./eprescriptionData";
import {
  PRESCRIPTION_TEMPLATES,
  getTemplateById,
  loadTemplateConfig,
  saveTemplateConfig,
} from "./eprescriptionTemplates";
import clinicLogoDefault from "../../images/clinic-logo.png";
import "./e-pres-temp.css";
import "./EPrescription.css";

const PREVIEW_RX = normalizeData({
  patient: "Sample Patient",
  presId: "PRES 2026/000001",
  mrNumber: "MR-000001",
  prescribedBy: "Dr. Sample Doctor, General OPD",
  doctorName: "Dr. Sample Doctor",
  age: "35y",
  gender: "m",
  date: new Date().toLocaleDateString("en-US"),
  diagnosis: "Sample diagnosis for preview",
  medicines: [
    {
      name: "Sample Medicine 500mg",
      generic: "Generic Name",
      route: "Oral",
      frequency: "1 time per day",
      duration: "5 days",
      comments: "After meals",
    },
  ],
});

const SaveSuccessPopup = ({ show, onComplete, darkMode }) => {
  useEffect(() => {
    if (!show) return undefined;
    const timer = setTimeout(onComplete, 2200);
    return () => clearTimeout(timer);
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div
      className={`ept-save-popup-overlay ${darkMode ? "dark" : "light"}`}
      role="dialog"
      aria-live="polite"
      aria-label="Template saved successfully"
    >
      <div className="ept-save-popup-card">
        <div className="ept-save-popup-ring">
          <div className="ept-save-popup-circle">
            <FaCheckCircle className="ept-save-popup-icon" />
          </div>
        </div>
        <h3 className="ept-save-popup-title">
          Prescription Template Updated Successfully
        </h3>
        <p className="ept-save-popup-subtitle">
          Your changes are now applied to all e-prescriptions
        </p>
      </div>
    </div>
  );
};

const EPresTemplate = () => {
  const navigate = useNavigate();
  const { darkMode } = useContext(ThemeContext);
  const { isDoctor } = useContext(AuthContext);
  const fileRef = useRef(null);

  const [config, setConfig] = useState(() => loadTemplateConfig());
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const previewScrollRef = useRef(null);
  const previewSlipRef = useRef(null);
  const previewPanelRef = useRef(null);

  const activePreset = getTemplateById(config.templateId);

  const SLIP_WIDTH = 680;

  const updatePreviewScale = useCallback(() => {
    const container = previewScrollRef.current;
    const slip = previewSlipRef.current;
    if (!container || !slip) return;
    const containerWidth = container.clientWidth - 24;
    const scale = Math.min(1, containerWidth / SLIP_WIDTH);
    slip.style.transform = `scale(${scale})`;
    container.style.height = `${Math.ceil(slip.scrollHeight * scale) + 24}px`;
  }, []);

  useEffect(() => {
    const timer = setTimeout(updatePreviewScale, 50);
    const panel = previewPanelRef.current;
    if (!panel) return () => clearTimeout(timer);
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(updatePreviewScale);
    });
    observer.observe(panel);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [updatePreviewScale, config]);

  const previewRx = {
    ...PREVIEW_RX,
    ...config,
    slipClass: activePreset.slipClass,
    titleBarClass: activePreset.titleBarClass,
    showCuraAidBrand: true,
  };

  const handleSelectTemplate = (templateId) => {
    const preset = getTemplateById(templateId);
    setConfig((prev) => ({
      ...prev,
      templateId: preset.id,
      showCuraAidBrand: true,
      titleText: prev.titleText || preset.titleText,
    }));
    setShowSaveSuccess(false);
  };

  const handleFieldChange = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setShowSaveSuccess(false);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      handleFieldChange("clinicLogo", reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleResetLogo = () => {
    handleFieldChange("clinicLogo", clinicLogoDefault);
  };

  const handleSave = () => {
    saveTemplateConfig({ ...config, showCuraAidBrand: true });
    setShowSaveSuccess(true);
  };

  const handleResetAll = () => {
    const preset = getTemplateById(config.templateId);
    setConfig({
      templateId: preset.id,
      clinicLogo: clinicLogoDefault,
      hospitalName: preset.hospitalName,
      hospitalAddress: preset.hospitalAddress,
      hospitalTel: preset.hospitalTel,
      titleText: preset.titleText,
      showCuraAidBrand: true,
    });
    setShowSaveSuccess(false);
  };

  if (!isDoctor) {
    return (
      <div className="settings-layout">
        {/* <Sidebar /> */}
        <div className={`ept-wrapper ${darkMode ? "dark" : "light"}`}>
          <div className="ept-denied">
            <p>Only doctors can edit prescription templates.</p>
            <button type="button" className="ept-btn ept-btn-ghost" onClick={() => navigate("/settings")}>
              <FaArrowLeft /> Back to Settings
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-layout">
      {/* <Sidebar /> */}
      <div className={`ept-wrapper ${darkMode ? "dark" : "light"}`}>
        <header className="ept-page-header">
          <button
            type="button"
            className="ept-back-btn"
            onClick={() => navigate("/settings")}
          >
            <FaArrowLeft /> Back
          </button>
          <div>
            <h1 className="ept-title">Edit Prescription Template</h1>
            <p className="ept-subtitle">
              Choose a design and customize your clinic header for all e-prescriptions
            </p>
          </div>
          <div className="ept-header-actions">
            <button type="button" className="ept-btn ept-btn-ghost" onClick={handleResetAll}>
              <FaUndo /> Reset
            </button>
            <button type="button" className="ept-btn ept-btn-primary" onClick={handleSave}>
              <FaSave /> Save Template
            </button>
          </div>
        </header>

        <div className="ept-layout">
          <section className="ept-panel ept-templates-panel">
            <h2 className="ept-panel-title">Choose Template</h2>
            <p className="ept-panel-desc">Click a design — it will apply to all prescriptions</p>
            <div className="ept-template-grid">
              {PRESCRIPTION_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  className={`ept-template-card ${config.templateId === tpl.id ? "active" : ""}`}
                  onClick={() => handleSelectTemplate(tpl.id)}
                >
                  <div className={`ept-template-preview ${tpl.slipClass}`}>
                    <div className="ept-mini-header">
                      <span className="ept-mini-logo" />
                      <span className="ept-mini-text">
                        <strong>{tpl.name}</strong>
                      </span>
                    </div>
                    <div className={`ept-mini-bar ${tpl.titleBarClass}`} />
                  </div>
                  <div className="ept-template-info">
                    <span className="ept-template-name">{tpl.name}</span>
                    <span className="ept-template-desc">{tpl.description}</span>
                  </div>
                  {config.templateId === tpl.id && (
                    <span className="ept-template-check">
                      <FaCheck />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </section>

          <section className="ept-panel ept-edit-panel">
            <h2 className="ept-panel-title">Customize Header</h2>
            <div className="ept-form">
              <div className="ept-form-group">
                <label>Clinic Logo</label>
                <div className="ept-logo-row">
                  <div className="ept-logo-preview">
                    {config.clinicLogo ? (
                      <img src={config.clinicLogo} alt="Clinic logo preview" />
                    ) : (
                      <FaImage className="ept-logo-placeholder" />
                    )}
                  </div>
                  <div className="ept-logo-actions">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={handleLogoUpload}
                    />
                    <button
                      type="button"
                      className="ept-btn ept-btn-secondary"
                      onClick={() => fileRef.current?.click()}
                    >
                      Change Image
                    </button>
                    <button
                      type="button"
                      className="ept-btn ept-btn-ghost"
                      onClick={handleResetLogo}
                    >
                      Reset Logo
                    </button>
                  </div>
                </div>
              </div>

              <div className="ept-form-group">
                <label htmlFor="ept-hospital-name">Center / Hospital Name</label>
                <input
                  id="ept-hospital-name"
                  type="text"
                  className="ept-input"
                  value={config.hospitalName}
                  onChange={(e) => handleFieldChange("hospitalName", e.target.value)}
                  placeholder="CuraAid Medical Center"
                />
              </div>

              <div className="ept-form-group">
                <label htmlFor="ept-hospital-address">Address / Subtitle</label>
                <input
                  id="ept-hospital-address"
                  type="text"
                  className="ept-input"
                  value={config.hospitalAddress}
                  onChange={(e) => handleFieldChange("hospitalAddress", e.target.value)}
                  placeholder="Smart Healthcare Platform — Pakistan"
                />
              </div>

              <div className="ept-form-group">
                <label htmlFor="ept-hospital-tel">Contact (Tel / Email)</label>
                <input
                  id="ept-hospital-tel"
                  type="text"
                  className="ept-input"
                  value={config.hospitalTel}
                  onChange={(e) => handleFieldChange("hospitalTel", e.target.value)}
                  placeholder="support@curaaid.com"
                />
              </div>

              <div className="ept-form-group">
                <label htmlFor="ept-title-text">Title Bar Text</label>
                <input
                  id="ept-title-text"
                  type="text"
                  className="ept-input"
                  value={config.titleText}
                  onChange={(e) => handleFieldChange("titleText", e.target.value)}
                  placeholder="PRESCRIPTION SLIP"
                />
              </div>

            </div>
          </section>

          <section className="ept-panel ept-preview-panel" ref={previewPanelRef}>
            <h2 className="ept-panel-title">Live Preview</h2>
            <p className="ept-panel-desc">This is how your prescription slip header will look</p>
            <div className="ept-preview-scroll" ref={previewScrollRef}>
              <div ref={previewSlipRef} style={{ width: SLIP_WIDTH, transformOrigin: "top left" }}>
                <PrescriptionSlip rx={previewRx} slipId="ept-preview-slip" />
              </div>
            </div>
          </section>
        </div>
      </div>

      <SaveSuccessPopup
        show={showSaveSuccess}
        darkMode={darkMode}
        onComplete={() => setShowSaveSuccess(false)}
      />
    </div>
  );
};

export default EPresTemplate;
