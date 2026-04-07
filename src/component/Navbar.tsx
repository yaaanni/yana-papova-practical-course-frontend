import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

function Navbar() {
    const navigate = useNavigate();
    const [isAdmin, setIsAdmin] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

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

    useEffect(() => {
        const handleScroll = () => {
            if (isMenuOpen) {
                setIsMenuOpen(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isMenuOpen]);

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
        <nav className="navbar navbar-expand-lg bg-white p-0 border-bottom sticky-top" style={{ minHeight: '70px', zIndex: 1040 }}>
            <div className="container">
                <Link className="navbar-brand fw-bold" to="/catalog" style={{ letterSpacing: '1.5px', fontSize: '20px', color: '#1a1a1a' }}>
                    MY<span style={{ color: '#4272d7' }}>STORE</span>
                </Link>

                <button 
                    className="navbar-toggler border-0 shadow-none px-2" 
                    type="button" 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    <span className="navbar-toggler-icon" style={{ width: '22px', height: '22px' }}></span>
                </button>

                <div 
                    className={`collapse navbar-collapse justify-content-end ${isMenuOpen ? 'show position-absolute start-0 w-100 bg-white shadow-sm border-bottom' : ''}`}
                    style={isMenuOpen ? { top: '70px' } : {}}
                >
                    <ul className="navbar-nav align-items-center gap-2 gap-lg-4 py-3 py-lg-0">
                        <li className="nav-item">
                            <Link className="nav-link text-uppercase fw-semibold px-0 py-1 py-lg-0" style={linkStyle} to="/catalog" onClick={() => setIsMenuOpen(false)}>Catalog</Link>
                        </li>

                        <li className="nav-item">
                            <Link className="nav-link text-uppercase fw-semibold px-0 py-1 py-lg-0" style={linkStyle} to="/profile" onClick={() => setIsMenuOpen(false)}>Profile</Link>
                        </li>
                        
                        <li className="nav-item">
                            <Link className="nav-link text-uppercase fw-semibold px-0 py-1 py-lg-0" style={linkStyle} to="/cart" onClick={() => setIsMenuOpen(false)}>Cart</Link>
                        </li>

                        {isAdmin && (
                            <>
                                <li className="nav-item">
                                    <Link className="nav-link text-uppercase fw-semibold px-0 py-1 py-lg-0" style={adminLinkStyle} to="/users" onClick={() => setIsMenuOpen(false)}>Users</Link>
                                </li>
                                <li className="nav-item">
                                    <Link className="nav-link text-uppercase fw-semibold px-0 py-1 py-lg-0" style={adminLinkStyle} to="/orders" onClick={() => setIsMenuOpen(false)}>Orders</Link>
                                </li>
                            </>
                        )}

                        <div className="d-lg-none w-100 my-1 d-flex justify-content-center">
                            <div style={{ height: '1px', width: '30px', backgroundColor: '#eee' }}></div>
                        </div>
                        <div className="d-none d-lg-block border-start h-100" style={{ minHeight: '24px' }}></div>

                        <li className="nav-item ps-lg-3">
                            <button
                                className="btn btn-link text-uppercase text-decoration-none p-0 py-1 py-lg-0 fw-normal"
                                style={{ ...linkStyle, color: '#999' }}
                                onClick={() => {
                                    localStorage.removeItem('token');
                                    setIsAdmin(false);
                                    setIsMenuOpen(false);
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