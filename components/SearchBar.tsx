import type { Language } from "@/lib/translations";
import { t } from "@/lib/translations";

type Props = {
  language: Language;
  value: string;
  onChange: (value: string) => void;
};

export function SearchBar({ language, value, onChange }: Props) {
  return (
    <div className="relative w-full">
      <span className="pointer-events-none absolute inset-y-0 start-4 flex items-center text-tvMuted">⌕</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t[language].searchPlaceholder}
        className="w-full rounded-3xl border border-slate-200 bg-white px-12 py-4 text-base font-medium text-tvDark shadow-sm outline-none transition placeholder:text-slate-400 focus:border-tvBlue focus:ring-4 focus:ring-blue-100"
      />
    </div>
  );
}
