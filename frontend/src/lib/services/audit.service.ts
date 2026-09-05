/**
 * Audit Service — generic audit logging helper
 *
 * One repository function, one shape.
 * Called from every service that changes something material:
 *   - approval decisions, rejections
 *   - manual overrides
 *   - quote line edits
 *   - negotiation counter-offers
 *   - discount changes
 *
 * Consistency here makes the Audit Timeline UI trivial to build:
 * just "list audit rows for entity, newest first."
 */

import { prisma } from '@/lib/db/prisma';

export interface AuditLogEntry {
  entityType: string;       // 'QUOTE' | 'APPROVAL_REQUEST' | 'NEGOTIATION' | 'ORDER' | 'INVOICE'
  entityId: string;
  action: string;           // e.g. 'QUOTE_SUBMITTED', 'APPROVAL_APPROVED', 'DISCOUNT_CHANGED'
  actorId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string;
}

export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  await prisma.auditLog.create({
    data: {
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      actorId: entry.actorId,
      beforeData: entry.before ? JSON.stringify(entry.before) : null,
      afterData: entry.after ? JSON.stringify(entry.after) : null,
      reason: entry.reason ?? null,
    },
  });
}

export async function getAuditLogs(entityType: string, entityId: string) {
  return prisma.auditLog.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: 'desc' },
    include: { actor: { select: { id: true, name: true, role: true } } },
  });
}
