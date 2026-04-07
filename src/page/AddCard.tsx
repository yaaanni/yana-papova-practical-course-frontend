import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../component/Navbar';
import { requestWithAuth } from '../api/apiClient';

import ErrorAlert from '../component/ErrorAlert';

function AddCard() {
    const [isLoading, setIsLoading] = useState(false);

    const [error, setError] = useState<string | null>(null);

    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const [formData, setFormData] = useState({
        number: '',
        holder: '',
        expirationDate: ''
    });

    const getUserIdFromToken = (token: string): number | null => {
        try {
            const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
            return payload.userId;
        } catch (e) { return null; }
    };

    const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 2) {
            let month = value.substring(0, 2);
            let year = value.substring(2, 4);
            if (parseInt(month) > 12) month = '12';
            if (parseInt(month) === 0 && month.length === 2) month = '01';
            value = `${month}/${year}`;
        }
        setFormData({ ...formData, expirationDate: value });
    };

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').substring(0, 16);
        const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ');
        setFormData({ ...formData, number: formatted });
    };

    const handleHolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^a-zA-Z\s]/g, '').toUpperCase();
        if (value.length <= 25) {
            setFormData({ ...formData, holder: value });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const holderRegex = /^[A-Z\s]+$/;

        if (!formData.number.trim() || !formData.holder.trim() || formData.expirationDate.length < 5) {
            setError("Please fill in all fields correctly.");
            setIsLoading(false);
            return;
        }

        if (!holderRegex.test(formData.holder)) {
            setError("Card Holder name must contain only English letters.");
            setIsLoading(false);
            return;
        }

        const token = localStorage.getItem('token');
        const userId = token ? getUserIdFromToken(token) : null;

        if (!userId) {
            setError("Authentication failed. Please log in again.");
            setIsLoading(false);
            return;
        }

        const [month, year] = formData.expirationDate.split('/');
        const formattedExpiry = `20${year}-${month}-01`;

        const cardRequest = {
            number: formData.number.replace(/\s/g, ''),
            holder: formData.holder,
            expirationDate: formattedExpiry,
            userId: userId
        };

        try {
            const response = await requestWithAuth('/cards', {
                method: 'POST',
                body: JSON.stringify(cardRequest)
            });

            if (response.ok) {
                setSuccessMessage('Payment card linked successfully!');
                setShowSuccessToast(true);
                setFormData({ number: '', holder: '', expirationDate: '' });
                setTimeout(() => setShowSuccessToast(false), 5000);
            } else {
                const errorData = await response.json();
                setError(errorData.message || 'Failed to save the card.');
            }
        } catch (err: any) {
            setError(err.message || 'Connection error.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-vh-100 d-flex flex-column bg-white">
            <Navbar />

            <div className="container py-5">
                <nav className="mb-5" style={{ fontSize: '10px', letterSpacing: '1px' }}>
                    <Link to="/profile" className="text-decoration-none text-muted text-uppercase">Profile</Link>
                    <span className="mx-2 text-muted">/</span>
                    <span className="text-uppercase fw-bold text-dark">Add New Card</span>
                </nav>

                <div className="row justify-content-center">
                    <div className="col-lg-10 col-xl-8">
                        <div className="row g-0 border shadow-sm" style={{ borderColor: '#f0f0f0' }}>

                            <div className="col-md-5 bg-light p-5 d-flex flex-column justify-content-center border-end">
                                <div className="p-4 bg-white border shadow-sm d-flex flex-column justify-content-between"
                                    style={{ height: '180px', width: '100%', borderColor: '#eee' }}>

                                    <div>
                                        <div className="d-flex justify-content-between align-items-start mb-4">
                                            <div style={{ width: '40px', height: '25px', backgroundColor: '#f0f0f0' }}></div>
                                            <span className="fw-bold" style={{ fontSize: '10px', letterSpacing: '1px', color: '#ccc' }}>CARD PREVIEW</span>
                                        </div>

                                        <h5 className="fw-normal m-0" style={{ letterSpacing: '3px', fontSize: '18px' }}>
                                            {formData.number || '**** **** **** ****'}
                                        </h5>
                                    </div>

                                    <div className="d-flex justify-content-between align-items-start">
                                        <div style={{ maxWidth: '65%' }}>
                                            <small className="d-block text-muted text-uppercase mb-1" style={{ fontSize: '7px', letterSpacing: '1px' }}>Holder</small>
                                            <span className="d-block fw-bold text-uppercase"
                                                style={{
                                                    fontSize: '10px',
                                                    lineHeight: '1.2em',
                                                    height: '2.4em',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden',
                                                    wordBreak: 'break-word'
                                                }}>
                                                {formData.holder || 'NAME SURNAME'}
                                            </span>
                                        </div>

                                        <div className="text-end flex-shrink-0">
                                            <small className="d-block text-muted text-uppercase mb-1" style={{ fontSize: '7px', letterSpacing: '1px' }}>Expires</small>
                                            <span className="fw-bold" style={{ fontSize: '10px' }}>
                                                {formData.expirationDate || 'MM/YY'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-md-7 p-5 bg-white">
                                <h4 className="text-uppercase fw-light mb-5" style={{ letterSpacing: '4px', fontSize: '18px' }}>Card Details</h4>

                                <ErrorAlert message={error} />

                                <form onSubmit={handleSubmit} noValidate>
                                    <div className="mb-4">
                                        <label className="text-uppercase text-muted fw-bold mb-2" style={{ fontSize: '9px', letterSpacing: '1px' }}>Card Number</label>
                                        <input
                                            type="text"
                                            className="form-control rounded-0 border-0 bg-light p-3 shadow-none"
                                            placeholder="0000 0000 0000 0000"
                                            value={formData.number}
                                            onChange={handleNumberChange}
                                        />
                                    </div>

                                    <div className="mb-4">
                                        <label className="text-uppercase text-muted fw-bold mb-2" style={{ fontSize: '9px', letterSpacing: '1px' }}>Card Holder</label>
                                        <input
                                            type="text"
                                            className="form-control rounded-0 border-0 bg-light p-3 shadow-none text-uppercase"
                                            placeholder="NAME USERNAME"
                                            value={formData.holder}
                                            onChange={handleHolderChange}
                                        />
                                        <div className="text-end mt-1 text-muted" style={{ fontSize: '8px' }}>
                                            {formData.holder.length} / 25
                                        </div>
                                    </div>

                                    <div className="mb-5">
                                        <label className="text-uppercase text-muted fw-bold mb-2" style={{ fontSize: '9px', letterSpacing: '1px' }}>Expiration Date</label>
                                        <input
                                            type="text"
                                            className="form-control rounded-0 border-0 bg-light p-3 shadow-none"
                                            placeholder="MM/YY"
                                            value={formData.expirationDate}
                                            onChange={handleExpiryChange}
                                            maxLength={5}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn w-100 py-3 text-uppercase fw-bold rounded-0 shadow-none text-white"
                                        style={{ backgroundColor: '#4272d7', fontSize: '11px', letterSpacing: '2px' }}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'Sending...' : 'Link Payment Card'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="toast-container position-fixed bottom-0 end-0 p-3" style={{ zIndex: 11 }}>
                    <div className={`toast align-items-center text-white bg-success border-0 rounded-0 ${showSuccessToast ? 'show' : ''}`}
                        role="alert" aria-live="assertive" aria-atomic="true">
                        <div className="d-flex">
                            <div className="toast-body">
                                <i className="bi bi-check-circle-fill me-2"></i>
                                {successMessage}
                            </div>
                            <button
                                type="button"
                                className="btn-close btn-close-white me-2 m-auto shadow-none"
                                onClick={() => setShowSuccessToast(false)}
                            ></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AddCard;