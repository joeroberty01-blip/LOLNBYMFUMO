-- Real supplier stock ledgers (see the "file" sheet in bulk-imported stock lists) can carry a
-- genuinely negative running balance for a part — e.g. sold ahead of a recorded restock. The
-- business wants that number preserved as-is rather than clamped to 0, so the non-negative
-- guard on Inventory.quantity is removed. (SaleItem/PurchaseItem quantity checks are unrelated
-- and unaffected — a transaction line item quantity must still be positive.)
ALTER TABLE "Inventory" DROP CONSTRAINT "Inventory_quantity_check";
