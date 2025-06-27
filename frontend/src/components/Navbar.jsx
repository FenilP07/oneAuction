import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min";
import "bootstrap-icons/font/bootstrap-icons.css";
import { logoutUser, getUserById } from "../services/userService";


function Navbar() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  const userId = localStorage.getItem("userId");

  useEffect(() => {
    if (!userId) return;
    getUserById(userId)
      .then((res) => {
        console.log("Navbar user fetched:", res);
        setUser(res); // contains { user: {}, profile: {} }
      })
      .catch((err) => {
        console.error("Failed to fetch user in navbar:", err);
      });
  }, [userId]);

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
    <nav className="navbar navbar-expand-lg bg-body-tertiary">
      <div className="container-fluid">
        <Link className="navbar-brand" to="/">
          OneAuction
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div
          className="collapse navbar-collapse justify-content-between"
          id="navbarNav"
        >
          <ul className="navbar-nav">
            {!user && (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/login">
                    Login
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/category">
                    Category
                  </Link>
                </li>
                   <li className="nav-item">
                  <Link className="nav-link" to="/admin">
                    Dashboard
                  </Link>
                </li>
               
              </>
            )}
          </ul>

          {/* Right side profile dropdown */}
          {user && (
            <ul className="navbar-nav">
              <li className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle d-flex align-items-center"
                  href="#"
                  id="navbarDropdown"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  {user.profile?.avatarUrl ? (
                    <img
                      src={user.profile.avatarUrl || "images/profile.png" }
                      alt="Profile"
                      className="rounded-circle me-2"
                      width="30"
                      height="30"
                    />
                  ) : (
                    <i
                      className="bi bi-person-circle me-2"
                      style={{ fontSize: "1.5rem" }}
                    ></i>
                  )}
                  {user.profile?.firstName} {user.profile?.lastName}
                </a>
                <ul
                  className="dropdown-menu dropdown-menu-end"
                  aria-labelledby="navbarDropdown"
                >
                  <li>
                    <Link className="dropdown-item" to="/profile">
                      Profile
                    </Link>
                  </li>
                  <li>
                    <hr className="dropdown-divider" />
                  </li>
                  <li>
                    <button className="dropdown-item" onClick={handleLogout}>
                      Logout
                    </button>
                  </li>
                </ul>
              </li>
            </ul>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
