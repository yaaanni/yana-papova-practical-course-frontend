import React, { useEffect, useState } from 'react';

interface ErrorAlertProps {
    message: string | null;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({ message }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setVisible(true), 50);
            return () => clearTimeout(timer);
        } else {
            setVisible(false);
        }
    }, [message]);

    if (!message) return null;

    return (
        <div
            className={`d-flex align-items-center justify-content-center px-4 py-2 mb-4 `}
            style={{
                backgroundColor: 'rgba(176, 42, 55, 0.05)',
                border: '1px solid rgba(176, 42, 55, 0.1)',
                color: '#b02a37',
                fontSize: '13px',
                fontWeight: '400',
                transition: 'opacity 0.4s ease-in-out',
                gap: '10px',
                minHeight: '42px',
            }}
        >
            <i className="bi bi-exclamation-circle" style={{ fontSize: '16px', display: 'flex' }}></i>
            <span style={{ lineHeight: '1.2' }}>{message}</span>
        </div>
    );
};

export default ErrorAlert;