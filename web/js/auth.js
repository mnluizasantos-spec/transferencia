/**
 * Authentication Module
 * Gerenciamento de autenticação e sessão
 */

const API_BASE = '/.netlify/functions';
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'current_user';

/**
 * Faz login do usuário
 */
export async function login(email, password) {
    const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error?.message || 'Erro ao fazer login');
    }

    if (data.token) {
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        return data.user;
    }

    throw new Error('Token não recebido');
}

/**
 * Faz logout do usuário
 */
export async function logout() {
    const token = getToken();

    if (token) {
        try {
            await fetch(`${API_BASE}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
        } catch (error) {
            console.error('Erro ao fazer logout no servidor:', error);
        }
    }

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = '/login.html';
}

/**
 * Verifica se usuário está autenticado
 */
export function isAuthenticated() {
    return !!getToken();
}

/**
 * Obtém token JWT do localStorage
 */
export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

/**
 * Obtém dados do usuário atual
 */
export function getCurrentUser() {
    const userJson = localStorage.getItem(USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
}

/**
 * Verifica se usuário tem role específica
 */
export function hasRole(role) {
    const user = getCurrentUser();
    return user && user.role === role;
}

/**
 * Verifica se usuário é admin
 */
export function isAdmin() {
    return hasRole('admin');
}

/**
 * Verifica se usuário é separador
 */
export function isSeparador() {
    return hasRole('separador');
}

/**
 * Verifica se usuário é solicitante
 */
export function isSolicitante() {
    return hasRole('solicitante');
}

/**
 * Verifica autenticação e redireciona se necessário
 */
export function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

/**
 * Atualiza dados do usuário no localStorage
 */
export async function refreshUser() {
    const token = getToken();
    
    if (!token) {
        return null;
    }

    try {
        const response = await fetch(`${API_BASE}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                await logout();
                return null;
            }
            throw new Error('Erro ao buscar dados do usuário');
        }

        const data = await response.json();
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        return data.user;
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        return null;
    }
}

/**
 * Altera senha do usuário
 */
export async function changePassword(currentPassword, newPassword) {
    const token = getToken();

    const response = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error?.message || 'Erro ao alterar senha');
    }

    // Logout após trocar senha
    await logout();
}

// Verificar se token expirou em chamadas de API
window.addEventListener('storage', (e) => {
    if (e.key === TOKEN_KEY && !e.newValue) {
        // Token foi removido, redirecionar para login
        window.location.href = '/login.html';
    }
});

