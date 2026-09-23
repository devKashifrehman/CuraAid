import React, { useContext, useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaCheckCircle,
  FaHourglassHalf,
  FaTimesCircle,
  FaSearch,
  FaChevronRight,
  FaChevronDown,
  FaChevronUp,
  FaPhoneAlt,
  FaEnvelope,
  FaNotesMedical, 
  FaPills,
  FaCalendarAlt,
  FaTimes,
  FaHeartbeat,
  FaClipboardList,
  FaFlag,
  FaEdit,
  FaSave,
  FaUndo,
  FaClock,
  FaVideo,
  FaRedo,
  FaStar,
} from "react-icons/fa";
import ComplaintModal from "../ComplaintModal/ComplaintModal";
import FeedbackModal from "../FeedbackModal/FeedbackModal";
import "./Consultation.css";
import { ThemeContext } from "../../Theme/ThemeContext";
import { AuthContext } from "../../HeadFoot/Auth/AuthContext";
import Sidebar from "../Hamburger/sidebar";

//==================== Constants ============================
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";
const PRE_JOIN_WINDOW_MINUTES = 15;

const canFileReport = (consultation) => {
  if (!consultation) return false;
  const s = consultation.status;
  if (s === "Active" || s === "Ongoing") return true;
  if (s === "Completed" || s === "Cancelled") {
    const completedDate = consultation.completedAt ? new Date(consultation.completedAt) : null;
    if (!completedDate) return false;
    const now = new Date();
    return (
      completedDate.getFullYear() === now.getFullYear() &&
      completedDate.getMonth() === now.getMonth() &&
      completedDate.getDate() === now.getDate()
    );
  }
  return false;
};

//==================== Date Helpers ============================
const monthNames = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

const parseConsultationDate = (dateStr) => {
  if (!dateStr) return null;
  const raw = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [y, m, d] = raw.slice(0, 10).split("-").map(Number);
    if (y && m && d) return new Date(y, m - 1, d);
  }
  const normalized = raw
    .replace(/(\d+)(st|nd|rd|th)/gi, "$1")
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const parts = normalized.split(" ");
  if (parts.length >= 3) {
    let day, month, year;
    if (/^\d{1,2}$/.test(parts[0])) {
      day = parseInt(parts[0], 10);
      const monthKey = parts[1].slice(0, 3).toLowerCase();
      month = monthNames.findIndex((m) => m.toLowerCase() === monthKey);
      year = parseInt(parts[2], 10);
    } else if (/^\d{1,2}$/.test(parts[1])) {
      const monthKey = parts[0].slice(0, 3).toLowerCase();
      month = monthNames.findIndex((m) => m.toLowerCase() === monthKey);
      day = parseInt(parts[1], 10);
      year = parseInt(parts[2], 10);
    }
    if (day && month >= 0 && !Number.isNaN(year) && day >= 1 && day <= 31) {
      return new Date(year, month, day);
    }
  }
  const fallback = new Date(normalized);
  if (Number.isNaN(fallback.getTime())) return null;
  return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());
};

const isSameCalendarDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const cleaned = String(timeStr).trim();
  const match12 = cleaned.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const period = match12[3].toUpperCase();
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  const match24 = cleaned.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return hours * 60 + minutes;
    }
  }
  return null;
};

const formatDisplayToInput = (displayDate) => {
  try {
    const parsed = parseConsultationDate(displayDate);
    if (!parsed) return displayDate;
    const day = String(parsed.getDate()).padStart(2, "0");
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const year = parsed.getFullYear();
    return `${year}-${month}-${day}`;
  } catch {
    return displayDate;
  }
};

const formatInputToDisplay = (inputDate) => {
  try {
    const [year, month, day] = inputDate.split("-");
    return `${day} ${monthNames[parseInt(month) - 1]} ${year}`;
  } catch {
    return inputDate;
  }
};

const getDayName = (dateStr) => {
  try {
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
      return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long" });
    }
    const parsed = parseConsultationDate(dateStr);
    if (parsed) return parsed.toLocaleDateString("en-US", { weekday: "long" });
    return new Date(dateStr).toLocaleDateString("en-US", { weekday: "long" });
  } catch {
    return "";
  }
};

const generateTimeSlots = () => {
  const slots = [];
  const toLabel = (h24, m) => {
    const period = h24 >= 12 ? "PM" : "AM";
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    return `${h12.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${period}`;
  };
  const addSlots = (h12, period) => {
    let h24 = h12;
    if (period === "PM" && h12 !== 12) h24 += 12;
    if (period === "AM" && h12 === 12) h24 = 0;
    slots.push({ value: `${h24.toString().padStart(2, "0")}:00`, display: toLabel(h24, 0) });
    slots.push({ value: `${h24.toString().padStart(2, "0")}:30`, display: toLabel(h24, 30) });
  };
  for (let h = 12; h <= 12; h++) addSlots(h, "PM");
  for (let h = 1; h <= 11; h++) addSlots(h, "PM");
  for (let h = 12; h <= 12; h++) addSlots(h, "AM");
  for (let h = 1; h <= 11; h++) addSlots(h, "AM");
  slots.push({ value: "custom", display: "Custom Time" });
  return slots;
};

const timeSlots = generateTimeSlots();

