import Image from "next/image";
import type { Language } from "@/lib/translations";
import { t } from "@/lib/translations";
import { LanguageToggle } from "@/components/LanguageToggle";

type Props = {
  language: Language;
  onToggleLanguage: () => void;
};

export function Header({ language, onToggleLanguage }: Props) {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
      <div className="flex items-center gap-3">
        <div className="relative h-14 w-14 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 sm:h-16 sm:w-16">
          <Image src="/tv-logo.png" alt="Technology Valley logo" fill className="object-contain p-1" priority />
        </div>
        <div>
          <p className="text-base font-black tracking-tight text-tvDark sm:text-xl">Technology Valley</p>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-tvMuted sm:text-sm">{t[language].tagline}</p>
        </div>
      </div>
      <LanguageToggle language={language} onToggle={onToggleLanguage} />
    </header>
  );
}
