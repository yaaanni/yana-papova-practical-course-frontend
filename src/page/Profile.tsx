import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../component/Navbar';
import { requestWithAuth } from '../api/apiClient';

import Toast from '../component/Toast';
import ErrorAlert from '../component/ErrorAlert';
import ConfirmModal from '../component/ConfirmModal';

interface UserProfile {
    id: number;
    name: string;
    surname: string;
    birthDate: string;
    email: string;
    active: boolean;
    createdAt: string;
}

interface CardResponse {
    id: number;
    number: string;
    holder: string;
    expirationDate: string;
    active: boolean;
}

function Profile() {
    const navigate = useNavigate();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [cards, setCards] = useState<CardResponse[]>([]);
    const [activeTab, setActiveTab] = useState<'personal' | 'wallet'>('personal');
    const [isLoading, setIsLoading] = useState(true);
    
    const [error, setError] = useState<string | null>(null);

    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({
        name: '',
        surname: '',
        birthDate: '',
        email: ''
    });

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [cardToDelete, setCardToDelete] = useState<number | null>(null);
    
    const [toast, setToast] = useState({ 
        show: false, 
        message: '', 
        type: 'success' as 'success' | 'error' 
    });

    const showNotify = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ show: true, message, type });
    };

    const getUserIdFromToken = (token: string): number | null => {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            return JSON.parse(jsonPayload).userId;
        } catch (e) { return null; }
    };

    const fetchCards = async (userId: number) => {
        try {
            const response = await requestWithAuth(`/cards/${userId}/all`);
            if (response.ok) {
                const cardsData = await response.json();
                setCards(cardsData);
            }
        } catch (err) { console.error("Cards sync error"); }
    };

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('token');
            if (!token) { navigate('/login'); return; }
            const userId = getUserIdFromToken(token);
            if (!userId) {
                setError("Invalid session. Please log in again.");
                setIsLoading(false);
                return;
            }
            try {
                const profileRes = await requestWithAuth(`/users/${userId}`);
                if (!profileRes.ok) throw new Error('Could not load profile. Server might be unavailable.');
                const profileData = await profileRes.json();
                setUser(profileData);
                setEditData({
                    name: profileData.name,
                    surname: profileData.surname,
                    birthDate: profileData.birthDate,
                    email: profileData.email
                });
                await fetchCards(userId);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [navigate]);

    const handleSaveProfile = async () => {
        if (!user) return;
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(editData.email)) {
            showNotify("Please enter a valid email address", "error");
            return;
        }

        if (!editData.name || !editData.surname || !editData.birthDate) {
            showNotify("Please fill in all required fields", "error");
            return;
        }

        try {
            setIsLoading(true);
            const response = await requestWithAuth(`/users/${user.id}`, {
                method: 'PUT',
                body: JSON.stringify(editData)
            });

            if (response.ok) {
                const updatedUser = await response.json();
                setUser(updatedUser);
                setIsEditing(false);
                showNotify("Profile updated successfully", "success");
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || "Update failed");
            }
        } catch (err: any) {
            showNotify(err.message, "error");
        } finally {
            setIsLoading(false);
        }
    };

    const confirmDeleteCard = async () => {
        if (!cardToDelete || !user) return;
        try {
            const response = await requestWithAuth(`/cards/${cardToDelete}`, { method: 'DELETE' });
            if (response.ok) {
                showNotify("Card successfully removed", "success");
                await fetchCards(user.id);
            } else {
                showNotify("Failed to remove card", "error");
            }
        } catch (err) { 
            showNotify("Delete error", "error");
        } finally { 
            setShowDeleteModal(false); 
            setCardToDelete(null); 
        }
    };

    const maskCardNumber = (number: string) => `**** **** **** ${number.slice(-4)}`;
    const formatExpiry = (dateStr: string) => {
        const date = new Date(dateStr);
        return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getFullYear()).slice(-2)}`;
    };

    return (
        <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: '#fff' }}>
            <Navbar />

            <div className="container py-5">
                
                <ErrorAlert message={error} />

                {isLoading && !user ? (
                    <div className="text-center py-5 text-uppercase small text-muted" style={{ letterSpacing: '2px' }}>
                        Synchronizing...
                    </div>
                ) : user ? (
                    <div className="row g-0 border" style={{ minHeight: '600px', borderColor: '#f0f0f0' }}>

                        <div className="col-lg-3 border-end p-0 bg-light">
                            <div className="p-5 text-center">
                                <div className="mb-2 text-muted text-uppercase fw-bold" style={{ fontSize: '9px', letterSpacing: '2px' }}>Account Holder</div>
                                <h5 className="text-uppercase m-0 fw-light" style={{ letterSpacing: '2px', color: '#1a1a1a' }}>
                                    {user.name} <br /> <strong>{user.surname}</strong>
                                </h5>
                                <div className="mt-4 mx-auto" style={{ width: '30px', height: '1px', backgroundColor: '#4272d7' }}></div>
                            </div>

                            <div className="d-flex flex-column mt-2">
                                <button onClick={() => { setActiveTab('personal'); setIsEditing(false); }}
                                    className={`btn rounded-0 text-start px-5 py-3 border-0 shadow-none text-uppercase ${activeTab === 'personal' ? 'bg-white text-primary fw-bold' : 'text-muted fw-medium'}`}
                                    style={{ fontSize: '10px', letterSpacing: '1.5px', borderLeft: activeTab === 'personal' ? '3px solid #4272d7' : '3px solid transparent' }}>
                                    Personal Info
                                </button>
                                <button onClick={() => { setActiveTab('wallet'); setIsEditing(false); }}
                                    className={`btn rounded-0 text-start px-5 py-3 border-0 shadow-none text-uppercase ${activeTab === 'wallet' ? 'bg-white text-primary fw-bold' : 'text-muted fw-medium'}`}
                                    style={{ fontSize: '10px', letterSpacing: '1.5px', borderLeft: activeTab === 'wallet' ? '3px solid #4272d7' : '3px solid transparent' }}>
                                    Payment Cards ({cards.length}/5)
                                </button>
                            </div>
                        </div>

                        <div className="col-lg-9 p-5 bg-white">
                            {activeTab === 'personal' ? (
                                <section>
                                    <div className="d-flex justify-content-between align-items-center mb-5">
                                        <h4 className="text-uppercase m-0 fw-light" style={{ letterSpacing: '4px', fontSize: '18px' }}>Information</h4>
                                        {!isEditing ? (
                                            <button onClick={() => setIsEditing(true)} className="btn btn-outline-primary rounded-0 text-uppercase fw-bold" style={{ fontSize: '10px', letterSpacing: '1px' }}>Edit Profile</button>
                                        ) : (
                                            <div className="d-flex gap-2">
                                                <button onClick={handleSaveProfile} className="btn btn-primary rounded-0 text-uppercase fw-bold" style={{ fontSize: '10px', letterSpacing: '1px' }}>Save</button>
                                                <button onClick={() => setIsEditing(false)} className="btn btn-outline-secondary rounded-0 text-uppercase fw-bold" style={{ fontSize: '10px', letterSpacing: '1px' }}>Cancel</button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="row g-4">
                                        <div className="col-md-6">
                                            <label className="text-uppercase text-muted d-block mb-2 fw-bold" style={{ fontSize: '9px' }}>First Name</label>
                                            {isEditing ? (
                                                <input 
                                                    type="text" 
                                                    className="form-control rounded-0 bg-light border-0 p-3 shadow-none" 
                                                    value={editData.name} 
                                                    maxLength={20}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/[^a-zA-Zа-яА-ЯёЁ\s]/g, '').slice(0, 20);
                                                        setEditData({...editData, name: val});
                                                    }} 
                                                />
                                            ) : (
                                                <div className="p-3 bg-light" style={{ borderLeft: '2px solid #eee' }}>{user.name}</div>
                                            )}
                                        </div>
                                        <div className="col-md-6">
                                            <label className="text-uppercase text-muted d-block mb-2 fw-bold" style={{ fontSize: '9px' }}>Last Name</label>
                                            {isEditing ? (
                                                <input 
                                                    type="text" 
                                                    className="form-control rounded-0 bg-light border-0 p-3 shadow-none" 
                                                    value={editData.surname} 
                                                    maxLength={20}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/[^a-zA-Zа-яА-ЯёЁ\s]/g, '').slice(0, 20);
                                                        setEditData({...editData, surname: val});
                                                    }} 
                                                />
                                            ) : (
                                                <div className="p-3 bg-light" style={{ borderLeft: '2px solid #eee' }}>{user.surname}</div>
                                            )}
                                        </div>
                                        <div className="col-12">
                                            <label className="text-uppercase text-muted d-block mb-2 fw-bold" style={{ fontSize: '9px' }}>Email Address</label>
                                            {isEditing ? (
                                                <input 
                                                    type="email" 
                                                    className="form-control rounded-0 bg-light border-0 p-3 shadow-none" 
                                                    value={editData.email} 
                                                    maxLength={50}
                                                    onChange={(e) => {
                                                        const val = e.target.value.trim().toLowerCase().slice(0, 50);
                                                        setEditData({...editData, email: val});
                                                    }} 
                                                />
                                            ) : (
                                                <div className="p-3 bg-light" style={{ borderLeft: '2px solid #eee' }}>{user.email}</div>
                                            )}
                                        </div>
                                        <div className="col-md-6">
                                            <label className="text-uppercase text-muted d-block mb-2 fw-bold" style={{ fontSize: '9px' }}>Birth Date</label>
                                            {isEditing ? (
                                                <input type="date" className="form-control rounded-0 bg-light border-0 p-3 shadow-none" value={editData.birthDate} onChange={(e) => setEditData({...editData, birthDate: e.target.value})} />
                                            ) : (
                                                <div className="p-3 bg-light" style={{ borderLeft: '2px solid #eee' }}>{user.birthDate}</div>
                                            )}
                                        </div>
                                        <div className="col-md-6">
                                            <label className="text-uppercase text-muted d-block mb-2 fw-bold" style={{ fontSize: '9px' }}>Member Since</label>
                                            <div className="p-3 bg-light text-muted" style={{ borderLeft: '2px solid #eee' }}>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</div>
                                        </div>
                                    </div>
                                </section>
                            ) : (
                                <section>
                                    <div className="d-flex justify-content-between align-items-center mb-5">
                                        <h4 className="text-uppercase m-0 fw-light" style={{ letterSpacing: '4px', fontSize: '18px' }}>Payment Cards</h4>
                                        <span className="text-muted fw-bold" style={{ fontSize: '11px' }}>{cards.length} / 5</span>
                                    </div>
                                    <div className="row g-4">
                                        {cards.map(card => (
                                            <div key={card.id} className="col-md-6">
                                                <div className="p-4 border bg-white position-relative h-100" style={{ borderColor: '#f0f0f0' }}>
                                                    <div className="d-flex justify-content-between align-items-start mb-4">
                                                        <span className="fw-bold text-uppercase text-muted" style={{ fontSize: '9px' }}>Saved Method</span>
                                                        <button onClick={() => { setCardToDelete(card.id); setShowDeleteModal(true); }} className="btn btn-link p-0 text-decoration-none text-muted shadow-none fw-bold" style={{ fontSize: '10px' }}>REMOVE</button>
                                                    </div>
                                                    <h5 className="mb-4 fw-normal" style={{ letterSpacing: '3px', fontSize: '18px' }}>{maskCardNumber(card.number)}</h5>
                                                    <div className="d-flex justify-content-between align-items-end pt-3 border-top" style={{ borderColor: '#f8f8f8' }}>
                                                        <div><span className="d-block text-muted text-uppercase mb-1" style={{ fontSize: '8px' }}>Holder</span><span className="fw-bold text-uppercase" style={{ fontSize: '11px' }}>{card.holder}</span></div>
                                                        <div className="text-end"><span className="d-block text-muted text-uppercase mb-1" style={{ fontSize: '8px' }}>Expires</span><span className="fw-bold" style={{ fontSize: '11px' }}>{formatExpiry(card.expirationDate)}</span></div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {cards.length < 5 && (
                                            <div className="col-md-6">
                                                <button onClick={() => navigate('/addCard')} className="btn w-100 h-100 border border-dashed p-4 rounded-0 d-flex flex-column align-items-center justify-content-center shadow-none" style={{ borderStyle: 'dashed', color: '#4272d7', backgroundColor: '#fcfcfc', borderColor: '#4272d7' }}>
                                                    <span className="fw-bold text-uppercase" style={{ fontSize: '10px' }}>+ Link New Card</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )}
                        </div>
                    </div>
                ) : null}
            </div>

            <ConfirmModal 
                show={showDeleteModal}
                title="Remove Card"
                message="Confirm deletion of this card? This action cannot be undone."
                onConfirm={confirmDeleteCard}
                onCancel={() => { setShowDeleteModal(false); setCardToDelete(null); }}
            />

            <Toast 
                show={toast.show}
                message={toast.message}
                type={toast.type}
                duration={3000}
                onClose={() => setToast({ ...toast, show: false })}
            />
        </div>
    );
}

export default Profile;