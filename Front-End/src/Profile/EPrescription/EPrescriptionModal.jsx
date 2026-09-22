// =============================================================================
// SECTION 1: IMPORTS
// Modal wrapper for viewing, printing, and downloading E-Prescription slip
// =============================================================================
import React, { useMemo } from "react";
import { createRoot } from "react-dom/client";
import jsPDF from "jspdf";
import { FaDownload, FaFileImage, FaPrint, FaTimes } from "react-icons/fa";
import PrescriptionSlip from "./PrescriptionSlip";
import { normalizeData } from "./eprescriptionData";
import "./EPrescription.css";

// =============================================================================
// SECTION 2: EXPORT UTILITIES
// PDF/JPG download without opening the modal
// =============================================================================
const captureElement = async (element) => {
  if (!element) return null;
  const { default: html2canvas } = await import("html2canvas");
  return html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
    width: element.scrollWidth,
    height: element.scrollHeight,
  });
};

const saveCanvasAsJPG = (canvas, filename) => {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/jpeg", 0.95);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const saveCanvasAsPDF = (canvas, filename) => {
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth - 16;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  pdf.addImage(imgData, "PNG", 8, 8, imgWidth, Math.min(imgHeight, pageHeight - 16));
  pdf.save(filename);
};

export const downloadEPrescription = async (data, format = "pdf") => {
  const rx = normalizeData(data);
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:0;top:0;width:800px;z-index:-1;opacity:0;pointer-events:none;overflow:hidden;";
  document.body.appendChild(container);

  const slipId = `epres-slip-${Date.now()}`;
  const root = createRoot(container);

  await new Promise((resolve) => {
    root.render(<PrescriptionSlip rx={rx} slipId={slipId} />);
    requestAnimationFrame(() => setTimeout(resolve, 800));
  });

  try {
    const element = document.getElementById(slipId);
    if (element) {
      element.style.width = "800px";
      element.style.background = "#ffffff";
    }
    const canvas = await captureElement(element);
    const safeName = `prescription-${rx.presId.replace(/\s+/g, "-")}`;

    if (canvas) {
      if (format === "jpg") {
        saveCanvasAsJPG(canvas, `${safeName}.jpg`);
      } else {
        saveCanvasAsPDF(canvas, `${safeName}.pdf`);
      }
    }
  } finally {
    root.unmount();
    document.body.removeChild(container);
  }
};

// =============================================================================
// SECTION 3: MODAL WRAPPER
// Full-screen overlay with PDF, JPG, Print, and Close actions
// =============================================================================
const EPrescriptionModal = ({ data, onClose }) => {
  const rx = useMemo(() => normalizeData(data || {}), [data]);

  if (!data) return null;

  const captureSlip = () => captureElement(document.getElementById("epres-slip"));

  const downloadJPG = async () => {
    const canvas = await captureSlip();
    if (!canvas) return;
    saveCanvasAsJPG(canvas, `prescription-${rx.presId.replace(/\s+/g, "-")}.jpg`);
  };

  const downloadPDF = async () => {
    const canvas = await captureSlip();
    if (!canvas) return;
    saveCanvasAsPDF(canvas, `prescription-${rx.presId.replace(/\s+/g, "-")}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="epres-overlay" onClick={onClose} role="presentation">
      <div
        className="epres-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="E-Prescription"
      >
        <div className="epres-toolbar">
          <h2 className="epres-toolbar-title">E-Prescription</h2>
          <div className="epres-toolbar-actions">
            <button type="button" className="epres-btn epres-btn-primary" onClick={downloadPDF}>
              <FaDownload /> PDF
            </button>
            <button type="button" className="epres-btn epres-btn-secondary" onClick={downloadJPG}>
              <FaFileImage /> JPG
            </button>
            <button type="button" className="epres-btn epres-btn-ghost" onClick={handlePrint}>
              <FaPrint /> Print
            </button>
            <button
              type="button"
              className="epres-btn epres-btn-close"
              onClick={onClose}
              aria-label="Close"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        <div className="epres-scroll">
          <PrescriptionSlip rx={rx} />
        </div>
      </div>
    </div>
  );
};

export default EPrescriptionModal;
