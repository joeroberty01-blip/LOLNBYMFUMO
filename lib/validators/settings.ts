import { z } from "zod";

export const settingsSchema = z.object({
  language: z.enum(["en", "sw"]),
  theme: z.enum(["light", "dark", "system"]),
  fontSize: z.enum(["sm", "md", "lg"]),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
