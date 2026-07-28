"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSettings } from "@/lib/actions/settings";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import type { Language, Theme, FontSize } from "@/lib/settings/preferences";
import { Select, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function SettingsForm({
  initialLanguage,
  initialTheme,
  initialFontSize,
}: {
  initialLanguage: Language;
  initialTheme: Theme;
  initialFontSize: FontSize;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [fontSize, setFontSize] = useState<FontSize>(initialFontSize);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(false);
    startTransition(async () => {
      const result = await updateSettings({ language, theme, fontSize });
      if (result.success) {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex max-w-md flex-col gap-6">
      <div>
        <Label>{t.settings.language}</Label>
        <Select value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
          <option value="en">{t.settings.languageEnglish}</option>
          <option value="sw">{t.settings.languageSwahili}</option>
        </Select>
      </div>

      <div>
        <Label>{t.settings.theme}</Label>
        <Select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
          <option value="light">{t.settings.themeLight}</option>
          <option value="dark">{t.settings.themeDark}</option>
          <option value="system">{t.settings.themeSystem}</option>
        </Select>
      </div>

      <div>
        <Label>{t.settings.fontSize}</Label>
        <Select value={fontSize} onChange={(e) => setFontSize(e.target.value as FontSize)}>
          <option value="sm">{t.settings.fontSizeSmall}</option>
          <option value="md">{t.settings.fontSizeMedium}</option>
          <option value="lg">{t.settings.fontSizeLarge}</option>
        </Select>
      </div>

      <div className="flex items-center gap-3">
        <Button type="button" variant="primary" onClick={handleSave} disabled={isPending}>
          {isPending ? t.common.saving : t.settings.saveButton}
        </Button>
        {saved && !isPending && <span className="text-sm text-success">{t.settings.savedMessage}</span>}
      </div>
    </div>
  );
}
