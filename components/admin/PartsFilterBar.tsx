import { getServerDictionary } from "@/lib/i18n/server";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type Props = {
  action: string;
  categories: string[];
  q?: string;
  category?: string;
};

export async function PartsFilterBar({ action, categories, q, category }: Props) {
  const { t } = await getServerDictionary();

  return (
    <form action={action} method="GET" className="mb-6 flex flex-wrap gap-2">
      <Input
        type="text"
        name="q"
        placeholder={t.adminCatalog.parts.searchPlaceholder}
        defaultValue={q}
        className="min-w-[200px] flex-1"
      />
      <Select name="category" defaultValue={category ?? ""} className="w-auto">
        <option value="">{t.adminCatalog.parts.allCategories}</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>
      <Button type="submit" variant="secondary">
        {t.common.search}
      </Button>
    </form>
  );
}
