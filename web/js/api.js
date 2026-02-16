/**
 * API Client Module
 * Wrapper para chamadas à API com autenticação automática
 */

import { getToken, logout } from './auth.js';

const API_BASE = '/.netlify/functions';

/**
 * Realiza chamada à API com autenticação
 */
async function apiCall(endpoint, options = {}) {
    const token = getToken();
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const method = (options.method || 'GET').toUpperCase();
    const config = {
        ...options,
        headers
    };
    // GET/HEAD não devem enviar body (evita erro em alguns ambientes)
    if (method === 'GET' || method === 'HEAD') {
        delete config.body;
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, config);

        // Se não autorizado, fazer logout
        if (response.status === 401) {
            await logout();
            throw new Error('Sessão expirada');
        }

        // Tentar ler o corpo como JSON, mas não falhar se não for JSON
        let data = null;
        try {
            data = await response.json();
        } catch (e) {
            console.warn('Falha ao fazer parse do JSON da resposta da API:', e);
        }

        if (!response.ok) {
            const baseMessage =
                data?.error?.message ||
                data?.message ||
                `Erro ${response.status}`;
            const detail =
                data?.error?.detail ||
                data?.detail;
            const fullMessage = detail
                ? `${baseMessage} – ${detail}`
                : baseMessage;

            throw new Error(fullMessage);
        }

        return data;
    } catch (error) {
        console.error('API call error:', error);
        if (error.name === 'TypeError' && error.message && error.message.toLowerCase().includes('fetch')) {
            throw new Error('Erro de rede. Verifique a conexão ou se o servidor está acessível.');
        }
        throw error;
    }
}

// ========== REQUESTS API ==========

export async function getRequests(filters = {}) {
    const params = new URLSearchParams(filters);
    return apiCall(`/requests?${params}`);
}

export async function getRequest(id) {
    return apiCall(`/requests/${id}`);
}

export async function createRequest(data) {
    return apiCall('/requests', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

export async function updateRequest(id, data) {
    return apiCall(`/requests/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

export async function deleteRequest(id) {
    return apiCall(`/requests/${id}`, {
        method: 'DELETE'
    });
}

// ========== DASHBOARD API ==========

export async function getDashboardStats() {
    return apiCall('/dashboard/stats');
}

export async function getUrgentRequests() {
    return apiCall('/dashboard/urgentes');
}

export async function getDashboardTrends() {
    return apiCall('/dashboard/trends');
}

// ========== HISTORY API ==========

export async function getRequestHistory(requestId) {
    return apiCall(`/history/${requestId}`);
}

export async function getAuditLogs(params = {}) {
    const queryParams = new URLSearchParams(params);
    return apiCall(`/history/audit?${queryParams}`);
}

export async function getRecentActivity(limit = 100) {
    return apiCall(`/history/recent?limit=${limit}`);
}

// ========== USERS API ==========

export async function getUsers(filters = {}) {
    const params = new URLSearchParams(filters);
    return apiCall(`/users?${params}`);
}

export async function getUser(id) {
    return apiCall(`/users/${id}`);
}

export async function createUser(data) {
    return apiCall('/users', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

export async function updateUser(id, data) {
    return apiCall(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

export async function deleteUser(id) {
    return apiCall(`/users/${id}`, {
        method: 'DELETE'
    });
}

// ========== IMPORT API ==========

export async function downloadImportTemplate() {
    const token = getToken();
    
    const response = await fetch(`${API_BASE}/import/template`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error('Erro ao baixar template');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_solicitacoes.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

export async function validateImport(file) {
    const formData = new FormData();
    formData.append('file', file);

    const token = getToken();
    
    const response = await fetch(`${API_BASE}/import/validate`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error?.message || 'Erro ao validar arquivo');
    }

    return data;
}

export async function executeImport(file) {
    const formData = new FormData();
    formData.append('file', file);

    const token = getToken();
    
    const response = await fetch(`${API_BASE}/import/execute`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error?.message || 'Erro ao importar arquivo');
    }

    return data;
}

// ========== PRINT API ==========

export async function printPickingList(requestIds) {
    const token = getToken();
    
    const response = await fetch(`${API_BASE}/print/picking-list`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ requestIds })
    });

    if (!response.ok) {
        throw new Error('Erro ao gerar lista de separação');
    }

    const html = await response.text();
    
    // Abrir em nova janela para impressão
    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
}

export async function printSingleRequest(requestId) {
    const token = getToken();
    
    const response = await fetch(`${API_BASE}/print/single`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ requestId })
    });

    if (!response.ok) {
        throw new Error('Erro ao gerar impressão');
    }

    const html = await response.text();
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
}

// ========== HEALTH API ==========

export async function getHealth() {
    return apiCall('/health');
}

