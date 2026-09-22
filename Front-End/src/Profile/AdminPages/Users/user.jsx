import React, { useContext, useEffect, useRef, useState } from "react";
import {
  FaSearch,
  FaUsers,
  FaUserMd,
  FaUserInjured,
  FaChevronRight,
  FaChevronDown,
  FaChevronUp,
  FaTimes,
  FaEnvelope,
  FaPhoneAlt,
  FaIdCard,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaCheckCircle,
  FaHourglassHalf,
  FaUserCheck,
  FaUserSlash,
  FaStethoscope,
  FaVenusMars,
  FaShieldAlt,
} from "react-icons/fa";
import "./user.css";
import axios from "axios";
import { AuthContext } from "../../../HeadFoot/Auth/AuthContext";
import { ThemeContext } from "../../../Theme/ThemeContext";
import Sidebar from "../../Hamburger/sidebar";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

const statusName = (s) => {
  const map = {
    active: "Active",
    inactive: "Inactive",
    suspended: "Suspended",
    blocked: "Blocked",
  };
  return map[String(s ?? "").toLowerCase()] || "Active";
};

const placeholderAvatar = (name) => {
  const initials =
    String(name || "?")
      .replace(/^Dr\.\s*/i, "")
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0].toUpperCase())
      .join("")
      .slice(0, 2) || "?";
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%232563eb'/><stop offset='1' stop-color='%237c3aed'/></linearGradient></defs><rect width='96' height='96' rx='48' fill='url(%23g)'/><text x='48' y='60' font-family='Segoe UI,Arial,sans-serif' font-size='36' font-weight='600' fill='%23ffffff' text-anchor='middle'>${initials}</text></svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
};

