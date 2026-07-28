"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import {
  settingsSchema,
  type SettingsInput,
} from "@/lib/validators/settings";
import {
  LANGUAGE_COOKIE,
  THEME_COOKIE,
  FONT_SIZE_COOKIE,
  COOKIE_MAX_AGE,
} from "@/lib/settings/preferences";

type ActionResult = { success: true } | { success: false; error: string };

export async function updateSettings(input: SettingsInput): Promise<ActionResult> {
  const session = await auth();
  if (!session) {
    return { success: false, error: "Not signed in" };
  }

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const { language, theme, fontSize } = parsed.data;
  const store = await cookies();
  store.set(LANGUAGE_COOKIE, language, { maxAge: COOKIE_MAX_AGE, path: "/" });
  store.set(THEME_COOKIE, theme, { maxAge: COOKIE_MAX_AGE, path: "/" });
  store.set(FONT_SIZE_COOKIE, fontSize, { maxAge: COOKIE_MAX_AGE, path: "/" });

  revalidatePath("/", "layout");

  return { success: true };
}
