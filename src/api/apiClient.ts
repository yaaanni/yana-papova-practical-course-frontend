const BASE_URL = 'https://recycling-dollar-navy-drill.trycloudflare.com/api';

export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    return fetch(url, { ...options, headers });
};

export const requestWithAuth = async (endpoint: string, options: RequestInit = {}) => {
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
    let accessToken = localStorage.getItem('token');

    const authOptions: RequestInit = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
            ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
        }
    };

    let response = await fetch(url, authOptions);

    if (response.status === 401) {
        const refreshToken = localStorage.getItem('refreshToken');

        if (!refreshToken) {
            handleLogout();
            throw new Error('No refresh token available. Please log in again.');
        }

        try {
            const refreshResponse = await fetch(`${BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken })
            });

            if (refreshResponse.ok) {
                const data = await refreshResponse.json();

                localStorage.setItem('token', data.accessToken);

                authOptions.headers = {
                    ...authOptions.headers,
                    'Authorization': `Bearer ${data.accessToken}`
                };

                response = await fetch(url, authOptions);
            } else {
                handleLogout();
                throw new Error('Session completely expired.');
            }
        } catch (error) {
            handleLogout();
            throw error;
        }
    }

    return response;
};

export const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
};