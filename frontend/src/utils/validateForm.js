// const validateForm = (formData) => {
//   const errors = {};

//   // Email validation
//   if ("email" in formData) {
//     if (!formData.email || !formData.email.trim()) {
//       errors.email = "Email is required";
//     } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
//       errors.email = "Invalid email address";
//     }
//   }

//   // Password validation
//   if ("password" in formData) {
//     if (!formData.password || !formData.password.trim()) {
//       errors.password = "Password is required";
//     } else {
//       const passwordRegex =
//         /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
//       if (!passwordRegex.test(formData.password)) {
//         errors.password =
//           "Password must be at least 8 characters long, and include uppercase, lowercase, number, and special character";
//       }
//     }
//   }

//   // Registration-specific fields

//   if ("firstName" in formData) {
//     if (!formData.firstName || !formData.firstName.trim()) {
//       errors.firstName = "First name is required";
//     }
//   }

//   if ("lastName" in formData) {
//     if (!formData.lastName || !formData.lastName.trim()) {
//       errors.lastName = "Last name is required";
//     }
//   }

//   // Confirm password validation
//   if ("confirmPassword" in formData && "password" in formData) {
//     if (!formData.confirmPassword || !formData.confirmPassword.trim()) {
//       errors.confirmPassword = "Confirm password is required";
//     } else if (formData.confirmPassword.trim() !== formData.password.trim()) {
//       errors.confirmPassword = "Passwords do not match";
//     }
//   }

//   return errors;
// };

// export default validateForm;
const validateForm = (formData) => {
  const errors = {};

  // Validate identifier (for login/forgot password) or email (for registration)
  if ('identifier' in formData || 'email' in formData) {
    const identifierValue = formData.identifier || formData.email;
    if (!identifierValue || !identifierValue.trim()) {
      errors.identifier = errors.email = 'Email or username is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifierValue.trim())) {
      errors.identifier = errors.email = 'Invalid email address';
    }
  }

  // Validate password
  if ('password' in formData) {
    if (!formData.password || !formData.password.trim()) {
      errors.password = 'Password is required';
    } else {
      const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(formData.password.trim())) {
        errors.password =
          'Password must be at least 8 characters long, and include uppercase, lowercase, number, and special character';
      }
    }
  }

  // Validate confirmPassword
  if ('confirmPassword' in formData && 'password' in formData) {
    if (!formData.confirmPassword || !formData.confirmPassword.trim()) {
      errors.confirmPassword = 'Confirm Password is required';
    } else if (formData.confirmPassword.trim() !== formData.password.trim()) {
      errors.confirmPassword = 'Passwords do not match';
    }
  }

  // Validate registration-specific fields
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

  return errors;
};

export default validateForm;