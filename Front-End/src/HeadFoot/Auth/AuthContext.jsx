import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

const getBaseUrl = () =>
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

const placeholder =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23e0e0e0'/><text x='50' y='55' font-size='12' text-anchor='middle' fill='%23999'>No%20Image</text></svg>";

const normalizeUser = (u) => {
  if (!u) return null;

  const roleFromUsertype = USERTYPE_ROLE_MAP[String(u.usertype_id ?? u.usertype)];
  const normalizedRole = (u.Role ?? u.role ?? roleFromUsertype ?? "patient")
    .toString()
    .toLowerCase();
  const normalized = {
    Id: u.Id ?? u.id,
    FullName: u.FullName ?? u.fullName ?? u.name ?? u.full_name,
    Email: u.Email ?? u.email,
    Mobile: u.Mobile ?? u.mobile ?? u.phone ?? u.phoneNumber,
    Bio: u.Bio ?? u.bio,
    PhotoUrl: u.PhotoUrl ?? u.photoUrl ?? u.profile_image ?? null,
    Role: normalizedRole,
  };

  if (normalized.PhotoUrl) {
    if (normalized.PhotoUrl.startsWith("/")) {
      normalized.PhotoUrl = `${getBaseUrl()}${normalized.PhotoUrl}`;
    } else if (!/^https?:\/\//i.test(normalized.PhotoUrl) && !normalized.PhotoUrl.startsWith("data:")) {
      normalized.PhotoUrl = `${getBaseUrl()}/storage/${normalized.PhotoUrl}`;
    }
  } else {
    normalized.PhotoUrl = placeholder;
  }

  return normalized;
};

const USERTYPE_ROLE_MAP = {
  1: "patient",
  2: "doctor",
};

export const resolveAuthSession = (responseData, fallbackRole = "patient") => {
  const payload = responseData?.data ?? responseData;
  const userPayload =
    payload?.user ??
    payload?.userData ??
    payload?.profile ??
    payload?.profileData ??
    payload?.patient ??
    payload?.doctor ??
    payload?.admin ??
    payload;

  const usertypeId =
    payload?.usertype_id ??
    payload?.usertype ??
    userPayload?.usertype_id ??
    userPayload?.usertype;

  const role =
    payload?.role ??
    payload?.Role ??
    userPayload?.role ??
    userPayload?.Role ??
    USERTYPE_ROLE_MAP[String(usertypeId)] ??
    fallbackRole;

  const token =
    payload?.token ??
    payload?.accessToken ??
    payload?.jwt ??
    payload?.access_token ??
    payload?.data?.token ??
    payload?.data?.accessToken ??
    null;

  const userData =
    userPayload && typeof userPayload === "object"
      ? { ...userPayload, Role: role }
      : { FullName: userPayload, Role: role };

  return {
    userData,
    role: String(role || fallbackRole).toLowerCase(),
    token,
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("authUser");
      return saved ? normalizeUser(JSON.parse(saved)) : null;
    } catch {
      return null;
    }
  });

  const [role, setRole] = useState(() => {
    try {
      const saved = localStorage.getItem("authRole");
      return saved?.toLowerCase() || "patient";
    } catch {
      return "patient";
    }
  });

  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem("authToken") || null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (user) localStorage.setItem("authUser", JSON.stringify(user));
      else localStorage.removeItem("authUser");
    } catch {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    try {
      if (role) localStorage.setItem("authRole", role);
      else localStorage.removeItem("authRole");
    } catch {
      // ignore
    }
  }, [role]);

  useEffect(() => {
    try {
      if (token) localStorage.setItem("authToken", token);
      else localStorage.removeItem("authToken");
    } catch {
      // ignore
    }
  }, [token]);

  const login = (userData, userRole, authToken) => {
    const nextRole = (userRole || userData?.Role || userData?.role || "patient").toString().toLowerCase();
    const normalized = normalizeUser({ ...userData, Role: nextRole });
    const nextToken = authToken || userData?.token || userData?.accessToken || userData?.jwt || null;

    setUser(normalized);
    setRole(nextRole);
    setToken(nextToken);
  };

  const logout = () => {
    setUser(null);
    setRole("patient");
    setToken(null);
    [
      "authUser",
      "authRole",
      "authToken",
      "auth_token",
      "token",
      "user_id",
      "user",
      "user_role",
      "usertype_id",
    ].forEach((key) => localStorage.removeItem(key));
  };

  const updateUser = (updatedData) => {
    setUser((prevUser) => normalizeUser({ ...prevUser, ...updatedData }));
  };

  const isDoctor = role === "doctor";
  const isPatient = role === "patient";
  const isAdmin = role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        token,
        login,
        logout,
        updateUser,
        isDoctor,
        isPatient,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
