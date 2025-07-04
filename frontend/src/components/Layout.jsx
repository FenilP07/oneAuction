import React from "react";
import SideNavbar from "./SideNavbar"; //  for Sidebar
import "./sidenavbar.css"

const Layout = ({ children }) => {
  return (
    <div className="page-wrapper">
      <SideNavbar />

      <div className="main-content">
        {/* Top navigation bar */}
        <div className="top-nav">
          <p>Admin Panel</p>
          <a href="/logout">Logout</a>
        </div>

        {/* Page content */}
        <main>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;

