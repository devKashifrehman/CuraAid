import React, { useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  FaSearch,
  FaChevronRight,
  FaChevronDown,
  FaChevronUp,
  FaTimes,
  FaCheck,
  FaExclamationTriangle,
  FaDownload,
  FaEye,
  FaFileAlt,
  FaFilePdf,
  FaIdCard,
  FaGraduationCap,
  FaHeartbeat,
  FaBriefcase,
  FaEnvelope,
  FaPhoneAlt,
  FaFolderOpen,   
  FaHourglassHalf,
  FaCheckCircle,
  FaSyncAlt,
} from "react-icons/fa";
import "./Documents.css";
import { ThemeContext } from "../../../Theme/ThemeContext";
import { AuthContext } from "../../../HeadFoot/Auth/AuthContext";
import Sidebar from "../../Hamburger/sidebar";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

const ADMIN_DOCTORS_API = `${API_BASE_URL}/api/admin/doctors`;

const statusClass = (s) => {
  if (s === "Approved") return "doc-status doc-approved";
  if (s === "Objected") return "doc-status doc-objected";
  return "doc-status doc-pending";
};

const docIcon = (type) => {
  if (type === "license") return <FaIdCard />;
  if (type === "cnic") return <FaFileAlt />;
  if (type === "pdf") return <FaFilePdf />;
  return <FaGraduationCap />;
};

const formatDate = (v) => {
  if (!v || v === "-") return "-";
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return v;
    const day = d.getDate();
    const mon = d.toLocaleString("en-US", { month: "short" });
    const yr = d.getFullYear();
    const hr = d.getHours();
    const min = String(d.getMinutes()).padStart(2, "0");
    const ampm = hr >= 12 ? "PM" : "AM";
    const h = hr % 12 || 12;
    return `${day} ${mon} ${yr}, ${h}:${min} ${ampm}`;
  } catch {
    return v;
  }
};

// ============================================
// NORMALIZE BACKEND DOCTOR PROFILES -> UI ROW
// ============================================
const toList = (v) => {
  if (Array.isArray(v)) return v;
  if (v && Array.isArray(v.data)) return v.data;
  return [];
};

const normalizeQualifications = (q) => {
  if (Array.isArray(q)) {
    return q.map((item) =>
      typeof item === "string"
        ? { degree: item, institution: "", year: "", image: null }
        : {
            degree: item.degree ?? item.title ?? item.name ?? "Qualification",
            institution: item.institution ?? item.university ?? item.school ?? "",
            year: item.year ?? item.graduation_year ?? "",
            image: item.image ?? item.certificate ?? item.document ?? null,
          },
    );
  }
  return [];
};

const normalizeExperiences = (e) => {
  if (Array.isArray(e)) {
    return e.map((item) =>
      typeof item === "string"
        ? { designation: item, organization: "", from: "", to: "", certificate: null }
        : {
            designation:
              item.designation ?? item.title ?? item.role ?? "Experience",
            organization:
              item.organization ?? item.hospital ?? item.employer ?? "",
            from: item.from ?? item.start_date ?? item.startYear ?? "",
            to: item.to ?? item.end_date ?? item.endYear ?? "",
            certificate: item.certificate ?? item.document ?? null,
          },
    );
  }
  return [];
};

const normalizeSpecialties = (s) => {
  if (Array.isArray(s)) return s.map((x) => String(x)).filter(Boolean);
  if (typeof s === "string") {
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.map((x) => String(x));
    } catch {
      // plain string fallback below
    }
    return s ? [s] : [];
  }
  return [];
};

const fileUrl = (base, path) => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const clean = String(path).replace(/^\/+/, "");
  return /^storage\//i.test(clean)
    ? `${base}/${clean}`
    : `${base}/storage/${clean}`;
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

