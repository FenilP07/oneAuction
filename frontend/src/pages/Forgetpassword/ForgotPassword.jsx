import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import FormInput from '../../components/FormInput.jsx';
import Button from '../../components/Button.jsx';
import Spinner from '../../components/Spinner.jsx';
import validateForm from '../../utils/validateForm.js';
import { requestPasswordReset } from '../../services/userService.js';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import './forgot-password.css';

const ForgotPassword = () => {
  const [formData, setFormData] = useState({
    email: '',
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    document.title = 'OneAuction - Forgot Password';
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateForm(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length === 0) {
      setIsLoading(true);
      try {
        const data = await requestPasswordReset(formData);
        setMessage(
          <div className="text-success text-center mb-3">
            {data?.message || 'Password reset email sent! Check your inbox.'}
          </div>
        );
        setFormData({ email: '' });
      } catch (error) {
        const msg = error.message || 'Failed to send reset email. Please try again.';
        setMessage(<div className="text-danger text-center mb-3">{msg}</div>);
      } finally {
        setIsLoading(false);
      }
    } else {
      setMessage('');
    }
  };

  return (
    <>
      <Navbar />
      <section className="Container-fluid">
        <div className='min-vh-100 d-flex justify-content-center align-items-center bgSecond py-5'>
        <form className="p-4 bg-white rounded shadow my-5" onSubmit={handleSubmit} noValidate>
          <section className="text-center py-5">
            <h3 className="textSecond fw-bold">Forgot Password</h3>
          </section>

          <div className="form-wrapper textSecond">
            <p className="text-center textSecond mb-4">
              Enter your email address to receive a password reset link.
            </p>

            <FormInput
              label="Email Address*"
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
            />

            {message}

            <div className="register-actions d-flex flex-column justify-content-between align-items-center">
              <Button
                type="submit"
                className="btn btn-outline-success btn-register d-flex align-items-center"
              >
                <>
                  Send Reset Link
                  {isLoading && (
                    <span className="ms-2">
                      <Spinner />
                    </span>
                  )}
                </>
              </Button>
            </div>

            <p className="text-center text-black mt-3">
              Remember your password?{' '}
              <Link to="/login" className="textSecond text-decoration-none">
                Login
              </Link>
            </p>
            <p className="text-center text-black mt-3">
              Don't have an account?{' '}
              <Link to="/register" className="textSecond text-decoration-none">
                Register
              </Link>
            </p>
          </div>
        </form>
        </div>
      </section>
      <Footer />
    </>
  );
};

export default ForgotPassword;