import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import Login from "./pages/Login/Login.jsx";
import ForgotPassword from "./pages/Forgetpassword/ForgotPassword.jsx";
import ResetPassword from "./pages/Resetpassword/ResetPassword.jsx";
import Dashboard from "./pages/Dashboard/Dashboard.jsx";
import "./index.css";
import RegistrationForm from "./pages/Register/RegistrationForm";
import User from "./pages/User/user.jsx";
import AddCategory from "./pages/Admin/Categories/AddCategory.jsx";
import ItemListingPage from "./pages/ItemListingPage/ItemListingPage.jsx";
import Home from "./pages/Home/Home.jsx";
import AdminDashboard from "./pages/Admin/AdminDasboard.jsx";
import CategoryList from "./pages/Admin/Categories/CategoryList.jsx";

import Item from "./pages/Admin/Item/Item.jsx";
import ItemDetail from "./pages/Admin/Item/ItemDetail.jsx";

import AboutUs from "./pages/AboutUs/AboutUs.jsx";
import BrowseAuctions from  "./pages/BrowseAuctions/BrowseAuctions.jsx";


ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<RegistrationForm />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password/:token" element={<ResetPassword />} />
          <Route path="profile" element={<User />} />
          <Route path="itemListingPage" element={<ItemListingPage />} />
          <Route path="home" element={<Home />} />
          <Route path="addcategory" element={<AddCategory />} />
          <Route path="admin/categorieslist" element={<CategoryList />} />
          <Route path="admin/items" element={<Item />} />
          <Route path="/admin/items/:id" element={<ItemDetail />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="aboutUs" element={<AboutUs />} />
          <Route path="browseAuctions" element={<BrowseAuctions />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
