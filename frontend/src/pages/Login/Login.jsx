import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FormInput from '../../components/FormInput';
import Button from '../../components/Button';
import Spinner from '../../components/Spinner';
import { loginUser } from '../../services/userService.js';
import useAuthStore from '../../store/authStore.js';
import validateForm from '../../utils/validateForm.js';


const Login = () => {
  const { setAuth } = useAuthStore();
  const [formData, setFormData] = useState({ identifier: '', password: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'OneAuction - Login';
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
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
      const response = await loginUser(formData);
      const { user } = response;
      const accessToken = user.accessToken;

      if (!accessToken || !user?._id) {
        throw new Error('Invalid response structure from server');
      }

      setAuth(user, accessToken);
      setMessage(
        <div className="alert alert-success text-center mb-3" role="alert">
          Login successful! Redirecting ...
        </div>
      );
      setTimeout(() => navigate('/home'), 1500);
    } catch (error) {
      const backendMessage = error.message;
      let newErrors = {};
      if (backendMessage.includes('Invalid email/username or password')) {
        newErrors.identifier = 'Invalid email/username or password';
        newErrors.password = 'Invalid email/username or password';
      } else if (backendMessage.includes('Identifier and password are required')) {
        newErrors.identifier = 'Email or Username is required';
        newErrors.password = 'Password is required';
      } else if (backendMessage.includes('Account is not active')) {
        newErrors.identifier = 'Account is not active';
      } else if (backendMessage.includes('User profile not found')) {
        setMessage(
          <div className="alert alert-danger text-center mb-3" role="alert">
            Profile not found. Please contact support.
          </div>
        );
      } else {
        setMessage(
          <div className="alert alert-danger text-center mb-3" role="alert">
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
        <div className="col-md-6 bg-black p-5">
          <h3 id="login-form-title" className="mb-4 text-white text-center fw-bold">
            Login
          </h3>
          <form className="login-form" onSubmit={handleSubmit} noValidate aria-labelledby="login-form-title">
            <div className="form-wrapper">
              {message && <div className="mb-3">{message}</div>}
              <FormInput
                label="Email or Username*"
                id="identifier"
                name="identifier"
                className="text-white"
                type="text"
                value={formData.identifier}
                onChange={handleChange}
                error={errors.identifier}
                disabled={isLoading}
                aria-required="true"
                aria-describedby={errors.identifier ? 'identifier-error' : undefined}
              />
              <FormInput
                label="Password*"
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                disabled={isLoading}
                aria-required="true"
                aria-describedby={errors.password ? 'password-error' : undefined}
              />
              <div className="login-actions my-4 d-flex justify-content-between">
                <Button
                  type="submit"
                  className="btn btn-outline-light d-flex align-items-center"
                  disabled={isLoading}
                  aria-label="Submit login form"
                >
                  Login {isLoading && <Spinner />}
                </Button>
                <p className="text-end mt-3">
                  <Link to="/forgot-password" className="text-warning text-decoration-none">
                    Forgot Password?
                  </Link>
                </p>
              </div>
              <p className="text-center text-white mt-3">
                Don't have an account?{' '}
                <Link to="/register" className="text-warning text-decoration-none">
                  Register
                </Link>
              </p>
            </div>
          </form>
        </div>
        <div className="col-md-6 d-none d-md-block p-0">
          <img
            src="/images/auct.png"
            alt="Login visual"
            className="img-fluid w-100 h-100"
          />
        </div>
      </div>
    </div>
  );
};

export default Login;