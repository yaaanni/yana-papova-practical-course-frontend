import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

function Navbar() {
    const navigate = useNavigate();
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded: any = jwtDecode(token);
                if (decoded.role === 'ADMIN') {
                    setIsAdmin(true);
                }
            } catch (e) {
                console.error("Token decode error", e);
            }
        }
    }, []);

    const linkStyle = {
        fontSize: '11px',
        letterSpacing: '1px',
        color: '#777',
        transition: '0.2s'
    };

    const adminLinkStyle = {
        ...linkStyle,
        color: '#4272d7',
        fontWeight: 'bold' as const
    };

    return (
        <nav className="navbar navbar-expand-lg bg-white p-0 border-bottom" style={{ minHeight: '70px' }}>
            <div className="container">
                <Link className="navbar-brand fw-bold" to="/catalog" style={{ letterSpacing: '1.5px', fontSize: '20px', color: '#1a1a1a' }}>
                    MY<span style={{ color: '#4272d7' }}>STORE</span>
                </Link>

                <div className="collapse navbar-collapse justify-content-end">
                    <ul className="navbar-nav align-items-center gap-4">

                        <li className="nav-item">
                            <Link className="nav-link text-uppercase fw-semibold" style={linkStyle} to="/catalog">Catalog</Link>
                        </li>

                        <li className="nav-item">
                            <Link className="nav-link text-uppercase fw-semibold" style={linkStyle} to="/profile">Profile</Link>
                        </li>
                        <li className="nav-item">
                            <Link className="nav-link text-uppercase fw-semibold" style={linkStyle} to="/cart">Cart</Link>
                        </li>

                        {isAdmin && (
                            <>
                                <li className="nav-item">
                                    <Link className="nav-link text-uppercase fw-semibold" style={linkStyle} to="/users">Users</Link>
                                </li>
                                <li className="nav-item">
                                    <Link className="nav-link text-uppercase fw-semibold" style={linkStyle} to="/orders">Orders</Link>
                                </li>
                            </>
                        )}

                        <li className="nav-item ps-3 border-start">
                            <button
                                className="btn btn-link text-uppercase text-decoration-none p-0 fw-normal"
                                style={{ ...linkStyle, color: '#999' }}
                                onClick={() => {
                                    localStorage.removeItem('token');
                                    setIsAdmin(false);
                                    navigate('/login');
                                }}
                            >
                                Logout
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;