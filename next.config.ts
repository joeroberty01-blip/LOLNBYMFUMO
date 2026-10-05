import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Next's own default is 1 MB, well under what several Server Actions in this app already
    // validate for their own file uploads: part photos and supplier invoices (4 MB each —
    // lib/validators/partPhotos.ts, lib/validators/supplierInvoices.ts), bulk parts import
    // (10 MB — lib/actions/bulkUpload.ts), and — the binding constraint — full database backup
    // restore (30 MB — lib/actions/backupRestore.ts). Any of those uploads past 1 MB was
    // silently rejected at the framework level before the action's own code, and its own
    // Swahili error message, ever ran. Restoring a real backup of this database (2000+ parts
    // plus sales/customer/supplier history) would never have fit under the old 1 MB default.
    // 35mb covers the 30 MB ceiling with headroom for multipart boundary/header overhead, per
    // Next's own sizing guidance.
    serverActions: {
      bodySizeLimit: "35mb",
    },
  },
};

export default nextConfig;
