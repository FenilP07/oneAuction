import React, { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button.jsx";
import Navbar from "../../components/Navbar.jsx";
import "../Login/login.css";
import { getUserById } from '../../services/userService.js';

const Dashboard = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);

  const userId = localStorage.getItem("userId");
  console.log("User ID from localStorage:", userId);

   const [firstName, setFirstName] = useState("");

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (userId) {
      getUserById(userId)
        .then((user) => {
          setFirstName(user.profile.firstName);
        })
        .catch((err) => {
          console.error("Error fetching user:", err.message);
        });
    }
  }, []);


  const handleLogout = async () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userId");
    navigate("/login");
  };

  return (
    <>
      <Navbar />
      <section className="register-page">
        <div className="form-wrapper text-center">
          <h3>Welcome to Your Dashboard</h3>
          
           <h1>Welcome, {firstName ? firstName : "User"}</h1>

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