const docFromBackend = (profile, idx) => {
  const base = API_BASE_URL;
  const statusRaw = (profile.status ?? profile.verification_status ?? "pending")
    .toString()
    .toLowerCase();
  const status =
    statusRaw === "approved" || statusRaw === "verified"
      ? "Approved"
      : statusRaw === "objected" || statusRaw === "rejected"
      ? "Objected"
      : "Pending";
  const name =
    profile.user?.name ??
    profile.name ??
    profile.full_name ??
    profile.FullName ??
    profile.doctor_name ??
    profile.fullName ??
    "Dr. N/A";
  const specialties = normalizeSpecialties(profile.specialties);
  const qualifications = normalizeQualifications(
    profile.qualifications ?? profile.qualification,
  );
  const experiences = normalizeExperiences(
    profile.experiences ?? profile.experience,
  );

  const documents = [];
  const licensePath =
    profile.license_image ??
    profile.licenseImage ??
    profile.pmdc_license;
  if (licensePath)
    documents.push({
      name: "License",
      type: "license",
      size: "",
      url: fileUrl(base, licensePath),
      docKey: "license_image",
    });
  // Extract qualification images from INSIDE each qualification object
  qualifications.forEach((q, i) => {
    const imgPath = q.image ?? q.certificate ?? q.document ?? null;
    if (imgPath) {
      documents.push({
        name: q.degree ? `Degree ${i + 1} (${q.degree})` : `Degree ${i + 1}`,
        type: "certificate",
        size: "",
        url: fileUrl(base, imgPath),
        docKey: `qualification_${i}`,
      });
    }
  });
  // Also check top-level qualification_images fields
  (profile.qualification_images ??
    profile.qualificationImage ??
    profile.qualifications_certificates ??
    [])
    .forEach((p, i) => {
      if (p) {
        const isDuplicate = qualifications.some((q) => {
          const img = q.image ?? q.certificate ?? q.document;
          return img && fileUrl(base, img) === fileUrl(base, p);
        });
        if (!isDuplicate) {
          documents.push({
            name: `Qualification ${qualifications.length + i + 1}`,
            type: "certificate",
            size: "",
            url: fileUrl(base, p),
            docKey: `qualification_${qualifications.length + i}`,
          });
        }
      }
    });
  // Extract experience certificates from INSIDE each experience object
  experiences.forEach((e, i) => {
    const certPath = e.certificate ?? e.document ?? null;
    if (certPath) {
      documents.push({
        name: e.designation ? `Experience ${i + 1} (${e.designation})` : `Experience ${i + 1}`,
        type: "certificate",
        size: "",
        url: fileUrl(base, certPath),
        docKey: `experience_${i}`,
      });
    }
  });
  // Also check top-level experience_certificates fields
  (profile.experience_certificates ??
    profile.experienceCertificate ??
    profile.work_experience_files ??
    [])
    .forEach((p, i) => {
      if (p) {
        const isDuplicate = experiences.some((e) => {
          const cert = e.certificate ?? e.document;
          return cert && fileUrl(base, cert) === fileUrl(base, p);
        });
        if (!isDuplicate) {
          documents.push({
            name: `Experience ${experiences.length + i + 1}`,
            type: "certificate",
            size: "",
            url: fileUrl(base, p),
            docKey: `experience_${experiences.length + i}`,
          });
        }
      }
    });
  const cnicPath = profile.cnic_document ?? profile.cnicDocument ?? profile.cnic;
  if (cnicPath)
    documents.push({
      name: "CNIC",
      type: "cnic",
      size: "",
      url: fileUrl(base, cnicPath),
      docKey: "cnic_document",
    });

  return {
    id: `DOC-${String(profile.id ?? profile.profile_id ?? idx + 1).padStart(5, "0")}`,
    profileId:
      profile.id ?? profile.profile_id ?? null,
    doctorName: name,
    email:
      profile.user?.email ?? profile.email ?? profile.Email ?? "-",
    phone:
      profile.user?.mobile ??
      profile.phone ??
      profile.mobile ??
      profile.Mobile ??
      "-",
    pmdcNumber: profile.pmdc_number ?? profile.pmdcNumber ?? "N/A",
    licenseExpiry: profile.license_expiry ?? profile.licenseExpiry ?? "N/A",
    status,
    date: formatDate(profile.date ?? profile.submitted_at ?? profile.created_at ?? "-"),
    rawDate: profile.date ?? profile.submitted_at ?? profile.created_at ?? null,
    day: profile.day || (() => {
      try {
        const d = new Date(profile.date ?? profile.submitted_at ?? profile.created_at);
        return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { weekday: "long" });
      } catch { return ""; }
    })(),
    ts: idx,
    avatar: avatarUrl(name, profile.user?.profile_image),
    specialties: specialties.length ? specialties : ["General"],
    qualifications,
    experiences,
    documents,
    objectionReason: profile.objection_reason ?? profile.objectionReason ?? "",
    objectedDocument: profile.objected_document ?? profile.objectedDocument ?? "",
    reuploadStatus: profile.reupload_status ?? profile.reuploadStatus ?? "",
    reuploadMessage: profile.reupload_message ?? profile.reuploadMessage ?? "",
    reuploadImage: profile.reupload_image ?? profile.reuploadImage ?? null,
    reuploadAt: profile.reupload_at ?? profile.reuploadAt ?? null,
  };
};

