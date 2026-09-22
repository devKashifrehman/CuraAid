import React, { useContext, useState } from "react";
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
import "./Patients.css";
import avatar1 from "../../images/1.jpg";
import avatar2 from "../../images/3.jpg";
import avatar3 from "../../images/4.jpg";
import avatar4 from "../../images/5.jpg";
import avatar5 from "../../images/6.jpg";
import avatar6 from "../../images/7.jpg";
import avatar7 from "../../images/8.jpg";
import { ThemeContext } from "../../Theme/ThemeContext";
import { AuthContext } from "../../HeadFoot/Auth/AuthContext";
import Sidebar from "../Hamburger/sidebar";

//==================== Define Patients Data ============================
const patientsData = [
  {
    id: "PAT-001",
    name: "Ahmed Khan",
    age: 32,
    gender: "Male",
    phone: "0312-3456789",
    email: "ahmed.khan@email.com",
    status: "Active",
    avatar: avatar1,
    appointments: 5,
    consultations: 3,
    lastVisit: "12 Jun 2026",
    firstVisit: "10 Jan 2026",
    completedAppointments: 4,
    missedAppointments: 1,
    timeline: [
      {
        date: "12 Jun 2026",
        type: "Appointment",
        status: "Completed",
        icon: "appointment",
      },
      {
        date: "12 Jun 2026",
        type: "Consultation",
        status: "Completed",
        icon: "consultation",
      },
      {
        date: "05 May 2026",
        type: "Appointment",
        status: "Completed",
        icon: "appointment",
      },
      {
        date: "05 May 2026",
        type: "Consultation",
        status: "Completed",
        icon: "consultation",
      },
      {
        date: "10 Jan 2026",
        type: "First Visit",
        status: "Completed",
        icon: "firstvisit",
      },
    ],
  },
  {
    id: "PAT-002",
    name: "Sara Ali",
    age: 28,
    gender: "Female",
    phone: "0321-9876543",
    email: "sara.ali@email.com",
    status: "Active",
    avatar: avatar2,
    appointments: 3,
    consultations: 2,
    lastVisit: "10 Jun 2026",
    firstVisit: "15 Feb 2026",
    completedAppointments: 3,
    missedAppointments: 0,
    timeline: [
      {
        date: "10 Jun 2026",
        type: "Appointment",
        status: "Completed",
        icon: "appointment",
      },
      {
        date: "10 Jun 2026",
        type: "Consultation",
        status: "Completed",
        icon: "consultation",
      },
      {
        date: "15 Feb 2026",
        type: "First Visit",
        status: "Completed",
        icon: "firstvisit",
      },
    ],
  },
  {
    id: "PAT-003",
    name: "Muhammad Usman",
    age: 45,
    gender: "Male",
    phone: "0300-1122334",
    email: "usman.m@email.com",
    status: "Active",
    avatar: avatar3,
    appointments: 7,
    consultations: 5,
    lastVisit: "08 Jun 2026",
    firstVisit: "05 Dec 2025",
    completedAppointments: 6,
    missedAppointments: 1,
    timeline: [
      {
        date: "08 Jun 2026",
        type: "Appointment",
        status: "Completed",
        icon: "appointment",
      },
      {
        date: "08 Jun 2026",
        type: "Consultation",
        status: "Completed",
        icon: "consultation",
      },
      {
        date: "05 Dec 2025",
        type: "First Visit",
        status: "Completed",
        icon: "firstvisit",
      },
    ],
  },
  {
    id: "PAT-004",
    name: "Fatima Noor",
    age: 24,
    gender: "Female",
    phone: "0315-6677889",
    email: "fatima.n@email.com",
    status: "Inactive",
    avatar: avatar4,
    appointments: 2,
    consultations: 1,
    lastVisit: "05 Jun 2026",
    firstVisit: "20 Mar 2026",
    completedAppointments: 2,
    missedAppointments: 0,
    timeline: [
      {
        date: "05 Jun 2026",
        type: "Appointment",
        status: "Completed",
        icon: "appointment",
      },
      {
        date: "20 Mar 2026",
        type: "First Visit",
        status: "Completed",
        icon: "firstvisit",
      },
    ],
  },
  {
    id: "PAT-005",
    name: "Bilal Ahmed",
    age: 36,
    gender: "Male",
    phone: "0309-4455667",
    email: "bilal.a@email.com",
    status: "Active",
    avatar: avatar5,
    appointments: 4,
    consultations: 3,
    lastVisit: "02 Jun 2026",
    firstVisit: "01 Jan 2026",
    completedAppointments: 3,
    missedAppointments: 1,
    timeline: [
      {
        date: "02 Jun 2026",
        type: "Appointment",
        status: "Completed",
        icon: "appointment",
      },
      {
        date: "02 Jun 2026",
        type: "Consultation",
        status: "Completed",
        icon: "consultation",
      },
      {
        date: "01 Jan 2026",
        type: "First Visit",
        status: "Completed",
        icon: "firstvisit",
      },
    ],
  },
  {
    id: "PAT-006",
    name: "Hina Tariq",
    age: 29,
    gender: "Female",
    phone: "0314-5566778",
    email: "hina.t@email.com",
    status: "Active",
    avatar: avatar6,
    appointments: 6,
    consultations: 4,
    lastVisit: "01 Jun 2026",
    firstVisit: "15 Mar 2026",
    completedAppointments: 5,
    missedAppointments: 1,
    timeline: [
      {
        date: "01 Jun 2026",
        type: "Appointment",
        status: "Completed",
        icon: "appointment",
      },
      {
        date: "01 Jun 2026",
        type: "Consultation",
        status: "Completed",
        icon: "consultation",
      },
      {
        date: "15 Mar 2026",
        type: "First Visit",
        status: "Completed",
        icon: "firstvisit",
      },
    ],
  },
  {
    id: "PAT-007",
    name: "Zain Ali",
    age: 41,
    gender: "Male",
    phone: "0310-9988776",
    email: "zain.a@email.com",
    status: "Active",
    avatar: avatar7,
    appointments: 8,
    consultations: 6,
    lastVisit: "30 May 2026",
    firstVisit: "10 Nov 2025",
    completedAppointments: 7,
    missedAppointments: 1,
    timeline: [
      {
        date: "30 May 2026",
        type: "Appointment",
        status: "Completed",
        icon: "appointment",
      },
      {
        date: "30 May 2026",
        type: "Consultation",
        status: "Completed",
        icon: "consultation",
      },
      {
        date: "10 Nov 2025",
        type: "First Visit",
        status: "Completed",
        icon: "firstvisit",
      },
    ],
  },
];

