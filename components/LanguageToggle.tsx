import type { Language } from "@/lib/translations";
import { t } from "@/lib/translations";

type Props = {
  language: Language;
  onToggle: () => void;
};

export function LanguageToggle({ language, onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-tvDark shadow-sm transition hover:border-tvBlue hover:text-tvBlue"
      aria-label="Toggle language"
    >
      {t[language].langSwitch}
    </button>
  );
}
