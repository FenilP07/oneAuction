import React from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button.jsx";
import Navbar from "../../components/Navbar.jsx";
import "../Login/login.css";
import { logoutUser } from "../../services/userService.js";

const Dashboard = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error.message);

      navigate("/login");
    }
  };

  return (
    <>
      <Navbar />
      <section className="register-page">
        <div className="form-wrapper text-center">
          <h3>Welcome to Your Dashboard</h3>
          <p className="text-muted mt-3">
            You are successfully logged in to OneAuction.
          </p>
          <div className="register-actions d-flex flex-column justify-content-between align-items-center">
            <Button
              className="btn btn-info btn-register d-flex align-items-center"
              onClick={handleLogout}
            >
              Logout
            </Button>
          </div>
        </div>
      </section>
    </>
  );
};

export default Dashboard;
