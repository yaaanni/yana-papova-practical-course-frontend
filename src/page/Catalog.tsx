import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../component/Navbar';
import { requestWithAuth } from '../api/apiClient';
import { jwtDecode } from 'jwt-decode';

import Toast from '../component/Toast';
import ConfirmModal from '../component/ConfirmModal';

interface Item {
    id: number;
    name: string;
    price: number;
    createdAt: string;
    updatedAt: string;
}

function Catalog() {

    const [allItems, setAllItems] = useState<Item[]>([]);
    const [displayedItems, setDisplayedItems] = useState<Item[]>([]);

    const [quantities, setQuantities] = useState<{ [key: number]: number }>({});
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    const [page, setPage] = useState(0);
    const [size, setSize] = useState(6);
    const [totalPages, setTotalPages] = useState(1);

    const [serverError, setServerError] = useState('');
    const [toast, setToast] = useState({
        show: false,
        message: '',
        type: 'success' as 'success' | 'error' | 'info' | 'warning'
    });

    const [isAdmin, setIsAdmin] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newItem, setNewItem] = useState({ name: '', price: '' });

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<number | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded: any = jwtDecode(token);
                if (decoded.role === 'ADMIN' || decoded.roles?.includes('ADMIN')) {
                    setIsAdmin(true);
                }
            } catch (error) {
                console.error("Invalid token", error);
            }
        }
        fetchItems();
    }, []);

    useEffect(() => {
        setTotalPages(Math.ceil(allItems.length / size));
        const startIndex = page * size;
        const endIndex = startIndex + size;
        setDisplayedItems(allItems.slice(startIndex, endIndex));
    }, [allItems, page, size]);

    const fetchItems = async () => {
        setIsLoading(true);
        try {
            const response = await requestWithAuth('/items');
            if (!response.ok) throw new Error('Failed to fetch products');
            const data = await response.json();

            setAllItems(data);

            const initialQuants = data.reduce((acc: any, item: Item) => ({
                ...acc, [item.id]: 1
            }), {});
            setQuantities(initialQuants);
        } catch (err: any) {
            showNotify(err.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const showNotify = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ show: true, message, type });
    };

    const confirmDeleteItem = async () => {
        if (!itemToDelete) return;
        try {
            const response = await requestWithAuth(`/items/${itemToDelete}`, { method: 'DELETE' });
            if (response.ok) {
                showNotify("Item deleted successfully", "success");
                fetchItems();
            } else {
                showNotify("Failed to delete item", "error");
            }
        } catch (err) {
            showNotify("Connection error", "error");
        } finally {
            setShowDeleteModal(false);
            setItemToDelete(null);
        }
    };

    const handleCreateItem = async (e: React.FormEvent) => {
        e.preventDefault();
        setServerError('');

        const trimmedName = newItem.name.trim();
        const parsedPrice = parseFloat(newItem.price);

        if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 50) {
            setServerError("Product name must be between 2 and 50 characters.");
            return;
        }
        if (newItem.price.length > 10) {
            setServerError("Price input cannot exceed 10 characters.");
            return;
        }
        if (isNaN(parsedPrice) || parsedPrice <= 0) {
            setServerError("Price must be a valid number greater than 0.");
            return;
        }

        try {
            const response = await requestWithAuth('/items', {
                method: 'POST',
                body: JSON.stringify({
                    name: trimmedName,
                    price: parsedPrice
                })
            });
            if (response.ok) {
                setNewItem({ name: '', price: '' });
                setShowAddForm(false);
                setPage(0);
                fetchItems();
                showNotify("New product added", "success");
            } else {
                setServerError("Failed to add product");
            }
        } catch (err) {
            setServerError("Connection error");
        }
    };

    const updateQty = (id: number, delta: number) => {
        setQuantities(prev => ({
            ...prev, [id]: Math.max(1, (prev[id] || 1) + delta)
        }));
    };

    const handleAddToCart = async (itemId: number) => {
        const quantity = quantities[itemId] || 1;
        setServerError('');
        setActionLoading(itemId);
        try {
            const response = await requestWithAuth('/orders/add', {
                method: 'POST',
                body: JSON.stringify({ id: itemId, quantity: quantity })
            });
            if (response.ok) {
                showNotify(`Added ${quantity} item(s) to your cart.`, "success");
            } else {
                const data = await response.json();
                showNotify(data?.message || "Failed to add item to cart", "error");
            }
        } catch (err: any) {
            showNotify("Connection error", "error");
        } finally {
            setActionLoading(null);
        }
    };

    const handleSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSize(Number(e.target.value));
        setPage(0);
    };

    return (
        <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: '#fff' }}>
            <Navbar />

            <div className="container py-4">
                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 gap-sm-0 mb-4" style={{ padding: '0 5px' }}>
                    <nav style={{ fontSize: '10px', letterSpacing: '1px' }}>
                        <span className="text-uppercase text-muted">Home</span>
                        <span className="mx-2 text-muted">/</span>
                        <span className="text-uppercase fw-bold text-dark">Catalog</span>
                    </nav>

                    <div className="d-flex w-100 w-sm-auto justify-content-between justify-content-sm-end align-items-center gap-4">
                        {isAdmin && (
                            <button
                                onClick={() => setShowAddForm(!showAddForm)}
                                className="btn btn-sm p-0 text-uppercase fw-bold shadow-none"
                                style={{ fontSize: '10px', letterSpacing: '1px', color: '#4272d7' }}>
                                {showAddForm ? '[ Close Form ]' : '[ + Add Product ]'}
                            </button>
                        )}

                        <div className="d-flex align-items-center gap-3 ps-sm-4">
                            <span className="text-uppercase" style={{ fontSize: '9px', color: '#bbb', fontWeight: 'bold' }}>View:</span>
                            <select
                                value={size}
                                onChange={handleSizeChange}
                                className="form-select form-select-sm border-0 bg-light rounded-0 shadow-none"
                                style={{ width: '60px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                <option value={6}>6</option>
                                <option value={12}>12</option>
                            </select>
                        </div>
                    </div>
                </div>

                {isAdmin && showAddForm && (
                    <div className="mb-5 p-3 p-md-4 border shadow-sm" style={{ backgroundColor: '#fafafa' }}>
                        <form onSubmit={handleCreateItem} className="row g-3 align-items-start align-items-md-end">
                            <div className="col-12 col-md-5">
                                <label className="text-uppercase mb-2 d-block" style={{ fontSize: '9px', color: '#999', fontWeight: 'bold' }}>Product Name</label>
                                <input
                                    type="text"
                                    className="form-control form-control-sm rounded-0 border-0 border-bottom shadow-none"
                                    required
                                    maxLength={50}
                                    minLength={2}
                                    value={newItem.name}
                                    onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                />
                            </div>
                            <div className="col-12 col-md-3">
                                <label className="text-uppercase mb-2 d-block" style={{ fontSize: '9px', color: '#999', fontWeight: 'bold' }}>Price ($)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    className="form-control form-control-sm rounded-0 border-0 border-bottom shadow-none"
                                    required
                                    value={newItem.price}
                                    onChange={e => {
                                        if (e.target.value.length <= 10) {
                                            setNewItem({ ...newItem, price: e.target.value });
                                        }
                                    }}
                                />
                            </div>
                            <div className="col-12 col-md-4 mt-4 mt-md-0">
                                <button type="submit" className="btn w-100 rounded-0 text-uppercase fw-bold text-white shadow-none"
                                    style={{ fontSize: '10px', height: '35px', backgroundColor: '#4272d7', border: 'none' }}>
                                    Save Product
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {serverError && (
                    <div className="alert alert-danger rounded-0 border-0 mb-4 py-3 small text-uppercase shadow-sm"
                        style={{ letterSpacing: '1px', backgroundColor: '#fff5f5', color: '#d93025' }}>
                        <i className="bi bi-exclamation-circle me-2"></i> {serverError}
                    </div>
                )}

                {isLoading ? (
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary fw-light" role="status" style={{ width: '1.5rem', height: '1.5rem' }}></div>
                        <p className="mt-3 text-uppercase small text-muted" style={{ letterSpacing: '2px' }}>Loading Collection</p>
                    </div>
                ) : (
                    <>
                        <div className="row g-4">
                            {displayedItems.length > 0 ? displayedItems.map(item => (
                                <div key={item.id} className="col-12 col-md-6 col-lg-4">
                                    <div className="card border-0 rounded-0 h-100 position-relative p-4 p-md-5"
                                        style={{
                                            backgroundColor: '#fff',
                                            boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
                                            border: '1px solid #f1f1f1'
                                        }}>

                                        {isAdmin && (
                                            <button
                                                onClick={() => { setItemToDelete(item.id); setShowDeleteModal(true); }}
                                                className="btn btn-sm position-absolute top-0 end-0 m-2 m-md-3 border-0 shadow-none text-muted bg-white"
                                                style={{ fontSize: '16px', zIndex: 10 }}>
                                                <i className="bi bi-x-lg"></i>
                                            </button>
                                        )}

                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <div style={{ height: '1.5px', width: '25px', backgroundColor: '#4272d7' }}></div>
                                            <span style={{ fontSize: '9px', color: '#ccc', letterSpacing: '1px' }} className="text-uppercase fw-bold pe-4">Stock</span>
                                        </div>

                                        <h5 className="fw-normal text-uppercase mb-2" style={{ letterSpacing: '1px', fontSize: '15px', color: '#222' }}>
                                            {item.name}
                                        </h5>
                                        <h4 className="fw-bold mb-5" style={{ color: '#1a1a1a', fontSize: '22px' }}>
                                            ${Number(item.price).toFixed(2)}
                                        </h4>

                                        <div className="d-flex flex-column flex-sm-row gap-2 mt-auto">
                                            <div className="d-flex border align-items-center justify-content-center rounded-0 flex-shrink-0" style={{ width: '100%', maxWidth: '120px', borderColor: '#eee' }}>
                                                <button className="btn btn-sm border-0 px-3 shadow-none h-100" onClick={() => updateQty(item.id, -1)} style={{ color: '#4272d7' }}>−</button>
                                                <input type="text" readOnly value={quantities[item.id] || 1} className="form-control form-control-sm border-0 text-center bg-transparent fw-bold shadow-none w-100" style={{ fontSize: '12px' }} />
                                                <button className="btn btn-sm border-0 px-3 shadow-none h-100" onClick={() => updateQty(item.id, 1)} style={{ color: '#4272d7' }}>+</button>
                                            </div>
                                            <button
                                                className="btn flex-grow-1 text-uppercase fw-bold rounded-0 shadow-none w-100"
                                                onClick={() => handleAddToCart(item.id)}
                                                disabled={actionLoading === item.id}
                                                style={{ backgroundColor: '#4272d7', color: 'white', fontSize: '10px', letterSpacing: '1px', border: 'none', height: '42px' }}>
                                                {actionLoading === item.id ? 'Adding...' : 'Add to Cart'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-5 w-100 text-uppercase text-muted small" style={{ letterSpacing: '1px' }}>
                                    No products found.
                                </div>
                            )}
                        </div>

                        {totalPages > 1 && (
                            <div className="d-flex justify-content-center mt-5">
                                <div className="d-flex border shadow-sm bg-white">
                                    <button
                                        className="btn rounded-0 border-0 shadow-none"
                                        disabled={page === 0}
                                        onClick={() => setPage(page - 1)}
                                        style={{ fontSize: '11px', backgroundColor: '#fff', color: page === 0 ? '#ccc' : '#666', fontWeight: 'bold' }}
                                    >
                                        Prev
                                    </button>
                                    <div className="d-flex align-items-center px-4 border-start border-end fw-bold" style={{ fontSize: '11px', color: '#1a1a1a' }}>
                                        {page + 1} / {totalPages}
                                    </div>
                                    <button
                                        className="btn rounded-0 border-0 shadow-none"
                                        disabled={page + 1 >= totalPages}
                                        onClick={() => setPage(page + 1)}
                                        style={{ fontSize: '11px', backgroundColor: '#fff', color: page + 1 >= totalPages ? '#ccc' : '#666', fontWeight: 'bold' }}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <ConfirmModal
                show={showDeleteModal}
                title="Remove Product"
                message="Are you sure you want to delete this item from the catalog? This action cannot be undone."
                confirmText="Delete"
                onConfirm={confirmDeleteItem}
                onCancel={() => { setShowDeleteModal(false); setItemToDelete(null); }}
            />

            <Toast
                show={toast.show}
                message={toast.message}
                type={toast.type}
                duration={2500}
                onClose={() => setToast({ ...toast, show: false })}
            />
        </div>
    );
}

export default Catalog;