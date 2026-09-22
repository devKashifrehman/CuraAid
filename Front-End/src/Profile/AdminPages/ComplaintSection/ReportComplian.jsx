import React, { useContext, useEffect, useRef, useState } from "react";
import {
  FaSearch,
  FaExclamationTriangle,
  FaUserSlash,
  FaBan,
  FaUndo,
  FaCheckCircle,
  FaDownload,
  FaEye,
  FaTimes,
  FaStar,
  FaPaperclip,
  FaClipboardList,
  FaUser,
  FaUserMd,
  FaComments,
  FaShieldAlt,
  FaFileMedical,
  FaChevronDown,
  FaChevronUp,
  FaUserShield,
  FaExclamationCircle,
  FaFlag,
} from "react-icons/fa";
import "./ReportComplian.css";
import axios from "axios";
import { AuthContext } from "../../../HeadFoot/Auth/AuthContext";
import { ThemeContext } from "../../../Theme/ThemeContext";
import Sidebar from "../../Hamburger/sidebar";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

const fileUrl = (path) => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const clean = String(path).replace(/^\/+/, "");
  return /^storage\//i.test(clean)
    ? `${API_BASE_URL}/${clean}`
    : `${API_BASE_URL}/storage/${clean}`;
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

const formatDate = (raw) => {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const complaintStatus = (s) => {
  const map = {
    open: "Open",
    warned: "Warned",
    blocked: "Blocked",
    suspended: "Suspended",
    resolved: "Resolved",
  };
  return map[String(s ?? "").toLowerCase()] || "Open";
};

const isDoctorRole = (role) => String(role ?? "").toLowerCase() === "doctor";

const proofList = (c) => {
  const path = c.proof_path ?? c.proof;
  if (Array.isArray(path)) {
    return path
      .filter(Boolean)
      .map((p) => ({ name: String(p).split("/").pop(), src: fileUrl(p) }));
  }
  if (path) {
    return [{ name: String(path).split("/").pop(), src: fileUrl(path) }];
  }
  return [];
};

const complaintFromBackend = (c, idx) => {
  const complainant = c.complainant ?? {};
  const respondent = c.respondent ?? {};
  const doctor = isDoctorRole(c.complainant_role) ? complainant : respondent;
  const patient = isDoctorRole(c.complainant_role) ? respondent : complainant;
  const specialty = c.specialty ?? "—";
  return {
    id: `CMP-${String(c.id).padStart(5, "0")}`,
    complaintId: c.id,
    doctorName: doctor.name ?? "Doctor",
    doctorId: doctor.id ? `DOC-${String(doctor.id).padStart(4, "0")}` : "",
    doctorUserId: doctor.id ?? null,
    doctorEmail: doctor.email ?? "",
    doctorPhone: doctor.mobile ?? doctor.phone ?? "-",
    specialty,
    doctorAvatar: avatarUrl(doctor.name, doctor.profile_image),
    patientName: patient.name ?? "Patient",
    date: formatDate(c.created_at),
    priority: c.priority
      ? String(c.priority).charAt(0).toUpperCase() +
        String(c.priority).slice(1)
      : "Average",
    category: c.category ?? "General",
    description: c.description ?? "",
    proof: proofList(c),
    status: complaintStatus(c.status),
    resolutionReason: c.resolution_reason ?? "",
    complainantUserId: c.complainant_id ?? null,
    respondentUserId: c.respondent_id ?? null,
    ts: idx,
  };
};

const buildUsers = (complaints, apiUsers) => {
  const rank = { Warned: 1, Suspended: 2, Blocked: 3 };
  const byId = {};
  (apiUsers ?? []).forEach((u) => {
    byId[u.id] = {
      id: `USR-${String(u.id).padStart(5, "0")}`,
      userId: u.id,
      name: u.name ?? "User",
      specialty: u.specialty ?? "—",
      avatar: avatarUrl(u.name, u.profile_image),
      email: u.email ?? "-",
      phone: u.phone ?? "-",
      status:
        u.status === "blocked"
          ? "Blocked"
          : u.status === "suspended"
          ? "Suspended"
          : "Active",
      warnings: u.warnings_count ?? 0,
      reason: u.last_action_reason ?? "",
    };
  });
  complaints.forEach((c) => {
    const uid = c.respondentUserId ?? c.complainantUserId;
    if (!uid) return;
    let status = "Active";
    if (["Warned", "Blocked", "Suspended"].includes(c.status)) {
      status = c.status;
    }
    const prev = byId[uid];
    if (prev) {
      if (
        status !== "Active" &&
        (rank[status] ?? 0) >= (rank[prev.status] ?? 0)
      ) {
        byId[uid] = { ...prev, status, reason: c.resolutionReason || prev.reason };
      }
    } else {
      byId[uid] = {
        id: c.doctorId,
        userId: uid,
        name: c.doctorName,
        specialty: "—",
        avatar: c.doctorAvatar,
        email: c.doctorEmail,
        phone: c.doctorPhone,
        status,
        warnings: 0,
        reason: c.resolutionReason ?? "",
      };
    }
  });
  return Object.values(byId);
};

const feedbackFromBackend = (f, idx) => ({
  id: f.id ? `FB-${String(f.id).padStart(5, "0")}` : `FB-${idx}`,
  userName: f.name ?? "User",
  category: f.category ?? "General Feedback",
  date: formatDate(f.created_at),
  comment: f.message ?? "",
  avatar: avatarUrl(f.name, f.profile_image),
});

const doctorFeedbackFromBackend = (f, idx) => ({
  id: f.id ? `DRFB-${String(f.id).padStart(5, "0")}` : `DRFB-${idx}`,
  patientName: f.patientName ?? "Patient",
  patientAvatar: avatarUrl(f.patientName),
  doctorName: f.doctorName ?? "Doctor",
  doctorAvatar: avatarUrl(f.doctorName),
  rating: Number(f.rating) || 0,
  date: formatDate(f.date ?? f.updated_at),
  comment: f.comment ?? "",
});









const statusLabel = (s) => {
  const map = {
    Open: "rc-status open",
    Warned: "rc-status warned",
    Blocked: "rc-status blocked",
    Suspended: "rc-status suspended",
    Resolved: "rc-status resolved",
  };
  return map[s] || "rc-status open";
};

const userStatusLabel = (s) => {
  const map = {
    Active: "rc-user-status active",
    Warned: "rc-user-status warned",
    Blocked: "rc-user-status blocked",
    Suspended: "rc-user-status suspended",
  };
  return map[s] || "rc-user-status active";
};

const Stars = ({ rating }) => {
  return (
    <span className="rc-stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <FaStar key={n} className={n <= rating ? "filled" : ""} />
      ))}
    </span>
  );
};

