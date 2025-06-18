import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import FormInput from '../../components/FormInput.jsx';
import Button from '../../components/Button.jsx';
import Spinner from '../../components/Spinner.jsx'; // ✅ Import spinner
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
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'OneAuction - Register';
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    const validationErrors = validateForm(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length === 0) {
      try {
        const response = await registerUser(formData);
        setMessage(
          <div className="text-success text-center mb-3">
            {response.message || 'Registration successful! Redirecting to login...'}
          </div>
        );
        setTimeout(() => navigate('/login'), 2000);
      } catch (error) {
        const msg = error.response?.data?.message || 'Registration failed. Please try again.';
        setMessage(<div className="text-danger text-center mb-3">{msg}</div>);
      }
    }

    setIsLoading(false);
  };

  return (
    <section className="register-page">
      <form className="register-form" onSubmit={handleSubmit} noValidate>
        <section className="logo-container text-center">
          <h3>Create an Account</h3>
        </section>

        <div className="form-wrapper">
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

          {message}

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
