// Clinic.jsx
import React, { useContext, useState, useRef, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { ThemeContext } from "../../Theme/ThemeContext";
import { AuthContext } from "../../HeadFoot/Auth/AuthContext";
import {
  FaPhone,
  FaVideo,
  FaTimes,
  FaPaperPlane,
  FaPaperclip,
  FaSmile, 
  FaChevronRight,
  FaCalendarAlt,
  FaClock,
  FaFileAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaStethoscope,
  FaUser,
  FaPills, 
  FaStar,
  FaFileMedical,
  FaUpload,
  FaThumbsUp,
  FaThumbsDown,
  FaCommentDots,
  FaPhoneSlash,
  FaUserMd,
  FaHistory,
  FaClipboardList,
  FaChartLine,
  FaNotesMedical,
  FaDownload,
} from "react-icons/fa";
import "./Clinic.css";
import EPrescriptionModal, {
  EPrescriptionEditor,
  EMPTY_MEDICINE,
  getDraftStorageKey,
} from "../../Profile/EPrescription";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

const resolveImageUrl = (image) => {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  if (image.startsWith("/")) return `${API_BASE_URL}${image}`;
  return `${API_BASE_URL}/storage/${image}`;
};

const api = axios.create({ baseURL: `${API_BASE_URL}/api`, timeout: 10000 });
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("authToken") || localStorage.getItem("auth_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

const createConsultation = async (doctorProfileId) => {
  const res = await api.post("/consultations/with-doctor", { doctor_profile_id: doctorProfileId });
  return res.data?.data;
};

const fetchMessages = async (consultationId) => {
  const res = await api.get(`/consultations/${consultationId}/messages`);
  return res.data?.messages || [];
};

const sendMessageApi = async (consultationId, message) => {
  const res = await api.post(`/consultations/${consultationId}/messages`, { message });
  return res.data?.data;
};

const completeConsultation = async (consultationId, data = {}) => {
  const res = await api.post(`/consultations/${consultationId}/complete`, data);
  return res.data?.data;
};

const submitReview = async (consultationId, rating, comment) => {
  const res = await api.post(`/consultations/${consultationId}/review`, {
    rating,
    review_comment: comment || undefined,
  });
  return res.data?.data;
};

const uploadMedicalReport = async (formData) => {
  const res = await api.post("/medical-reports", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data?.data;
};

const sendReportToDoctorApi = async (reportId) => {
  const res = await api.post(`/medical-reports/${reportId}/send-to-doctor`);
  return res.data?.data;
};

const startCallApi = async (consultationId, type) => {
  const res = await api.post(`/consultations/${consultationId}/call/start`, { type });
  return res.data?.data;
};

const postSignalApi = async (consultationId, kind, payload) => {
  const res = await api.post(`/consultations/${consultationId}/call/signal`, { kind, payload });
  return res.data?.data;
};

const getSignalsApi = async (consultationId, afterId = 0) => {
  const res = await api.get(`/consultations/${consultationId}/call/signals`, { params: { after_id: afterId } });
  return res.data;
};

const endCallApi = async (consultationId) => {
  const res = await api.post(`/consultations/${consultationId}/call/end`);
  return res.data?.data;
};

const buildClinicRxData = (patientData, doctorData) => {
  const now = new Date();
  const gender = patientData.age?.toLowerCase().includes("female")
    ? "f"
    : patientData.age?.toLowerCase().includes("male")
      ? "m"
      : "—";

  return {
    patientName: patientData.name,
    patientId: patientData.id,
    presId: `PRES ${now.getFullYear()}/${String(Date.now()).slice(-6)}`,
    doctorName: doctorData.name,
    doctorSpecialty: doctorData.specialty.split("•")[0]?.trim() || doctorData.specialty,
    age: patientData.age,
    gender,
    date: now.toLocaleDateString("en-US"),
    vitals: {
      pulse: "—",
      bp: "—",
      temp: "—",
      bsr: "—",
      respiratoryRate: "—",
      oxygenSaturation: "—",
      weight: patientData.weight || "—",
    },
    diagnosis: "",
    allergies: patientData.allergies || "nil",
    presentingComplaint: patientData.symptoms,
    presentIllness: `Duration: ${patientData.duration}. ${patientData.history || ""}`.trim(),
    clinicalExamination: "",
    medicines: [{ ...EMPTY_MEDICINE }],
    doctorsNotes: "",
    createdOn: now.toLocaleString("en-GB"),
    printedBy: now.toLocaleString("en-GB"),
  };
};

const getReportsStorageKey = (patientId) => `curaaid-clinic-reports-${patientId}`;

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const readStoredReports = (patientId) => {
  try {
    const saved = localStorage.getItem(getReportsStorageKey(patientId));
    return saved ? JSON.parse(saved) : [];
  } catch {
    localStorage.removeItem(getReportsStorageKey(patientId));
    return [];
  }
};

const Clinic = () => {
  const { darkMode } = useContext(ThemeContext);
  const { isDoctor, isPatient, isAdmin, user } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  // Get patient info from location state or use default
  const passedPatient = location.state?.patient;
  const passedPatientProfile = location.state?.patientProfile;
  const passedConsultationId = location.state?.consultationId || null;
  const patientData = useMemo(() => passedPatient || {
    id: user?.id ? `#${String(user.id).padStart(5, "0")}` : "#PT00000",
    name: passedPatientProfile?.name || user?.name || "Patient",
    age: passedPatientProfile?.age
      ? `${passedPatientProfile.age} Years`
      : "N/A",
    phone: user?.mobile || user?.phone || "",
    symptoms: passedPatientProfile?.symptoms || "Not specified",
    duration: passedPatientProfile?.duration || "N/A",
    weight: "N/A",
    allergies: "No known allergies",
    history: "No significant history",
    avatar: resolveImageUrl(passedPatientProfile?.avatar || user?.profile_image || user?.PhotoUrl) || null,
  }, [passedPatient, passedPatientProfile, user]);

  // Doctor data from OPD navigation or fallback
  const passedDoctor = location.state?.doctor;
  const doctorData = useMemo(() => passedDoctor
    ? {
        name: passedDoctor.name || "Doctor",
        specialty: passedDoctor.specialty
          ? `${passedDoctor.specialty.split("•")[0]?.trim()} • ${passedDoctor.experience || 0} Years Exp.`
          : `${passedDoctor.specialization || "General"} • ${passedDoctor.experience || 0} Years Exp.`,
        phone: passedDoctor.phone || passedDoctor.email || "",
        avatar: resolveImageUrl(passedDoctor.image) || null,
      }
    : {
        name: user?.name || "Doctor",
        specialty: "General • 0 Years Exp.",
        phone: "",
        avatar: null,
      }, [passedDoctor, user]);

  const handleBookAppointment = () => {
    if (!passedDoctor) return;
    navigate("/appointments", {
      state: { bookDoctor: passedDoctor, patientProfile: passedPatientProfile },
      replace: false,
    });
  };

  // --- Shared States ---
  const [consultationId, setConsultationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeCall, setActiveCall] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [consultationDuration, setConsultationDuration] = useState(0);
  const [consultationStartedAt, setConsultationStartedAt] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  // const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showPrescription, setShowPrescription] = useState(false);
  const [prescriptionData, setPrescriptionData] = useState(null);
  const [hasPrescriptionDraft, setHasPrescriptionDraft] = useState(false);
  const [viewPrescriptionData, setViewPrescriptionData] = useState(null);
  const [savedPrescription, setSavedPrescription] = useState(null);
  const messagesEndRef = useRef(null);
  const callTimerRef = useRef(null);
  const callSignalIdRef = useRef(0);
  const callPollRef = useRef(null);

  // --- Doctor States ---
  const [showCaseCompletion, setShowCaseCompletion] = useState(false);
  const [showRevisitOptions, setShowRevisitOptions] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMode, setCalendarMode] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);

  // --- Patient States ---
  const [showFeedback, setShowFeedback] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showDoctorReports, setShowDoctorReports] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [uploadedReports, setUploadedReports] = useState([]);
  const [showDoctorNotes, setShowDoctorNotes] = useState(false);
  const [doctorNotesText, setDoctorNotesText] = useState("");
  const fileInputRef = useRef(null);

  // --- Effects ---

  useEffect(() => {
    if (activeCall) {
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
      setCallDuration(0);
    }
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [activeCall]);

  useEffect(() => {
    const baseTime = consultationStartedAt ? new Date(consultationStartedAt).getTime() : Date.now();
    const timer = setInterval(() => {
      setConsultationDuration(Math.floor((Date.now() - baseTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [consultationStartedAt]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        let cid = passedConsultationId;

        if (!cid && passedDoctor?.id) {
          console.log("[Clinic] Creating consultation for doctor_profile_id:", passedDoctor.id);
          const consultation = await createConsultation(passedDoctor.id);
          if (cancelled) return;
          console.log("[Clinic] Consultation created:", consultation);
          cid = consultation?.id || null;
        }

        if (cid) {
          setConsultationId(cid);
          console.log("[Clinic] Setting consultationId:", cid);
          const msgs = await fetchMessages(cid);
          if (cancelled) return;
          if (msgs.length) {
            setMessages(msgs.map((m) => ({
              id: m.id,
              sender: m.sender_type || "patient",
              text: m.message,
              time: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            })));
          }
        } else {
          console.warn("[Clinic] No consultationId obtained");
        }
      } catch (err) {
        console.error("[Clinic] Consultation creation failed:", err?.response?.data || err?.message);
      }
    })();

    return () => { cancelled = true; };
  }, [passedConsultationId, passedDoctor?.id, user]);

  useEffect(() => {
    if (consultationId) {
      setUploadedReports(readStoredReports(consultationId));
      api
        .get(`/consultations/${consultationId}`)
        .then((res) => {
          const data = res.data?.data || res.data;
          if (data?.notes) setDoctorNotesText(data.notes);
          else if (data?.prescription?.advice) setDoctorNotesText(data.prescription.advice);
          if (data?.started_at) setConsultationStartedAt(data.started_at);
          if (data?.prescription && typeof data.prescription === "object") {
            const base = buildClinicRxData(patientData, doctorData);
            setSavedPrescription({
              ...base,
              diagnosis: data.diagnosis?.[0] || "",
              allergies: data.prescription.allergies || "",
              presentingComplaint: data.prescription.presentingComplaint || "",
              presentIllness: data.prescription.presentIllness || "",
              clinicalExamination: data.prescription.clinicalExamination || "",
              doctorsNotes: data.prescription.advice || "",
              medicines: data.prescription.medicines?.length ? data.prescription.medicines : base.medicines,
              vitals: data.prescription.vitals || base.vitals,
            });
          }
        })
        .catch(() => {});
    }
  }, [consultationId, doctorData, patientData]);

  // --- Signal polling for incoming calls ---
  useEffect(() => {
    if (!consultationId) return;
    let stopped = false;

    const poll = async () => {
      if (stopped) return;
      try {
        const res = await getSignalsApi(consultationId, callSignalIdRef.current);
        if (stopped) return;
        const signals = res.data || [];
        const call = res.call;

        if (signals.length) {
          const lastId = signals[signals.length - 1].id;
          if (lastId > callSignalIdRef.current) callSignalIdRef.current = lastId;

          for (const sig of signals) {
            if (sig.kind === "ring" && !activeCall && !incomingCall) {
              setIncomingCall({ type: sig.payload?.type || "audio", initiatorId: sig.sender_id, signalId: sig.id });
            } else if (sig.kind === "accept" && activeCall) {
              // Call is now active — already showing overlay
            } else if (["hangup", "reject"].includes(sig.kind)) {
              setActiveCall(null);
              setIncomingCall(null);
              setCallDuration(0);
            } else if (sig.kind === "offer" || sig.kind === "answer" || sig.kind === "ice") {
              // WebRTC signaling — placeholder for future WebRTC integration
            }
          }
        }

        // Also check active_call state from server
        if (call && call.status === "ended" && activeCall) {
          setActiveCall(null);
          setCallDuration(0);
        }
      } catch {
        // poll fails silently
      }
      if (!stopped) callPollRef.current = setTimeout(poll, 2000);
    };

    poll();
    return () => {
      stopped = true;
      if (callPollRef.current) clearTimeout(callPollRef.current);
    };
  }, [consultationId, activeCall, incomingCall]);

  const handleStartCall = async (type) => {
    setActiveCall(type);
    setCallDuration(0);
    if (consultationId) {
      try {
        await startCallApi(consultationId, type);
      } catch {
        // API fails silently — call already started locally
      }
    }
  };

  const handleEndCall = async () => {
    if (consultationId) {
      try {
        await endCallApi(consultationId);
      } catch {
        // end fails silently
      }
    }
    setActiveCall(null);
    setCallDuration(0);
  };

  const handleAcceptCall = async () => {
    setActiveCall(incomingCall?.type || "audio");
    setIncomingCall(null);
    setCallDuration(0);
    if (consultationId) {
      try {
        await postSignalApi(consultationId, "accept", { type: incomingCall?.type || "audio" });
      } catch {
        // fails silently
      }
    }
  };

  const handleRejectCall = async () => {
    setIncomingCall(null);
    if (consultationId) {
      try {
        await postSignalApi(consultationId, "reject", {});
      } catch {
        // fails silently
      }
    }
  };

  const persistReports = (reports) => {
    if (!consultationId) return;
    localStorage.setItem(getReportsStorageKey(consultationId), JSON.stringify(reports));
    setUploadedReports(reports);
  };

  const handleTogglePrescription = () => {
    if (!showPrescription) {
      const draftKey = getDraftStorageKey(consultationId || "new");
      const savedDraft = localStorage.getItem(draftKey);

      if (savedDraft) {
        try {
          setPrescriptionData(JSON.parse(savedDraft));
          setHasPrescriptionDraft(true);
        } catch {
          localStorage.removeItem(draftKey);
          setPrescriptionData(savedPrescription || buildClinicRxData(patientData, doctorData));
          setHasPrescriptionDraft(false);
        }
      } else {
        setPrescriptionData(savedPrescription || buildClinicRxData(patientData, doctorData));
        setHasPrescriptionDraft(false);
      }
    } else {
      if (prescriptionData) {
        const draftKey = getDraftStorageKey(consultationId || "new");
        localStorage.setItem(draftKey, JSON.stringify(prescriptionData));
        setHasPrescriptionDraft(true);
      }
    }

    setShowPrescription((prev) => !prev);
    setShowDoctorReports(false);
  };

  const handleTogglePatientReports = () => {
    setUploadedReports(readStoredReports(consultationId));
    setShowReports((prev) => !prev);
    setShowPrescription(false);
    setShowDoctorReports(false);
  };

  const handleToggleDoctorReports = () => {
    setUploadedReports(readStoredReports(consultationId));
    setShowDoctorReports((prev) => !prev);
    setShowPrescription(false);
    setShowReports(false);
    setShowDoctorNotes(false);
  };

  const handleToggleDoctorNotes = () => {
    setShowDoctorNotes((prev) => !prev);
    setShowPrescription(false);
    setShowDoctorReports(false);
    setShowReports(false);
  };

  const doctorReports = uploadedReports.filter((r) => r.sentToDoctor);

  const notifyReportSent = (report) => {
    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    setMessages((prev) => [
      ...prev,
      {
        id: `temp-report-${Date.now()}`,
        sender: "patient",
        type: "report",
        report,
        text: ` Shared medical report: ${report.name}`,
        time,
      },
      {
        id: `temp-report-sys-${Date.now()}`,
        sender: "system",
        text: " Patient report received.",
        time,
      },
    ]);
  };

  const handleSendReportToDoctor = (reportId) => {
    const target = uploadedReports.find((r) => r.id === reportId);
    if (!target || target.sentToDoctor) return;

    const updated = uploadedReports.map((r) =>
      r.id === reportId ? { ...r, sentToDoctor: true } : r,
    );
    const report = updated.find((r) => r.id === reportId);
    persistReports(updated);
    if (report) notifyReportSent(report);

    if (report?.backendId) {
      sendReportToDoctorApi(report.backendId).catch(() => {});
    }
  };

  const handleOpenReport = (report) => {
    if (report?.url) setSelectedReport(report);
  };

  const handleSaveDoctorNotes = async () => {
    if (!consultationId) return;
    try {
      const payload = { notes: doctorNotesText };
      if (savedPrescription) {
        payload.prescription = {
          medicines: savedPrescription.medicines || [],
          advice: doctorNotesText,
          allergies: savedPrescription.allergies || "",
          presentingComplaint: savedPrescription.presentingComplaint || "",
          presentIllness: savedPrescription.presentIllness || "",
          clinicalExamination: savedPrescription.clinicalExamination || "",
          vitals: savedPrescription.vitals || {},
        };
      }
      await api.put(`/consultations/${consultationId}`, payload);
      setShowDoctorNotes(false);
    } catch {
      console.error("Failed to save doctor notes");
    }
  };

  const formatDuration = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const handleEndConsultation = () => {
    navigate("/consultations", { replace: true });
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    if (!consultationId) {
      console.warn("[Clinic] Cannot send message — no consultationId");
      return;
    }
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const newMsg = {
      id: `temp-${Date.now()}`,
      sender: isDoctor ? "doctor" : "patient",
      text: inputMessage,
      time,
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputMessage("");
    setIsTyping(true);
    setTimeout(() => setIsTyping(false), 2000);

    sendMessageApi(consultationId, inputMessage).catch((err) => {
      console.error("[Clinic] Send message failed:", err?.response?.data || err?.message);
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSavePrescriptionDraft = () => {
    if (!prescriptionData) return;

    localStorage.setItem(
      getDraftStorageKey(consultationId || "new"),
      JSON.stringify(prescriptionData),
    );
    setHasPrescriptionDraft(true);
    setMessages((prev) => [
      ...prev,
      {
        id: `temp-draft-${Date.now()}`,
        sender: "system",
        text: " Prescription saved as draft.",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
  };

  const handleSendPrescription = () => {
    if (!prescriptionData) return;

    const validMedicines = prescriptionData.medicines.filter((med) => med.name?.trim());
    if (!validMedicines.length) {
      window.alert("Please add at least one medicine before sending the prescription.");
      return;
    }

    const finalPrescription = {
      ...prescriptionData,
      medicines: validMedicines,
      printedBy: new Date().toLocaleString("en-GB"),
    };

    localStorage.removeItem(getDraftStorageKey(consultationId || "new"));
    setHasPrescriptionDraft(false);

    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    setMessages((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        sender: "doctor",
        type: "prescription",
        prescription: finalPrescription,
        text: " E-Prescription has been prepared and sent to the patient.",
        time,
      },
      {
        id: `temp-${Date.now() + 1}`,
        sender: "system",
        text: " Prescription delivered to patient successfully.",
        time,
      },
    ]);

    setShowPrescription(false);

    if (consultationId) {
      api.put(`/consultations/${consultationId}`, {
        prescription: {
          medicines: validMedicines,
          advice: finalPrescription.doctorsNotes || "",
          allergies: finalPrescription.allergies || "",
          presentingComplaint: finalPrescription.presentingComplaint || "",
          presentIllness: finalPrescription.presentIllness || "",
          clinicalExamination: finalPrescription.clinicalExamination || "",
          vitals: finalPrescription.vitals || {},
        },
        diagnosis: finalPrescription.diagnosis ? [finalPrescription.diagnosis] : [],
        notes: finalPrescription.doctorsNotes || "",
        examination_notes: finalPrescription.clinicalExamination || "",
      }).then(() => {
        setSavedPrescription(finalPrescription);
        localStorage.removeItem(getDraftStorageKey(consultationId || "new"));
        localStorage.removeItem(`prescriptions_data_${user?.id || "guest"}`);
      }).catch(() => {});
    }
  };

  // --- Doctor Handlers ---
  const handleCaseCompletion = (status) => {
    if (status === "no-revisit") {
      setShowCaseCompletion(false);
      const time = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      setMessages((prev) => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          sender: "system",
          text: " Case marked as COMPLETED. No further follow-ups required.",
          time,
        },
      ]);
      if (consultationId) {
        completeConsultation(consultationId, { revisit: false }).catch(() => {});
      }
      setTimeout(() => navigate("/consultations", { replace: true }), 1500);
    } else if (status === "revisit") {
      setShowRevisitOptions(true);
    }
  };

  const handleRevisitOption = (mode) => {
    setCalendarMode(mode);
    setShowRevisitOptions(false);
    setShowCalendar(true);
  };

  const handleSchedule = () => {
    if (selectedDate && selectedTime) {
      const time = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const displayTime = to12hLabel(selectedTime);
      setMessages((prev) => [
        ...prev,
        {
          id: `temp-schedule-${Date.now()}`,
          sender: "system",
          text: `📅 Revisit scheduled for ${selectedDate} at ${displayTime} (${calendarMode === "consult" ? "Consultation" : "Appointment"}).`,
          time,
        },
      ]);
      setShowCalendar(false);
      setSelectedDate(null);
      setSelectedTime(null);
      setShowCaseCompletion(false);

      if (consultationId) {
        completeConsultation(consultationId, {
          revisit: true,
          revisit_reason: `Revisit on ${selectedDate} at ${displayTime}`,
          follow_up_date: selectedDate,
          follow_up_time: selectedTime,
        }).catch(() => {});
      }
    }
  };

  const generateCalendarDays = () => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push({
        date: d.toISOString().split("T")[0],
        dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
        dayNum: d.getDate(),
        month: d.toLocaleDateString("en-US", { month: "short" }),
      });
    }
    return days;
  };

  const timeSlots = (() => {
    const slots = [];
    const toLabel = (h24, m) => {
      const period = h24 >= 12 ? "PM" : "AM";
      let h12 = h24 % 12;
      if (h12 === 0) h12 = 12;
      return `${h12.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${period}`;
    };
    const to24 = (h12, period) => {
      let h = h12;
      if (period === "PM" && h12 !== 12) h += 12;
      if (period === "AM" && h12 === 12) h = 0;
      return h;
    };
    const addSlots = (h12, period) => {
      const h24 = to24(h12, period);
      slots.push({ label: toLabel(h24, 0), value: `${h24.toString().padStart(2, "0")}:00` });
      slots.push({ label: toLabel(h24, 30), value: `${h24.toString().padStart(2, "0")}:30` });
    };
    for (let h = 12; h <= 12; h++) addSlots(h, "PM");
    for (let h = 1; h <= 11; h++) addSlots(h, "PM");
    for (let h = 12; h <= 12; h++) addSlots(h, "AM");
    for (let h = 1; h <= 11; h++) addSlots(h, "AM");
    return slots;
  })();
  const [customTimeMode, setCustomTimeMode] = useState(false);
  const [customTimeValue, setCustomTimeValue] = useState("");

  const to12hLabel = (val) => {
    if (!val) return val;
    const [h, m] = val.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return `${h12.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${period}`;
  };

  // --- Patient Handlers ---
  const handleFeedbackSubmit = () => {
    if (rating > 0) {
      const time = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      setMessages((prev) => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          sender: "system",
          text: `⭐ Feedback submitted: ${rating} star${rating > 1 ? "s" : ""}${feedbackText ? " - " + feedbackText : ""}`,
          time,
        },
      ]);
      setFeedbackSubmitted(true);

      if (consultationId) {
        submitReview(consultationId, rating, feedbackText).catch(() => {});
      }

      setTimeout(() => {
        setShowFeedback(false);
        setFeedbackSubmitted(false);
        setRating(0);
        setFeedbackText("");
      }, 2000);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newReports = await Promise.all(
      files.map(async (file, idx) => {
        const localReport = {
          id: `temp-${Date.now()}-${idx}`,
          name: file.name,
          size: `${(file.size / 1024).toFixed(1)} KB`,
          type: file.type || "application/octet-stream",
          date: new Date().toLocaleDateString(),
          url: await readFileAsDataUrl(file),
          sentToDoctor: true,
          backendId: null,
        };

        const formData = new FormData();
        formData.append("file", file);
        if (consultationId) formData.append("consultation_id", consultationId);
        try {
          const uploaded = await uploadMedicalReport(formData);
          if (uploaded?.id) {
            localReport.backendId = uploaded.id;
            if (uploaded.sent_to_doctor) {
              sendReportToDoctorApi(uploaded.id).catch(() => {});
            }
          }
        } catch {}

        return localReport;
      }),
    );

    const merged = [...uploadedReports, ...newReports];
    persistReports(merged);
    setShowUploadModal(false);
    newReports.forEach((report) => notifyReportSent(report));

    if (e.target) e.target.value = "";
  };

  // Get the appropriate avatar
  const getAvatar = (person) => {
    if (person === "patient") return patientData.avatar || resolveImageUrl(user?.profile_image || user?.PhotoUrl);
    if (person === "doctor") return doctorData.avatar || resolveImageUrl(passedDoctor?.image);
    return null;
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  };

  const avatarColors = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444"];
  const getAvatarColor = (name) => {
    if (!name) return avatarColors[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return avatarColors[Math.abs(hash) % avatarColors.length];
  };

  const handleImgError = (e, name) => {
    const initials = getInitials(name);
    const bg = getAvatarColor(name);
    e.target.style.display = "none";
    const parent = e.target.parentElement;
    if (parent && !parent.querySelector(".cli-avatar-fallback")) {
      const div = document.createElement("div");
      div.className = "cli-avatar-fallback";
      div.style.cssText = `width:100%;height:100%;border-radius:50%;background:${bg};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1rem;`;
      div.textContent = initials;
      parent.appendChild(div);
    }
  };

  // Get display name
  const getDisplayName = () => {
    if (isDoctor) return patientData.name;
    if (isPatient) return doctorData.name;
    return "User";
  };

  const getRoleLabel = () => {
    if (isDoctor) return "Doctor View";
    if (isPatient) return "Patient View";
    if (isAdmin) return "Admin View";
    return "Guest View";
  };

  return (
    <div className={`cli-wrapper ${darkMode ? "dark" : "light"}`}>
      {/* ============================================
          SECTION: ACTIVE CALL OVERLAY
          ============================================ */}
      {activeCall && (
        <section className="cli-call-overlay" aria-label="Active call">
          <div className="cli-call-avatar">
            {getAvatar(isDoctor ? "patient" : "doctor") ? (
              <img
                src={getAvatar(isDoctor ? "patient" : "doctor")}
                alt="Call avatar"
                className="cli-call-avatar-img"
                onError={(e) => handleImgError(e, isDoctor ? patientData.name : doctorData.name)}
              />
            ) : (
              <div className="cli-avatar-fallback" style={{ width: "100%", height: "100%", borderRadius: "50%", background: getAvatarColor(isDoctor ? patientData.name : doctorData.name), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1.5rem" }}>
                {getInitials(isDoctor ? patientData.name : doctorData.name)}
              </div>
            )}
          </div>
          <div className="cli-call-info">
            <h2>{isDoctor ? patientData.name : doctorData.name}</h2>
            <p>
              {activeCall === "audio" ? "Voice Call" : "Video Call"} •{" "}
              {formatDuration(callDuration)}
            </p>
          </div>
          <button
            className="cli-call-end-btn"
            onClick={handleEndCall}
            aria-label="End call"
          >
            <FaPhoneSlash size={28} color="white" />
          </button>
        </section>
      )}

      {/* ============================================
          SECTION: HEADER
          ============================================ */}
      <header className="cli-header" role="banner">
        <div className="cli-header-left">
          <div className="cli-header-avatar">
            {getAvatar(isDoctor ? "patient" : "doctor") ? (
              <img
                src={getAvatar(isDoctor ? "patient" : "doctor")}
                alt="Avatar"
                className="cli-avatar-img"
                onError={(e) => handleImgError(e, isDoctor ? patientData.name : doctorData.name)}
              />
            ) : (
              <div className="cli-avatar-fallback" style={{ width: "100%", height: "100%", borderRadius: "50%", background: getAvatarColor(isDoctor ? patientData.name : doctorData.name), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1rem" }}>
                {getInitials(isDoctor ? patientData.name : doctorData.name)}
              </div>
            )}
          </div>
          <div className="cli-header-info">
            <h3>{getDisplayName()}</h3>
            <p>
              <span className="cli-online-dot" aria-hidden="true"></span>
              Online • {getRoleLabel()}
            </p>
          </div>
        </div>

        <div className="cli-header-actions">
        
          <button
            className="cli-icon-btn cli-audio-btn"
            onClick={() => handleStartCall("audio")}
            aria-label="Start audio call"
          >
            <FaPhone size={20} />
          </button>
          <button
            className="cli-icon-btn cli-video-btn"
            onClick={() => handleStartCall("video")}
            aria-label="Start video call"
          >
            <FaVideo size={20} />
          </button>

          {/* <div className="cli-more-menu-wrap">
            <button
              className="cli-icon-btn cli-more-btn"
              onClick={() => setShowMoreOptions((prev) => !prev)}
              aria-label="More options"
              aria-expanded={showMoreOptions}
            >
              <FaEllipsisH size={20} />
            </button>
            {showMoreOptions && (
              <div className="cli-more-dropdown" role="menu">
                <button className="cli-dropdown-item" role="menuitem">
                  <FaFileAlt size={16} /> View Medical Records
                </button>
                <button className="cli-dropdown-item" role="menuitem">
                  <FaChartLine size={16} /> Vital Signs
                </button>
                <button
                  className="cli-dropdown-item cli-danger"
                  role="menuitem"
                >
                  <FaTimes size={16} /> End Consultation
                </button>
              </div>
            )}
          </div> */}

          <button
            className="cli-end-consult-btn"
            onClick={handleEndConsultation}
            aria-label="End consultation"
          >
            End Consultation
          </button>
        </div>
      </header>

      {/* ============================================
          SECTION: INCOMING CALL NOTIFICATION
          ============================================ */}
      {incomingCall && !activeCall && (
        <div className="cli-incoming-call-overlay" role="alertdialog" aria-label="Incoming call">
          <div className="cli-incoming-call-card">
            <div className="cli-incoming-call-avatar">
              {getAvatar(isDoctor ? "patient" : "doctor") ? (
                <img
                  src={getAvatar(isDoctor ? "patient" : "doctor")}
                  alt="Caller"
                  className="cli-avatar-img"
                  onError={(e) => handleImgError(e, isDoctor ? patientData.name : doctorData.name)}
                />
              ) : (
                <div className="cli-avatar-fallback" style={{ width: "100%", height: "100%", borderRadius: "50%", background: getAvatarColor(isDoctor ? patientData.name : doctorData.name), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1.2rem" }}>
                  {getInitials(isDoctor ? patientData.name : doctorData.name)}
                </div>
              )}
            </div>
            <div className="cli-incoming-call-info">
              <h3>Incoming {incomingCall.type === "video" ? "Video" : "Voice"} Call</h3>
              <p>{isDoctor ? patientData.name : doctorData.name}</p>
            </div>
            <div className="cli-incoming-call-actions">
              <button className="cli-call-accept-btn" onClick={handleAcceptCall} aria-label="Accept call">
                <FaPhone size={20} color="white" />
              </button>
              <button className="cli-call-reject-btn" onClick={handleRejectCall} aria-label="Reject call">
                <FaPhoneSlash size={20} color="white" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================
          SECTION: MAIN BODY
          ============================================ */}
      <main className="cli-body" role="main">
        {/* ----- LEFT SIDEBAR ----- */}
        <aside className="cli-sidebar" aria-label="Patient information">
          <div className="cli-sidebar-profile">
            <div className="cli-profile-avatar-lg">
              {getAvatar(isDoctor ? "patient" : "doctor") ? (
                <img
                  src={getAvatar(isDoctor ? "patient" : "doctor")}
                  alt="Profile"
                  className="cli-profile-avatar-img"
                  onError={(e) => handleImgError(e, isDoctor ? patientData.name : doctorData.name)}
                />
              ) : (
                <div className="cli-avatar-fallback" style={{ width: "100%", height: "100%", borderRadius: "50%", background: getAvatarColor(isDoctor ? patientData.name : doctorData.name), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1.5rem" }}>
                  {getInitials(isDoctor ? patientData.name : doctorData.name)}
                </div>
              )}
            </div>
            <h3>{isDoctor ? patientData.name : doctorData.name}</h3>
            {isPatient && <p>{doctorData.specialty}</p>}
            {isDoctor && <p>{patientData.age}</p>}
            {isDoctor && (
              <p className="cli-patient-id">Patient ID: {patientData.id}</p>
            )}
            {consultationId && (
              <p className="cli-patient-id" style={{ marginTop: 4 }}>
                Consultation ID: CONS-{String(consultationId).padStart(5, "0")}
              </p>
            )}
          </div>

          <div className="cli-sidebar-details">
            {isDoctor ? (
              <>
                <div className="cli-detail-row">
                  <h4>
                    <FaStethoscope size={16} /> Symptoms
                  </h4>
                  <p>{patientData.symptoms}</p>
                </div>
                <div className="cli-detail-row">
                  <h4>
                    <FaClock size={16} /> Duration
                  </h4>
                  <p>{formatDuration(consultationDuration)}</p>
                </div>
                <div className="cli-detail-row">
                  <h4>
                    <FaHistory size={16} /> History
                  </h4>
                  <p>{patientData.history}</p>
                </div>
              </>
            ) : isPatient ? (
              <>
                <div className="cli-detail-row">
                  <h4>
                    <FaUserMd size={16} /> Doctor
                  </h4>
                  <p>{doctorData.name}</p>
                </div>
                <div className="cli-detail-row">
                  <h4>
                    <FaStethoscope size={16} /> Specialty
                  </h4>
                  <p>{doctorData.specialty}</p>
                </div>
                <div className="cli-detail-row">
                  <h4>
                    <FaClock size={16} /> Consultation
                  </h4>
                  <p>In Progress</p>
                </div>
              </>
            ) : (
              <div className="cli-detail-row">
                <h4>
                  <FaUser size={16} /> User
                </h4>
                <p>Admin Access</p>
              </div>
            )}
          </div>

          <nav
            className="cli-sidebar-nav"
            role="navigation"
            aria-label="Sidebar navigation"
          >
            {isDoctor && (
              <>
                <button
                  type="button"
                  className="cli-nav-btn"
                  onClick={handleTogglePrescription}
                  aria-expanded={showPrescription}
                >
                  <span>
                    <FaPills size={18} /> Prescription
                  </span>
                  <FaChevronRight size={16} />
                </button>
                <button
                  type="button"
                  className="cli-nav-btn"
                  onClick={handleToggleDoctorReports}
                  aria-expanded={showDoctorReports}
                >
                  <span>
                    <FaClipboardList size={18} /> Medical Reports
                  </span>
                  <span className="cli-nav-badge">{doctorReports.length}</span>
                </button>
                <button
                  type="button"
                  className="cli-nav-btn"
                  onClick={handleToggleDoctorNotes}
                  aria-expanded={showDoctorNotes}
                >
                  <span>
                    <FaNotesMedical size={18} /> Doctor Notes
                  </span>
                  <FaChevronRight size={16} />
                </button>
              </>
            )}
            {isPatient && (
              <>
                <button
                  type="button"
                  className="cli-nav-btn"
                  onClick={handleTogglePatientReports}
                  aria-expanded={showReports}
                >
                  <span>
                    <FaFileMedical size={18} /> My Reports
                  </span>
                  <span className="cli-nav-badge">
                    {uploadedReports.length}
                  </span>
                </button>
                <button
                  type="button"
                  className="cli-nav-btn"
                  onClick={handleBookAppointment}
                >
                  <span>
                    <FaCalendarAlt size={18} /> Book Appointment
                  </span>
                  <FaChevronRight size={16} />
                </button>
                <button className="cli-nav-btn">
                  <span>
                    <FaHistory size={18} /> History
                  </span>
                  <FaChevronRight size={16} />
                </button>
              </>
            )}
            {isAdmin && (
              <>
                <button className="cli-nav-btn">
                  <span>
                    <FaUser size={18} /> User Management
                  </span>
                  <FaChevronRight size={16} />
                </button>
                <button className="cli-nav-btn">
                  <span>
                    <FaChartLine size={18} /> Analytics
                  </span>
                  <FaChevronRight size={16} />
                </button>
              </>
            )}
          </nav>
        </aside>

        {/* ----- CHAT SECTION ----- */}
        <section className="cli-chat-area" aria-label="Chat messages">
          <div className="cli-chat-messages" role="log">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`cli-msg-row ${
                  msg.sender === "system"
                    ? "cli-system"
                    : msg.sender === (isDoctor ? "doctor" : "patient")
                      ? "cli-me"
                      : "cli-other"
                }`}
              >
                {msg.sender === "system" ? (
                  <div className="cli-system-msg">{msg.text}</div>
                ) : msg.type === "report" ? (
                  <div className="cli-chat-bubble">
                    <p>{msg.text}</p>
                    <div className="cli-rx-msg-card cli-report-msg-card">
                      <strong>{msg.report?.name || "Medical Report"}</strong>
                      <button
                        type="button"
                        className="cli-rx-view-btn"
                        onClick={() => handleOpenReport(msg.report)}
                      >
                        <FaFileAlt size={12} /> Open Report
                      </button>
                    </div>
                    <span className="cli-msg-time">{msg.time}</span>
                  </div>
                ) : msg.type === "prescription" ? (
                  <div className="cli-chat-bubble">
                    <p>{msg.text}</p>
                    <div className="cli-rx-msg-card">
                      <strong>E-Prescription Slip</strong>
                      <button
                        type="button"
                        className="cli-rx-view-btn"
                        onClick={() => setViewPrescriptionData(msg.prescription)}
                      >
                        <FaPills size={12} /> View Prescription
                      </button>
                    </div>
                    <span className="cli-msg-time">{msg.time}</span>
                  </div>
                ) : (
                  <div className="cli-chat-bubble">
                    <p>{msg.text}</p>
                    <span className="cli-msg-time">{msg.time}</span>
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="cli-msg-row cli-other">
                <div className="cli-chat-bubble cli-typing-bubble">
                  <span>Doctor is typing</span>
                  <span className="cli-typing-dots" aria-hidden="true">
                    <span></span>
                    <span></span>
                    <span></span>
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="cli-chat-input">
            <button className="cli-input-icon" aria-label="Attach file">
              <FaPaperclip size={20} />
            </button>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              aria-label="Type a message"
            />
            <button className="cli-input-icon" aria-label="Add emoji">
              <FaSmile size={20} />
            </button>
            <button
              className="cli-send-btn"
              onClick={handleSendMessage}
              aria-label="Send message"
            >
              <FaPaperPlane size={18} />
            </button>
          </div>
        </section>

        {/* ----- RIGHT PANEL: PRESCRIPTION (Doctor only) ----- */}
        {isDoctor && showPrescription && prescriptionData && (
          <aside className="cli-right-panel" aria-label="Prescription">
            <header className="cli-panel-header">
              <h3>
                <FaPills size={20} /> E-Prescription
                {hasPrescriptionDraft && (
                  <span className="cli-draft-tag">Draft</span>
                )}
              </h3>
              <button
                className="cli-panel-close"
                onClick={() => setShowPrescription(false)}
                aria-label="Close prescription panel"
              >
                <FaTimes size={20} />
              </button>
            </header>
            <div className="cli-panel-content">
              <EPrescriptionEditor
                data={prescriptionData}
                onChange={setPrescriptionData}
                isDraft={hasPrescriptionDraft}
              />
            </div>
            <footer className="cli-panel-actions">
              <button
                type="button"
                className="cli-panel-btn-outline"
                onClick={handleSavePrescriptionDraft}
              >
                <FaUpload size={16} /> Save Draft
              </button>
              <button
                type="button"
                className="cli-panel-btn-primary"
                onClick={handleSendPrescription}
              >
                <FaCheckCircle size={16} /> Send Prescription
              </button>
            </footer>
          </aside>
        )}

        {/* ----- RIGHT PANEL: DOCTOR NOTES (Doctor) ----- */}
        {isDoctor && showDoctorNotes && (
          <aside className="cli-right-panel" aria-label="Doctor notes panel">
            <header className="cli-panel-header">
              <h3>
                <FaNotesMedical size={20} /> Doctor Notes
              </h3>
              <button
                type="button"
                className="cli-panel-close"
                onClick={() => setShowDoctorNotes(false)}
                aria-label="Close doctor notes panel"
              >
                <FaTimes size={20} />
              </button>
            </header>
            <div className="cli-panel-content">
              <textarea
                value={doctorNotesText}
                onChange={(e) => setDoctorNotesText(e.target.value)}
                placeholder="Enter your clinical notes here..."
                style={{
                  width: "100%",
                  minHeight: 220,
                  padding: "0.8rem 0.9rem",
                  borderRadius: 14,
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-primary)",
                  color: "var(--text-primary)",
                  fontSize: "0.95rem",
                  resize: "vertical",
                  fontFamily: "inherit",
                  lineHeight: 1.6,
                  boxSizing: "border-box",
                }}
              />
            </div>
            <footer className="cli-panel-actions">
              <button
                type="button"
                className="cli-panel-btn-outline"
                onClick={() => setShowDoctorNotes(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cli-panel-btn-primary"
                onClick={handleSaveDoctorNotes}
              >
                <FaCheckCircle size={16} /> Save Notes
              </button>
            </footer>
          </aside>
        )}

        {/* ----- RIGHT PANEL: REPORTS (Doctor) ----- */}
        {isDoctor && showDoctorReports && (
          <aside className="cli-right-panel" aria-label="Patient medical reports">
            <header className="cli-panel-header">
              <h3>
                <FaClipboardList size={20} /> Medical Reports
              </h3>
              <button
                type="button"
                className="cli-panel-close"
                onClick={() => setShowDoctorReports(false)}
                aria-label="Close reports panel"
              >
                <FaTimes size={20} />
              </button>
            </header>
            <div className="cli-panel-content">
              {doctorReports.length === 0 ? (
                <div className="cli-panel-empty">
                  <FaFileMedical size={48} />
                  <p>No reports received yet</p>
                  <span>Patient shared reports will appear here</span>
                </div>
              ) : (
                <div className="cli-reports-list">
                  {doctorReports.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className="cli-report-card cli-report-card-btn"
                      onClick={() => handleOpenReport(r)}
                    >
                      <div className="cli-report-icon">
                        <FaFileAlt size={20} color="white" />
                      </div>
                      <div className="cli-report-info">
                        <p>{r.name}</p>
                        <span>
                          {r.size} • {r.date}
                        </span>
                      </div>
                      <span className="cli-report-open-hint">Open</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>
        )}

        {/* ----- RIGHT PANEL: REPORTS (Patient) ----- */}
        {isPatient && showReports && (
          <aside className="cli-right-panel" aria-label="Medical reports">
            <header className="cli-panel-header">
              <h3>
                <FaFileMedical size={20} /> My Reports
              </h3>
              <button
                className="cli-panel-close"
                onClick={() => setShowReports(false)}
                aria-label="Close reports panel"
              >
                <FaTimes size={20} />
              </button>
            </header>
            <div className="cli-panel-content">
              {uploadedReports.length === 0 ? (
                <div className="cli-panel-empty">
                  <FaFileMedical size={48} />
                  <p>No reports uploaded yet</p>
                  <span>Upload your medical reports for easy access</span>
                </div>
              ) : (
                <div className="cli-reports-list">
                  {uploadedReports.map((r) => (
                    <div key={r.id} className="cli-report-card-wrap">
                      <button
                        type="button"
                        className="cli-report-card cli-report-card-btn"
                        onClick={() => handleOpenReport(r)}
                      >
                        <div className="cli-report-icon">
                          <FaFileAlt size={20} color="white" />
                        </div>
                        <div className="cli-report-info">
                          <p>{r.name}</p>
                          <span>
                            {r.size} • {r.date}
                            {r.sentToDoctor ? " • Sent" : ""}
                          </span>
                        </div>
                        <span className="cli-report-open-hint">Open</span>
                      </button>
                      {!r.sentToDoctor && (
                        <button
                          type="button"
                          className="cli-report-send-btn"
                          onClick={() => handleSendReportToDoctor(r.id)}
                        >
                          <FaPaperPlane size={12} /> Send to Doctor
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              className="cli-upload-report-btn"
              onClick={() => setShowUploadModal(true)}
            >
              <FaUpload size={18} /> Add Report
            </button>
          </aside>
        )}
      </main>

      {/* ============================================
          SECTION: FLOATING ACTION BUTTONS
          ============================================ */}
      <div
        className={`cli-floating-actions ${showPrescription || showReports || showDoctorReports ? "cli-panel-open" : ""}`}
      >
        {isDoctor && (
          <button
            className="cli-fab-btn cli-primary"
            onClick={() => setShowCaseCompletion(true)}
          >
            <FaCheckCircle size={18} /> Case Completion
          </button>
        )}
        {isPatient && (
          <button
            className="cli-fab-btn cli-primary"
            onClick={() => setShowFeedback(true)}
          >
            <FaStar size={18} /> Feedback & Rating
          </button>
        )}
        {isAdmin && (
          <button className="cli-fab-btn cli-admin">
            <FaUser size={18} /> Admin Panel
          </button>
        )}
      </div>

      {/* ============================================
          SECTION: MODAL - CASE COMPLETION (Doctor)
          ============================================ */}
      {isDoctor && showCaseCompletion && (
        <section
          className="cli-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Case completion"
        >
          <div className="cli-modal-box">
            <h2>Case Completion</h2>
            <p>Mandatory for smooth operations</p>

            <div className="cli-modal-actions">
              <button
                className="cli-modal-btn cli-revisit"
                onClick={() => handleCaseCompletion("revisit")}
              >
                <FaCalendarAlt size={24} /> Schedule Revisit
              </button>
              <button
                className="cli-modal-btn cli-no-revisit"
                onClick={() => handleCaseCompletion("no-revisit")}
              >
                <FaTimesCircle size={24} /> No Revisit
              </button>
            </div>

            <div className="cli-modal-warning" role="alert">
              ⚠ Required: After completing case, you must either schedule a revisit or mark it as no further follow-ups.
            </div>

            <button
              className="cli-modal-cancel"
              onClick={() => setShowCaseCompletion(false)}
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {/* ============================================
          SECTION: MODAL - REVISIT OPTIONS (Doctor)
          ============================================ */}
      {isDoctor && showRevisitOptions && (
        <section
          className="cli-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Revisit options"
        >
          <div className="cli-modal-box">
            <h2>Select Revisit Type</h2>

            <div className="cli-modal-actions cli-vertical">
              <button
                className="cli-modal-btn cli-revisit"
                onClick={() => handleRevisitOption("consult")}
              >
                <FaStethoscope size={24} /> Consultation
              </button>
              <button
                className="cli-modal-btn cli-revisit"
                onClick={() => handleRevisitOption("appointment")}
              >
                <FaCalendarAlt size={24} /> Appointment
              </button>
            </div>

            <button
              className="cli-modal-cancel"
              onClick={() => setShowRevisitOptions(false)}
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {/* ============================================
          SECTION: MODAL - CALENDAR (Doctor)
          ============================================ */}
      {isDoctor && showCalendar && (
        <section
          className="cli-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Schedule calendar"
        >
          <div className="cli-modal-box cli-wide">
            <h2>
              Schedule{" "}
              {calendarMode === "consult" ? "Consultation" : "Appointment"}
            </h2>
            <p>Select your preferred date and time</p>

            <div className="cli-calendar-section">
              <h4>Select Date</h4>
              <div className="cli-calendar-days">
                {generateCalendarDays().map((day) => (
                  <button
                    key={day.date}
                    onClick={() => setSelectedDate(day.date)}
                    className={`cli-calendar-day ${selectedDate === day.date ? "cli-active" : ""}`}
                    aria-pressed={selectedDate === day.date}
                  >
                    <span className="cli-day-name">{day.dayName}</span>
                    <span className="cli-day-num">{day.dayNum}</span>
                    <span className="cli-day-month">{day.month}</span>
                  </button>
                ))}
              </div>
            </div>

            {selectedDate && (
              <div className="cli-calendar-section">
                <h4>Select Time</h4>
                {customTimeMode ? (
                  <div style={{ padding: "8px 0", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <input
                      type="time"
                      value={customTimeValue}
                      onChange={(e) => {
                        setCustomTimeValue(e.target.value);
                        setSelectedTime(e.target.value);
                      }}
                      style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px" }}
                    />
                    <button
                      onClick={() => { setCustomTimeMode(false); setCustomTimeValue(""); setSelectedTime(""); }}
                      style={{ fontSize: "12px", color: "#6366f1", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                    >
                      ← Back to time slots
                    </button>
                  </div>
                ) : (
                  <div className="cli-time-grid">
                    {timeSlots.map((time) => (
                      <button
                        key={time.value}
                        onClick={() => setSelectedTime(time.value)}
                        className={`cli-time-slot ${selectedTime === time.value ? "cli-active" : ""}`}
                        aria-pressed={selectedTime === time.value}
                      >
                        {time.label}
                      </button>
                    ))}
                    <button
                      onClick={() => setCustomTimeMode(true)}
                      className="cli-time-slot"
                      style={{ background: "rgba(245, 158, 11, 0.08)", borderColor: "rgba(245, 158, 11, 0.3)", color: "#f59e0b", fontWeight: 600 }}
                    >
                      Custom Time
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="cli-modal-actions-row">
              <button
                className="cli-modal-cancel"
                onClick={() => setShowCalendar(false)}
              >
                Cancel
              </button>
              <button
                className="cli-modal-confirm"
                onClick={handleSchedule}
                disabled={!selectedDate || !selectedTime}
              >
                Schedule
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ============================================
          SECTION: MODAL - FEEDBACK (Patient)
          ============================================ */}
      {isPatient && showFeedback && (
        <section
          className="cli-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Feedback"
        >
          <div className="cli-modal-box">
            {feedbackSubmitted ? (
              <div className="cli-feedback-success">
                <div className="cli-success-icon">
                  <FaCheckCircle size={32} color="white" />
                </div>
                <h3>Thank You!</h3>
                <p>Your feedback has been submitted successfully.</p>
              </div>
            ) : (
              <>
                <h2>Feedback & Rating</h2>
                <p>How was your consultation with {doctorData.name}?</p>

                <div className="cli-star-rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="cli-star-btn"
                      aria-label={`Rate ${star} stars`}
                    >
                      <FaStar
                        size={32}
                        color={
                          (hoverRating || rating) >= star ? "#ffc800" : "#ddd"
                        }
                      />
                    </button>
                  ))}
                </div>

                <p className="cli-rating-label">
                  {rating === 1 && "Poor"}
                  {rating === 2 && "Fair"}
                  {rating === 3 && "Good"}
                  {rating === 4 && "Very Good"}
                  {rating === 5 && "Excellent"}
                  {rating === 0 && "Select a rating"}
                </p>

                <textarea
                  className="cli-feedback-textarea"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Share your experience (optional)..."
                  aria-label="Feedback text"
                />

                <div className="cli-feedback-tags">
                  <button className="cli-tag-btn">
                    <FaThumbsUp size={14} /> Helpful
                  </button>
                  <button className="cli-tag-btn">
                    <FaCommentDots size={14} /> Responsive
                  </button>
                  <button className="cli-tag-btn">
                    <FaThumbsDown size={14} /> Rushed
                  </button>
                </div>

                <div className="cli-modal-actions-row">
                  <button
                    className="cli-modal-cancel"
                    onClick={() => setShowFeedback(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="cli-modal-confirm"
                    onClick={handleFeedbackSubmit}
                    disabled={rating === 0}
                  >
                    Submit Feedback
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* ============================================
          SECTION: MODAL - UPLOAD REPORTS (Patient)
          ============================================ */}
      {isPatient && showUploadModal && (
        <section
          className="cli-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Upload reports"
        >
          <div className="cli-modal-box">
            <h2>Add Reports</h2>
            <p>Upload your medical reports and documents</p>

            <div
              className="cli-upload-zone"
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex="0"
              onKeyPress={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
            >
              <FaUpload size={48} />
              <p>Click to Upload</p>
              <span>PDF, JPG, PNG up to 10MB</span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileUpload}
              className="cli-hidden-input"
              aria-label="Upload files"
            />

            <button
              className="cli-modal-cancel"
              onClick={() => setShowUploadModal(false)}
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {/* ============================================
          SECTION: MODAL - REPORT VIEWER
          ============================================ */}
      {selectedReport && (
        <section
          className="cli-report-viewer-overlay"
          onClick={() => setSelectedReport(null)}
          role="presentation"
        >
          <div
            className="cli-report-viewer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Report viewer"
          >
            <header className="cli-report-viewer-header">
              <h3>{selectedReport.name}</h3>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="cli-report-viewer-close"
                  onClick={() => {
                    if (selectedReport?.url) {
                      const storagePath = selectedReport.url.replace(/^https?:\/\/[^/]+\/storage\//, "").replace(/^\/+/, "");
                      const downloadUrl = `${API_BASE_URL}/api/download/${encodeURIComponent(storagePath)}`;
                      const link = document.createElement("a");
                      link.href = downloadUrl;
                      link.download = selectedReport.name || "report";
                      link.target = "_blank";
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }
                  }}
                  aria-label="Download report"
                  title="Download"
                >
                  <FaDownload />
                </button>
                <button
                  type="button"
                  className="cli-report-viewer-close"
                  onClick={() => setSelectedReport(null)}
                  aria-label="Close report viewer"
                >
                  <FaTimes />
                </button>
              </div>
            </header>
            <div className="cli-report-viewer-body">
              {selectedReport.type?.startsWith("image/") ? (
                <img src={selectedReport.url} alt={selectedReport.name} />
              ) : selectedReport.type === "application/pdf" ? (
                <iframe
                  src={selectedReport.url}
                  title={selectedReport.name}
                  className="cli-report-pdf-frame"
                />
              ) : (
                <div className="cli-report-fallback">
                  <FaFileAlt size={48} />
                  <p>Preview not available for this file type.</p>
                  <a href={selectedReport.url} download={selectedReport.name}>
                    Download {selectedReport.name}
                  </a>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ============================================
          SECTION: MODAL - E-PRESCRIPTION VIEW
          Doctor & Patient can view sent prescription slip
          ============================================ */}
      {viewPrescriptionData && (
        <EPrescriptionModal
          data={viewPrescriptionData}
          onClose={() => setViewPrescriptionData(null)}
        />
      )}

    </div>
  );
};

export default Clinic;