const to12hLabel = (val) => {
  if (!val || val === "custom") return val || "";
  const [h, m] = val.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return val;
  const period = h >= 12 ? "PM" : "AM";
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${period}`;
};

const CONSULTATION_TYPES = [
  "Video Consultation",
  "Voice Consultation",
  "Chat Consultation",
];

const formatDoctorDisplayName = (name) => {
  if (!name) return "";
  const trimmed = String(name).trim();
  if (!trimmed) return "";
  if (/^Dr\.?\s+/i.test(trimmed)) return trimmed;
  return `Dr. ${trimmed}`;
};

//==================== Data ============================
const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";
const resolveProfileImage = (img) => {
  if (!img) return null;
  if (img.startsWith("http")) return img;
  if (img.startsWith("/")) return `${API_BASE}${img}`;
  return `${API_BASE}/storage/${img}`;
};

const mapBackendConsultation = (c) => {
  const patient = c.patient || {};
  const doctor = c.doctor || {};
  const doctorUser = doctor.user || {};
  const statusMap = {
    pending: "Pending",
    ongoing: "Ongoing",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  const typeMap = { video: "Video Consultation", audio: "Voice Consultation", chat: "Chat Consultation" };

  const specialties = Array.isArray(doctor.specialties)
    ? doctor.specialties
    : (typeof doctor.specialties === "string" ? JSON.parse(doctor.specialties || "[]") : []);
  const primarySpecialty = specialties.length > 0 ? specialties[0] : doctor.specialization || "General";
  const expYears = doctor.experience_years || doctor.experience || 0;

  const dob = patient.date_of_birth;
  let ageVal = "";
  if (dob) {
    const bd = new Date(dob);
    const now = new Date();
    ageVal = Math.floor((now - bd) / (365.25 * 24 * 60 * 60 * 1000));
  }

  const rrRaw = c.reschedule_request || c.appointment?.reschedule_request || null;
  const rescheduleStatus =
    rrRaw && rrRaw.status
      ? ({ pending: "Pending Approval", approved: "Approved", rejected: "Not Approved" })[rrRaw.status] || rrRaw.status
      : null;
  const isApprovedSlot = rescheduleStatus === "Approved";
  const approvedDateRaw = isApprovedSlot
    ? rrRaw.approved_date || rrRaw.suggested_date || ""
    : "";
  const approvedTimeRaw = isApprovedSlot
    ? rrRaw.approved_time || rrRaw.suggested_time || ""
    : "";

  const baseDate = c.created_at
    ? new Date(c.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "";
  const baseDay = c.created_at
    ? new Date(c.created_at).toLocaleDateString("en-US", { weekday: "long" })
    : "";
  const baseTime = c.created_at
    ? new Date(c.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : "";

  const slotDate = approvedDateRaw ? formatInputToDisplay(approvedDateRaw) : "";
  const slotDay = approvedDateRaw ? getDayName(approvedDateRaw) : "";
  const slotTime = approvedTimeRaw ? to12hLabel(approvedTimeRaw) : "";

  return {
    id: c.id ? `CONS-${String(c.id).padStart(5, "0")}` : `CONS-${c.id}`,
    backendId: c.id,
    appointmentId: c.appointment?.id || null,
    doctorProfileId: c.doctor_profile_id || doctor.id || null,
    patientId: patient.id || null,
    patientName: patient.name || "Patient",
    patientAvatar: resolveProfileImage(patient.profile_image),
    doctorName: doctorUser.name || doctor.name || "Doctor",
    doctorAvatar: resolveProfileImage(doctorUser.profile_image),
    doctorSpecialty: primarySpecialty,
    doctorExperience: expYears,
    age: ageVal,
    gender: patient.gender || "",
    phone: patient.mobile || patient.phone || "",
    email: patient.email || "",
    date: isApprovedSlot && slotDate ? slotDate : baseDate,
    day: isApprovedSlot && slotDay ? slotDay : baseDay,
    time: isApprovedSlot && slotTime ? slotTime : baseTime,
    type: typeMap[c.type] || c.type || "Chat Consultation",
    startedAt: c.started_at || null,
    durationMinutes: (() => {
      if (c.started_at) {
        const end = c.ended_at || (c.status !== "completed" ? new Date().toISOString() : null);
        if (end) {
          const mins = Math.round((new Date(end) - new Date(c.started_at)) / 60000);
          return mins > 0 ? mins : c.duration || 0;
        }
      }
      return c.duration || 0;
    })(),
    status: statusMap[c.status] || c.status || "Pending",
    completedAt: (c.status === "completed" || c.status === "cancelled") ? new Date(c.ended_at || c.updated_at || c.created_at).getTime() : null,
    symptoms: c.symptoms || [],
    history: c.medical_history || "",
    notes: c.notes || c.prescription?.advice || "",
    caseStatus: c.case_status || "ongoing",
    prescription: (() => {
      const meds = c.prescription?.medicines?.map(m => [m.name, m.frequency || m.dosage, m.duration].filter(Boolean).join(" ")) || [];
      const advice = c.prescription?.advice || "";
      return [...meds, advice].filter(Boolean).join("\n");
    })(),
    followUp: (() => {
      if (!c.follow_up_date) return "—";
      try {
        const d = new Date(c.follow_up_date);
        if (isNaN(d.getTime())) return "—";
        return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
      } catch { return "—"; }
    })(),
    followUpTime: c.follow_up_time || "",
    followUpStatus: "",
    rescheduleRequest: (() => {
      const rr = c.reschedule_request || c.appointment?.reschedule_request;
      if (!rr || !rr.status) return null;
      const statusMap = { pending: "Pending Approval", approved: "Approved", rejected: "Not Approved" };
      const approvedDate = rr.approved_date || (rr.status === "approved" ? rr.suggested_date : "");
      const approvedTime = rr.approved_time || (rr.status === "approved" ? rr.suggested_time : "");
      return {
        suggestedDate: rr.suggested_date ? formatInputToDisplay(rr.suggested_date) : "",
        suggestedTime: rr.suggested_time || "",
        suggestedDay: rr.suggested_date ? getDayName(rr.suggested_date) : "",
        status: statusMap[rr.status] || rr.status,
        requestedBy: rr.requested_by || "",
        approvedDate: approvedDate ? formatInputToDisplay(approvedDate) : "",
        approvedTime: approvedTime ? to12hLabel(approvedTime) : "",
        rejectionReason: rr.rejection_reason || "",
        appointmentId: c.appointment?.id || null,
      };
    })(),
    revisit: c.revisit || false,
    revisitReason: c.revisit_reason || "",
    rating: c.rating || null,
    reviewComment: c.review_comment || "",
  };
};

// ==================== Tabs Component ====================
const ConsultationTabs = ({ tabs, activeTab, setActiveTab, counts }) => {
  return (
    <div className="consult-tabs">
      {tabs.map((t) => (
        <button
          key={t}
          className={`consult-tab-pill ${activeTab === t ? "active" : ""}`}
          onClick={() => setActiveTab(t)}
        >
          {t}
          {t === "Active" && counts.Active > 0 && (
            <span className="consult-tab-count">{counts.Active}</span>
          )}
        </button>
      ))}
    </div>
  );
};

// ==================== Summary Cards Component ====================
const SummaryCards = ({ counts }) => {
  return (
    <section className="consult-summary-section">
      <div className="consult-summary-grid">
        <div className="consult-summary-card consult-glass">
          <div className="consult-icon-box consult-completed-icon">
            <FaCheckCircle />
          </div>
          <div className="consult-summary-info">
            <span className="consult-summary-label">Completed</span>
            <h2 className="consult-summary-count">{counts.Completed}</h2>
            <p className="consult-summary-sub">This Month</p>
          </div>
        </div>

        <div className="consult-summary-card consult-glass">
          <div className="consult-icon-box consult-ongoing-icon">
            <FaHourglassHalf />
          </div>
          <div className="consult-summary-info">
            <span className="consult-summary-label">Ongoing</span>
            <h2 className="consult-summary-count">{counts.Ongoing}</h2>
            <p className="consult-summary-sub">Upcoming</p>
          </div>
        </div>

        <div className="consult-summary-card consult-glass">
          <div className="consult-icon-box consult-active-icon">
            <FaVideo />
          </div>
          <div className="consult-summary-info">
            <span className="consult-summary-label">Active Now</span>
            <h2 className="consult-summary-count">{counts.Active}</h2>
            <p className="consult-summary-sub">In Progress</p>
          </div>
        </div>

        <div className="consult-summary-card consult-glass">
          <div className="consult-icon-box consult-cancelled-icon">
            <FaTimesCircle />
          </div>
          <div className="consult-summary-info">
            <span className="consult-summary-label">Cancelled</span>
            <h2 className="consult-summary-count">{counts.Cancelled}</h2>
            <p className="consult-summary-sub">This Month</p>
          </div>
        </div>
      </div>
    </section>
  );
};

// ==================== Consultation List Item Component ====================
const ConsultationItem = ({
  consultation,
  isPatient,
  isSelected,
  onSelect,
  effectiveStatus,
}) => {
  const statusClass = (s) => {
    if (s === "Ongoing") return "consult-badge consult-ongoing";
    if (s === "Active") return "consult-badge consult-active";
    if (s === "Completed") return "consult-badge consult-completed";
    if (s === "Rescheduled") return "consult-badge consult-rescheduled";
    return "consult-badge consult-cancelled";
  };

  const displayName = isPatient
    ? formatDoctorDisplayName(consultation.doctorName)
    : consultation.patientName;
  const displayAvatar = isPatient ? consultation.doctorAvatar : consultation.patientAvatar;
  const initials = displayName.split(" ").filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const colors = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444"];
  let hash = 0;
  for (let i = 0; i < (displayName || "").length; i++) hash = displayName.charCodeAt(i) + ((hash << 5) - hash);
  const bgColor = colors[Math.abs(hash) % colors.length];

  return (
    <div
      className={`consult-item ${isSelected ? "selected" : ""}`}
      onClick={() => onSelect(consultation)}
    >
      {displayAvatar ? (
        <img
          src={displayAvatar}
          alt={displayName}
          className="consult-avatar"
          onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
        />
      ) : null}
      <div
        className="consult-avatar"
        style={{
          display: displayAvatar ? "none" : "flex",
          background: bgColor,
          color: "#fff",
          fontWeight: 700,
          fontSize: "14px",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          width: "48px",
          height: "48px",
          flexShrink: 0,
        }}
      >
        {initials}
      </div>
      <div className="consult-item-mid">
        <h3>
          {displayName}
        </h3>
        <p className="consult-item-meta">
          {[consultation.age ? `${consultation.age} Years` : "", consultation.gender].filter(Boolean).join(", ") || "—"}
        </p>
      </div>
      <div className="consult-item-date">
        <p>{consultation.date}</p>
        <span className="consult-cons-id">{consultation.id}</span>
      </div>
      <span className={statusClass(effectiveStatus)}>
        ● {effectiveStatus}
      </span>
      {consultation.rating > 0 && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "12px", color: "#f59e0b", marginLeft: "4px" }}>
          <FaStar style={{ fontSize: "10px" }} /> {consultation.rating}
        </span>
      )}
      <FaChevronRight className="consult-chevron" />
    </div>
  );
};

// ==================== Time Picker Component ====================
const TimePicker = ({ selectedTime, onSelect, onClose, inputRef }) => {
  const [customMode, setCustomMode] = useState(selectedTime === "custom");
  const [customValue, setCustomValue] = useState(
    selectedTime && selectedTime !== "custom" ? selectedTime : ""
  );

  return (
    <div className="consult-time-picker-popup" ref={inputRef}>
      <div className="consult-time-picker-header">
        <span>Select Time</span>
        <button onClick={onClose} className="consult-close-picker">
          <FaTimes />
        </button>
      </div>
      {customMode ? (
        <div style={{ padding: "8px 12px" }}>
          <input
            type="time"
            value={customValue}
            onChange={(e) => {
              setCustomValue(e.target.value);
              onSelect(e.target.value);
            }}
            style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }}
          />
          <button
            onClick={() => setCustomMode(false)}
            style={{ marginTop: "6px", fontSize: "12px", color: "#6366f1", background: "none", border: "none", cursor: "pointer" }}
          >
            ← Back to time slots
          </button>
        </div>
      ) : (
        <div className="consult-time-slots-grid">
          {timeSlots.map((slot) => (
            <button
              key={slot.value}
              className={`consult-time-slot-btn ${selectedTime === slot.value ? "selected" : ""} ${slot.value === "custom" ? "custom-slot" : ""}`}
              onClick={() => {
                if (slot.value === "custom") {
                  setCustomMode(true);
                } else {
                  onSelect(slot.value);
                }
              }}
            >
              {slot.display}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ==================== Date Picker Component ====================
const DatePicker = ({ selectedDate, onSelect, onClose, minDate, inputRef }) => {
  const today = new Date().toISOString().split("T")[0];
  const min = minDate || today;

  return (
    <div className="consult-date-picker-popup" ref={inputRef}>
      <div className="consult-date-picker-header">
        <span>Select Date</span>
        <button onClick={onClose} className="consult-close-picker">
          <FaTimes />
        </button>
      </div>
      <input
        type="date"
        className="consult-date-picker-input"
        value={selectedDate}
        min={min}
        onChange={(e) => onSelect(e.target.value)}
      />
      <div className="consult-date-picker-actions">
        <button
          className="consult-picker-btn"
          onClick={() => onSelect(new Date().toISOString().split("T")[0])}
        >
          Today
        </button>
        <button
          className="consult-picker-btn"
          onClick={() => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            onSelect(tomorrow.toISOString().split("T")[0]);
          }}
        >
          Tomorrow
        </button>
      </div>
    </div>
  );
};

// ==================== Main Component ====================
const Consultations = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { darkMode } = useContext(ThemeContext);
  const { isPatient, isDoctor, token, user } = useContext(AuthContext);

  const query = new URLSearchParams(location.search);
  const tabParam = query.get("tab");

  const getInitialTab = () => {
    if (tabParam === "ongoing") return "Ongoing";
    if (tabParam === "completed") return "Completed";
    if (tabParam === "cancelled") return "Cancelled";
    if (tabParam === "active") return "Active";
    if (tabParam === "rescheduled") return "Rescheduled";
    return "All";
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [mobileDrawer, setMobileDrawer] = useState(false);
  const [complaintTarget, setComplaintTarget] = useState(null);
  const [complaintToast, setComplaintToast] = useState(false);
  const [feedbackTarget, setFeedbackTarget] = useState(null);
  const [feedbackToast, setFeedbackToast] = useState(false);

  // ==================== Real-time State ====================
  const [nowTick, setNowTick] = useState(() => Date.now());
  const userKey = user?.id ?? user?.Id ?? "guest";

  const [data, setData] = useState(() => {
    if (!userKey || userKey === "guest") return null;
    try {
      const cached = localStorage.getItem(`consultations_data_${userKey}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return null;
  });

  // ==================== Edit States ====================
  const [editMode, setEditMode] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [editDay, setEditDay] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editType, setEditType] = useState("");
  const [editDuration, setEditDuration] = useState(30);
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [showEditTimePicker, setShowEditTimePicker] = useState(false);

  // ==================== Reschedule States ====================
  const [reschedulePopup, setReschedulePopup] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [suggestedDate, setSuggestedDate] = useState("");
  const [suggestedDay, setSuggestedDay] = useState("");
  const [suggestedTime, setSuggestedTime] = useState(""); 
  const [showReschedDatePicker, setShowReschedDatePicker] = useState(false);
  const [showReschedTimePicker, setShowReschedTimePicker] = useState(false);

  // ==================== Approval States ====================
  const [approvalPopup, setApprovalPopup] = useState(false);
  const [approvalTarget, setApprovalTarget] = useState(null);
  const [approvalAction, setApprovalAction] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [doctorSelectedDate, setDoctorSelectedDate] = useState("");
  const [doctorSelectedTime, setDoctorSelectedTime] = useState("");
  const [doctorSelectedDay, setDoctorSelectedDay] = useState("");
  const [doctorShowDatePicker, setDoctorShowDatePicker] = useState(false);
  const [doctorShowTimePicker, setDoctorShowTimePicker] = useState(false);

  // ==================== Revisit States ====================
  const [revisitPopup, setRevisitPopup] = useState(false);
  const [revisitReason, setRevisitReason] = useState("");
  const [revisitTargetId, setRevisitTargetId] = useState(null);

  // ==================== Refs ====================
  const editDatePickerRef = useRef(null);
  const editTimePickerRef = useRef(null);
  const reschedDatePickerRef = useRef(null);
  const reschedTimePickerRef = useRef(null);
  const approvalRef = useRef(null);
  const approvalDatePickerRef = useRef(null);
  const approvalTimePickerRef = useRef(null);
  const revisitRef = useRef(null);

  // ==================== Join Consultation ====================
  const handleJoinConsultation = (c) => {
    if (!c) return;
    navigate("/clinic", {
      state: {
        fromConsultation: true,
        consultationId: c.backendId,
        doctor: {
          id: c.doctorProfileId || c.backendId,
          name: c.doctorName,
          specialization: c.doctorSpecialty || "General",
          experience: c.doctorExperience || 0,
          image: c.doctorAvatar || null,
        },
        patientProfile: {
          name: c.patientName,
          age: c.age,
          symptoms: c.symptoms,
          duration: "N/A",
          avatar: c.patientAvatar || null,
        },
      },
      replace: false,
    });
  };

  // ==================== Tabs ====================
  const tabs = ["All", "Ongoing", "Active", "Rescheduled", "Completed", "Cancelled"];

  // ==================== Real-time Helpers ====================
  const getSlotDateTime = (consultation) => {
    const isRevisit = consultation.caseStatus === "revisit";
    if (isRevisit && consultation.followUp && consultation.followUp !== "—") {
      return { date: consultation.followUp, time: consultation.followUpTime };
    }
    const rr = consultation.rescheduleRequest;
    if (rr?.status === "Approved" && (rr.approvedDate || rr.approvedTime)) {
      return {
        date: rr.approvedDate || consultation.date,
        time: rr.approvedTime || consultation.time,
      };
    }
    return { date: consultation.date, time: consultation.time };
  };

  const getEffectiveStatus = useCallback(
    (consultation) => {
      if (consultation.status === "Completed") return "Completed";
      if (consultation.status === "Cancelled") return "Cancelled";
      if (consultation.rescheduleRequest?.status === "Pending Approval")
        return "Rescheduled";

      if (consultation.status !== "Ongoing") return consultation.status;

      const isRevisit = consultation.caseStatus === "revisit";

      if (consultation.startedAt && !isRevisit) return "Active";

      const slot = getSlotDateTime(consultation);
      const aptDate = parseConsultationDate(slot.date);
      if (!aptDate) return isRevisit ? "Ongoing" : consultation.status;

      const now = new Date(nowTick);
      if (!isSameCalendarDay(aptDate, now)) {
        return isRevisit ? "Ongoing" : consultation.status;
      }

      const startMinutes = parseTimeToMinutes(slot.time);
      if (startMinutes === null) return isRevisit ? "Ongoing" : consultation.status;

      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const durationMinutes = consultation.durationMinutes || 120;

      if (
        currentMinutes >= startMinutes - PRE_JOIN_WINDOW_MINUTES &&
        currentMinutes < startMinutes + durationMinutes
      ) {
        return "Active";
      }

      return isRevisit ? "Ongoing" : consultation.status;
    },
    [nowTick],
  );

  const getConsultationPhase = useCallback(
    (consultation) => {
      const effectiveStatus = getEffectiveStatus(consultation);
      if (effectiveStatus !== "Active") return null;

      const isRevisit = consultation.caseStatus === "revisit";

      if (consultation.startedAt && !isRevisit) return "join";

      const slot = getSlotDateTime(consultation);
      const aptDate = parseConsultationDate(slot.date);
      if (!aptDate) return null;

      const now = new Date(nowTick);
      if (!isSameCalendarDay(aptDate, now)) return null;

      const startMinutes = parseTimeToMinutes(slot.time);
      if (startMinutes === null) return null;

      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const durationMinutes = consultation.durationMinutes || 120;

      if (
        currentMinutes >= startMinutes - PRE_JOIN_WINDOW_MINUTES &&
        currentMinutes < startMinutes
      ) {
        return "waiting";
      }
      if (
        currentMinutes >= startMinutes &&
        currentMinutes < startMinutes + durationMinutes
      ) {
        return "join";
      }
      return null;
    },
    [getEffectiveStatus, nowTick],
  );

  const statusClass = (s) => {
    if (s === "Ongoing") return "consult-badge consult-ongoing";
    if (s === "Active") return "consult-badge consult-active";
    if (s === "Completed") return "consult-badge consult-completed";
    if (s === "Rescheduled") return "consult-badge consult-rescheduled";
    return "consult-badge consult-cancelled";
  };

  // ==================== Data Processing ====================
  const safeData = Array.isArray(data) ? data : [];

  const processedData = safeData.map((c) => ({
    ...c,
    displayStatus: getEffectiveStatus(c),
  }));

  const filtered = processedData.filter((c) => {
    const matchesTab = activeTab === "All" || c.displayStatus === activeTab;
    const searchLower = String(search || "").toLowerCase();
    const patientName = String(c.patientName || "");
    const doctorName = String(c.doctorName || "");
    const consultationId = String(c.id || "");
    const matchesSearch =
      patientName.toLowerCase().includes(searchLower) ||
      doctorName.toLowerCase().includes(searchLower) ||
      consultationId.toLowerCase().includes(searchLower);
    return matchesTab && matchesSearch;
  });

  const visible = showAll ? filtered : filtered.slice(0, 5);

  const counts = {
    Completed: safeData.filter((c) => c.status === "Completed").length,
    Ongoing: safeData.filter((c) => getEffectiveStatus(c) === "Ongoing").length,
    Active: safeData.filter((c) => getEffectiveStatus(c) === "Active").length,
    Cancelled: safeData.filter((c) => c.status === "Cancelled").length,
    Rescheduled: safeData.filter(
      (c) => getEffectiveStatus(c) === "Rescheduled",
    ).length,
  };

  // ==================== Event Handlers ====================
  const handleSelect = (c) => {
    setSelected(c);
    setEditMode(false);
    if (window.innerWidth <= 900) setMobileDrawer(true);
  };

  const handleCloseDetails = () => {
    setSelected(null);
    setMobileDrawer(false);
    setEditMode(false);
  };

  // ==================== Edit Handlers (Doctor) ====================
  const enableEdit = () => {
    if (!selected) return;
    setEditDate(formatDisplayToInput(selected.date));
    setEditDay(selected.day);
    setEditTime(formatTimeTo24(selected.time));
    setEditType(selected.type);
    setEditDuration(selected.durationMinutes || 30);
    setShowEditDatePicker(false);
    setShowEditTimePicker(false);
    setEditMode(true);
  };

  const formatTimeTo24 = (displayTime) => {
    const slot = timeSlots.find((s) => s.display === displayTime);
    return slot ? slot.value : "";
  };

  const handleEditDateSelect = (dateStr) => {
    setEditDate(dateStr);
    setEditDay(getDayName(dateStr));
    setShowEditDatePicker(false);
  };

  const handleEditTimeSelect = (timeValue) => {
    setEditTime(timeValue);
    if (timeValue !== "custom") setShowEditTimePicker(false);
  };

  const saveEdit = () => {
    if (!selected) return;
    const formattedDate = formatInputToDisplay(editDate);
    const selectedSlot = timeSlots.find((s) => s.value === editTime);
    const displayTime = selectedSlot ? selectedSlot.display : editTime;
    const backendId = selected.backendId;

    setData((prev) =>
      prev.map((c) =>
        c.id === selected.id
          ? {
              ...c,
              date: formattedDate,
              day: editDay,
              time: displayTime,
              type: editType,
              durationMinutes: editDuration,
            }
          : c,
      ),
    );
    setSelected((prev) => ({
      ...prev,
      date: formattedDate,
      day: editDay,
      time: displayTime,
      type: editType,
      durationMinutes: editDuration,
    }));
    setEditMode(false);
    if (backendId && token) {
      axios.put(`${API_BASE_URL}/api/consultations/${backendId}`, {
        type: editType,
        duration: editDuration,
        notes: selected.notes || ""
      }, {
        headers: { Authorization: `Bearer ${token}` }, timeout: 15000
      }).catch(err => console.error("API error:", err?.message));
    }
  };

  const cancelEdit = () => {
    setEditMode(false);
  };

  // ==================== Reschedule Handlers (Patient) ====================
  const openReschedulePopup = (c) => {
    setRescheduleTarget(c);
    setSuggestedDate("");
    setSuggestedDay("");
    setSuggestedTime("");
    setShowReschedDatePicker(false);
    setShowReschedTimePicker(false);
    setReschedulePopup(true);
  };

  const handleReschedDateSelect = (dateStr) => {
    setSuggestedDate(dateStr);
    setSuggestedDay(getDayName(dateStr));
    setShowReschedDatePicker(false);
  };

  const handleReschedTimeSelect = (timeValue) => {
    if (timeValue === "custom") {
      setSuggestedTime("custom");
      return;
    }
    const slot = timeSlots.find((s) => s.value === timeValue);
    if (slot) setSuggestedTime(slot.value);
    setShowReschedTimePicker(false);
  };

  const submitReschedule = () => {
    if (!suggestedDate.trim() || !suggestedDay.trim() || !suggestedTime.trim())
      return;
    const formattedDate = formatInputToDisplay(suggestedDate);
    const backendId = rescheduleTarget?.backendId;
    const appointmentId = rescheduleTarget?.rescheduleRequest?.appointmentId || rescheduleTarget?.appointmentId;
    const req = {
      suggestedDate: formattedDate,
      suggestedDay,
      suggestedTime,
      status: "Pending Approval",
      requestedBy: "Patient",
      approvedDate: "",
      approvedTime: "",
      rejectionReason: "",
      appointmentId,
    };

    setData((prev) =>
      prev.map((c) =>
        c.id === rescheduleTarget.id
          ? {
              ...c,
              rescheduleRequest: req,
            }
          : c,
      ),
    );
    if (selected && selected.id === rescheduleTarget.id) {
      setSelected((prev) => ({
        ...prev,
        rescheduleRequest: req,
      }));
    }
    if (backendId && token) {
      axios.post(`${API_BASE_URL}/api/consultations/${backendId}/reschedule`, {
        suggested_date: suggestedDate,
        suggested_time: suggestedTime,
      }, {
        headers: { Authorization: `Bearer ${token}` }, timeout: 15000
      }).catch(err => console.error("Reschedule API error:", err?.message));
    }
    setReschedulePopup(false);
    setRescheduleTarget(null);
    setSuggestedDate("");
    setSuggestedDay("");
    setSuggestedTime("");
    setShowReschedDatePicker(false);
    setShowReschedTimePicker(false);
  };

  const handleRescheduleAgain = (c) => {
    setRescheduleTarget(c);
    setSuggestedDate("");
    setSuggestedDay("");
    setSuggestedTime("");
    setShowReschedDatePicker(false);
    setShowReschedTimePicker(false);
    setReschedulePopup(true);
  };

  // ==================== Approval Handlers (Doctor) ====================
  const openApprovalPopup = (consultationId, action, e) => {
    e.stopPropagation();
    const c = data.find((x) => x.id === consultationId);
    if (!c || !c.rescheduleRequest) return;
    const suggestedInputDate = formatDisplayToInput(
      c.rescheduleRequest.suggestedDate,
    );
    setApprovalTarget(consultationId);
    setApprovalAction(action);
    setRejectionReason("");
    setDoctorSelectedDate(suggestedInputDate);
    setDoctorSelectedDay(
      c.rescheduleRequest.suggestedDay || getDayName(suggestedInputDate),
    );
    const timeSlot = timeSlots.find(
      (s) => s.value === c.rescheduleRequest.suggestedTime,
    );
    setDoctorSelectedTime(timeSlot ? timeSlot.value : "");
    setDoctorShowDatePicker(false);
    setDoctorShowTimePicker(false);
    setApprovalPopup(true);
  };

  const handleDoctorDateSelect = (dateStr) => {
    setDoctorSelectedDate(dateStr);
    setDoctorSelectedDay(getDayName(dateStr));
    setDoctorShowDatePicker(false);
  };

  const handleDoctorTimeSelect = (timeValue) => {
    setDoctorSelectedTime(timeValue);
    if (timeValue !== "custom") setDoctorShowTimePicker(false);
  };

  const submitApproval = () => {
    if (!approvalTarget) return;
    const target = data.find(c => c.id === approvalTarget);
    const backendId = target?.backendId;
    if (approvalAction === "approve") {
      if (!doctorSelectedDate || !doctorSelectedTime) {
        alert("Please select a date and time.");
        return;
      }
      const formattedDate = formatInputToDisplay(doctorSelectedDate);
      const selectedSlot = timeSlots.find(
        (slot) => slot.value === doctorSelectedTime,
      );
      const displayTime = selectedSlot
        ? selectedSlot.display
        : doctorSelectedTime;
      const dayName = getDayName(doctorSelectedDate);
      setData((prev) =>
        prev.map((c) => {
          if (c.id === approvalTarget && c.rescheduleRequest) {
            return {
              ...c,
              date: formattedDate,
              day: dayName,
              time: displayTime,
              status: "Ongoing",
              startedAt: null,
              rescheduleRequest: {
                ...c.rescheduleRequest,
                status: "Approved",
                approvedDate: formattedDate,
                approvedDay: dayName,
                approvedTime: displayTime,
                approvedBy: "Doctor",
              },
            };
          }
          return c;
        }),
      );
      if (selected && selected.id === approvalTarget) {
        setSelected((prev) => ({
          ...prev,
          date: formattedDate,
          day: dayName,
          time: displayTime,
          status: "Ongoing",
          startedAt: null,
          rescheduleRequest: {
            ...prev.rescheduleRequest,
            status: "Approved",
            approvedDate: formattedDate,
            approvedDay: dayName,
            approvedTime: displayTime,
            approvedBy: "Doctor",
          },
        }));
      }
      if (backendId && token) {
        axios.post(`${API_BASE_URL}/api/consultations/${backendId}/reschedule/approve`, {
          date: doctorSelectedDate,
          time: doctorSelectedTime,
        }, {
          headers: { Authorization: `Bearer ${token}` }, timeout: 15000
        }).catch(err => console.error("Approve API error:", err?.message));
      }
    } else {
      if (!rejectionReason.trim()) {
        alert("Please provide a reason for rejecting.");
        return;
      }
      setData((prev) =>
        prev.map((c) => {
          if (c.id === approvalTarget && c.rescheduleRequest) {
            return {
              ...c,
              rescheduleRequest: {
                ...c.rescheduleRequest,
                status: "Not Approved",
                rejectionReason,
                rejectedBy: "Doctor",
              },
            };
          }
          return c;
        }),
      );
      if (selected && selected.id === approvalTarget) {
        setSelected((prev) => ({
          ...prev,
          rescheduleRequest: {
            ...prev.rescheduleRequest,
            status: "Not Approved",
            rejectionReason,
            rejectedBy: "Doctor",
          },
        }));
      }
      if (backendId && token) {
        axios.post(`${API_BASE_URL}/api/consultations/${backendId}/reschedule/reject`, {
          reason: rejectionReason,
        }, {
          headers: { Authorization: `Bearer ${token}` }, timeout: 15000
        }).catch(err => console.error("Reject API error:", err?.message));
      }
    }
    setApprovalPopup(false);
    setApprovalTarget(null);
    setApprovalAction(null);
    setRejectionReason("");
    setDoctorSelectedDate("");
    setDoctorSelectedTime("");
    setDoctorSelectedDay("");
  };

  // ==================== Complete / Revisit Handlers (Doctor) ====================
  const markAsCompleted = (consultationId, isRevisit = false) => {
    if (isRevisit) {
      setRevisitTargetId(consultationId);
      setRevisitReason("");
      setRevisitPopup(true);
    } else {
      const target = data.find(c => c.id === consultationId);
      const backendId = target?.backendId;
      setData((prev) =>
        prev.map((c) =>
          c.id === consultationId
            ? {
                ...c,
                status: "Completed",
                completedAt: Date.now(),
                revisit: false,
                revisitReason: "",
              }
            : c,
        ),
      );
      if (selected && selected.id === consultationId) {
        setSelected((prev) => ({
          ...prev,
          status: "Completed",
          completedAt: Date.now(),
          revisit: false,
          revisitReason: "",
        }));
      }
      if (backendId && token) {
        axios.post(`${API_BASE_URL}/api/consultations/${backendId}/complete`, {
          notes: target?.notes || "",
          diagnosis: [],
          revisit: false,
          revisit_reason: ""
        }, {
          headers: { Authorization: `Bearer ${token}` }, timeout: 15000
        }).catch(err => console.error("API error:", err?.message));
      }
    }
  };

  const submitRevisit = () => {
    if (!revisitReason.trim() || !revisitTargetId) return;
    const target = data.find(c => c.id === revisitTargetId);
    const backendId = target?.backendId;
    setData((prev) =>
      prev.map((c) =>
        c.id === revisitTargetId
          ? {
              ...c,
              status: "Ongoing",
              completedAt: null,
              startedAt: null,
              caseStatus: "revisit",
              revisit: true,
              revisitReason,
            }
          : c,
      ),
    );
    if (selected && selected.id === revisitTargetId) {
      setSelected((prev) => ({
        ...prev,
        status: "Ongoing",
        completedAt: null,
        startedAt: null,
        caseStatus: "revisit",
        revisit: true,
        revisitReason,
      }));
    }
    if (backendId && token) {
      axios.post(`${API_BASE_URL}/api/consultations/${backendId}/complete`, {
        notes: target?.notes || "",
        diagnosis: [],
        revisit: true,
        revisit_reason: revisitReason
      }, {
        headers: { Authorization: `Bearer ${token}` }, timeout: 15000
      }).catch(err => console.error("API error:", err?.message));
    }
    setRevisitPopup(false);
    setRevisitTargetId(null);
    setRevisitReason("");
  };

  const cancelConsultation = (consultationId) => {
    if (!window.confirm("Are you sure you want to cancel this consultation?")) return;
    const target = data.find(c => c.id === consultationId);
    const backendId = target?.backendId;

    setData((prev) =>
      prev.map((c) =>
        c.id === consultationId
          ? { ...c, status: "Cancelled", completedAt: Date.now() }
          : c,
      ),
    );
    if (selected && selected.id === consultationId) {
      setSelected((prev) => ({
        ...prev,
        status: "Cancelled",
        completedAt: Date.now(),
      }));
    }
    if (backendId && token) {
      axios.post(`${API_BASE_URL}/api/consultations/${backendId}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }, timeout: 15000
      }).catch(err => console.error("Cancel API error:", err?.message));
    }
  };

  // ==================== Patient History Handlers ====================

  // ==================== Complaint ====================
  const handleComplaintSubmit = () => {
    setComplaintTarget(null);
    setComplaintToast(true);
    setTimeout(() => setComplaintToast(false), 3200);
  };

  // ==================== Effects ====================
  useEffect(() => {
    const tick = () => setNowTick(Date.now());
    const interval = setInterval(tick, 30000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const currentUserKey = user?.id ?? user?.Id ?? "guest";

    const fetchConsultations = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/consultations`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          timeout: 30000,
        });
        if (cancelled) return;
        const fetched = (res.data?.data ?? []).map(mapBackendConsultation);
        setData((prev) => {
          const next = fetched;
          if (JSON.stringify(prev ?? []) === JSON.stringify(next)) return prev;
          return next;
        });
        if (currentUserKey && currentUserKey !== "guest") {
          localStorage.setItem(`consultations_data_${currentUserKey}`, JSON.stringify(fetched));
        }
      } catch (err) {
        if (!cancelled) console.error("Failed to fetch consultations:", err?.response?.data || err?.message);
      }
    };
    fetchConsultations();

    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchConsultations();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [token, user?.id, user?.Id]);

  const selectedId = selected?.id;
  useEffect(() => {
    if (!selectedId) return;
    const latest = data.find((c) => c.id === selectedId);
    if (!latest) return;
    setSelected((prev) => {
      if (!prev || prev.id !== latest.id) return prev;
      if (
        prev.date === latest.date &&
        prev.time === latest.time &&
        prev.status === latest.status &&
        JSON.stringify(prev.rescheduleRequest) ===
          JSON.stringify(latest.rescheduleRequest)
      ) {
        return prev;
      }
      return { ...latest };
    });
  }, [nowTick, data, selectedId]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        editDatePickerRef.current &&
        !editDatePickerRef.current.contains(e.target)
      )
        setShowEditDatePicker(false);
      if (
        editTimePickerRef.current &&
        !editTimePickerRef.current.contains(e.target)
      )
        setShowEditTimePicker(false);
      if (
        reschedDatePickerRef.current &&
        !reschedDatePickerRef.current.contains(e.target)
      )
        setShowReschedDatePicker(false);
      if (
        reschedTimePickerRef.current &&
        !reschedTimePickerRef.current.contains(e.target)
      )
        setShowReschedTimePicker(false);
      if (approvalRef.current && !approvalRef.current.contains(e.target)) {
        setApprovalPopup(false);
        setDoctorShowDatePicker(false);
        setDoctorShowTimePicker(false);
      }
      if (
        approvalDatePickerRef.current &&
        !approvalDatePickerRef.current.contains(e.target)
      )
        setDoctorShowDatePicker(false);
      if (
        approvalTimePickerRef.current &&
        !approvalTimePickerRef.current.contains(e.target)
      )
        setDoctorShowTimePicker(false);
      if (revisitRef.current && !revisitRef.current.contains(e.target))
        setRevisitPopup(false);
    };
    if (
      showEditDatePicker ||
      showEditTimePicker ||
      showReschedDatePicker ||
      showReschedTimePicker ||
      approvalPopup ||
      doctorShowDatePicker ||
      doctorShowTimePicker ||
      revisitPopup
    ) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [
    showEditDatePicker,
    showEditTimePicker,
    showReschedDatePicker,
    showReschedTimePicker,
    approvalPopup,
    doctorShowDatePicker,
    doctorShowTimePicker,
    revisitPopup,
  ]);

  // ==================== Render ====================
  return (
    <div className="consultations-layout">
      <Sidebar />
      <div className={`consultations-wrapper ${darkMode ? "dark" : "light"}`}>
        {/* ============== Page Header ============== */}
        <header className="consult-header">
          <div className="consult-page-header">
            <div className="consult-page-header-left">
              <h1 className="consult-page-title">Consultations</h1>
              <p className="consult-page-subtitle">
                {isPatient
                  ? "Manage all your consultations in one place"
                  : "View and manage patient consultations"}
              </p>
            </div>
          </div>
        </header>

        {/* ============== Summary Cards ============== */}
        <SummaryCards counts={counts} />

        {/* ============== Search ============== */}
        <div className="consult-toolbar">
          <div className="consult-search-box">
            <FaSearch className="consult-search-icon" />
            <input
              type="text"
              placeholder="Search consultations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* ============== Tabs ============== */}
        <ConsultationTabs
          tabs={tabs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          counts={counts}
        />

        {/* ============== Split Area ============== */}
        <div className={`consult-split-area ${selected ? "split-open" : ""}`}>
          {/* ============== List Panel ============== */}
          <section className="consult-list-panel">
            <div className="consult-consultation-list">
              {visible.length === 0 && (
                <div className="consult-empty-state">
                  <FaCalendarAlt className="consult-empty-icon" />
                  <p>No consultations found</p>
                </div>
              )}
              {visible.map((c) => (
                <ConsultationItem
                  key={c.id}
                  consultation={c}
                  isPatient={isPatient}
                  isSelected={selected?.id === c.id}
                  onSelect={handleSelect}
                  effectiveStatus={c.displayStatus}
                />
              ))}
            </div>

            {filtered.length > 5 && (
              <div className="consult-view-more-wrap">
                <button
                  className="consult-view-more-btn"
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll ? "View Less" : "View More"}{" "}
                  {showAll ? <FaChevronUp /> : <FaChevronDown />}
                </button>
              </div>
            )}
          </section>

          {/* ============== Details Panel ============== */}
          <section className="consult-Details">
            {selected && (() => {
              const effectiveStatus = getEffectiveStatus(selected);
              const phase = getConsultationPhase(selected);
              const canEdit =
                isDoctor &&
                effectiveStatus === "Ongoing" &&
                !selected.rescheduleRequest;
 
              const displayName = isPatient
                ? formatDoctorDisplayName(selected.doctorName)
                : selected.patientName;
              const displayAvatar = isPatient ? selected.doctorAvatar : selected.patientAvatar;
              const detailMeta = isPatient
                ? [selected.doctorSpecialty || "Doctor", selected.doctorExperience ? `${selected.doctorExperience} Years Experience` : ""].filter(Boolean).join(" • ") || "Doctor"
                : [selected.age ? `${selected.age} Years` : "", selected.gender].filter(Boolean).join(", ") || "—";
              const colors = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444"];
              let nameHash = 0;
              for (let i = 0; i < (displayName || "").length; i++) {
                nameHash = displayName.charCodeAt(i) + ((nameHash << 5) - nameHash);
              }
              const displayBg = colors[Math.abs(nameHash) % colors.length];
              const displayInitials = displayName
                .split(" ") 
                .filter(Boolean)
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();
 
              const medicalHistoryText = selected.history || selected.medicalHistory || "No medical history recorded.";

              return (
                <aside
                  className={`consult-details-panel consult-glass ${mobileDrawer ? "mobile-open" : ""}`}
                >
                  {/* ===== Details Header ===== */}
                  <div className="consult-details-header">
                    <h3>Consultation Details</h3>
                    <div className="consult-header-right">
                      <span className={statusClass(effectiveStatus)}>
                        ● {effectiveStatus}
                      </span>
                      <button
                        className="consult-close-btn"
                        onClick={handleCloseDetails}
                      >
                        <FaTimes />
                      </button>
                    </div>
                  </div>

                  {/* ===== Patient Info ===== */}
                  <div className="consult-patient-info">
                    {displayAvatar ? (
                      <img
                        src={displayAvatar}
                        alt={displayName}
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      style={{
                        display: displayAvatar ? "none" : "flex",
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        background: displayBg,
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "20px",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {displayInitials}
                    </div>
                    <div>
                      <h2>
                        {displayName}
                      </h2>
                      <p>
                        {detailMeta}
                      </p>
                      {!isPatient && (
                        <>
                          <p className="consult-contact">
                            <FaPhoneAlt /> {selected.phone}
                          </p>
                          <p className="consult-contact">
                            <FaEnvelope /> {selected.email}
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* ===== Info Grid ===== */}
                  <div className="consult-info-grid">
                    <div>
                      <span className="consult-info-label">
                        Consultation ID
                      </span>
                      <p>{selected.id}</p>
                    </div>
                    <div>
                      <span className="consult-info-label">Date</span>
                      {canEdit && editMode ? (
                        <div className="consult-picker-input-wrapper">
                          <input
                            type="text"
                            className="consult-edit-input"
                            value={
                              editDate ? formatInputToDisplay(editDate) : ""
                            }
                            readOnly
                            onClick={() => {
                              setShowEditDatePicker(!showEditDatePicker);
                              setShowEditTimePicker(false);
                            }}
                          />
                          <FaCalendarAlt
                            className="consult-picker-icon"
                            onClick={() => {
                              setShowEditDatePicker(!showEditDatePicker);
                              setShowEditTimePicker(false);
                            }}
                          />
                          {showEditDatePicker && (
                            <DatePicker
                              selectedDate={editDate}
                              onSelect={handleEditDateSelect}
                              onClose={() => setShowEditDatePicker(false)}
                              inputRef={editDatePickerRef}
                              minDate={new Date().toISOString().split("T")[0]}
                            />
                          )}
                        </div>
                      ) : (
                        <p>{selected.date}</p>
                      )}
                    </div>
                    <div>
                      <span className="consult-info-label">Day</span>
                      {canEdit && editMode ? (
                        <input
                          className="consult-edit-input"
                          value={editDay}
                          readOnly
                        />
                      ) : (
                        <p>{selected.day}</p>
                      )}
                    </div>
                    <div>
                      <span className="consult-info-label">Time</span>
                      {canEdit && editMode ? (
                        <div className="consult-picker-input-wrapper">
                          <input
                            type="text"
                            className="consult-edit-input"
                            value={
                              editTime
                                ? timeSlots.find((s) => s.value === editTime)
                                    ?.display || editTime
                                : ""
                            }
                            readOnly
                            onClick={() => {
                              setShowEditTimePicker(!showEditTimePicker);
                              setShowEditDatePicker(false);
                            }}
                          />
                          <FaClock
                            className="consult-picker-icon"
                            onClick={() => {
                              setShowEditTimePicker(!showEditTimePicker);
                              setShowEditDatePicker(false);
                            }}
                          />
                          {showEditTimePicker && (
                            <TimePicker
                              selectedTime={editTime}
                              onSelect={handleEditTimeSelect}
                              onClose={() => setShowEditTimePicker(false)}
                              inputRef={editTimePickerRef}
                            />
                          )}
                        </div>
                      ) : (
                        <p>{selected.time}</p>
                      )}
                    </div>
                    <div>
                      <span className="consult-info-label">Type</span>
                      {canEdit && editMode ? (
                        <select
                          className="consult-edit-input"
                          value={editType}
                          onChange={(e) => setEditType(e.target.value)}
                        >
                          {CONSULTATION_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p>{selected.type}</p>
                      )}
                    </div>
                    <div>
                      <span className="consult-info-label">Duration</span>
                      {canEdit && editMode ? (
                        <select
                          className="consult-edit-input"
                          value={editDuration}
                          onChange={(e) =>
                            setEditDuration(parseInt(e.target.value, 10))
                          }
                        >
                          <option value={15}>15 min</option>
                          <option value={30}>30 min</option>
                          <option value={45}>45 min</option>
                          <option value={60}>60 min</option>
                          <option value={90}>90 min</option>
                          <option value={120}>120 min</option>
                        </select>
                      ) : (
                        <p className="consult-duration">
                          {(() => {
                            const eff = getEffectiveStatus(selected);
                            const isOngoing = eff === "Ongoing";
                            if (isOngoing && selected.startedAt) {
                              const mins = Math.round((nowTick - new Date(selected.startedAt).getTime()) / 60000);
                              return mins > 0 ? `${mins} min` : "—";
                            }
                            return selected.durationMinutes
                              ? `${selected.durationMinutes} min`
                              : "—";
                          })()}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* ===== Waiting Room / Join Now Phase Indicator ===== */}
                  {effectiveStatus === "Active" && phase === "waiting" && (
                    <div className="consult-phase-banner consult-waiting-banner">
                      <FaClock className="consult-phase-icon" />
                      <div className="consult-phase-info">
                        <h4>Waiting for Consultation Room</h4>
                        <p>The consultation will begin shortly...</p>
                      </div>
                    </div>
                  )}

                  {effectiveStatus === "Active" && phase === "join" ? (
                    <div className="consult-phase-banner consult-join-banner">
                      <FaVideo className="consult-phase-icon" />
                      <div className="consult-phase-info">
                        <h4>Consultation in Progress</h4>
                        <p>You can join the consultation now</p>
                      </div>
                      <button className="consult-join-now-btn" onClick={() => handleJoinConsultation(selected)}>
                        <FaVideo /> Join Now
                      </button>
                    </div>
                  ) : null}

                  {/* ===== Symptoms ===== */}
                  <div className="consult-section">
                    <div className="consult-section-title">
                      <FaHeartbeat className="consult-sec-icon symptom" />{" "}
                      Symptoms
                    </div>
                    <div className="consult-chips">
                      {selected.symptoms.map((s) => (
                        <span key={s} className="consult-chip">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* ===== Medical History ===== */}
                  <div className="consult-section">
                    <div className="consult-section-title">
                      <FaClipboardList className="consult-sec-icon history" />{" "}
                      Medical History
                    </div>
                    <div className="consult-info-card">
                      {medicalHistoryText}
                    </div>
                  </div>

                  {/* ===== Doctor Notes ===== */}
                  <div className="consult-section">
                    <div className="consult-section-title">
                      <FaNotesMedical className="consult-sec-icon notes" />{" "}
                      Doctor Notes
                    </div>
                    <div className="consult-info-card">{selected.notes || "—"}</div>
                  </div>

                  {/* ===== Prescription ===== */}
                  <div className="consult-section">
                    <div className="consult-section-title">
                      <FaPills className="consult-sec-icon presc" />{" "}
                      Prescription
                    </div>
                    {selected.prescription ? (
                      <div className="consult-info-card" style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                        {selected.prescription}
                      </div>
                    ) : (
                      <div className="consult-info-card muted">
                        No prescription issued.
                      </div>
                    )}
                  </div>

                  {/* ===== Follow-up ===== */}
                  <div className="consult-section">
                    <div className="consult-section-title">
                      <FaCalendarAlt className="consult-sec-icon followup" />{" "}
                      Follow-up
                    </div>
                    <div className="consult-followup-card">
                      <div className="consult-followup-info">
                        <span className="consult-followup-date">
                          {selected.followUp}
                        </span>
                        <span
                          className={`consult-followup-badge ${selected.followUpStatus?.toLowerCase()}`}
                        >
                          {selected.followUpStatus}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ===== Reschedule Request Section ===== */}
                  {selected.rescheduleRequest && (
                    <div className="consult-section">
                      <div className="consult-section-title">
                        <FaCalendarAlt className="consult-sec-icon followup" />{" "}
                        Reschedule Request
                      </div>
                      <div className="consult-followup-card">
                        <div className="consult-followup-info">
                          <span className="consult-followup-date">
                            {selected.rescheduleRequest.suggestedDate} •{" "}
                            {selected.rescheduleRequest.suggestedDay} •{" "}
                            {to12hLabel(selected.rescheduleRequest.suggestedTime)}
                          </span>
                          <span
                            className={`consult-followup-badge ${
                              selected.rescheduleRequest.status === "Approved"
                                ? "completed"
                                : selected.rescheduleRequest.status ===
                                    "Not Approved"
                                  ? "cancelled"
                                  : "scheduled"
                            }`}
                          >
                            {selected.rescheduleRequest.status}
                          </span>
                        </div>

                        {isDoctor &&
                          selected.rescheduleRequest.status ===
                            "Pending Approval" && (
                            <div className="consult-approval-actions">
                              <div className="consult-approval-buttons">
                                <button
                                  className="consult-approve-btn"
                                  onClick={(e) =>
                                    openApprovalPopup(
                                      selected.id,
                                      "approve",
                                      e,
                                    )
                                  }
                                >
                                  <FaCheckCircle /> Approve
                                </button>
                                <button
                                  className="consult-reject-btn"
                                  onClick={(e) =>
                                    openApprovalPopup(
                                      selected.id,
                                      "reject",
                                      e,
                                    )
                                  }
                                >
                                  <FaTimesCircle /> Reject
                                </button>
                              </div>
                            </div>
                          )}

                        {selected.rescheduleRequest.status === "Approved" && (
                          <div className="consult-approved-info">
                            <FaCheckCircle />
                            <span>
                              Approved for{" "}
                              {selected.rescheduleRequest.approvedDate ||
                                selected.date}{" "}
                              •{" "}
                              {selected.rescheduleRequest.approvedTime ||
                                selected.time}
                            </span>
                          </div>
                        )}

                        {selected.rescheduleRequest.status ===
                          "Not Approved" && (
                          <div className="consult-rejection-info">
                            <div className="consult-info-card muted">
                              <b>Doctor's feedback:</b>{" "}
                              {selected.rescheduleRequest.rejectionReason ||
                                "Not provided"}
                            </div>
                            {isPatient && (
                              <button
                                className="consult-action-btn reschedule"
                                onClick={() =>
                                  handleRescheduleAgain(selected)
                                }
                              >
                                <FaCalendarAlt /> Request Again
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ===== Revisit Reason ===== */}
                  {selected.revisit && selected.revisitReason && (
                    <div className="consult-section">
                      <div className="consult-section-title">
                        <FaRedo className="consult-sec-icon revisit" /> Revisit
                        Reason
                      </div>
                      <div className="consult-info-card muted">
                        {selected.revisitReason}
                      </div>
                    </div>
                  )}

                  {/* ===== Doctor Action Buttons: Active ===== */}
                  {isDoctor && effectiveStatus === "Active" && (
                    <div className="consult-action-buttons">
                      <button
                        className="consult-action-btn complete"
                        onClick={() => markAsCompleted(selected.id, false)}
                      >
                        <FaCheckCircle /> Complete
                      </button>
                      <button
                        className="consult-action-btn revisit"
                        onClick={() => markAsCompleted(selected.id, true)}
                      >
                        <FaRedo /> Complete with Revisit
                      </button>
                      <button
                        className="consult-action-btn cancel-btn"
                        onClick={() => cancelConsultation(selected.id)}
                      >
                        <FaTimesCircle /> Cancel
                      </button>
                    </div>
                  )}

                  {/* ===== Doctor Edit Buttons: Ongoing ===== */}
                  {canEdit && (
                    <div className="consult-action-buttons">
                      {editMode ? (
                        <>
                          <button
                            className="consult-action-btn save"
                            onClick={saveEdit}
                          >
                            <FaSave /> Save Changes
                          </button>
                          <button
                            className="consult-action-btn cancel"
                            onClick={cancelEdit}
                          >
                            <FaUndo /> Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          className="consult-action-btn edit"
                          onClick={enableEdit}
                        >
                          <FaEdit /> Edit Consultation
                        </button>
                      )}
                    </div>
                  )}

                  {/* ===== Doctor Cancel Button: Ongoing (always) ===== */}
                  {isDoctor && effectiveStatus === "Ongoing" && (
                    <div className="consult-action-buttons">
                      <button
                        className="consult-action-btn cancel-btn"
                        onClick={() => cancelConsultation(selected.id)}
                      >
                        <FaTimesCircle /> Cancel
                      </button>
                    </div>
                  )}

                  {/* ===== Patient Action Buttons ===== */}
                  {isPatient && effectiveStatus === "Ongoing" && (
                    <div className="consult-action-buttons">
                      <button
                        className="consult-action-btn reschedule"
                        onClick={() => openReschedulePopup(selected)}
                      >
                        <FaCalendarAlt /> Reschedule Consultation
                      </button>
                      <button
                        className="consult-action-btn cancel-btn"
                        onClick={() => cancelConsultation(selected.id)}
                      >
                        <FaTimesCircle /> Cancel
                      </button>
                    </div> 
                  )}

                  {isPatient &&
                    effectiveStatus === "Active" && (
                      <div className="consult-action-buttons">
                        {/* <button className="consult-action-btn join" onClick={() => handleJoinConsultation(selected)}>
                          <FaVideo /> Join Consultation
                        </button> */}
                        <button
                          className="consult-action-btn cancel-btn"
                          onClick={() => cancelConsultation(selected.id)}
                        >
                          <FaTimesCircle /> Cancel
                        </button>
                      </div>
                    )}

                  {isPatient &&
                    selected.status === "Ongoing" &&
                    selected.rescheduleRequest?.status ===
                      "Pending Approval" && (
                      <div className="consult-action-buttons">
                        <button
                          className="consult-action-btn reschedule"
                          onClick={() => openReschedulePopup(selected)}
                        >
                          <FaCalendarAlt /> Update Request
                        </button>
                      </div>
                    )}

                  {/* ===== Feedback Button (Patient, Completed, Not Yet Rated) ===== */}
                  {isPatient &&
                    effectiveStatus === "Completed" &&
                    !selected.rating && (
                      <div className="consult-action-buttons">
                        <button
                          className="consult-action-btn reschedule"
                          onClick={() => setFeedbackTarget(selected)}
                        >
                          <FaStar /> Rate Doctor
                        </button>
                      </div>
                    )}

                  {/* ===== Rating Display (Already Rated) ===== */}
                  {selected.rating > 0 && (
                    <div className="consult-section">
                      <div className="consult-section-title">
                        <FaStar className="consult-sec-icon" style={{ color: "#f59e0b" }} /> Your Rating
                      </div>
                      <div className="consult-info-card" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <FaStar key={s} style={{ color: s <= selected.rating ? "#f59e0b" : "#d1d5db", fontSize: "18px" }} />
                        ))}
                        <span style={{ marginLeft: "4px", fontWeight: 600 }}>{selected.rating}/5</span>
                      </div>
                      {selected.reviewComment && (
                        <div className="consult-info-card" style={{ marginTop: "8px" }}>
                          {selected.reviewComment}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ===== Complaint Button ===== */}
                  {canFileReport(selected) && (
                    <div className="consult-complaint-row">
                      <button
                        className="consult-complaint-btn"
                        onClick={() => setComplaintTarget(selected)}
                      >
                        <FaFlag /> File a Complaint
                      </button>
                      <p className="consult-complaint-hint">
                        Something went wrong? Report it to our review team.
                      </p>
                    </div>
                  )}
                </aside>
              );
            })()}
          </section>
        </div>
      </div>

      {/* ============== Reschedule Popup (Patient) ============== */}
      {reschedulePopup && (
        <div className="consult-popup-overlay">
          <div className="consult-popup-box">
            <div className="consult-popup-header">
              <h3>Reschedule Consultation</h3>
              <button
                className="consult-popup-close"
                onClick={() => {
                  setReschedulePopup(false);
                  setShowReschedDatePicker(false);
                  setShowReschedTimePicker(false);
                }}
              >
                <FaTimes />
              </button>
            </div>
            <div className="consult-popup-body">
              <p>Suggest a new date and time:</p>
              <div className="consult-reschedule-fields">
                <div className="consult-field-group">
                  <label>Date</label>
                  <div className="consult-picker-input-wrapper">
                    <input
                      type="text"
                      placeholder="Select Date"
                      value={
                        suggestedDate ? formatInputToDisplay(suggestedDate) : ""
                      }
                      readOnly
                      onClick={() => {
                        setShowReschedDatePicker(!showReschedDatePicker);
                        setShowReschedTimePicker(false);
                      }}
                      className="consult-picker-input"
                    />
                    <FaCalendarAlt
                      className="consult-picker-icon"
                      onClick={() => {
                        setShowReschedDatePicker(!showReschedDatePicker);
                        setShowReschedTimePicker(false);
                      }}
                    />
                    {showReschedDatePicker && (
                      <DatePicker
                        selectedDate={suggestedDate}
                        onSelect={handleReschedDateSelect}
                        onClose={() => setShowReschedDatePicker(false)}
                        inputRef={reschedDatePickerRef}
                        minDate={new Date().toISOString().split("T")[0]}
                      />
                    )}
                  </div>
                </div>
                <div className="consult-field-group">
                  <label>Day</label>
                  <input
                    type="text"
                    placeholder="Auto-fill"
                    value={suggestedDay}
                    readOnly
                    className="consult-day-input"
                  />
                </div>
                <div className="consult-field-group">
                  <label>Time</label>
                  <div className="consult-picker-input-wrapper">
                    <input
                      type="text"
                      placeholder="Select Time"
                      value={to12hLabel(suggestedTime)}
                      readOnly
                      onClick={() => {
                        setShowReschedTimePicker(!showReschedTimePicker);
                        setShowReschedDatePicker(false);
                      }}
                      className="consult-picker-input"
                    />
                    <FaClock
                      className="consult-picker-icon"
                      onClick={() => {
                        setShowReschedTimePicker(!showReschedTimePicker);
                        setShowReschedDatePicker(false);
                      }}
                    />
                    {showReschedTimePicker && (
                      <TimePicker
                        selectedTime={
                          suggestedTime === "custom"
                            ? "custom"
                            : suggestedTime
                        }
                        onSelect={handleReschedTimeSelect}
                        onClose={() => setShowReschedTimePicker(false)}
                        inputRef={reschedTimePickerRef}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="consult-popup-footer">
              <button
                className="consult-popup-btn secondary"
                onClick={() => {
                  setReschedulePopup(false);
                  setShowReschedDatePicker(false);
                  setShowReschedTimePicker(false);
                }}
              >
                Close
              </button>
              <button
                className="consult-popup-btn primary"
                disabled={
                  !suggestedDate.trim() ||
                  !suggestedDay.trim() ||
                  !suggestedTime.trim()
                }
                onClick={submitReschedule}
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============== Doctor Approval Popup ============== */}
      {approvalPopup && (
        <div className="consult-popup-overlay">
          <div className="consult-popup-box" ref={approvalRef}>
            <div className="consult-popup-header">
              <h3>
                {approvalAction === "approve"
                  ? "Approve Reschedule"
                  : "Reject Reschedule"}
              </h3>
              <button
                className="consult-popup-close"
                onClick={() => {
                  setApprovalPopup(false);
                  setDoctorShowDatePicker(false);
                  setDoctorShowTimePicker(false);
                }}
              >
                <FaTimes />
              </button>
            </div>
            <div className="consult-popup-body">
              {approvalAction === "approve" ? (
                <>
                  <p>Select date and time for the rescheduled consultation:</p>
                  <div className="consult-reschedule-fields">
                    <div className="consult-field-group">
                      <label>New Date</label>
                      <div className="consult-picker-input-wrapper">
                        <input
                          type="text"
                          placeholder="Select Date"
                          value={
                            doctorSelectedDate
                              ? formatInputToDisplay(doctorSelectedDate)
                              : ""
                          }
                          readOnly
                          onClick={() => {
                            setDoctorShowDatePicker(!doctorShowDatePicker);
                            setDoctorShowTimePicker(false);
                          }}
                          className="consult-picker-input"
                        />
                        <FaCalendarAlt
                          className="consult-picker-icon"
                          onClick={() => {
                            setDoctorShowDatePicker(!doctorShowDatePicker);
                            setDoctorShowTimePicker(false);
                          }}
                        />
                        {doctorShowDatePicker && (
                          <DatePicker
                            selectedDate={doctorSelectedDate}
                            onSelect={handleDoctorDateSelect}
                            onClose={() => setDoctorShowDatePicker(false)}
                            inputRef={approvalDatePickerRef}
                            minDate={new Date().toISOString().split("T")[0]}
                          />
                        )}
                      </div>
                    </div>
                    <div className="consult-field-group">
                      <label>Day</label>
                      <input
                        type="text"
                        placeholder="Auto-fill"
                        value={doctorSelectedDay}
                        readOnly
                        className="consult-day-input"
                      />
                    </div>
                    <div className="consult-field-group">
                      <label>New Time</label>
                      <div className="consult-picker-input-wrapper">
                        <input
                          type="text"
                          placeholder="Select Time"
                          value={
                            doctorSelectedTime
                              ? timeSlots.find(
                                  (s) => s.value === doctorSelectedTime,
                                )?.display || doctorSelectedTime
                              : ""
                          }
                          readOnly
                          onClick={() => {
                            setDoctorShowTimePicker(!doctorShowTimePicker);
                            setDoctorShowDatePicker(false);
                          }}
                          className="consult-picker-input"
                        />
                        <FaClock
                          className="consult-picker-icon"
                          onClick={() => {
                            setDoctorShowTimePicker(!doctorShowTimePicker);
                            setDoctorShowDatePicker(false);
                          }}
                        />
                        {doctorShowTimePicker && (
                          <TimePicker
                            selectedTime={doctorSelectedTime}
                            onSelect={handleDoctorTimeSelect}
                            onClose={() => setDoctorShowTimePicker(false)}
                            inputRef={approvalTimePickerRef}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p>Provide a reason for rejection:</p>
                  <textarea
                    className="consult-reason-input"
                    rows={4}
                    placeholder="Enter reason..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                </>
              )}
            </div>
            <div className="consult-popup-footer">
              <button
                className="consult-popup-btn secondary"
                onClick={() => {
                  setApprovalPopup(false);
                  setDoctorShowDatePicker(false);
                  setDoctorShowTimePicker(false);
                }}
              >
                Cancel
              </button>
              <button
                className="consult-popup-btn primary"
                onClick={submitApproval}
                disabled={
                  approvalAction === "approve"
                    ? !doctorSelectedDate || !doctorSelectedTime
                    : !rejectionReason.trim()
                }
              >
                {approvalAction === "approve" ? "Approve" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============== Revisit Popup ============== */}
      {revisitPopup && (
        <div className="consult-popup-overlay">
          <div className="consult-popup-box" ref={revisitRef}>
            <div className="consult-popup-header">
              <h3>Complete with Revisit</h3>
              <button
                className="consult-popup-close"
                onClick={() => setRevisitPopup(false)}
              >
                <FaTimes />
              </button>
            </div>
            <div className="consult-popup-body">
              <p>Provide reason for revisit:</p>
              <textarea
                className="consult-reason-input"
                rows={4}
                placeholder="Why does the patient need a revisit?"
                value={revisitReason}
                onChange={(e) => setRevisitReason(e.target.value)}
              />
            </div>
            <div className="consult-popup-footer">
              <button
                className="consult-popup-btn secondary"
                onClick={() => setRevisitPopup(false)}
              >
                Cancel
              </button>
              <button
                className="consult-popup-btn primary"
                disabled={!revisitReason.trim()}
                onClick={submitRevisit}
              >
                Submit & Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============== Complaint Modal ============== */}
      {complaintTarget && (
        <ComplaintModal
          against={{
            name: isPatient
              ? complaintTarget.doctorName
              : complaintTarget.patientName,
            role: isPatient ? "Doctor" : "Patient",
          }}
          contextLabel={`Consultation ${complaintTarget.id}`}
          onClose={() => setComplaintTarget(null)}
          onSubmit={handleComplaintSubmit}
          consultationId={complaintTarget?.backendId}
        />
      )}

      {complaintToast && (
        <div className="consult-complaint-toast">
          <FaCheckCircle /> Complaint submitted successfully
        </div>
      )}

      {/* ============== Feedback Modal ============== */}
      {feedbackTarget && (
        <FeedbackModal
          against={{
            name: feedbackTarget.doctorName,
            role: "Doctor",
          }}
          contextLabel={`Consultation ${feedbackTarget.id}`}
          onClose={() => setFeedbackTarget(null)}
          onSubmit={() => {
            setFeedbackToast(true);
            setTimeout(() => setFeedbackToast(false), 3000);
          }}
          consultationId={feedbackTarget?.backendId}
        />
      )}

      {feedbackToast && (
        <div className="consult-complaint-toast">
          <FaCheckCircle /> Feedback submitted successfully
        </div>
      )}

    </div>
  );
};

export default Consultations;
