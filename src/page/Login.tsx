import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/apiClient';

import ErrorAlert from '../component/ErrorAlert';

function Login() {
    const navigate = useNavigate();
    
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    
    const [serverError, setServerError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [lockoutTimer, setLockoutTimer] = useState(0);

    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    useEffect(() => {
        if (failedAttempts >= 3) {
            setLockoutTimer(30);
            setFailedAttempts(0); 
        }
    }, [failedAttempts]);

    useEffect(() => {
        let interval: any;
        if (lockoutTimer > 0) {
            interval = setInterval(() => {
                setLockoutTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [lockoutTimer]);

    const handleLogin = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();

        const cleanUsername = username.trim();
        const cleanPassword = password.trim();

        if (!cleanUsername || !cleanPassword) {
            setServerError('Please fill in all fields.');
            return;
        }

        const latinRegex = /^[a-zA-Z0-9!@#$%^&*()_+=[\]{}|;:',.<>/?\\`~ -]*$/;
        if (!latinRegex.test(cleanUsername) || !latinRegex.test(cleanPassword)) {
            setServerError('Please use only English letters and symbols.');
            return;
        }

        setIsLoading(true);
        setServerError(null);

        try {
            const response = await apiRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username: cleanUsername, password: cleanPassword }),
            });

            const contentType = response.headers.get("content-type");
            const isJson = contentType && contentType.includes("application/json");
            const data = isJson ? await response.json() : null;

            if (response.ok) {
                localStorage.setItem('token', data.accessToken);
                localStorage.setItem('refreshToken', data.refreshToken);
                navigate('/catalog');
            } else {
                setFailedAttempts(prev => prev + 1);

                if (response.status === 401) {
                    setServerError('Invalid username or password.');
                } else if (response.status >= 500) {
                    setServerError('Server is temporarily unavailable. Please try again later.');
                } else if (!isJson) {
                    setServerError('Unexpected technical error. Please contact support.');
                } else {
                    setServerError(data?.message || 'Something went wrong. Please try again.');
                }
            }
        } catch (error) {
            setToastMessage('Unable to connect to the server.');
            setShowToast(true);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="vh-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: '#e9faff' }}>
            <div className="bg-white shadow rounded-0 p-4 p-sm-5 mx-3 mx-sm-0 text-center" style={{ maxWidth: '480px', width: '100%' }}>
                <form onSubmit={handleLogin} noValidate>
                    <h2 className="text-center mb-4 mb-sm-5" style={{ fontSize: '30px', color: '#555555', fontWeight: 'normal' }}>
                        Account Login
                    </h2>

                    <div className="border mb-4">
                        <div className="position-relative border-bottom">
                            <input
                                type="text"
                                className="form-control border-0 py-3 shadow-none rounded-0"
                                placeholder="Username"
                                value={username}
                                maxLength={50}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>

                        <div className="position-relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                className="form-control border-0 py-3 shadow-none rounded-0 pe-5"
                                placeholder="Password"
                                value={password}
                                maxLength={100}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="btn position-absolute top-50 end-0 translate-middle-y border-0 shadow-none me-2"
                                style={{ zIndex: 6, color: '#ccc' }}
                            >
                                <i className={`bi ${showPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`}></i>
                            </button>
                        </div>
                    </div>

                    <ErrorAlert message={serverError} />

                    <button
                        type="submit"
                        disabled={isLoading || lockoutTimer > 0}
                        className="btn btn-primary w-100 py-3 mt-3 text-uppercase shadow-sm rounded-0"
                        style={{ border: 'none' }}
                    >
                        {isLoading ? 'Signing In...' : lockoutTimer > 0 ? `Locked (${lockoutTimer}s)` : 'Sign In'}
                    </button>

                    <div className="mt-5">
                        <p className="small" style={{ color: '#555555' }}>
                            Create an account? <Link to="/register" className="text-primary text-decoration-none">Sign up</Link>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Login;