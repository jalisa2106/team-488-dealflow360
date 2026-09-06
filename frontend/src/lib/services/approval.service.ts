/**
 * Approval Service — manages approval requests and actions
 * Audit logged at every decision: APPROVED, REJECTED, REVISION_REQUESTED
 */

import { prisma } from '@/lib/db/prisma';
import { writeAuditLog } from './audit.service';

export type ApprovalAction = 'APPROVE' | 'REJECT' | 'REQUEST_REVISION';

export async function listPendingApprovals(reviewerRole: string, reviewerId: string, status?: string) {
  const where: any = {};
  if (reviewerRole !== 'ADMIN') {
    where.role = reviewerRole;
  }
  if (status) {
    where.status = status;
  }

  return prisma.approvalRequest.findMany({
    where,
    include: {
      quote: {
        include: {
          customer: { select: { id: true, companyName: true } },
          salesRep: { select: { id: true, name: true } },
          quoteLines: {
            include: { product: { select: { id: true, name: true } } },
          },
        },
      },
      reviewer: { select: { id: true, name: true, role: true } },
      actions: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getApprovalRequest(approvalRequestId: string) {
  return prisma.approvalRequest.findUniqueOrThrow({
    where: { id: approvalRequestId },
    include: {
      quote: {
        include: {
          customer: { include: { tier: true } },
          salesRep: { select: { id: true, name: true } },
          quoteLines: { include: { product: { include: { category: true } } } },
          approvalRequests: { orderBy: { step: 'asc' } },
        },
      },
      reviewer: { select: { id: true, name: true, role: true } },
      actions: { orderBy: { createdAt: 'desc' } },
    },
  });
}

export async function actionApprovalRequest(
  approvalRequestId: string,
  actorId: string,
  action: ApprovalAction,
  reason?: string
) {
  const approvalRequest = await prisma.approvalRequest.findUniqueOrThrow({
    where: { id: approvalRequestId },
    include: { quote: { include: { approvalRequests: { orderBy: { step: 'asc' } } } } },
  });

  if (approvalRequest.status !== 'PENDING') {
    throw new Error(`Approval request is already ${approvalRequest.status}`);
  }

  const newStatus = action === 'APPROVE' ? 'APPROVED'
    : action === 'REJECT' ? 'REJECTED'
    : 'REVISION_REQUESTED';

  const before = { status: approvalRequest.status };

  // Update this approval request
  await prisma.approvalRequest.update({
    where: { id: approvalRequestId },
    data: {
      status: newStatus,
      reviewerId: actorId,
      reason: reason ?? null,
      actedAt: new Date(),
    },
  });

  // Create audit action record
  await prisma.approvalAction.create({
    data: {
      approvalRequestId,
      actorId,
      action: newStatus,
      reason: reason ?? null,
    },
  });

  // Update quote status based on action
  const quote = approvalRequest.quote;
  let newQuoteStatus = quote.status;

  if (action === 'REJECT') {
    newQuoteStatus = 'REJECTED';
    await prisma.quote.update({ where: { id: quote.id }, data: { status: 'REJECTED' } });
  } else if (action === 'APPROVE') {
    // Check if there are more sequential approval steps
    const nextStep = quote.approvalRequests.find(
      r => r.step === approvalRequest.step + 1 && r.status === 'WAITING'
    );

    if (nextStep) {
      // Activate next step
      await prisma.approvalRequest.update({
        where: { id: nextStep.id },
        data: { status: 'PENDING' },
      });
      newQuoteStatus = 'PENDING_APPROVAL';
    } else {
      // All steps approved → quote is APPROVED
      newQuoteStatus = 'APPROVED';
      await prisma.quote.update({ where: { id: quote.id }, data: { status: 'APPROVED' } });
    }
  } else if (action === 'REQUEST_REVISION') {
    newQuoteStatus = 'DRAFT';
    await prisma.quote.update({ where: { id: quote.id }, data: { status: 'DRAFT' } });
  }

  await writeAuditLog({
    entityType: 'APPROVAL_REQUEST',
    entityId: approvalRequestId,
    action: `APPROVAL_${newStatus}`,
    actorId,
    before,
    after: { status: newStatus, quoteStatus: newQuoteStatus },
    reason,
  });

  return { approvalRequestId, newStatus, newQuoteStatus };
}
