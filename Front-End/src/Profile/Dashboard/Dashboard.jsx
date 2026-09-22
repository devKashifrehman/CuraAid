import React, { useState, useEffect, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../../HeadFoot/Auth/AuthContext";
import {
  FaCalendarCheck,
  FaVideo,
  FaComments,
  FaPhone,
  FaFileMedical,
  FaUserMd,
  FaClock, 
  FaCheckCircle,
  FaStar,
  FaChevronRight,
  FaStethoscope,
  FaPills,
  FaFileAlt,
  FaHeartbeat,
  FaChartLine,
  FaUsers,
  FaCalendarAlt,
  FaPhoneAlt,
  FaExclamationTriangle,
  FaRunning,
  FaAppleAlt,
  FaUser,
  FaFilePdf,
  FaFileWord,
  FaFileImage,
  FaClipboardList,
  FaFolderOpen,
  FaUpload,
} from "react-icons/fa";
import { ThemeContext } from "../../Theme/ThemeContext";
import doctorAhmedAvatar from "../../images/11.png"; 
import doctorSanaAvatar from "../../images/5.jpeg";
import doctorUsmanAvatar from "../../images/3.jpg";
import doctorNadiaAvatar from "../../images/9.jpg";
import patientAliAvatar from "../../images/12.png";
import patientHassanAvatar from "../../images/8.jpg";
import "./Dashboard.css";
import EPrescriptionModal from "../EPrescription/EPrescriptionModal";
import Sidebar from "../Hamburger/sidebar";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

const DASHBOARD_API = `${API_BASE_URL}/api/dashboard`;
const ADMIN_DASHBOARD_API = `${API_BASE_URL}/api/admin/dashboard`;
const DOCTOR_REUPLOAD_API = `${API_BASE_URL}/api/doctor/reupload-document`;
const ADMIN_DOCTORS_API = `${API_BASE_URL}/api/admin/doctors`;

const API_AVATARS = [
  doctorAhmedAvatar,
  doctorSanaAvatar,
  doctorUsmanAvatar,
  doctorNadiaAvatar,
  patientAliAvatar,
  patientHassanAvatar,
];
const avatarAt = (idx) => API_AVATARS[(idx || 0) % API_AVATARS.length];

// =====================================================
// BUILD DYNAMIC DONUT RING FROM LIVE DISTRIBUTION %
// =====================================================
const DIST_COLORS = {
  video: "#38bdf8",
  voice: "#32cd32",
  chat: "#8b5cf6",
  other: "#f59e0b",
};

const buildDonutGradient = (items) => {
  if (!items || !items.length) return { background: "#e5e7eb" };
  let acc = 0;
  let hasValue = false;
  const stops = [];
  items.forEach((it) => {
    const deg = (toNum(it?.percent) / 100) * 360;
    if (deg > 0.1) hasValue = true;
    stops.push(
      `${DIST_COLORS[it?.key] ?? "#f59e0b"} ${acc.toFixed(1)}deg ${(acc + deg).toFixed(1)}deg`,
    );
    acc += deg;
  });
  if (!hasValue) return { background: "#e5e7eb" };
  const last = items[items.length - 1];
  const lastDeg = (toNum(last?.percent) / 100) * 360;
  const lastStart = Math.max(0, acc - lastDeg);
  stops[stops.length - 1] =
    `${DIST_COLORS[last?.key] ?? "#f59e0b"} ${lastStart.toFixed(1)}deg 360deg`;
  return { background: `conic-gradient(${stops.join(", ")})` };
};

// =====================================================
// NORMALIZE BACKEND CONSULTATION -> UI CARD
// =====================================================
const mapConsultation = (c, idx) => {
  const ctype = (c?.consultation_type ?? c?.type ?? "chat")
    .toString()
    .toLowerCase();
  const symptomsArr = c?.symptoms;
  const symptoms = Array.isArray(symptomsArr)
    ? symptomsArr.join(", ")
    : symptomsArr || "";
  const diagnosisArr = c?.diagnosis;
  const diagnosis = Array.isArray(diagnosisArr)
    ? diagnosisArr.join(", ")
    : diagnosisArr || "";
  const medicines = c?.prescription?.medicines ?? [];
  const prescription =
    medicines.map((m) => m?.name).filter(Boolean).join(", ") || "—";
  const start = c?.started_at ? new Date(c.started_at) : null;
  const end = c?.ended_at ? new Date(c.ended_at) : null;
  const duration =
    start && end ? `${Math.max(1, Math.round((end - start) / 60000))} min` : "";
  const time =
    c?.appointment?.appointment_time ||
    (c?.created_at
      ? new Date(c.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "") ||
    c?.time ||
    "";
  const date = c?.appointment?.appointment_date
    ? new Date(c.appointment.appointment_date + "T00:00:00").toLocaleDateString()
    : c?.created_at
      ? new Date(c.created_at).toLocaleDateString()
      : c?.date || "";

  return {
    id: c?.id ?? idx,
    doctorName:
      c?.doctor?.user?.name ?? c?.doctorName ?? c?.doctor_name ?? "Doctor",
    patientName: c?.patient?.name ?? c?.patientName ?? "Patient",
    specialty:
      c?.doctor?.specialties?.[0] ?? c?.specialty ?? "General Physician",
    type: ctype,
    status: c?.status === "completed" ? "Completed" : "In Progress",
    time,
    date,
    symptoms,
    lastMessage: c?.last_message ?? c?.lastMessage ?? "",
    diagnosis,
    prescription,
    rating: c?.rating ?? 0,
    duration,
    avatar: avatarAt(idx),
  };
};

// =====================================================
// MAP BACKEND DOCTOR DASHBOARD -> UI DATA
// =====================================================
const mapDoctorDashboard = (data) => {
  const d = data?.data ?? data ?? {};

  const profileStatus = d?.profileStatus ?? "pending";
  const rejectionReason = d?.rejectionReason ?? null;
  const isVerified = d?.isVerified ?? false;

  const stats = {
    todayConsultations: toNum(d?.todayConsultations),
    upcomingAppointments: toNum(d?.upcomingAppointments),
    totalPatients: toNum(d?.totalPatients),
    totalConsultations: toNum(d?.totalConsultations),
    averageRating: toNum(d?.averageRating),
    consultationGrowth: `+${toNum(d?.consultationsThisMonth)} this month`,
    appointmentGrowth: `+${toNum(d?.upcomingAppointments)} scheduled`,
    patientGrowth: `+${toNum(d?.newPatientsThisMonth)} this month`,
    totalGrowth: `+${toNum(d?.totalConsultations)} total`,
    ratingGrowth: `+${toNum(d?.totalReviews)} reviews`,
  };

  const todaySchedule = (
    Array.isArray(d?.todaySchedule) ? d.todaySchedule : []
  ).map((s, i) => ({
    time: s?.time ?? "",
    name: s?.name ?? "Patient",
    type:
      (s?.type ?? "Consultation")
        .toString()
        .replace(/([A-Z])/g, " $1")
        .trim() || "Consultation",
    status: s?.status ?? "Upcoming",
    avatar: s?.avatar || avatarAt(i),
  }));

  const recentPatients = (
    Array.isArray(d?.recentPatients) ? d.recentPatients : []
  ).map((p, i) => ({
    name: p?.name ?? "Patient",
    issue: p?.issue ?? "",
    time: p?.time ?? "",
    avatar: p?.avatar || avatarAt(i),
  }));

  const recentPrescriptions = (
    Array.isArray(d?.recentPrescriptions) ? d.recentPrescriptions : []
  ).map((p, i) => ({
    name: p?.name ?? "Patient",
    medicine: p?.medicine ?? "—",
    time: p?.time ?? "",
  }));

  const ongoing = (
    Array.isArray(d?.ongoingConsultations) ? d.ongoingConsultations : []
  ).map(mapConsultation);
  const completed = (
    Array.isArray(d?.completedConsultations) ? d.completedConsultations : []
  ).map(mapConsultation);

  const weekly = d?.analytics?.weekly ?? [];
  const chart =
    weekly.length > 0
      ? {
          labels: weekly.map((w) => w?.label ?? ""),
          consultations: weekly.map((w) => toNum(w?.consultations)),
          appointments: weekly.map((w) => toNum(w?.appointments)),
        }
      : null;

  const dist = d?.consultationTypeDistribution;
  const distribution =
    dist?.items?.length > 0
      ? {
          total: toNum(dist?.total),
          items: dist.items.map((it) => ({
            key: it?.key ?? "other",
            label: it?.label ?? "Consultation",
            count: toNum(it?.count),
            percent: toNum(it?.percent),
          })),
        }
      : null;

  return {
    profileStatus,
    rejectionReason,
    isVerified,
    objectedDocument: d?.objectedDocument ?? d?.objected_document ?? "",
    reuploadStatus: d?.reuploadStatus ?? d?.reupload_status ?? "",
    reuploadMessage: d?.reuploadMessage ?? d?.reupload_message ?? "",
    reuploadImage: d?.reuploadImage ?? d?.reupload_image ?? null,
    stats,
    todaySchedule,
    recentPatients,
    recentPrescriptions,
    ongoing,
    completed,
    chart,
    distribution,
  };
};

// =====================================================
// MAP BACKEND PATIENT DASHBOARD -> UI DATA
// =====================================================
const mapPatientDashboard = (data) => {
  const d = data?.data ?? data ?? {};

  const stats = {
    upcomingAppointments: toNum(d?.upcomingAppointments),
    activePrescriptions: toNum(d?.activePrescriptions),
    totalReports: toNum(d?.totalReports),
    completedConsultations: toNum(d?.completedConsultations),
    activeMedicineCount: toNum(d?.activeMedicineCount),
    healthScore: 85,
  };

  const ongoing = (
    Array.isArray(d?.ongoingConsultations) ? d.ongoingConsultations : []
  ).map(mapConsultation);
  const completed = (
    Array.isArray(d?.completedConsultationsList)
      ? d.completedConsultationsList
      : []
  ).map(mapConsultation);

  return {
    stats,
    ongoing,
    completed,
    nextAppointment: d?.nextAppointment
      ? {
          doctorName: d.nextAppointment?.doctorName ?? "Doctor",
          specialty:
            d.nextAppointment?.specialty ?? "General Physician",
          when: d.nextAppointment?.when ?? "Scheduled",
          status: d.nextAppointment?.status ?? "Upcoming",
          type: d.nextAppointment?.type ?? "chat",
        }
      : null,
    latestPrescription: d?.latestPrescription ? { ...d.latestPrescription } : null,
  };
};

// =====================================================
// NORMALIZE DOCTOR DOCUMENTATION -> ADMIN DASHBOARD ROW
// =====================================================
const mapDoctorDocumentation = (data) => {
  let list = Array.isArray(data)
    ? data
    : Array.isArray(data?.data?.data)
      ? data.data.data
      : data?.data ?? data?.doctors ?? data?.profiles ?? data?.results ?? data?.submissions ?? [];
  if (!Array.isArray(list)) list = [];
  return list.map((profile, idx) => {
    const statusRaw = (profile.status ?? profile.verification_status ?? "pending")
      .toString()
      .toLowerCase();
    const status =
      statusRaw === "approved" || statusRaw === "verified"
        ? "Approved"
        : statusRaw === "objected" || statusRaw === "rejected"
        ? "Rejected"
        : "Pending";
    const docName =
      profile?.license_image ??
      profile?.licenseImage ??
      profile?.pmdc_license ??
      profile?.qualifications?.[0]?.document ??
      profile?.qualifications?.[0]?.image ??
      "";
    return {
      id:
        profile?.id ??
        profile?.profile_id ??
        profile?.doc_id ??
        `DOC-${idx + 1}`,
      name:
        profile?.name ??
        profile?.user?.name ??
        profile?.full_name ??
        profile?.FullName ??
        profile?.doctor_name ??
        "Dr. N/A",
      document:
        (docName ? String(docName).split("/").pop() : "") ||
        (profile?.qualifications?.length
          ? `${profile.qualifications.length} Qualification(s)`
          : "Documents.pdf"),
      type:
        profile?.document_type ??
        profile?.type ??
        (profile?.license_image ? "License" : "Degree"),
      uploaded:
        profile?.uploaded_at ??
        profile?.submitted_at ??
        profile?.user?.created_at ??
        profile?.created_at ??
        profile?.date ??
        "-",
      status,
      profile_image:
        profile?.user?.profile_image ??
        profile?.profile_image ??
        null,
    };
  });
};

// =====================================================
// NORMALIZE BACKEND ADMIN DASHBOARD -> UI DATA
// =====================================================
const pick = (obj, keys) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
};

const toNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const mapAdminDashboard = (data) => {
  const payload = data?.data ?? data;
  const stats = payload?.stats ?? payload?.summary ?? payload?.counts ?? payload;

  const totalDoctors = toNum(
    pick(stats, [
      "total_doctors",
      "totalDoctors",
      "doctors",
      "totalDoctorsCount",
    ]),
  );
  const newDoctors = toNum(
    pick(stats, ["new_doctors", "newDoctors", "doctorsThisMonth"]),
  );
  const totalPatients = toNum(
    pick(stats, [
      "total_patients",
      "totalPatients",
      "patients",
      "totalPatientsCount",
    ]),
  );
  const newPatients = toNum(
    pick(stats, ["new_patients", "newPatients", "patientsThisMonth"]),
  );
  const pendingDocuments = toNum(
    pick(stats, [
      "pending_documents",
      "pendingDocuments",
      "pendingDocs",
      "pending",
    ]),
  );
  const activeReports = toNum(
    pick(stats, ["active_reports", "activeReports", "reports", "active"]),
  );

  const rawDocs =
    payload?.doctor_documents ??
    payload?.doctorDocuments ??
    payload?.documents ??
    payload?.recent_documents ??
    payload?.recentDocuments ??
    [];
  const doctorDocuments = (Array.isArray(rawDocs) ? rawDocs : []).map(
    (d, i) => ({
      id:
        d?.id ??
        d?.doc_id ??
        d?.profile_id ??
        d?.submission_id ??
        `DOC-${i + 1}`,
      name:
        d?.doctor_name ??
        d?.doctorName ??
        d?.name ??
        d?.full_name ??
        "Dr. N/A",
      document:
        d?.document ??
        d?.document_name ??
        d?.doc_name ??
        d?.file_name ??
        "Document.pdf",
      type:
        d?.type ??
        d?.document_type ??
        d?.doc_type ??
        (d?.license_image ? "License" : "Degree"),
      uploaded: d?.uploaded ?? d?.uploaded_at ?? d?.date ?? d?.created_at ?? "-",
      status: d?.status ?? d?.verification_status ?? "Pending",
    }),
  );

  const reviewStats =
    payload?.feedback ?? payload?.reviews ?? payload?.ratings ?? {};
  const overallRating =
    payload?.overall_rating ??
    payload?.overallRating ??
    reviewStats?.average ??
    reviewStats?.averageRating ??
    0;
  const totalReviews =
    payload?.total_reviews ??
    payload?.totalReviews ??
    reviewStats?.total ??
    reviewStats?.count ??
    0;
  const rawDistribution =
    reviewStats?.distribution ??
    payload?.rating_distribution ??
    payload?.ratingDistribution ??
    [];
  const distribution = (Array.isArray(rawDistribution) ? rawDistribution : [])
    .map((item) => {
      if (typeof item === "object" && item !== null) {
        return {
          stars: toNum(item?.stars ?? item?.star ?? item?.rating, 0),
          percentage: toNum(
            item?.percentage ?? item?.percent ?? item?.count,
            0,
          ),
        };
      }
      return { stars: toNum(item), percentage: 0 };
    })
    .filter((item) => item.stars >= 1 && item.stars <= 5)
    .map((item) => ({ ...item, percentage: item.percentage || 0 }));

  const rawReports =
    payload?.recent_reports ??
    payload?.recentReports ??
    payload?.reports ??
    [];
  const recentReports = (Array.isArray(rawReports) ? rawReports : []).map(
    (r, i) => ({
      id:
        r?.id ??
        r?.report_id ??
        (r?.id_number ? `#${r.id_number}` : `#RPT-${String(i + 1).padStart(4, "0")}`),
      against: r?.against ?? r?.doctor ?? r?.doctor_name ?? r?.reported_against ?? "N/A",
      reason: r?.reason ?? r?.issue ?? r?.complaint ?? r?.title ?? "N/A",
      status: r?.status ?? r?.report_status ?? "Pending",
    }),
  );

  return {
    hasData:
      totalDoctors > 0 ||
      totalPatients > 0 ||
      doctorDocuments.length > 0 ||
      recentReports.length > 0 ||
      totalReviews > 0,
    adminStats: {
      totalDoctors,
      newDoctors,
      totalPatients,
      newPatients,
      pendingDocuments,
      activeReports,
    },
    doctorDocuments,
    feedbackOverview: {
      overallRating: Number(overallRating) || 0,
      totalReviews: toNum(totalReviews),
      contactFeedbacks: toNum(payload?.feedbackOverview?.contactFeedbacks ?? payload?.contactFeedbacks),
      recentContactFeedbacks: Array.isArray(payload?.feedbackOverview?.recentContactFeedbacks ?? payload?.recentContactFeedbacks)
        ? (payload?.feedbackOverview?.recentContactFeedbacks ?? payload?.recentContactFeedbacks)
        : [],
      distribution:
        distribution.length > 0
          ? distribution
          : [
              { stars: 5, percentage: 0 },
              { stars: 4, percentage: 0 },
              { stars: 3, percentage: 0 },
              { stars: 2, percentage: 0 },
              { stars: 1, percentage: 0 },
            ],
    },
    recentReports,
  };
};

export default function Dashboard() {
  const { user, token, isDoctor, isPatient, isAdmin } = useContext(AuthContext);
  const { darkMode } = useContext(ThemeContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("ongoing");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [patientQuickInput, setPatientQuickInput] = useState("");

  // Dashboard modals (Patient quick access)
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);

  // ================= Admin Dashboard API state ======================
  const adminCachedRef = useRef(false);
  const [adminOverview, setAdminOverview] = useState(() => {
    try {
      const c = localStorage.getItem("dashboard_admin_overview");
      if (c) { adminCachedRef.current = true; return JSON.parse(c); }
      return null;
    } catch { return null; }
  });
  const [adminDashboardLoading, setAdminDashboardLoading] = useState(false);
  const docsCachedRef = useRef(false);
  const [doctorSubmissionDocs, setDoctorSubmissionDocs] = useState(() => {
    try {
      const c = localStorage.getItem("dashboard_doctor_docs");
      if (c) { docsCachedRef.current = true; return JSON.parse(c); }
      return [];
    } catch { return []; }
  });

  // ================= Role-wise (Doctor/Patient) Dashboard API state ======================
  const roleCachedRef = useRef(false);
  const [dashboardData, setDashboardData] = useState(() => {
    try {
      const c = localStorage.getItem("dashboard_role_data");
      if (c) { roleCachedRef.current = true; return JSON.parse(c); }
      return null;
    } catch { return null; }
  });
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const profileFetchedRef = useRef(false);
  const [reuploading, setReuploading] = useState(false);
  const [reuploadProgress, setReuploadProgress] = useState(0);
  const [reuploadSuccess, setReuploadSuccess] = useState("");
  const [reuploadError, setReuploadError] = useState("");
  const reuploadInputRef = useRef(null);
  const pollDelayRef = useRef(null);

  const handleReupload = async (docType, file) => {
    if (!file || !docType) {
      setReuploadError("No document type specified.");
      return;
    }
    setReuploading(true);
    setReuploadProgress(0);
    setReuploadSuccess("");
    setReuploadError("");
    try {
      const formData = new FormData();
      formData.append("document_type", docType);
      formData.append("document_file", file);
      const res = await axios.post(DOCTOR_REUPLOAD_API, formData, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "multipart/form-data",
        },
        timeout: 60000,
        onUploadProgress: (e) => {
          if (e.total) {
            const pct = Math.round((e.loaded * 100) / e.total);
            setReuploadProgress(pct);
          }
        },
      });
      const msg = res.data?.reupload_message || "Document re-uploaded successfully.";
      setReuploadSuccess(msg);
      setReuploadProgress(100);
      const newData = {
        success: true,
        data: {
          profileStatus: "pending",
          rejectionReason: null,
          objectedDocument: "",
          reuploadStatus: "reuploaded",
          reuploadMessage: msg,
          reuploadImage: res.data?.reupload_image || null,
        },
      };
      setDashboardData(newData);
      localStorage.setItem("dashboard_role_data", JSON.stringify(newData));
      // Delay next poll so doctor sees success message without flicker
      pollDelayRef.current = 6000;
    } catch (err) {
      const errMsg = err?.response?.data?.message || err?.message || "Upload failed.";
      console.error("Re-upload error:", errMsg, err?.response?.status);
      setReuploadError(errMsg);
    } finally {
      setReuploading(false);
    }
  };

  const triggerReupload = (docType) => {
    const input = reuploadInputRef.current;
    if (!input) return;
    input.value = "";
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (file) {
        handleReupload(docType, file);
      }
    };
    input.click();
  };

  // =============== Health tips for patient =============
  const healthTips = [
    {
      icon: <FaHeartbeat />,
      text: "Drink at least 8 glasses of water daily.",
      colorClass: "tip-blue",
    },
    {
      icon: <FaRunning />,
      text: "Regular exercise improves your heart health.",
      colorClass: "tip-green",
    },
    {
      icon: <FaAppleAlt />,
      text: "Avoid fast food and eat home-cooked meals.",
      colorClass: "tip-yellow",
    },
    {
      icon: <FaPills />,
      text: "Take your medicines on time.",
      colorClass: "tip-red",
    },
  ];

  // =====================================================
  // DERIVE LIVE ROLE DATA FROM /api/dashboard (doctor/patient)
  // =====================================================
  const liveDashboard = dashboardData
    ? isDoctor
      ? mapDoctorDashboard(dashboardData)
      : isPatient
        ? mapPatientDashboard(dashboardData)
        : null
    : null;

  const emptyStats = isDoctor
    ? {
        todayConsultations: 0,
        upcomingAppointments: 0,
        totalPatients: 0,
        totalConsultations: 0,
        averageRating: 0,
        consultationGrowth: "+0 this month",
        appointmentGrowth: "+0 scheduled",
        patientGrowth: "+0 this month",
        totalGrowth: "+0 total",
        ratingGrowth: "+0 reviews",
      }
    : isPatient
      ? {
          upcomingAppointments: 0,
          activePrescriptions: 0,
          totalReports: 0,
          completedConsultations: 0,
          activeMedicineCount: 0,
          healthScore: 0,
        }
      : {};

  const stats = liveDashboard?.stats ?? emptyStats;
  const todaySchedule = liveDashboard?.todaySchedule ?? [];
  const recentPatients = liveDashboard?.recentPatients ?? [];
  const recentPrescriptions = liveDashboard?.recentPrescriptions ?? [];
  const ongoingConsultations = liveDashboard?.ongoing ?? [];
  const completedConsultations = liveDashboard?.completed ?? [];
  const patientNextAppointment = liveDashboard?.nextAppointment ?? null;
  const patientLatestPrescription = liveDashboard?.latestPrescription ?? null;
  const doctorChart = liveDashboard?.chart ?? null;
  const doctorDistribution = liveDashboard?.distribution ?? null;

  useEffect(() => {
    document.body.className = darkMode ? "dark" : "light";
  }, [darkMode]);

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
    }
    // Clear cached stats when month changes so "this month" resets to 0
    const currentMonth = new Date().getMonth();
    const cachedMonth = localStorage.getItem("dashboard_month");
    if (cachedMonth !== String(currentMonth)) {
      localStorage.removeItem("dashboard_admin_overview");
      localStorage.removeItem("dashboard_role_data");
      localStorage.setItem("dashboard_month", String(currentMonth));
    }
  }, [user, navigate]);

  // =====================================================
  // FETCH ADMIN DASHBOARD DATA FROM BACKEND (with polling)
  // =====================================================
  useEffect(() => {
    if (!isAdmin || !user) return;
    let cancelled = false;
    let pollTimer = null;
    let inFlight = null;

    const fetchAdminDashboard = async () => {
      if (cancelled) return;
      if (inFlight) inFlight.abort();
      const controller = new AbortController();
      inFlight = controller;
      try {
        const response = await axios.get(ADMIN_DASHBOARD_API, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            Accept: "application/json",
          },
          timeout: 30000,
          signal: controller.signal,
        });
        if (cancelled) return;
        const mapped = mapAdminDashboard(response.data);
        setAdminOverview(mapped);
        localStorage.setItem("dashboard_admin_overview", JSON.stringify(mapped));
      } catch (error) {
        if (cancelled || error?.name === "CanceledError" || error?.code === "ERR_CANCELED") return;
        console.error(
          "Failed to fetch admin dashboard from API:",
          error?.response?.data || error?.message,
        );
      } finally {
        if (!cancelled) {
          setAdminDashboardLoading(false);
          pollTimer = setTimeout(fetchAdminDashboard, 10000);
        }
      }
    };

    setAdminDashboardLoading(!adminCachedRef.current);
    fetchAdminDashboard();
    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
      if (inFlight) inFlight.abort();
    };
  }, [isAdmin, user, token]);

  // =====================================================
  // FETCH DOCTOR DOCUMENTATION SUBMISSIONS FOR STATS
  // =====================================================
  useEffect(() => {
    if (!isAdmin || !user) return;
    let cancelled = false;
    const fetchDoctorDocs = async () => {
      try {
        const response = await axios.get(ADMIN_DOCTORS_API, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            Accept: "application/json",
          },
          timeout: 30000,
        });
        if (cancelled) return;
        const mapped = mapDoctorDocumentation(response.data);
        setDoctorSubmissionDocs(mapped);
        localStorage.setItem("dashboard_doctor_docs", JSON.stringify(mapped));
      } catch (error) {
        console.error(
          "Failed to fetch doctor documentation from API:",
          error?.response?.data || error?.message,
        );
      }
    };
    fetchDoctorDocs();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, user, token]);

  // =====================================================
  // FETCH ROLE-WISE DASHBOARD DATA (doctor/patient) FROM BACKEND
  // =====================================================
  useEffect(() => {
    if (isAdmin || !user) return;
    let cancelled = false;
    let pollTimer = null;
    let inFlight = null;

    const fetchRoleDashboard = async () => {
      if (cancelled) return;
      // Cancel previous in-flight request
      if (inFlight) inFlight.abort();
      const controller = new AbortController();
      inFlight = controller;
      try {
        const response = await axios.get(DASHBOARD_API, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            Accept: "application/json",
          },
          timeout: 10000,
          signal: controller.signal,
        });
        if (cancelled) return;
        setDashboardData(response.data);
        localStorage.setItem("dashboard_role_data", JSON.stringify(response.data));
        profileFetchedRef.current = true;
      } catch (err) {
        if (err?.code !== "ERR_CANCELED" && !cancelled) {
          console.error("Dashboard fetch error:", err?.response?.data || err?.message);
        }
      } finally {
        if (!cancelled) setDashboardLoading(false);
        // Schedule next poll, respect pollDelayRef after reupload
        if (!cancelled) {
          const delay = pollDelayRef.current || 3000;
          pollDelayRef.current = null;
          pollTimer = setTimeout(fetchRoleDashboard, delay);
        }
      }
    };

    setDashboardLoading(!roleCachedRef.current);
    fetchRoleDashboard();

    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
      if (inFlight) inFlight.abort();
    };
  }, [isAdmin, user, token]);

  const getConsultationIcon = (type) => {
    switch (type) {
      case "video":
        return <FaVideo />;
      case "voice":
        return <FaPhone />;
      case "chat":
        return <FaComments />;
      default:
        return <FaStethoscope />;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "Completed":
        return "status-completed";
      case "In Progress":
        return "status-progress";
      case "Waiting":
        return "status-waiting";
      case "Upcoming":
        return "status-upcoming";
      case "Pending":
        return "status-pending";
      case "Approved":
        return "status-approved";
      case "Rejected":
        return "status-rejected";
      case "Under Review":
        return "status-review";
      case "Investigating":
        return "status-investigating";
      case "Dismissed":
        return "status-dismissed";
      default:
        return "status-default";
    }
  };

  const getStatusBadge = (status) => {
    return (
      <span className={`status-badge ${getStatusClass(status)}`}>
        {status === "Completed" && <FaCheckCircle />}
        {status === "In Progress" && <FaClock />}
        {status}
      </span>
    );
  };

  const getDocumentIcon = (docName) => {
    if (docName.endsWith(".pdf")) return <FaFilePdf />;
    if (docName.endsWith(".doc") || docName.endsWith(".docx"))
      return <FaFileWord />;
    if (docName.endsWith(".jpg") || docName.endsWith(".png"))
      return <FaFileImage />;
    return <FaFileAlt />;
  };

  const goToConsultations = (tab) => {
    navigateAndScrollTop(`/consultation?tab=${tab}`);
  };

  const handleDashboardRedirect = (message, intent = "custom") => {
    navigate("/ai-health-guide", {
      state: { userMessage: message, source: "dashboard", intent },
    });
  };

  const navigateAndScrollTop = (path) => {
    navigate(path);
    setTimeout(() => {
      try {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      } catch (e) {}
    }, 60);
  };

  const handlePatientQuickSubmit = () => {
    const message = patientQuickInput.trim();
    if (!message) return;
    handleDashboardRedirect(message, "custom");
    setPatientQuickInput("");
  };

  if (!user) {
    return <div className="loading-screen">Loading your dashboard...</div>;
  }

  const displayName =
    user?.FullName || (user?.Email ? user.Email.split("@")[0] : "User");
  const greeting = isDoctor
    ? `Good Morning, DR. ${displayName}`
    : isAdmin
      ? `Welcome Admin, ${displayName}`
      : isPatient
        ? `Hello, ${displayName}`
        : `Welcome Back, ${displayName}`;
  const subGreeting = isDoctor
    ? "Here's what's happening in your clinic today."
    : isAdmin
      ? "Here's your clinic overview and management."
      : isPatient
        ? "Your health is our priority. How can we help you today?"
        : "Welcome to CuraAid.";

  // =========================================================
  // DERIVE LIVE ADMIN DATA (no mock data)
  // Stats/Recent docs come from doctor documentation,
  // patients/reports/feedback come from admin dashboard API
  // =========================================================
  const pendingDocs = doctorSubmissionDocs.filter(
    (d) => d.status === "Pending",
  ).length;
  const totalDoctorSubmissions = doctorSubmissionDocs.length;

  const effectiveAdminStats = {
    // Doctor documentation driven
    totalDoctors: totalDoctorSubmissions || 0,
    newDoctors: adminOverview?.adminStats?.newDoctors ?? 0,
    pendingDocuments: pendingDocs || 0,
    // Admin dashboard API driven
    totalPatients: adminOverview?.adminStats?.totalPatients ?? 0,
    newPatients: adminOverview?.adminStats?.newPatients ?? 0,
    activeReports: adminOverview?.adminStats?.activeReports ?? 0,
  };

  const effectiveDoctorDocuments = doctorSubmissionDocs;

  const effectiveFeedback = adminOverview?.feedbackOverview ?? {
    overallRating: 0,
    totalReviews: 0,
    distribution: [],
    contactFeedbacks: 0,
    recentContactFeedbacks: [],
  };

  const hasFeedbackData =
    Number(effectiveFeedback.overallRating) > 0 ||
    Number(effectiveFeedback.totalReviews) > 0 ||
    Number(effectiveFeedback.contactFeedbacks) > 0 ||
    (Array.isArray(effectiveFeedback.recentContactFeedbacks) &&
      effectiveFeedback.recentContactFeedbacks.length > 0) ||
    (Array.isArray(effectiveFeedback.distribution) &&
      effectiveFeedback.distribution.some((d) => Number(d.percentage) > 0));

  const effectiveRecentReports = adminOverview?.recentReports ?? [];

  const hasReportsData = Array.isArray(effectiveRecentReports) && effectiveRecentReports.length > 0;

  const hasDoctorDocsData = effectiveDoctorDocuments.length > 0;

  return (
    <>
      <Sidebar />
      {/*============================ Overlay Sidebar =================================*/}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`dashboard ${darkMode ? "dark" : "light"}`}>
        {/* ============== Header =======================================*/}
        <header className="dash-header">
          <div className="header-greeting">
            <h2>
              {greeting} {isDoctor && liveDashboard?.isVerified && (
                <span className="doctor-verified-badge" title="Verified Doctor">
                  <FaCheckCircle /> Verified
                </span>
              )} <span className="wave-emoji"></span>
            </h2>
            <p className="sub-greeting">
              {subGreeting}
              {isAdmin && adminDashboardLoading && (
                <span className="admin-dash-loading"> · Syncing data...</span>
              )}
              {!isAdmin && dashboardLoading && (
                <span className="admin-dash-loading"> · Syncing data...</span>
              )}
            </p>
          </div>
        </header>

        {/*============= For Admin Stats Cards Top  ================================*/}
        {isAdmin ? (
          <>
            <section className="stats-grid admin-stats-grid">
              <div className="stat-card admin-stat-card">
                <div className="stat-icon admin-stat-icon-blue">
                  <FaUserMd />
                </div>
                <div className="stat-info">
                  <h4>{effectiveAdminStats.totalDoctors}</h4>
                  <p>Total Doctors</p>
                  <span className="growth positive">
                    +{effectiveAdminStats.newDoctors} this month
                  </span>
                </div>
                <svg
                  className="admin-stat-sparkline admin-sparkline-purple"
                  viewBox="0 0 88 44"
                  aria-hidden="true"
                >
                  <polyline points="4,35 16,24 27,31 39,14 51,25 63,17 73,15 84,5" />
                </svg>
              </div>
              <div className="stat-card admin-stat-card">
                <div className="stat-icon admin-stat-icon-green">
                  <FaUsers />
                </div>
                <div className="stat-info">
                  <h4>{effectiveAdminStats.totalPatients.toLocaleString()}</h4>
                  <p>Total Patients</p>
                  <span className="growth positive">
                    +{effectiveAdminStats.newPatients} this month
                  </span>
                </div>
                <svg
                  className="admin-stat-sparkline admin-sparkline-blue"
                  viewBox="0 0 88 44"
                  aria-hidden="true"
                >
                  <polyline points="4,33 15,25 25,28 36,17 48,20 59,12 69,10 84,3" />
                </svg>
              </div>
              <div className="stat-card admin-stat-card">
                <div className="stat-icon admin-stat-icon-yellow">
                  <FaFileAlt />
                </div>
                <div className="stat-info">
                  <h4>{effectiveAdminStats.pendingDocuments}</h4>
                  <p>Pending Documents</p>
                  <span className="growth neutral">Needs Review</span>
                </div>
                <svg
                  className="admin-stat-sparkline admin-sparkline-teal"
                  viewBox="0 0 88 44"
                  aria-hidden="true"
                >
                  <polyline points="4,35 14,26 26,29 37,20 48,25 59,12 72,10 84,3" />
                </svg>
              </div>
              <div className="stat-card admin-stat-card">
                <div className="stat-icon admin-stat-icon-red">
                  <FaExclamationTriangle />
                </div>
                <div className="stat-info">
                  <h4>{effectiveAdminStats.activeReports}</h4>
                  <p>Active Reports</p>
                  <span className="growth neutral">Require Action</span>
                </div>
                <svg
                  className="admin-stat-sparkline admin-sparkline-orange"
                  viewBox="0 0 88 44"
                  aria-hidden="true"
                >
                  <polyline points="4,34 15,27 25,31 36,20 49,25 61,16 73,18 84,7" />
                </svg>
              </div>
            </section>

            {/*================= Admin Dashboard Content ========================= */}
            <main className="dashboard-main admin-dashboard-main">
              {/* Recent Doctor Documents */}
              <section className="dashboard-card admin-documents-card">
                <div className="card-header admin-card-header">
                  <h4>
                    <FaFileMedical /> Recent Doctor Documents
                  </h4>
                </div>
                <div className="admin-table-responsive">
                  <table className="admin-doctors-table">
                    <thead>
                      <tr>
                        <th>Doctor</th>
                        <th>Document</th>
                        <th>Uploaded</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hasDoctorDocsData ? (
                        effectiveDoctorDocuments.map((doc) => (
                          <tr key={doc.id}>
                            <td>
                              <div className="admin-doctor-cell">
                                {doc.profile_image ? (
                                  <img
                                    src={doc.profile_image.startsWith("http") ? doc.profile_image : doc.profile_image.startsWith("/") ? `${API_BASE_URL}${doc.profile_image}` : `${API_BASE_URL}/storage/${doc.profile_image}`}
                                    alt={doc.name}
                                    className="admin-doctor-avatar-small"
                                    onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                                  />
                                ) : null}
                                <div className="admin-doctor-avatar-small" style={{ display: doc.profile_image ? "none" : "flex" }}>
                                  <FaUser />
                                </div>
                                <span>{doc.name}</span>
                              </div>
                            </td>
                            <td>
                              <div className="admin-document-cell">
                                <span className="admin-doc-icon">
                                  {getDocumentIcon(doc.document)}
                                </span>
                                <span>{doc.document}</span>
                              </div>
                            </td>
                            <td>{doc.uploaded}</td>
                            <td>{getStatusBadge(doc.status)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="admin-empty-cell">
                            <FaFolderOpen className="admin-empty-icon" />
                            <span>No documents yet</span>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="card-footer admin-card-footer">
                  <button
                    className="admin-view-all-btn"
                    onClick={() => navigate("/documents")}
                  >
                    View All Documents
                  </button>
                </div>
              </section>

              {/* Urgent Feedback & Feedback Overview */}
              <div className="dashboard-row admin-dashboard-row">
                {/* Urgent Feedback */}
                {/* <section className="dashboard-card admin-urgent-card">
                  <div className="card-header admin-card-header">
                    <h4>
                      <FaExclamationTriangle /> Urgent Feedback / Report
                    </h4>
                    <span className="admin-urgent-badge">Urgent</span>
                  </div>
                  <div className="admin-urgent-feedback-content">
                    <div className="admin-feedback-item">
                      <div className="admin-feedback-label">Patient</div>
                      <div className="admin-feedback-value">
                        {urgentFeedback.patient}
                      </div>
                    </div>
                    <div className="admin-feedback-item">
                      <div className="admin-feedback-label">Doctor</div>
                      <div className="admin-feedback-value">
                        {urgentFeedback.doctor}
                      </div>
                    </div>
                    <div className="admin-feedback-item">
                      <div className="admin-feedback-label">Issue</div>
                      <div className="admin-feedback-value admin-highlight">
                        {urgentFeedback.issue}
                      </div>
                    </div>
                    <div className="admin-feedback-item">
                      <div className="admin-feedback-label">Proof</div>
                      <div className="admin-feedback-value">
                        <span className="admin-proof-count">
                          +{urgentFeedback.proofCount}
                        </span>
                      </div>
                    </div>
                    <div className="admin-feedback-item">
                      <div className="admin-feedback-label">Reported</div>
                      <div className="admin-feedback-value">
                        {urgentFeedback.reported}
                      </div>
                    </div>
                  </div>
                  <div className="card-footer admin-card-footer">
                    <button className="btn admin-primary-btn">
                      View Full Report
                    </button>
                  </div>
                </section> */}

                {/* Feedback Overview */}
                <section className="dashboard-card admin-feedback-card">
                  <div className="card-header admin-card-header">
                    <h4>
                      <FaStar /> Feedback Overview
                    </h4>
                  </div>
                  <div className="admin-feedback-overview-content">
                    {hasFeedbackData ? (
                      <>
                        <div className="admin-overall-rating">
                          <h2>{effectiveFeedback.overallRating}</h2>
                          <div className="admin-stars-display">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <FaStar
                                key={s}
                                className={
                                  s <= Math.floor(effectiveFeedback.overallRating)
                                    ? "admin-star-filled"
                                    : "admin-star-empty"
                                }
                              />
                            ))}
                          </div>
                          <p>
                            Based on{" "}
                            {effectiveFeedback.totalReviews.toLocaleString()} reviews
                          </p>
                          {effectiveFeedback.contactFeedbacks > 0 && (
                            <p style={{ fontSize: "12px", opacity: 0.6, marginTop: "4px" }}>
                              {effectiveFeedback.contactFeedbacks} contact form submissions
                            </p>
                          )}
                        </div>
                        <div className="admin-rating-distribution">
                          {effectiveFeedback.distribution.map((item) => (
                            <div key={item.stars} className="admin-rating-bar">
                              <span className="admin-star-label">
                                {item.stars} Stars
                              </span>
                              <div className="admin-bar-container">
                                <div
                                  className={`admin-bar-fill admin-bar-fill-${item.stars}`}
                                  style={{ width: `${item.percentage}%` }}
                                ></div>
                              </div>
                              <span className="admin-bar-percent">
                                {item.percentage}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="admin-empty-state">
                        <FaStar className="admin-empty-icon" />
                        <p>No feedback data available yet</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {/* Recent Reports */}
              <section className="dashboard-card admin-reports-card">
                <div className="card-header admin-card-header">
                  <h4>
                    <FaClipboardList /> Recent Reports
                  </h4>
                  <button
                    className="admin-view-all-btn"
                    onClick={() => navigate("/reports")}
                  >
                    View All
                  </button>
                </div>
                <div className="admin-table-responsive">
                  {hasReportsData ? (
                    <table className="admin-reports-table">
                      <thead>
                        <tr>
                          <th>Report ID</th>
                          <th>Against</th>
                          <th>Reason</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {effectiveRecentReports.map((report) => (
                          <tr key={report.id}>
                            <td>
                              <span className="admin-report-id">{report.id}</span>
                            </td>
                            <td>{report.against}</td>
                            <td>{report.reason}</td>
                            <td>{getStatusBadge(report.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="admin-empty-state">
                      <FaClipboardList className="admin-empty-icon" />
                      <p>No reports available yet</p>
                    </div>
                  )}
                </div>
              </section>
            </main>
          </>
        ) : isDoctor ? (
          <>
            {/*=================== Doctor Dashboard Role Started =================================*/}
            {isDoctor && profileFetchedRef.current && liveDashboard?.profileStatus && liveDashboard.profileStatus !== "approved" && (
              <div className="doctor-approval-overlay">
                <div className="doctor-approval-card">
                  <div className="doctor-approval-icon">
                    {reuploadSuccess && liveDashboard.profileStatus === "pending"
                      ? <FaCheckCircle />
                      : liveDashboard.profileStatus === "pending" ? <FaClock /> : <FaFileAlt />}
                  </div>
                  <h2>
                    {reuploadSuccess && liveDashboard.profileStatus === "pending"
                      ? "Re-upload Submitted"
                      : liveDashboard.profileStatus === "pending"
                        ? "Wait for Approval"
                        : "Documents Rejected"}
                  </h2>
                  <p className="doctor-approval-subtitle">
                    {reuploadSuccess && liveDashboard.profileStatus === "pending"
                      ? "You have submitted the re-upload. Please wait for admin approval."
                      : liveDashboard.profileStatus === "pending"
                        ? "Your documents are under review. Approximate time: 24 hours."
                        : "Your documents were rejected. Please review the reason and re-upload."}
                  </p>
                  {!reuploadSuccess && liveDashboard.rejectionReason && (
                    <div className="doctor-approval-reason">
                      <strong>Reason:</strong> {liveDashboard.rejectionReason}
                    </div>
                  )}
                  <input
                    type="file"
                    ref={reuploadInputRef}
                    accept="image/*,.pdf"
                    style={{ display: "none" }}
                  />
                  {reuploadSuccess && liveDashboard.profileStatus === "pending" ? (
                    <div className="doctor-approval-reupload-done">
                      <FaCheckCircle /> You have submitted the re-upload.
                    </div>
                  ) : liveDashboard.profileStatus === "rejected" ? (
                    <>
                      <button
                        className="doctor-approval-reupload-btn"
                        disabled={reuploading}
                        onClick={() => triggerReupload(liveDashboard.objectedDocument || "document")}
                      >
                        {reuploading ? <><FaUpload /> Uploading...</> : <><FaUpload /> Re-upload Now</>}
                      </button>
                      {reuploading && (
                        <div className="doctor-reupload-progress">
                          <div className="doctor-reupload-progress-bar" style={{ width: `${reuploadProgress}%` }} />
                          <span className="doctor-reupload-progress-text">{reuploadProgress}%</span>
                        </div>
                      )}
                    </>
                  ) : null}
                  {reuploadError && !reuploadSuccess && (
                    <div className="doctor-approval-reupload-error">
                      <FaExclamationTriangle /> {reuploadError}
                    </div>
                  )}
                  <div className="doctor-approval-status">
                    <span className={`doctor-status-badge doctor-status-${reuploadSuccess ? "pending" : liveDashboard.profileStatus}`}>
                      {reuploadSuccess ? "Pending" : liveDashboard.profileStatus === "pending" ? "Pending" : "Rejected"}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div className={isDoctor && profileFetchedRef.current && liveDashboard?.profileStatus && liveDashboard.profileStatus !== "approved" ? "doctor-dashboard-blurred" : ""}>
            <section className="stats-grid">
              <div className="stat-card">
                {stats.todayConsultations === 0 ? (
                  <div className="stat-empty">
                    <FaCalendarCheck />
                    <p>No today's schedule was booked</p>
                  </div>
                ) : (
                  <>
                    <div className="stat-icon stat-icon-blue">
                      <FaCalendarCheck />
                    </div>
                    <div className="stat-info">
                      <h4>{stats.todayConsultations}</h4>
                      <p>Today's Consultations</p>
                      <span className="growth positive">
                        {stats.consultationGrowth} from yesterday
                      </span>
                    </div>
                  </>
                )}
              </div>
              <div className="stat-card">
                {stats.upcomingAppointments === 0 ? (
                  <div className="stat-empty">
                    <FaCalendarAlt />
                    <p>No upcoming appointments</p>
                  </div>
                ) : (
                  <>
                    <div className="stat-icon stat-icon-green">
                      <FaCalendarAlt />
                    </div>
                    <div className="stat-info">
                      <h4>{stats.upcomingAppointments}</h4>
                      <p>Upcoming Appointments</p>
                      <span className="growth positive">
                        {stats.appointmentGrowth} from yesterday
                      </span>
                    </div>
                  </>
                )}
              </div>
              <div className="stat-card">
                {stats.totalPatients === 0 ? (
                  <div className="stat-empty">
                    <FaUsers />
                    <p>No patients yet</p>
                  </div>
                ) : (
                  <>
                    <div className="stat-icon stat-icon-purple">
                      <FaUsers />
                    </div>
                    <div className="stat-info">
                      <h4>{stats.totalPatients.toLocaleString()}</h4>
                      <p>Total Patients</p>
                      <span className="growth positive">
                        {stats.patientGrowth} from last month
                      </span>
                    </div>
                  </>
                )}
              </div>
              <div className="stat-card">
                {stats.totalConsultations === 0 ? (
                  <div className="stat-empty">
                    <FaStethoscope />
                    <p>No consultations yet</p>
                  </div>
                ) : (
                  <>
                    <div className="stat-icon stat-icon-yellow">
                      <FaStethoscope />
                    </div>
                    <div className="stat-info">
                      <h4>{stats.totalConsultations.toLocaleString()}</h4>
                      <p>Total Consultations</p>
                      <span className="growth positive">
                        {stats.totalGrowth} from last month
                      </span>
                    </div>
                  </>
                )}
              </div>
              <div className="stat-card">
                {stats.averageRating === 0 ? (
                  <div className="stat-empty">
                    <FaStar />
                    <p>No ratings yet</p>
                  </div>
                ) : (
                  <>
                    <div className="stat-icon stat-icon-red">
                      <FaStar />
                    </div>
                    <div className="stat-info">
                      <h4>{stats.averageRating}</h4>
                      <p>Average Rating</p>
                      <span className="growth positive">
                        {stats.ratingGrowth} from last month
                      </span>
                      <div className="star-rating">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <FaStar
                            key={s}
                            className={
                              s <= Math.floor(stats.averageRating)
                                ? "star-filled"
                                : "star-empty"
                            }
                          />
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>

            <main className="dashboard-main">
              <div className="dashboard-row">
                <section className="dashboard-card schedule-card">
                  <div className="card-header">
                    <h4>
                      <FaClock /> Today's Schedule
                    </h4>
                  </div>
                  <div className="schedule-list">
                    {todaySchedule.length > 0 ? (
                      todaySchedule.map((item, idx) => (
                        <div key={idx} className="schedule-item">
                          <span className="schedule-time">{item.time}</span>
                          <div className="schedule-avatar">
                            <img src={item.avatar} alt={item.name} />
                          </div>
                          <div className="schedule-details">
                            <h5>{item.name}</h5>
                            <p>{item.type}</p>
                          </div>
                          {getStatusBadge(item.status)}
                        </div>
                      ))
                    ) : (
                      <div className="section-empty">
                        <FaCalendarCheck />
                        <p>No today's schedule was booked</p>
                      </div>
                    )}
                  </div>
                </section>

                <section className="dashboard-card chart-card">
                  <div className="card-header">
                    <h4>
                      <FaChartLine /> Consultations Overview
                    </h4>
                    <select className="period-select">
                      <option>This Week</option>
                      <option>This Month</option>
                      <option>This Year</option>
                    </select>
                  </div>
                  <div className="chart-placeholder">
                    {doctorChart ? (
                      <>
                        <div className="chart-bars">
                          {doctorChart.labels.map((day, i) => {
                            const norm = (arr) => {
                              const max = Math.max(...arr, 1);
                              return arr.map((v) =>
                                Math.max(6, Math.round((v / max) * 100)),
                              );
                            };
                            const heights = norm(doctorChart.consultations);
                            const secondaryHeights = norm(
                              doctorChart.appointments,
                            );
                            return (
                              <div key={day} className="chart-bar-group">
                                <div
                                  className="chart-bar"
                                  style={{
                                    height: `${heights[i]}%`,
                                  }}
                                ></div>
                                <div
                                  className="chart-bar secondary"
                                  style={{
                                    height: `${secondaryHeights[i]}%`,
                                  }}
                                ></div>
                                <span>{day}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="chart-legend">
                          <span>
                            <span className="legend-dot legend-dot-blue"></span>{" "}
                            Consultations
                          </span>
                          <span>
                            <span className="legend-dot legend-dot-green"></span>{" "}
                            Appointments
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="section-empty">
                        <FaChartLine />
                        <p>No consultation data available this week</p>
                      </div>
                    )}
                  </div>
                </section>

                <section className="dashboard-card patients-card">
                  <div className="card-header">
                    <h4>
                      <FaUsers /> Recent Patients
                    </h4>
                    <button
                      className="view-all-btn"
                      onClick={() => navigate("/patients")}
                    >
                      View All
                    </button>
                  </div>
                  <div className="patients-list">
                    {recentPatients.length > 0 ? (
                      recentPatients.map((patient, idx) => (
                        <div key={idx} className="patient-item">
                          <img
                            src={patient.avatar}
                            alt={patient.name}
                            className="patient-avatar"
                          />
                          <div className="patient-info">
                            <h5>{patient.name}</h5>
                            <p>{patient.issue}</p>
                          </div>
                          <span className="patient-time">{patient.time}</span>
                        </div>
                      ))
                    ) : (
                      <div className="section-empty">
                        <FaUsers />
                        <p>No recent patients yet</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <section className="consultations-section">
                <div className="section-header">
                  <h3>
                    <FaStethoscope /> Consultations
                  </h3>
                  <div className="tab-buttons">
                    <button
                      className={`tab-btn ${activeTab === "ongoing" ? "active" : ""}`}
                      onClick={() => setActiveTab("ongoing")}
                    >
                      Ongoing
                    </button>
                    <button
                      className={`tab-btn ${activeTab === "completed" ? "active" : ""}`}
                      onClick={() => setActiveTab("completed")}
                    >
                      Completed
                    </button>
                  </div>
                </div>

                {activeTab === "ongoing" && (
                  <div className="consultations-grid">
                    {ongoingConsultations.length > 0 ? (
                      ongoingConsultations.map((consult) => (
                      <div
                        key={consult.id}
                        className="consultation-card ongoing"
                      >
                        <div className="consultation-header">
                          <img
                            src={consult.avatar}
                            alt={consult.doctorName}
                            className="consult-avatar"
                          />
                          <div className="consult-info">
                            <h4>{consult.patientName}</h4>
                            <p>{consult.specialty}</p>
                          </div>
                          {getStatusBadge(consult.status)}
                        </div>
                        <div className="consultation-body">
                          <div className="consult-detail">
                            <span className="detail-icon">
                              {getConsultationIcon(consult.type)}
                            </span>
                            <span className="detail-text">
                              {consult.type.charAt(0).toUpperCase() +
                                consult.type.slice(1)}{" "}
                              Consultation
                            </span>
                          </div>
                          <div className="consult-detail">
                            <span className="detail-icon">
                              <FaClock />
                            </span>
                            <span className="detail-text">
                              {consult.time} · {consult.date}
                            </span>
                          </div>
                          <div className="consult-detail">
                            <span className="detail-icon">
                              <FaExclamationTriangle />
                            </span>
                            <span className="detail-text">
                              {consult.symptoms}
                            </span>
                          </div>
                          <div className="last-message">
                            <p>"{consult.lastMessage}"</p>
                          </div>
                        </div>
                        <div className="consultation-footers">
                          <button className="btn consult-btn primary">
                            {consult.status === "In Progress"
                              ? "Join Now"
                              : "Waiting Room"}
                          </button>
                          <button className="btn consult-btn secondary">
                            View Details
                          </button>
                        </div>
                      </div>
                    ))
                    ) : (
                      <div className="section-empty">
                        <FaVideo />
                        <p>No ongoing consultations</p>
                      </div>
                    )}
                    <button
                      className="view-all-consultations-btn"
                      type="button"
                      onClick={() => goToConsultations("ongoing")}
                    >
                      <FaChevronRight /> View All Consultations
                    </button>
                  </div>
                )}

                {activeTab === "completed" && (
                  <div className="consultations-grid">
                    {completedConsultations.length > 0 ? (
                      completedConsultations.map((consult) => (
                      <div
                        key={consult.id}
                        className="consultation-card completed"
                      >
                        <div className="consultation-header">
                          <img
                            src={consult.avatar}
                            alt={consult.doctorName}
                            className="consult-avatar"
                          />
                          <div className="consult-info">
                            <h4>{consult.patientName}</h4>
                            <p>{consult.specialty}</p>
                          </div>
                          {getStatusBadge(consult.status)}
                        </div>
                        <div className="consultation-body">
                          <div className="consult-detail">
                            <span className="detail-icon">
                              {getConsultationIcon(consult.type)}
                            </span>
                            <span className="detail-text">
                              {consult.type.charAt(0).toUpperCase() +
                                consult.type.slice(1)}{" "}
                              Consultation · {consult.duration}
                            </span>
                          </div>
                          <div className="consult-detail">
                            <span className="detail-icon">
                              <FaClock />
                            </span>
                            <span className="detail-text">
                              {consult.time} · {consult.date}
                            </span>
                          </div>
                          <div className="consult-detail">
                            <span className="detail-icon">
                              <FaStethoscope />
                            </span>
                            <span className="detail-text">
                              {consult.diagnosis}
                            </span>
                          </div>
                          <div className="prescription-box">
                            <FaPills className="prescription-icon" />
                            <span>{consult.prescription}</span>
                          </div>
                          <div className="rating-display">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <FaStar
                                key={s}
                                className={
                                  s <= consult.rating
                                    ? "star-filled"
                                    : "star-empty"
                                }
                              />
                            ))}
                            <span>{consult.rating}/5</span>
                          </div>
                        </div>
                      </div>
                    ))
                    ) : (
                      <div className="section-empty">
                        <FaCheckCircle />
                        <p>No completed consultations yet</p>
                      </div>
                    )}
                    <button
                      className="view-all-consultations-btn"
                      type="button"
                      onClick={() => goToConsultations("completed")}
                    >
                      <FaChevronRight /> View All Consultations
                    </button>
                  </div>
                )}
              </section>

              <div className="dashboard-row">
                <section className="dashboard-card prescriptions-card">
                  <div className="card-header">
                    <h4>
                      <FaFileMedical /> Recent Prescriptions
                    </h4>
                    <button
                      className="view-all-btn" 
                      onClick={() => navigateAndScrollTop("/prescriptions")}
                    >
                      View All
                    </button>
                  </div>
                  <div className="prescriptions-list">
                    {recentPrescriptions.length > 0 ? (
                      recentPrescriptions.map((pres, idx) => (
                        <div key={idx} className="prescription-item">
                          <div className="prescription-icon-box">
                            <FaPills />
                          </div>
                          <div className="prescription-info">
                            <h5>{pres.name}</h5>
                            <p>{pres.medicine}</p>
                          </div>
                          <span className="prescription-time">{pres.time}</span>
                        </div>
                      ))
                    ) : (
                      <div className="section-empty">
                        <FaFileMedical />
                        <p>No prescriptions prescribed yet</p>
                      </div>
                    )}
                  </div>
                </section>

                <section className="dashboard-card distribution-card">
                  <div className="card-header">
                    <h4>
                      <FaChartLine /> Consultation Type Distribution
                    </h4>
                  </div>
                  <div className="distribution-chart">
                    <div
                      className="donut-chart"
                      style={buildDonutGradient(doctorDistribution?.items)}
                    >
                      <div className="donut-center">
                        <h4>{toNum(doctorDistribution?.total).toLocaleString()}</h4>
                        <p>Total</p>
                      </div>
                    </div>
                    <div className="distribution-legend">
                      {toNum(doctorDistribution?.total) === 0 ? (
                        <div className="legend-item">
                          <span>No consultation data yet</span>
                        </div>
                      ) : (
                        (doctorDistribution?.items ?? []).map((item) => {
                          const distColor = {
                            video: "legend-color-blue",
                            voice: "legend-color-green",
                            chat: "legend-color-purple",
                            other: "legend-color-yellow",
                          };
                          return (
                            <div key={item.key} className="legend-item">
                              <span
                                className={`legend-color ${distColor[item.key] || "legend-color-yellow"}`}
                              ></span>
                              <span>{item.label}</span>
                              <span className="legend-percent">
                                {item.percent}% ({item.count.toLocaleString()})
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </section>
              </div>
            </main>
            </div>
          </>
        ) : (
          <>
            {/*============================ Patient Dashboard Role Started =================================================*/}
            <section className="stats-grid">
              <div className="stat-card">
                {stats.upcomingAppointments === 0 ? (
                  <div className="stat-empty">
                    <FaCalendarCheck />
                    <p>No upcoming appointment</p>
                  </div>
                ) : (
                  <>
                    <div className="stat-icon stat-icon-blue">
                      <FaCalendarCheck />
                    </div>
                    <div className="stat-info">
                      <h4>{stats.upcomingAppointments}</h4>
                      <p>Upcoming Appointment</p>
                      <span className="growth">
                        {patientNextAppointment?.when ?? "No upcoming appointment"}
                      </span>
                    </div>
                  </>
                )}
              </div>
              <div className="stat-card">
                {stats.activePrescriptions === 0 ? (
                  <div className="stat-empty">
                    <FaPills />
                    <p>No active prescriptions</p>
                  </div>
                ) : (
                  <>
                    <div className="stat-icon stat-icon-green">
                      <FaPills />
                    </div>
                    <div className="stat-info">
                      <h4>{stats.activePrescriptions}</h4>
                      <p>Active Prescriptions</p>
                      <span className="growth">
                        {stats.activeMedicineCount || 0} Active Medicines
                      </span>
                    </div>
                  </>
                )}
              </div>
              <div className="stat-card">
                {stats.totalReports === 0 ? (
                  <div className="stat-empty">
                    <FaFileAlt />
                    <p>No reports yet</p>
                  </div>
                ) : (
                  <>
                    <div className="stat-icon stat-icon-purple">
                      <FaFileAlt />
                    </div>
                    <div className="stat-info">
                      <h4>{stats.totalReports}</h4>
                      <p>Reports</p>
                      <span className="growth">
                        {stats.totalReports || 0} Reports Available
                      </span>
                    </div>
                  </>
                )}
              </div>
              <div className="stat-card">
                <div className="stat-icon stat-icon-yellow">
                  <FaHeartbeat />
                </div>
                <div className="stat-info">
                  <h4>{stats.healthScore}</h4>
                  <p>Health Score</p>
                  <span className="growth positive">Good</span>
                </div>
              </div>
            </section>

            <main className="dashboard-main">
              <div className="dashboard-row">
                <section className="dashboard-card appointment-card">
                  <div className="card-header">
                    <h4>
                      <FaCalendarCheck /> Upcoming Appointment
                    </h4>
                  </div>
                  <div className="appointment-details">
                    {patientNextAppointment ? (
                      <>
                        <div className="appointment-info">
                          <p className="appointment-time">
                            {patientNextAppointment.when}
                          </p>
                          <h5>{patientNextAppointment.doctorName}</h5>
                          <p className="appointment-specialty">
                            {patientNextAppointment.specialty}
                          </p>
                        </div>
                        <button className="btn join-btn">Join Now</button>
                      </>
                    ) : (
                      <div className="section-empty">
                        <FaCalendarCheck />
                        <p>No appointment scheduled</p>
                      </div>
                    )}
                  </div>
                </section>

                <section className="dashboard-card quick-access-card">
                  <div className="quick-access-item">
                    <div className="quick-icon quick-icon-green">
                      <FaPills />
                    </div>
                    <div className="quick-info">
                      <h5>Prescription</h5>
                      <p>
                        {stats.activeMedicineCount || 0} Active Medicines
                      </p>
                    </div>
                    {stats.activePrescriptions > 0 ? (
                      <button
                        className="btn view-btn"
                        type="button"
                        onClick={() => setShowPrescriptionModal(true)}
                      >
                        View Prescription
                      </button>
                    ) : (
                      <span className="quick-empty">No prescription yet</span>
                    )}
                  </div>

                </section>

                <section className="dashboard-card chat-card">
                  <div className="card-header">
                    <h4>
                      <FaUserMd /> Search Doctor
                    </h4>
                  </div>
                  <div className="chat-welcome">
                    <p>Hello {displayName.split(" ")[0]}! </p>
                    <p>How can I assist you today?</p>
                  </div>
                  <div className="chat-quick-actions">
                    <button
                      className="chat-action-btn"
                      onClick={() =>
                        handleDashboardRedirect(
                          "I have a new symptom and need help",
                          "symptom",
                        )
                      }
                    >
                      <FaStethoscope /> I have a new symptom
                    </button>
                    <button
                      className="chat-action-btn"
                      onClick={() =>
                        handleDashboardRedirect(
                          "I need health advice",
                          "advice",
                        )
                      }
                    >
                      <FaHeartbeat /> Need health advice
                    </button>
                    <button
                      className="chat-action-btn"
                      onClick={() =>
                        handleDashboardRedirect(
                          "Find a specialist for me",
                          "specialist",
                        )
                      }
                    >
                      <FaUserMd /> Find a specialist
                    </button>
                    <button
                      className="chat-action-btn"
                      onClick={() =>
                        handleDashboardRedirect(
                          "Give me general health tips",
                          "tips",
                        )
                      }
                    >
                      <FaComments /> General health tips
                    </button>
                  </div>
                  <div className="chat-input-box">
                    <input
                      type="text"
                      value={patientQuickInput}
                      onChange={(e) => setPatientQuickInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handlePatientQuickSubmit();
                        }
                      }}
                      placeholder="Type your message..."
                    />
                    <button
                      className="send-btn"
                      onClick={handlePatientQuickSubmit}
                    >
                      <FaChevronRight />
                    </button>
                  </div>
                  <div className="emergency-box">
                    <FaExclamationTriangle />
                    <div>
                      <h5>Need Immediate Help?</h5>
                      <p>Call Emergency 24/7 Available</p>
                    </div>
                    <button className="call-btn">
                      <FaPhoneAlt />
                    </button>
                  </div>
                </section>
              </div>

              <div className="dashboard-row">
                <section className="dashboard-card health-tips-card patient-full-width">
                  <div className="card-header">
                    <h4>
                      <FaStar /> Health Tips For You
                    </h4>
                  </div>
                  <div className="tips-list">
                    {healthTips.map((tip, idx) => (
                      <div key={idx} className="tip-item">
                        <span className={`tip-icon ${tip.colorClass}`}>
                          {tip.icon}
                        </span>
                        <p>{tip.text}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <section className="consultations-section">
                <div className="section-header">
                  <h3>
                    <FaStethoscope /> My Consultations
                  </h3>
                  <div className="tab-buttons">
                    <button
                      className={`tab-btn ${activeTab === "ongoing" ? "active" : ""}`}
                      onClick={() => setActiveTab("ongoing")}
                    >
                      Ongoing
                    </button>
                    <button
                      className={`tab-btn ${activeTab === "completed" ? "active" : ""}`}
                      onClick={() => setActiveTab("completed")}
                    >
                      Completed
                    </button>
                  </div>
                </div>

                {activeTab === "ongoing" && (
                  <div className="consultations-grid">
                    {ongoingConsultations.length > 0 ? (
                      ongoingConsultations.map((consult) => (
                      <div
                        key={consult.id}
                        className="consultation-card ongoing"
                      >
                        <div className="consultation-header">
                          <img
                            src={consult.avatar}
                            alt={consult.doctorName}
                            className="consult-avatar"
                          />
                          <div className="consult-info">
                            <h4>{consult.doctorName}</h4>
                            <p>{consult.specialty}</p>
                          </div>
                          {getStatusBadge(consult.status)}
                        </div>
                        <div className="consultation-body">
                          <div className="consult-detail">
                            <span className="detail-icon">
                              {getConsultationIcon(consult.type)}
                            </span>
                            <span className="detail-text">
                              {consult.type.charAt(0).toUpperCase() +
                                consult.type.slice(1)}{" "}
                              Consultation
                            </span>
                          </div>
                          <div className="consult-detail">
                            <span className="detail-icon">
                              <FaClock />
                            </span>
                            <span className="detail-text">
                              {consult.time} · {consult.date}
                            </span>
                          </div>
                          <div className="consult-detail">
                            <span className="detail-icon">
                              <FaExclamationTriangle />
                            </span>
                            <span className="detail-text">
                              {consult.symptoms}
                            </span>
                          </div>
                          <div className="last-message">
                            <p>"{consult.lastMessage}"</p>
                          </div>
                        </div>
                        <div className="consultation-footers">
                          <button className="btn consult-btn primary">
                            {consult.status === "In Progress"
                              ? "Join Now"
                              : "Waiting Room"}
                          </button>
                          <button className="btn consult-btn secondary">
                            View Details
                          </button>
                        </div>
                      </div>
                    ))
                    ) : (
                      <div className="section-empty">
                        <FaVideo />
                        <p>No ongoing consultations</p>
                      </div>
                    )}
                    <button
                      className="view-all-consultations-btn"
                      type="button"
                      onClick={() => goToConsultations("ongoing")}
                    >
                      <FaChevronRight /> View All Consultations
                    </button>
                  </div>
                )}

                {activeTab === "completed" && (
                  <div className="consultations-grid">
                    {completedConsultations.length > 0 ? (
                      completedConsultations.map((consult) => (
                      <div
                        key={consult.id}
                        className="consultation-card completed"
                      >
                        <div className="consultation-header">
                          <img
                            src={consult.avatar}
                            alt={consult.doctorName}
                            className="consult-avatar"
                          />
                          <div className="consult-info">
                            <h4>{consult.doctorName}</h4>
                            <p>{consult.specialty}</p>
                          </div>
                          {getStatusBadge(consult.status)}
                        </div>
                        <div className="consultation-body">
                          <div className="consult-detail">
                            <span className="detail-icon">
                              {getConsultationIcon(consult.type)}
                            </span>
                            <span className="detail-text">
                              {consult.type.charAt(0).toUpperCase() +
                                consult.type.slice(1)}{" "}
                              Consultation · {consult.duration}
                            </span>
                          </div>
                          <div className="consult-detail">
                            <span className="detail-icon">
                              <FaClock />
                            </span>
                            <span className="detail-text">
                              {consult.time} · {consult.date}
                            </span>
                          </div>
                          <div className="consult-detail">
                            <span className="detail-icon">
                              <FaStethoscope />
                            </span>
                            <span className="detail-text">
                              {consult.diagnosis}
                            </span>
                          </div>
                          <div className="prescription-box">
                            <FaPills className="prescription-icon" />
                            <span>{consult.prescription}</span>
                          </div>
                          <div className="rating-display">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <FaStar
                                key={s}
                                className={
                                  s <= consult.rating
                                    ? "star-filled"
                                    : "star-empty"
                                }
                              />
                            ))}
                            <span>{consult.rating}/5</span>
                          </div>
                        </div>
                        <div className="consultation-footers">
                          <button className="btn consult-btn primary">
                            View Report
                          </button>
                          <button className="btn consult-btn secondary">
                            Prescription
                          </button>
                        </div>
                      </div>
                    ))
                    ) : (
                      <div className="section-empty">
                        <FaCheckCircle />
                        <p>No completed consultations yet</p>
                      </div>
                    )}
                    <button
                      className="view-all-consultations-btn"
                      type="button"
                      onClick={() => goToConsultations("completed")}
                    >
                      <FaChevronRight /> View All Consultations
                    </button>
                  </div>
                )}
              </section>
            </main>
          </>
        )}
      </div>

      {showPrescriptionModal && patientLatestPrescription && (
        <EPrescriptionModal
          data={{
            patient: displayName || "Patient",
            presId:
              patientLatestPrescription?.presId ||
              `PRES ${new Date().getFullYear()}/${String(
                patientLatestPrescription?.id ?? 1,
              ).padStart(6, "0")}`,
            mrNumber:
              patientLatestPrescription?.mrNumber || `MR-${String(user?.Id ?? 1).padStart(6, "0")}`,
            prescribedBy:
              patientLatestPrescription?.prescribedBy ||
              patientLatestPrescription?.doctorName ||
              "Doctor",
            doctorName:
              patientLatestPrescription?.doctorName || "Doctor",
            age: patientLatestPrescription?.age || "",
            gender: patientLatestPrescription?.gender || "",
            date:
              patientLatestPrescription?.date ||
              new Date().toLocaleDateString("en-US"),
            diagnosis: patientLatestPrescription?.diagnosis || "",
            medicines: patientLatestPrescription?.medicines || [],
          }}
          onClose={() => setShowPrescriptionModal(false)}
        />
      )}

    </>
  );
}
