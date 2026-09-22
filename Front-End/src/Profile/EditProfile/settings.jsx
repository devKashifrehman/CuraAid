import React, { useState, useRef, useEffect, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaCamera,
  FaEye,
  FaEyeSlash,
  FaSave,
  FaShieldAlt,
  FaGlobe,
  FaMapMarkerAlt,
  FaEdit,
  FaCheckCircle,
  FaSpinner,
  FaChevronRight,
  FaLock,
} from "react-icons/fa";
import { ThemeContext } from "../../Theme/ThemeContext";
import { AuthContext } from "../../HeadFoot/Auth/AuthContext";
import clinicLogo from "../../images/clinic-logo.png";
import { loadTemplateConfig } from "../EPrescription/eprescriptionTemplates";
import "./settings.css";
import Sidebar from "../Hamburger/sidebar";

const getBaseUrl = () =>
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

const placeholder =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23e0e0e0'/><text x='50' y='55' font-size='12' text-anchor='middle' fill='%23999'>No%20Image</text></svg>";

const resolveAvatarUrl = (path) => {
  if (!path) return placeholder;
  if (path.startsWith("data:")) return path;
  if (path.startsWith("http")) return path;
  if (path.startsWith("/")) return `${getBaseUrl()}${path}`;
  return `${getBaseUrl()}/storage/${path}`;
};

// ============== Geocoding Helper ============================
const geocodeAddress = async (address) => {
  if (!address || address.trim() === "") return null;
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
    );
    const data = await response.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
};

// ====================== Completion Animation Component ========================
const CompletionAnimation = ({ show, message, onComplete }) => {
  const { darkMode } = useContext(ThemeContext);

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onComplete();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div
      className={`settings-completion-overlay ${darkMode ? "dark" : "light"}`}
    >
      <div className="settings-completion-content">
        <div className="settings-completion-circle">
          <FaCheckCircle className="settings-completion-icon" />
        </div>
        <h3 className="settings-completion-title">{message}</h3>
        <p className="settings-completion-subtitle">Updated successfully</p>
      </div>
    </div>
  );
};

// ====================== Map Renderer =========================
const renderMap = (lat, lng, location) => {
  if (!lat || !lng) {
    return (
      <div className="settings-map-placeholder">
        <FaMapMarkerAlt className="settings-map-icon" />
        <p>{location ? "Loading map..." : "Enter location to see map"}</p>
      </div>
    );
  }
  return (
    <div className="settings-map-container">
      <iframe
        title="location-map"
        width="100%"
        height="100%"
        className="settings-map-iframe"
        loading="lazy"
        allowFullScreen
        src={`https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d5000!2d${lng}!3d${lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2s!4v1`}
      />
    </div>
  );
};

