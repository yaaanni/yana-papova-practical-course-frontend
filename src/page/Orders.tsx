import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../component/Navbar';
import { requestWithAuth } from '../api/apiClient';
import ConfirmModal from '../component/ConfirmModal';

type OrderStatus = 'CREATED' | 'PAID' | 'FAILED';

const ALL_STATUSES: OrderStatus[] = [
    'CREATED', 'PAID', 'FAILED'
];

interface ItemResponse { id: number; name: string; price: number; }
interface OrderItemResponse { id: number; item: ItemResponse; quantity: number; }

interface UserResponse {
    id: number;
    name: string;
    surname: string;
    email: string;
}

interface OrderResponse {
    id: number;
    user?: UserResponse;
    status: OrderStatus;
    totalPrice: number;
    items: OrderItemResponse[];
    createdAt: string;
}

interface PageResponse<T> {
    content: T[];
    totalPages: number;
    number: number;
    totalElements: number;
}

function Orders() {
    const navigate = useNavigate();

    const [orders, setOrders] = useState<OrderResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const [filterStatus, setFilterStatus] = useState<OrderStatus | 'ALL'>('ALL');
    const [filterStart, setFilterStart] = useState('');
    const [filterEnd, setFilterEnd] = useState('');

    const [appliedFilters, setAppliedFilters] = useState({
        status: 'ALL', start: '', end: ''
    });

    const [toastMessage, setToastMessage] = useState('');
    const [toastBg, setToastBg] = useState('bg-success');
    const [showToast, setShowToast] = useState(false);

    const [showStatusModal, setShowStatusModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(null);
    const [newStatus, setNewStatus] = useState<OrderStatus | ''>('');

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [orderToDelete, setOrderToDelete] = useState<number | null>(null);

    const showNotification = (msg: string, bg = 'bg-success') => {
        setToastMessage(msg);
        setToastBg(bg);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const fetchOrders = useCallback(async (currentPage = page, filters = appliedFilters) => {
        setIsLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page: currentPage.toString(),
                size: '10'
            });

            if (filters.status && filters.status !== 'ALL') {
                queryParams.append('statuses', filters.status);
            }
            if (filters.start) queryParams.append('start', `${filters.start}T00:00:00`);
            if (filters.end) queryParams.append('end', `${filters.end}T23:59:59`);

            const response = await requestWithAuth(`/orders?${queryParams.toString()}`);

            if (response.ok) {
                const data: PageResponse<OrderResponse> = await response.json();
                setOrders(data.content);
                setTotalPages(data.totalPages);
                setPage(data.number);
            } else if (response.status === 403) {
                navigate('/catalog');
            }
        } catch (err) {
            showNotification('Failed to fetch orders', 'bg-danger');
        } finally {
            setIsLoading(false);
        }
    }, [page, appliedFilters, navigate]);

    useEffect(() => {
        fetchOrders(page, appliedFilters);
    }, [page, appliedFilters, fetchOrders]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(0);
        setAppliedFilters({ status: filterStatus, start: filterStart, end: filterEnd });
    };

    const handleClearFilters = () => {
        setFilterStatus('ALL');
        setFilterStart('');
        setFilterEnd('');
        setPage(0);
        setAppliedFilters({ status: 'ALL', start: '', end: '' });
    };

    const openStatusModal = (order: OrderResponse) => {
        setSelectedOrder(order);
        setNewStatus(order.status);
        setShowStatusModal(true);
    };

    const confirmStatusUpdate = async () => {
        if (!selectedOrder || !newStatus) return;
        try {
            const response = await requestWithAuth(`/orders/${selectedOrder.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                const updated = await response.json();
                setOrders(orders.map(o => o.id === updated.id ? updated : o));
                showNotification("Order status updated");
            } else {
                showNotification("Failed to update status", "bg-danger");
            }
        } catch (err) {
            showNotification("Connection error", "bg-danger");
        } finally {
            setShowStatusModal(false);
            setSelectedOrder(null);
        }
    };

    const confirmDeleteOrder = async () => {
        if (!orderToDelete) return;
        try {
            const response = await requestWithAuth(`/orders/${orderToDelete}`, { method: 'DELETE' });
            if (response.ok) {
                showNotification("Order deleted successfully");
                fetchOrders(page);
            } else {
                showNotification("Failed to delete order", "bg-danger");
            }
        } catch (err) {
            showNotification("Connection error", "bg-danger");
        } finally {
            setShowDeleteModal(false);
            setOrderToDelete(null);
        }
    };

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
                    <h2 className="text-uppercase fw-light m-0" style={{ letterSpacing: '6px', fontSize: '24px' }}>Orders Management</h2>
                </div>

                <div className="p-4 border mb-5 bg-light" style={{ borderColor: '#f0f0f0' }}>
                    <form onSubmit={handleSearch} className="row g-3 align-items-end">
                        <div className="col-md-3">
                            <label className="text-uppercase text-muted fw-bold mb-2" style={{ fontSize: '9px' }}>Status</label>
                            <select className="form-select form-select-sm rounded-0 border-0 shadow-none text-uppercase"
                                style={{ fontSize: '10px' }}
                                value={filterStatus} onChange={e => setFilterStatus(e.target.value as OrderStatus | 'ALL')}>
                                <option value="ALL">All Statuses</option>
                                {ALL_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label className="text-uppercase text-muted fw-bold mb-2" style={{ fontSize: '9px' }}>Date From</label>
                            <input type="date" className="form-control form-control-sm rounded-0 border-0 shadow-none"
                                value={filterStart} onChange={e => setFilterStart(e.target.value)} />
                        </div>
                        <div className="col-md-3">
                            <label className="text-uppercase text-muted fw-bold mb-2" style={{ fontSize: '9px' }}>Date To</label>
                            <input type="date" className="form-control form-control-sm rounded-0 border-0 shadow-none"
                                value={filterEnd} onChange={e => setFilterEnd(e.target.value)} />
                        </div>
                        <div className="col-md-3 d-flex gap-2">
                            <button type="submit" className="btn btn-dark btn-sm rounded-0 w-100 text-uppercase fw-bold shadow-none" style={{ fontSize: '10px', height: '31px' }}>Filter</button>
                            <button type="button" onClick={handleClearFilters} className="btn btn-outline-secondary btn-sm rounded-0 w-100 text-uppercase fw-bold shadow-none" style={{ fontSize: '10px', height: '31px' }}>Clear</button>
                        </div>
                    </form>
                </div>

                {isLoading ? (
                    <div className="text-center py-5 text-uppercase small text-muted">Loading Data...</div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-5 border" style={{ borderColor: '#f0f0f0' }}>
                        <p className="text-muted text-uppercase small m-0" style={{ letterSpacing: '2px' }}>No orders found</p>
                    </div>
                ) : (
                    <div className="d-flex flex-column gap-5">
                        {orders.map((order) => (
                            <div key={order.id} className="border p-4 shadow-sm" style={{ borderColor: '#f0f0f0' }}>
                                <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom" style={{ borderColor: '#f8f8f8' }}>
                                    <div className="d-flex gap-4 align-items-center">
                                        <div>
                                            <span className="text-muted text-uppercase d-block" style={{ fontSize: '8px' }}>Order ID</span>
                                            <span className="fw-bold" style={{ fontSize: '12px' }}>#{order.id}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted text-uppercase d-block" style={{ fontSize: '8px' }}>Customer</span>
                                            <span className="fw-bold" style={{ fontSize: '12px' }}>
                                                {order.user ? `#${order.user.id}` : 'N/A'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-muted text-uppercase d-block" style={{ fontSize: '8px' }}>Date</span>
                                            <span className="fw-medium" style={{ fontSize: '11px' }}>{new Date(order.createdAt).toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="text-end">
                                        <span className="fw-bold text-uppercase" style={{ fontSize: '10px', color: getStatusColor(order.status), letterSpacing: '1px' }}>
                                            {order.status.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <span className="text-muted text-uppercase d-block mb-3 fw-bold" style={{ fontSize: '9px', letterSpacing: '1px' }}>Order Items</span>
                                    {order.items?.map(orderItem => (
                                        <div key={orderItem.id} className="d-flex justify-content-between align-items-center py-2 border-bottom border-light">
                                            <div>
                                                <h6 className="text-uppercase m-0 fw-bold" style={{ fontSize: '13px' }}>{orderItem.item?.name}</h6>
                                                <span className="text-muted" style={{ fontSize: '11px' }}>Qty: {orderItem.quantity}</span>
                                            </div>
                                            <span className="fw-medium" style={{ fontSize: '13px' }}>
                                                ${(orderItem.item.price * orderItem.quantity).toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                                    <div className="d-flex gap-3 align-items-center">
                                        <button onClick={() => openStatusModal(order)} className="btn btn-link text-decoration-none text-primary p-0 text-uppercase fw-bold shadow-none" style={{ fontSize: '9px' }}>
                                            Update Status
                                        </button>
                                        <button onClick={() => { setOrderToDelete(order.id); setShowDeleteModal(true); }} className="btn btn-link text-decoration-none text-danger p-0 text-uppercase fw-bold shadow-none" style={{ fontSize: '9px' }}>
                                            Delete Order
                                        </button>
                                    </div>
                                    <div className="text-end">
                                        <span className="text-muted text-uppercase me-2" style={{ fontSize: '10px' }}>Total:</span>
                                        <span className="fw-bold" style={{ fontSize: '20px' }}>${(order.totalPrice || 0).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!isLoading && totalPages > 1 && (
                    <div className="d-flex justify-content-center mt-5">
                        <div className="d-flex border shadow-sm bg-white">
                            <button className="btn rounded-0 border-0" disabled={page === 0} onClick={() => setPage(page - 1)} style={{ fontSize: '11px', backgroundColor: '#fff', color: '#666' }}>Prev</button>
                            <div className="d-flex align-items-center px-3 border-start border-end fw-bold" style={{ fontSize: '11px' }}>
                                {page + 1} / {totalPages}
                            </div>
                            <button className="btn rounded-0 border-0" disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)} style={{ fontSize: '11px', backgroundColor: '#fff', color: '#666' }}>Next</button>
                        </div>
                    </div>
                )}
            </div>

            {showStatusModal && selectedOrder && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                    style={{ backgroundColor: 'rgba(255,255,255,0.85)', zIndex: 2000, backdropFilter: 'blur(4px)' }}
                    onClick={() => { setShowStatusModal(false); setSelectedOrder(null); }}
                >
                    <div className="p-5 bg-white border shadow-lg text-center" style={{ maxWidth: '400px', width: '90%', borderColor: '#eee' }} onClick={(e) => e.stopPropagation()}>
                        <h5 className="text-uppercase fw-bold mb-4" style={{ letterSpacing: '2px', fontSize: '14px' }}>Update Status</h5>
                        <select className="form-select form-select-sm rounded-0 bg-light border-0 shadow-none text-uppercase p-2 mb-4"
                            value={newStatus} onChange={e => setNewStatus(e.target.value as OrderStatus)}>
                            {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <div className="d-flex gap-3">
                            <button className="btn btn-dark rounded-0 w-100 text-uppercase fw-bold" style={{ fontSize: '10px', backgroundColor: '#4272d7', border: 'none', padding: '12px' }} onClick={confirmStatusUpdate}>Update</button>
                            <button className="btn btn-outline-secondary rounded-0 w-100 text-uppercase fw-bold" style={{ fontSize: '10px', padding: '12px' }} onClick={() => setShowStatusModal(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal 
                show={showDeleteModal}
                title="Delete Order"
                message="Are you sure you want to permanently delete this order? This action cannot be undone."
                confirmText="Delete Order"
                confirmBtnClass="btn-danger"
                onConfirm={confirmDeleteOrder}
                onCancel={() => { setShowDeleteModal(false); setOrderToDelete(null); }}
            />

            <div className="toast-container position-fixed bottom-0 end-0 p-3" style={{ zIndex: 3000 }}>
                <div className={`toast align-items-center text-white border-0 rounded-0 ${showToast ? 'show' : 'hide'} ${toastBg}`} role="alert">
                    <div className="d-flex text-uppercase py-3 px-3" style={{ fontSize: '10px', fontWeight: 'bold' }}>
                        {toastMessage}
                        <button type="button" className="btn-close btn-close-white ms-auto" onClick={() => setShowToast(false)}></button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Orders;