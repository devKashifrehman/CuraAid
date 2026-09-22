import React, { useState, useContext, useEffect } from "react";
import axios from "axios";
import { AuthContext } from "../../HeadFoot/Auth/AuthContext";
import { ThemeContext } from "../../Theme/ThemeContext";
import PrescriptionModal, { downloadEPrescription } from "../EPrescription";
import {
  FaDownload,
  FaPrescriptionBottleAlt,
  FaSearch,
  FaInfoCircle,
  FaHeadset,
  FaCalendarAlt,
} from "react-icons/fa";
import "./Prescription.css";
import Sidebar from "../Hamburger/sidebar";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

const generateInitialsAvatar = (name = "User") => {
  const initials = String(name || "User")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "U";

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
      <rect width="128" height="128" fill="#3BB6F3"/>
      <circle cx="64" cy="64" r="64" fill="rgba(255,255,255,0.12)"/>
      <text x="64" y="76" font-size="42" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" fill="#ffffff">${initials}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const resolveProfileImage = (img, fallbackName = "User") => {
  if (!img || typeof img !== "string") return generateInitialsAvatar(fallbackName);

  const trimmed = img.trim();
  if (!trimmed) return generateInitialsAvatar(fallbackName);
  if (trimmed.startsWith("http") || trimmed.startsWith("data:")) return trimmed;
  if (trimmed.startsWith("/")) return `${API_BASE_URL}${trimmed}`;

  const normalized = trimmed.replace(/^storage\//, "");
  return `${API_BASE_URL}/storage/${normalized}`;
};

const mapBackendPrescription = (p) => {
  const rawDate = p.updated_at || p.date || p.created_at || p.ended_at || p.follow_up_date || p.appointment_date || "";
  let displayDate = rawDate;

  try {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      displayDate = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    }
  } catch {}

  const timeSource = p.updated_at || p.time || p.created_at || p.ended_at || "";
  let displayTime = "";
  try {
    const t = new Date(timeSource);
    if (!isNaN(t.getTime())) {
      displayTime = t.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    }
  } catch {}

  return {
    id: p.id,
    patientName: p.patientName || "Patient",
    patientId: p.patientId ? `P-${p.patientId}` : "P-0000",
    patientAge: p.patientAge || "",
    patientGender: p.patientGender || "",
    doctorName: p.doctorName || "Doctor",
    doctorSpecialty: p.doctorSpecialty || "",
    doctorPmdc: "",
    doctorAvatar: resolveProfileImage(p.doctorAvatar || p.doctorImage || p.doctor_profile_image || ""),
    patientAvatar: resolveProfileImage(p.patientAvatar || p.patientImage || p.patient_profile_image || p.patient?.profile_image || ""),
    date: displayDate || "Date not available",
    rawDate: rawDate,
    time: displayTime,
    caseType: "Consultation",
    status: "completed",
    diagnosis: Array.isArray(p.diagnosis) ? p.diagnosis.join(", ") : (p.diagnosis || ""),
    medicines: Array.isArray(p.medicines)
      ? p.medicines.map(m => ({
          name: m.name || m.generic || "Medicine",
          generic: m.generic || "",
          route: m.route || "Oral",
          dosage: m.dosage || m.frequency || "",
          frequency: m.frequency || "",
          duration: m.duration || "",
          comments: m.comments || "",
        }))
      : [],
    advice: p.advice || "",
    allergies: p.allergies || "",
    presentingComplaint: p.presentingComplaint || "",
    presentIllness: p.presentIllness || "",
    clinicalExamination: p.clinicalExamination || "",
    vitals: p.vitals || {},
    validFor: "",
    history: [],
    notes: p.notes || "",
    documents: [],
  };
};

const mapToEpres = (prescription) => ({
  patientName: prescription.patientName || "Patient",
  presId: `PRES ${new Date().getFullYear()}/${String(prescription.id ?? 0).padStart(6, "0")}`,
  patientId: prescription.patientId || "",
  doctorName: prescription.doctorName || "Doctor",
  doctorSpecialty: prescription.doctorSpecialty || "",
  patientAge: prescription.patientAge || "",
  patientGender: prescription.patientGender || "",
  date: prescription.date || "",
  diagnosis: prescription.diagnosis || "",
  medicines: Array.isArray(prescription.medicines) ? prescription.medicines : [],
  advice: prescription.advice || "",
  allergies: prescription.allergies || "",
  presentingComplaint: prescription.presentingComplaint || "",
  presentIllness: prescription.presentIllness || "",
  clinicalExamination: prescription.clinicalExamination || "",
  vitals: prescription.vitals || {},
  notes: prescription.notes || "",
  createdOn: `${prescription.date || ""} ${prescription.time || ""}`,
  printedBy: new Date().toLocaleString("en-GB"),
});

