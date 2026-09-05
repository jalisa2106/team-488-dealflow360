/**
 * ENGINE 6 — Fulfillment / Warehouse Allocation Engine (pure function)
 *
 * Strategy: Deterministic greedy heuristic (not an optimization solver).
 * Rationale: objective is minimize shipment count/cost subject to stock constraints —
 * combinatorial optimization is unnecessary at this scale, and greedy with largest-first
 * sort achieves the same goal transparently and testably.
 *
 * Steps:
 *   1. Find warehouses with stock > 0 for the product
 *   2. Sort by available quantity descending (largest first = fewest warehouses)
 *   3. Allocate greedily: take min(needed, available) from each warehouse
 *   4. Remainder after all warehouses = explicit backorder (never silently under-fill)
 *   5. Count distinct warehouses used = shipment count
 *
 * Hard invariants (tested explicitly):
 *   - Total allocated NEVER exceeds requested quantity
 *   - Single warehouse allocation NEVER exceeds that warehouse's actual stock
 *
 * Worked examples:
 *   1. Need 10 units. WH-A=8, WH-B=5. → allocate WH-A:8, WH-B:2. Total=10. Backorder=0.
 *   2. Need 15 units. WH-A=8, WH-B=5. → allocate WH-A:8, WH-B:5. Total=13. Backorder=2.
 *   3. Need 5 units. WH-A=20. → allocate WH-A:5. Shipments=1. Cost=flatCost.
 *   4. Manual override: user sets WH-A:12 but stock is 8 → rejected (invariant violated).
 *   5. Need 0 units → all warehouses allocate 0, no backorder.
 */

export interface WarehouseStock {
  warehouseId: string;
  warehouseName: string;
  available: number;
  shippingCost: number;  // flat cost per warehouse shipment
}

export interface FulfillmentInput {
  requestedQuantity: number;
  warehouses: WarehouseStock[];
}

export interface WarehouseAllocation {
  warehouseId: string;
  warehouseName: string;
  allocated: number;
  shippingCost: number;
}

export interface FulfillmentOutput {
  allocations: WarehouseAllocation[];
  shipmentCount: number;       // distinct warehouses used
  totalShippingCost: number;
  backorderQuantity: number;   // unfulfilled remainder
  fullyFulfillable: boolean;
}

export function runFulfillmentEngine(input: FulfillmentInput): FulfillmentOutput {
  const { requestedQuantity, warehouses } = input;

  // Sort warehouses by available quantity descending (greedy: largest first)
  const sorted = [...warehouses]
    .filter(w => w.available > 0)
    .sort((a, b) => b.available - a.available);

  const allocations: WarehouseAllocation[] = [];
  let remaining = requestedQuantity;

  for (const wh of sorted) {
    if (remaining <= 0) break;

    const allocated = Math.min(remaining, wh.available);
    // Hard invariant: allocation never exceeds warehouse stock
    if (allocated > wh.available) {
      throw new Error(`INVARIANT VIOLATED: Cannot allocate ${allocated} from ${wh.warehouseName} (stock: ${wh.available})`);
    }

    if (allocated > 0) {
      allocations.push({
        warehouseId: wh.warehouseId,
        warehouseName: wh.warehouseName,
        allocated,
        shippingCost: wh.shippingCost,
      });
      remaining -= allocated;
    }
  }

  const backorderQuantity = Math.max(0, remaining);
  const shipmentCount = allocations.length;
  const totalShippingCost = round2(allocations.reduce((s, a) => s + a.shippingCost, 0));
  const totalAllocated = allocations.reduce((s, a) => s + a.allocated, 0);

  // Hard invariant: total allocated never exceeds requested
  if (totalAllocated > requestedQuantity) {
    throw new Error(`INVARIANT VIOLATED: Total allocated (${totalAllocated}) exceeds requested (${requestedQuantity})`);
  }

  return {
    allocations,
    shipmentCount,
    totalShippingCost,
    backorderQuantity,
    fullyFulfillable: backorderQuantity === 0,
  };
}

/**
 * Validate a manual override against the same hard invariants.
 * Returns null if valid, or an error message if violated.
 */
export function validateManualOverride(
  requestedQuantity: number,
  overrideAllocations: Array<{ warehouseId: string; allocated: number }>,
  warehouseStocks: WarehouseStock[]
): string | null {
  const stockMap = new Map(warehouseStocks.map(w => [w.warehouseId, w.available]));

  let totalAllocated = 0;
  for (const alloc of overrideAllocations) {
    const stock = stockMap.get(alloc.warehouseId) ?? 0;
    if (alloc.allocated > stock) {
      return `Warehouse ${alloc.warehouseId}: requested allocation (${alloc.allocated}) exceeds available stock (${stock})`;
    }
    totalAllocated += alloc.allocated;
  }

  if (totalAllocated > requestedQuantity) {
    return `Total override allocation (${totalAllocated}) exceeds requested quantity (${requestedQuantity})`;
  }

  return null; // valid
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
