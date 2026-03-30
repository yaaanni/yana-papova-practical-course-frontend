import React from 'react';

interface ConfirmModalProps {
    show: boolean;
    title: string;
    message: string;
    confirmText?: string;        
    confirmBtnClass?: string;    
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    show,
    title,
    message,
    confirmText = "Delete",
    confirmBtnClass = "btn-dark",
    onConfirm,
    onCancel
}) => {
    if (!show) return null;

    return (
        <div 
            className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" 
            style={{ backgroundColor: 'rgba(255,255,255,0.8)', zIndex: 2000 }}
        >
            <div className="p-5 bg-white border shadow-lg text-center" style={{ maxWidth: '400px', borderColor: '#eee' }}>
                <h5 className="text-uppercase fw-bold mb-4" style={{ letterSpacing: '2px', fontSize: '14px' }}>
                    {title}
                </h5>
                <p className="small text-muted text-uppercase mb-5">
                    {message}
                </p>
                <div className="d-flex gap-3">
                    <button 
                        className={`btn ${confirmBtnClass} rounded-0 w-100 text-uppercase fw-bold`} 
                        style={{ fontSize: '10px' }} 
                        onClick={onConfirm}
                    >
                        {confirmText}
                    </button>
                    <button 
                        className="btn btn-outline-secondary rounded-0 w-100 text-uppercase fw-bold" 
                        style={{ fontSize: '10px' }} 
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;