// const validateForm = (formData) => {
//   const errors = {};

//   if (!formData.firstName.trim()) errors.firstName = "First name is required.";
//   if (!formData.lastName.trim()) errors.lastName = "Last name is required.";

//   if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
//     errors.email = "Invalid email address.";
//   }

// const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// if (!passwordRegex.test(formData.password)) {
//   errors.password =
//     "Password must be at least 8 characters long, and include uppercase, lowercase, number, and special character.";
// }

//   if (formData.password !== formData.confirmPassword) {
//     errors.confirmPassword = "Passwords do not match.";
//   }

//   return errors;
// };

// export default validateForm;


const validateForm = (formData) => {
  const errors = {};

  // Validate email if present (used in both login and registration)
  if ('email' in formData) {
    if (!formData.email || !formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email.trim())) {
      errors.email = 'Email is invalid';
    }
  }

  // Validate password if present (used in both login and registration)
  if ('password' in formData) {
    if (!formData.password || !formData.password.trim()) {
      errors.password = 'Password is required';
    } else if (formData.password.trim().length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
  }

  // Validate registration-specific fields only if present
  if ('firstName' in formData) {
    if (!formData.firstName || !formData.firstName.trim()) {
      errors.firstName = 'First Name is required';
    }
  }

  if ('lastName' in formData) {
    if (!formData.lastName || !formData.lastName.trim()) {
      errors.lastName = 'Last Name is required';
    }
  }

  if ('username' in formData) {
    if (!formData.username || !formData.username.trim()) {
      errors.username = 'Username is required';
    }
  }

  if ('confirmPassword' in formData && 'password' in formData) {
    if (!formData.confirmPassword || !formData.confirmPassword.trim()) {
      errors.confirmPassword = 'Confirm Password is required';
    } else if (formData.confirmPassword.trim() !== formData.password.trim()) {
      errors.confirmPassword = 'Passwords do not match';
    }
  }

  return errors;
};

export default validateForm;