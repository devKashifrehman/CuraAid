// Sidebar.jsx
import React, { useState, useContext, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../../HeadFoot/Auth/AuthContext";
import {
  FaCalendarAlt,
  FaFileMedical,
  FaUserMd,
  FaStethoscope,
  FaUsers,
  FaBars,
  FaTimes,
  FaCog,
  FaSignOutAlt,
  FaHeadset,
  FaTh,
  FaClipboardList,
  FaUserCog,
} from "react-icons/fa";
import { ThemeContext } from "../../Theme/ThemeContext";
import sidebarAdminImage from "../../images/sidebar-admin.png";
import "./Sidebar.css";

const Sidebar = ({ toggleClassName = "" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, logout } = useContext(AuthContext);
  const { darkMode } = useContext(ThemeContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!sidebarOpen) return undefined;

    const scrollY = window.scrollY;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;
    const originalOverflow = document.body.style.overflow;

    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;
      document.body.style.overflow = originalOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [sidebarOpen]);

  // Admin menu items based on the image
  const adminMenuItems = [
    {
      icon: <FaTh />,
      label: "Overview",
      path: "/dashboard",
    },
 
    {
      icon: <FaFileMedical />,
      label: "Documents",
      path: "/documents",
    },
 
  
    {
      icon: <FaClipboardList />,
      label: "Reports & Actions",
      path: "/reports",
    },
    {
      icon: <FaUsers />,
      label: "Users",
      path: "/users",
    },
    {
      icon: <FaCog />,
      label: "Settings",
      path: "/settings",
    },
    {
      icon: <FaSignOutAlt />,
      label: "Logout",
      action: () => {
        setSidebarOpen(false);
        logout();
        try {
          navigate('/login', { replace: true, state: { fromLogout: true } });
        } catch (e) {}
      },
    },
  ];

  const doctorMenuItems = [
    {
      icon: <FaTh />,
      label: "Dashboard",
      path: "/dashboard",
    },
    {
      icon: <FaStethoscope />,
      label: "Consultations",
      path: "/consultations",
    },
    {
      icon: <FaCalendarAlt />,
      label: "Appointments",
      path: "/appointments",
    },
    {
      icon: <FaUsers />,
      label: "Patients",
      path: "/patients",
    },
    {
      icon: <FaFileMedical />,
      label: "Prescriptions",
      path: "/prescriptions",
    },
    // {
    //   icon: <FaFileMedical />,
    //   label: "Medical Records",
    //   path: "/records",
    // },
    {
      icon: <FaUserMd />,
      label: "Availability",
      path: "/availability",
    },
    {
      icon: <FaCog />,
      label: "Settings",
      path: "/settings",
    },
    {
      icon: <FaSignOutAlt />,
      label: "Logout",
      action: () => {
        setSidebarOpen(false);
        logout();
        try {
          navigate('/login', { replace: true, state: { fromLogout: true } });
        } catch (e) {}
      },
    },
  ];

  const patientMenuItems = [
    {
      icon: <FaTh />,
      label: "Dashboard",
      path: "/dashboard",
    },
    {
      icon: <FaStethoscope />,
      label: "Consultations",
      path: "/consultations",
    },
    {
      icon: <FaCalendarAlt />,
      label: "Appointments",
      path: "/appointments",
    },
    {
      icon: <FaFileMedical />,
      label: "Prescriptions",
      path: "/prescriptions",
    },
    // {
    //   icon: <FaFileMedical />,
    //   label: "Medical Records",
    //   path: "/Patients",
    // },
    {
      icon: <FaUserCog />,
      label: "Profile Settings",
      path: "/settings",
    },
    {
      icon: <FaSignOutAlt />,
      label: "Logout",
      action: () => {
        setSidebarOpen(false);
        logout();
        try {
          navigate('/login', { replace: true, state: { fromLogout: true } });
        } catch (e) {}
      },
    },
  ];

  const menuItems =
    role === "admin" ? adminMenuItems :
    role === "doctor" ? doctorMenuItems :
    patientMenuItems;

  const isActive = (path) => {
    return location.pathname === path;
  };

  const getFooterContent = () => {
    if (role === "admin") {
      return (
        <div className="sidebar-status-card admin">
          <div className="status-info">
            <h5>Admin Panel</h5>
            <img
              src={sidebarAdminImage}
              alt="Admin panel"
              className="admin-status-image"
            />
            <p>"Quality care starts with quality control."</p>
          </div>
        </div>
      );
    } else if (role === "doctor") {
      return (
        <div className="sidebar-status-card doctor">
          <div className="status-icon-wrap">
            <FaUserMd />
          </div>
          <div className="status-info">
            <h5>Your Clinic Status</h5>
            <span className="status-online">
              <span className="status-dot"></span>
              Online
            </span>
            <p>Available for consults</p>
          </div>
        </div>
      );
    } else {
      return (
        <div className="sidebar-status-card patient">
          <div className="status-icon-wrap">
            <FaHeadset />
          </div>
          <div className="status-info">
            <h5>Need Help?</h5>
            <p>Contact Support</p>
          </div>
        </div>
      );
    }
  };

  return (
    <>
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`sidebar ${
          sidebarOpen ? "open" : "closed"
        } ${darkMode ? "dark" : "light"}`}
      >
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-text">
              {/* <h3>Medi Assist</h3> */}
              {role === "admin" && <p>Admin Panel</p>}
            </div>
          </div>

          <button
            className="sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <FaTimes />
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item, idx) => (
            <div
              key={idx}
              className={`sidebar-item ${
                item.path && isActive(item.path) ? "active" : ""
              }`}
              onClick={() => {
                if (item.action) {
                  item.action();
                } else {
                  setSidebarOpen(false);
                  navigate(item.path);
                }
              }}
            >
              <span className="sidebar-icon">
                {item.icon}
              </span>
              <span className="sidebar-label">
                {item.label}
              </span>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          {getFooterContent()}
        </div>
      </aside>

      <header className="sidebar-header-wrapper">
        {!sidebarOpen && (
          <button
            className={`sidebar-toggle hamburger ${
              darkMode ? "dark" : "light"
            } ${toggleClassName}`}
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <FaBars />
          </button>
        )}
      </header>
    </>
  );
};

export default Sidebar;
