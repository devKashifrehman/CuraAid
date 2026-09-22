// todo apply lazy loading on both routing
import React, { useContext } from "react";
import { Routes, Route, useLocation, useNavigate,  } from "react-router-dom";
import { AuthProvider } from "./HeadFoot/Auth/AuthContext";
import { AuthContext } from "./HeadFoot/Auth/AuthContext";
import { GoogleOAuthProvider } from "@react-oauth/google";

import Header from "./HeadFoot/Header/header";
import Footer from "./HeadFoot/Footer/Footer";
import Hero from "./Home/Hero";
import Aboutus from "./About/Aboutus";
import Pharma from "./Pharmacy/Pharma";
import OPD from "./DoctorFinder/Agentbot/OPD";  
import Login from "./Login/Login";
import Signup from "./Login/Signup"; 
import RoleSelection from "./Login/RoleSelection/RoleSelection";
import AdminLogin from "./Admin/AdminLogin";
import Dashboard from "./Profile/Dashboard/Dashboard";
import Consultation from "./Profile/Consultations/Consultation";
import Appointments from "./Profile/Appointment/Appointments";
import Patients from "./Profile/PatientsRecords/Patients"
import Prescription from "./Profile/PrescriptionRecords/Prescription"; 
import Availability from "./Profile/SetTime/availability"; 
import Settings from "./Profile/EditProfile/settings";
import AdminSetting from "./Profile/AdminPages/Settings/setting";
import DoctorDocumentation from "./Login/Documentation/DoctorDocumentation"; 
import FeedbackForm from "./Feedback/FeedbackForm";
import Clinic from "./DoctorFinder/VirtualClinic/Clinic";
import EPresTemplate from "./Profile/EPrescription/e-pres-temp";
import Documents from "./Profile/AdminPages/DoctorDocuments/Documents";
import ReportComplian from "./Profile/AdminPages/ComplaintSection/ReportComplian";
import Users from "./Profile/AdminPages/Users/user"; 

// Your Google OAuth Client ID
const GOOGLE_CLIENT_ID =
  "1067027523719-opht14v2816ic3ngeb2iqqth9qkiutv3.apps.googleusercontent.com"; 

const RoleSettings = () => {
  const { isAdmin } = useContext(AuthContext);
  return isAdmin ? <AdminSetting /> : <Settings />;
};

const App = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Hide Header/Footer for login/signup, role selection and doctor documentation pages
  const hideHeaderFooter = [
    "/login",
    "/signup",
    "/admin/login",
    "/role-selection",
    "/doctor-documentation",
  ].includes(location.pathname);

  // Generic close handler: go back to the page the user came from (or home)
  const handleCloseModal = () => {
    if (location.state?.fromLogout) {
      navigate("/", { replace: true });
      return;
    }

    const from = location.state?.from;
    const authPages = [
      "/login",
      "/signup",
      "/role-selection",
      "/admin/login",
      "/doctor-documentation",
    ];
    if (from && !authPages.includes(from)) {
      navigate(from, { replace: true });
      return;
    }

    // Never land back on another auth page (e.g. /admin/login when closing
    // /login after coming back from admin). Fall back to the public home page.
    navigate("/", { replace: true });
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        {!hideHeaderFooter && <Header />}

        <Routes>
          <Route path="/" element={<Hero />} />
          <Route path="/about" element={<Aboutus />} />
          <Route path="/pharmacy" element={<Pharma />} />
          <Route path="/ai-health-guide" element={<OPD />} />
          <Route path="/login" element={<Login onClose={handleCloseModal} />} />
          <Route path="/signup" element={<Signup onClose={handleCloseModal} />} />
          <Route path="/role-selection" element={<RoleSelection />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/consultations" element={<Consultation />} />
          <Route path="/Consultation" element={<Consultation />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/patients" element={<Patients />} />
          <Route path="/prescriptions" element={<Prescription />} />
          <Route path="availability" element={<Availability />} />
          <Route path="/settings" element={<RoleSettings />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/reports" element={<ReportComplian />} />
          <Route path="/users" element={<Users />} />
          <Route path="/prescription-template" element={<EPresTemplate />} />
          <Route path="/doctor-documentation" element={<DoctorDocumentation />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/feedback" element={<FeedbackForm />} />
          <Route path="/clinic" element={<Clinic />} />
        </Routes>

        {!hideHeaderFooter && <Footer />}
      </AuthProvider>
    </GoogleOAuthProvider>
  );
};

export default App;
