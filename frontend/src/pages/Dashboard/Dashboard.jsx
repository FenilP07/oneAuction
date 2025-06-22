
import React, { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button.jsx";
import Navbar from "../../components/Navbar.jsx";
import "../Login/login.css"; // Assuming same styling as Login.jsx
import { getUserById } from '../../services/userService';

const Dashboard = () => {
  const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
 
   const userId = localStorage.getItem("userId");
console.log("User ID from localStorage:", userId);


 useEffect(() => {
  if (!userId) {
    console.warn("No userId found in localStorage.");
    return;
  }

  getUserById(userId)
    .then((data) => {
      console.log("Fetched user data:", data); // 👈 check here
      setUserData(data);
    })
    .catch((err) => {
      console.error("Error fetching user data:", err);
    });
}, [userId]);



  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    navigate("/login");
  };

 return (
  <>
    <Navbar />
    <section className="register-page">
      <div className="form-wrapper text-center">
        <h3>Welcome to Your Dashboard</h3>
{userData ? (
  <h3>
    {userData.firstName} {userData.lastName}
    <span> ({userData.username})</span>
  </h3>
) : (
  <p>Loading  info...</p>
)}



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