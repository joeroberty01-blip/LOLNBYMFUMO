# Mark migrations already present in Neon production as applied. Changes only _prisma_migrations.
# Verified read-only on 2026-11-25. Take a Neon snapshot first, and set DATABASE_URL to production.
$ErrorActionPreference = "Stop"
if (-not $env:DATABASE_URL) { throw "Weka DATABASE_URL kwanza" }
$migrations = @(
  "20261031120000_sale_notes",
  "20261031130000_customer_is_legacy_import",
  "20261103100000_part_generic_image_url",
  "20261103150000_customer_legacy_source",
  "20261104090000_manual_invoice",
  "20261105090000_manual_invoice_status",
  "20261105130000_manual_invoice_item_extra_fields",
  "20261105150000_manual_invoice_paid_delivered",
  "20261106080000_part_search_trgm_index",
  "20261111090000_manual_invoice_accepted"
)
foreach ($m in $migrations) {
  npx prisma migrate resolve --applied $m
  if ($LASTEXITCODE -ne 0) { throw "Imeshindwa: $m" }
}
npx prisma migrate status
