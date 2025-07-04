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
import AuctioneerItemPage from "./pages/ItemListingPage/AuctioneerItemPage.jsx";
import Home from "./pages/Home/Home.jsx";
import AdminDashboard from "./pages/Admin/AdminDasboard.jsx";
import CategoryList from "./pages/Admin/Categories/CategoryList.jsx";
import AboutUs from "./pages/AboutUs/AboutUs.jsx";

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
          <Route path="auctioneerItemPage" element={<AuctioneerItemPage />} />
          <Route path="home" element={<Home />} />
          <Route path="addcategory" element={<AddCategory />} />
          <Route path="categorieslist" element={<CategoryList />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="aboutUs" element={<AboutUs />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
