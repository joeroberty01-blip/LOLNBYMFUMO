import "server-only";
import { getPreferences } from "@/lib/settings/preferences";
import { getDictionary, type Dictionary, type Language } from "./dictionaries";

export async function getServerDictionary(): Promise<{ t: Dictionary; language: Language }> {
  const { language } = await getPreferences();
  return { t: getDictionary(language), language };
}
