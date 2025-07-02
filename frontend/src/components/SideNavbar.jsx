// src/components/Navbar.jsx
import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { FaFileInvoice, FaUserFriends, FaShoppingCart } from "react-icons/fa";
import {  AiOutlineDown, AiOutlineUp } from "react-icons/ai";
import { MdCategory } from "react-icons/md";
import "./sidenavbar.css";


const SideNavbar = () => {
  const [openCategory, setOpenCategory] = useState(false);

  return (
    <aside className="sidenavbar">
      <nav className="side-menu">
        <div className="logo">
          <div className="logo-company">
            <img src="/image/logo.png" height={70} width={70} alt="Logo" />
          </div>
        </div>

        <ul className="nav-ul">
          <li>
            <NavLink to="/dashboard" className="nav-link">
              <p className="icon"><FaFileInvoice /></p> Dashboard
            </NavLink>
          </li>

          <li>
            <NavLink to="/clients" className="nav-link">
              <p className="icon"><FaUserFriends /></p> Clients
            </NavLink>
          </li>

          <li>
            <NavLink to="/items" className="nav-link">
              <p className="icon"><FaShoppingCart /></p> Items
            </NavLink>
          </li> 

        

        

          {/* 🔻 Category with Dropdown */}
          <li>
            <div className="nav-link" onClick={() => setOpenCategory(!openCategory)}>
              <p className="icon"><MdCategory /></p> <span className="cate">Category</span> 
              <span className="dropdown-icon">
                {openCategory ? <AiOutlineUp /> : <AiOutlineDown />}
              </span>
            </div>

            {openCategory && (
              <ul className="dropdown">
                <li>
                  <NavLink to="/addcategory" className="nav-link sub-nav-link">
                    Add Category
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/categorieslist" className="nav-link sub-nav-link">
                    Manage Categories
                  </NavLink>
                </li>
              </ul>
            )}
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default SideNavbar;
