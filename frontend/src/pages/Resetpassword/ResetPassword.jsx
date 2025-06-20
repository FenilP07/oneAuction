import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import FormInput from '../../components/FormInput.jsx';
import Button from '../../components/Button.jsx';
import validateForm from '../../utils/validateForm.js';
import { resetPassword } from '../../services/userService.js';

const ResetPassword = () => {
    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: '',
    });
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const token = searchParams.get('token');

    useEffect(() => {
        document.title = 'OneAuction - Reset Password';
        if (!token) {
            setMessage(
                <div className="text-danger text-center mb-3">
                    Invalid or missing reset token. Please use the link from your email.
                </div>
            );
        }
    }, [token]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!token) {
            setMessage(
                <div className="text-danger text-center mb-3">
                    Cannot reset password without a valid token.
                </div>
            );
            return;
        }

        const validationErrors = validateForm({ ...formData });
        setErrors(validationErrors);

        if (Object.keys(validationErrors).length === 0) {
            try {
                const data = await resetPassword({ ...formData, token });
                setMessage(
                    <div className="text-success text-center mb-3">
                        {data?.message || 'Password reset successful! You can now log in.'}
                    </div>
                );
                setFormData({ password: '', confirmPassword: '' });
                setTimeout(() => navigate('/login'), 2000); // Redirect to login after 2 seconds
            } catch (error) {
                const msg =
                    error.message || 'Failed to reset password. Please try again.';
                setMessage(<div className="text-danger text-center mb-3">{msg}</div>);
            }
        } else {
            setMessage('');
        }
    };

    return (
        <section className="register-page">
            <form className="register-form" onSubmit={handleSubmit} noValidate>
                <section className="logo-container text-center">
                    <h3>Reset Password</h3>
                </section>

                <div className="form-wrapper">
                    <p className="text-center text-muted mb-4">
                        Enter your new password below.
                    </p>

                    <FormInput
                        label="New Password*"
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
                        >
                            Reset Password
                        </Button>
                    </div>

                    <p className="text-center text-muted mt-3">
                        Remember your password?{' '}
                        <Link to="/login" className="text-primary text-decoration-none">
                            Login
                        </Link>
                    </p>
                    <p className="text-center text-muted mt-3">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-primary text-decoration-none">
                            Register
                        </Link>
                    </p>
                </div>
            </form>
        </section>
    );
};

export default ResetPassword;
