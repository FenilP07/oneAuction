import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import useAuthStore from "../../store/authStore.js";
import { getUserById, updateUserProfile } from "../../services/userService.js";
import Navbar from "../../components/Navbar.jsx";
import Footer from "../../components/Footer.jsx";
import FormInput from "../../components/FormInput.jsx";
import Button from "../../components/Button.jsx";
import Spinner from "../../components/Spinner.jsx";
import validateForm from "../../utils/validateForm.js";

const User = () => {
  const { user, logout } = useAuthStore();
  const [userData, setUserData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    avatarUrl: "",
    isAnonymous: false,
    anonymousAvatar: "",
    anonymousUsername: "",
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const fetchUserData = async () => {
      try {
        const freshUser = await getUserById(user._id);
        setUserData({
          firstName: freshUser.profile.firstName || "",
          lastName: freshUser.profile.lastName || "",
          email: freshUser.user.email || "",
          username: freshUser.user.username || "",
          avatarUrl: freshUser.profile.avatarUrl || "",
          isAnonymous: freshUser.profile.isAnonymous || false,
          anonymousAvatar: freshUser.profile.anonymousAvatar || "",
          anonymousUsername: freshUser.profile.anonymousUsername || "",
          password: "",
          confirmPassword: "",
        });
      } catch (err) {
        console.error("Error fetching user:", err.message);
        if (
          err.message.includes("Unauthorized") ||
          err.message.includes("Invalid token")
        ) {
          navigate("/login");
        } else {
          setMessage(
            <div className="alert alert-danger text-center mb-3">
              Failed to load user data. Please try again.
            </div>
          );
        }
      }
    };

    fetchUserData();
  }, [user, navigate]);

  const handleChange = (e) => {
    setUserData({ ...userData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
    setMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    setErrors({});

    const validationErrors = validateForm(userData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setIsLoading(false);
      return;
    }

    try {
      const updatedData = {
        profile: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          isAnonymous: userData.isAnonymous,
        },
        user: {
          email: userData.email,
          username: userData.username,
        },
        password: userData.password || undefined,
        confirmPassword: userData.confirmPassword || undefined,
      };

      const response = await updateUserProfile(user._id, updatedData);
      setMessage(
        <div className="alert alert-success text-center mb-3">
          {response.message || "Profile updated successfully!"}
        </div>
      );

      const freshUser = await getUserById(user._id);
      setUserData({
        firstName: freshUser.profile.firstName || "",
        lastName: freshUser.profile.lastName || "",
        email: freshUser.user.email || "",
        username: freshUser.user.username || "",
        avatarUrl: freshUser.profile.avatarUrl || "",
        isAnonymous: freshUser.profile.isAnonymous || false,
        anonymousAvatar: freshUser.profile.anonymousAvatar || "",
        anonymousUsername: freshUser.profile.anonymousUsername || "",
        password: "",
        confirmPassword: "",
      });

      useAuthStore.getState().setUser(freshUser);
    } catch (error) {
      const backendMessage = error.message;
      console.error("Update error:", backendMessage);

      let newErrors = {};
      if (backendMessage.includes("Email or username already in use")) {
        newErrors.email = "Email or username already in use";
        newErrors.username = "Email or username already in use";
      } else if (backendMessage.includes("Passwords do not match")) {
        newErrors.password = "Passwords do not match";
        newErrors.confirmPassword = "Passwords do not match";
      } else if (backendMessage.includes("Password must contain")) {
        newErrors.password = backendMessage;
        newErrors.confirmPassword = backendMessage;
      } else if (backendMessage.includes("All required fields")) {
        newErrors.firstName = !userData.firstName
          ? "First Name is required"
          : "";
        newErrors.lastName = !userData.lastName ? "Last Name is required" : "";
        newErrors.email = !userData.email ? "Email is required" : "";
      } else {
        setMessage(
          <div className="alert alert-danger text-center mb-3">
            {backendMessage}
          </div>
        );
      }
      setErrors(newErrors);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getAvatarUrl = () => {
    if (userData.isAnonymous && userData.anonymousAvatar) {
      return userData.anonymousAvatar;
    }

    if (userData.avatarUrl) {
      return userData.avatarUrl;
    }

    const seed = userData.email || userData.username || "default";
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
      seed
    )}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
  };

  return (
    <>
      <Navbar />
      <div className="container my-5">
        <section className="user-page" aria-labelledby="user-profile-title">
          <div className="user-content text-center mb-4">
            <div className="circular--landscape">
              <img
                src={getAvatarUrl()}
                alt={`${userData.firstName}'s profile picture`}
                className="img-fluid rounded-circle"
                width={150}
                height={150}
                style={{
                  objectFit: "cover",
                  border: "3px solid #dee2e6",
                  backgroundColor: "#f8f9fa",
                }}
              />
            </div>
            <h3 id="user-profile-title">
              {userData.isAnonymous
                ? userData.anonymousUsername || "Anonymous User"
                : `${userData.firstName} ${userData.lastName}`}
              <span className="text-muted">
                {" "}
                ({userData.username})
              </span>
            </h3>
            <p className="text-muted">{userData.email}</p>
          </div>

          <div className="user-edit shadow p-4 rounded">
            <h3 className="text-center mb-4">Edit Profile</h3>
            <form onSubmit={handleSubmit} noValidate>
              <div className="row g-3">
                {message && <div className="col-12">{message}</div>}
                <div className="col-md-6">
                  <FormInput
                    label="First Name*"
                    id="firstName"
                    name="firstName"
                    value={userData.firstName}
                    onChange={handleChange}
                    error={errors.firstName}
                  />
                </div>
                <div className="col-md-6">
                  <FormInput
                    label="Last Name*"
                    id="lastName"
                    name="lastName"
                    value={userData.lastName}
                    onChange={handleChange}
                    error={errors.lastName}
                  />
                </div>
                <div className="col-md-6">
                  <FormInput
                    label="Email Address*"
                    id="email"
                    name="email"
                    type="email"
                    value={userData.email}
                    onChange={handleChange}
                    error={errors.email}
                  />
                </div>
                <div className="col-md-6">
                  <FormInput
                    label="Username"
                    id="username"
                    name="username"
                    value={userData.username}
                    onChange={handleChange}
                    error={errors.username}
                  />
                </div>
                <div className="col-md-6">
                  <FormInput
                    label="Password"
                    id="password"
                    name="password"
                    type="password"
                    value={userData.password}
                    onChange={handleChange}
                    error={errors.password}
                    placeholder="Leave blank to keep unchanged"
                  />
                </div>
                <div className="col-md-6">
                  <FormInput
                    label="Confirm Password"
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={userData.confirmPassword}
                    onChange={handleChange}
                    error={errors.confirmPassword}
                    placeholder="Leave blank to keep unchanged"
                  />
                </div>
              </div>

              {/* <div className="form-check form-switch text-start mt-4">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="isAnonymous"
                  name="isAnonymous"
                  checked={userData.isAnonymous}
                  onChange={(e) =>
                    setUserData((prev) => ({
                      ...prev,
                      isAnonymous: e.target.checked,
                    }))
                  }
                />
                <label className="form-check-label" htmlFor="isAnonymous">
                  Enable Anonymous Mode (hide real name & avatar in auctions)
                </label>
              </div> */}

              {userData.isAnonymous && (
                <div className="text-center mt-3">
                  <strong>Anonymous Display:</strong>
                  <div className="d-flex align-items-center justify-content-center gap-2 mt-1">
                    <img
                      src={userData.anonymousAvatar}
                      alt="Anonymous avatar"
                      width={48}
                      height={48}
                      className="rounded-circle border"
                    />
                    <span>{userData.anonymousUsername || "Anonymous"}</span>
                  </div>
                </div>
              )}

              <div className="text-center mt-4">
                <Button
                  type="submit"
                  className="btn btn-primary btn-lg me-2"
                  disabled={isLoading}
                >
                  <>
                    Save Changes
                    {isLoading && (
                      <span className="ms-2">
                        <Spinner />
                      </span>
                    )}
                  </>
                </Button>
                <Button
                  type="button"
                  className="btn btn-danger btn-lg"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </div>

              <p className="text-center mt-3">
                <Link to="/browse" className="text-decoration-none">
                  Back to Auctions
                </Link>
              </p>
            </form>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
};

export default User;
