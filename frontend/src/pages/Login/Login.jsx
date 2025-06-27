import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import FormInput from "../../components/FormInput.jsx";
import Button from "../../components/Button.jsx";
import Spinner from "../../components/Spinner.jsx";
import validateForm from "../../utils/validateForm.js";
import { loginUser, setAuthToken } from "../../services/userService.js";
import "../Login/login.css";

const Login = () => {
    const [formData, setFormData] = useState({
        identifier: "",
        password: "",
    });
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState("");
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        document.title = "OneAuction - Login";
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setErrors({ ...errors, [e.target.name]: "" });
        setMessage(''); // Clear message on input change
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
            const accessToken = response.data.user.accessToken;

            if (!accessToken) {
                throw new Error("Access token not found in response");
            }

            setAuthToken(accessToken);
            localStorage.setItem("accessToken", accessToken);
            localStorage.setItem("userId", response.data.user._id);     // ✅ correct

            setMessage(
                <div className="alert alert-success text-center mb-3">
                    {response.message || "Login successful! Redirecting ..."}
                </div>
            );
            navigate("/dashboard");
        } catch (error) {
            const backendMessage = error.message;
            console.error("Login error:", backendMessage);

            // Map specific backend errors to form fields
            let newErrors = {};
            if (backendMessage.includes('Invalid email/username or password')) {
                newErrors.identifier = 'Invalid email/username or password';
                newErrors.password = 'Invalid email/username or password';
            } else if (backendMessage.includes('Identifier and password are required')) {
                newErrors.identifier = !formData.identifier ? 'Email or Username is required' : '';
                newErrors.password = !formData.password ? 'Password is required' : '';
            } else if (backendMessage.includes('Account is not active')) {
                newErrors.identifier = 'Account is not active';
            } else {
                setMessage(<div className="alert alert-danger text-center mb-3">{backendMessage}</div>);
            }

            setErrors(newErrors);
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className="container-fluid d-flex justify-content-center align-items-center min-vh-100 bg-white">
                <div className="row col-md-8 shadow p-0 rounded overflow-hidden">
                    <div className="col-md-6 bg-black p-5">
                        <h3 className="mb-4 text-white text-center fw-bold" >Login</h3>
                        <form className="login-form" onSubmit={handleSubmit} noValidate>
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
                                    error={errors.identifier} />
                                <FormInput
                                    label="Password*"
                                    id="password"
                                    name="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    error={errors.password} />

                                <div className="login-actions my-4 d-flex justify-content-between">
                                    <Button
                                        type="submit"
                                        className="btn btn-outline-light d-flex align-items-center"
                                        disabled={isLoading}
                                    >
                                        <>
                                            Login
                                            {isLoading && (
                                                <span className="ms-2">
                                                    <Spinner />
                                                </span>
                                            )}
                                        </>
                                    </Button>
                                    <p className="text-end  mt-3">
                                        <Link
                                            to="/forgot-password"
                                            className="text-warning text-decoration-none"
                                        >
                                            Forgot Password?
                                        </Link>
                                    </p>
                                </div>

                                <p className="text-center text-white mt-3">
                                    Don't have an account?{" "}
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
                            className="img-fluid h-100 w-100"
                            style={{ objectFit: 'cover' }} />
                    </div>
                </div>
            </div>


            {/* <section className="register-page">
                <form className="login-form" onSubmit={handleSubmit} noValidate>
                    <section className="logo-container text-center">
                        <h3>Login</h3>
                    </section>

                    <div className="form-wrapper">
                        {message && <div className="mb-3">{message}</div>}

                        <FormInput
                            label="Email or Username*"
                            id="identifier"
                            name="identifier"
                            type="text"
                            value={formData.identifier}
                            onChange={handleChange}
                            error={errors.identifier} />
                        <FormInput
                            label="Password*"
                            id="password"
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleChange}
                            error={errors.password} />

                        <div className="login-actions d-flex flex-column justify-content-between align-items-center">
                            <Button
                                type="submit"
                                className="btn btn-info btn-login d-flex align-items-center"
                                disabled={isLoading}
                            >
                                <>
                                    Login
                                    {isLoading && (
                                        <span className="ms-2">
                                            <Spinner />
                                        </span>
                                    )}
                                </>
                            </Button>
                        </div>

                        <p className="text-center text-muted mt-3">
                            <Link
                                to="/forgot-password"
                                className="text-primary text-decoration-none"
                            >
                                Forgot Password?
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
            </section> */}
        </>
    );
};

export default Login;