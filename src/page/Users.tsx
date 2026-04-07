import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../component/Navbar';
import { requestWithAuth } from '../api/apiClient';

import ErrorAlert from '../component/ErrorAlert';
import Toast from '../component/Toast';
import ConfirmModal from '../component/ConfirmModal';

interface CardResponse {
    id: number;
    number: string;
    holder: string;
    expirationDate: string;
    active: boolean;
}

interface UserResponse {
    id: number;
    name: string;
    surname: string;
    birthDate: string;
    email: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

interface UserByIdResponse extends UserResponse {
    cards: CardResponse[];
}

interface PageResponse<T> {
    content: T[];
    totalPages: number;
    number: number;
    totalElements: number;
}

function Users() {
    const navigate = useNavigate();

    const [users, setUsers] = useState<UserResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [filterName, setFilterName] = useState('');
    const [filterSurname, setFilterSurname] = useState('');
    const [appliedFilters, setAppliedFilters] = useState({ name: '', surname: '' });

    const [toast, setToast] = useState({
        show: false,
        message: '',
        type: 'success' as 'success' | 'error' | 'warning' | 'info'
    });

    const [selectedUser, setSelectedUser] = useState<UserByIdResponse | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    const [showEditModal, setShowEditModal] = useState(false);

    const [editData, setEditData] = useState({
        id: 0,
        name: '',
        surname: '',
        email: '',
        birthDate: ''
    });

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState<number | null>(null);

    const [showCardDeleteModal, setShowCardDeleteModal] = useState(false);
    const [cardToDelete, setCardToDelete] = useState<number | null>(null);

    const today = new Date();
    const maxDateStr = today.toISOString().split('T')[0];

    const minDate = new Date();
    minDate.setFullYear(today.getFullYear() - 100);
    const minDateStr = minDate.toISOString().split('T')[0];

    const showNotify = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
        setToast({ show: true, message, type });
    };