const avatarUrl = (name, image) => {
  if (image) {
    if (/^https?:\/\//i.test(image)) return image;
    if (image.startsWith("/")) return `${API_BASE_URL}${image}`;
    if (image.startsWith("data:")) return image;
    return `${API_BASE_URL}/storage/${image}`;
  }
  return placeholderAvatar(name);
};

const mapUser = (u, idx) => ({
  id: `USR-${String(u.id).padStart(5, "0")}`,
  userId: u.id,
  name: u.name ?? "Unknown",
  role: u.role === "Doctor" ? "Doctor" : "Patient",
  email: u.email ?? "-",
  phone: u.phone ?? "-",
  gender: u.gender ?? "—",
  cnic: "—",
  joined: u.joined ?? "—",
  location: u.address ?? "—",
  avatar: avatarUrl(u.name, u.profile_image),
  specialty: u.specialty ?? "—",
  verification:
    u.is_verified === true
      ? "Verified"
      : u.role === "Doctor"
      ? "Pending"
      : "—",
  doctorProfileId: u.doctor_profile_id ?? null,
  warnings: u.warnings_count ?? 0,
  reason: u.last_action_reason ?? "",
  status: statusName(u.status),
  ts: idx,
});

const roleClass = (r) => {
  if (r === "Doctor") return "usr-role usr-role-doctor";
  if (r === "Patient") return "usr-role usr-role-patient";
  return "usr-role usr-role-admin";
};

const statusClass = (s) => {
  if (s === "Blocked") return "usr-status usr-status-blocked";
  if (s === "Suspended") return "usr-status usr-status-suspended";
  return "usr-status usr-status-active";
};

const verifyClass = (v) => {
  if (v === "Verified") return "usr-verify usr-verify-ok";
  if (v === "Pending") return "usr-verify usr-verify-pending";
  return "usr-verify usr-verify-rejected";
};

const SummaryCards = ({ counts }) => {
  return (
    <section className="usr-summary-section">
      <div className="usr-summary-grid">
        <div className="usr-summary-card usr-glass">
          <div className="usr-icon-box usr-total-icon">
            <FaUsers />
          </div>
          <div className="usr-summary-info">
            <span className="usr-summary-label">Total Users</span>
            <h2 className="usr-summary-count">{counts.total}</h2>
            <p className="usr-summary-sub">All Registered Users</p>
          </div>
        </div>
        <div className="usr-summary-card usr-glass">
          <div className="usr-icon-box usr-doctor-icon">
            <FaUserMd />
          </div>
          <div className="usr-summary-info">
            <span className="usr-summary-label">Doctors</span>
            <h2 className="usr-summary-count">{counts.doctors}</h2>
            <p className="usr-summary-sub">Verified & Pending</p>
          </div>
        </div>
        <div className="usr-summary-card usr-glass">
          <div className="usr-icon-box usr-patient-icon">
            <FaUserInjured />
          </div>
          <div className="usr-summary-info">
            <span className="usr-summary-label">Patients</span>
            <h2 className="usr-summary-count">{counts.patients}</h2>
            <p className="usr-summary-sub">Active Accounts</p>
          </div>
        </div>
        <div className="usr-summary-card usr-glass">
          <div className="usr-icon-box usr-pending-icon">
            <FaHourglassHalf />
          </div>
          <div className="usr-summary-info">
            <span className="usr-summary-label">Pending Verification</span>
            <h2 className="usr-summary-count">{counts.pending}</h2>
            <p className="usr-summary-sub">Awaiting Review</p>
          </div>
        </div>
      </div>
    </section>
  );
};

const UsersTabs = ({ tabs, activeTab, setActiveTab, counts }) => {
  return (
    <div className="usr-tabs">
      {tabs.map((t) => (
        <button
          key={t}
          className={`usr-tab-pill ${activeTab === t ? "active" : ""}`}
          onClick={() => setActiveTab(t)}
        >
          {t}
          <span className="usr-tab-count">{counts[t] ?? 0}</span>
        </button>
      ))}
    </div>
  );
};

const UserItem = ({ user, isSelected, onSelect }) => {
  return (
    <div
      className={`usr-item ${isSelected ? "selected" : ""}`}
      onClick={() => onSelect(user)}
    >
      <img src={user.avatar} alt={user.name} className="usr-avatar" />
      <div className="usr-item-mid">
        <h3>{user.name}</h3>
        <p className="usr-item-meta">
          {user.role === "Doctor" ? user.specialty : user.email}
        </p>
      </div>
      <div className="usr-item-info">
        <span className={roleClass(user.role)}>{user.role}</span>
        <span className={verifyClass(user.verification)}>{user.verification}</span>
      </div>
      <span className={statusClass(user.status)}>{user.status}</span>
      <FaChevronRight className="usr-chevron" />
    </div>
  );
};

const UserDetails = ({ user, onClose, mobileDrawer, onToggle, onVerify }) => {
  return (
    <aside
      className={`usr-details-panel usr-glass ${mobileDrawer ? "mobile-open" : ""}`}
    >
      <div className="usr-details-header">
        <h3>User Details</h3>
        <div className="usr-header-right">
          <span className={statusClass(user.status)}>{user.status}</span>
          <button className="usr-close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
      </div>

      <div className="usr-user-info">
        <img src={user.avatar} alt={user.name} />
        <div>
          <h2>{user.name}</h2>
          <span className={roleClass(user.role)}>{user.role}</span>
          <p className="usr-contact">
            <FaPhoneAlt /> {user.phone}
          </p>
          <p className="usr-contact">
            <FaEnvelope /> {user.email}
          </p>
        </div>
      </div>

      <div className="usr-info-grid">
        <div>
          <span className="usr-info-label">User ID</span>
          <p>{user.id}</p>
        </div>
        <div>
          <span className="usr-info-label">Gender</span>
          <p>
            <FaVenusMars /> {user.gender}
          </p>
        </div>
        <div>
          <span className="usr-info-label">CNIC</span>
          <p>
            <FaIdCard /> {user.cnic}
          </p>
        </div>
        <div>
          <span className="usr-info-label">Joined On</span>
          <p>
            <FaCalendarAlt /> {user.joined}
          </p>
        </div>
        <div>
          <span className="usr-info-label">Location</span>
          <p>
            <FaMapMarkerAlt /> {user.location}
          </p>
        </div>
        <div>
          <span className="usr-info-label">Verification</span>
          <p>
            <span className={verifyClass(user.verification)}>
              {user.verification}
            </span>
          </p>
        </div>
      </div>

      {user.role === "Doctor" && (
        <div className="usr-section">
          <div className="usr-section-title">
            <FaStethoscope className="usr-sec-icon specialty" /> Specialty
          </div>
          <div className="usr-chips">
            <span className="usr-chip">{user.specialty}</span>
          </div>
        </div>
      )}

      <div className="usr-section">
        <div className="usr-section-title">
          <FaShieldAlt className="usr-sec-icon account" /> Account Actions
        </div>
        {user.status === "Blocked" || user.status === "Suspended" ? (
          <button className="usr-action-btn activate" onClick={() => onToggle(user)}>
            <FaUserCheck /> Restore Account
          </button>
        ) : (
          <button className="usr-action-btn suspend" onClick={() => onToggle(user)}>
            <FaUserSlash /> Suspend Account
          </button>
        )}
        {user.verification !== "Verified" && user.role === "Doctor" && (
          <button className="usr-action-btn verify" onClick={() => onVerify(user)}>
            <FaCheckCircle /> Mark as Verified
          </button>
        )}
      </div>
    </aside>
  );
};

const Users = () => {
  const { darkMode } = useContext(ThemeContext);
  const { token } = useContext(AuthContext);
  const cachedRef = useRef(false);
  const [users, setUsers] = useState(() => {
    try {
      const cached = localStorage.getItem("admin_users_cache");
      if (cached) { cachedRef.current = true; return JSON.parse(cached); }
      return [];
    } catch { return []; }
  });
  const [loading, setLoading] = useState(() => !cachedRef.current);
  const [activeTab, setActiveTab] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [mobileDrawer, setMobileDrawer] = useState(false);
  const [toast, setToast] = useState(null);

  const tabs = ["All", "Doctors", "Patients"];

  const filtered = users
    .filter((u) => {
      const matchesTab =
        activeTab === "All" ||
        (activeTab === "Doctors" && u.role === "Doctor") ||
        (activeTab === "Patients" && u.role === "Patient");
      const matchesRole =
        roleFilter === "All Roles" || u.role === roleFilter;
      const q = search.toLowerCase();
      const matchesSearch =
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q) ||
        u.location.toLowerCase().includes(q) ||
        (u.specialty !== "—" && u.specialty.toLowerCase().includes(q));
      return matchesTab && matchesRole && matchesSearch;
    })
    .sort((a, b) => b.ts - a.ts);

  const visible = showAll ? filtered : filtered.slice(0, 6);

  const counts = {
    total: users.length,
    doctors: users.filter((u) => u.role === "Doctor").length,
    patients: users.filter((u) => u.role === "Patient").length,
    pending: users.filter((u) => u.verification === "Pending").length,
  };

  const tabCounts = {
    All: users.length,
    Doctors: counts.doctors,
    Patients: counts.patients,
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    let cancelled = false;
    const fetchUsers = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/admin/users`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            Accept: "application/json",
          },
          timeout: 30000,
        });
        if (cancelled) return;
        const list = response.data?.data ?? response.data ?? [];
        const mapped = list.map(mapUser);
        setUsers(mapped);
        setSelected(null);
        localStorage.setItem("admin_users_cache", JSON.stringify(mapped));
      } catch (error) {
        if (cancelled) return;
        console.error(
          "Failed to fetch users:",
          error?.response?.data || error?.message,
        );
        setToast(
          `API error: ${error?.response?.status || ""} ${
            error?.response?.data?.message ||
            error?.message ||
            "Could not fetch users"
          }`,
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchUsers();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const updateUser = (id, patch) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
    setSelected((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev));
  };

  const handleSelect = (u) => {
    setSelected(u);
    if (window.innerWidth <= 900) setMobileDrawer(true);
  };

  const handleCloseDetails = () => {
    setSelected(null);
    setMobileDrawer(false);
  };

  const handleToggleStatus = async (u) => {
    const restoring = u.status === "Blocked" || u.status === "Suspended";
    const nextStatus = restoring ? "active" : "suspended";
    const label = restoring ? "Active" : "Suspended";
    try {
      await axios.put(
        `${API_BASE_URL}/api/admin/users/${u.userId}/status`,
        { status: nextStatus, reason: "" },
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            Accept: "application/json",
          },
        },
      );
      updateUser(u.id, { status: label });
      showToast(`${u.name} ${restoring ? "restored" : "suspended"}`);
    } catch (error) {
      console.error(
        "Failed to update user status:",
        error?.response?.data || error?.message,
      );
      showToast(
        `API error: ${error?.response?.status || ""} ${
          error?.response?.data?.message || error?.message || "Update failed"
        }`,
      );
    }
  };

  const handleVerify = async (u) => {
    if (!u.doctorProfileId) {
      showToast("No doctor profile found for this user");
      return;
    }
    try {
      await axios.put(
        `${API_BASE_URL}/api/admin/doctors/${u.doctorProfileId}/status`,
        { status: "approved", rejection_reason: null },
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            Accept: "application/json",
          },
        },
      );
      updateUser(u.id, { verification: "Verified" });
      showToast(`${u.name} marked as verified`);
    } catch (error) {
      console.error(
        "Failed to verify doctor:",
        error?.response?.data || error?.message,
      );
      showToast(
        `API error: ${error?.response?.status || ""} ${
          error?.response?.data?.message || error?.message || "Verify failed"
        }`,
      );
    }
  };

  return (
    <div className="users-layout">
      <Sidebar />
      <div className={`users-wrapper ${darkMode ? "dark" : "light"}`}>
        <header className="usr-header">
          <div className="usr-page-header">
            <div className="usr-page-header-right">
              <h1 className="usr-page-title">User Management</h1>
              <p className="usr-page-subtitle">
                Manage all doctors and patients on the platform
              </p>
            </div>
          </div>
        </header>

        <SummaryCards counts={counts} />

        <div className="usr-toolbar">
          <div className="usr-search-box">
            <FaSearch className="usr-search-icon" />
            <input
              type="text"
              placeholder="Search by name, email, CNIC, location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={loading}
            />
          </div>
          <select
            className="usr-filter-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            disabled={loading}
          >
            <option>All Roles</option>
            <option>Doctor</option>
            <option>Patient</option>
          </select>
        </div>

        <UsersTabs
          tabs={tabs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          counts={tabCounts}
        />

        <div className={`usr-split-area ${selected ? "split-open" : ""}`}>
          <section className="usr-list-panel">
            <div className="usr-user-list">
              {visible.map((u) => (
                <UserItem
                  key={u.id}
                  user={u}
                  isSelected={selected?.id === u.id}
                  onSelect={handleSelect}
                />
              ))}
              {visible.length === 0 && (
                <div className="usr-empty">
                  <FaUsers className="usr-empty-icon" />
                  <p>No users found</p>
                </div>
              )}
            </div>

            {filtered.length > 6 && (
              <div className="usr-view-more-wrap">
                <button
                  className="usr-view-more-btn"
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll ? "View Less" : "View More"}{" "}
                  {showAll ? <FaChevronUp /> : <FaChevronDown />}
                </button>
              </div>
            )}
          </section>

          <section className="usr-Details">
            {selected && (
              <UserDetails
                user={selected}
                onClose={handleCloseDetails}
                mobileDrawer={mobileDrawer}
                onToggle={handleToggleStatus}
                onVerify={handleVerify}
              />
            )}
          </section>
        </div>
      </div>

      {toast && (
        <div className="usr-toast">
          <FaCheckCircle /> {toast}
        </div>
      )}
    </div>
  );
};

export default Users;