// ==================== Main Component ====================
const Patients = () => {
  const { darkMode } = useContext(ThemeContext);
  const { isDoctor } = useContext(AuthContext);

  // ==================== State Management ====================
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [mobileDrawer, setMobileDrawer] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // ==================== Tabs Configuration ====================
  // Only Overview tab remains
  const detailTabs = ["Overview"];

  // ==================== Data Processing ====================
  const filtered = patientsData.filter((p) => {
    const searchLower = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(searchLower) ||
      p.phone.toLowerCase().includes(searchLower) ||
      p.id.toLowerCase().includes(searchLower)
    );
  });

  const visible = showAll ? filtered : filtered.slice(0, 5);

  // ==================== Summary Stats ====================
  const totalPatients = patientsData.length;
  const totalAppointments = patientsData.reduce(
    (sum, p) => sum + p.appointments,
    0,
  );
  const totalConsultations = patientsData.reduce(
    (sum, p) => sum + p.consultations,
    0,
  );
  const repeatPatients = patientsData.filter((p) => p.appointments > 1).length;

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
              <p className="pat-summary-sub">+12 this month</p>
            </div>
          </div>

          <div className="pat-summary-card">
            <div className="pat-icon-box pat-appointments-icon">
              <FaCalendarAlt />
            </div>
            <div className="pat-summary-info">
              <span className="pat-summary-label">Total Appointments</span>
              <h2 className="pat-summary-count">{totalAppointments}</h2>
              <p className="pat-summary-sub">+18 this month</p>
            </div>
          </div>

          <div className="pat-summary-card">
            <div className="pat-icon-box pat-consultations-icon">
              <FaStethoscope />
            </div>
            <div className="pat-summary-info">
              <span className="pat-summary-label">Total Consultations</span>
              <h2 className="pat-summary-count">{totalConsultations}</h2>
              <p className="pat-summary-sub">+10 this month</p>
            </div>
          </div>

          <div className="pat-summary-card">
            <div className="pat-icon-box pat-repeat-icon">
              <FaUserCheck />
            </div>
            <div className="pat-summary-info">
              <span className="pat-summary-label">Repeat Patients</span>
              <h2 className="pat-summary-count">{repeatPatients}</h2>
              <p className="pat-summary-sub">100% of total</p>
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
              {visible.length === 0 && (
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
                    className={`pat-status-badge ${selected.status.toLowerCase()}`}
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
                      className={`pat-status-badge ${selected.status.toLowerCase()}`}
                    >
                      {selected.status}
                    </span>
                  </div>
                  <p className="pat-profile-meta">
                    {selected.age} Years, {selected.gender}
                  </p>
                  <p className="pat-profile-contact">
                    <FaPhoneAlt /> {selected.phone}
                  </p>
                  <p className="pat-profile-contact">
                    <FaEnvelope /> {selected.email}
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
                        {selected.firstVisit}
                      </span>
                    </div>
                    <div className="pat-stat-item">
                      <span className="pat-stat-label">Last Visit</span>
                      <span className="pat-stat-value">
                        {selected.lastVisit}
                      </span>
                    </div>
                  </div>

                  <h4 className="pat-section-heading pat-timeline-heading">
                    Timeline
                  </h4>
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
                              className={`pat-timeline-status ${item.status.toLowerCase()}`}
                            >
                              {item.status}
                            </span>
                          </div>
                          <p className="pat-timeline-type">{item.type}</p>
                        </div>
                      </div>
                    ))}
                  </div>
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