// ============================================ MAIN COMPONENT ==========================================
const Settings = () => {
  const navigate = useNavigate();
  const { darkMode } = useContext(ThemeContext);
  const { user, token, isDoctor, isPatient, updateUser } = useContext(AuthContext);

  // ===== Profile State — instant init from AuthContext, API se silently update =====
  const [doctorProfile, setDoctorProfile] = useState(() => {
    if (isDoctor) {
      return {
        fullName: user?.FullName || "",
        specialization: "General Physician",
        email: user?.Email || "",
        licenseNumber: "",
        phone: user?.Mobile || "",
        experience: "",
        gender: "",
        avatar: user?.PhotoUrl || placeholder,
        profile_image: "",
        created_at: null,
        experience_years: 0,
      };
    }
    return null;
  });
  const [patientProfile, setPatientProfile] = useState(() => {
    if (isPatient) {
      return {
        fullName: user?.FullName || "",
        email: user?.Email || "",
        phone: user?.Mobile || "",
        gender: "",
        avatar: user?.PhotoUrl || placeholder,
        profile_image: "",
        date_of_birth: "",
        blood_group: "",
        created_at: null,
      };
    }
    return null;
  });

  // ================== Edit States ============================================
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editGender, setEditGender] = useState("");

  //======================= Patient specific edit states (Editable for patient) ============================
  const [editDateOfBirth, setEditDateOfBirth] = useState("");
  const [editBloodGroup, setEditBloodGroup] = useState("");

  // ============================ Password Change State ==================================================
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // ============================ 2FA State ======================================================
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFALoading, setTwoFALoading] = useState(false);

  // ================================== Language & Region State ==========================
  const [language, setLanguage] = useState("English");
  const [region, setRegion] = useState("Pakistan");

  // ============================= Location State =========================================
  const [locationAddress, setLocationAddress] = useState("");
  const [locationLat, setLocationLat] = useState(null);
  const [locationLng, setLocationLng] = useState(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [savedLocation, setSavedLocation] = useState(null);

  // ======================== Completion Animation State =====================================
  const [showCompletion, setShowCompletion] = useState(false);
  const [completionMessage, setCompletionMessage] = useState("");

  // ================================== Avatar Upload Ref ==================================
  const fileInputRef = useRef(null);

  // ================================ Fetch Profile from API ==========================
  const fetchProfile = useCallback(async () => {
    if (!token) return;
    try {
      if (isDoctor) {
        const res = await axios.get(`${getBaseUrl()}/api/doctor/profile`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          timeout: 15000,
        });
        const dp = res.data?.doctor_profile;
        if (dp) {
          const u = dp.user || {};
          const pd = {
            fullName: u.name || user?.FullName || "",
            specialization: Array.isArray(dp.specialties) ? dp.specialties[0] || "General Physician" : "General Physician",
            email: dp.email || u.email || user?.Email || "",
            licenseNumber: dp.pmdc_number || "",
            phone: dp.phone || u.mobile || user?.Mobile || "",
            experience: dp.experience_years ? `${dp.experience_years}+ Years` : "\u2014",
            gender: u.gender || "",
            avatar: resolveAvatarUrl(u.profile_image),
            profile_image: u.profile_image || "",
            two_factor_enabled: u.two_factor_enabled || false,
            language: u.language || "English",
            region: u.region || "Pakistan",
            address: u.address || "",
            lat: u.lat || null,
            lng: u.lng || null,
            date_of_birth: u.date_of_birth || "",
            blood_group: u.blood_group || "",
            created_at: dp.created_at || null,
            experience_years: dp.experience_years || 0,
          };
          setDoctorProfile(pd);
          setTwoFactorEnabled(pd.two_factor_enabled);
          setLanguage(pd.language);
          setRegion(pd.region);
          setLocationAddress(pd.address);
          setLocationLat(pd.lat);
          setLocationLng(pd.lng);
        }
      } else if (isPatient) {
        const res = await axios.get(`${getBaseUrl()}/api/user`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          timeout: 15000,
        });
        const u = res.data?.user;
        if (u) {
          const pd = {
            fullName: u.name || user?.FullName || "",
            email: u.email || user?.Email || "",
            phone: u.mobile || user?.Mobile || "",
            gender: u.gender || "",
            avatar: resolveAvatarUrl(u.profile_image),
            profile_image: u.profile_image || "",
            two_factor_enabled: u.two_factor_enabled || false,
            language: u.language || "English",
            region: u.region || "Pakistan",
            address: u.address || "",
            lat: u.lat || null,
            lng: u.lng || null,
            date_of_birth: u.date_of_birth || "",
            blood_group: u.blood_group || "",
            created_at: u.created_at || null,
          };
          setPatientProfile(pd);
          setTwoFactorEnabled(pd.two_factor_enabled);
          setLanguage(pd.language);
          setRegion(pd.region);
          setLocationAddress(pd.address);
          setLocationLat(pd.lat);
          setLocationLng(pd.lng);
        }
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err?.response?.data || err?.message);
    }
  }, [token, isDoctor, isPatient, user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Sync edit fields when profile loads
  useEffect(() => {
    const p = isDoctor ? doctorProfile : patientProfile;
    if (p) {
      setEditName(p.fullName || "");
      setEditPhone(p.phone || "");
      setEditGender(p.gender || "");
      setEditDateOfBirth(p.date_of_birth || p.dateOfBirth || "");
      setEditBloodGroup(p.blood_group || p.bloodGroup || "");
    }
  }, [isDoctor, isPatient, doctorProfile, patientProfile]);

  // ===================================== Handle Location Geocoding ===================================
  const handleLocationChange = async (value) => {
    setLocationAddress(value);
    if (value.trim().length > 3) {
      setIsGeocoding(true);
      const coords = await geocodeAddress(value);
      if (coords) {
        setLocationLat(coords.lat);
        setLocationLng(coords.lng);
      }
      setIsGeocoding(false);
    }
  };

  // =================================== Save Location =======================
  const handleSaveLocation = async () => {
    if (!locationAddress.trim()) {
      alert("Please enter a location address first.");
      return;
    }
    try {
      await axios.put(
        `${getBaseUrl()}/api/profile`,
        { address: locationAddress, lat: locationLat, lng: locationLng },
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, timeout: 15000 }
      );
      setSavedLocation({ address: locationAddress, lat: locationLat, lng: locationLng });
      setCompletionMessage("Location saved successfully!");
      setShowCompletion(true);
    } catch (err) {
      console.error("Save location error:", err);
      alert("Failed to save location.");
    }
  };

  // ========================= Save Profile Changes =============================
  const handleSaveChanges = async () => {
    const payload = {
      name: editName,
      mobile: editPhone,
      gender: editGender,
    };
    if (isPatient) {
      payload.date_of_birth = editDateOfBirth || null;
      payload.blood_group = editBloodGroup || null;
    }

    // Optimistic: UI turant update
    if (isDoctor) {
      setDoctorProfile((prev) => ({ ...prev, fullName: editName, phone: editPhone, gender: editGender }));
    } else if (isPatient) {
      setPatientProfile((prev) => ({
        ...prev,
        fullName: editName,
        phone: editPhone,
        gender: editGender,
        date_of_birth: editDateOfBirth,
        blood_group: editBloodGroup,
      }));
    }
    updateUser({ FullName: editName, Mobile: editPhone });
    setEditMode(false);
    setCompletionMessage("Your profile has been saved successfully");
    setShowCompletion(true);

    // Background API call
    try {
      const res = await axios.put(`${getBaseUrl()}/api/profile`, payload, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        timeout: 15000,
      });
      const updatedUser = res.data?.user;
      if (updatedUser) {
        updateUser({ FullName: updatedUser.name, Mobile: updatedUser.mobile });
      }
    } catch (err) {
      console.error("Save profile error:", err);
    }
  };

  // ================================ Update Password =================================
  const handleUpdatePassword = async () => {
    if (
      !currentPassword.trim() ||
      !newPassword.trim() ||
      !confirmPassword.trim()
    )
      return;
    if (newPassword !== confirmPassword) {
      alert("New password and confirm password do not match!");
      return;
    }
    setPasswordLoading(true);
    try {
      await axios.post(
        `${getBaseUrl()}/api/change-password`,
        { current_password: currentPassword, new_password: newPassword },
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, timeout: 15000 }
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setCompletionMessage("Your password has been reset successfully");
      setShowCompletion(true);
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to change password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  // =========================== Toggle 2FA ===================================
  const handleToggle2FA = async () => {
    const next = !twoFactorEnabled;
    setTwoFALoading(true);
    try {
      await axios.post(
        `${getBaseUrl()}/api/two-factor`,
        { enabled: next },
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, timeout: 15000 }
      );
      setTwoFactorEnabled(next);
      setCompletionMessage(
        next
          ? "Two-Factor Authentication has been enabled"
          : "Two-Factor Authentication has been disabled",
      );
      setShowCompletion(true);
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to toggle 2FA.");
    } finally {
      setTwoFALoading(false);
    }
  };

  // =============================== Handle Avatar Change =======================
  const handleAvatarClick = () => {
    if (!editMode) return;
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("avatar", file);
    try {
      const res = await axios.post(`${getBaseUrl()}/api/profile/avatar`, formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
        timeout: 30000,
      });
      const newPath = res.data?.profile_image;
      const newUrl = resolveAvatarUrl(newPath);
      updateUser({ PhotoUrl: newUrl });
      if (isDoctor) {
        setDoctorProfile((prev) => ({ ...prev, avatar: newUrl, profile_image: newPath }));
      } else {
        setPatientProfile((prev) => ({ ...prev, avatar: newUrl, profile_image: newPath }));
      }
      setCompletionMessage("Avatar updated successfully");
      setShowCompletion(true);
    } catch (err) {
      console.error("Avatar upload error:", err);
      alert(err?.response?.data?.message || "Failed to upload avatar.");
    }
  };

  // ========================== Handle Edit Clinic Profile =========================
  const handleEditClinic = () => {
    navigate("/prescription-template");
  };

  const savedTemplate = isDoctor ? loadTemplateConfig() : null;
  const templateLogo = savedTemplate?.clinicLogo || clinicLogo;

  const profile = isDoctor ? doctorProfile : isPatient ? patientProfile : {};
  const displayAvatar = profile?.avatar || user?.PhotoUrl || placeholder;

  // ===== Live Experience Calculator =====
  const [liveExperience, setLiveExperience] = useState("");
  useEffect(() => {
    const calcExp = () => {
      const createdAt = profile?.created_at;
      const baseYears = isDoctor ? (profile?.experience_years || 0) : 0;
      if (!createdAt) {
        setLiveExperience(baseYears > 0 ? `${baseYears}+ Years` : "\u2014");
        return;
      }
      const start = new Date(createdAt);
      const now = new Date();
      const diffMs = now - start;
      const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const years = baseYears + Math.floor(totalDays / 365);
      const months = Math.floor((totalDays % 365) / 30);
      const days = totalDays % 30;
      if (years > 0) {
        setLiveExperience(months > 0 ? `${years}+ Years ${months}m ${days}d` : `${years}+ Years`);
      } else if (months > 0) {
        setLiveExperience(`${months} Months ${days} Days`);
      } else {
        setLiveExperience(`${days} Days`);
      }
    };
    calcExp();
    const timer = setInterval(calcExp, 60000);
    return () => clearInterval(timer);
  }, [profile?.created_at, profile?.experience_years, isDoctor]);

  // ================================== RENDER ========================================
  return (
    <div className="settings-layout">
      <Sidebar />
      <div className={`settings-wrapper ${darkMode ? "dark" : "light"}`}>
        {/* ==========================  PAGE HEADER Section ========================== */}
        <header className="settings-page-header">
          <div className="settings-page-header-left">
            <h1 className="settings-page-title">Profile Settings</h1>
            <p className="settings-page-subtitle">
              Manage your personal and professional information
            </p>
          </div>
        </header>

        {/* ==========================  MAIN CONTENT ========================== */}
        <div className="settings-content">
          <div className="settings-left">
            {/* ================== PROFILE INFORMATION Section ================================= */}
            <section className="settings-card settings-glass">
              <div className="settings-card-header">
                <h3>Profile Information</h3>
                {!editMode ? (
                  <button
                    className="settings-save-changes-btn"
                    onClick={() => setEditMode(true)}
                  >
                    <FaEdit /> Edit Profile
                  </button>
                ) : (
                  <button
                    className="settings-save-changes-btn"
                    onClick={handleSaveChanges}
                  >
                    <FaSave /> Save Changes
                  </button>
                )}
              </div>

              <div className="settings-profile-form">
                {/*====================== Avatar Section ========================*/}
                <div className="settings-avatar-section">
                  <div
                    className="settings-avatar-wrapper"
                    onClick={handleAvatarClick}
                    style={{ cursor: editMode ? "pointer" : "not-allowed" }}
                  >
                    <img
                      src={displayAvatar}
                      alt="Profile"
                      className="settings-profile-avatar"
                    />
                    <div className={`settings-avatar-overlay ${editMode ? "editable" : "locked"}`}>
                      {editMode ? (
                        <FaCamera className="settings-camera-icon" />
                      ) : (
                        <FaLock className="settings-lock-icon" />
                      )}
                    </div>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="settings-file-input-hidden"
                    accept="image/*"
                    onChange={handleAvatarChange}
                  />
                </div>
      {/* ============================= Patient Section =========================           */}
                {isPatient && (
                  <div className="settings-patient-fields">
                    <div className="settings-form-grid settings-two-col">
                      <div className="settings-form-group">
                        <label>Full Name</label>
                        {editMode ? (
                          <input
                            type="text"
                            className="settings-form-input"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                          />
                        ) : (
                          <div className="settings-form-display">
                            {profile?.fullName || "\u2014"}
                          </div>
                        )}
                      </div>

                      <div className="settings-form-group">
                        <label>Email Address</label>
                        <div className="settings-form-display settings-readonly-field">
                          {profile?.email || "\u2014"}
                        </div>
                      </div>

                      <div className="settings-form-group">
                        <label>Phone Number</label>
                        {editMode ? (
                          <input
                            type="tel"
                            className="settings-form-input"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                          />
                        ) : (
                          <div className="settings-form-display">
                            {profile?.phone || "\u2014"}
                          </div>
                        )}
                      </div>

                      <div className="settings-form-group">
                        <label>Gender</label>
                        {editMode ? (
                          <select
                            className="settings-form-select"
                            value={editGender}
                            onChange={(e) => setEditGender(e.target.value)}
                          >
                            <option value="">Select</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        ) : (
                          <div className="settings-form-display">
                            {profile?.gender || "\u2014"}
                          </div>
                        )}
                      </div>

                      <div className="settings-form-group">
                        <label>Date of Birth</label>
                        {editMode ? (
                          <input
                            type="date"
                            className="settings-form-input"
                            value={editDateOfBirth}
                            onChange={(e) => setEditDateOfBirth(e.target.value)}
                          />
                        ) : (
                          <div className="settings-form-display">
                            {profile?.date_of_birth || profile?.dateOfBirth || "\u2014"}
                          </div>
                        )}
                      </div>

                      <div className="settings-form-group">
                        <label>Blood Group</label>
                        {editMode ? (
                          <select
                            className="settings-form-select"
                            value={editBloodGroup}
                            onChange={(e) => setEditBloodGroup(e.target.value)}
                          >
                            <option value="">Select</option>
                            <option value="A+">A+</option>
                            <option value="A-">A-</option>
                            <option value="B+">B+</option>
                            <option value="B-">B-</option>
                            <option value="AB+">AB+</option>
                            <option value="AB-">AB-</option>
                            <option value="O+">O+</option>
                            <option value="O-">O-</option>
                          </select>
                        ) : (
                          <div className="settings-form-display">
                            {profile?.blood_group || profile?.bloodGroup || "\u2014"}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

        {/* =============== Doctor Section ==================================== */}
                {isDoctor && (
                  <div className="settings-doctor-fields">
                    <div className="settings-form-grid settings-two-col">
                      <div className="settings-form-group">
                        <label>Full Name</label>
                        {editMode ? (
                          <input
                            type="text"
                            className="settings-form-input"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                          />
                        ) : (
                          <div className="settings-form-display">
                            {profile?.fullName || "\u2014"}
                          </div>
                        )}
                      </div>

                      <div className="settings-form-group">
                        <label>Email Address</label>
                        <div className="settings-form-display settings-readonly-field">
                          {profile?.email || "\u2014"}
                        </div>
                      </div>

                      <div className="settings-form-group">
                        <label>Phone Number</label>
                        {editMode ? (
                          <input
                            type="tel"
                            className="settings-form-input"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                          />
                        ) : (
                          <div className="settings-form-display">
                            {profile?.phone || "\u2014"}
                          </div>
                        )}
                      </div>

                      <div className="settings-form-group">
                        <label>Gender</label>
                        {editMode ? (
                          <select
                            className="settings-form-select"
                            value={editGender}
                            onChange={(e) => setEditGender(e.target.value)}
                          >
                            <option value="">Select</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        ) : (
                          <div className="settings-form-display">
                            {profile?.gender || "\u2014"}
                          </div>
                        )}
                      </div>

                      <div className="settings-form-group">
                        <label>Specialization</label>
                        <div className="settings-form-display settings-readonly-field">
                          {profile.specialization}
                        </div>
                      </div>

                      <div className="settings-form-group">
                        <label>License Number</label>
                        <div className="settings-form-display settings-readonly-field">
                          {profile?.licenseNumber || "\u2014"}
                        </div>
                      </div>

                      <div className="settings-form-group">
                        <label>Experience</label>
                        <div className="settings-form-display settings-readonly-field">
                          {liveExperience}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* ========================= CHANGE PASSWORD Section ======================== */}
            <section className="settings-card settings-glass">
              <div className="settings-card-header">
                <div className="settings-section-icon-wrapper">
                  <FaShieldAlt className="settings-section-icon" />
                </div>
                <div className="settings-section-header-text">
                  <h3>Change Password</h3>
                  <p>Update your account password</p>
                </div>
              </div>

              <div className="settings-password-form">
                <div className="settings-form-grid settings-three-col">
                  <div className="settings-form-group settings-password-group">
                    <label>Current Password</label>
                    <div className="settings-password-input-wrapper">
                      <input
                        type={showCurrentPass ? "text" : "password"}
                        className="settings-form-input"
                        placeholder="Enter current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="settings-eye-btn"
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                      >
                        {showCurrentPass ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </div>
                  <div className="settings-form-group settings-password-group">
                    <label>New Password</label>
                    <div className="settings-password-input-wrapper">
                      <input
                        type={showNewPass ? "text" : "password"}
                        className="settings-form-input"
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="settings-eye-btn"
                        onClick={() => setShowNewPass(!showNewPass)}
                      >
                        {showNewPass ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </div>
                  <div className="settings-form-group settings-password-group">
                    <label>Confirm New Password</label>
                    <div className="settings-password-input-wrapper">
                      <input
                        type={showConfirmPass ? "text" : "password"}
                        className="settings-form-input"
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="settings-eye-btn"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                      >
                        {showConfirmPass ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="settings-password-actions">
                  <button
                    className="settings-update-password-btn"
                    onClick={handleUpdatePassword}
                    disabled={
                      passwordLoading ||
                      !currentPassword.trim() ||
                      !newPassword.trim() ||
                      !confirmPassword.trim()
                    }
                  >
                    {passwordLoading ? <><FaSpinner className="settings-spinner" /> Updating...</> : "Update Password"}
                  </button>
                </div>
              </div>
            </section>

            {/* ============= TWO-FACTOR AUTHENTICATION Section ======================== */}
            <section className="settings-card settings-glass">
              <div className="settings-card-header">
                <div className="settings-section-icon-wrapper">
                  <FaShieldAlt className="settings-section-icon" />
                </div>
                <div className="settings-section-header-text">
                  <h3>Two-Factor Authentication</h3>
                  <p>Add an extra layer of security to your account</p>
                </div>
                <label className="settings-toggle-switch">
                  <input
                    type="checkbox"
                    checked={twoFactorEnabled}
                    onChange={handleToggle2FA}
                    disabled={twoFALoading}
                  />
                  <span className="settings-toggle-slider"></span>
                </label>
              </div>
            </section>

            {/* ================== LANGUAGE & REGION Section ====================== */}
            <section className="settings-card settings-glass">
              <div className="settings-card-header">
                <div className="settings-section-icon-wrapper">
                  <FaGlobe className="settings-section-icon" />
                </div>
                <div className="settings-section-header-text">
                  <h3>Language & Region</h3>
                  <p>Customize your language and regional preferences</p>
                </div>
              </div>
              <div className="settings-form-grid settings-two-col">
                <div className="settings-form-group">
                  <label>Language</label>
                  <select
                    className="settings-form-select"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    <option value="English">English</option>
                    <option value="Urdu">Urdu</option>
                    <option value="Arabic">Arabic</option>
                    <option value="Spanish">Spanish</option>
                  </select>
                </div>
                <div className="settings-form-group">
                  <label>Region</label>
                  <select
                    className="settings-form-select"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                  >
                    <option value="Pakistan">Pakistan</option>
                    <option value="India">India</option>
                    <option value="UAE">UAE</option>
                    <option value="Saudi Arabia">Saudi Arabia</option>
                    <option value="USA">USA</option>
                    <option value="UK">UK</option>
                  </select>
                </div>
              </div>
            </section>

            {/* ======================== LOCATION Section ====================== */}
            <section className="settings-card settings-glass">
              <div className="settings-card-header">
                <div className="settings-section-icon-wrapper">
                  <FaMapMarkerAlt className="settings-section-icon" />
                </div>
                <div className="settings-section-header-text">
                  <h3>Location</h3>
                  <p>Enter your location to display on map</p>
                </div>
              </div>
              <div className="settings-location-section">
                <div className="settings-form-group">
                  <label>Your Address</label>
                  <div className="settings-location-input-wrapper">
                    <input
                      type="text"
                      className="settings-form-input settings-full"
                      placeholder="Enter your address (e.g., Lahore, Pakistan)"
                      value={locationAddress}
                      onChange={(e) => handleLocationChange(e.target.value)}
                    />
                    {isGeocoding && (
                      <div className="settings-geocoding-indicator">
                        <FaSpinner className="settings-spinner" /> Finding
                        location...
                      </div>
                    )}
                  </div>
                </div>
                {renderMap(locationLat, locationLng, locationAddress)}

                <div className="settings-location-actions">
                  <button
                    className="settings-save-location-btn"
                    onClick={handleSaveLocation}
                    disabled={!locationAddress.trim() || isGeocoding}
                  >
                    <FaSave /> Save Location
                  </button>
                  {savedLocation && (
                    <div className="settings-saved-location-indicator">
                      <FaCheckCircle className="settings-saved-icon" />
                      <span>Location saved: {savedLocation.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* ===================== Clinic Information For Doctor ========================== */}
          {isDoctor && (
            <aside className="settings-cli-vi">
              <section className="settings-card settings-glass settings-clinic-card">
                <div className="settings-clinic-info">
                  <div className="settings-clinic-logo-wrapper">
                    <img
                      src={templateLogo}
                      alt="Clinic Logo"
                      className="settings-clinic-logo"
                    />
                  </div>
                  <div className="settings-clinic-details">
                    <h4>{savedTemplate?.hospitalName || "CuraAid Medical Center"}</h4>
                    <p className="settings-clinic-type">
                      {savedTemplate?.hospitalAddress || "Smart Healthcare Platform — Pakistan"}
                    </p>
                    <p className="settings-clinic-location">
                      Tel: {savedTemplate?.hospitalTel || "support@curaaid.com"}
                    </p>
                  </div>
                </div>
                <button
                  className="settings-edit-clinic-btn"
                  onClick={handleEditClinic}
                >
                  Edit Prescription Template
                  <FaChevronRight className="settings-btn-icon" />
                </button>
              </section>
            </aside>
          )}
        </div>
      </div>

      {/* ========================== COMPLETION ANIMATION ========================== */}
      <CompletionAnimation
        show={showCompletion}
        message={completionMessage}
        onComplete={() => setShowCompletion(false)}
      />
    </div>
  );
};

export default Settings;
