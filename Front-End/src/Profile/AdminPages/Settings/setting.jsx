import React, { useState, useRef, useContext, useEffect } from "react";
import {
  FaCamera,
  FaEye,
  FaEyeSlash,
  FaSave,
  FaShieldAlt,
  FaUserPlus,
  FaEdit,
  FaUserShield,
  FaPhoneAlt,
  FaCheckCircle,
  FaTimes,
  FaTrashAlt,
  FaLock,
} from "react-icons/fa";
import { ThemeContext } from "../../../Theme/ThemeContext";
import { AuthContext } from "../../../HeadFoot/Auth/AuthContext";
import adminAvatar from "../../../images/sidebar-admin.png";
import axios from "axios";
import "./setting.css";
import Sidebar from "../../Hamburger/sidebar";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

const adminProfileImage = (img) => {
  if (!img) return adminAvatar;
  if (/^https?:\/\//i.test(img)) return img;
  const clean = img.startsWith("/") ? img : `/${img}`;
  if (!/^\/storage\//i.test(clean)) return `${API_BASE_URL}/storage${clean}`;
  return `${API_BASE_URL}${clean}`;
};

const CompletionAnimation = ({ show, message, onComplete }) => {
  const { darkMode } = useContext(ThemeContext);

  useEffect(() => {
    if (show) {
      const timer = setTimeout(onComplete, 2000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div className={`admset-overlay ${darkMode ? "dark" : "light"}`}>
      <div className="admset-overlay-card">
        <div className="admset-overlay-circle">
          <FaCheckCircle className="admset-overlay-icon" />
        </div>
        <h3 className="admset-overlay-title">{message}</h3>
        <p className="admset-overlay-subtitle">Changes saved successfully</p>
      </div>
    </div>
  );
};

const AdminSetting = () => {
  const { darkMode } = useContext(ThemeContext);
  const { user, updateUser, token } = useContext(AuthContext);
  const cachedRef = useRef(false);

  const authHeaders = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    Accept: "application/json",
  };

  const [profile, setProfile] = useState(() => {
    try {
      const cached = localStorage.getItem("admin_settings_profile");
      if (cached) { cachedRef.current = true; return JSON.parse(cached); }
      return { name: user?.FullName || "", age: "", contact: "", avatar: user?.PhotoUrl || adminAvatar };
    } catch { return { name: user?.FullName || "", age: "", contact: "", avatar: user?.PhotoUrl || adminAvatar }; }
  });

  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const [editAge, setEditAge] = useState(profile.age);
  const [editContact, setEditContact] = useState(profile.contact);
  const fileInputRef = useRef(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    name: "",
    email: "",
    contact: "",
    password: "",
  });
  const [admins, setAdmins] = useState(() => {
    try {
      const cached = localStorage.getItem("admin_settings_admins");
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  const [showCompletion, setShowCompletion] = useState(false);
  const [completionMessage, setCompletionMessage] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const apiHeaders = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Accept: "application/json",
    };
    const load = async () => {
      try {
        const [profileRes, adminsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/admin/profile`, {
            headers: apiHeaders,
            timeout: 30000,
          }),
          axios.get(`${API_BASE_URL}/api/admin/admins`, {
            headers: apiHeaders,
            timeout: 30000,
          }),
        ]);
        if (cancelled) return;
        const admin = profileRes.data?.admin || {};
        const dbAvatar = adminProfileImage(admin.profile_image);
        const newProfile = {
          name: admin.name ?? "",
          age: admin.age != null ? String(admin.age) : "",
          contact: admin.contact ?? "",
          avatar: dbAvatar,
        };
        setProfile(newProfile);
        setEditName(admin.name || "");
        setEditAge(admin.age != null ? String(admin.age) : "");
        setEditContact(admin.contact || "");
        if (updateUser) {
          updateUser({ PhotoUrl: dbAvatar, FullName: admin.name || undefined });
        }
        const mappedAdmins = (adminsRes.data?.data ?? []).map((a) => ({
          id: a.id,
          name: a.name,
          email: a.email,
          contact: a.contact ?? "-",
          avatar: adminProfileImage(a.profile_image),
          role: a.role ?? "admin",
        }));
        setAdmins(mappedAdmins);
        localStorage.setItem("admin_settings_profile", JSON.stringify(newProfile));
        localStorage.setItem("admin_settings_admins", JSON.stringify(mappedAdmins));
      } catch (error) {
        if (cancelled) return;
        console.error(
          "Failed to load admin settings:",
          error?.response?.data || error?.message,
        );
      } finally {
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [token, updateUser]);

  const handleSaveProfile = async () => {
    // Optimistic: UI turant update
    setProfile((prev) => ({
      ...prev,
      name: editName,
      age: editAge,
      contact: editContact,
    }));
    if (updateUser) {
      updateUser({ FullName: editName });
    }
    setAdmins((prev) =>
      prev.map((a) =>
        a.email === user?.Email
          ? { ...a, name: editName }
          : a,
      ),
    );
    setEditMode(false);
    setCompletionMessage("Profile updated successfully");
    setShowCompletion(true);

    // Background API call
    try {
      await axios.put(
        `${API_BASE_URL}/api/admin/profile`,
        { name: editName, age: editAge, contact: editContact },
        { headers: authHeaders },
      );
    } catch (error) {
      console.error("Failed to update admin profile:", error?.response?.data || error?.message);
    }
  };

  const handleAvatarClick = () => {
    if (editMode && !avatarUploading) fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfile((prev) => ({ ...prev, avatar: reader.result }));
    };
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append("profile_image", file);
    setAvatarUploading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/admin/avatar`, formData, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const stored =
        res.data?.admin?.profile_image || res.data?.profile_image || "";
      const newAvatar = adminProfileImage(stored);
      setProfile((prev) => ({ ...prev, avatar: newAvatar }));
      if (updateUser) {
        updateUser({ PhotoUrl: newAvatar });
      }
      setAdmins((prev) =>
        prev.map((a) =>
          a.email === user?.Email
            ? { ...a, avatar: newAvatar }
            : a,
        ),
      );
      setCompletionMessage("Profile image updated successfully");
      setShowCompletion(true);
    } catch (error) {
      console.error(
        "Failed to upload admin avatar:",
        error?.response?.data || error?.message,
      );
      const serverErrors = error?.response?.data?.errors
        ? Object.values(error.response.data.errors).flat().join(", ")
        : "";
      alert(
        `API error: ${error?.response?.status || ""} ${
          error?.response?.data?.message ||
          serverErrors ||
          error?.message ||
          "Image upload failed"
        }`,
      );
      setProfile((prev) => ({ ...prev, avatar: adminAvatar }));
    } finally {
      e.target.value = "";
      setAvatarUploading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim())
      return;
    if (newPassword !== confirmPassword) {
      alert("New password and confirm password do not match!");
      return;
    }
    try {
      await axios.post(
        `${API_BASE_URL}/api/admin/change-password`,
        { current_password: currentPassword, new_password: newPassword },
        { headers: authHeaders },
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setCompletionMessage("Password changed successfully");
      setShowCompletion(true);
    } catch (error) {
      console.error(
        "Failed to change admin password:",
        error?.response?.data || error?.message,
      );
      alert(
        `API error: ${error?.response?.status || ""} ${
          error?.response?.data?.message ||
          error?.message ||
          "Password change failed"
        }`,
      );
    }
  };

  const handleAddAdmin = async () => {
    if (
      !newAdmin.name.trim() ||
      !newAdmin.email.trim() ||
      !newAdmin.password.trim()
    ) {
      alert("Please fill in all required fields.");
      return;
    }
    setAddingAdmin(true);
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/admin/admins`,
        {
          name: newAdmin.name,
          email: newAdmin.email,
          contact: newAdmin.contact,
          password: newAdmin.password,
        },
        { headers: authHeaders },
      );
      const created = res.data?.data || {};
      setAdmins((prev) => [
        ...prev,
        {
          id: created.id ?? Date.now(),
          name: created.name ?? newAdmin.name,
          email: created.email ?? newAdmin.email,
          contact: created.contact ?? newAdmin.contact,
          avatar: adminProfileImage(created.profile_image),
          role: created.role ?? "admin",
        },
      ]);
      setNewAdmin({ name: "", email: "", contact: "", password: "" });
      setShowAddModal(false);
      setCompletionMessage("New admin added successfully");
      setShowCompletion(true);
    } catch (error) {
      console.error(
        "Failed to add admin:",
        error?.response?.data || error?.message,
      );
      const serverErrors = error?.response?.data?.errors
        ? Object.values(error.response.data.errors).flat().join(", ")
        : "";
      alert(
        `API error: ${error?.response?.status || ""} ${
          error?.response?.data?.message || serverErrors || error?.message || "Could not add admin"
        }`,
      );
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleRemoveAdmin = async (id) => {
    setRemovingId(id);
    try {
      await axios.delete(`${API_BASE_URL}/api/admin/admins/${id}`, {
        headers: authHeaders,
      });
      setAdmins((prev) => prev.filter((admin) => admin.id !== id));
      setCompletionMessage("Admin removed");
      setShowCompletion(true);
    } catch (error) {
      console.error(
        "Failed to remove admin:",
        error?.response?.data || error?.message,
      );
      alert(
        `API error: ${error?.response?.status || ""} ${
          error?.response?.data?.message ||
          error?.message ||
          "Could not remove admin"
        }`,
      );
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="admset-layout">
      <Sidebar />
      <div className={`admset-wrapper ${darkMode ? "dark" : "light"}`}>
        <header className="admset-page-header admset-page-header-right">
          <div className="admset-header-left admset-header-right">
            <h1 className="admset-page-title">Admin Settings</h1>
            <p className="admset-page-subtitle">
              Manage your admin profile, security and team
            </p>
          </div>
        </header>

        <div className="admset-content">
          <div className="admset-main-stack">
            <section className="admset-card admset-glass">
              <div className="admset-card-header">
                <div className="admset-icon-wrap">
                  <FaUserShield className="admset-section-icon" />
                </div>
                <div className="admset-card-head-text">
                  <h3>Profile Information</h3>
                  <p>Update your name, photo, age and contact details</p>
                </div>
                {!editMode ? (
                  <button
                    className="admset-save-btn"
                    onClick={() => setEditMode(true)}
                  >
                    <FaEdit /> Edit Profile
                  </button>
                ) : (
                  <button className="admset-save-btn" onClick={handleSaveProfile}>
                    <FaSave /> Save Changes
                  </button>
                )}
              </div>

              <div className="admset-profile-form">
                <div className="admset-avatar-section">
                  <div
                    className={`admset-avatar-wrap ${
                      editMode ? "editable" : "locked"
                    }`}
                    onClick={editMode ? handleAvatarClick : undefined}
                    title={
                      editMode
                        ? "Click photo to change"
                        : "Click 'Edit Profile' to change photo"
                    }
                  >
                    <img
                      src={profile.avatar}
                      alt="Admin"
                      className="admset-avatar"
                    />
                    {editMode && (
                      <div className="admset-avatar-overlay">
                        <FaCamera className="admset-camera-icon" />
                      </div>
                    )}
                    {!editMode && (
                      <div className="admset-avatar-lock">
                        <FaLock className="admset-avatar-lock-icon" />
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="admset-file-hidden"
                    accept="image/*"
                    onChange={handleAvatarChange}
                  />
                  <p className="admset-avatar-hint">
                    {avatarUploading
                      ? "Uploading..."
                      : editMode
                      ? "Click photo to change"
                      : "Click 'Edit Profile' to change photo"}
                  </p>
                </div>

                <div className="admset-form-grid">
                  <div className="admset-form-group">
                    <label>Full Name</label>
                    {editMode ? (
                      <input
                        type="text"
                        className="admset-form-input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Enter your name"
                      />
                    ) : (
                      <div className="admset-form-display">{profile.name}</div>
                    )}
                  </div>

                  <div className="admset-form-group">
                    <label>Age</label>
                    {editMode ? (
                      <input
                        type="number"
                        min="18"
                        max="99"
                        className="admset-form-input"
                        value={editAge}
                        onChange={(e) => setEditAge(e.target.value)}
                        placeholder="Enter your age"
                      />
                    ) : (
                      <div className="admset-form-display">
                        {profile.age} years
                      </div>
                    )}
                  </div>

                  <div className="admset-form-group admset-full">
                    <label>Contact Number</label>
                    {editMode ? (
                      <input
                        type="tel"
                        className="admset-form-input"
                        value={editContact}
                        onChange={(e) => setEditContact(e.target.value)}
                        placeholder="Enter your contact number"
                      />
                    ) : (
                      <div className="admset-form-display">
                        <FaPhoneAlt className="admset-field-icon" />{" "}
                        {profile.contact}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="admset-card admset-glass">
              <div className="admset-card-header">
                <div className="admset-icon-wrap">
                  <FaShieldAlt className="admset-section-icon" />
                </div>
                <div className="admset-card-head-text">
                  <h3>Change Password</h3>
                  <p>Set a new password to secure your account</p>
                </div>
              </div>

              <div className="admset-form-grid admset-three-col">
                <div className="admset-form-group admset-pass-group">
                  <label>Current Password</label>
                  <div className="admset-pass-wrap">
                    <input
                      type={showCurrent ? "text" : "password"}
                      className="admset-form-input"
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="admset-eye-btn"
                      onClick={() => setShowCurrent(!showCurrent)}
                    >
                      {showCurrent ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>
                <div className="admset-form-group admset-pass-group">
                  <label>New Password</label>
                  <div className="admset-pass-wrap">
                    <input
                      type={showNew ? "text" : "password"}
                      className="admset-form-input"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="admset-eye-btn"
                      onClick={() => setShowNew(!showNew)}
                    >
                      {showNew ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>
                <div className="admset-form-group admset-pass-group">
                  <label>Confirm New Password</label>
                  <div className="admset-pass-wrap">
                    <input
                      type={showConfirm ? "text" : "password"}
                      className="admset-form-input"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="admset-eye-btn"
                      onClick={() => setShowConfirm(!showConfirm)}
                    >
                      {showConfirm ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="admset-password-actions">
                <button
                  className="admset-update-btn"
                  onClick={handleUpdatePassword}
                  disabled={
                    !currentPassword.trim() ||
                    !newPassword.trim() ||
                    !confirmPassword.trim()
                  }
                >
                  <FaLock /> Update Password
                </button>
              </div>
            </section>
          </div>

          <section className="admset-card admset-glass admset-manage-card">
            <div className="admset-card-header">
              <div className="admset-icon-wrap">
                <FaUserPlus className="admset-section-icon" />
              </div>
              <div className="admset-card-head-text">
                <h3>Manage Admins</h3>
                <p>View and manage all admin accounts</p>
              </div>
              <button
                className="admset-save-btn"
                onClick={() => setShowAddModal(true)}
              >
                <FaUserPlus /> Add Admin
              </button>
            </div>

            <div className="admset-admin-list">
              {admins.map((admin) => (
                <div className="admset-admin-row" key={admin.id}>
                  <div className="admset-admin-avatar">
                    <img src={admin.avatar} alt={admin.name} />
                  </div>
                  <div className="admset-admin-info">
                    <h4>{admin.name}</h4>
                    <p>{admin.email}</p>
                  </div>
                  <span className="admset-admin-role">Admin</span>
                  <button
                    className="admset-remove-btn"
                    onClick={() => handleRemoveAdmin(admin.id)}
                    disabled={removingId === admin.id}
                  >
                    {removingId === admin.id ? (
                      <span className="admset-spinner-sm" />
                    ) : (
                      <FaTrashAlt />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {showAddModal && (
        <div
          className={`admset-modal-overlay ${darkMode ? "dark" : "light"}`}
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="admset-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admset-modal-header">
              <h3>Add New Admin</h3>
              <button
                className="admset-modal-close"
                onClick={() => setShowAddModal(false)}
              >
                <FaTimes />
              </button>
            </div>
            <div className="admset-modal-body">
              <div className="admset-form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  className="admset-form-input"
                  placeholder="Enter full name"
                  value={newAdmin.name}
                  onChange={(e) =>
                    setNewAdmin({ ...newAdmin, name: e.target.value })
                  }
                />
              </div>
              <div className="admset-form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  className="admset-form-input"
                  placeholder="Enter email address"
                  value={newAdmin.email}
                  onChange={(e) =>
                    setNewAdmin({ ...newAdmin, email: e.target.value })
                  }
                />
              </div>
              <div className="admset-form-group">
                <label>Contact Number</label>
                <input
                  type="tel"
                  className="admset-form-input"
                  placeholder="Enter contact number"
                  value={newAdmin.contact}
                  onChange={(e) =>
                    setNewAdmin({ ...newAdmin, contact: e.target.value })
                  }
                />
              </div>
              <div className="admset-form-group">
                <label>Password</label>
                <input
                  type="password"
                  className="admset-form-input"
                  placeholder="Enter password"
                  value={newAdmin.password}
                  onChange={(e) =>
                    setNewAdmin({ ...newAdmin, password: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="admset-modal-footer">
              <button
                className="admset-modal-cancel"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
              <button className="admset-modal-confirm" onClick={handleAddAdmin} disabled={addingAdmin}>
                <FaUserPlus /> {addingAdmin ? "Adding..." : "Add Admin"}
              </button>
            </div>
          </div>
        </div>
      )}

      <CompletionAnimation
        show={showCompletion}
        message={completionMessage}
        onComplete={() => setShowCompletion(false)}
      />
    </div>
  );
};

export default AdminSetting;
