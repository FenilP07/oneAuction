import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import Navbar from '../../components/Navbar';
import { logoutUser } from '../../services/userService.js';
import useAuthStore from '../../store/authStore.js';


const Dashboard = () => {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleLogout = async () => {
    try {
      await logoutUser();
      clearAuth();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error.message);
      clearAuth();
      navigate('/login');
    }
  };

  return (
    <>
      <Navbar />
      <section className="register-page">
        <div className="form-wrapper text-center">
          <h3>Welcome to Your Dashboard</h3>
          <h1>Welcome, {user?.profile?.firstName || 'User'}</h1>
          <p className="text-muted mt-3">
            You are successfully logged in to OneAuction.
          </p>
          <div className="register-actions d-flex flex-column justify-content-between align-items-center">
            <Button
              className="btn btn-info btn-register d-flex align-items-center"
              onClick={handleLogout}
              aria-label="Log out"
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