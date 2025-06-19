import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import FormInput from "../../components/FormInput.jsx";
import Button from "../../components/Button.jsx";
import Spinner from "../../components/Spinner.jsx"; // Make sure this path is correct
import validateForm from "../../utils/validateForm.js";
import { loginUser, setAuthToken } from "../../services/userService.js";
import "../Login/login.css";

const Login = () => {
  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "OneAuction - Login";
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    const validationErrors = validateForm(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length === 0) {
      try {
        const response = await loginUser(formData);
        const accessToken = response.data.user.accessToken;

        if (!accessToken) {
          throw new Error("Access token not found in response");
        }

        setAuthToken(accessToken);
        localStorage.setItem("accessToken", accessToken);

        setMessage(
          <div className="text-success text-center mb-3">
            {response.message || "Login successful! Redirecting ..."}
          </div>
        );

        setTimeout(() => navigate("/dashboard"), 2000);
      } catch (error) {
        console.error("Login error:", error);
        const msg =
          error.response?.data?.message ||
          error.message ||
          "Login failed. Please try again.";
        setMessage(<div className="text-danger text-center mb-3">{msg}</div>);
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  };

  return (
    <section className="register-page">
      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <section className="logo-container text-center">
          <h3>Login</h3>
        </section>

        <div className="form-wrapper">
          <FormInput
            label="Email or Username*"
            id="identifier"
            name="identifier"
            type="text"
            value={formData.identifier}
            onChange={handleChange}
            error={errors.identifier}
          />
          <FormInput
            label="Password*"
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
          />

          {message}

          <div className="login-actions d-flex flex-column justify-content-between align-items-center">
            <Button
              type="submit"
              className="btn btn-info btn-login d-flex align-items-center"
              disabled={isLoading}
            >
              <>
                Login
                {isLoading && (
                  <span className="ms-2">
                    <Spinner />
                  </span>
                )}
              </>
            </Button>
          </div>

          <p className="text-center text-muted mt-3">
            <Link
              to="/forgot-password"
              className="text-primary text-decoration-none"
            >
              Forgot Password?
            </Link>
          </p>
          <p className="text-center text-muted mt-3">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary text-decoration-none">
              Register
            </Link>
          </p>
        </div>
      </form>
    </section>
  );
};

export default Login;
