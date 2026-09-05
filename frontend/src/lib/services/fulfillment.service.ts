/**
 * Fulfillment Service — warehouse allocation with audit logging
 * Calls the pure Fulfillment Engine, then persists results.
 */

import { prisma } from '@/lib/db/prisma';
import { writeAuditLog } from './audit.service';
import { runFulfillmentEngine, validateManualOverride } from '@/lib/engines/fulfillment.engine';

export async function allocateOrder(
  orderId: string,
  productId: string,
  requestedQuantity: number,
  actorId: string,
  manualOverride?: Array<{ warehouseId: string; allocated: number }>,
  overrideReason?: string
) {
  // Fetch current inventory across all warehouses for this product
  const inventories = await prisma.inventory.findMany({
    where: { productId },
    include: { warehouse: true },
  });

  const warehouses = inventories.map(inv => ({
    warehouseId: inv.warehouseId,
    warehouseName: inv.warehouse.name,
    available: Number(inv.quantityAvailable),
    shippingCost: Number(inv.warehouse.shippingBaseCost),
  }));

  let allocation;

  if (manualOverride) {
    // Validate manual override against hard invariants
    const error = validateManualOverride(requestedQuantity, manualOverride, warehouses);
    if (error) {
      throw new Error(`Manual override rejected: ${error}`);
    }

    allocation = {
      allocations: manualOverride.map(o => ({
        warehouseId: o.warehouseId,
        warehouseName: warehouses.find(w => w.warehouseId === o.warehouseId)?.warehouseName ?? '',
        allocated: o.allocated,
        shippingCost: warehouses.find(w => w.warehouseId === o.warehouseId)?.shippingCost ?? 0,
      })),
      shipmentCount: manualOverride.filter(o => o.allocated > 0).length,
      totalShippingCost: manualOverride.reduce(
        (s, o) => s + (warehouses.find(w => w.warehouseId === o.warehouseId)?.shippingCost ?? 0), 0
      ),
      backorderQuantity: Math.max(0, requestedQuantity - manualOverride.reduce((s, o) => s + o.allocated, 0)),
      fullyFulfillable: manualOverride.reduce((s, o) => s + o.allocated, 0) >= requestedQuantity,
    };

    await writeAuditLog({
      entityType: 'ORDER',
      entityId: orderId,
      action: 'FULFILLMENT_MANUAL_OVERRIDE',
      actorId,
      after: { allocations: allocation.allocations, overrideReason },
      reason: overrideReason,
    });
  } else {
    // Greedy engine allocation
    allocation = runFulfillmentEngine({ requestedQuantity, warehouses });
  }

  // Remove old allocations for this product+order
  await prisma.fulfillmentAllocation.deleteMany({
    where: { orderId, productId },
  });

  // Persist new allocations
  if (allocation.allocations.length > 0) {
    await prisma.fulfillmentAllocation.createMany({
      data: allocation.allocations.map(a => ({
        orderId,
        warehouseId: a.warehouseId,
        productId,
        quantity: a.allocated,
        shippingCost: a.shippingCost,
      })),
    });
  }

  if (!manualOverride) {
    await writeAuditLog({
      entityType: 'ORDER',
      entityId: orderId,
      action: 'FULFILLMENT_ALLOCATED',
      actorId,
      after: {
        productId,
        shipmentCount: allocation.shipmentCount,
        backorderQuantity: allocation.backorderQuantity,
        fullyFulfillable: allocation.fullyFulfillable,
      },
    });
  }

  return allocation;
}

export async function getOrderAllocations(orderId: string) {
  return prisma.fulfillmentAllocation.findMany({
    where: { orderId },
    include: {
      warehouse: { select: { id: true, name: true, code: true } },
      product: { select: { id: true, name: true, sku: true } },
    },
  });
}
