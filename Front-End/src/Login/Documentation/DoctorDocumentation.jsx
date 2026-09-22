import React, {
  useState,
  useContext,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { ThemeContext } from "../../Theme/ThemeContext";
import { AuthContext } from "../../HeadFoot/Auth/AuthContext";
import {
  FiArrowLeft,
  FiCheck,
  FiUpload,
  FiFileText,
  FiAward,
  FiHeart,
  FiBriefcase,
  FiEye,
  FiX,
  FiPlus,
  FiTrash2,
  FiChevronRight,
  FiImage,
  FiSearch,
} from "react-icons/fi";
import "./DoctorDocumentation.css";

// Predefined list of specialties (only these can be selected)
const PREDEFINED_SPECIALTIES = [
  "Cardiology",
  "Neurology",
  "Dermatology",
  "Pediatrics",
  "General Physician",
  "Dentist",
  "Eye Specialist",
  "Psychologist",
  "Gynecologist",
  "Orthopedics",
  "ENT Specialist",
  "Urologist",
  "Nephrologist",
  "Oncologist",
  "Radiologist",
  "Anesthesiologist",
  "Pathologist",
  "Pulmonologist",
  "Rheumatologist",
  "Endocrinologist",
  "Gastroenterologist",
  "Hematologist",
  "Infectious Disease Specialist",
  "Internal Medicine",
  "Family Medicine",
  "Emergency Medicine",
  "Sports Medicine",
  "Geriatric Medicine",
  "Palliative Care",
  "Sleep Medicine",
];

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

const DOCTOR_PROFILE_API = `${API_BASE_URL}/api/doctor/profile`;

const DoctorDocumentation = ({ onClose, onComplete }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode } = useContext(ThemeContext);
  const { token, login, logout } = useContext(AuthContext);

  // Doctor may not be logged in yet — use sessionStorage token from signup
  const effectiveToken = token || (() => {
    try { return sessionStorage.getItem("doc_signup_token"); } catch { return null; }
  })();
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSpecialties, setFilteredSpecialties] = useState([]);
  const specialtyInputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const completedRef = useRef(false);

  const [formData, setFormData] = useState({
    pmdcNumber: "",
    licenseExpiry: "",
    licenseImage: null,
    qualification: [{ degree: "", institution: "", year: "", image: null }],
    specialties: [],
    experiences: [
      {
        organization: "",
        designation: "",
        from: "",
        to: "",
        current: false,
        certificate: null,
      },
    ],
    documents: [],
  });

  const [specialtyInput, setSpecialtyInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* -----------------------------------------------
     SPECIALTY AUTOCOMPLETE LOGIC
     ----------------------------------------------- */
  useEffect(() => {
    if (specialtyInput.trim() === "") {
      setFilteredSpecialties([]);
      setShowSuggestions(false);
      return;
    }

    const filtered = PREDEFINED_SPECIALTIES.filter(
      (spec) =>
        spec.toLowerCase().includes(specialtyInput.toLowerCase().trim()) &&
        !formData.specialties.includes(spec),
    );
    setFilteredSpecialties(filtered);
    setShowSuggestions(filtered.length > 0);
  }, [specialtyInput, formData.specialties]); // Removed PREDEFINED_SPECIALTIES from deps since it's constant

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        specialtyInputRef.current &&
        !specialtyInputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // If the user leaves this page without completing the flow, roll back the
  // early signup session so login/signup shows again instead of the user icon.
  useEffect(() => {
    if (
      location.pathname !== "/doctor-documentation" &&
      !completedRef.current
    ) {
      logout();
      sessionStorage.removeItem("doc_signup_token");
      sessionStorage.removeItem("doc_signup_user");
    }
  }, [location.pathname, logout]);

  const handleSpecialtySelect = (specialty) => {
    if (specialty && specialty.trim()) {
      setFormData({
        ...formData,
        specialties: [specialty.trim()],
      });
    }
    setSpecialtyInput("");
    setFilteredSpecialties([]);
    setShowSuggestions(false);
  };

  const addSpecialty = () => {
    if (!specialtyInput.trim()) return;

    if (formData.specialties.length >= 1) {
      setErrors({
        ...errors,
        specialty: "Only one specialty can be selected at a time",
      });
      setTimeout(() => {
        setErrors((prev) => ({ ...prev, specialty: "" }));
      }, 3000);
      return;
    }

    const exactMatch = PREDEFINED_SPECIALTIES.find(
      (spec) => spec.toLowerCase() === specialtyInput.trim().toLowerCase(),
    );

    if (exactMatch) {
      handleSpecialtySelect(exactMatch);
    } else {
      setErrors({
        ...errors,
        specialty: "Please select from the suggested specialties only",
      });
      setTimeout(() => {
        setErrors((prev) => ({ ...prev, specialty: "" }));
      }, 3000);
    }
  };

  const removeSpecialty = (spec) => {
    if (spec) {
      setFormData({
        ...formData,
        specialties: [],
      });
    }
  };

  /* -----------------------------------------------
     IMAGE HANDLERS (License / Degree / Experience)
     ----------------------------------------------- */
  const handleImageUpload = (e, type, index = null) => {
    const file = e.target.files[0];
    if (!file) return;
    const imgData = {
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: (file.size / 1024).toFixed(1) + " KB",
      url: URL.createObjectURL(file),
      file: file,
    };

    if (type === "license") {
      setFormData((prev) => ({ ...prev, licenseImage: imgData }));
    } else if (type === "qualification" && index !== null) {
      const updated = [...formData.qualification];
      updated[index].image = imgData;
      setFormData((prev) => ({ ...prev, qualification: updated }));
    } else if (type === "experience" && index !== null) {
      const updated = [...formData.experiences];
      updated[index].certificate = imgData;
      setFormData((prev) => ({ ...prev, experiences: updated }));
    }
    // clear error
    setErrors((prev) => {
      const n = { ...prev }; 
      delete n[type];
      return n;
    });
  };

  const removeImage = (type, index = null) => {
    if (type === "license") {
      if (formData.licenseImage?.url)
        URL.revokeObjectURL(formData.licenseImage.url);
      setFormData((prev) => ({ ...prev, licenseImage: null }));
    } else if (type === "qualification" && index !== null) {
      const updated = [...formData.qualification];
      if (updated[index].image?.url)
        URL.revokeObjectURL(updated[index].image.url);
      updated[index].image = null;
      setFormData((prev) => ({ ...prev, qualification: updated }));
    } else if (type === "experience" && index !== null) {
      const updated = [...formData.experiences];
      if (updated[index].certificate?.url)
        URL.revokeObjectURL(updated[index].certificate.url);
      updated[index].certificate = null;
      setFormData((prev) => ({ ...prev, experiences: updated }));
    }
  };

  /* -----------------------------------------------
     VALIDATION (Images are now mandatory)
     ----------------------------------------------- */
  const isStepComplete = useCallback(
    (step) => {
      switch (step) {
        case 1:
          return (
            formData.pmdcNumber.trim().length >= 3 &&
            formData.licenseExpiry !== "" &&
            formData.licenseImage !== null
          );
        case 2:
          return formData.qualification.every(
            (q) =>
              q.degree.trim() &&
              q.institution.trim() &&
              q.year &&
              q.image !== null,
          );
        case 3:
          return formData.specialties.length === 1;
        case 4:
          return formData.experiences.every(
            (e) =>
              e.organization.trim() &&
              e.designation.trim() &&
              e.from &&
              e.certificate !== null,
          );
        case 5:
          return formData.documents.length > 0;
        default:
          return false;
      }
    },
    [formData],
  );

  /* -----------------------------------------------
     NAVIGATION
     ----------------------------------------------- */
  const goToStep = (step) => {
    if (
      step <= currentStep ||
      isStepComplete(step - 1) ||
      step === currentStep
    ) {
      setCurrentStep(step);
    }
  };

  const nextStep = () => {
    if (currentStep < 5 && isStepComplete(currentStep)) {
      setCurrentStep((prev) => prev + 1);
      setErrors({});
    } else {
      validateCurrentStep();
    }
  };

  const prevStep = () => {
    setErrors({});
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    } else if (onClose) {
      onClose();
    } else {
      navigate("/role-selection", { replace: true });
    }
  };

  const validateCurrentStep = () => {
    const newErrors = {};
    if (currentStep === 1) {
      if (!formData.pmdcNumber.trim())
        newErrors.pmdcNumber = "PMDC number is required";
      if (!formData.licenseExpiry)
        newErrors.licenseExpiry = "Expiry date is required";
      if (!formData.licenseImage)
        newErrors.licenseImage = "License image is required";
    }
    setErrors(newErrors);
  };

  /* -----------------------------------------------
     FORM UPDATERS
     ----------------------------------------------- */
  const updateQualification = (index, field, value) => {
    const updated = [...formData.qualification];
    updated[index][field] = value;
    setFormData({ ...formData, qualification: updated });
  };

  const addQualification = () => {
    setFormData({
      ...formData,
      qualification: [
        ...formData.qualification,
        { degree: "", institution: "", year: "", image: null },
      ],
    });
  };

  const removeQualification = (index) => {
    if (formData.qualification.length === 1) return;
    const updated = formData.qualification.filter((_, i) => i !== index);
    if (formData.qualification[index].image?.url)
      URL.revokeObjectURL(formData.qualification[index].image.url);
    setFormData({ ...formData, qualification: updated });
  };

  const updateExperience = (index, field, value) => {
    const updated = [...formData.experiences];
    updated[index][field] = value;
    setFormData({ ...formData, experiences: updated });
  };

  const addExperience = () => {
    setFormData({
      ...formData,
      experiences: [
        ...formData.experiences,
        {
          organization: "",
          designation: "",
          from: "",
          to: "",
          certificate: null, 
        },
      ],
    });
  };

  const removeExperience = (index) => {
    if (formData.experiences.length === 1) return;
    const updated = formData.experiences.filter((_, i) => i !== index);
    if (formData.experiences[index].certificate?.url)
      URL.revokeObjectURL(formData.experiences[index].certificate.url);
    setFormData({ ...formData, experiences: updated });
  };

  /* -----------------------------------------------
     STEP 5: GENERAL DOCUMENT UPLOAD
     ----------------------------------------------- */
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const docs = files.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: (file.size / 1024).toFixed(1) + " KB",
      file: file,
      url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    }));
    setFormData((prev) => ({
      ...prev,
      documents: [...prev.documents, ...docs],
    }));
  };

  const removeDocument = (id) => {
    const doc = formData.documents.find((d) => d.id === id);
    if (doc?.url) URL.revokeObjectURL(doc.url);
    setFormData((prev) => ({
      ...prev,
      documents: prev.documents.filter((d) => d.id !== id),
    }));
  };

  const handleComplete = async () => {
    if (!isStepComplete(5) || isSubmitting) return;

    setErrors((prev) => ({ ...prev, submit: "" }));
    setIsSubmitting(true);

    try {
      const payload = new FormData();
      payload.append("pmdc_number", formData.pmdcNumber);
      payload.append("license_expiry", formData.licenseExpiry);
      payload.append("specialties", JSON.stringify(formData.specialties));
      payload.append(
        "qualifications",
        JSON.stringify(
          formData.qualification.map(({ degree, institution, year }) => ({
            degree,
            institution,
            year,
          })),
        ),
      );
      payload.append(
        "experiences",
        JSON.stringify(
          formData.experiences.map(
            ({ organization, designation, from, to, current }) => ({
              organization,
              designation,
              from,
              to,
              current,
            }),
          ),
        ),
      );

      payload.append("license_image", formData.licenseImage.file);
      formData.qualification.forEach((qualification, index) => {
        payload.append(`qualificationImage_${index}`, qualification.image.file);
      });
      formData.experiences.forEach((experience, index) => {
        payload.append(`experienceCertificate_${index}`, experience.certificate.file);
      });
      if (formData.documents.length > 0) {
        payload.append("cnic_document", formData.documents[0].file);
      }

      await axios.post(DOCTOR_PROFILE_API, payload, {
        headers: {
          ...(effectiveToken ? { Authorization: `Bearer ${effectiveToken}` } : {}),
          Accept: "application/json",
        },
        timeout: 30000,
      });

      // Now complete signup — login the doctor
      try {
        const signupUser = JSON.parse(sessionStorage.getItem("doc_signup_user") || "{}");
        if (signupUser.token) {
          login(signupUser, "doctor", signupUser.token);
        }
      } catch (e) {}
      sessionStorage.removeItem("doc_signup_token");
      sessionStorage.removeItem("doc_signup_user");

      completedRef.current = true;
      onComplete?.(formData);
      navigate("/dashboard?role=doctor", { replace: true });
    } catch (error) {
      const errorDetails = {
        name: error?.name,
        message: error?.message,
        code: error?.code,
        status: error?.response?.status,
        responseData: error?.response?.data,
        requestUrl: error?.config?.url,
        requestMethod: error?.config?.method,
        requestHeaders: error?.config?.headers,
        cause: error?.cause,
        axiosDetails: error?.toJSON?.(),
      };
      console.group("Doctor profile submission failed");
      console.error("Original error:", error);
      console.table(errorDetails);
      console.log("Full error details:", errorDetails);
      console.groupEnd();

      const apiData = error?.response?.data;
      const apiMessage = apiData?.message || apiData?.error;
      const fieldErrors = apiData?.errors;
      let message;
      if (fieldErrors && typeof fieldErrors === "object") {
        message = Object.values(fieldErrors).flat().join(" ");
      } else if (typeof apiMessage === "string") {
        message = apiMessage;
      } else {
        message = "Could not submit your doctor profile. Please try again.";
      }
      setErrors((prev) => ({ ...prev, submit: message }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { id: 1, label: "License", icon: <FiFileText /> },
    { id: 2, label: "Qualification", icon: <FiAward /> },
    { id: 3, label: "Specialties", icon: <FiHeart /> },
    { id: 4, label: "Experience", icon: <FiBriefcase /> },
    { id: 5, label: "Review", icon: <FiEye /> },
  ];

  /* ============================================
     RENDER
     ============================================ */
  return (
    <div
      id="modal-overlay"
      className={`${darkMode ? "dark" : "light"} doctor-doc-overlay`}
      onClick={onClose}
    >
      <div className="doc-container" onClick={(e) => e.stopPropagation()}>
        {/* TOP: Back Button << */}
        <button
          className="doc-back-btn"
          onClick={prevStep}
          aria-label="Go back"
        >
          <FiArrowLeft size={20} />
        </button>

        {/* HEADER */}
        <h1 className="doc-title">Doctor Documentation</h1>
        <p className="doc-subtitle">
          Complete your professional profile to get verified
        </p>

        {/* PROGRESS BAR */}
        <div className="progress-wrapper">
          <div className="progress-line-bg" />
          <div
            className="progress-line-fill"
            style={{
              width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
            }}
          />
          <div className="progress-steps">
            {steps.map((step) => {
              const isCompleted =
                step.id < currentStep || (step.id === 5 && isStepComplete(5));
              const isActive = step.id === currentStep;
              const isClickable =
                step.id <= currentStep || isStepComplete(step.id - 1);

              return (
                <div
                  key={step.id}
                  className={`progress-step ${isActive ? "active" : ""} ${
                    isCompleted ? "completed" : ""
                  } ${isClickable ? "clickable" : ""}`}
                  onClick={() => isClickable && goToStep(step.id)}
                >
                  <div className="step-circle">
                    {isCompleted ? (
                      <FiCheck size={14} strokeWidth={3} />
                    ) : (
                      step.icon
                    )}
                  </div>
                  <span className="step-label">{step.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* FORM CONTENT */}
        <div className="form-content">
          {/* ---------- STEP 1: LICENSE ---------- */}
          {currentStep === 1 && (
            <div className="step-panel animate-in">
              <div className="step-header">
                <FiFileText className="step-header-icon" />
                <h3>PMDC / Medical License</h3>
              </div>

              <div className="form-row two-col">
                <div className="form-group">
                  <label>
                    PMDC / Medical License Number <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 12345-A"
                    value={formData.pmdcNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, pmdcNumber: e.target.value })
                    }
                    className={errors.pmdcNumber ? "error" : ""}
                  />
                  {errors.pmdcNumber && (
                    <span className="error-text">{errors.pmdcNumber}</span>
                  )}
                </div>
                <div className="form-group">
                  <label>
                    License Expiry Date <span className="req">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.licenseExpiry}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        licenseExpiry: e.target.value,
                      })
                    }
                    className={errors.licenseExpiry ? "error" : ""}
                  />
                  {errors.licenseExpiry && (
                    <span className="error-text">{errors.licenseExpiry}</span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>
                  Upload License Image <span className="req">*</span>
                </label>
                <div className="image-uploader-row">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, "license")}
                    id="license-img"
                    hidden
                  />
                  <label htmlFor="license-img" className="upload-btn-compact">
                    <FiImage size={18} />
                    {formData.licenseImage ? "Change Image" : "Choose Image"}
                  </label>
                  {formData.licenseImage && (
                    <div className="preview-thumb">
                      <img src={formData.licenseImage.url} alt="License" />
                      <button
                        className="thumb-remove"
                        onClick={() => removeImage("license")}
                        type="button"
                      >
                        <FiX size={12} />
                      </button>
                    </div>
                  )}
                </div>
                {!formData.licenseImage && (
                  <span className="hint-text">
                    Please upload a clear photo of your medical license card
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ---------- STEP 2: QUALIFICATION ---------- */}
          {currentStep === 2 && (
            <div className="step-panel animate-in">
              <div className="step-header">
                <FiAward className="step-header-icon" />
                <h3>Medical Qualification</h3>
              </div>

              {formData.qualification.map((q, idx) => (
                <div key={idx} className="repeatable-card">
                  <div className="repeatable-header">
                    <span>Qualification #{idx + 1}</span>
                    {formData.qualification.length > 1 && (
                      <button
                        className="icon-btn danger"
                        onClick={() => removeQualification(idx)}
                      >
                        <FiTrash2 size={16} />
                      </button>
                    )}
                  </div>
                  <div className="form-row three-col">
                    <div className="form-group">
                      <label>
                        Degree <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="MBBS, FCPS, etc."
                        value={q.degree}
                        onChange={(e) =>
                          updateQualification(idx, "degree", e.target.value)
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>
                        Institution <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="University name"
                        value={q.institution}
                        onChange={(e) =>
                          updateQualification(
                            idx,
                            "institution",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>
                        Year <span className="req">*</span>
                      </label>
                      <select
                        value={q.year}
                        onChange={(e) =>
                          updateQualification(idx, "year", e.target.value)
                        }
                        className="year-select"
                      >
                        <option value="">Select Year</option>
                        {Array.from({ length: 60 }, (_, i) => {
                          const year = new Date().getFullYear() - i;
                          return (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>
                      Upload Degree Image <span className="req">*</span>
                    </label>
                    <div className="image-uploader-row">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          handleImageUpload(e, "qualification", idx)
                        }
                        id={`qual-img-${idx}`}
                        hidden
                      />
                      <label
                        htmlFor={`qual-img-${idx}`}
                        className="upload-btn-compact"
                      >
                        <FiImage size={18} />
                        {q.image ? "Change" : "Choose Image"}
                      </label>
                      {q.image && (
                        <div className="preview-thumb">
                          <img src={q.image.url} alt="Degree" />
                          <button
                            className="thumb-remove"
                            onClick={() => removeImage("qualification", idx)}
                            type="button"
                          >
                            <FiX size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <button className="add-more-btn" onClick={addQualification}>
                <FiPlus size={16} /> Add Another Qualification
              </button>
            </div>
          )}

          {/* ---------- STEP 3: SPECIALTIES ---------- */}
          {currentStep === 3 && (
            <div className="step-panel animate-in">
              <div className="step-header">
                <FiHeart className="step-header-icon" />
                <h3>Specialties</h3>
              </div>

              <div className="form-group">
                <label>Add Your Specialties</label>
                <div className="chip-input-wrapper" ref={suggestionsRef}>
                  <div className="specialty-input-container">
                    <FiSearch className="search-icon" />
                    <input
                      ref={specialtyInputRef}
                      type="text"
                      placeholder="Type to search specialties (e.g. Cardiology)"
                      value={specialtyInput}
                      onChange={(e) => {
                        setSpecialtyInput(e.target.value);
                        if (errors.specialty) {
                          setErrors({ ...errors, specialty: "" });
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (filteredSpecialties.length === 1) {
                            handleSpecialtySelect(filteredSpecialties[0]);
                          } else {
                            addSpecialty();
                          }
                        }
                      }}
                      className={errors.specialty ? "error" : ""}
                    />
                    {showSuggestions && filteredSpecialties.length > 0 && (
                      <div className="specialty-suggestions">
                        {filteredSpecialties.map((spec) => (
                          <div
                            key={spec}
                            className="suggestion-item"
                            onClick={() => handleSpecialtySelect(spec)}
                          >
                            <FiHeart size={14} />
                            <span>{spec}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button className="chip-add-btn" onClick={addSpecialty}>
                    <FiPlus size={18} />
                  </button>
                </div>
                {errors.specialty && (
                  <span className="error-text">{errors.specialty}</span>
                )}
                <span className="hint-text">
                  Only predefined specialties can be added. Type to search from
                  the list.
                </span>
              </div>

              <div className="chips-container">
                {formData.specialties.map((spec) => (
                  <span key={spec} className="chip">
                    {spec}
                    <button onClick={() => removeSpecialty(spec)}>
                      <FiX size={14} />
                    </button>
                  </span>
                ))}
                {formData.specialties.length === 0 && (
                  <p className="empty-hint">
                    No specialties added yet. Add at least one to continue.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ---------- STEP 4: EXPERIENCE ---------- */}
          {currentStep === 4 && (
            <div className="step-panel animate-in">
              <div className="step-header">
                <FiBriefcase className="step-header-icon" />
                <h3>Professional Experience</h3>
              </div>

              {formData.experiences.map((exp, idx) => (
                <div key={idx} className="repeatable-card">
                  <div className="repeatable-header">
                    <span>Experience #{idx + 1}</span>
                    {formData.experiences.length > 1 && (
                      <button
                        className="icon-btn danger"
                        onClick={() => removeExperience(idx)}
                      >
                        <FiTrash2 size={16} />
                      </button>
                    )}
                  </div>
                  <div className="form-row two-col">
                    <div className="form-group">
                      <label>
                        Organization / Hospital <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Hospital name"
                        value={exp.organization}
                        onChange={(e) =>
                          updateExperience(idx, "organization", e.target.value)
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>
                        Designation <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Senior Consultant"
                        value={exp.designation}
                        onChange={(e) =>
                          updateExperience(idx, "designation", e.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div className="form-row two-col">
                    <div className="form-group">
                      <label>
                        From <span className="req">*</span>
                      </label>
                      <input
                        type="date"
                        value={exp.from}
                        onChange={(e) =>
                          updateExperience(idx, "from", e.target.value)
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>To {exp.current && "(Current)"}</label>
                      <input
                        type="date"
                        value={exp.to}
                        disabled={exp.current}
                        onChange={(e) =>
                          updateExperience(idx, "to", e.target.value)
                        }
                      />
                    </div>
                  </div>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={exp.current}
                      onChange={(e) =>
                        updateExperience(idx, "current", e.target.checked)
                      }
                    />
                    Currently working here
                  </label>

                  <div className="form-group" style={{ marginTop: "0.75rem" }}>
                    <label>
                      Upload Experience Certificate{" "}
                      <span className="req">*</span>
                    </label>
                    <div className="image-uploader-row">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          handleImageUpload(e, "experience", idx)
                        }
                        id={`exp-img-${idx}`}
                        hidden
                      />
                      <label
                        htmlFor={`exp-img-${idx}`}
                        className="upload-btn-compact"
                      >
                        <FiImage size={18} />
                        {exp.certificate ? "Change" : "Choose Image"}
                      </label>
                      {exp.certificate && (
                        <div className="preview-thumb">
                          <img src={exp.certificate.url} alt="Certificate" />
                          <button
                            className="thumb-remove"
                            onClick={() => removeImage("experience", idx)}
                            type="button"
                          >
                            <FiX size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <button className="add-more-btn" onClick={addExperience}>
                <FiPlus size={16} /> Add Another Experience
              </button>
            </div>
          )}

          {/* ---------- STEP 5: REVIEW & DOCS ---------- */}
          {currentStep === 5 && (
            <div className="step-panel animate-in">
              <div className="step-header">
                <FiEye className="step-header-icon" />
                <h3>Review & Document Submission</h3>
              </div>

              {/* Review Summary */}
              <div className="review-section">
                <h4 onClick={() => goToStep(1)} className="review-edit-link">
                  <FiFileText /> License Info <span>Edit</span>
                </h4>
                <div className="review-grid">
                  <div>
                    <span>PMDC Number</span>
                    <p>{formData.pmdcNumber || "—"}</p>
                  </div>
                  <div>
                    <span>License Expiry</span>
                    <p>{formData.licenseExpiry || "—"}</p>
                  </div>
                </div>
              </div>

              <div className="review-section">
                <h4 onClick={() => goToStep(2)} className="review-edit-link">
                  <FiAward /> Qualifications <span>Edit</span>
                </h4>
                {formData.qualification.map((q, i) => (
                  <div key={i} className="review-item">
                    <p>
                      <strong>{q.degree}</strong> — {q.institution} ({q.year})
                    </p>
                  </div>
                ))}
              </div>

              <div className="review-section">
                <h4 onClick={() => goToStep(3)} className="review-edit-link">
                  <FiHeart /> Specialties <span>Edit</span>
                </h4>
                <div className="chips-container static">
                  {formData.specialties.map((s) => (
                    <span key={s} className="chip">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="review-section">
                <h4 onClick={() => goToStep(4)} className="review-edit-link">
                  <FiBriefcase /> Experience <span>Edit</span>
                </h4>
                {formData.experiences.map((e, i) => (
                  <div key={i} className="review-item">
                    <p>
                      <strong>{e.designation}</strong> at {e.organization}
                    </p>
                    <small>
                      {e.from} {e.to ? `→ ${e.to}` : "→ Present"}
                    </small>
                  </div>
                ))}
              </div>

              {/* LINKEDIN-STYLE IMAGE GALLERY */}
              <div className="review-gallery-section">
                <h4 className="gallery-title">
                  <FiImage /> Uploaded Images & Documents
                </h4>
                <div className="gallery-grid">
                  {formData.licenseImage && (
                    <div className="gallery-item">
                      <img src={formData.licenseImage.url} alt="License" />
                      <div className="gallery-overlay">
                        <span>License</span>
                        <small>{formData.licenseImage.name}</small>
                      </div>
                    </div>
                  )}
                  {formData.qualification.map(
                    (q, i) =>
                      q.image && (
                        <div className="gallery-item" key={`qual-${i}`}>
                          <img src={q.image.url} alt={`Degree ${i + 1}`} />
                          <div className="gallery-overlay">
                            <span>{q.degree || `Degree #${i + 1}`}</span>
                            <small>{q.image.name}</small>
                          </div>
                        </div>
                      ),
                  )}
                  {formData.experiences.map(
                    (e, i) =>
                      e.certificate && (
                        <div className="gallery-item" key={`exp-${i}`}>
                          <img src={e.certificate.url} alt={`Exp ${i + 1}`} />
                          <div className="gallery-overlay">
                            <span>
                              {e.designation || `Certificate #${i + 1}`}
                            </span>
                            <small>{e.certificate.name}</small>
                          </div>
                        </div>
                      ),
                  )}
                  {formData.documents
                    .filter((d) => d.url)
                    .map((doc) => (
                      <div className="gallery-item" key={doc.id}>
                        <img src={doc.url} alt={doc.name} />
                        <div className="gallery-overlay">
                          <span>Document</span>
                          <small>{doc.name}</small>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Additional Documents Upload */}
              <div className="upload-section">
                <h4>
                  <FiUpload /> Additional Documents{" "}
                  <span className="required-badge">Required</span>
                </h4>
                <p className="upload-hint">
                  Upload your CNIC Front Side (PDF, JPG, PNG)
                </p>

                <div className="upload-zone">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    id="doc-upload"
                    hidden
                  />
                  <label htmlFor="doc-upload" className="upload-label">
                    <FiUpload size={32} />
                    <span>Click or drag files to upload</span>
                  </label>
                </div>

                {formData.documents.length > 0 && (
                  <div className="file-list">
                    {formData.documents.map((doc) => (
                      <div key={doc.id} className="file-item">
                        <FiFileText size={18} />
                        <div className="file-info">
                          <span className="file-name">{doc.name}</span>
                          <span className="file-size">{doc.size}</span>
                        </div>
                        <button
                          className="icon-btn danger"
                          onClick={() => removeDocument(doc.id)}
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM ACTIONS — ONLY NEXT / COMPLETE (CENTERED) */}
        <div className="form-actions">
          {errors.submit && <span className="error-text">{errors.submit}</span>}
          {currentStep < 5 ? (
            <button
              className="doc-action-btn primary"
              onClick={nextStep}
              disabled={!isStepComplete(currentStep)}
            >
              Next <FiChevronRight size={18} />
            </button>
          ) : (
            <button
              className="doc-action-btn success"
              onClick={handleComplete}
              disabled={!isStepComplete(5) || isSubmitting}
            >
              <FiCheck size={18} /> {isSubmitting ? "Submitting..." : "Complete Signup"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorDocumentation;
 
