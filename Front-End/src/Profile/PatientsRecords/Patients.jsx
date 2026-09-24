import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  FaUsers,
  FaCalendarAlt,
  FaStethoscope,
  FaUserCheck,
  FaSearch,
  FaChevronRight,
  FaChevronDown,
  FaChevronUp,
  FaPhoneAlt,
  FaEnvelope,
  FaTimes,
  FaHeartbeat,
  FaCalendarCheck,
  FaUserMd,
  FaIdCard,
} from "react-icons/fa"; 
import axios from "axios";
import "./Patients.css";
import { ThemeContext } from "../../Theme/ThemeContext";
import { AuthContext } from "../../HeadFoot/Auth/AuthContext";
import Sidebar from "../Hamburger/sidebar";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

const placeholderAvatar =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23e2e8f0'/><text x='50' y='60' font-size='40' text-anchor='middle' fill='%2394a3b8' font-family='Arial'>P</text></svg>";

const resolveProfileImage = (img) => {
  if (!img) return placeholderAvatar;
  if (img.startsWith("data:")) return img;
  if (img.startsWith("http")) return img;
  if (img.startsWith("/")) return `${API_BASE_URL}${img}`;
  return `${API_BASE_URL}/storage/${img}`;
};

const formatDate = (val) => {
  if (!val) return "";
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
  return val;
};

const titleCase = (val) => {
  if (!val) return "";
  return String(val)
    .split(" ")
    .map((w) => {
      if (!w) return w;
      return w[0].toUpperCase() + w.slice(1);
    })
    .join(" ");
};

const mapBackendPatient = (p) => {
  const timeline = (Array.isArray(p.timeline) ? p.timeline : []).map((t) => {
    const typeStr = String(t.type || "");
    let icon = "appointment";
    if (typeStr.toLowerCase().includes("consultation")) icon = "consultation";
    if (typeStr.toLowerCase().includes("first")) icon = "firstvisit";
    return {
      date: formatDate(t.date),
      type: t.type || "Appointment",
      status: t.status || "",
      icon,
    };
  });

  return {
    id: p.id ? `PAT-${String(p.id).padStart(5, "0")}` : "",
    backendId: p.id,
    name: p.name || "Unknown",
    age: p.age ?? "",
    gender: titleCase(p.gender),
    phone: p.phone || "",
    email: p.email || "",
    status: titleCase(p.status) || "Active",
    avatar: resolveProfileImage(p.profile_image),
    appointments: p.appointments ?? 0,
    consultations: p.consultations ?? 0,
    lastVisit: formatDate(p.lastVisit),
    firstVisit: formatDate(p.firstVisit),
    completedAppointments: p.completedAppointments ?? 0,
    missedAppointments: p.missedAppointments ?? 0,
    timeline,
  };
};