// ========================== MAIN COMPONENT ==========================
const Prescription = () => {
  // ===== Context =====
  const { isDoctor, token, user } = useContext(AuthContext);
  const { darkMode } = useContext(ThemeContext);

  // ===== STATE MANAGEMENT =====
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalPrescription, setModalPrescription] = useState(null);

  // ===== PRESCRIPTIONS DATA =====
  const userKey = user?.id ?? user?.Id ?? "guest";

  const [prescriptions, setPrescriptions] = useState(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const fetchPrescriptions = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/prescriptions`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          timeout: 30000,
        });
        if (cancelled) return;
        const fetched = (res.data?.data ?? []).map(mapBackendPrescription);
        setPrescriptions(fetched);

        if (userKey && userKey !== "guest") {
          localStorage.setItem(`prescriptions_data_${userKey}`, JSON.stringify(fetched));
        }
      } catch (err) {
        if (!cancelled) console.error("Failed to fetch prescriptions:", err?.response?.data || err?.message);
      }
    };
    fetchPrescriptions();

    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchPrescriptions();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [token, userKey]);

  // ===== EXPIRY HELPER =====
  const getExpiryInfo = (p) => {
    const parseDate = (dateStr, rawDate) => {
      // Try rawDate first (YYYY-MM-DD from API)
      if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) return d;
      }
      // Fallback: parse "DD Mon YYYY" format
      const parts = dateStr.split(" ");
      if (parts.length >= 3) {
        const day = parseInt(parts[0]);
        const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const month = monthNames.indexOf(parts[1]);
        const year = parseInt(parts[2]);
        if (!isNaN(day) && month >= 0 && !isNaN(year)) return new Date(year, month, day);
      }
      // Last resort: try as-is
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? new Date() : d;
    };

    const presDate = parseDate(p.date, p.rawDate);
    const expiryDate = new Date(presDate);
    expiryDate.setMonth(expiryDate.getMonth() + 4);
    const now = new Date();

    if (now > expiryDate) {
      return {
        text: `Expired on ${expiryDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`,
        isExpired: true,
        percentage: 0,
      };
    }

    const totalDays = 120;
    const diffTime = expiryDate - now;
    const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const percentage = Math.max(
      0,
      Math.min(100, (remainingDays / totalDays) * 100),
    );

    const months = Math.floor(remainingDays / 30);
    const days = remainingDays % 30;

    return {
      text: `Valid for ${months} Months ${days} Days`,
      isExpired: false,
      percentage: percentage,
    };
  };

  // ===== CHECK IF PRESCRIPTION IS OLDER THAN 4 MONTHS =====
  const isOlderThan4Months = (p) => {
    const expiryInfo = getExpiryInfo(p);
    return expiryInfo.isExpired;
  };

  // ===== DOCTOR TABS =====
  const doctorTabs = [
    { key: "all", label: "All Prescriptions" },
    { key: "past", label: "Past Records" },
  ];

  // ===== SORT HELPER =====
  const sortForDoctorAll = (a, b) => {
    const aExpired = isOlderThan4Months(a);
    const bExpired = isOlderThan4Months(b);

    if (aExpired && !bExpired) return -1;
    if (!aExpired && bExpired) return 1;

    const parseDateSafe = (dateStr, rawDate) => {
      if (rawDate) { const d = new Date(rawDate); if (!isNaN(d.getTime())) return d; }
      const parts = dateStr.split(" ");
      if (parts.length >= 3) {
        const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const day = parseInt(parts[0]);
        const month = monthNames.indexOf(parts[1]);
        const year = parseInt(parts[2]);
        if (!isNaN(day) && month >= 0 && !isNaN(year)) return new Date(year, month, day);
      }
      return new Date(dateStr);
    };

    return parseDateSafe(b.date, b.rawDate) - parseDateSafe(a.date, a.rawDate);
  };

  // ===== FILTER LOGIC =====
  const safePrescriptions = Array.isArray(prescriptions) ? prescriptions : [];

  const filteredPrescriptions = safePrescriptions.filter((p) => {
    if (!isDoctor) {
      const expiryInfo = getExpiryInfo(p);
      if (expiryInfo.isExpired) return false;
    }

    const query = String(searchQuery || "").toLowerCase();
    const patientName = String(p.patientName || "");
    const diagnosis = String(p.diagnosis || "");
    const doctorName = String(p.doctorName || "");
    const matchesSearch =
      query === "" ||
      patientName.toLowerCase().includes(query) ||
      diagnosis.toLowerCase().includes(query) ||
      doctorName.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    if (isDoctor) {
      if (activeTab === "past") {
        return isOlderThan4Months(p);
      }
      return true;
    }

    return true;
  });

  const sortedPrescriptions =
    isDoctor && activeTab === "all"
      ? [...filteredPrescriptions].sort(sortForDoctorAll)
      : filteredPrescriptions;

  // ===== HANDLERS =====
  const handleViewPrescription = (prescription) => {
    setModalPrescription(prescription);
  };

  const handleCloseModal = () => {
    setModalPrescription(null);
  };

  const handleDownload = async (prescription) => {
    await downloadEPrescription(mapToEpres(prescription), "pdf");
  };

  // ========================== RENDER ==========================
  return (
    <div className={`prescription-layout ${darkMode ? "dark" : "light"}`}>
      <Sidebar />
      <div className="prescription-wrapper">
        {/* ========================== SECTION 1: PAGE HEADER ========================== */}
        <header className="prescription-header-section">
          <div className="prescription-header">
            <div className="prescription-header-left">
              <h1 className="prescription-title">
                {isDoctor ? "Patient Prescriptions" : "My Prescriptions"}
              </h1>
              <p className="prescription-subtitle">
                {isDoctor
                  ? "View and manage patient prescriptions"
                  : "View and manage your prescriptions"}
              </p>
            </div>
          </div>
        </header>

        {/* ========================== SECTION 2: TOOLBAR & SEARCH ========================== */}
        <section className="prescription-toolbar-section">
          <div className="prescription-toolbar">
            <div className="prescription-search-box" id="prescription-search">
              <FaSearch className="prescription-search-icon" />
              <input
                type="text"
                placeholder="Search prescriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* ========================== SECTION 3: DOCTOR TABS ========================== */}
        {isDoctor && (
          <section className="prescription-tabs-section">
            <div className="prescription-tabs">
              {doctorTabs.map((tab) => (
                <button
                  key={tab.key}
                  className={`prescription-tab-pill ${activeTab === tab.key ? "active" : ""}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ========================== SECTION 4: MAIN CONTENT ========================== */}
        <section className="prescription-content-section">
          <div className="prescription-content">
            {/* ===== SUB-SECTION 4.1: PRESCRIPTION CARDS GRID ===== */}
            <section className="prescription-cards-section">
              <div className="prescription-cards-grid">
                {prescriptions === null ? null : sortedPrescriptions.length === 0 ? (
                  <div className="prescription-no-data">
                    <FaPrescriptionBottleAlt className="prescription-no-data-icon" />
                    <p>No prescriptions found</p>
                  </div>
                ) : (
                  sortedPrescriptions.map((prescription) => {
                    const expiryInfo = getExpiryInfo(prescription);
                    const isOld = isOlderThan4Months(prescription);
                    const cardIdentity = isDoctor
                      ? {
                          name: prescription.patientName || "Patient",
                          specialty: "Patient",
                          avatar: resolveProfileImage(
                            prescription.patientAvatar || prescription.patientImage || prescription.patient_profile_image || "",
                            prescription.patientName || "Patient",
                          ),
                        }
                      : {
                          name: prescription.doctorName || "Doctor",
                          specialty: prescription.doctorSpecialty || "",
                          avatar: resolveProfileImage(
                            prescription.doctorAvatar || prescription.doctorImage || prescription.doctor_profile_image || "",
                            prescription.doctorName || "Doctor",
                          ),
                        };

                    return (
                      <div
                        key={prescription.id}
                        className={`prescription-card ${expiryInfo.isExpired ? "expired" : ""} ${isOld ? "old-prescription" : ""}`}
                      >
                        {/* Card Header */}
                        <div className="prescription-card-header">
                          <img
                            src={cardIdentity.avatar || generateInitialsAvatar(cardIdentity.name)}
                            alt={cardIdentity.name}
                            className="prescription-card-avatar"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = generateInitialsAvatar(cardIdentity.name);
                            }}
                          />
                          <div className="prescription-card-doctor-info">
                            <h3 className="prescription-card-doctor-name">
                              {cardIdentity.name}
                            </h3>
                            <p className="prescription-card-doctor-specialty">
                              {cardIdentity.specialty}
                            </p>
                            <p className="prescription-card-date">
                              {prescription.date}
                              {prescription.time ? `, ${prescription.time}` : ""}
                            </p>
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="prescription-card-body">
                          <div className="prescription-card-body-item">
                            <span className="prescription-card-label">
                              Diagnosis
                            </span>
                            <p className="prescription-card-value">
                              {prescription.diagnosis}
                            </p>
                          </div>
                          <div className="prescription-card-body-item">
                            <span className="prescription-card-label">
                              Medicines
                            </span>
                            <p className="prescription-card-value">
                              <FaPrescriptionBottleAlt className="prescription-card-med-icon" />
                              {Array.isArray(prescription.medicines) ? prescription.medicines.length : 0} Medicines
                            </p>
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div className="prescription-card-actions">
                          <button
                            className="prescription-view-btn"
                            onClick={() => handleViewPrescription(prescription)}
                          >
                            View Prescription
                          </button>
                          <button
                            className="prescription-download-btn"
                            onClick={() => handleDownload(prescription)}
                          >
                            <FaDownload />
                          </button>
                        </div>

                        {/* Card Footer */}
                        <div className="prescription-card-footer">
                          <p
                            className={`prescription-validity-text ${expiryInfo.isExpired ? "expired" : ""}`}
                          >
                            {isDoctor ? prescription.validFor : expiryInfo.text}
                          </p>
                          {!expiryInfo.isExpired && (
                            <div className="prescription-progress-bar">
                              <div
                                className="prescription-progress-fill"
                                style={{ width: `${expiryInfo.percentage}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* ===== SUB-SECTION 4.2: RIGHT SIDE INFO PANEL ===== */}
            <aside className="prescription-info-panel">
              {/* Important Information Box - Show for Patients only */}
              {!isDoctor && (
                <div className="prescription-info-box prescription-important-info">
                  <div className="prescription-info-header">
                    <div className="prescription-info-left">
                      <div className="prescription-info-icon prescription-info-icon-blue">
                        <FaInfoCircle />
                      </div>
                      <h4 className="prescription-info-title">
                        Important Information
                      </h4>
                    </div>
                    <div className="prescription-info-calendar">
                      <FaCalendarAlt />
                    </div>
                  </div>
                  <p className="prescription-info-text">
                    Prescriptions are available only for 4 months from the date
                    of prescription.
                  </p>
                  <p className="prescription-info-text">
                    After 4 months, they will be automatically deleted from our
                    system.
                  </p>
                </div>
              )}

              {/* Need Help Box - Show for both Patients and Doctors */}
              <div className="prescription-info-box prescription-help-info">
                <div className="prescription-info-header">
                  <div className="prescription-info-icon prescription-info-icon-purple">
                    <FaHeadset />
                  </div>
                  <h4 className="prescription-info-title">Need Help?</h4>
                </div>
                <p className="prescription-info-text">
                  {isDoctor
                    ? "If you need assistance managing patient prescriptions or have any questions."
                    : "If you have any question regarding your prescription."}
                </p>
                <button className="prescription-contact-btn">
                  Contact Support
                </button>
              </div>
            </aside>
          </div>
        </section>

        {/* ========================== SECTION 5: E-PRESCRIPTION MODAL ========================== */}
        {modalPrescription && (
          <PrescriptionModal
            data={mapToEpres(modalPrescription)}
            onClose={handleCloseModal}
          />
        )}
      </div>
    </div>
  );
};

export default Prescription;