const mapDoctorProfiles = (data) => {
  let list = toList(data);
  if (list.length === 0) {
    const root = Array.isArray(data) ? data : data?.data ?? data?.doctor ?? data?.doctors ?? data?.profiles ?? data?.results ?? data?.submissions;
    list = toList(root);
  }
  return list.map(docFromBackend);
};

const downloadDocument = (doc, doctorName) => {
  if (doc.url) {
    const storagePath = doc.url.replace(/^https?:\/\/[^/]+\/storage\//, "");
    const downloadUrl = `${API_BASE_URL}/api/download/${encodeURIComponent(storagePath)}`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = doc.name || "document";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }
  const content = `MediCare Plus\n\nDocument: ${doc.name}\nDoctor: ${doctorName}\nType: ${doc.type}\nSize: ${doc.size}\n\nThis is a placeholder document generated for demo purposes.`;
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = doc.name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const DocumentsTabs = ({ tabs, activeTab, setActiveTab, counts }) => {
  return (
    <div className="doc-tabs">
      {tabs.map((t) => (
        <button
          key={t}
          className={`doc-tab-pill ${activeTab === t ? "active" : ""}`}
          onClick={() => setActiveTab(t)}
        >
          {t}
          <span className="doc-tab-count">{counts[t] ?? 0}</span>
        </button>
      ))}
    </div>
  );
};

const SummaryCards = ({ counts }) => {
  return (
    <section className="doc-summary-section">
      <div className="doc-summary-grid">
        <div className="doc-summary-card doc-glass">
          <div className="doc-icon-box doc-total-icon">
            <FaFolderOpen />
          </div>
          <div className="doc-summary-info">
            <span className="doc-summary-label">Total Documents</span>
            <h2 className="doc-summary-count">{counts.total}</h2>
            <p className="doc-summary-sub">All Submissions</p>
          </div>
        </div>
        <div className="doc-summary-card doc-glass">
          <div className="doc-icon-box doc-pending-icon">
            <FaHourglassHalf />
          </div>
          <div className="doc-summary-info">
            <span className="doc-summary-label">Pending Review</span>
            <h2 className="doc-summary-count">{counts.pending}</h2>
            <p className="doc-summary-sub">Awaiting Action</p>
          </div>
        </div>
        <div className="doc-summary-card doc-glass">
          <div className="doc-icon-box doc-approved-icon">
            <FaCheckCircle />
          </div>
          <div className="doc-summary-info">
            <span className="doc-summary-label">Approved</span>
            <h2 className="doc-summary-count">{counts.approved}</h2>
            <p className="doc-summary-sub">Verified Doctors</p>
          </div>
        </div>
      </div>
    </section>
  );
};

const Avatar = ({ doc }) => {
  return doc.avatar ? (
    <img src={doc.avatar} alt={doc.doctorName} className="doc-avatar" />
  ) : (
    <div className="doc-avatar doc-avatar-initials">
      {String(doc.doctorName || "?").replace("Dr. ", "").trim().charAt(0) || "?"}
    </div>
  );
};

const DocumentItem = ({ doc, isSelected, onSelect }) => {
  return (
    <div
      className={`doc-item ${isSelected ? "selected" : ""}`}
      onClick={() => onSelect(doc)}
    >
      <Avatar doc={doc} />
      <div className="doc-item-mid">
        <h3>{doc.doctorName}</h3>
        <p className="doc-item-meta">
          {doc.specialties.join(", ") || "General"}
        </p>
      </div>
      <div className="doc-item-date">
        <p className="doc-item-date-line">{doc.date}</p>
        <span className="doc-item-day">{doc.day}</span>
      </div>
      <div className="doc-item-status-col">
        <span className={statusClass(doc.status)}>{doc.status}</span>
        {doc.status === "Objected" && doc.objectionReason && (
          <p className="doc-item-objection" title={doc.objectionReason}>
            <FaExclamationTriangle /> {doc.objectionReason}
          </p>
        )}
      </div>
      <FaChevronRight className="doc-chevron" />
    </div>
  );
};

const ObjectionModal = ({ doc, onClose, onConfirm, themeClass }) => {
  const [reason, setReason] = useState("");
  const [docType, setDocType] = useState("");

  const docOptions = [
    { value: "license_image", label: "License Image" },
    { value: "cnic_document", label: "CNIC Document" },
    ...doc.qualifications.map((q, i) => ({
      value: `qualification_${i}`,
      label: `Qualification ${i + 1}${q.degree ? " (" + q.degree + ")" : ""}`,
    })),
    ...doc.experiences.map((e, i) => ({
      value: `experience_${i}`,
      label: `Experience ${i + 1}${e.designation ? " (" + e.designation + ")" : ""}`,
    })),
  ];

  return (
    <div className={`doc-modal-overlay ${themeClass}`} onClick={onClose}>
      <div className="doc-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="doc-modal-header">
          <div className="doc-modal-title">
            <FaExclamationTriangle />
            <h3>Raise Objection</h3>
          </div>
          <button className="doc-modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <p className="doc-modal-doctor">{doc.doctorName}</p>
        <p className="doc-modal-sub">
          Select which document has an issue and explain the problem.
        </p>
        <div className="doc-objection-field">
          <label className="doc-objection-label">Document</label>
          <select
            className="doc-objection-select"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
          >
            <option value="">-- Select document --</option>
            {docOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="doc-objection-field">
          <label className="doc-objection-label">Reason</label>
          <textarea
            className="doc-reason-input"
            rows="4"
            placeholder="Write your objection reason here..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <div className="doc-modal-actions">
          <button className="doc-modal-btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="doc-modal-btn primary"
            disabled={!reason.trim() || !docType}
            onClick={() => onConfirm(reason.trim(), docType)}
          >
            Submit Objection
          </button>
        </div>
      </div>
    </div>
  );
};

const DocPreviewModal = ({ file, themeClass, onClose }) => {
  return (
    <div className={`doc-modal-overlay ${themeClass}`} onClick={onClose}>
      <div className="doc-preview-box" onClick={(e) => e.stopPropagation()}>
        <div className="doc-preview-header">
          <div className="doc-modal-title">
            <FaEye />
            <h3>Document Preview</h3>
          </div>
          <button className="doc-modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="doc-preview-meta">
          <span className="doc-preview-meta-item">
            <FaFileAlt /> {file.name}
          </span>
          {file.size && <span className="doc-preview-meta-item">{file.size}</span>}
          {file.type && <span className="doc-preview-meta-item">{file.type}</span>}
        </div>

        <div className="doc-preview-area">
          {file.url ? (
            <img
              src={file.url}
              alt={file.name}
              className="doc-preview-img"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="doc-preview-page">
              <div className="doc-preview-page-head">
                <span className="doc-preview-logo">MediCare Plus</span>
                <span className="doc-preview-badge">Verified Document</span>
              </div>
              <div className="doc-preview-icon">{docIcon(file.type)}</div>
              <h4 className="doc-preview-name">{file.name}</h4>
              <p className="doc-preview-doctor">Doctor: {file.doctor}</p>
              <p className="doc-preview-hint">
                {file.type === "license"
                  ? "PMDC / Medical License"
                  : file.type === "cnic"
                  ? "CNIC Front Side"
                  : "Professional Certificate"}
              </p>
            </div>
          )}
        </div>

        <div className="doc-modal-actions">
          <button
            className="doc-modal-btn primary"
            onClick={() => downloadDocument(file, file.doctor)}
          >
            <FaDownload /> Download
          </button>
          <button className="doc-modal-btn secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const DetailsPanel = ({ doc, onClose, mobileDrawer, onApprove, onObjection, onPreview }) => {
  return (
    <aside
      className={`doc-details-panel doc-glass ${mobileDrawer ? "mobile-open" : ""}`}
    >
      <div className="doc-details-header">
        <h3>Document Details</h3>
        <div className="doc-header-right">
          <span className={statusClass(doc.status)}>{doc.status}</span>
          <button className="doc-close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
      </div>

      <div className="doc-doctor-info">
        <Avatar doc={doc} />
        <div>
          <h2>{doc.doctorName}</h2>
          <p className="doc-contact">
            <FaPhoneAlt /> {doc.phone}
          </p>
          <p className="doc-contact">
            <FaEnvelope /> {doc.email}
          </p>
        </div>
      </div>

      <div className="doc-info-grid">
        <div>
          <span className="doc-info-label">Document ID</span>
          <p>{doc.id}</p>
        </div>
        <div>
          <span className="doc-info-label">Submitted On</span>
          <p>
            {doc.date} <span className="doc-info-day">({doc.day})</span>
          </p>
        </div>
        <div>
          <span className="doc-info-label">PMDC Number</span>
          <p>{doc.pmdcNumber}</p>
        </div>
        <div>
          <span className="doc-info-label">License Expiry</span>
          <p>{doc.licenseExpiry}</p>
        </div>
      </div>

      <div className="doc-section">
        <div className="doc-section-title">
          <FaGraduationCap className="doc-sec-icon qualification" /> Qualifications
        </div>
        <div className="doc-qual-list">
          {doc.qualifications.map((q, i) => (
            <div className="doc-qual-card" key={i}>
              {q.image && (
                <img
                  src={fileUrl(API_BASE_URL, q.image)}
                  alt={q.degree}
                  className="doc-qual-img"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              )}
              <div className="doc-qual-text">
                <strong>{q.degree}</strong>
                <span>
                  {q.institution} ({q.year})
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="doc-section">
        <div className="doc-section-title">
          <FaHeartbeat className="doc-sec-icon specialties" /> Specialties
        </div>
        <div className="doc-chips">
          {doc.specialties.map((s) => (
            <span key={s} className="doc-chip">
              {s}
            </span>
          ))}
        </div>
      </div>

      <div className="doc-section">
        <div className="doc-section-title">
          <FaBriefcase className="doc-sec-icon experience" /> Experience
        </div>
        <div className="doc-exp-list">
          {doc.experiences.map((e, i) => (
            <div className="doc-exp-card" key={i}>
              <div className="doc-exp-top">
                <strong>{e.designation}</strong>
                <span className="doc-exp-dates">
                  {e.from} — {e.to}
                </span>
              </div>
              <span>{e.organization}</span>
              {e.certificate && (
                <img
                  src={fileUrl(API_BASE_URL, e.certificate)}
                  alt={e.designation}
                  className="doc-exp-img"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="doc-section">
        <div className="doc-section-title">
          <FaFileAlt className="doc-sec-icon documents" /> Documents
        </div>
        <div className="doc-file-list">
          {doc.documents.map((f) => {
            const isReuploaded = doc.reuploadStatus === "reuploaded" && f.docKey === doc.objectedDocument;
            return (
              <div className={`doc-file-row ${isReuploaded ? "doc-file-reuploaded" : ""}`} key={f.name}>
                <span className="doc-file-icon">{docIcon(f.type)}</span>
                <div className="doc-file-info">
                  <span className="doc-file-name">{f.name}</span>
                  {isReuploaded && <span className="doc-file-reupload-badge">Re-uploaded</span>}
                  <span className="doc-file-size">{f.size}</span>
                </div>
                <button
                  className="doc-view-btn"
                  onClick={() => onPreview({ ...f, doctor: doc.doctorName })}
                  title="Preview"
                >
                  <FaEye />
                </button>
                <button
                  className="doc-download-btn"
                onClick={() => downloadDocument(f, doc.doctorName)}
                title="Download"
              >
                <FaDownload />
              </button>
            </div>
            );
          })}
        </div>
      </div>

      {(doc.status === "Objected" || doc.status === "Pending") && doc.reuploadStatus === "reuploaded" && (
        <div className="doc-objection-note">
          <div className="doc-section-title">
            <FaCheckCircle className="doc-sec-icon" style={{ color: "#22c55e" }} /> Re-uploaded
          </div>
          <div className="doc-reupload-done">
            <FaCheckCircle /> {doc.reuploadMessage || "Document has been re-uploaded."}
            {doc.reuploadImage && (
              <div className="doc-reupload-preview">
                <img
                  src={fileUrl(API_BASE_URL, doc.reuploadImage)}
                  alt="Re-uploaded"
                  className="doc-reupload-img"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
                <span className="doc-reupload-time">
                  Re-uploaded: {formatDate(doc.reuploadAt)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {doc.status === "Objected" && doc.objectionReason && (
        <div className="doc-objection-note">
          <div className="doc-section-title">
            <FaExclamationTriangle className="doc-sec-icon objection" /> Objection
            Reason
          </div>
          <div className="doc-info-card">{doc.objectionReason}</div>
          {doc.objectedDocument && (
            <p className="doc-objected-doc-type">
              <FaFileAlt /> Document: <strong>{doc.objectedDocument.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</strong>
            </p>
          )}
          {doc.reuploadStatus !== "reuploaded" && (
            <div className="doc-reupload-required">
              <FaSyncAlt /> Re-upload Required — Doctor must re-submit the
              objected document(s)
            </div>
          )}
        </div>
      )}

      {doc.status !== "Approved" && (
        <div className="doc-actions">
          <button className="doc-action-btn approve" onClick={() => onApprove(doc)}>
            <FaCheck /> Approve
          </button>
          <button className="doc-action-btn objection" onClick={() => onObjection(doc)}>
            <FaExclamationTriangle /> Objection
          </button>
        </div>
      )}
      {doc.status === "Approved" && (
        <div className="doc-approved-note">
          <FaCheckCircle /> This document has been approved and the doctor is now
          verified.
        </div>
      )}
    </aside>
  );
};

const Documents = () => {
  const { darkMode } = useContext(ThemeContext);
  const { token } = useContext(AuthContext);
  const cachedRef = useRef(false);
  const [docs, setDocs] = useState(() => {
    try {
      const cached = localStorage.getItem("admin_docs_cache");
      if (cached) { cachedRef.current = true; return JSON.parse(cached); }
      return [];
    } catch { return []; }
  });
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [mobileDrawer, setMobileDrawer] = useState(false);
  const [objectionDoc, setObjectionDoc] = useState(null);
  const [preview, setPreview] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(() => !cachedRef.current);

  // ==========================================
  // FETCH DOCTOR SUBMISSIONS FOR VERIFICATION
  // ==========================================
  useEffect(() => {
    let cancelled = false;
    const fetchDoctorProfiles = async () => {
      try {
        const response = await axios.get(ADMIN_DOCTORS_API, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            Accept: "application/json",
          },
          timeout: 30000,
        });
        if (cancelled) return;
        const mapped = mapDoctorProfiles(response.data);
        setDocs(mapped);
        localStorage.setItem("admin_docs_cache", JSON.stringify(mapped));
      } catch (error) {
        console.error(
          "Failed to fetch doctor submissions from API:",
          error?.response?.data || error?.message,
        );
        if (!cachedRef.current) {
          showToast(
            `API error: ${error?.response?.status || ""} ${
              error?.response?.data?.message || error?.message || "Could not fetch data"
            }`,
          );
          setDocs([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchDoctorProfiles();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const tabs = ["All", "Pending", "Approval"];

  const filtered = docs
    .filter((d) => {
      const matchesTab =
        activeTab === "All" ||
        (activeTab === "Pending" &&
          (d.status === "Pending" || d.status === "Objected")) ||
        (activeTab === "Approval" && d.status === "Approved");
      const q = search.toLowerCase();
      const matchesSearch =
        d.doctorName.toLowerCase().includes(q) ||
        d.pmdcNumber.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q) ||
        d.specialties.some((s) => s.toLowerCase().includes(q));
      return matchesTab && matchesSearch;
    })
    .sort((a, b) => b.ts - a.ts);

  const visible = showAll ? filtered : filtered.slice(0, 5);

  const counts = {
    total: docs.length,
    pending: docs.filter((d) => d.status !== "Approved").length,
    approved: docs.filter((d) => d.status === "Approved").length,
  };

  const tabCounts = {
    All: docs.length,
    Pending: counts.pending,
    Approval: counts.approved,
  };

  const showToast = (message) => {
    if (message) {
      setToast(message);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const updateDoc = (id, patch) => {
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    setSelected((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev));
  };

  const handleSelect = (d) => {
    setSelected(d);
    if (typeof window !== "undefined" && window.innerWidth <= 900) {
      setMobileDrawer(true);
    }
  };

  const fetchDoctorProfiles = async () => {
    setLoading(true);
    try {
      const response = await axios.get(ADMIN_DOCTORS_API, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: "application/json",
        },
        timeout: 30000,
      });
      const mapped = mapDoctorProfiles(response.data);
      setDocs(mapped);
      if (mapped.length === 0) {
        showToast("No doctor submissions found from the server");
      }
    } catch (error) {
      console.error(
        "Failed to fetch doctor submissions from API:",
        error?.response?.data || error?.message,
      );
      showToast("Could not load submissions from server");
      setDocs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDetails = () => {
    setSelected(null);
    setMobileDrawer(false);
  };

  const handleApprove = async (d) => {
    try {
      await axios.put(
        `${ADMIN_DOCTORS_API}/${d.profileId}/status`,
        { status: "approved", rejection_reason: null },
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            Accept: "application/json",
          },
        },
      );
      updateDoc(d.id, { status: "Approved", objectionReason: "" });
      showToast(`${d.doctorName}'s documents approved`);
    } catch (error) {
      console.error(
        "Failed to approve doctor:",
        error?.response?.data || error?.message,
      );
      showToast(
        `API error: ${error?.response?.status || ""} ${
          error?.response?.data?.message || error?.message || "Approve failed"
        }`,
      );
    }
  };

  const handleObjectionConfirm = async (reason, docType) => {
    if (!objectionDoc) return;
    try {
      await axios.put(
        `${ADMIN_DOCTORS_API}/${objectionDoc.profileId}/status`,
        {
          status: "rejected",
          rejection_reason: reason,
          objected_document: docType,
        },
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            Accept: "application/json",
          },
        },
      );
      updateDoc(objectionDoc.id, {
        status: "Objected",
        objectionReason: reason,
        objectedDocument: docType,
      });
      showToast(`Objection raised against ${objectionDoc.doctorName}`);
      setObjectionDoc(null);
    } catch (error) {
      console.error(
        "Failed to object doctor submission:",
        error?.response?.data || error?.message,
      );
      showToast(
        `API error: ${error?.response?.status || ""} ${
          error?.response?.data?.message || error?.message || "Objection failed"
        }`,
      );
    }
  };

  return (
    <div className="documents-layout">
      <Sidebar />
      <div className={`documents-wrapper ${darkMode ? "dark" : "light"}`}>
        <header className="doc-header">
          <div className="doc-page-header">
            <div className="doc-page-header-left">
              <h1 className="doc-page-title">Doctor Documents</h1>
              <p className="doc-page-subtitle">
                Review and verify doctor verification documents
              </p>
            </div>
          </div>
        </header>

        <SummaryCards counts={counts} />

        <div className="doc-toolbar">
          <div className="doc-search-box">
            <FaSearch className="doc-search-icon" />
            <input
              type="text"
              placeholder="Search by doctor, PMDC number, specialty..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={loading}
            />
          </div>
          <button
            className="doc-refresh-btn"
            onClick={fetchDoctorProfiles}
            disabled={loading}
            title="Refresh doctor submissions"
          >
            <FaSyncAlt className={loading ? "doc-refresh-spin" : ""} />{" "}
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        <DocumentsTabs
          tabs={tabs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          counts={tabCounts}
        />

        <div className={`doc-split-area ${selected ? "split-open" : ""}`}>
          <section className="doc-list-panel">
            <div className="doc-document-list">
              {visible.map((d) => (
                <DocumentItem
                  key={d.id}
                  doc={d}
                  isSelected={selected?.id === d.id}
                  onSelect={handleSelect}
                />
              ))}
              {visible.length === 0 && (
                <div className="doc-empty">
                  <FaFolderOpen className="doc-empty-icon" />
                  <p>No documents found</p>
                </div>
              )}
            </div>

            {filtered.length > 5 && (
              <div className="doc-view-more-wrap">
                <button
                  className="doc-view-more-btn"
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll ? "View Less" : "View More"}{" "}
                  {showAll ? <FaChevronUp /> : <FaChevronDown />}
                </button>
              </div>
            )}
          </section>

          <section className="doc-Details">
            {selected && (
              <DetailsPanel
                doc={selected}
                onClose={handleCloseDetails}
                mobileDrawer={mobileDrawer}
                onApprove={handleApprove}
                onObjection={setObjectionDoc}
                onPreview={setPreview}
              />
            )}
          </section>
        </div>
      </div>

      {objectionDoc && (
        <ObjectionModal
          doc={objectionDoc}
          themeClass={darkMode ? "dark" : "light"}
          onClose={() => setObjectionDoc(null)}
          onConfirm={handleObjectionConfirm}
        />
      )}

      {preview && (
        <DocPreviewModal
          file={preview}
          themeClass={darkMode ? "dark" : "light"}
          onClose={() => setPreview(null)}
        />
      )}

      {toast && (
        <div className="doc-toast">
          <FaCheckCircle /> {toast}
        </div>
      )}
    </div>
  );
};

export default Documents;
