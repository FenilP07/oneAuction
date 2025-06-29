import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../store/authStore.js";
import { getUserById } from "../../services/userService.js";

const User = () => {
  const { user } = useAuthStore();
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    // Use persisted user data from authStore
    setUserData(user);

    // Optional: Fetch fresh user data to check for updates
    const fetchUserData = async () => {
      try {
        const freshUser = await getUserById(user._id);
        setUserData(freshUser);
      } catch (err) {
        console.error("Error fetching user:", err.message);
        if (
          err.message.includes("Unauthorized") ||
          err.message.includes("Invalid token")
        ) {
          navigate("/login");
        } else {
          setError("Failed to load user data. Please try again.");
        }
      }
    };

    fetchUserData();
  }, [user, navigate]);

  if (!userData || !userData.user || !userData.profile) {
    return (
      <div className="container text-center mt-5">
        {error ? (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        ) : (
          <p>Loading...</p>
        )}
      </div>
    );
  }

  return (
    <div className="container">
      <section className="user-page" aria-labelledby="user-profile-title">
        <div className="user-content text-center">
          <div className="circular--landscape">
            <img
              src={userData.profile.avatarUrl || "/images/profile.png"}
              alt={`${userData.profile.firstName}'s profile picture`}
              className="img-fluid rounded-circle"
            />
          </div>
          <h3 id="user-profile-title">
            {userData.profile.firstName} {userData.profile.lastName}
            <span> ({userData.user.username})</span>
          </h3>
          <h4>{userData.user.email}</h4>
        </div>
      </section>
    </div>
  );
};

export default User;
