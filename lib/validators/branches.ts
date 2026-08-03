import { z } from "zod";

export const storeSchema = z.object({
  name: z.string().trim().min(1, "Weka jina la store"),
  location: z.string().trim().min(1, "Weka location"),
  isSellingPoint: z.coerce.boolean(),
});
export type StoreInput = z.infer<typeof storeSchema>;

export const editStoreSchema = storeSchema.pick({ name: true, location: true });
export type EditStoreInput = z.infer<typeof editStoreSchema>;
