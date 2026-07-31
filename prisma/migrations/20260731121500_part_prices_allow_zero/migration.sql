-- Real supplier stock ledgers sometimes have no recorded Buying/Selling Price for a line (blank
-- cell in the source spreadsheet). The business wants the system to mirror the sheet exactly —
-- blank becomes 0 — rather than reject the whole part. Loosened from "> 0" to ">= 0" so a part
-- can be imported with a price of 0 and corrected later.
ALTER TABLE "Part" DROP CONSTRAINT "Part_costPrice_check";
ALTER TABLE "Part" DROP CONSTRAINT "Part_unitPrice_check";
ALTER TABLE "Part" ADD CONSTRAINT "Part_costPrice_check" CHECK ("costPrice" >= 0);
ALTER TABLE "Part" ADD CONSTRAINT "Part_unitPrice_check" CHECK ("unitPrice" >= 0);