    const fetchUsers = async (currentPage = page, filters = appliedFilters) => {
        setIsLoading(true);
        setError(null);
        try {
            const queryParams = new URLSearchParams({
                page: currentPage.toString(),
                size: '10'
            });
            if (filters.name) queryParams.append('name', filters.name);
            if (filters.surname) queryParams.append('surname', filters.surname);

            const response = await requestWithAuth(`/users?${queryParams.toString()}`);
            if (response.ok) {
                const data: PageResponse<UserResponse> = await response.json();
                setUsers(data.content);
                setTotalPages(data.totalPages);
                setPage(data.number);
            } else if (response.status === 403) {
                navigate('/catalog');
            } else {
                throw new Error("Failed to load users list");
            }
        } catch (err: any) {
            setError(err.message || "Connection error during data sync.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [page, appliedFilters]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(0);
        setAppliedFilters({ name: filterName, surname: filterSurname });
    };

    const handleClearFilters = () => {
        setFilterName('');
        setFilterSurname('');
        setPage(0);
        setAppliedFilters({ name: '', surname: '' });
    };

    const toggleUserStatus = async (user: UserResponse) => {
        try {
            const endpoint = user.active ? `/users/${user.id}/deactivate` : `/users/${user.id}/activate`;
            const response = await requestWithAuth(endpoint, { method: 'PATCH' });

            if (response.ok) {
                const updatedUser = await response.json();
                setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
                showNotify(`User ${updatedUser.active ? 'activated' : 'deactivated'}`, "success");
            }
        } catch (err) {
            showNotify("Connection error", "error");
        }
    };

    const confirmDeleteUser = async () => {
        if (!userToDelete) return;
        try {
            const response = await requestWithAuth(`/users/${userToDelete}`, { method: 'DELETE' });
            if (response.ok) {
                showNotify("User deleted successfully", "success");
                fetchUsers(page);
            }
        } catch (err) {
            showNotify("Connection error", "error");
        } finally {
            setShowDeleteModal(false);
            setUserToDelete(null);
        }
    };

    const openEditModal = (user: UserResponse) => {
        setEditData({
            id: user.id,
            name: user.name,
            surname: user.surname,
            email: user.email,
            birthDate: user.birthDate
        });
        setShowEditModal(true);
    };

    const submitEdit = async (e: React.FormEvent) => {
        e.preventDefault();

        const selectedDate = new Date(editData.birthDate);
        if (selectedDate > today || selectedDate < minDate) {
            showNotify("Invalid birth date. Must be within last 100 years.", "warning");
            return;
        }

        try {
            const response = await requestWithAuth(`/users/${editData.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    name: editData.name,
                    surname: editData.surname,
                    birthDate: editData.birthDate,
                    email: editData.email
                })
            });
            if (response.ok) {
                const updated = await response.json();
                setUsers(users.map(u => u.id === updated.id ? updated : u));
                showNotify("User updated successfully", "success");
                setShowEditModal(false);
            } else {
                const errorData = await response.json();
                showNotify(errorData.message || "Update failed", "error");
            }
        } catch (err) {
            showNotify("Connection error", "error");
        }
    };

    const openDetails = async (id: number) => {
        try {
            const response = await requestWithAuth(`/users/${id}`);
            if (response.ok) {
                setSelectedUser(await response.json());
                setShowDetailsModal(true);
            }
        } catch (err) {
            showNotify("Connection error", "error");
        }
    };

    const triggerCardDelete = (cardId: number) => {
        setCardToDelete(cardId);
        setShowCardDeleteModal(true);
    };

    const confirmDeleteCard = async () => {
        if (!cardToDelete) return;
        try {
            const response = await requestWithAuth(`/cards/${cardToDelete}`, { method: 'DELETE' });
            if (response.ok) {
                showNotify("Card removed", "success");
                if (selectedUser) {
                    setSelectedUser({
                        ...selectedUser,
                        cards: selectedUser.cards.filter(c => c.id !== cardToDelete)
                    });
                }
            }
        } catch (err) {
            showNotify("Connection error", "error");
        } finally {
            setShowCardDeleteModal(false);
            setCardToDelete(null);
        }
    };

    return (
        <div className="min-vh-100 d-flex flex-column bg-white">
            <Navbar />

            <div className="container py-5">
                <div className="d-flex justify-content-between align-items-end mb-4">
                    <h2 className="text-uppercase fw-light m-0" style={{ letterSpacing: '6px', fontSize: '24px' }}>Users Management</h2>
                </div>

                <ErrorAlert message={error} />

                <div className="p-4 border mb-5 bg-light" style={{ borderColor: '#f0f0f0' }}>
                    <form onSubmit={handleSearch} className="row g-3 align-items-end">
                        <div className="col-md-4">
                            <label className="text-uppercase text-muted fw-bold mb-2" style={{ fontSize: '9px' }}>Filter by Name</label>
                            <input type="text" className="form-control form-control-sm rounded-0 border-0 shadow-none"
                                value={filterName} onChange={e => setFilterName(e.target.value)} placeholder="e.g. John" />
                        </div>
                        <div className="col-md-4">
                            <label className="text-uppercase text-muted fw-bold mb-2" style={{ fontSize: '9px' }}>Filter by Surname</label>
                            <input type="text" className="form-control form-control-sm rounded-0 border-0 shadow-none"
                                value={filterSurname} onChange={e => setFilterSurname(e.target.value)} placeholder="Doe" />
                        </div>
                        <div className="col-md-4 d-flex gap-2">
                            <button type="submit" className="btn btn-primary btn-sm rounded-0 w-100 text-uppercase fw-bold shadow-none" style={{ fontSize: '10px', height: '31px' }}>Search</button>
                            <button type="button" onClick={handleClearFilters} className="btn btn-outline-secondary btn-sm rounded-0 w-100 text-uppercase fw-bold shadow-none" style={{ fontSize: '10px', height: '31px' }}>Clear</button>
                        </div>
                    </form>
                </div>

                {isLoading ? (
                    <div className="text-center py-5 text-uppercase small text-muted">Loading Data...</div>
                ) : users.length === 0 ? (
                    <div className="text-center py-5 border" style={{ borderColor: '#f0f0f0' }}>
                        <p className="text-muted text-uppercase small m-0" style={{ letterSpacing: '2px' }}>No users found</p>
                    </div>
                ) : (
                    <div className="d-flex flex-column gap-4">
                        {users.map((user) => (
                            <div key={user.id} className="border p-4 shadow-sm" style={{ borderColor: '#f0f0f0' }}>
                                <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom" style={{ borderColor: '#f8f8f8' }}>
                                    <div className="d-flex gap-4 align-items-center">
                                        <div>
                                            <span className="text-muted text-uppercase d-block" style={{ fontSize: '8px' }}>User ID</span>
                                            <span className="fw-bold" style={{ fontSize: '12px' }}>#{user.id}</span>
                                        </div>
                                        <div className="text-end">
                                            <span className="text-muted text-uppercase d-block mb-1" style={{ fontSize: '8px' }}>Status</span>
                                            <span className="fw-bold text-uppercase" style={{ fontSize: '10px', color: user.active ? '#28a745' : '#dc3545' }}>
                                                {user.active ? 'ACTIVE' : 'INACTIVE'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="row mb-4">
                                    <div className="col-md-3">
                                        <span className="text-muted text-uppercase d-block" style={{ fontSize: '9px' }}>Full Name</span>
                                        <span className="fw-bold" style={{ fontSize: '14px' }}>{user.name} {user.surname}</span>
                                    </div>
                                    <div className="col-md-3">
                                        <span className="text-muted text-uppercase d-block" style={{ fontSize: '9px' }}>Email</span>
                                        <span className="fw-bold" style={{ fontSize: '14px' }}>{user.email}</span>
                                    </div>
                                    <div className="col-md-3">
                                        <span className="text-muted text-uppercase d-block" style={{ fontSize: '9px' }}>Birth Date</span>
                                        <span className="fw-bold" style={{ fontSize: '14px' }}>{user.birthDate}</span>
                                    </div>
                                </div>

                                <div className="d-flex justify-content-between align-items-center pt-3 border-top">
                                    <div className="d-flex gap-3">
                                        <button onClick={() => openDetails(user.id)} className="btn btn-link text-decoration-none text-primary p-0 text-uppercase fw-bold shadow-none" style={{ fontSize: '9px' }}>Details & Cards</button>
                                        <button onClick={() => openEditModal(user)} className="btn btn-link text-decoration-none text-muted p-0 text-uppercase fw-bold shadow-none" style={{ fontSize: '9px' }}>Edit</button>
                                        <button onClick={() => { setUserToDelete(user.id); setShowDeleteModal(true); }} className="btn btn-link text-decoration-none text-danger p-0 text-uppercase fw-bold shadow-none" style={{ fontSize: '9px' }}>Delete</button>
                                    </div>
                                    <button onClick={() => toggleUserStatus(user)} className={`btn btn-sm rounded-0 text-uppercase fw-bold px-4 shadow-none ${user.active ? 'btn-outline-danger' : 'btn-outline-success'}`} style={{ fontSize: '9px' }}>
                                        {user.active ? 'Deactivate' : 'Activate'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!isLoading && totalPages > 1 && (
                    <div className="d-flex justify-content-center mt-5">
                        <div className="d-flex border shadow-sm bg-white">
                            <button className="btn rounded-0 border-0 shadow-none" disabled={page === 0} onClick={() => setPage(page - 1)} style={{ fontSize: '11px' }}>Prev</button>
                            <div className="d-flex align-items-center px-3 border-start border-end fw-bold" style={{ fontSize: '11px' }}>{page + 1} / {totalPages}</div>
                            <button className="btn rounded-0 border-0 shadow-none" disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)} style={{ fontSize: '11px' }}>Next</button>
                        </div>
                    </div>
                )}
            </div>

            {showDetailsModal && selectedUser && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(255,255,255,0.85)', zIndex: 2000, backdropFilter: 'blur(4px)' }}>
                    <div className="p-5 bg-white border shadow-lg" style={{ maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto', borderColor: '#eee' }}>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h5 className="text-uppercase fw-bold m-0" style={{ letterSpacing: '2px', fontSize: '16px' }}>User Details</h5>
                            <button onClick={() => setShowDetailsModal(false)} className="btn-close shadow-none"></button>
                        </div>

                        <div className="p-3 bg-light border mb-4">
                            <div className="fw-bold text-uppercase mb-1" style={{ fontSize: '14px' }}>{selectedUser.name} {selectedUser.surname}</div>
                            <div className="text-muted" style={{ fontSize: '11px' }}>Birth Date: {selectedUser.birthDate} | Email: {selectedUser.email}</div>
                        </div>

                        <h6 className="text-uppercase fw-bold mb-3" style={{ fontSize: '11px', color: '#777' }}>Linked Cards ({selectedUser.cards?.length || 0})</h6>

                        <div className="d-flex flex-column gap-2 mb-4">
                            {selectedUser.cards && selectedUser.cards.length > 0 ? (
                                selectedUser.cards.map(card => (
                                    <div key={card.id} className="p-3 border d-flex justify-content-between align-items-center">
                                        <div>
                                            <span className="d-block fw-bold" style={{ fontSize: '12px' }}>**** **** **** {card.number.slice(-4)}</span>
                                            <span className="text-muted text-uppercase" style={{ fontSize: '9px' }}>{card.holder}</span>
                                        </div>
                                        <button onClick={() => triggerCardDelete(card.id)} className="btn btn-link text-danger p-0 shadow-none">
                                            <i className="bi bi-trash3"></i>
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-4 border border-dashed text-muted text-uppercase small" style={{ fontSize: '10px' }}>No cards linked</div>
                            )}
                        </div>
                        <div className="text-center">
                            <button onClick={() => setShowDetailsModal(false)} className="btn btn-outline-dark rounded-0 text-uppercase fw-bold shadow-none w-100" style={{ fontSize: '10px', padding: '12px' }}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {showEditModal && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(255,255,255,0.85)', zIndex: 2000, backdropFilter: 'blur(4px)' }}>
                    <div className="p-5 bg-white border shadow-lg" style={{ maxWidth: '500px', width: '90%' }}>
                        <h5 className="text-uppercase fw-bold mb-4 text-center" style={{ fontSize: '14px' }}>Edit User Profile</h5>
                        <form onSubmit={submitEdit}>
                            <div className="mb-3">
                                <label className="text-uppercase text-muted fw-bold mb-1" style={{ fontSize: '9px' }}>First Name</label>
                                <input type="text" className="form-control form-control-sm rounded-0 border-0 bg-light shadow-none p-2"
                                    value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })}
                                    required maxLength={50} />
                            </div>
                            <div className="mb-3">
                                <label className="text-uppercase text-muted fw-bold mb-1" style={{ fontSize: '9px' }}>Last Name</label>
                                <input type="text" className="form-control form-control-sm rounded-0 border-0 bg-light shadow-none p-2"
                                    value={editData.surname} onChange={e => setEditData({ ...editData, surname: e.target.value })}
                                    required maxLength={50} />
                            </div>
                            <div className="mb-3">
                                <label className="text-uppercase text-muted fw-bold mb-1" style={{ fontSize: '9px' }}>Email Address</label>
                                <input type="email" className="form-control form-control-sm rounded-0 border-0 bg-light shadow-none p-2"
                                    value={editData.email} onChange={e => setEditData({ ...editData, email: e.target.value })}
                                    required maxLength={100} />
                            </div>
                            <div className="mb-3">
                                <label className="text-uppercase text-muted fw-bold mb-1" style={{ fontSize: '9px' }}>Date of Birth</label>
                                <input type="date" className="form-control form-control-sm rounded-0 border-0 bg-light shadow-none p-2"
                                    value={editData.birthDate} onChange={e => setEditData({ ...editData, birthDate: e.target.value })}
                                    required min={minDateStr} max={maxDateStr} />
                            </div>

                            <div className="d-flex gap-3 mt-4">
                                <button type="submit" className="btn btn-dark rounded-0 w-100 text-uppercase fw-bold shadow-none"
                                    style={{ fontSize: '10px', backgroundColor: '#4272d7', border: 'none', height: '40px' }}>Save Changes</button>
                                <button type="button" onClick={() => setShowEditModal(false)}
                                    className="btn btn-outline-secondary rounded-0 w-100 text-uppercase fw-bold shadow-none" style={{ fontSize: '10px' }}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                show={showDeleteModal}
                title="Delete User"
                message="Are you sure you want to permanently delete this user? All associated data will be lost."
                onConfirm={confirmDeleteUser}
                onCancel={() => { setShowDeleteModal(false); setUserToDelete(null); }}
            />

            <ConfirmModal
                show={showCardDeleteModal}
                title="Remove Payment Card"
                message="Are you sure you want to remove this card? This action cannot be undone."
                onConfirm={confirmDeleteCard}
                onCancel={() => { setShowCardDeleteModal(false); setCardToDelete(null); }}
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

export default Users;