const ActionModal = ({ action, onClose, onConfirm }) => {
  const [reason, setReason] = useState("");
  const title =
    action.type === "warn"
      ? "Warn User"
      : action.type === "block"
      ? "Block User"
      : "Suspend User";
  const isWarn = action.type === "warn";
  return (
    <div className="rc-modal-overlay" onClick={onClose}>
      <div className="rc-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="rc-modal-header">
          <div
            className={`rc-modal-title ${
              isWarn
                ? "tone-warn"
                : action.type === "block"
                ? "tone-block"
                : "tone-suspend"
            }`}
          >
            {isWarn ? (
              <FaExclamationTriangle />
            ) : action.type === "block" ? (
              <FaBan />
            ) : (
              <FaUserSlash />
            )}
            <h3>{title}</h3>
          </div>
          <button className="rc-modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="rc-modal-user">
          <img src={action.user.avatar} alt={action.user.name} />
          <div>
            <h4>{action.user.name}</h4>
            <span>
              {action.user.specialty} · {action.user.email}
            </span>
          </div>
        </div>

        <p className="rc-modal-sub">
          {isWarn
            ? "Explain why this user is being warned so they can improve."
            : "Provide a clear reason for this action. This will be shown to the user."}
        </p>

        <textarea
          className="rc-reason-input"
          rows="4"
          placeholder="Write the reason here..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        <div className="rc-modal-actions">
          <button className="rc-modal-btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className={`rc-modal-btn ${isWarn ? "warn" : "danger"}`}
            disabled={!reason.trim()}
            onClick={() => onConfirm(reason.trim())}
          >
            {isWarn ? <FaExclamationTriangle /> : <FaBan />} Confirm {title}
          </button>
        </div>
      </div>
    </div>
  );
};

