// =============================================================================
// PRESCRIPTION SLIP UI
// Printable A4-style document layout (read-only view)
// =============================================================================
import React from "react";
import {
  FaHeartbeat,
  FaThermometerHalf,
  FaLungs,
  FaTint,
  FaWeight,
} from "react-icons/fa";
import clinicLogo from "../../images/clinic-logo.png";
import brandLogo from "../../images/Web-logo.png";
import "./EPrescription.css";

const DEFAULT_LOGO = clinicLogo;

const VITAL_ITEMS = [
  { key: "pulse", label: "Pulse", icon: FaHeartbeat },
  { key: "bp", label: "BP", icon: FaHeartbeat },
  { key: "temp", label: "Temp", icon: FaThermometerHalf },
  { key: "bsr", label: "BSR", icon: FaTint },
  { key: "respiratoryRate", label: "Respiratory Rate", icon: FaLungs },
  { key: "oxygenSaturation", label: "Oxygen Saturation", icon: FaLungs },
  { key: "weight", label: "Weight", icon: FaWeight },
];

const PrescriptionSlip = ({ rx, slipId = "epres-slip" }) => {
  const logoSrc = rx.clinicLogo || DEFAULT_LOGO;
  const slipClass = ["epres-slip", rx.slipClass].filter(Boolean).join(" ");
  const titleBarClass = ["epres-title-bar", rx.titleBarClass].filter(Boolean).join(" ");
  const showBrand = rx.showCuraAidBrand !== false;
  const headerClass = ["epres-header", !showBrand && "epres-header--no-brand"]
    .filter(Boolean)
    .join(" ");

  return (
  <article id={slipId} className={slipClass}>
    <header className={headerClass}>
      <div className="epres-header-left">
        <img src={logoSrc} alt="Clinic" className="epres-clinic-logo" />
      </div>
      <div className="epres-header-center">
        <h1 className="epres-hospital-name">{rx.hospitalName}</h1>
        <p className="epres-hospital-address">{rx.hospitalAddress}</p>
        <p className="epres-hospital-tel">Tel: {rx.hospitalTel}</p>
      </div>
      {showBrand && (
        <div className="epres-header-right">
          <div className="epres-brand">
            <img className="epres-brand-logo" src={brandLogo} alt="CuraAid" />
            <div>
              <div className="epres-brand-title">CuraAid</div>
              <div className="epres-brand-sub">Smart Healthcare</div>
            </div>
          </div>
        </div>
      )}
    </header>

    <div className={titleBarClass}>{rx.titleText || "PRESCRIPTION SLIP"}</div>

    <section className="epres-meta-grid" aria-label="Prescription details">
      <div className="epres-meta-col">
        <div className="epres-meta-row">
          <span className="epres-meta-label">Name:</span>
          <span className="epres-meta-value">{rx.patient}</span>
        </div>
        <div className="epres-meta-row">
          <span className="epres-meta-label">Pres. ID:</span>
          <span className="epres-meta-value">{rx.presId}</span>
        </div>
        <div className="epres-meta-row">
          <span className="epres-meta-label">MR #:</span>
          <span className="epres-meta-value">{rx.mrNumber}</span>
        </div>
      </div>
      <div className="epres-meta-col">
        <div className="epres-meta-row">
          <span className="epres-meta-label">Prescribed By:</span>
          <span className="epres-meta-value">{rx.prescribedBy}</span>
        </div>
        <div className="epres-meta-row">
          <span className="epres-meta-label">Age/Gender:</span>
          <span className="epres-meta-value">
            {rx.age} / {rx.gender}
          </span>
        </div>
        <div className="epres-meta-row">
          <span className="epres-meta-label">Prescription Date:</span>
          <span className="epres-meta-value">{rx.date}</span>
        </div>
      </div>
    </section>

    <div className="epres-body">
      <aside className="epres-sidebar">
        <section className="epres-sidebar-block">
          <h3 className="epres-section-title">VITALS</h3>
          <ul className="epres-vitals-list">
            {VITAL_ITEMS.map(({ key, label, icon: Icon }) => (
              <li key={key} className="epres-vital-item">
                <Icon className="epres-vital-icon" aria-hidden="true" />
                <span className="epres-vital-label">{label}</span>
                <span className="epres-vital-value">{rx.vitals[key] || "—"}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="epres-sidebar-block">
          <h3 className="epres-section-title">Diagnosis:</h3>
          <p className="epres-sidebar-text">{rx.diagnosis || "—"}</p>
        </section>
        <section className="epres-sidebar-block">
          <h3 className="epres-section-title">Allergy Details:</h3>
          <p className="epres-sidebar-text">{rx.allergies || "nil"}</p>
        </section>
      </aside>

      <main className="epres-main">
        <section className="epres-clinical">
          <div className="epres-clinical-item">
            <h4 className="epres-clinical-title">Presenting Complaint:</h4>
            <p>{rx.presentingComplaint || "—"}</p>
          </div>
          <div className="epres-clinical-item">
            <h4 className="epres-clinical-title">Present Illness:</h4>
            <p>{rx.presentIllness || "—"}</p>
          </div>
          <div className="epres-clinical-item">
            <h4 className="epres-clinical-title">Clinical &amp; Physical Examination:</h4>
            <p>{rx.clinicalExamination || "—"}</p>
          </div>
        </section>

        <section className="epres-medication-section">
          <h3 className="epres-section-title">Medication:</h3>
          <div className="epres-table-wrap">
            <table className="epres-med-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Generic</th>
                  <th>Route</th>
                  <th>Frequency</th>
                  <th>Duration</th>
                  <th>Comments</th>
                </tr>
              </thead>
              <tbody>
                {rx.medicines.length ? (
                  rx.medicines.map((med, i) => (
                    <tr key={`${med.name}-${i}`}>
                      <td>{med.name || "—"}</td>
                      <td>{med.generic || "—"}</td>
                      <td>{med.route || "—"}</td>
                      <td className="epres-freq-cell">{med.frequency || "—"}</td>
                      <td>{med.duration || "—"}</td>
                      <td>{med.comments || "—"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="epres-empty-row">
                      No medicines prescribed
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>

    <footer className="epres-footer">
      <section className="epres-doctor-notes">
        <h3 className="epres-section-title">Doctor&apos;s Notes:</h3>
        <p>{rx.doctorsNotes || "—"}</p>
      </section>
      <p className="epres-disclaimer">
        This is Digitally Prescribed by {rx.doctorName} and does not Required any
        Signatures.
      </p>
      <div className="epres-timestamps">
        <span>Created on: {rx.createdOn}</span>
        <span>Printed By: {rx.printedBy}</span>
      </div>
    </footer>
  </article>
  );
};

export default PrescriptionSlip;
