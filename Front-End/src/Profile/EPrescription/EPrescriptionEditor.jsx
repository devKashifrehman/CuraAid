// =============================================================================
// E-PRESCRIPTION EDITOR (Doctor only)
// Live slip preview + editable medicine fields for Clinic consultation
// =============================================================================
import React, { useMemo, useState, useEffect } from "react";
import { FaPlus, FaTrash, FaExpand, FaTimes } from "react-icons/fa";
import PrescriptionSlip from "./PrescriptionSlip";
import { normalizeData, EMPTY_MEDICINE } from "./eprescriptionData";
import "./EPrescriptionEditor.css";

const MED_FIELDS = [
  { key: "name", label: "Medicine", placeholder: "e.g. Azomax 250 mg Cap" },
  { key: "generic", label: "Generic", placeholder: "e.g. Azithromycin" },
  { key: "route", label: "Route", placeholder: "e.g. Oral" },
  { key: "frequency", label: "Frequency", placeholder: "e.g. 2 times per day" },
  { key: "duration", label: "Duration", placeholder: "e.g. 5 days" },
  { key: "comments", label: "Comments", placeholder: "e.g. 2 tabs each time" },
];

const VITAL_FIELDS = [
  { key: "pulse", label: "Pulse", placeholder: "e.g. 88 bpm" },
  { key: "bp", label: "BP", placeholder: "e.g. 120/80 mmHg" },
  { key: "temp", label: "Temp", placeholder: "e.g. 37.0 °F" },
  { key: "bsr", label: "BSR", placeholder: "e.g. 110 mg/dL" },
  { key: "respiratoryRate", label: "Respiratory Rate", placeholder: "e.g. 19/min" },
  { key: "oxygenSaturation", label: "Oxygen Saturation", placeholder: "e.g. 98%" },
  { key: "weight", label: "Weight", placeholder: "e.g. 72.0 Kg" },
];

