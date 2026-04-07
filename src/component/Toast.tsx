import React, { useEffect } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
    show: boolean;
    message: string;
    onClose: () => void;
    type?: ToastType;
    duration?: number;
}

const Toast: React.FC<ToastProps> = ({
    show,
    message,
    onClose,
    type = 'success',
    duration = 3000
}) => {

    useEffect(() => {
        if (show) {
            const timer = setTimeout(() => onClose(), duration);
            return () => clearTimeout(timer);
        }
    }, [show, duration, onClose]);

    const config = {
        success: '#198754',
        error: '#dc3545',
        info: '#0d6efd',
        warning: '#ffc107'
    };

    return (
        <div
            className="toast-container position-fixed bottom-0 end-0 p-2 p-sm-3"
            style={{ zIndex: 9999, maxWidth: '100vw' }}
        >
            <style>
                {`
                @keyframes toastProgress {
                    from { width: 100%; }
                    to { width: 0%; }
                }
                `}
            </style>

            <div
                className={`toast align-items-center text-white border-0 rounded-0 ${show ? 'show' : 'hide'}`}
                role="alert"
                style={{
                    backgroundColor: config[type],
                    minWidth: '220px',
                    maxWidth: 'calc(100vw - 1rem)',
                    transition: 'all 0.3s ease',
                    opacity: show ? 1 : 0,
                    transform: show ? 'translateY(0)' : 'translateY(10px)',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                    position: 'relative'
                }}
            >
                <div className="d-flex p-2">
                    <div className="toast-body text-uppercase fw-bold" style={{ fontSize: '10px', letterSpacing: '1px', flexGrow: 1, wordBreak: 'break-word' }}>
                        {message}
                    </div>
                    <button
                        type="button"
                        className="btn-close btn-close-white me-2 m-auto shadow-none flex-shrink-0"
                        onClick={onClose}
                        style={{ fontSize: '0.6rem' }}
                    ></button>
                </div>

                {show && (
                    <div style={{
                        height: '2px',
                        backgroundColor: 'rgba(255,255,255,0.3)',
                        width: '100%',
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            height: '100%',
                            backgroundColor: '#fff',
                            animation: `toastProgress ${duration}ms linear forwards`
                        }}></div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Toast;