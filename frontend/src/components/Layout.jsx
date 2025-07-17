import React from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import AdminNavbar from "./AdminNavbar";


const Layout = ({ children }) => {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  return (
    <div className="admin-layout">
      <AdminNavbar />
      
      <div className="admin-content-wrapper">
        {/* Welcome bar */}
        <div className="welcome-bar">
          {/* <div className="welcome-message">
            <h2>Welcome back, {useAuthStore.getState().user?.profile?.firstName || 'Admin'}</h2>
            <p>Manage your auctions and items</p>
          </div> */}
        </div>

        {/* Main Content */}
        <main className="admin-main-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;