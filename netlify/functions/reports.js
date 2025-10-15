const { getDB } = require('./utils/db');
const { withErrorHandling } = require('./utils/errorHandler');
const { verifyToken } = require('./utils/middleware');
const { logInfo } = require('./utils/logger');

/**
 * POST /api/reports
 * Gera relatórios e análises das solicitações
 */
exports.handler = withErrorHandling(async (event) => {
    const sql = getDB();
    
    // Verificar autenticação
    const user = await verifyToken(event, sql);
    
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Método não permitido' })
        };
    }

    const { startDate, endDate } = JSON.parse(event.body);
    
    if (!startDate || !endDate) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Datas de início e fim são obrigatórias' })
        };
    }

    try {
        console.log('=== RELATÓRIOS ===');
        console.log('User:', user.userId, user.role);
        console.log('Period:', startDate, 'to', endDate);
        
        // 1. Materiais mais solicitados
        let topMaterials;
        if (user.role === 'solicitante') {
            topMaterials = await sql`
                SELECT 
                    material_description,
                    SUM(quantidade) as total,
                    COUNT(*) as requests_count
                FROM material_requests
                WHERE created_at BETWEEN ${startDate} AND ${endDate}
                AND created_by = ${user.userId}
                AND status != 'Cancelado'
                GROUP BY material_description
                ORDER BY total DESC
                LIMIT 10
            `;
        } else {
            topMaterials = await sql`
                SELECT 
                    material_description,
                    SUM(quantidade) as total,
                    COUNT(*) as requests_count
                FROM material_requests
                WHERE created_at BETWEEN ${startDate} AND ${endDate}
                AND status != 'Cancelado'
                GROUP BY material_description
                ORDER BY total DESC
                LIMIT 10
            `;
        }

        // 2. Tempo médio de envio (criação até conclusão)
        let avgTime;
        if (user.role === 'solicitante') {
            avgTime = await sql`
                SELECT 
                    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as hours,
                    COUNT(*) as completed_count
                FROM material_requests
                WHERE status = 'Concluído'
                AND created_at BETWEEN ${startDate} AND ${endDate}
                AND created_by = ${user.userId}
                AND status != 'Cancelado'
            `;
        } else {
            avgTime = await sql`
                SELECT 
                    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as hours,
                    COUNT(*) as completed_count
                FROM material_requests
                WHERE status = 'Concluído'
                AND created_at BETWEEN ${startDate} AND ${endDate}
                AND status != 'Cancelado'
            `;
        }

        // 3. Solicitações por dia
        let daily;
        if (user.role === 'solicitante') {
            daily = await sql`
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as count
                FROM material_requests
                WHERE created_at BETWEEN ${startDate} AND ${endDate}
                AND created_by = ${user.userId}
                AND status != 'Cancelado'
                GROUP BY DATE(created_at)
                ORDER BY date
            `;
        } else {
            daily = await sql`
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as count
                FROM material_requests
                WHERE created_at BETWEEN ${startDate} AND ${endDate}
                AND status != 'Cancelado'
                GROUP BY DATE(created_at)
                ORDER BY date
            `;
        }

        // 4. Solicitações por status
        let byStatus;
        if (user.role === 'solicitante') {
            byStatus = await sql`
                SELECT 
                    status,
                    COUNT(*) as count
                FROM material_requests
                WHERE created_at BETWEEN ${startDate} AND ${endDate}
                AND created_by = ${user.userId}
                AND status != 'Cancelado'
                GROUP BY status
                ORDER BY count DESC
            `;
        } else {
            byStatus = await sql`
                SELECT 
                    status,
                    COUNT(*) as count
                FROM material_requests
                WHERE created_at BETWEEN ${startDate} AND ${endDate}
                AND status != 'Cancelado'
                GROUP BY status
                ORDER BY count DESC
            `;
        }

        // 5. Estatísticas adicionais
        const totalRequests = daily.reduce((sum, day) => sum + day.count, 0);
        const completedRequests = byStatus.find(s => s.status === 'Concluído')?.count || 0;
        const completionRate = totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0;

        console.log('Results:', {
            topMaterials: topMaterials.length,
            avgTime: avgTime[0],
            daily: daily.length,
            byStatus: byStatus.length,
            totalRequests,
            completedRequests
        });

        const reportData = {
            topMaterials,
            avgTime: {
                hours: avgTime[0]?.hours || 0,
                completedCount: avgTime[0]?.completed_count || 0
            },
            daily,
            byStatus,
            summary: {
                totalRequests,
                completedRequests,
                completionRate: Math.round(completionRate * 100) / 100,
                period: { startDate, endDate }
            }
        };

        logInfo({
            action: 'report_generated',
            userId: user.userId,
            userRole: user.role,
            period: { startDate, endDate },
            totalRequests,
            completedRequests
        });

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify(reportData)
        };

    } catch (error) {
        console.error('Erro ao gerar relatórios:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Erro interno ao gerar relatórios',
                details: error.message 
            })
        };
    }
});
