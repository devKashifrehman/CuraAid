import React, {
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";
import {
  FaCheckCircle,
  FaHourglassHalf,
  FaTimesCircle,
  FaSearch,
  FaChevronRight,
  FaChevronDown,
  FaPhoneAlt,
  FaEnvelope,
  FaCalendarAlt,
  FaTimes,
  FaMapMarkerAlt,
  FaStethoscope,
  FaEdit,
  FaSave,
  FaUndo,
  FaClipboardList,
  FaMapMarkedAlt,
  FaChevronUp,
  FaRedo,
  FaClock,
  FaSpinner,
  FaPrescription,
  FaPlus,
  FaFlag,
  FaStar,
} from "react-icons/fa";
import ComplaintModal from "../ComplaintModal/ComplaintModal";
import FeedbackModal from "../FeedbackModal/FeedbackModal";
import "./Appointments.css";
import { ThemeContext } from "../../Theme/ThemeContext";
import { AuthContext } from "../../HeadFoot/Auth/AuthContext";
import Sidebar from "../Hamburger/sidebar";
import {
  EPrescriptionEditor,
  buildAppointmentRxData,
  medicinesToTextSummary,
  summarizeExaminationReport,
} from "../EPrescription";


const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

const mapBackendAppointment = (a) => {
  const patient = a.patient || {};
  const doctor = a.doctor || {};
  const statusMap = {
    pending: "Pending",
    scheduled: "Scheduled",
    in_progress: "Ongoing",
    active: "Active",
    completed: "Completed",
    cancelled: "Cancelled",
    rejected: "Rejected",
    no_show: "No Show",
  };
  const typeMap = { video: "Video Call", audio: "Voice Call", chat: "Chat", physical: "In-Person" };
  const dateObj = a.appointment_date ? new Date(a.appointment_date) : null;
  return {
    id: a.id ? `APT-${String(a.id).padStart(5, "0")}` : `APT-${a.id}`,
    backendId: a.id,
    patientName: patient.name || "Patient",
    doctorName: doctor.name || "Doctor",
    age: a.age || patient.age || "",
    gender: patient.gender || "",
    phone: patient.phone || "",
    email: patient.email || "",
    date: dateObj ? dateObj.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : (a.appointment_date || ""),
    day: dateObj ? dateObj.toLocaleDateString("en-US", { weekday: "long" }) : "",
    time: a.appointment_time || "",
    type: typeMap[a.consultation_type] || a.consultation_type || "Video Call",
    status: statusMap[a.status] || a.status || "Pending",
    location: a.meeting_link || "Online",
    lat: null,
    lng: null,
    symptoms: a.symptoms || [],
    notes: a.notes || "",
    reason: a.cancellation_reason || "",
    rescheduleRequest: (() => {
      const rr = a.reschedule_request;
      if (!rr || !rr.status) return null;
      const rrStatusMap = { pending: "Pending Approval", approved: "Approved", rejected: "Not Approved" };
      const rrDate = rr.suggested_date || "";
      const rrDateObj = rrDate && rrDate !== rr.suggestedDate
        ? parseAppointmentDate(rrDate)
        : null;
      const rrApprovedDate = rr.suggested_date || rr.suggestedDate || "";
      const rrApprovedDateObj = rrApprovedDate && rrApprovedDate !== rr.suggestedDate
        ? parseAppointmentDate(rrApprovedDate)
        : null;
      return {
        suggestedDate: rrDateObj
          ? rrDateObj.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
          : (rr.suggestedDate || rrDate || ""),
        suggestedTime: rr.suggested_time || rr.suggestedTime || "",
        suggestedDay: rr.suggested_day || getDayName(rrDate || rr.suggestedDate) || "",
        status: rrStatusMap[rr.status] || rr.status,
        requestedBy: rr.requested_by || "",
        approvedDate: rr.status === "approved"
          ? (rrApprovedDateObj
              ? rrApprovedDateObj.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
              : (rr.suggestedDate || rrApprovedDate || ""))
          : "",
        approvedTime: rr.status === "approved" ? (rr.suggested_time || rr.suggestedTime || "") : "",
        rejectionReason: rr.rejection_reason || "",
      };
    })(),
    avatar: null,
    examinationReport: a.examination_report || "",
    prescription: "",
    revisit: a.revisit || false,
    revisitReason: a.revisit_reason || "",
  };
};

//==================== Define Appointment Data ============================
const defaultAppointmentsData = [];

const COMPLAINT_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

const canFileComplaint = (appointment) => {
  if (!appointment) return false;
  if (appointment.status !== "Completed") return false;
  if (!appointment.completedAt) return false;
  return Date.now() - appointment.completedAt <= COMPLAINT_WINDOW_MS;
};

// ==================== Date Format Helpers ====================
const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const ACTIVE_WINDOW_MINUTES = 120;

// Doctor approval is required before a patient reschedule becomes active.
const AUTO_ACTIVATE_PATIENT_RESCHEDULES = false;

/** Parse appointment dates from UI/"backend" formats into a local Date (date-only). */
const parseAppointmentDate = (dateStr) => {
  if (!dateStr) return null;
  const raw = String(dateStr).trim();

  // ISO: 2026-07-08 or 2026-07-08T13:59:00
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [y, m, d] = raw.slice(0, 10).split("-").map(Number);
    if (y && m && d) return new Date(y, m - 1, d);
  }

  // Display variants:
  // "08 Jul 2026", "8 July 2026", "7th July 2026", "July 7, 2026"
  const normalized = raw
    .replace(/(\d+)(st|nd|rd|th)/gi, "$1")
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const parts = normalized.split(" ");
  if (parts.length >= 3) {
    // "8 Jul 2026" / "July 8 2026"
    let day;
    let month;
    let year;

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

    if (
      day &&
      month >= 0 &&
      !Number.isNaN(year) &&
      day >= 1 &&
      day <= 31
    ) {
      return new Date(year, month, day);
    }
  }

  const fallback = new Date(normalized);
  if (Number.isNaN(fallback.getTime())) return null;
  return new Date(
    fallback.getFullYear(),
    fallback.getMonth(),
    fallback.getDate(),
  );
};

const isSameCalendarDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

// ==================== Helper Functions ====================
const formatDisplayToInput = (displayDate) => {
  try {
    const parsed = parseAppointmentDate(displayDate);
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
    // Prefer YYYY-MM-DD from date inputs; also accepts display strings
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString("en-US", { weekday: "long" });
    }
    const parsed = parseAppointmentDate(dateStr);
    if (parsed) {
      return parsed.toLocaleDateString("en-US", { weekday: "long" });
    }
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "long" });
  } catch {
    return "";
  }
};

// ==================== Generate Time Slots ====================
const generateTimeSlots = () => {
  const slots = [];
  for (let i = 8; i < 20; i++) {
    for (let min = 0; min < 60; min += 30) {
      const hour = i;
      const minutes = min;
      const ampm = hour >= 12 ? "PM" : "AM";
      const displayHour = hour > 12 ? hour - 12 : hour;
      const displayMin = minutes.toString().padStart(2, "0");
      slots.push({
        value: `${hour.toString().padStart(2, "0")}:${displayMin}`,
        display: `${displayHour}:${displayMin} ${ampm}`,
      });
    }
  }
  return slots;
};