const EPrescriptionEditor = ({ data, onChange, isDraft = false }) => {
  const rx = useMemo(() => normalizeData(data), [data]);
  const [previewExpanded, setPreviewExpanded] = useState(false);

  useEffect(() => {
    if (!previewExpanded) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setPreviewExpanded(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [previewExpanded]);

  const updateVital = (key, value) => {
    onChange({
      ...data,
      vitals: { ...(data.vitals || {}), [key]: value },
    });
  };

  const updateDiagnosis = (value) => {
    onChange({ ...data, diagnosis: value });
  };

  const updateAllergies = (value) => {
    onChange({ ...data, allergies: value });
  };

  const updatePresentingComplaint = (value) => {
    onChange({ ...data, presentingComplaint: value });
  };

  const updatePresentIllness = (value) => {
    onChange({ ...data, presentIllness: value });
  };

  const updateClinicalExamination = (value) => {
    onChange({ ...data, clinicalExamination: value });
  };

  const updateDoctorsNotes = (value) => {
    onChange({ ...data, doctorsNotes: value });
  };

  const updateMedicine = (index, field, value) => {
    const medicines = data.medicines.map((med, i) =>
      i === index ? { ...med, [field]: value } : med,
    );
    onChange({ ...data, medicines });
  };

  const addMedicine = () => {
    onChange({
      ...data,
      medicines: [...(data.medicines || []), { ...EMPTY_MEDICINE }],
    });
  };

  const removeMedicine = (index) => {
    if (data.medicines.length <= 1) return;
    onChange({
      ...data,
      medicines: data.medicines.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="epres-editor">
      {isDraft && (
        <div className="epres-editor-draft-badge" role="status">
          Draft saved — you can continue editing
        </div>
      )}

      <div className="epres-editor-preview-wrap">
        <div className="epres-editor-preview-head">
          <p className="epres-editor-label">Prescription Preview</p>
          <button
            type="button"
            className="epres-editor-expand-btn"
            onClick={() => setPreviewExpanded(true)}
            aria-label="Expand prescription preview"
            title="Expand preview"
          >
            <FaExpand size={12} />
          </button>
        </div>
        <button
          type="button"
          className="epres-editor-preview"
          onClick={() => setPreviewExpanded(true)}
          aria-label="Open full prescription preview"
        >
          <PrescriptionSlip rx={rx} slipId="cli-epres-preview" />
        </button>
      </div>

      {previewExpanded && (
        <div
          className="epres-preview-modal-overlay"
          onClick={() => setPreviewExpanded(false)}
          role="presentation"
        >
          <div
            className="epres-preview-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Prescription preview expanded"
          >
            <header className="epres-preview-modal-header">
              <h3>Prescription Preview</h3>
              <button
                type="button"
                className="epres-preview-modal-close"
                onClick={() => setPreviewExpanded(false)}
                aria-label="Close expanded preview"
              >
                <FaTimes />
              </button>
            </header>
            <div className="epres-preview-modal-body">
              <PrescriptionSlip rx={rx} slipId="cli-epres-preview-expanded" />
            </div>
          </div>
        </div>
      )}

      <div className="epres-editor-form epres-editor-diagnosis-form">
        <div className="epres-editor-form-head">
          <h4>Edit Diagnosis</h4>
        </div>
        <label className="epres-editor-field epres-editor-field-full">
          <span>Diagnosis</span>
          <textarea
            rows={3}
            value={data.diagnosis || ""}
            placeholder="e.g. Hypertension (Stage 1), Viral Fever..."
            onChange={(e) => updateDiagnosis(e.target.value)}
          />
        </label>
        <label className="epres-editor-field epres-editor-field-full">
          <span>Allergy Details</span>
          <textarea
            rows={2}
            value={data.allergies || ""}
            placeholder="e.g. Penicillin allergy, No known allergies"
            onChange={(e) => updateAllergies(e.target.value)}
          />
        </label>
        <label className="epres-editor-field epres-editor-field-full">
          <span>Presenting Complaint</span>
          <textarea
            rows={2}
            value={data.presentingComplaint || ""}
            placeholder="e.g. Fever, headache, sore throat..."
            onChange={(e) => updatePresentingComplaint(e.target.value)}
          />
        </label>
        <label className="epres-editor-field epres-editor-field-full">
          <span>Present Illness</span>
          <textarea
            rows={3}
            value={data.presentIllness || ""}
            placeholder="e.g. Duration: 3 days. Patient reports..."
            onChange={(e) => updatePresentIllness(e.target.value)}
          />
        </label>
        <label className="epres-editor-field epres-editor-field-full">
          <span>Clinical & Physical Examination</span>
          <textarea
            rows={3}
            value={data.clinicalExamination || ""}
            placeholder="e.g. Throat congested, chest clear..."
            onChange={(e) => updateClinicalExamination(e.target.value)}
          />
        </label>
        <label className="epres-editor-field epres-editor-field-full">
          <span>Doctor Notes</span>
          <textarea
            rows={3}
            value={data.doctorsNotes || ""}
            placeholder="e.g. Follow up in 2 weeks..."
            onChange={(e) => updateDoctorsNotes(e.target.value)}
          />
        </label>
      </div>

      <div className="epres-editor-form epres-editor-vitals-form">
        <div className="epres-editor-form-head">
          <h4>Edit Vitals</h4>
        </div>
        <div className="epres-editor-vitals-grid">
          {VITAL_FIELDS.map(({ key, label, placeholder }) => (
            <label key={key} className="epres-editor-field">
              <span>{label}</span>
              <input
                type="text"
                value={data.vitals?.[key] || ""}
                placeholder={placeholder}
                onChange={(e) => updateVital(key, e.target.value)}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="epres-editor-form">
        <div className="epres-editor-form-head">
          <h4>Edit Medications</h4>
          <button type="button" className="epres-editor-add-btn" onClick={addMedicine}>
            <FaPlus size={12} /> Add Medicine
          </button>
        </div>

        {(data.medicines || []).map((med, index) => (
          <div key={`med-${index}`} className="epres-editor-med-card">
            <div className="epres-editor-med-head">
              <span>Medicine #{index + 1}</span>
              {data.medicines.length > 1 && (
                <button
                  type="button"
                  className="epres-editor-remove-btn"
                  onClick={() => removeMedicine(index)}
                  aria-label={`Remove medicine ${index + 1}`}
                >
                  <FaTrash size={12} />
                </button>
              )}
            </div>
            <div className="epres-editor-fields">
              {MED_FIELDS.map(({ key, label, placeholder }) => (
                <label key={key} className="epres-editor-field">
                  <span>{label}</span>
                  <input
                    type="text"
                    value={med[key] || ""}
                    placeholder={placeholder}
                    onChange={(e) => updateMedicine(index, key, e.target.value)}
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EPrescriptionEditor;
