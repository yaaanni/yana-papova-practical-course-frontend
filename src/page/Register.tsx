import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/apiClient';

import ErrorAlert from '../component/ErrorAlert';
import Toast from '../component/Toast';

function Register() {
    const [name, setName] = useState('');
    const [surname, setSurname] = useState('');
    const [username, setUsername] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [serverError, setServerError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Состояния уведомления
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    const CURRENT_YEAR = new Date().getFullYear();

    const formatInputName = (val: string) => {
        const trimmed = val.trim();
        if (!trimmed) return '';
        return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
    };

    const handleRegister = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        setServerError(null);

        const cleanName = formatInputName(name);
        const cleanSurname = formatInputName(surname);
        const cleanUsername = username.trim();
        const cleanEmail = email.trim().toLowerCase();
        const cleanPassword = password.trim();
        const cleanConfirm = confirmPassword.trim();

        if (!cleanName || !cleanSurname || !cleanUsername || !birthDate || !cleanEmail || !cleanPassword) {
            setServerError('Please fill in all fields.');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
            setServerError('Please enter a valid email address.');
            return;
        }

        if (cleanPassword.length < 6) {
            setServerError('Password must be at least 6 characters long.');
            return;
        }

        if (cleanPassword !== cleanConfirm) {
            setServerError('Passwords do not match.');
            return;
        }

        setIsLoading(true);

        try {
            const response = await apiRequest('/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: cleanName,
                    surname: cleanSurname,
                    username: cleanUsername,
                    birthDate: birthDate,
                    email: cleanEmail,
                    password: cleanPassword
                }),
            });

            const isJson = response.headers.get('content-type')?.includes('application/json');
            const data = isJson ? await response.json() : null;

            if (response.ok) {
                setToastMessage('Registration successful! You can now log in.');
                setShowToast(true);
                setName(''); setSurname(''); setUsername(''); setBirthDate('');
                setEmail(''); setPassword(''); setConfirmPassword('');
            } else {
                setServerError(data?.message || 'Registration failed.');
            }
        } catch (error) {
            setToastMessage('Connection error. Please check your internet.');
            setShowToast(true);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center py-5" style={{ backgroundColor: '#e9faff' }}>
            <div className="bg-white shadow rounded-0 p-5 text-center" style={{ maxWidth: '500px', width: '100%' }}>
                <form onSubmit={handleRegister} noValidate>
                    <h2 className="mb-5 fw-normal" style={{ fontSize: '28px', color: '#555555' }}>Create Account</h2>

                    <div className="d-flex flex-column gap-2 mb-3">
                        <div className="d-flex gap-2">
                            <input type="text" className="form-control border shadow-none py-2 rounded-0" placeholder="Name"
                                value={name} maxLength={30} onChange={(e) => setName(e.target.value)} />
                            <input type="text" className="form-control border shadow-none py-2 rounded-0" placeholder="Surname"
                                value={surname} maxLength={30} onChange={(e) => setSurname(e.target.value)} />
                        </div>

                        <input type="text" className="form-control border shadow-none py-2 rounded-0" placeholder="Username"
                            value={username} maxLength={20} onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9!@#$%^&*()_+=[\]{}|;:',.<>/?\\`~ -]/g, ''))} />

                        <input
                            type="date"
                            className="form-control border shadow-none py-2 rounded-0"
                            value={birthDate}
                            min={`${CURRENT_YEAR - 100}-01-01`}
                            max={`${CURRENT_YEAR}-12-31`}
                            onChange={(e) => setBirthDate(e.target.value)}
                        />

                        <input type="email" className="form-control border shadow-none py-2 rounded-0" placeholder="Email"
                            value={email} maxLength={50} onChange={(e) => setEmail(e.target.value.replace(/[А-Яа-яЁё]/g, ''))} />

                        <div className="position-relative">
                            <input type={showPassword ? "text" : "password"} className="form-control border shadow-none py-2 rounded-0 pe-5" placeholder="Password"
                                value={password} maxLength={32} onChange={(e) => setPassword(e.target.value)} />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="btn position-absolute top-50 end-0 translate-middle-y border-0 me-1 shadow-none" style={{ color: '#ccc' }}>
                                <i className={`bi ${showPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`}></i>
                            </button>
                        </div>

                        <div className="position-relative">
                            <input type={showConfirmPassword ? "text" : "password"} className="form-control border shadow-none py-2 rounded-0 pe-5" placeholder="Confirm Password"
                                value={confirmPassword} maxLength={32} onChange={(e) => setConfirmPassword(e.target.value)} />
                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="btn position-absolute top-50 end-0 translate-middle-y border-0 me-1 shadow-none" style={{ color: '#ccc' }}>
                                <i className={`bi ${showConfirmPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`}></i>
                            </button>
                        </div>
                    </div>

                    <ErrorAlert message={serverError} />

                    <button type="submit" className="btn btn-primary w-100 py-3 text-uppercase shadow-sm rounded-0"
                        style={{ border: 'none' }} disabled={isLoading}>
                        {isLoading ? 'Signing Up...' : 'Sign Up'}
                    </button>

                    <div className="mt-5">
                        <p className="small mb-0" style={{ color: '#555555' }}>
                            Already have an account? <Link to="/login" className="text-primary text-decoration-none">Login here</Link>
                        </p>
                    </div>
                </form>
            </div>

            <Toast
                show={showToast}
                message={toastMessage}
                type={serverError ? "error" : "success"}
                onClose={() => setShowToast(false)}
            />
        </div>
    );
}

export default Register;