import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import FormInput from '../../components/FormInput.jsx';
import Button from '../../components/Button.jsx';
import Spinner from '../../components/Spinner.jsx';
import validateForm from '../../utils/validateForm.js';
import { registerUser } from '../../services/userService.js';
import '../Register/register.css';

const RegistrationForm = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    document.title = 'OneAuction - Register';
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
    setMessage(''); 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setErrors({});

    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setIsLoading(false);
      return;
    }

    try {
      const response = await registerUser(formData);
      setMessage(
        <div className="alert alert-success text-center mb-3">
          {response.message || 'Registration successful! Redirecting to login...'}
        </div>
      );
      navigate('/login');
    } catch (error) {
      const backendMessage = error.message;
      console.error('Registration error:', backendMessage);

      // Map specific backend errors to form fields
      let newErrors = {};
      if (backendMessage.includes('Email or username already in use')) {
        newErrors.email = 'Email or username already in use';
        newErrors.username = 'Email or username already in use';
      } else if (backendMessage.includes('Passwords do not match')) {
        newErrors.password = 'Passwords do not match';
        newErrors.confirmPassword = 'Passwords do not match';
      } else if (backendMessage.includes('Password must contain')) {
        newErrors.password = backendMessage;
        newErrors.confirmPassword = backendMessage;
      } else if (backendMessage.includes('All required fields')) {
        newErrors.firstName = !formData.firstName ? 'First Name is required' : '';
        newErrors.lastName = !formData.lastName ? 'Last Name is required' : '';
        newErrors.email = !formData.email ? 'Email is required' : '';
        newErrors.password = !formData.password ? 'Password is required' : '';
        newErrors.confirmPassword = !formData.confirmPassword ? 'Confirm Password is required' : '';
      } else {
        setMessage(<div className="alert alert-danger text-center mb-3">{backendMessage}</div>);
      }

      setErrors(newErrors);
      setIsLoading(false);
    }
  };

  return (
    <section className="register-page">
      <form className="register-form" onSubmit={handleSubmit} noValidate>
        <section className="logo-container text-center">
          <h3>Create an Account</h3>
        </section>

        <div className="form-wrapper">
          {message && <div className="mb-3">{message}</div>}

          <div className="row-name">
            <FormInput
              label="First Name*"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              error={errors.firstName}
            />
            <FormInput
              label="Last Name*"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              error={errors.lastName}
            />
          </div>

          <FormInput
            label="Email Address*"
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
          />
          <FormInput
            label="Username"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            error={errors.username}
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
          <FormInput
            label="Confirm Password*"
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
          />

          <div className="register-actions d-flex flex-column justify-content-between align-items-center">
            <Button
              type="submit"
              className="btn btn-info btn-register d-flex align-items-center"
              disabled={isLoading}
            >
              <>
                Register
                {isLoading && (
                  <span className="ms-2">
                    <Spinner />
                  </span>
                )}
              </>
            </Button>
          </div>

          <p className="text-center text-muted mt-3">
            Already have an account?{' '}
            <Link to="/login" className="text-primary text-decoration-none">
              Login
            </Link>
          </p>
        </div>
      </form>
    </section>
  );
};

export default RegistrationForm;