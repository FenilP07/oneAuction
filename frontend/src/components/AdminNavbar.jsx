import React from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { logoutUser } from "../services/userService";
import useAuthStore from "../store/authStore";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min';


const AdminNavbar = () => {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logoutUser();
      clearAuth();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error.message);
      clearAuth();
      navigate('/login');
    }
  };

  return (
    <nav className="navbar navbar-expand-lg bgOne navbar-dark" aria-label="Admin navigation">
      <div className="container-fluid">
        <Link className="navbar-brand" to="/admin/dashboard" aria-label="Admin Dashboard">
          <img src="/images/AuctionLogo.png" alt="Admin Logo" height="32" />
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#adminNavbar"
          aria-controls="adminNavbar"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="adminNavbar">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <NavLink className="nav-link fw-bold" to="/admin/dashboard" activeClassName="active">
                Dashboard
              </NavLink>
            </li>
            {/* <li className="nav-item">
              <NavLink className="nav-link fw-bold" to="/admin/items" activeClassName="active">
                Items
              </NavLink>
            </li> */}


             <li className="nav-item">
              <NavLink className="nav-link fw-bold" to="/admin/categorieslist" activeClassName="active">
                Category
              </NavLink>
            </li>
            
            <li className="nav-item">
              <NavLink className="nav-link fw-bold" to="/admin/auction" activeClassName="active">
                Auction
              </NavLink>
            </li>
          </ul>

          <div className="d-flex">
            {user && (
              <button 
                className="btn btn-outline-light btn-sm" 
                onClick={handleLogout}
                aria-label="Log out"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default AdminNavbar;