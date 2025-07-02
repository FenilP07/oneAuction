import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import FormInput from '../../components/FormInput.jsx';
import Button from '../../components/Button.jsx';
import Spinner from '../../components/Spinner.jsx';
import validateForm from '../../utils/validateForm.js';
import { registerUser } from '../../services/userService.js';
import './register.css';

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
        setMessage(
          <div className="alert alert-danger text-center mb-3">
            {backendMessage}
          </div>
        );
      }

      setErrors(newErrors);
      setIsLoading(false);
    }
  };

  return (
    <div className="container-fluid d-flex justify-content-center align-items-center min-vh-100 bg-white">
      <div className="row col-md-8 shadow p-0 rounded overflow-hidden">
        <div className="col-md-6 p-0 d-none d-md-block">
          <img
            src="/images/auct.png"
            alt="Registration visual"
            className="img-fluid w-100 h-100"
          />
        </div>

        <div className="col-md-6 bg-black p-5">
          <h3 className="mb-4 text-white text-center fw-bold">
            Create an Account
          </h3>
          <form className="register-form" onSubmit={handleSubmit} noValidate>
            <div className="form-wrapper">
              {message && <div className="mb-3">{message}</div>}

              <div className="row">
                <div className="col-md-6">
                  <FormInput
                    label="First Name*"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    error={errors.firstName}
                  />
                </div>
                <div className="col-md-6">
                  <FormInput
                    label="Last Name*"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
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
                    value={formData.email}
                    onChange={handleChange}
                    error={errors.email}
                  />
                </div>
                <div className="col-md-6">
                  <FormInput
                    label="Username"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    error={errors.username}
                  />
                </div>
                <div className="col-md-6">
                  <FormInput
                    label="Password*"
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    error={errors.password}
                  />
                </div>
                <div className="col-md-6">
                  <FormInput
                    label="Confirm Password*"
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    error={errors.confirmPassword}
                  />
                </div>
              </div>

              <div className="register-actions mt-4">
                <Button
                  type="submit"
                  className="btn btn-outline-light btn-register d-flex align-items-center"
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

              <p className="text-center text-white mt-3">
                Already have an account?{' '}
                <Link to="/login" className="text-warning text-decoration-none">
                  Login
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegistrationForm;