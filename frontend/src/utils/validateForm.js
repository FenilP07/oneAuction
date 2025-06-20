const validateForm = (formData) => {
  const errors = {};

  // Login or Forgot Password: validate identifier (email or username)
  if ('identifier' in formData) {
    if (!formData.identifier || !formData.identifier.trim()) {
      errors.identifier = 'Email or username is required';
    }
    // No email format validation here; let backend handle it
  }

  if ('email' in formData) {
    if (!formData.email || !formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Invalid email address';
    }
  }

  // Password validation
  if ('password' in formData) {
    const password = formData.password?.trim();
    if (!password) {
      errors.password = 'Password is required';
    } else {
      const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(password)) {
        errors.password =
          'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character';
      }
    }
  }

  // Confirm password validation
  if ('confirmPassword' in formData) {
    const confirmPassword = formData.confirmPassword?.trim();
    const password = formData.password?.trim();
    if (!confirmPassword) {
      errors.confirmPassword = 'Confirm password is required';
    } else if (confirmPassword !== password) {
      errors.confirmPassword = 'Passwords do not match';
    }
  }

  // Registration-specific fields
  if ('firstName' in formData && !formData.firstName.trim()) {
    errors.firstName = 'First Name is required';
  }

  if ('lastName' in formData && !formData.lastName.trim()) {
    errors.lastName = 'Last Name is required';
  }

  // if ('username' in formData && !formData.username.trim()) {
  //   errors.username = 'Username is required';
  // }

  return errors;
};

export default validateForm;