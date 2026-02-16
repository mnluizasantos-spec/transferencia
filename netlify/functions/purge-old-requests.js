/**
 * Scheduled function: apaga (soft delete) solicitações com mais de 45 dias
 * da data de criação (created_at).
 * Agendamento: diário (configurado em netlify.toml).
 */

const { getDB } = require('./utils/db');

exports.handler = async () => {
  try {
    const sql = getDB();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 45);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const result = await sql`
      UPDATE material_requests
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE deleted_at IS NULL
        AND created_at::date < ${cutoffStr}
      RETURNING id
    `;

    const affected = Array.isArray(result) ? result.length : 0;
    console.log('Purge concluído:', { cutoff: cutoffStr, affected });
    return { statusCode: 200, body: JSON.stringify({ cutoff: cutoffStr, purged: affected }) };
  } catch (error) {
    console.error('Erro no purge:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
