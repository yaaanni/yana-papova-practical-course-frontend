import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../component/Navbar';
import { requestWithAuth } from '../api/apiClient';

import ErrorAlert from '../component/ErrorAlert';
import Toast from '../component/Toast';
import ConfirmModal from '../component/ConfirmModal';

type OrderStatus = 'CREATED' | 'PAID' | 'FAILED';

interface ItemResponse { id: number; name: string; price: number; }
interface OrderItemResponse { id: number; item: ItemResponse; quantity: number; }
interface OrderResponse { id: number; status: OrderStatus; totalPrice: number; items: OrderItemResponse[]; createdAt: string; }

interface PaymentResponse {
    id: string;
    orderId: number;
    userId: number;
    status: string;
    createdAt: string;
    updatedAt: string;
    paymentAmount: number;
}

interface CardResponse {
    id: number;
    number: string;
    holder: string;
    expirationDate: string;
}

function Cart() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<OrderResponse[]>([]);
    const [cards, setCards] = useState<CardResponse[]>([]);
    const [filterStatus, setFilterStatus] = useState<OrderStatus | 'ALL'>('ALL');
    const [isLoading, setIsLoading] = useState(true);

    const [paymentLoadingId, setPaymentLoadingId] = useState<number | null>(null);

    const [locallyPaidOrders, setLocallyPaidOrders] = useState<number[]>([]);

    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState({
        show: false,
        message: '',
        type: 'success' as 'success' | 'error' | 'warning' | 'info'
    });

    const [selectedCardIds, setSelectedCardIds] = useState<{ [orderId: number]: number }>({});
    const [showCardModal, setShowCardModal] = useState(false);
    const [activeOrderId, setActiveOrderId] = useState<number | null>(null);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [orderToDelete, setOrderToDelete] = useState<number | null>(null);
    const [localChanges, setLocalChanges] = useState<{ [key: number]: number }>({});

    const showNotify = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
        setToast({ show: true, message, type });
    };

    const getUserIdFromToken = (token: string): number | null => {
        try {
            const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
            return payload.userId;
        } catch (e) { return null; }
    };

    const fetchData = async () => {
        const token = localStorage.getItem('token');
        const userId = token ? getUserIdFromToken(token) : null;
        if (!token || !userId) { navigate('/login'); return; }

        setIsLoading(true);
        setError(null);

        try {
            const ordersRes = await requestWithAuth(`/orders/${userId}/all`);
            if (ordersRes.ok) setOrders(await ordersRes.json());
            else throw new Error("Failed to load orders");

            const cardsRes = await requestWithAuth(`/cards/${userId}/all`);
            if (cardsRes.ok) setCards(await cardsRes.json());
            else throw new Error("Failed to load payment cards");

        } catch (err: any) {
            setError(err.message || "Connection error during data sync.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [navigate]);

    const calculateLiveTotal = (order: OrderResponse) => {
        return order.items.reduce((sum, oi) => {
            const qty = localChanges[oi.id] ?? oi.quantity;
            return sum + (oi.item.price * qty);
        }, 0);
    };

    const updateLocalQty = (orderItemId: number, currentQty: number, delta: number) => {
        const newQty = Math.max(1, (localChanges[orderItemId] ?? currentQty) + delta);
        setLocalChanges(prev => ({ ...prev, [orderItemId]: newQty }));
    };

    const handleSaveChanges = async (order: OrderResponse) => {
        const itemsToUpdate = order.items.filter(oi => localChanges[oi.id] !== undefined && localChanges[oi.id] !== oi.quantity);
        if (itemsToUpdate.length === 0) return;

        setError(null);
        try {
            for (const oi of itemsToUpdate) {
                await requestWithAuth('/orders/update/quantity', {
                    method: 'POST',
                    body: JSON.stringify({ id: oi.item.id, quantity: localChanges[oi.id] })
                });
            }
            showNotify("Changes saved successfully", "success");
            setLocalChanges({});
            fetchData();
        } catch (err) {
            showNotify("Failed to save changes", "error");
        }
    };

    const handlePayClick = (orderId: number) => {
        if (!selectedCardIds[orderId]) {
            setActiveOrderId(orderId);
            setShowCardModal(true);
        } else {
            processPayment(orderId, selectedCardIds[orderId]);
        }
    };

    const handleDetailsClick = (orderId: number) => {
        setActiveOrderId(orderId);
        setShowCardModal(true);
    };

    const processPayment = async (orderId: number, cardId: number) => {
        const token = localStorage.getItem('token');
        const userId = token ? getUserIdFromToken(token) : null;
        const order = orders.find(o => o.id === orderId);

        if (!userId || !order) return;

        setPaymentLoadingId(orderId);
        setError(null);
        const amount = calculateLiveTotal(order);

        try {
            const response = await requestWithAuth('/payments', {
                method: 'POST',
                body: JSON.stringify({
                    orderId: orderId,
                    userId: userId,
                    paymentAmount: amount
                })
            });

            const data: PaymentResponse = await response.json();

            if (response.ok && data.status === 'SUCCESS') {
                showNotify(`Payment Successful: $${amount.toFixed(2)}`, "success");
                setShowCardModal(false);

                setLocallyPaidOrders(prev => [...prev, orderId]);

                const updatedLocalChanges = { ...localChanges };
                order.items.forEach(item => delete updatedLocalChanges[item.id]);
                setLocalChanges(updatedLocalChanges);

                fetchData();
            } else {
                showNotify(data.status === 'FAILED' ? "Payment Failed" : "Processing error", "error");
            }
        } catch (err) {
            showNotify("Payment service is unavailable", "error");
        } finally {
            setPaymentLoadingId(null);
        }
    };

    const triggerDeleteModal = (id: number) => {
        setOrderToDelete(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!orderToDelete) return;
        try {
            const response = await requestWithAuth(`/orders/${orderToDelete}`, { method: 'DELETE' });
            if (response.ok) {
                showNotify("Order deleted", "success");
                fetchData();
            } else {
                showNotify("Failed to delete order", "error");
            }
        } catch (err) {
            showNotify("Connection error", "error");
        } finally {
            setShowDeleteModal(false);
            setOrderToDelete(null);
        }
    };

    const filteredOrders = filterStatus === 'ALL' ? orders : orders.filter(o => o.status === filterStatus);

    const getStatusColor = (status: OrderStatus) => {
        switch (status) {
            case 'PAID': return '#28a745';
            case 'FAILED': return '#dc3545';
            default: return '#1a1a1a';
        }
    };

    return (
        <div className="min-vh-100 d-flex flex-column bg-white">
            <Navbar />

            <div className="container py-5">
                <div className="d-flex justify-content-between align-items-end mb-4">
                    <h2 className="text-uppercase fw-light m-0" style={{ letterSpacing: '6px', fontSize: '24px' }}>Order History</h2>
                    <div className="d-flex gap-3 align-items-center">
                        <span className="text-uppercase text-muted" style={{ fontSize: '9px', letterSpacing: '1px' }}>Filter by:</span>
                        <select className="form-select form-select-sm rounded-0 border-0 bg-light shadow-none text-uppercase"
                            style={{ fontSize: '10px', letterSpacing: '1px', width: 'auto', cursor: 'pointer' }}
                            onChange={(e) => setFilterStatus(e.target.value as any)}>
                            <option value="ALL">All Statuses</option>
                            <option value="CREATED">Created</option>
                            <option value="PAID">Paid</option>
                            <option value="FAILED">Failed</option>
                        </select>
                    </div>
                </div>

                <ErrorAlert message={error} />

                {isLoading && orders.length === 0 ? (
                    <div className="text-center py-5 text-uppercase small text-muted">Synchronizing...</div>
                ) : filteredOrders.length === 0 ? (
                    <div className="text-center py-5 border" style={{ borderColor: '#f0f0f0', minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                        <p className="text-muted text-uppercase small mb-4" style={{ letterSpacing: '2px' }}>No orders found</p>
                        <Link to="/catalog" className="btn btn-outline-dark rounded-0 text-uppercase px-4 py-2" style={{ fontSize: '10px' }}>Go to Catalog</Link>
                    </div>
                ) : (
                    <div className="d-flex flex-column gap-5 mt-4">
                        {filteredOrders.map((order, index) => {
                            const isPaid = order.status === 'PAID' || locallyPaidOrders.includes(order.id);

                            const isEditable = !isPaid && order.status === 'CREATED';

                            const isActionable = !isPaid && (order.status === 'CREATED' || order.status === 'FAILED');

                            const isPaymentProcessing = paymentLoadingId === order.id;
                            const hasChanges = order.items.some(oi => localChanges[oi.id] !== undefined && localChanges[oi.id] !== oi.quantity);
                            const liveTotal = isPaid ? order.totalPrice : calculateLiveTotal(order);
                            const selectedCard = cards.find(c => c.id === selectedCardIds[order.id]);

                            const displayStatus = locallyPaidOrders.includes(order.id) ? 'PAID' : order.status;

                            return (
                                <div key={order.id} className="border p-4 shadow-sm" style={{ borderColor: '#f0f0f0' }}>
                                    <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom" style={{ borderColor: '#f8f8f8' }}>
                                        <div className="d-flex gap-4 align-items-center">
                                            <div>
                                                <span className="text-muted text-uppercase d-block" style={{ fontSize: '8px' }}>Position</span>
                                                <span className="fw-bold" style={{ fontSize: '12px' }}>Order #{index + 1}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted text-uppercase d-block" style={{ fontSize: '8px' }}>Date</span>
                                                <span className="fw-medium" style={{ fontSize: '11px' }}>{new Date(order.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <div className="text-end">
                                            <span className="text-muted text-uppercase d-block mb-1" style={{ fontSize: '8px' }}>Current Status</span>
                                            <span className="fw-bold text-uppercase" style={{ fontSize: '10px', color: getStatusColor(displayStatus as OrderStatus), letterSpacing: '1px' }}>
                                                {displayStatus.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        {order.items.map(orderItem => (
                                            <div key={orderItem.id} className="py-2">
                                                <h6 className="text-uppercase m-0 fw-bold" style={{ fontSize: '14px' }}>{orderItem.item?.name || "Unknown Product"}</h6>
                                                <div className="d-flex align-items-center gap-3 mt-2">
                                                    <span className="text-muted text-uppercase" style={{ fontSize: '9px', letterSpacing: '1px' }}>Quantity:</span>

                                                    {isEditable ? (
                                                        <div className="d-flex align-items-center border" style={{ borderColor: '#eee' }}>
                                                            <button onClick={() => updateLocalQty(orderItem.id, orderItem.quantity, -1)} className="btn btn-sm border-0 rounded-0 px-2 py-0 shadow-none" style={{ color: '#4272d7', fontWeight: 'bold' }}>−</button>
                                                            <span className="px-3 fw-bold" style={{ fontSize: '12px' }}>{localChanges[orderItem.id] ?? orderItem.quantity}</span>
                                                            <button onClick={() => updateLocalQty(orderItem.id, orderItem.quantity, 1)} className="btn btn-sm border-0 rounded-0 px-2 py-0 shadow-none" style={{ color: '#4272d7', fontWeight: 'bold' }}>+</button>
                                                        </div>
                                                    ) : (
                                                        <span className="fw-bold" style={{ fontSize: '12px' }}>{orderItem.quantity}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {!isPaid && (
                                        <div className={`mb-3 px-3 py-2 border-start border-4 d-flex justify-content-between align-items-center ${order.status === 'FAILED' ? 'bg-danger bg-opacity-10 border-danger' : 'bg-light border-primary'}`}>
                                            <span className="text-uppercase text-muted fw-bold" style={{ fontSize: '9px', letterSpacing: '1px' }}>
                                                {order.status === 'FAILED' ? "Last Attempt Failed. Select Method:" : "Payment Method:"}
                                            </span>
                                            <span className="fw-bold" style={{ fontSize: '11px' }}>
                                                {selectedCard ? `**** **** **** ${selectedCard.number.slice(-4)}` : "None Selected"}
                                            </span>
                                        </div>
                                    )}

                                    <div className="d-flex justify-content-between align-items-center pt-2 border-top mt-0">
                                        <div className="d-flex gap-4 align-items-center">
                                            {isActionable && (
                                                <>
                                                    {isEditable && (
                                                        <button onClick={() => hasChanges && handleSaveChanges(order)}
                                                            className={`btn btn-link text-decoration-none p-0 text-uppercase fw-bold shadow-none ${hasChanges ? 'text-primary' : 'text-muted'}`}
                                                            style={{ fontSize: '9px' }}>
                                                            {hasChanges ? 'Save Changes' : 'Edit'}
                                                        </button>
                                                    )}

                                                    <button onClick={() => handleDetailsClick(order.id)}
                                                        className="btn btn-link text-decoration-none text-muted p-0 text-uppercase fw-bold shadow-none"
                                                        style={{ fontSize: '9px' }}>
                                                        Details
                                                    </button>
                                                    <button onClick={() => triggerDeleteModal(order.id)}
                                                        className="btn btn-link text-decoration-none text-muted p-0 text-uppercase fw-bold shadow-none"
                                                        style={{ fontSize: '9px' }}>
                                                        Delete
                                                    </button>
                                                </>
                                            )}

                                            {isActionable && (
                                                <button
                                                    onClick={() => handlePayClick(order.id)}
                                                    disabled={isPaymentProcessing}
                                                    className="btn rounded-0 text-uppercase fw-bold px-4 ms-2 shadow-none"
                                                    style={{
                                                        fontSize: '10px',
                                                        backgroundColor: isPaymentProcessing ? '#ccc' : '#4272d7',
                                                        color: '#fff',
                                                        border: 'none',
                                                        height: '38px',
                                                        cursor: isPaymentProcessing ? 'not-allowed' : 'pointer'
                                                    }}>
                                                    {isPaymentProcessing ? 'Processing...' : (order.status === 'FAILED' ? 'Try Again' : 'Pay Now')}
                                                </button>
                                            )}
                                        </div>
                                        <div className="text-end">
                                            <span className="text-muted text-uppercase me-2" style={{ fontSize: '10px' }}>Total Amount:</span>
                                            <span className="fw-bold" style={{ fontSize: '20px' }}>${liveTotal.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {showCardModal && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(255,255,255,0.9)', zIndex: 2000 }}>
                    <div className="p-5 bg-white border shadow-lg" style={{ maxWidth: '500px', width: '90%' }}>
                        <h5 className="text-uppercase fw-bold mb-4 text-center">Select Payment Card</h5>
                        <div className="d-flex flex-column gap-3 mb-4">
                            {cards.length > 0 ? (
                                cards.map(card => (
                                    <div key={card.id} className={`p-3 border d-flex justify-content-between align-items-center ${selectedCardIds[activeOrderId!] === card.id ? 'border-primary bg-light' : ''}`}
                                        style={{ cursor: 'pointer' }} onClick={() => setSelectedCardIds(prev => ({ ...prev, [activeOrderId!]: card.id }))}>
                                        <div>
                                            <span className="d-block fw-bold" style={{ fontSize: '12px' }}>**** **** **** {card.number.slice(-4)}</span>
                                            <span className="text-muted text-uppercase" style={{ fontSize: '9px' }}>{card.holder}</span>
                                        </div>
                                        {selectedCardIds[activeOrderId!] === card.id && <i className="bi bi-check-circle-fill text-primary"></i>}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-4 border border-dashed rounded-0" style={{ borderColor: '#ddd' }}>
                                    <p className="text-muted text-uppercase mb-3" style={{ fontSize: '10px', letterSpacing: '1px' }}>No cards found</p>
                                    <button onClick={() => navigate('/addCard')}
                                        className="btn btn-sm btn-outline-primary rounded-0 text-uppercase fw-bold shadow-none"
                                        style={{ fontSize: '9px' }}>
                                        + Link New Card
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="d-flex gap-3 mt-5">
                            <button
                                className="btn btn-dark rounded-0 w-100 text-uppercase fw-bold shadow-none"
                                style={{ fontSize: '10px', padding: '12px' }}
                                onClick={() => setShowCardModal(false)}
                                disabled={cards.length === 0}
                            >
                                Confirm
                            </button>
                            <button
                                className="btn btn-outline-secondary rounded-0 w-100 text-uppercase fw-bold shadow-none"
                                style={{ fontSize: '10px', padding: '12px' }}
                                onClick={() => setShowCardModal(false)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                show={showDeleteModal}
                title="Confirm Deletion"
                message="Remove this order from history? This action cannot be undone."
                onConfirm={confirmDelete}
                onCancel={() => { setShowDeleteModal(false); setOrderToDelete(null); }}
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

export default Cart;