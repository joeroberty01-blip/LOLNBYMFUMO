"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  MAX_PART_PHOTO_BYTES,
  ALLOWED_PART_PHOTO_TYPES,
  sniffPartPhotoType,
} from "@/lib/validators/partPhotos";
import {
  getPartsWithoutPhoto,
  countPartsWithoutPhoto,
  type PartPhotoQueueItem,
} from "@/lib/data/parts";

type ActionResult = { success: true } | { success: false; error: string };

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Huna ruhusa ya kufanya hili");
  }
  return session;
}

export async function uploadPartPhoto(formData: FormData): Promise<ActionResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const partId = formData.get("partId");
  if (typeof partId !== "string" || !partId) {
    return { success: false, error: "Part haijatambuliwa" };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Chagua picha" };
  }
  if (file.size > MAX_PART_PHOTO_BYTES) {
    return {
      success: false,
      error: `Picha ni kubwa mno (${(file.size / 1024 / 1024).toFixed(1)} MB). Kikomo ni 4 MB.`,
    };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  // The declared MIME type is browser-supplied, so the real format is read from the bytes.
  const actualType = sniffPartPhotoType(bytes);
  if (!actualType) {
    return {
      success: false,
      error: `Aina ya faili hairuhusiwi. Tumia ${ALLOWED_PART_PHOTO_TYPES.join(", ")}.`,
    };
  }

  const part = await prisma.part.findUnique({ where: { id: partId }, select: { id: true, name: true } });
  if (!part) return { success: false, error: "Part hii haipo" };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.partPhoto.upsert({
        where: { partId },
        update: { mimeType: actualType, sizeBytes: bytes.byteLength, data: Buffer.from(bytes) },
        create: {
          partId,
          mimeType: actualType,
          sizeBytes: bytes.byteLength,
          data: Buffer.from(bytes),
        },
      });

      await logAudit(tx, {
        userId: session.user.id,
        action: "PART_PHOTO_UPLOADED",
        entityType: "Part",
        entityId: partId,
        metadata: { partName: part.name, sizeBytes: bytes.byteLength, mimeType: actualType },
      });
    });
  } catch (e) {
    return { success: false, error: (e as Error).message || "Imeshindikana kupakia picha" };
  }

  revalidatePath(`/dashboard/admin/parts/${partId}/edit`);
  revalidatePath("/dashboard/admin/parts");
  revalidatePath("/dashboard/admin/parts/photo-queue");
  revalidatePath("/dashboard/sales/inventory");
  return { success: true };
}

export async function deletePartPhoto(partId: string): Promise<ActionResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const existing = await prisma.partPhoto.findUnique({
    where: { partId },
    select: { id: true, part: { select: { name: true } } },
  });
  if (!existing) return { success: false, error: "Part hii haina picha" };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.partPhoto.delete({ where: { partId } });
      await logAudit(tx, {
        userId: session.user.id,
        action: "PART_PHOTO_DELETED",
        entityType: "Part",
        entityId: partId,
        metadata: { partName: existing.part.name },
      });
    });
  } catch (e) {
    return { success: false, error: (e as Error).message || "Imeshindikana kufuta picha" };
  }

  revalidatePath(`/dashboard/admin/parts/${partId}/edit`);
  revalidatePath("/dashboard/admin/parts");
  revalidatePath("/dashboard/sales/inventory");
  return { success: true };
}

type PhotoQueueBatchResult =
  | { success: true; items: PartPhotoQueueItem[] }
  | { success: false; error: string };

/** Next batch for the Photo Queue page — pass the last item's id from the previous batch as
 * `cursorId` to continue; omit it to start from the beginning. */
export async function getPhotoQueueBatch(cursorId?: string): Promise<PhotoQueueBatchResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  const items = await getPartsWithoutPhoto(cursorId);
  return { success: true, items };
}

export async function getPhotoQueueCount(): Promise<number> {
  await requireAdmin();
  return countPartsWithoutPhoto();
}
