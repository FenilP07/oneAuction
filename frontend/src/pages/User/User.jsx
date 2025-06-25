import React, { useEffect, useState } from 'react';
import '../User/user.css';
import { getUserById } from '../../services/userService';

const User = () => {
  const [userData, setUserData] = useState(null);
  const userId = localStorage.getItem("userId");

  useEffect(() => {
    if (!userId) return;
    getUserById(userId)
      .then((user) => {
        console.log("Fetched user object:", user);
        setUserData(user); // user contains { user: {...}, profile: {...} }
      })
      .catch((err) => console.error("Error fetching user:", err));
  }, [userId]);

  if (!userData || !userData.user || !userData.profile) {
    return <p>Loading...</p>;
  }

  return (
    <div>
      <section className='user-page'>
        <div className='user-content'>
          <div className="circular--landscape">
            <img
              src={ "images/profile.png" ||userData.profile.avatarUrl }
              alt="Profile"
            />
          </div>
          <h3>
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