const downloadProof = (proof) => {
  if (!proof?.src) return;
  const storagePath = proof.src
    .replace(/^https?:\/\/[^/]+\/storage\//, "")
    .replace(/^storage\//, "")
    .replace(/^\/+/, "");
  const downloadUrl = `${API_BASE_URL}/api/download/${encodeURIComponent(storagePath)}`;
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = proof.name || "attachment";
  link.target = "_blank";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const ProofPreviewModal = ({ proof, onClose }) => {
  return (
    <div className="rc-modal-overlay" onClick={onClose}>
      <div className="rc-preview-box" onClick={(e) => e.stopPropagation()}>
        <div className="rc-modal-header">
          <div className="rc-modal-title tone-block">
            <FaEye />
            <h3>Proof Preview</h3>
          </div>
          <button className="rc-modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="rc-preview-meta">
          <FaPaperclip /> {proof.name}
        </div>

        <div className="rc-preview-area">
          <img src={proof.src} alt={proof.name} />
        </div>

        <div className="rc-modal-actions">
          <button
            className="rc-modal-btn warn"
            onClick={() => downloadProof(proof)}
          >
            <FaDownload /> Download
          </button>
          <button className="rc-modal-btn secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const ReportComplian = () => {
  const { darkMode } = useContext(ThemeContext);
  const { token } = useContext(AuthContext);
  const cachedRef = useRef(false);
  const [complaints, setComplaints] = useState(() => {
    try { const c = localStorage.getItem("admin_reports_complaints"); if (c) { cachedRef.current = true; return JSON.parse(c); } return []; } catch { return []; }
  });
  const [users, setUsers] = useState(() => {
    try { const c = localStorage.getItem("admin_reports_users"); return c ? JSON.parse(c) : []; } catch { return []; }
  });
  const [generalFeedback, setGeneralFeedback] = useState(() => {
    try { const c = localStorage.getItem("admin_reports_general"); return c ? JSON.parse(c) : []; } catch { return []; }
  });
  const [doctorFeedback, setDoctorFeedback] = useState(() => {
    try { const c = localStorage.getItem("admin_reports_doctor"); return c ? JSON.parse(c) : []; } catch { return []; }
  });
  const [loading, setLoading] = useState(true);
  const [activeMainTab, setActiveMainTab] = useState("Complaints");
  const [activeSubTab, setActiveSubTab] = useState("All");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [actionModal, setActionModal] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [toast, setToast] = useState(null);
  const [showMore, setShowMore] = useState({});

  const PAGE_SIZE = 5;

  const mainTabs = ["Complaints", "General Feedback", "Feedback/Reports"];
  const subTabs = ["All", "Block Users", "Warn Users", "Suspended Users"];

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    let cancelled = false;
    const apiHeaders = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Accept: "application/json",
    };
    const load = async () => {
      try {
        const [complaintsRes, generalRes, doctorRes, usersRes] =
          await Promise.all([
            axios.get(`${API_BASE_URL}/api/admin/complaints`, {
              headers: apiHeaders,
              timeout: 30000,
            }),
            axios.get(`${API_BASE_URL}/api/admin/feedback`, {
              headers: apiHeaders,
              timeout: 30000,
            }),
            axios.get(`${API_BASE_URL}/api/admin/doctor-feedback`, {
              headers: apiHeaders,
              timeout: 30000,
            }),
            axios.get(`${API_BASE_URL}/api/admin/users`, {
              headers: apiHeaders,
              timeout: 30000,
            }),
          ]);
        if (cancelled) return;
        const comps = (complaintsRes.data?.data ?? []).map(complaintFromBackend);
        const u = buildUsers(comps, usersRes.data?.data ?? []);
        const gFb = (generalRes.data?.data ?? []).map(feedbackFromBackend);
        const dFb = (doctorRes.data?.data ?? []).map(doctorFeedbackFromBackend);
        setComplaints(comps);
        setUsers(u);
        setGeneralFeedback(gFb);
        setDoctorFeedback(dFb);
        localStorage.setItem("admin_reports_complaints", JSON.stringify(comps));
        localStorage.setItem("admin_reports_users", JSON.stringify(u));
        localStorage.setItem("admin_reports_general", JSON.stringify(gFb));
        localStorage.setItem("admin_reports_doctor", JSON.stringify(dFb));
      } catch (error) {
        if (cancelled) return;
        console.error(
          "Failed to load admin reports:",
          error?.response?.data || error?.message,
        );
        if (!cachedRef.current) {
          setComplaints([]);
          setUsers([]);
          setToast({
            message: `API error: ${error?.response?.status || ""} ${
              error?.response?.data?.message ||
              error?.message ||
              "Could not fetch reports"
            }`,
            type: "error",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const toggleShowMore = (key) =>
    setShowMore((prev) => ({ ...prev, [key]: !prev[key] }));

  const visibleItems = (key, list) =>
    showMore[key] ? list : list.slice(0, PAGE_SIZE);

  const updateComplaint = (id, patch) => {
    setComplaints((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );
  };

  const updateUser = (id, patch) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  };

  const applyUserAction = async (complaint, actionType, reason) => {
    const newStatus =
      actionType === "warn"
        ? "Warned"
        : actionType === "block"
        ? "Blocked"
        : "Suspended";
    try {
      await axios.post(
        `${API_BASE_URL}/api/admin/complaints/${complaint.complaintId}/action`,
        { action: actionType, reason },
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            Accept: "application/json",
          },
        },
      );
      updateComplaint(complaint.id, { status: newStatus });
      const uid = complaint.respondentUserId ?? complaint.complainantUserId;
      if (uid) {
        setUsers((prev) => {
          const exists = prev.find((u) => u.userId === uid);
          if (exists) {
            return prev.map((u) =>
              u.userId === uid
                ? {
                    ...u,
                    status: newStatus,
                    reason,
                    warnings:
                      actionType === "warn" ? u.warnings + 1 : u.warnings,
                  }
                : u,
            );
          }
          return [
            ...prev,
            {
              id: complaint.doctorId,
              userId: uid,
              name: complaint.doctorName,
              specialty: complaint.specialty,
              avatar: complaint.doctorAvatar,
              email: complaint.doctorEmail,
              phone: complaint.doctorPhone,
              status: newStatus,
              warnings: actionType === "warn" ? 1 : 0,
              reason,
            },
          ];
        });
      }
      setActionModal(null);
      showToast(`${complaint.doctorName} has been ${newStatus.toLowerCase()}`);
    } catch (error) {
      console.error(
        "Failed to apply complaint action:",
        error?.response?.data || error?.message,
      );
      showToast(
        `API error: ${error?.response?.status || ""} ${
          error?.response?.data?.message ||
          error?.message ||
          "Action failed"
        }`,
        "error",
      );
    }
  };

  const resolveComplaintUser = (c) => {
    const u = users.find((x) => x.name === c.doctorName);
    return (
      u || {
        avatar: c.doctorAvatar,
        name: c.doctorName,
        specialty: c.specialty,
        email: c.doctorId,
      }
    );
  };

  const openActionModal = (type, complaint) => {
    setActionModal({
      type,
      complaint,
      user: resolveComplaintUser(complaint),
    });
  };

  const applyWarnToUser = async (user, reason) => {
    try {
      await axios.post(
        `${API_BASE_URL}/api/admin/users/${user.userId}/warn`,
        { reason },
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            Accept: "application/json",
          },
        },
      );
      updateUser(user.id, {
        warnings: user.warnings + 1,
        reason: reason,
      });
      setActionModal(null);
      showToast(`Warning sent to ${user.name}`);
    } catch (error) {
      console.error(
        "Failed to send warning:",
        error?.response?.data || error?.message,
      );
      showToast(
        `API error: ${error?.response?.status || ""} ${
          error?.response?.data?.message || error?.message || "Warning failed"
        }`,
        "error",
      );
    }
  };

  const reactivateUser = async (user) => {
    try {
      await axios.put(
        `${API_BASE_URL}/api/admin/users/${user.userId}/status`,
        { status: "active", reason: "" },
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            Accept: "application/json",
          },
        },
      );
      updateUser(user.id, { status: "Active", reason: "" });
      showToast(`${user.name} has been reactivated`);
    } catch (error) {
      console.error(
        "Failed to reactivate user:",
        error?.response?.data || error?.message,
      );
      showToast(
        `API error: ${error?.response?.status || ""} ${
          error?.response?.data?.message ||
          error?.message ||
          "Reactivate failed"
        }`,
        "error",
      );
    }
  };

  const reopenComplaint = async (complaint) => {
    try {
      await axios.post(
        `${API_BASE_URL}/api/admin/complaints/${complaint.complaintId}/action`,
        { action: "reopen", reason: "" },
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            Accept: "application/json",
          },
        },
      );
      updateComplaint(complaint.id, { status: "Open" });
      showToast(`${complaint.id} reopened for review`);
    } catch (error) {
      console.error(
        "Failed to reopen complaint:",
        error?.response?.data || error?.message,
      );
      showToast(
        `API error: ${error?.response?.status || ""} ${
          error?.response?.data?.message ||
          error?.message ||
          "Reopen failed"
        }`,
        "error",
      );
    }
  };

  const handleModalConfirm = (reason) => {
    if (!actionModal) return;
    if (actionModal.complaint) {
      applyUserAction(actionModal.complaint, actionModal.type, reason);
    } else {
      applyWarnToUser(actionModal.user, reason);
    }
  };

  const q = search.toLowerCase();

  const filteredComplaints = complaints.filter((c) => {
    const matchSearch =
      c.id.toLowerCase().includes(q) ||
      c.doctorName.toLowerCase().includes(q) ||
      c.patientName.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q);
    return matchSearch;
  });

  const blockedUsers = users.filter((u) => u.status === "Blocked");
  const warnedUsers = users.filter((u) => u.status === "Warned");
  const suspendedUsers = users.filter((u) => u.status === "Suspended");

  const filteredUsers = (list) =>
    list.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.specialty.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );

  const filteredGeneral = generalFeedback.filter(
    (f) =>
      (f.userName || "").toLowerCase().includes(q) ||
      (f.category || "").toLowerCase().includes(q) ||
      (f.comment || "").toLowerCase().includes(q),
  );

  const filteredDoctorFeedback = doctorFeedback.filter(
    (f) =>
      (f.doctorName || "").toLowerCase().includes(q) ||
      (f.patientName || "").toLowerCase().includes(q) ||
      (f.comment || "").toLowerCase().includes(q),
  );

  const stats = {
    total: complaints.length,
    warned: warnedUsers.length,
    blockedSuspended: blockedUsers.length + suspendedUsers.length,
  };

  const renderComplaintList = () => {
    const visible = visibleItems("complaints", filteredComplaints);
    return (
      <div className="rc-list">
        {visible.map((c) => {
          const isExpanded = expanded === c.id;
          const isOpen = c.status === "Open";
          return (
            <div className="rc-card rc-complaint-card" key={c.id}>
              <div className="rc-card-head">
                <img src={c.doctorAvatar} alt={c.doctorName} />
                <div className="rc-card-ids">
                  <h3>{c.doctorName}</h3>
                  <span>
                    {c.specialty} · {c.doctorId}
                  </span>
                </div>
                <span className="rc-complaint-id">
                  <FaClipboardList /> {c.id}
                </span>
                <span className={statusLabel(c.status)}>{c.status}</span>
              </div>

              <div className="rc-card-body">
                <div className="rc-filed-by">
                  <FaUser /> Filed by <strong>{c.patientName}</strong> ·{" "}
                  {c.date}
                </div>
                <div className="rc-category">
                  <FaClipboardList /> {c.category}
                </div>
                <p className={`rc-desc ${isExpanded ? "expanded" : ""}`}>
                  {c.description}
                </p>
                <button
                  className="rc-read-more"
                  onClick={() => setExpanded(isExpanded ? null : c.id)}
                >
                  {isExpanded ? "View Less" : "View More"}{" "}
                  {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                </button>
                <div className="rc-proof">
                  <FaPaperclip />
                  {c.proof.map((p, i) => (
                    <span key={i} className="rc-proof-item">
                      <img
                        src={p.src}
                        alt={p.name}
                        className="rc-proof-thumb"
                      />
                      <span className="rc-proof-name">{p.name}</span>
                      <div className="rc-proof-actions">
                        <button
                          className="rc-proof-btn"
                          title="Preview"
                          onClick={() => setProofPreview(p)}
                        >
                          <FaEye />
                        </button>
                        <button
                          className="rc-proof-btn"
                          title="Download"
                          onClick={() => downloadProof(p)}
                        >
                          <FaDownload />
                        </button>
                      </div>
                    </span>
                  ))}
                </div>
              </div>

              <div className="rc-card-foot">
                {isOpen ? (
                  <>
                    <button
                      className="rc-act warn"
                      onClick={() => openActionModal("warn", c)}
                    >
                      <FaExclamationTriangle /> Warn
                    </button>
                    <button
                      className="rc-act block"
                      onClick={() => openActionModal("block", c)}
                    >
                      <FaBan /> Block
                    </button>
                    <button
                      className="rc-act suspend"
                      onClick={() => openActionModal("suspend", c)}
                    >
                      <FaUserSlash /> Suspend
                    </button>
                  </>
                ) : (
                  <div className="rc-already-actioned">
                    <span>
                      Already {c.status.toLowerCase()} — review complete
                    </span>
                    <button
                      className="rc-act reopen"
                      onClick={() => reopenComplaint(c)}
                    >
                      <FaUndo /> Reopen
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {visible.length === 0 && (
          <div className="rc-empty">
            <FaClipboardList className="rc-empty-icon" />
            <p>No complaints found</p>
          </div>
        )}
        {filteredComplaints.length > PAGE_SIZE && (
          <div className="rc-view-more-wrap">
            <button
              className="rc-view-more-btn"
              onClick={() => toggleShowMore("complaints")}
            >
              {showMore.complaints ? "View Less" : "View More"}{" "}
              {showMore.complaints ? <FaChevronUp /> : <FaChevronDown />}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderUserList = (list, mode) => {
    const filtered = filteredUsers(list);
    const visible = visibleItems(mode, filtered);
    return (
      <div className="rc-list">
        {visible.map((u) => (
          <div className="rc-card rc-user-card" key={u.id}>
            <img src={u.avatar} alt={u.name} />
            <div className="rc-user-info">
              <div className="rc-user-top">
                <h3>{u.name}</h3>
                <span className={userStatusLabel(u.status)}>{u.status}</span>
              </div>
              <span className="rc-user-meta">
                {u.specialty} · {u.email} · {u.phone}
              </span>
              <span className="rc-user-warnings">
                <FaExclamationCircle /> {u.warnings}{" "}
                {u.warnings === 1 ? "warning" : "warnings"}
              </span>
              {u.reason && (
                <div className="rc-user-reason">
                  <FaFlag /> {u.reason}
                </div>
              )}
            </div>
            <div className="rc-user-actions">
              {mode === "warn" ? (
                <button
                  className="rc-act warn"
                  onClick={() => setActionModal({ type: "warn", user: u })}
                >
                  <FaExclamationTriangle /> Send Warning
                </button>
              ) : (
                <button
                  className="rc-act reactivate"
                  onClick={() => reactivateUser(u)}
                >
                  <FaUndo /> Reactivate
                </button>
              )}
            </div>
          </div>
        ))}
        {visible.length === 0 && (
          <div className="rc-empty">
            <FaUserShield className="rc-empty-icon" />
            <p>No users in this section</p>
          </div>
        )}
        {filtered.length > PAGE_SIZE && (
          <div className="rc-view-more-wrap">
            <button
              className="rc-view-more-btn"
              onClick={() => toggleShowMore(mode)}
            >
              {showMore[mode] ? "View Less" : "View More"}{" "}
              {showMore[mode] ? <FaChevronUp /> : <FaChevronDown />}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderGeneralFeedback = () => {
    const visible = visibleItems("general", filteredGeneral);
    return (
      <div className="rc-list">
        {visible.map((f) => (
          <div className="rc-card rc-feedback-card" key={f.id}>
            <img src={f.avatar} alt={f.userName} />
            <div className="rc-fb-info">
              <div className="rc-fb-top">
                <h3>{f.userName}</h3>
              </div>
              <p>{f.comment}</p>
              <span className="rc-fb-meta">
                <FaComments /> {f.category} · {f.date}
              </span>
            </div>
          </div>
        ))}
        {visible.length === 0 && (
          <div className="rc-empty">
            <FaComments className="rc-empty-icon" />
            <p>No general feedback found</p>
          </div>
        )}
        {filteredGeneral.length > PAGE_SIZE && (
          <div className="rc-view-more-wrap">
            <button
              className="rc-view-more-btn"
              onClick={() => toggleShowMore("general")}
            >
              {showMore.general ? "View Less" : "View More"}{" "}
              {showMore.general ? <FaChevronUp /> : <FaChevronDown />}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderDoctorFeedback = () => {
    const visible = visibleItems("doctor", filteredDoctorFeedback);
    return (
      <div className="rc-list">
        {visible.map((f) => (
          <div className="rc-card rc-feedback-card" key={f.id}>
            <img src={f.doctorAvatar} alt={f.doctorName} />
            <div className="rc-fb-info">
              <div className="rc-fb-top">
                <h3>{f.doctorName}</h3>
                <Stars rating={f.rating} />
              </div>
              <p>{f.comment}</p>
              <span className="rc-fb-meta">
                <FaUserMd /> Feedback by {f.patientName} · {f.date}
              </span>
            </div>
          </div>
        ))}
        {visible.length === 0 && (
          <div className="rc-empty">
            <FaUserMd className="rc-empty-icon" />
            <p>No doctor feedback found</p>
          </div>
        )}
        {filteredDoctorFeedback.length > PAGE_SIZE && (
          <div className="rc-view-more-wrap">
            <button
              className="rc-view-more-btn"
              onClick={() => toggleShowMore("doctor")}
            >
              {showMore.doctor ? "View Less" : "View More"}{" "}
              {showMore.doctor ? <FaChevronUp /> : <FaChevronDown />}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="reports-layout">
      <Sidebar />
      <div className={`reports-wrapper ${darkMode ? "dark" : "light"}`}>
        <div className="rc-hero">
          <div className="rc-hero-glow" />
          <div className="rc-hero-icon">
            <FaShieldAlt />
          </div>
          <div className="rc-hero-text">
            <h1>Reports & Complaints Center</h1>
            <p>
              Review patient complaints, manage user actions and analyze
              feedback
            </p>
          </div>
          <div className="rc-hero-badges">
            <span>
              <FaFileMedical /> {stats.total} Complaints
            </span>
          </div>
        </div>

        <div className="rc-stats">
          <div className="rc-stat-card rc-glass">
            <div className="rc-stat-icon total">
              <FaFileMedical />
            </div>
            <div className="rc-stat-info">
              <span>Total Complaints</span>
              <h2>{stats.total}</h2>
              <p>All submissions</p>
            </div>
          </div>
          <div className="rc-stat-card rc-glass">
            <div className="rc-stat-icon warned">
              <FaExclamationCircle />
            </div>
            <div className="rc-stat-info">
              <span>Warned Users</span>
              <h2>{stats.warned}</h2>
              <p>On final notice</p>
            </div>
          </div>
          <div className="rc-stat-card rc-glass">
            <div className="rc-stat-icon blocked">
              <FaUserSlash />
            </div>
            <div className="rc-stat-info">
              <span>Blocked / Suspended</span>
              <h2>{stats.blockedSuspended}</h2>
              <p>Restricted accounts</p>
            </div>
          </div>
        </div>

        <div className="rc-main-tabs">
          {mainTabs.map((t) => (
            <button
              key={t}
              className={`rc-main-tab ${activeMainTab === t ? "active" : ""}`}
              onClick={() => setActiveMainTab(t)}
            >
              {t === "Complaints" ? (
                <FaClipboardList />
              ) : t === "General Feedback" ? (
                <FaComments />
              ) : (
                <FaUserMd />
              )}
              {t}
            </button>
          ))}
        </div>

        <div className="rc-toolbar">
          <div className="rc-search-box">
            <FaSearch className="rc-search-icon" />
            <input
              type="text"
              placeholder={
                activeMainTab === "Complaints"
                  ? "Search by complaint ID..."
                  : activeMainTab === "General Feedback"
                  ? "Search general feedback..."
                  : "Search doctor feedback..."
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        {activeMainTab === "Complaints" && (
          <>
            <div className="rc-sub-tabs">
              {subTabs.map((t) => {
                const count =
                  t === "All"
                    ? filteredComplaints.length
                    : t === "Block Users"
                    ? blockedUsers.length
                    : t === "Warn Users"
                    ? warnedUsers.length
                    : suspendedUsers.length;
                return (
                  <button
                    key={t}
                    className={`rc-sub-tab ${
                      activeSubTab === t ? "active" : ""
                    }`}
                    onClick={() => setActiveSubTab(t)}
                  >
                    {t}
                    <span className="rc-sub-count">{count}</span>
                  </button>
                );
              })}
            </div>

            {activeSubTab === "All" && renderComplaintList()}
            {activeSubTab === "Block Users" && renderUserList(blockedUsers, "block")}
            {activeSubTab === "Warn Users" && renderUserList(warnedUsers, "warn")}
            {activeSubTab === "Suspended Users" &&
              renderUserList(suspendedUsers, "suspend")}
          </>
        )}

        {activeMainTab === "General Feedback" && renderGeneralFeedback()}
        {activeMainTab === "Feedback/Reports" && renderDoctorFeedback()}

        {actionModal && (
          <ActionModal
            action={actionModal}
            onClose={() => setActionModal(null)}
            onConfirm={handleModalConfirm}
          />
        )}

        {proofPreview && (
          <ProofPreviewModal
            proof={proofPreview}
            onClose={() => setProofPreview(null)}
          />
        )}

        {toast && (
          <div className={`rc-toast ${toast.type}`}>
            {toast.type === "success" ? <FaCheckCircle /> : <FaBan />}{" "}
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportComplian;