// ==================== Main Component ====================
const Patients = () => {
  const { darkMode } = useContext(ThemeContext);
  const { isDoctor, token, user } = useContext(AuthContext);

  // ==================== State Management ====================
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [mobileDrawer, setMobileDrawer] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const patientsUserKey = user?.id ?? user?.Id ?? "guest";
  const readPatientsCache = () => {
    if (patientsUserKey === "guest") return [];
    try {
      const cached = localStorage.getItem(`patients_data_${patientsUserKey}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  };
  const [patients, setPatients] = useState(readPatientsCache);
  const [loadError, setLoadError] = useState("");

  // ==================== Tabs Configuration ====================
  // Only Overview tab remains
  const detailTabs = ["Overview"];

  // ==================== API Fetch ====================
  useEffect(() => {
    if (!token || patientsUserKey === "guest") return;
    let cancelled = false;
    const fetchPatients = () => {
      axios
        .get(`${API_BASE_URL}/api/doctor/patients`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          timeout: 30000,
        })
        .then((res) => {
          if (cancelled) return;
          const fetched = (res.data?.data ?? []).map(mapBackendPatient);
          setPatients((prev) => {
            if (JSON.stringify(prev ?? []) === JSON.stringify(fetched)) return prev;
            return fetched;
          });
          localStorage.setItem(
            `patients_data_${patientsUserKey}`,
            JSON.stringify(fetched),
          );
          setLoadError("");
        })
        .catch((err) => {
          if (cancelled) return;
          setLoadError(err?.response?.data?.message || err?.message || "Failed to load patients");
        });
    };
    fetchPatients();

    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchPatients();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [token, patientsUserKey]);

  // ==================== Data Processing ====================
  const filtered = useMemo(() => {
    const searchLower = search.toLowerCase();
    return patients.filter((p) => {
      return (
        p.name.toLowerCase().includes(searchLower) ||
        p.phone.toLowerCase().includes(searchLower) ||
        p.id.toLowerCase().includes(searchLower)
      );
    });
  }, [patients, search]);

  const visible = showAll ? filtered : filtered.slice(0, 5);

  // ==================== Summary Stats ====================
  const totalPatients = patients.length;
  const totalAppointments = patients.reduce((sum, p) => sum + p.appointments, 0);
  const totalConsultations = patients.reduce((sum, p) => sum + p.consultations, 0);
  const repeatPatients = patients.filter((p) => p.appointments > 1).length;

  // ==================== Event Handlers ====================
  const handleSelect = (p) => {
    setSelected(p);
    if (window.innerWidth <= 900) setMobileDrawer(true);
  };

  // ==================== Helper Functions ====================
  const getTimelineIcon = (iconType) => {
    switch (iconType) {
      case "appointment":
        return <FaCalendarCheck className="pat-tl-icon pat-appointment-icon" />;
      case "consultation":
        return <FaUserMd className="pat-tl-icon pat-consultation-icon" />;
      case "firstvisit":
        return <FaHeartbeat className="pat-tl-icon pat-firstvisit-icon" />;
      default:
        return <FaCalendarCheck className="pat-tl-icon" />;
    }
  };

  // ==================== Render ====================
  return (
    <div className="pat-patients-layout">
      <Sidebar />
      <div className={`pat-patients-wrapper ${darkMode ? "dark" : "light"}`}>
        {/* ============== Page Header Section ============== */}
        <header className="pat-page-header">
          <div className="pat-page-header-left">
            <h1 className="pat-page-title">Patients</h1>
            <p className="pat-page-subtitle">
              {isDoctor
                ? "View and manage all your patients"
                : "Manage your patient records"}
            </p>
          </div>
        </header>

        {/* ============== Summary Cards Section ============== */}
        <section className="pat-summary-grid">
          <div className="pat-summary-card">
            <div className="pat-icon-box pat-patients-icon">
              <FaUsers />
            </div>
            <div className="pat-summary-info">
              <span className="pat-summary-label">Total Patients</span>
              <h2 className="pat-summary-count">{totalPatients}</h2>
              <p className="pat-summary-sub">Live records</p>
            </div>
          </div>

          <div className="pat-summary-card">
            <div className="pat-icon-box pat-appointments-icon">
              <FaCalendarAlt />
            </div>
            <div className="pat-summary-info">
              <span className="pat-summary-label">Total Appointments</span>
              <h2 className="pat-summary-count">{totalAppointments}</h2>
              <p className="pat-summary-sub">Across all patients</p>
            </div>
          </div>

          <div className="pat-summary-card">
            <div className="pat-icon-box pat-consultations-icon">
              <FaStethoscope />
            </div>
            <div className="pat-summary-info">
              <span className="pat-summary-label">Total Consultations</span>
              <h2 className="pat-summary-count">{totalConsultations}</h2>
              <p className="pat-summary-sub">Across all patients</p>
            </div>
          </div>

          <div className="pat-summary-card">
            <div className="pat-icon-box pat-repeat-icon">
              <FaUserCheck />
            </div>
            <div className="pat-summary-info">
              <span className="pat-summary-label">Repeat Patients</span>
              <h2 className="pat-summary-count">{repeatPatients}</h2>
              <p className="pat-summary-sub">
                {totalPatients > 0
                  ? `${Math.round((repeatPatients / totalPatients) * 100)}% of total`
                  : "0% of total"}
              </p>
            </div>
          </div>
        </section>

        {/* ============== Search Box Section ============== */}
        <div className="pat-toolbar">
          <div className="pat-search-box">
            <FaSearch className="pat-search-icon" />
            <input
              type="text"
              placeholder="Search patients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* ============== Split Area Section ============== */}
        <div className={`pat-split-area ${selected ? "split-open" : ""}`}>
          {/* ============== List Panel Section ============== */}
          <section className="pat-list-panel">
            <div className="pat-patients-table-header">
              <span>Patient Name</span>
              <span>Age / Gender</span>
              <span>Appointments</span>
              <span>Consultations</span>
              <span>Last Visit</span>
            </div>
            <div className="pat-patient-list">
              {loadError && patients.length === 0 && (
                <div className="pat-empty-list">{loadError}</div>
              )}
              {!loadError && patients.length === 0 && (
                <div className="pat-empty-list">No patients records</div>
              )}
              {patients.length > 0 && filtered.length === 0 && (
                <div className="pat-empty-list">No patients found</div>
              )}
              {visible.map((p) => (
                <div
                  key={p.id}
                  className={`pat-patient-item ${
                    selected?.id === p.id ? "selected" : ""
                  }`}
                  onClick={() => handleSelect(p)}
                >
                  <div className="pat-patient-col pat-name-col">
                    <img src={p.avatar} alt={p.name} className="pat-avatar" />
                    <div className="pat-name-info">
                      <h3>{p.name}</h3>
                      <p className="pat-phone-text">{p.phone}</p>
                    </div>
                  </div>
                  <div className="pat-patient-col">
                    <span className="pat-col-text">
                      {p.age} / {p.gender}
                    </span>
                  </div>
                  <div className="pat-patient-col">
                    <span className="pat-col-text pat-count-text">
                      {p.appointments}
                    </span>
                  </div>
                  <div className="pat-patient-col">
                    <span className="pat-col-text pat-count-text pat-consultations-count">
                      {p.consultations}
                    </span>
                  </div>
                  <div className="pat-patient-col pat-last-col">
                    <span className="pat-col-text">{p.lastVisit}</span>
                    <FaChevronRight className="pat-chevron" />
                  </div>
                </div>
              ))}
            </div>

            {filtered.length > 5 && (
              <div className="pat-view-more-wrap">
                <button
                  className="pat-view-more-btn"
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
              className={`pat-details-panel ${mobileDrawer ? "mobile-open" : ""}`}
            >
              {/* ========== Details Header ========== */}
              <div className="pat-details-header">
                <h3>Patient Details</h3>
                <div className="pat-header-right">
                  <span
                    className={`pat-status-badge ${(selected.status || "").toLowerCase()}`}
                  >
                    {selected.status}
                  </span>
                  <button
                    className="pat-close-btn"
                    onClick={() => {
                      setSelected(null);
                      setMobileDrawer(false);
                    }}
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>

              {/* ========== Profile Section ========== */}
              <div className="pat-profile-section">
                <img
                  src={selected.avatar}
                  alt={selected.name}
                  className="pat-profile-avatar"
                />
                <div className="pat-profile-info">
                  <div className="pat-profile-name-row">
                    <h2>{selected.name}</h2>
                    <span
                      className={`pat-status-badge ${(selected.status || "").toLowerCase()}`}
                    >
                      {selected.status}
                    </span>
                  </div>
                  <p className="pat-profile-meta">
                    {selected.age} Years, {selected.gender}
                  </p>
                  <p className="pat-profile-contact">
                    <FaPhoneAlt /> {selected.phone || "—"}
                  </p>
                  <p className="pat-profile-contact">
                    <FaEnvelope /> {selected.email || "—"}
                  </p>
                  <p className="pat-profile-contact pat-profile-id">
                    <FaIdCard /> <strong>Patient ID:</strong> {selected.id}
                  </p>
                </div>
              </div>

              {/* ========== Detail Tabs ========== */}
              <div className="pat-detail-tabs">
                {detailTabs.map((tab) => (
                  <button key={tab} className={`pat-detail-tab active`}>
                    {tab}
                  </button>
                ))}
              </div>

              {/* ========== Tab Content ========== */}
              <div className="pat-tab-content">
                <div className="pat-overview-section">
                  <h4 className="pat-section-heading">Interaction Summary</h4>
                  <div className="pat-summary-stats-grid">
                    <div className="pat-stat-item">
                      <span className="pat-stat-label">Total Appointments</span>
                      <span className="pat-stat-value">
                        {selected.appointments}
                      </span>
                    </div>
                    <div className="pat-stat-item">
                      <span className="pat-stat-label">Completed</span>
                      <span className="pat-stat-value pat-completed">
                        {selected.completedAppointments}
                      </span>
                    </div>
                    <div className="pat-stat-item">
                      <span className="pat-stat-label">Missed</span>
                      <span className="pat-stat-value pat-missed">
                        {selected.missedAppointments}
                      </span>
                    </div>
                    <div className="pat-stat-item">
                      <span className="pat-stat-label">
                        Total Consultations
                      </span>
                      <span className="pat-stat-value pat-consultations">
                        {selected.consultations}
                      </span>
                    </div>
                    <div className="pat-stat-item">
                      <span className="pat-stat-label">First Visit</span>
                      <span className="pat-stat-value">
                        {selected.firstVisit || "—"}
                      </span>
                    </div>
                    <div className="pat-stat-item">
                      <span className="pat-stat-label">Last Visit</span>
                      <span className="pat-stat-value">
                        {selected.lastVisit || "—"}
                      </span>
                    </div>
                  </div>

                  <h4 className="pat-section-heading pat-timeline-heading">
                    Timeline
                  </h4>
                  {selected.timeline.length === 0 ? (
                    <div className="pat-empty-list">No visit history yet</div>
                  ) : (
                    <div className="pat-timeline">
                      {selected.timeline.map((item, index) => (
                        <div key={index} className="pat-timeline-item">
                          <div className="pat-timeline-icon-wrap">
                            {getTimelineIcon(item.icon)}
                            {index !== selected.timeline.length - 1 && (
                              <div className="pat-timeline-line" />
                            )}
                          </div>
                          <div className="pat-timeline-content">
                            <div className="pat-timeline-top">
                              <span className="pat-timeline-date">
                                {item.date}
                              </span>
                              <span
                                className={`pat-timeline-status ${(item.status || "").toLowerCase()}`}
                              >
                                {item.status}
                              </span>
                            </div>
                            <p className="pat-timeline-type">{item.type}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
};

export default Patients;