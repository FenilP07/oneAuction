import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import FormInput from "../../components/FormInput.jsx";
import Button from "../../components/Button.jsx";
import Spinner from "../../components/Spinner.jsx";
import validateForm from "../../utils/validateForm.js";
import { requestPasswordReset } from "../../services/userService.js";

const ForgotPassword = () => {
    const [formData, setFormData] = useState({
        email: "",
    });
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        document.title = "OneAuction - Forgot Password";
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
                        {data?.message || "Password reset email sent! Check your inbox."}
                    </div>
                );
                setFormData({ email: "" }); // Clear form
            } catch (error) {
                const msg =
                    error.message || "Failed to send reset email. Please try again.";
                setMessage(<div className="text-danger text-center mb-3">{msg}</div>);
            }finally {
                setIsLoading(false);
            }
        } else {
            setMessage("");
        }
    };

    return (
        <section className="register-page">
            <form className="register-form" onSubmit={handleSubmit} noValidate>
                <section className="logo-container text-center">
                    <h3>Forgot Password</h3>
                </section>

                <div className="form-wrapper">
                    <p className="text-center text-muted mb-4">
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
                            className="btn btn-info btn-register d-flex align-items-center"
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

                    <p className="text-center text-muted mt-3">
                        Remember your password?{" "}
                        <Link to="/login" className="text-primary text-decoration-none">
                            Login
                        </Link>
                    </p>
                    <p className="text-center text-muted mt-3">
                        Don't have an account?{" "}
                        <Link to="/register" className="text-primary text-decoration-none">
                            Register
                        </Link>
                    </p>
                </div>
            </form>
        </section>
    );
};

export default ForgotPassword;