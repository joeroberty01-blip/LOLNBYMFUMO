type Props = {
  action: string;
  categories: string[];
  q?: string;
  category?: string;
};

export function PartsFilterBar({ action, categories, q, category }: Props) {
  return (
    <form action={action} method="GET" className="flex flex-wrap gap-2 mb-6">
      <input
        type="text"
        name="q"
        placeholder="Tafuta kwa jina au part number..."
        defaultValue={q}
        className="flex-1 min-w-[200px] rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
      />
      <select
        name="category"
        defaultValue={category ?? ""}
        className="rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
      >
        <option value="">Categories zote</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-md border border-black/15 dark:border-white/20 px-4 py-2 text-sm"
      >
        Tafuta
      </button>
    </form>
  );
}