const to12hLabel = (val) => {
  if (!val || val === "custom") return val || "";
  const [h, m] = String(val).split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return val;
  const period = h >= 12 ? "PM" : "AM";
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${period}`;
};

const timeSlots = generateTimeSlots();

// ==================== Available Slots ====================
const availableSlots = [
  { start: "11:00 AM", end: "5:00 PM" },
  { start: "9:00 AM", end: "12:00 PM" },
  { start: "2:00 PM", end: "6:00 PM" },
];

// ==================== Available Slots Display Component ====================
const AvailableSlotsDisplay = () => {
  return (
    <div className="apt-available-slots-container">
      <div className="apt-available-slots-header">
        <FaClock className="apt-slots-icon" />
        <span>Available Time Slots</span>
      </div>
      <div className="apt-available-slots-grid">
        {availableSlots.map((slot, index) => (
          <div key={index} className="apt-available-slot-item">
            {slot.start} - {slot.end}
          </div>
        ))}
      </div>
    </div>
  );
};

// ==================== Date Picker Component ====================
const DatePicker = ({ selectedDate, onSelect, onClose, minDate, inputRef }) => {
  const today = new Date().toISOString().split("T")[0];
  const min = minDate || today;

  return (
    <div className="apt-date-picker-popup" ref={inputRef}>
      <div className="apt-date-picker-header">
        <span>Select Date</span>
        <button onClick={onClose} className="apt-close-picker">
          <FaTimes />
        </button>
      </div>
      <input
        type="date"
        className="apt-date-picker-input"
        value={selectedDate}
        min={min}
        onChange={(e) => onSelect(e.target.value)}
      />
      <div className="apt-date-picker-actions">
        <button
          className="apt-picker-btn"
          onClick={() => {
            const todayStr = new Date().toISOString().split("T")[0];
            onSelect(todayStr);
          }}
        >
          Today
        </button>
        <button
          className="apt-picker-btn"
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

// ==================== Time Picker Component ====================
const TimePicker = ({ selectedTime, onSelect, onClose, inputRef }) => {
  return (
    <div className="apt-time-picker-popup" ref={inputRef}>
      <div className="apt-time-picker-header">
        <span>Select Time</span>
        <button onClick={onClose} className="apt-close-picker">
          <FaTimes />
        </button>
      </div>
      <div className="apt-time-slots-grid">
        {timeSlots.map((slot) => (
          <button
            key={slot.value}
            className={`apt-time-slot-btn ${selectedTime === slot.value ? "selected" : ""}`}
            onClick={() => onSelect(slot.value)}
          >
            {slot.display}
          </button>
        ))}
      </div>
    </div>
  );
};

// ==================== Geocoding Function ====================
const geocodeAddress = async (address) => {
  if (!address || address.trim() === "") return null;
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
    );
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
};

// ==================== Completion Animation Component ====================
const CompletionAnimation = ({ show, onComplete }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onComplete();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div className="apt-completion-overlay">
      <div className="apt-completion-content">
        <div className="apt-completion-circle">
          <FaCheckCircle className="apt-completion-icon" />
        </div>
        <h3 className="apt-completion-title">Appointment Completed!</h3>
        <p className="apt-completion-subtitle">Status updated successfully</p>
      </div>
    </div>
  );
};

// ==================== Main Component ====================
const Appointments = () => {
  const location = useLocation();
  const { darkMode } = useContext(ThemeContext);
  const { isDoctor, isPatient, token, user } = useContext(AuthContext);

  // ==================== State Management ====================
  const query = new URLSearchParams(location.search);
  const tabParam = query.get("tab");

  const getInitialTab = () => {
    if (tabParam === "ongoing") return "Ongoing";
    if (tabParam === "completed") return "Completed";
    if (tabParam === "cancelled") return "Cancelled";
    if (tabParam === "rescheduled") return "Rescheduled";
    if (tabParam === "active") return "Active";
    return "All";
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [mobileDrawer, setMobileDrawer] = useState(false);
  const [data, setData] = useState(() => {
    if (!user?.id) return defaultAppointmentsData;
    try {
      const cached = localStorage.getItem(`appointments_data_${user.id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return defaultAppointmentsData;
  });

  // ==================== API Fetch ====================
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const fetchAppointments = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/appointments`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          timeout: 30000,
        });
        if (cancelled) return;
        const fetched = (res.data?.data ?? []).map(mapBackendAppointment);
        if (fetched.length > 0) {
          setData(fetched);
          localStorage.setItem(`appointments_data_${user?.id || "guest"}`, JSON.stringify(fetched));
        }
      } catch (err) {
        if (!cancelled) console.error("Failed to fetch appointments:", err?.response?.data || err?.message);
      }
    };
    fetchAppointments();
    return () => { cancelled = true; };
  }, [token, user?.id]);

  // ==================== Popup States ====================
  const [cancelPopup, setCancelPopup] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelTarget, setCancelTarget] = useState(null);

  const [reschedulePopup, setReschedulePopup] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [suggestedDate, setSuggestedDate] = useState("");
  const [suggestedTime, setSuggestedTime] = useState("");
  const [suggestedDay, setSuggestedDay] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [approvalPopup, setApprovalPopup] = useState(false);
  const [approvalTarget, setApprovalTarget] = useState(null);
  const [approvalAction, setApprovalAction] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [doctorSelectedTime, setDoctorSelectedTime] = useState("");
  const [doctorSelectedDate, setDoctorSelectedDate] = useState("");
  const [doctorSelectedDay, setDoctorSelectedDay] = useState("");
  const [doctorShowDatePicker, setDoctorShowDatePicker] = useState(false);
  const [doctorShowTimePicker, setDoctorShowTimePicker] = useState(false);

  // ==================== Edit States ====================
  const [doctorEditMode, setDoctorEditMode] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [editDay, setEditDay] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);

  const [reportText, setReportText] = useState("");
  const [prescriptionEditMode, setPrescriptionEditMode] = useState(false);
  const [prescriptionData, setPrescriptionData] = useState(null);
  const [notesEditMode, setNotesEditMode] = useState(false);
  const [notesText, setNotesText] = useState("");

  const [revisitPopup, setRevisitPopup] = useState(false);
  const [revisitReason, setRevisitReason] = useState("");
  const [revisitTargetId, setRevisitTargetId] = useState(null);
  const [showCompletion, setShowCompletion] = useState(false);

  const [complaintTarget, setComplaintTarget] = useState(null);
  const [complaintToast, setComplaintToast] = useState(false);
  const [feedbackTarget, setFeedbackTarget] = useState(null);
  const [feedbackToast, setFeedbackToast] = useState(false);

  // ==================== Refs ====================
  const cancelRef = useRef(null);
  const rescheduleRef = useRef(null);
  const revisitRef = useRef(null);
  const approvalRef = useRef(null);
  const datePickerRef = useRef(null);
  const timePickerRef = useRef(null);
  const doctorDatePickerRef = useRef(null);
  const doctorTimePickerRef = useRef(null);

  // ==================== Tabs Configuration ====================
  const tabs = [
    "All",
    "Ongoing",
    "Active",
    "Completed",
    "Cancelled",
    "Rescheduled",
  ];

  // ==================== Helper Functions ====================
  const [nowTick, setNowTick] = useState(() => Date.now());

  const parseTimeToMinutes = useCallback((timeStr) => {
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
  }, []);

  /**
   * Active for 2 hours from appointment start time when:
   * - date is today (flexible parsing)
   * - not completed/cancelled
   * - not pending reschedule approval
   * Works for Ongoing and approved-reschedule (date/time already updated).
   */
  const isCurrentlyActive = useCallback(
    (apt) => {
      if (!apt?.date || !apt?.time) return false;
      if (apt.status === "Completed" || apt.status === "Cancelled") return false;
      if (apt.status === "Active") return true;
      if (apt.rescheduleRequest?.status === "Pending Approval") return false;

      const aptDate = parseAppointmentDate(apt.date);
      if (!aptDate) return false;

      const now = new Date(nowTick);
      if (!isSameCalendarDay(aptDate, now)) return false;

      const aptMinutes = parseTimeToMinutes(apt.time);
      if (aptMinutes === null) return false;

      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const diff = currentMinutes - aptMinutes;
      return diff >= 0 && diff < ACTIVE_WINDOW_MINUTES;
    },
    [parseTimeToMinutes, nowTick],
  );

  const getEffectiveStatus = useCallback(
    (apt) => {
      if (apt.status === "Completed") return "Completed";
      if (apt.status === "Cancelled") return "Cancelled";
      // Pending reschedule must win over Active even if old slot is ongoing
      if (apt.rescheduleRequest?.status === "Pending Approval") {
        return "Rescheduled";
      }
      if (isCurrentlyActive(apt)) return "Active";
      if (apt.status === "Rescheduled") return "Rescheduled";
      return apt.status;
    },
    [isCurrentlyActive],
  );

  const canShowExamReport = useCallback(
    (apt) => {
      return isCurrentlyActive(apt) && apt.status !== "Completed";
    },
    [isCurrentlyActive],
  );

  const isExamReportSaved = useCallback(
    (apt) => Boolean(apt?.examinationReport?.trim()),
    [],
  );

  const statusClass = (s) => {
    if (s === "Ongoing") return "apt-badge apt-ongoing";
    if (s === "Active") return "apt-badge apt-active";
    if (s === "Completed") return "apt-badge apt-completed";
    if (s === "Cancelled") return "apt-badge apt-cancelled";
    return "apt-badge apt-rescheduled";
  };

  // ==================== Data Processing ====================
  const processedData = data.map((apt) => ({
    ...apt,
    displayStatus: getEffectiveStatus(apt),
  }));

  const filtered = processedData.filter((a) => {
    const matchesTab = activeTab === "All" || a.displayStatus === activeTab;
    const searchLower = search.toLowerCase();
    const matchesSearch =
      a.patientName.toLowerCase().includes(searchLower) ||
      a.doctorName.toLowerCase().includes(searchLower) ||
      a.id.toLowerCase().includes(searchLower);
    return matchesTab && matchesSearch;
  });

  const visible = showAll ? filtered : filtered.slice(0, 5);

  const counts = {
    Completed: data.filter((a) => a.status === "Completed").length,
    Ongoing: data.filter((a) => a.status === "Ongoing" && !isCurrentlyActive(a))
      .length,
    Active: data.filter(
      (a) =>
        isCurrentlyActive(a) &&
        a.status !== "Completed" &&
        a.status !== "Cancelled",
    ).length,
    Cancelled: data.filter((a) => a.status === "Cancelled").length,
    Rescheduled: data.filter((a) => getEffectiveStatus(a) === "Rescheduled")
      .length,
  };

  // ==================== Event Handlers ====================
  const handleSelect = (a) => {
    setSelected(a);
    setDoctorEditMode(false);
    setPrescriptionEditMode(false);
    setPrescriptionData(null);
    setNotesEditMode(false);
    if (selected && selected.id === a.id) {
      setNotesText(a.notes || "");
    }
    if (window.innerWidth <= 900) setMobileDrawer(true);
  };

  const openCancelPopup = (a, e) => {
    e.stopPropagation();
    setCancelTarget(a);
    setCancelReason("");
    setCancelPopup(true);
  };

  const submitCancel = async () => {
    if (!cancelReason.trim()) return;
    const target = cancelTarget;
    const reason = cancelReason;
    setData((prev) =>
      prev.map((a) =>
        a.id === target.id
          ? { ...a, status: "Cancelled", reason }
          : a,
      ),
    );
    if (selected && selected.id === target.id) {
      setSelected((prev) => ({
        ...prev,
        status: "Cancelled",
        reason,
      }));
    }
    setCancelPopup(false);
    setCancelTarget(null);
    setCancelReason("");
    try {
      await axios.post(`${API_BASE_URL}/api/appointments/${target.backendId}/cancel`, { reason }, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        timeout: 15000,
      });
    } catch (err) {
      console.error("Cancel API error:", err?.response?.data || err?.message);
    }
  };

  const openReschedulePopup = (a, e) => {
    e.stopPropagation();
    setRescheduleTarget(a);
    setSuggestedDate("");
    setSuggestedDay("");
    setSuggestedTime("");
    setShowDatePicker(false);
    setShowTimePicker(false);
    setReschedulePopup(true);
  };

  const handleDateSelect = (dateStr) => {
    setSuggestedDate(dateStr);
    const dayName = getDayName(dateStr);
    setSuggestedDay(dayName);
    setShowDatePicker(false);
  };

  const handlePatientTimeSelect = (timeValue) => {
    const selectedSlot = timeSlots.find((slot) => slot.value === timeValue);
    if (selectedSlot) {
      setSuggestedTime(selectedSlot.value);
    }
    setShowTimePicker(false);
  };

  const submitReschedule = async () => {
    if (!suggestedDate.trim() || !suggestedDay.trim() || !suggestedTime.trim())
      return;
    const target = rescheduleTarget;
    const formattedDisplayDate = formatInputToDisplay(suggestedDate);
    const rescheduleRequest = AUTO_ACTIVATE_PATIENT_RESCHEDULES
      ? {
          suggestedDate: formattedDisplayDate,
          suggestedDay,
          suggestedTime,
          status: "Auto Activated",
          requestedBy: "Patient",
        }
      : {
          suggestedDate: formattedDisplayDate,
          suggestedDay,
          suggestedTime,
          status: "Pending Approval",
          requestedBy: "Patient",
        };
    const updatedAppointment = {
      date: formattedDisplayDate,
      day: suggestedDay,
      time: suggestedTime,
      status: AUTO_ACTIVATE_PATIENT_RESCHEDULES ? "Active" : "Rescheduled",
      rescheduleRequest,
    };
    setData((prev) =>
      prev.map((a) =>
        a.id === target.id
          ? { ...a, ...updatedAppointment }
          : a,
      ),
    );
    if (selected && selected.id === target.id) {
      setSelected((prev) => ({ ...prev, ...updatedAppointment }));
    }
    setReschedulePopup(false);
    setRescheduleTarget(null);
    setSuggestedDate("");
    setSuggestedDay("");
    setSuggestedTime("");
    setShowDatePicker(false);
    setShowTimePicker(false);
    try {
      await axios.post(`${API_BASE_URL}/api/appointments/${target.backendId}/reschedule`, {
        suggested_date: suggestedDate,
        suggested_time: suggestedTime,
      }, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        timeout: 15000,
      });
    } catch (err) {
      console.error("Reschedule API error:", err?.response?.data || err?.message);
    }
  };

  const openApprovalPopup = (aptId, action, e) => {
    e.stopPropagation();
    const apt = data.find((a) => a.id === aptId);
    if (!apt || !apt.rescheduleRequest) return;
    const suggestedInputDate = formatDisplayToInput(
      apt.rescheduleRequest.suggestedDate,
    );
    setApprovalTarget(aptId);
    setApprovalAction(action);
    setRejectionReason("");
    setDoctorSelectedDate(suggestedInputDate);
    setDoctorSelectedDay(
      apt.rescheduleRequest.suggestedDay || getDayName(suggestedInputDate),
    );
    const timeSlot = timeSlots.find(
      (s) =>
        s.value === apt.rescheduleRequest.suggestedTime ||
        s.display === apt.rescheduleRequest.suggestedTime,
    );
    setDoctorSelectedTime(timeSlot ? timeSlot.value : apt.rescheduleRequest.suggestedTime);
    setDoctorShowDatePicker(false);
    setDoctorShowTimePicker(false);
    setApprovalPopup(true);
  };

  const handleDoctorDateSelect = (dateStr) => {
    setDoctorSelectedDate(dateStr);
    const dayName = getDayName(dateStr);
    setDoctorSelectedDay(dayName);
    setDoctorShowDatePicker(false);
  };

  const handleDoctorTimeSelect = (timeValue) => {
    setDoctorSelectedTime(timeValue);
    setDoctorShowTimePicker(false);
  };

  const handleDoctorDateManualChange = (e) => {
    const value = e.target.value;
    setDoctorSelectedDate(value);
    if (value) {
      const dayName = getDayName(value);
      setDoctorSelectedDay(dayName);
    }
  };

  const handleDoctorTimeManualChange = (e) => {
    const value = e.target.value;
    setDoctorSelectedTime(value);
  };

  const submitApproval = async () => {
    if (!approvalTarget) return;
    const apt = data.find((a) => a.id === approvalTarget);
    if (approvalAction === "approve") {
      if (!doctorSelectedDate || !doctorSelectedTime) {
        alert("Please select a date and time for the rescheduled appointment.");
        return;
      }
      const formattedDisplayDate = formatInputToDisplay(doctorSelectedDate);
      const selectedSlot = timeSlots.find(
        (slot) => slot.value === doctorSelectedTime,
      );
      const displayTime = selectedSlot
        ? selectedSlot.display
        : doctorSelectedTime;
      const dayName = getDayName(doctorSelectedDate);
      setData((prev) =>
        prev.map((a) => {
          if (a.id === approvalTarget && a.rescheduleRequest) {
            return {
              ...a,
              date: formattedDisplayDate,
              day: dayName,
              time: displayTime,
              status: "Ongoing",
              rescheduleRequest: {
                ...a.rescheduleRequest,
                status: "Approved",
                approvedDate: formattedDisplayDate,
                approvedDay: dayName,
                approvedTime: displayTime,
                approvedBy: "Doctor",
              },
            };
          }
          return a;
        }),
      );
      if (selected && selected.id === approvalTarget) {
        setSelected((prev) => ({
          ...prev,
          date: formattedDisplayDate,
          day: dayName,
          time: displayTime,
          status: "Ongoing",
          rescheduleRequest: {
            ...prev.rescheduleRequest,
            status: "Approved",
            approvedDate: formattedDisplayDate,
            approvedDay: dayName,
            approvedTime: displayTime,
            approvedBy: "Doctor",
          },
        }));
      }
      try {
        await axios.post(`${API_BASE_URL}/api/appointments/${apt?.backendId}/reschedule/approve`, {
          date: doctorSelectedDate,
          time: doctorSelectedTime,
        }, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          timeout: 15000,
        });
      } catch (err) {
        console.error("Approve reschedule API error:", err?.response?.data || err?.message);
      }
    } else {
      if (!rejectionReason.trim()) {
        alert("Please provide a reason for rejecting the reschedule request.");
        return;
      }
      const reason = rejectionReason;
      setData((prev) =>
        prev.map((a) => {
          if (a.id === approvalTarget && a.rescheduleRequest) {
            return {
              ...a,
              rescheduleRequest: {
                ...a.rescheduleRequest,
                status: "Not Approved",
                rejectionReason: reason,
                rejectedBy: "Doctor",
              },
            };
          }
          return a;
        }),
      );
      if (selected && selected.id === approvalTarget) {
        setSelected((prev) => ({
          ...prev,
          rescheduleRequest: {
            ...prev.rescheduleRequest,
            status: "Not Approved",
            rejectionReason: reason,
            rejectedBy: "Doctor",
          },
        }));
      }
      try {
        await axios.post(`${API_BASE_URL}/api/appointments/${apt?.backendId}/reschedule/reject`, { reason }, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          timeout: 15000,
        });
      } catch (err) {
        console.error("Reject reschedule API error:", err?.response?.data || err?.message);
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

  const enableDoctorEdit = () => {
    if (!selected) return;
    setEditDate(formatDisplayToInput(selected.date));
    setEditDay(selected.day);
    setEditTime(selected.time);
    setEditLocation(selected.location || "");
    setDoctorEditMode(true);
  };

  const saveDoctorEdit = async () => {
    if (!selected) return;
    setIsGeocoding(true);
    const formattedDate = formatInputToDisplay(editDate);
    const dayName = editDay;
    const time = editTime;
    const location = editLocation;
    try {
      let newLat = selected.lat;
      let newLng = selected.lng;
      if (editLocation !== selected.location && editLocation.trim() !== "") {
        const coords = await geocodeAddress(editLocation);
        if (coords) {
          newLat = coords.lat;
          newLng = coords.lng;
        }
      } else if (editLocation.trim() === "") {
        newLat = null;
        newLng = null;
      }
      setData((prev) =>
        prev.map((a) =>
          a.id === selected.id
            ? {
                ...a,
                date: formattedDate,
                day: dayName,
                time,
                location,
                lat: newLat,
                lng: newLng,
              }
            : a,
        ),
      );
      setSelected((prev) => ({
        ...prev,
        date: formattedDate,
        day: dayName,
        time,
        location,
        lat: newLat,
        lng: newLng,
      }));
      setDoctorEditMode(false);
      try {
        await axios.put(`${API_BASE_URL}/api/appointments/${selected.backendId}`, {
          appointment_date: editDate,
          appointment_time: time,
          notes: selected.notes || "",
          meeting_link: location,
        }, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          timeout: 15000,
        });
      } catch (err) {
        console.error("Edit appointment API error:", err?.response?.data || err?.message);
      }
    } catch (error) {
      console.error("Error saving appointment:", error);
      alert("There was an error saving the appointment. Please try again.");
    } finally {
      setIsGeocoding(false);
    }
  };

  const saveExaminationReport = async () => {
    if (!selected || !reportText.trim()) return;
    const summary = summarizeExaminationReport(reportText);
    setData((prev) =>
      prev.map((a) =>
        a.id === selected.id
          ? {
              ...a,
              examinationReport: reportText,
              prescriptionData: a.prescriptionData
                ? {
                    ...a.prescriptionData,
                    diagnosis: a.prescriptionData.diagnosis || summary,
                    clinicalExamination:
                      a.prescriptionData.clinicalExamination || summary,
                  }
                : a.prescriptionData,
            }
          : a,
      ),
    );
    setSelected((prev) => ({
      ...prev,
      examinationReport: reportText,
      prescriptionData: prev.prescriptionData
        ? {
            ...prev.prescriptionData,
            diagnosis: prev.prescriptionData.diagnosis || summary,
            clinicalExamination:
              prev.prescriptionData.clinicalExamination || summary,
          }
        : prev.prescriptionData,
    }));

    if (prescriptionEditMode && prescriptionData) {
      setPrescriptionData((prev) => ({
        ...prev,
        diagnosis: prev.diagnosis || summary,
        clinicalExamination: prev.clinicalExamination || summary,
      }));
    }
    try {
      await axios.put(`${API_BASE_URL}/api/appointments/${selected.backendId}`, {
        examination_report: reportText,
      }, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        timeout: 15000,
      });
    } catch (err) {
      console.error("Save examination report API error:", err?.response?.data || err?.message);
    }
  };

  const savePrescription = () => {
    if (!selected || !prescriptionData) return;

    const validMedicines = (prescriptionData.medicines || []).filter((med) =>
      med.name?.trim(),
    );
    if (!validMedicines.length) {
      window.alert("Please add at least one medicine before updating.");
      return;
    }

    const now = new Date();
    const updatedDate = now.toLocaleDateString("en-US");
    const updatedRx = {
      ...prescriptionData,
      medicines: validMedicines,
      date: updatedDate,
      printedBy: now.toLocaleString("en-GB"),
    };
    const textSummary = medicinesToTextSummary(validMedicines);

    // Optimistic: instant UI update
    setData((prev) =>
      prev.map((a) =>
        a.id === selected.id
          ? {
              ...a,
              prescription: textSummary,
              prescriptionData: updatedRx,
              date: a.date,
              prescriptionUpdatedOn: `${updatedDate} ${now.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}`,
            }
          : a,
      ),
    );
    setSelected((prev) => ({
      ...prev,
      prescription: textSummary,
      prescriptionData: updatedRx,
      prescriptionUpdatedOn: `${updatedDate} ${now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`,
    }));
    setPrescriptionData(updatedRx);
    setPrescriptionEditMode(false);

    // Background API call
    if (selected.backendId && token) {
      axios.put(
        `${API_BASE_URL}/api/consultations/${selected.backendId}`,
        {
          prescription: {
            medicines: validMedicines,
            advice: prescriptionData.doctorsNotes || "",
          },
          diagnosis: prescriptionData.diagnosis ? [prescriptionData.diagnosis] : [],
        },
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, timeout: 15000 }
      ).catch((err) => console.error("Prescription save API error:", err?.response?.data || err?.message));
    }
  };

  const enablePrescriptionEdit = () => {
    if (!selected) return;
    const base = buildAppointmentRxData(selected);
    const examSummary = summarizeExaminationReport(
      selected.examinationReport || reportText || "",
    );
    setPrescriptionData({
      ...base,
      diagnosis: base.diagnosis || examSummary,
      clinicalExamination: base.clinicalExamination || examSummary,
      date: new Date().toLocaleDateString("en-US"),
    });
    setPrescriptionEditMode(true);
  };

  const cancelPrescriptionEdit = () => {
    setPrescriptionEditMode(false);
    setPrescriptionData(null);
  };

  const saveNotes = async () => {
    if (!selected) return;
    setData((prev) =>
      prev.map((a) => (a.id === selected.id ? { ...a, notes: notesText } : a)),
    );
    setSelected((prev) => ({ ...prev, notes: notesText }));
    setNotesEditMode(false);
    try {
      await axios.put(`${API_BASE_URL}/api/appointments/${selected.backendId}`, {
        notes: notesText,
      }, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        timeout: 15000,
      });
    } catch (err) {
      console.error("Save notes API error:", err?.response?.data || err?.message);
    }
  };

  const enableNotesEdit = () => {
    if (!selected) return;
    setNotesText(selected.notes || "");
    setNotesEditMode(true);
  };

  const cancelNotesEdit = () => {
    setNotesEditMode(false);
    setNotesText(selected?.notes || "");
  };

  const markAsCompleted = (aptId, isRevisit = false) => {
    if (isRevisit) {
      setRevisitTargetId(aptId);
      setRevisitReason("");
      setRevisitPopup(true);
    } else {
      const apt = data.find((a) => a.id === aptId);
      setData((prev) =>
        prev.map((a) =>
          a.id === aptId
            ? {
                ...a,
                status: "Completed",
                completedAt: Date.now(),
                revisit: false,
                revisitReason: "",
              }
            : a,
        ),
      );
      if (selected && selected.id === aptId) {
        setSelected((prev) => ({
          ...prev,
          status: "Completed",
          completedAt: Date.now(),
          revisit: false,
          revisitReason: "",
        }));
      }
      setShowCompletion(true);
      setTimeout(() => {
        setShowCompletion(false);
      }, 1500);
      (async () => {
        try {
          await axios.put(`${API_BASE_URL}/api/appointments/${apt?.backendId}`, {
            status: "completed",
            revisit: false,
            revisit_reason: "",
          }, {
            headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
            timeout: 15000,
          });
        } catch (err) {
          console.error("Complete appointment API error:", err?.response?.data || err?.message);
        }
      })();
    }
  };

  const submitRevisit = async () => {
    if (!revisitReason.trim() || !revisitTargetId) return;
    const targetId = revisitTargetId;
    const reason = revisitReason;
    const apt = data.find((a) => a.id === targetId);
      setData((prev) =>
        prev.map((a) =>
          a.id === targetId
            ? {
                ...a,
                status: "Completed",
                completedAt: Date.now(),
                revisit: true,
                revisitReason: reason,
              }
            : a,
        ),
      );
    if (selected && selected.id === targetId) {
      setSelected((prev) => ({
        ...prev,
        status: "Completed",
        completedAt: Date.now(),
        revisit: true,
        revisitReason: reason,
      }));
    }
    setRevisitPopup(false);
    setRevisitTargetId(null);
    setRevisitReason("");
    setShowCompletion(true);
    setTimeout(() => {
      setShowCompletion(false);
    }, 1500);
    try {
      await axios.put(`${API_BASE_URL}/api/appointments/${apt?.backendId}`, {
        status: "completed",
        revisit: true,
        revisit_reason: reason,
      }, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        timeout: 15000,
      });
    } catch (err) {
      console.error("Revisit API error:", err?.response?.data || err?.message);
    }
  };

  const handleRescheduleAgain = (apt) => {
    setRescheduleTarget(apt);
    setSuggestedDate("");
    setSuggestedDay("");
    setSuggestedTime("");
    setShowDatePicker(false);
    setShowTimePicker(false);
    setReschedulePopup(true);
  };

  const openComplaint = (apt) => {
    setComplaintTarget(apt);
  };

  const handleComplaintSubmit = () => {
    setComplaintTarget(null);
    setComplaintToast(true);
    setTimeout(() => setComplaintToast(false), 3200);
  };

  const openFeedback = (apt) => {
    setFeedbackTarget(apt);
  };

  const handleFeedbackSubmit = () => {
    setFeedbackTarget(null);
    setFeedbackToast(true);
    setTimeout(() => setFeedbackToast(false), 3200);
  };

  const renderMap = (apt) => {
    if (!apt.lat || !apt.lng) {
      return (
        <div className="apt-map-placeholder">
          <FaMapMarkedAlt className="apt-map-icon" />
          <p>Online Appointment - No location map available</p>
        </div>
      );
    }
    return (
      <div className="apt-map-container">
        <iframe
          title="appointment-location"
          width="100%"
          height="100%"
          className="apt-map-iframe"
          loading="lazy"
          allowFullScreen
          src={`https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d5000!2d${apt.lng}!3d${apt.lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2s!4v1`}
        />
      </div>
    );
  };

  // ==================== Effects ====================
  // Re-evaluate Active window every 30s (and when tab is visible again)
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

  // Keep selected appointment in sync when Active window / data changes
  const selectedId = selected?.id;
  useEffect(() => {
    if (!selectedId) return;
    const latest = data.find((a) => a.id === selectedId);
    if (!latest) return;
    setSelected((prev) => {
      if (!prev || prev.id !== latest.id) return prev;
      // Avoid loop: only update when meaningful schedule/status fields changed
      if (
        prev.date === latest.date &&
        prev.time === latest.time &&
        prev.day === latest.day &&
        prev.status === latest.status &&
        prev.examinationReport === latest.examinationReport &&
        prev.prescription === latest.prescription &&
        JSON.stringify(prev.rescheduleRequest) ===
          JSON.stringify(latest.rescheduleRequest)
      ) {
        return prev;
      }
      return { ...latest };
    });
  }, [nowTick, data, selectedId]);

  useEffect(() => {
    // Reset editor-related state when appointment selection changes
    if (!selected) {
      setReportText("");
      setNotesText("");
      setPrescriptionEditMode(false);
      setPrescriptionData(null);
      setNotesEditMode(false);
      return;
    }
    if (canShowExamReport(selected)) {
      setReportText(selected.examinationReport || "");
    } else {
      setReportText("");
    }
    setNotesText(selected.notes || "");
  }, [selected, canShowExamReport]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (cancelRef.current && !cancelRef.current.contains(e.target))
        setCancelPopup(false);
      if (rescheduleRef.current && !rescheduleRef.current.contains(e.target)) {
        setReschedulePopup(false);
        setShowDatePicker(false);
        setShowTimePicker(false);
      }
      if (revisitRef.current && !revisitRef.current.contains(e.target))
        setRevisitPopup(false);
      if (approvalRef.current && !approvalRef.current.contains(e.target)) {
        setApprovalPopup(false);
        setDoctorShowDatePicker(false);
        setDoctorShowTimePicker(false);
      }
      if (datePickerRef.current && !datePickerRef.current.contains(e.target))
        setShowDatePicker(false);
      if (timePickerRef.current && !timePickerRef.current.contains(e.target))
        setShowTimePicker(false);
      if (
        doctorDatePickerRef.current &&
        !doctorDatePickerRef.current.contains(e.target)
      )
        setDoctorShowDatePicker(false);
      if (
        doctorTimePickerRef.current &&
        !doctorTimePickerRef.current.contains(e.target)
      )
        setDoctorShowTimePicker(false);
    };
    if (
      cancelPopup ||
      reschedulePopup ||
      revisitPopup ||
      approvalPopup ||
      showDatePicker ||
      showTimePicker ||
      doctorShowDatePicker ||
      doctorShowTimePicker
    ) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [
    cancelPopup,
    reschedulePopup,
    revisitPopup,
    approvalPopup,
    showDatePicker,
    showTimePicker,
    doctorShowDatePicker,
    doctorShowTimePicker,
  ]);

  // ==================== Render ====================
  return (
    <div className="apt-appointments-layout">
      <Sidebar />
      <div
        className={`apt-appointments-wrapper ${darkMode ? "dark" : "light"}`}
      >
        {/* ============== Page Header Section ============== */}
        <header className="apt-page-header">
          <div className="apt-page-header-left">
            <h1 className="apt-page-title">Appointments</h1>
            <p className="apt-page-subtitle">
              {isPatient
                ? "Manage all your appointments in one place"
                : "View and manage your patient appointments"}
            </p>
          </div>
        </header>

        {/* ============== Summary Cards Section ============== */}
        <section className="apt-summary">
          <div className="apt-summary-card apt-glass">
            <div className="apt-icon-box apt-completed-icon">
              <FaCheckCircle />
            </div>
            <div className="apt-summary-info">
              <span className="apt-summary-label">Completed</span>
              <h2 className="apt-summary-count">{counts.Completed}</h2>
              <p className="apt-summary-sub">This Month</p>
            </div>
          </div>

          <div className="apt-summary-card apt-glass">
            <div className="apt-icon-box apt-ongoing-icon">
              <FaHourglassHalf />
            </div>
            <div className="apt-summary-info">
              <span className="apt-summary-label">Ongoing</span>
              <h2 className="apt-summary-count">{counts.Ongoing}</h2>
              <p className="apt-summary-sub">Upcoming</p>
            </div>
          </div>

          <div className="apt-summary-card apt-glass">
            <div className="apt-icon-box apt-active-icon">
              <FaStethoscope />
            </div>
            <div className="apt-summary-info">
              <span className="apt-summary-label">Active Now</span>
              <h2 className="apt-summary-count">{counts.Active}</h2>
              <p className="apt-summary-sub">In Progress</p>
            </div>
          </div>

          <div className="apt-summary-card apt-glass">
            <div className="apt-icon-box apt-cancelled-icon">
              <FaTimesCircle />
            </div>
            <div className="apt-summary-info">
              <span className="apt-summary-label">Cancelled</span>
              <h2 className="apt-summary-count">{counts.Cancelled}</h2>
              <p className="apt-summary-sub">This Month</p>
            </div>
          </div>
        </section>

        {/* ============== Search Box Section ============== */}
        <div className="apt-toolbar">
          <div className="apt-search-box">
            <FaSearch className="apt-search-icon" />
            <input
              type="text"
              placeholder="Search appointments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* ============== Tabs Section ============== */}
        <div className="apt-tabs">
          {tabs.map((t) => (
            <button
              key={t}
              className={`apt-tab-pill ${activeTab === t ? "active" : ""}`}
              onClick={() => setActiveTab(t)}
            >
              {t}{" "}
              {t === "Active" && counts.Active > 0 && (
                <span className="apt-tab-count">{counts.Active}</span>
              )}
            </button>
          ))}
        </div>

        {/* ============== Split Area Section ============== */}
        <div className={`apt-split-area ${selected ? "split-open" : ""}`}>
          {/* ============== List Panel Section ============== */}
          <section className="apt-list-panel">
            <div className="apt-appointment-list">
              {visible.map((a) => (
                <div
                  key={a.id}
                  className={`apt-appointment-item ${selected?.id === a.id ? "selected" : ""}`}
                  onClick={() => handleSelect(a)}
                >
                  <img
                    src={a.avatar}
                    alt={a.patientName}
                    className="apt-avatar"
                  />
                  <div className="apt-item-mid">
                    <h3>{isPatient ? a.doctorName : a.patientName}</h3>
                    <p className="apt-item-meta">
                      {a.age} Years, {a.gender} • {a.type}
                    </p>
                  </div>
                  <div className="apt-item-date">
                    <p>{a.date}</p>
                    <span className="apt-apt-id">{a.id}</span>
                  </div>
                  <span className={statusClass(a.displayStatus)}>
                    ● {a.displayStatus}
                  </span>
                  <FaChevronRight className="apt-chevron" />
                </div>
              ))}
            </div>

            {filtered.length > 5 && (
              <div className="apt-view-more-wrap">
                <button
                  className="apt-view-more-btn"
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll ? "View Less" : "View More"}{" "}
                  {showAll ? <FaChevronUp /> : <FaChevronDown />}
                </button>
              </div>
            )}
          </section>

          {/* ============== Details Panel Section ============== */}
          {selected && (
            <aside
              className={`apt-details-panel apt-glass ${mobileDrawer ? "mobile-open" : ""}`}
            >
              {/* ========== Details Header ========== */}
              <div className="apt-details-header">
                <h3>Appointment Details</h3>
                <div className="apt-header-right">
                  <span className={statusClass(getEffectiveStatus(selected))}>
                    ● {getEffectiveStatus(selected)}
                  </span>
                  <button
                    className="apt-close-btn"
                    onClick={() => {
                      setSelected(null);
                      setMobileDrawer(false);
                      setDoctorEditMode(false);
                      setPrescriptionEditMode(false);
                      setPrescriptionData(null);
                      setNotesEditMode(false);
                    }}
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>

              {/* ========== Patient Info ========== */}
              <div className="apt-patient-info">
                <img src={selected.avatar} alt={selected.patientName} />
                <div>
                  <h2>
                    {isPatient ? selected.doctorName : selected.patientName}
                  </h2>
                  <p>
                    {selected.age} Years, {selected.gender}
                  </p>
                  <p className="apt-contact">
                    <FaPhoneAlt /> {selected.phone}
                  </p>
                  <p className="apt-contact">
                    <FaEnvelope /> {selected.email}
                  </p>
                </div>
              </div>

              {/* ========== Info Grid ========== */}
              <div className="apt-info-grid">
                <div>
                  <span className="apt-info-label">Appointment ID</span>
                  <p>{selected.id}</p>
                </div>
                <div>
                  <span className="apt-info-label">Date</span>
                  {isDoctor && doctorEditMode ? (
                    <input
                      type="date"
                      className="apt-edit-input"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                    />
                  ) : (
                    <p>{selected.date}</p>
                  )}
                </div>
                <div>
                  <span className="apt-info-label">Day</span>
                  {isDoctor && doctorEditMode ? (
                    <input
                      className="apt-edit-input"
                      value={editDay}
                      onChange={(e) => setEditDay(e.target.value)}
                    />
                  ) : (
                    <p>{selected.day}</p>
                  )}
                </div>
                <div>
                  <span className="apt-info-label">Time</span>
                  {isDoctor && doctorEditMode ? (
                    <input
                      type="time"
                      className="apt-edit-input"
                      value={editTime}
                      onChange={(e) => setEditTime(e.target.value)}
                    />
                  ) : (
                    <p>{selected.time}</p>
                  )}
                </div>
                <div>
                  <span className="apt-info-label">Type</span>
                  <p>{selected.type}</p>
                </div>
                <div>
                  <span className="apt-info-label">Status</span>
                  <p>{getEffectiveStatus(selected)}</p>
                </div>
              </div>

              {/* ========== Location Section ========== */}
              <div className="apt-section">
                <div className="apt-section-title">
                  <FaMapMarkerAlt className="apt-sec-icon location" /> Location
                </div>
                {isDoctor && doctorEditMode ? (
                  <div className="apt-edit-location-wrapper">
                    <input
                      className="apt-edit-input full"
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      placeholder="Enter location address..."
                    />
                    {isGeocoding && (
                      <div className="apt-geocoding-indicator">
                        <FaSpinner className="apt-spinner" /> Updating map
                        location...
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="apt-info-card">{selected.location}</div>
                )}
                {renderMap(selected)}
              </div>

              {/* ========== Symptoms Section ========== */}
              <div className="apt-section">
                <div className="apt-section-title">
                  <FaStethoscope className="apt-sec-icon symptom" /> Symptoms
                </div>
                <div className="apt-chips">
                  {selected.symptoms.map((s) => (
                    <span key={s} className="apt-chip">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* ========== Notes Section ========== */}
              <div className="apt-section">
                <div className="apt-section-title">
                  <FaClipboardList className="apt-sec-icon notes" /> Notes
                  {isDoctor &&
                    getEffectiveStatus(selected) === "Active" &&
                    !notesEditMode && (
                      <button
                        className="apt-update-notes-btn"
                        onClick={enableNotesEdit}
                      >
                        <FaEdit /> Update Notes
                      </button>
                    )}
                </div>

                {isDoctor &&
                getEffectiveStatus(selected) === "Active" &&
                notesEditMode ? (
                  <div className="apt-notes-edit-area">
                    <textarea
                      className="apt-notes-textarea"
                      rows={4}
                      placeholder="Enter notes..."
                      value={notesText}
                      onChange={(e) => setNotesText(e.target.value)}
                    />
                    <div className="apt-notes-actions">
                      <button
                        className="apt-notes-save-btn"
                        onClick={saveNotes}
                      >
                        <FaSave /> Save Notes
                      </button>
                      <button
                        className="apt-notes-cancel-btn"
                        onClick={cancelNotesEdit}
                      >
                        <FaTimes /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="apt-info-card">{selected.notes}</div>
                )}
              </div>

              {/* ========== Cancellation Reason ========== */}
              {selected.status === "Cancelled" && selected.reason && (
                <div className="apt-section">
                  <div className="apt-section-title">
                    <FaTimesCircle className="apt-sec-icon cancelled" />{" "}
                    Cancellation Reason
                  </div>
                  <div className="apt-info-card muted">{selected.reason}</div>
                </div>
              )}

              {/* ========== Revisit Reason ========== */}
              {selected.status === "Completed" &&
                selected.revisit &&
                selected.revisitReason && (
                  <div className="apt-section">
                    <div className="apt-section-title">
                      <FaRedo className="apt-sec-icon revisit" /> Revisit Reason
                    </div>
                    <div className="apt-info-card muted">
                      {selected.revisitReason}
                    </div>
                  </div>
                )}

              {/* ========== Reschedule Request Section ========== */}
              {selected.rescheduleRequest && (
                <div className="apt-section">
                  <div className="apt-section-title">
                    <FaCalendarAlt className="apt-sec-icon followup" />{" "}
                    Reschedule Request
                  </div>
                  <div className="apt-followup-card">
                    <div className="apt-followup-info">
                      <span className="apt-followup-date">
                        {selected.rescheduleRequest.suggestedDate} •{" "}
                        {selected.rescheduleRequest.suggestedDay} •{" "}
                        {to12hLabel(selected.rescheduleRequest.suggestedTime)}
                      </span>
                      <span
                        className={`apt-followup-badge ${
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

                    {selected.rescheduleRequest.status ===
                      "Pending Approval" && <AvailableSlotsDisplay />}

                    {/* Doctor approve/reject controls are temporarily disabled while
                        patient reschedules auto-activate. */}
                    {!AUTO_ACTIVATE_PATIENT_RESCHEDULES && isDoctor && (
                      <div className="apt-approval-actions">
                        {selected.rescheduleRequest.status ===
                          "Pending Approval" && (
                          <>
                            <div className="apt-approval-buttons">
                              <button
                                className="apt-approve-btn"
                                onClick={(e) =>
                                  openApprovalPopup(selected.id, "approve", e)
                                }
                              >
                                <FaCheckCircle /> Approve
                              </button>
                              <button
                                className="apt-reject-btn"
                                onClick={(e) =>
                                  openApprovalPopup(selected.id, "reject", e)
                                }
                              >
                                <FaTimesCircle /> Reject
                              </button>
                            </div>
                          </>
                        )}

                        {selected.rescheduleRequest.status === "Approved" && (
                          <div className="apt-approved-info">
                            <FaCheckCircle />
                            <span>
                              Approved for{" "}
                              {selected.rescheduleRequest.approvedDate ||
                                selected.date}{" "}
                              •{" "}
                              {to12hLabel(
                                selected.rescheduleRequest.approvedTime ||
                                  selected.time,
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {selected.rescheduleRequest.status === "Not Approved" && (
                      <div className="apt-rejection-info">
                        <div className="apt-info-card muted">
                          <b>Doctor's feedback:</b>{" "}
                          {selected.rescheduleRequest.rejectionReason ||
                            "Not provided"}
                        </div>
                        <div className="apt-action-buttons">
                          {isPatient && (
                            <button
                              className="apt-action-btn reschedule"
                              onClick={() => handleRescheduleAgain(selected)}
                            >
                              <FaCalendarAlt /> Request Again
                            </button>
                          )}
                          <button
                            className="apt-action-btn complaint"
                            onClick={() => openComplaint(selected)}
                          >
                            <FaFlag /> File Complaint
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ========== Prescription Section ========== */}
              {isDoctor && getEffectiveStatus(selected) === "Active" && (
                <div className="apt-section apt-prescription-section">
                  <div className="apt-section-title">
                    <FaPrescription className="apt-sec-icon prescription" />
                    Prescription
                    {!prescriptionEditMode && (
                      <button
                        type="button"
                        className="apt-update-prescription-btn"
                        onClick={enablePrescriptionEdit}
                      >
                        <FaPlus /> Update Prescription
                      </button>
                    )}
                  </div>

                  <div className="apt-info-card">
                    {selected.prescription ? (
                      <div className="apt-prescription-display">
                        <p style={{ whiteSpace: "pre-line" }}>
                          {selected.prescription}
                        </p>
                        {selected.prescriptionUpdatedOn && (
                          <p className="apt-prescription-updated-meta">
                            Updated on: {selected.prescriptionUpdatedOn}
                          </p>
                        )}
                        {selected.prescriptionData?.date && (
                          <p className="apt-prescription-updated-meta">
                            Prescription Date: {selected.prescriptionData.date}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="apt-prescription-empty">
                        No prescription added yet. Click &quot;Update
                        Prescription&quot; to add.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ========== Read-Only Prescription ========== */}
              {selected.prescription &&
                getEffectiveStatus(selected) !== "Active" && (
                  <div className="apt-section">
                    <div className="apt-section-title">
                      <FaPrescription className="apt-sec-icon prescription" />
                      Prescription
                    </div>
                    <div className="apt-info-card">
                      <div className="apt-prescription-display">
                        <p style={{ whiteSpace: "pre-line" }}>
                          {selected.prescription}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              {/* ========== Active Appointment Actions ========== */}
              {isDoctor && getEffectiveStatus(selected) === "Active" && (
                <div className="apt-section apt-active-actions">
                  <div className="apt-section-title">
                    <FaStethoscope className="apt-sec-icon" /> Active
                    Appointment Actions
                  </div>
                  <div className="apt-exam-report-section">
                    <div className="apt-section-title">
                      <FaClipboardList className="apt-sec-icon exam-report" />{" "}
                      Examination Report (Mandatory)
                    </div>
                    <textarea
                      className="apt-exam-report-textarea"
                      rows={6}
                      placeholder="Enter examination findings, diagnosis and notes..."
                      value={reportText}
                      onChange={(e) => setReportText(e.target.value)}
                    />
                    <button
                      className="apt-action-btn save exam-report-save"
                      onClick={saveExaminationReport}
                      disabled={!reportText.trim()}
                    >
                      <FaSave /> Save Report
                    </button>
                    {isExamReportSaved(selected) && (
                      <div className="apt-exam-report-saved">
                        ✓ Report Saved
                      </div>
                    )}
                  </div>

                  <div className="apt-action-buttons active-btns">
                    <button
                      className="apt-action-btn save"
                      onClick={() => markAsCompleted(selected.id, false)}
                      disabled={!isExamReportSaved(selected)}
                    >
                      <FaCheckCircle /> Complete - No Revisit
                    </button>
                    <button
                      className="apt-action-btn reschedule"
                      onClick={() => markAsCompleted(selected.id, true)}
                      disabled={!isExamReportSaved(selected)}
                    >
                      <FaRedo /> Complete with Revisit
                    </button>
                  </div>
                </div>
              )}

              {/* ========== Patient Action Buttons ========== */}
              {isPatient && selected.status === "Ongoing" && (
                <div className="apt-action-buttons">
                  <button
                    className="apt-action-btn cancel"
                    onClick={(e) => openCancelPopup(selected, e)}
                  >
                    <FaTimesCircle /> Cancel Appointment
                  </button>
                  <button
                    className="apt-action-btn reschedule"
                    onClick={(e) => openReschedulePopup(selected, e)}
                  >
                    <FaCalendarAlt /> Reschedule Appointment
                  </button>
                </div>
              )}

              {/* ========== Patient Active Feedback & Complaint Buttons ========== */}
              {isPatient && getEffectiveStatus(selected) === "Active" && (
                <div className="apt-action-buttons">
                  <button
                    className="apt-action-btn feedback"
                    onClick={() => openFeedback(selected)}
                  >
                    <FaStar /> Give Feedback
                  </button>
                  <button
                    className="apt-action-btn complaint"
                    onClick={() => openComplaint(selected)}
                  >
                    <FaFlag /> File Complaint
                  </button>
                </div>
              )}

              {isPatient &&
                selected.status === "Rescheduled" &&
                selected.rescheduleRequest?.status === "Pending Approval" && (
                  <div className="apt-action-buttons">
                    <button
                      className="apt-action-btn reschedule"
                      onClick={(e) => openReschedulePopup(selected, e)}
                    >
                      <FaCalendarAlt /> Update Request
                    </button>
                  </div>
                )}

              {isDoctor &&
                getEffectiveStatus(selected) !== "Active" &&
                selected.status !== "Completed" &&
                selected.status !== "Cancelled" && (
                  <div className="apt-action-buttons">
                    {doctorEditMode ? (
                      <>
                        <button
                          className="apt-action-btn save"
                          onClick={saveDoctorEdit}
                          disabled={isGeocoding}
                        >
                          {isGeocoding ? (
                            <>
                              <FaSpinner className="apt-spinner" /> Saving...
                            </>
                          ) : (
                            <>
                              <FaSave /> Save Changes
                            </>
                          )}
                        </button>
                        <button
                          className="apt-action-btn cancel"
                          onClick={() => setDoctorEditMode(false)}
                          disabled={isGeocoding}
                        >
                          <FaUndo /> Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        className="apt-action-btn edit"
                        onClick={enableDoctorEdit}
                      >
                        <FaEdit /> Edit Appointment
                      </button>
                    )}
                  </div>
                )}

              {/* ========== Completed Complaint Button (within 2 hours) ========== */}
              {canFileComplaint(selected) && (
                <div className="apt-action-buttons">
                  <button
                    className="apt-action-btn complaint"
                    onClick={() => openComplaint(selected)}
                  >
                    <FaFlag /> File Complaint
                  </button>
                </div>
              )}
            </aside>
          )}
        </div>
      </div>

      {/* ============== Completion Animation ============== */}
      <CompletionAnimation
        show={showCompletion}
        onComplete={() => setShowCompletion(false)}
      />

      {/* ============== Cancel Popup ============== */}
      {cancelPopup && (
        <div className="apt-popup-overlay">
          <div className="apt-popup-box" ref={cancelRef}>
            <div className="apt-popup-header">
              <h3>Cancel Appointment</h3>
              <button
                className="apt-popup-close"
                onClick={() => setCancelPopup(false)}
              >
                <FaTimes />
              </button>
            </div>
            <div className="apt-popup-body">
              <p>Please tell us the reason for cancelling this appointment:</p>
              <textarea
                className="apt-reason-input"
                rows={4}
                placeholder="Enter your reason here..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
            <div className="apt-popup-footer">
              <button
                className="apt-popup-btn secondary"
                onClick={() => setCancelPopup(false)}
              >
                Close
              </button>
              <button
                className="apt-popup-btn primary"
                disabled={!cancelReason.trim()}
                onClick={submitCancel}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============== Reschedule Popup ============== */}
      {reschedulePopup && (
        <div className="apt-popup-overlay">
          <div className="apt-popup-box" ref={rescheduleRef}>
            <div className="apt-popup-header">
              <h3>Reschedule Appointment</h3>
              <button
                className="apt-popup-close"
                onClick={() => {
                  setReschedulePopup(false);
                  setShowDatePicker(false);
                  setShowTimePicker(false);
                }}
              >
                <FaTimes />
              </button>
            </div>
            <div className="apt-popup-body">
              <p>Suggest a new date and time for your appointment:</p>
              <AvailableSlotsDisplay />
              <div className="apt-reschedule-fields">
                <div className="apt-field-group">
                  <label>Date</label>
                  <div className="apt-picker-input-wrapper">
                    <input
                      type="text"
                      placeholder="Select Date"
                      value={
                        suggestedDate ? formatInputToDisplay(suggestedDate) : ""
                      }
                      readOnly
                      onClick={() => {
                        setShowDatePicker(!showDatePicker);
                        setShowTimePicker(false);
                      }}
                      className="apt-picker-input"
                    />
                    <FaCalendarAlt
                      className="apt-picker-icon"
                      onClick={() => {
                        setShowDatePicker(!showDatePicker);
                        setShowTimePicker(false);
                      }}
                    />
                    {showDatePicker && (
                      <DatePicker
                        selectedDate={suggestedDate}
                        onSelect={handleDateSelect}
                        onClose={() => setShowDatePicker(false)}
                        inputRef={datePickerRef}
                        minDate={new Date().toISOString().split("T")[0]}
                      />
                    )}
                  </div>
                </div>
                <div className="apt-field-group">
                  <label>Day</label>
                  <input
                    type="text"
                    placeholder="Day will auto-fill"
                    value={suggestedDay}
                    readOnly
                    className="apt-day-input"
                  />
                </div>
                <div className="apt-field-group">
                  <label>Time</label>
                  <div className="apt-picker-input-wrapper">
                    <input
                      type="text"
                      placeholder="Select Time"
                      value={to12hLabel(suggestedTime)}
                      readOnly
                      onClick={() => {
                        setShowTimePicker(!showTimePicker);
                        setShowDatePicker(false);
                      }}
                      className="apt-picker-input"
                    />
                    <FaClock
                      className="apt-picker-icon"
                      onClick={() => {
                        setShowTimePicker(!showTimePicker);
                        setShowDatePicker(false);
                      }}
                    />
                    {showTimePicker && (
                      <TimePicker
                        selectedTime={suggestedTime}
                        onSelect={handlePatientTimeSelect}
                        onClose={() => setShowTimePicker(false)}
                        inputRef={timePickerRef}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="apt-popup-footer">
              <button
                className="apt-popup-btn secondary"
                onClick={() => {
                  setReschedulePopup(false);
                  setShowDatePicker(false);
                  setShowTimePicker(false);
                }}
              >
                Close
              </button>
              <button
                className="apt-popup-btn primary"
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

      {/* ============== Doctor Approval Popup (temporarily disabled) ============== */}
      {!AUTO_ACTIVATE_PATIENT_RESCHEDULES && approvalPopup && (
        <div className="apt-popup-overlay">
          <div className="apt-popup-box" ref={approvalRef}>
            <div className="apt-popup-header">
              <h3>
                {approvalAction === "approve"
                  ? "Approve Reschedule Request"
                  : "Reject Reschedule Request"}
              </h3>
              <button
                className="apt-popup-close"
                onClick={() => {
                  setApprovalPopup(false);
                  setDoctorShowDatePicker(false);
                  setDoctorShowTimePicker(false);
                }}
              >
                <FaTimes />
              </button>
            </div>
            <div className="apt-popup-body">
              {approvalAction === "approve" ? (
                <>
                  <p>
                    Select or enter a date and time for the rescheduled
                    appointment:
                  </p>
                  <AvailableSlotsDisplay />
                  <div className="apt-reschedule-fields">
                    <div className="apt-field-group">
                      <label>New Date</label>
                      <div className="apt-picker-input-wrapper">
                        <input
                          type="text"
                          placeholder="Select or enter Date (YYYY-MM-DD)"
                          value={doctorSelectedDate}
                          onChange={handleDoctorDateManualChange}
                          onClick={() => {
                            setDoctorShowDatePicker(!doctorShowDatePicker);
                            setDoctorShowTimePicker(false);
                          }}
                          className="apt-picker-input"
                        />
                        <FaCalendarAlt
                          className="apt-picker-icon"
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
                            inputRef={doctorDatePickerRef}
                            minDate={new Date().toISOString().split("T")[0]}
                          />
                        )}
                      </div>
                      <small className="apt-helper-text">
                        Format: YYYY-MM-DD (e.g., 2026-06-25)
                      </small>
                    </div>
                    <div className="apt-field-group">
                      <label>Day</label>
                      <input
                        type="text"
                        placeholder="Day will auto-fill"
                        value={doctorSelectedDay}
                        readOnly
                        className="apt-day-input"
                      />
                    </div>
                    <div className="apt-field-group">
                      <label>New Time</label>
                      <div className="apt-picker-input-wrapper">
                        <input
                          type="text"
                          placeholder="Select or enter Time (e.g., 14:30)"
                          value={doctorSelectedTime}
                          onChange={handleDoctorTimeManualChange}
                          onClick={() => {
                            setDoctorShowTimePicker(!doctorShowTimePicker);
                            setDoctorShowDatePicker(false);
                          }}
                          className="apt-picker-input"
                        />
                        <FaClock
                          className="apt-picker-icon"
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
                            inputRef={doctorTimePickerRef}
                          />
                        )}
                      </div>
                      <small className="apt-helper-text">
                        Format: HH:MM (e.g., 14:30 for 2:30 PM)
                      </small>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p>Please provide a reason for rejecting this request:</p>
                  <textarea
                    className="apt-reason-input"
                    rows={4}
                    placeholder="Enter your reason here..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                </>
              )}
            </div>
            <div className="apt-popup-footer">
              <button
                className="apt-popup-btn secondary"
                onClick={() => {
                  setApprovalPopup(false);
                  setDoctorShowDatePicker(false);
                  setDoctorShowTimePicker(false);
                }}
              >
                Cancel
              </button>
              <button
                className="apt-popup-btn primary"
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
        <div className="apt-popup-overlay">
          <div className="apt-popup-box" ref={revisitRef}>
            <div className="apt-popup-header">
              <h3>Complete with Revisit</h3>
              <button
                className="apt-popup-close"
                onClick={() => setRevisitPopup(false)}
              >
                <FaTimes />
              </button>
            </div>
            <div className="apt-popup-body">
              <p>Please provide reason for revisit:</p>
              <textarea
                className="apt-reason-input"
                rows={4}
                placeholder="Why does the patient need a revisit?"
                value={revisitReason}
                onChange={(e) => setRevisitReason(e.target.value)}
              />
            </div>
            <div className="apt-popup-footer">
              <button
                className="apt-popup-btn secondary"
                onClick={() => setRevisitPopup(false)}
              >
                Cancel
              </button>
              <button
                className="apt-popup-btn primary"
                disabled={!revisitReason.trim()}
                onClick={submitRevisit}
              >
                Submit & Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== E-Prescription Update Modal (Doctor) ========== */}
      {isDoctor && prescriptionEditMode && prescriptionData && (
        <div
          className="apt-epres-overlay"
          onClick={cancelPrescriptionEdit}
          role="presentation"
        >
          <div
            className={`apt-epres-modal ${darkMode ? "dark" : "light"}`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Update prescription"
          >
            <header className="apt-epres-modal-header">
              <div>
                <h3>Update E-Prescription</h3>
                <p>
                  {selected?.patientName} • Medicines, vitals & diagnosis
                </p>
              </div>
              <button
                type="button"
                className="apt-epres-modal-close"
                onClick={cancelPrescriptionEdit}
                aria-label="Close prescription editor"
              >
                <FaTimes />
              </button>
            </header>
            <div className="apt-epres-modal-body">
              <EPrescriptionEditor
                data={prescriptionData}
                onChange={setPrescriptionData}
              />
            </div>
            <footer className="apt-epres-modal-footer">
              <button
                type="button"
                className="apt-prescription-cancel-btn"
                onClick={cancelPrescriptionEdit}
              >
                <FaTimes /> Cancel
              </button>
              <button
                type="button"
                className="apt-prescription-save-btn"
                onClick={savePrescription}
              >
                <FaSave /> Update
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* ========== Complaint Modal ========== */}
      {complaintTarget && (
        <ComplaintModal
          against={{
            name: isPatient
              ? complaintTarget.doctorName
              : complaintTarget.patientName,
            role: isPatient ? "Doctor" : "Patient",
          }}
          contextLabel={`Appointment ${complaintTarget.id}`}
          onClose={() => setComplaintTarget(null)}
          onSubmit={handleComplaintSubmit}
          appointmentId={complaintTarget?.backendId}
        />
      )}

      {complaintToast && (
        <div className="apt-complaint-toast">
          <FaCheckCircle /> Complaint submitted successfully
        </div>
      )}

      {/* ========== Feedback Modal ========== */}
      {feedbackTarget && (
        <FeedbackModal
          against={{
            name: feedbackTarget.doctorName,
            role: "Doctor",
          }}
          contextLabel={`Appointment ${feedbackTarget.id}`}
          onClose={() => setFeedbackTarget(null)}
          onSubmit={handleFeedbackSubmit}
          consultationId={feedbackTarget?.consultationId || null}
        />
      )}

      {feedbackToast && (
        <div className="apt-feedback-toast">
          <FaCheckCircle /> Feedback submitted successfully
        </div>
      )}
    </div>
  );
};

export default Appointments;
