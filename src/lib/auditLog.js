/**
 * auditLog.js
 *
 * Standalone fire-and-forget utility for writing to the `audit_logs` table.
 * Designed to work both inside React context callbacks and component handlers.
 *
 * Usage:
 *   import { logAudit } from '@/lib/auditLog';
 *   await logAudit({ userId, entityType: 'client', entityId: id, entityName: 'Acme Corp', action: 'CREATE' });
 *
 * This NEVER throws — a failure logs a console warning and silently continues.
 */

import { supabase } from '@/lib/customSupabaseClient';

/**
 * @param {object} params
 * @param {number|string|null} params.userId       - ID of the user performing the action
 * @param {string}             params.entityType   - e.g. 'client', 'expense', 'job', 'user', 'setting'
 * @param {string|number|null} [params.entityId]   - primary key of the affected record
 * @param {string|null}        [params.entityName] - human-readable label
 * @param {'CREATE'|'UPDATE'|'DELETE'|string} params.action
 * @param {object|null}        [params.details]    - optional extra payload stored as jsonb
 */
export const logAudit = async ({
  userId = null,
  entityType,
  entityId = null,
  entityName = null,
  action,
  details = null,
}) => {
  try {
    const numericUserId =
      userId !== null && userId !== undefined
        ? typeof userId === 'string'
          ? parseInt(userId, 10) || null
          : Number(userId) || null
        : null;

    await supabase.from('audit_logs').insert({
      performed_by: numericUserId,
      entity_type: entityType,
      entity_id: entityId !== null ? String(entityId) : null,
      entity_name: entityName || null,
      action,
      details: details || null,
    });
  } catch (err) {
    // Never block the main operation
    console.warn('[AuditLog] Failed to write audit entry:', err?.message || err);
  }
};
