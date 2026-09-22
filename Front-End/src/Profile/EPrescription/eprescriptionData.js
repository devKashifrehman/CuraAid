// =============================================================================
// DEFAULT DATA & NORMALIZATION
// Shared prescription data helpers for slip, modal, and clinic editor
// =============================================================================
import { getTemplateHeaderFields } from "./eprescriptionTemplates";

export const EMPTY_MEDICINE = {
  name: "",
  generic: "",
  route: "Oral",
  frequency: "",
  duration: "",
  comments: "",
};

export const DEFAULT_DATA = {
  hospitalName: "",
  hospitalAddress: "",
  hospitalTel: "",
  patient: "",
  presId: "",
  mrNumber: "",
  prescribedBy: "",
  doctorName: "",
  age: "",
  gender: "",
  date: "",
  vitals: {
    pulse: "",
    bp: "",
    temp: "",
    bsr: "",
    respiratoryRate: "",
    oxygenSaturation: "",
    weight: "",
  },
  diagnosis: "",
  allergies: "nil",
  presentingComplaint: "",
  presentIllness: "",
  clinicalExamination: "",
  medicines: [],
  doctorsNotes: "",
  createdOn: "",
  printedBy: "",
};

const normalizeMedicines = (medicines = []) =>
  medicines.map((med) => {
    if (med.generic !== undefined || med.route || med.frequency) {
      return { ...EMPTY_MEDICINE, ...med };
    }
    return {
      name: med.name || "—",
      generic: med.generic || "—",
      route: med.route || "Oral",
      frequency: med.freq || med.dosage || med.frequency || "—",
      duration: med.days ? `${med.days} days` : med.duration || "—",
      comments: med.dose || med.comments || "—",
    };
  });

export const normalizeData = (raw = {}) => {
  const templateFields = getTemplateHeaderFields();
  const base = { ...DEFAULT_DATA, ...templateFields, ...raw };

  return {
    ...base,
    patient: raw.patient || raw.patientName || base.patient,
    presId: raw.presId || raw.prescriptionId || base.presId,
    mrNumber: raw.mrNumber || raw.patientId || base.mrNumber,
    prescribedBy:
      raw.prescribedBy ||
      (raw.doctorName
        ? `${raw.doctorName}${raw.doctorSpecialty ? `, ${raw.doctorSpecialty}` : ""}`
        : base.prescribedBy),
    doctorName: raw.doctorName || base.doctorName,
    age: raw.age || (raw.patientAge ? `${raw.patientAge}y` : base.age),
    gender: raw.gender || raw.patientGender?.[0]?.toLowerCase() || base.gender,
    date: raw.date || base.date,
    vitals: { ...DEFAULT_DATA.vitals, ...(raw.vitals || {}) },
    diagnosis: raw.diagnosis ?? base.diagnosis,
    allergies: raw.allergies ?? base.allergies,
    presentingComplaint: raw.presentingComplaint || raw.complaint || base.presentingComplaint,
    presentIllness: raw.presentIllness || raw.notes || base.presentIllness,
    clinicalExamination: raw.clinicalExamination || raw.examination || base.clinicalExamination,
    medicines: normalizeMedicines(raw.medicines || base.medicines),
    doctorsNotes: raw.doctorsNotes || raw.advice || raw.notes || base.doctorsNotes,
    createdOn: raw.createdOn || base.createdOn,
    printedBy: raw.printedBy || base.printedBy,
  };
};

export const getDraftStorageKey = (patientId) => `curaaid-rx-draft-${patientId}`;

/** Condense a long examination report into a short diagnosis-friendly summary */
export const summarizeExaminationReport = (text = "") => {
  const cleaned = String(text).replace(/\s+/g, " ").trim();
  if (!cleaned) return "";

  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  let summary = sentences.slice(0, 2).join(" ");
  if (!summary) summary = cleaned;
  if (summary.length > 180) summary = `${summary.slice(0, 177).trim()}...`;
  return summary;
};

export const medicinesToTextSummary = (medicines = []) =>
  medicines
    .filter((med) => med?.name?.trim())
    .map((med) => {
      const parts = [med.name.trim()];
      if (med.frequency?.trim()) parts.push(med.frequency.trim());
      if (med.duration?.trim()) parts.push(`for ${med.duration.trim()}`);
      if (med.comments?.trim()) parts.push(`(${med.comments.trim()})`);
      return parts.join(" — ");
    })
    .join("\n");

export const parsePrescriptionTextToMedicines = (text = "") => {
  if (!text?.trim()) return [{ ...EMPTY_MEDICINE }];

  return text
    .split(/\n|;/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const cleaned = line.replace(/^[-•*]\s*/, "");
      const [namePart, rest = ""] = cleaned.split(/\s[-–—]\s/);
      return {
        ...EMPTY_MEDICINE,
        name: namePart.trim(),
        frequency: rest.trim() || "",
      };
    });
};

export const emptyVitals = () => ({
  pulse: "",
  bp: "",
  temp: "",
  bsr: "",
  respiratoryRate: "",
  oxygenSaturation: "",
  weight: "",
});

/** Build editable e-prescription data from an Appointments row */
export const buildAppointmentRxData = (apt = {}) => {
  const now = new Date();
  const existing = apt.prescriptionData || null;
  const examSummary = summarizeExaminationReport(apt.examinationReport || "");
  const gender =
    typeof apt.gender === "string" ? apt.gender[0]?.toLowerCase() || "—" : "—";

  return normalizeData({
    patientName: apt.patientName,
    patientId: apt.id,
    mrNumber: apt.id,
    presId:
      existing?.presId ||
      `PRES ${now.getFullYear()}/${String(apt.id || "").replace(/\D/g, "").slice(-6) || String(Date.now()).slice(-6)}`,
    doctorName: apt.doctorName,
    doctorSpecialty: "Appointment",
    age: apt.age ? `${apt.age}y` : "",
    gender,
    date: existing?.date || apt.date || now.toLocaleDateString("en-US"),
    vitals: existing?.vitals || emptyVitals(),
    diagnosis: existing?.diagnosis || examSummary || "",
    allergies: existing?.allergies || "nil",
    presentingComplaint:
      existing?.presentingComplaint ||
      (Array.isArray(apt.symptoms) ? apt.symptoms.join(", ") : apt.symptoms || ""),
    presentIllness: existing?.presentIllness || apt.notes || "",
    clinicalExamination:
      existing?.clinicalExamination || examSummary || apt.examinationReport || "",
    medicines:
      existing?.medicines?.length
        ? existing.medicines
        : parsePrescriptionTextToMedicines(apt.prescription),
    doctorsNotes: existing?.doctorsNotes || "",
    createdOn: existing?.createdOn || `${apt.date || ""} ${apt.time || ""}`.trim(),
    printedBy: now.toLocaleString("en-GB"),
  });
};
