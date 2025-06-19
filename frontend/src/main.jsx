import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import Login from "./pages/Login/Login.jsx";

import Dashboard from "./pages/Dashboard/Dashboard.jsx";
import "./index.css";
import RegistrationForm from "./pages/Register/RegistrationForm";
import { ProtectedRoute } from "./components/ProtectedRoute .jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />

        <Route index element={<Login />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<RegistrationForm />} />
        <Route
          path="dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
