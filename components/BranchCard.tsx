import type { BranchWithDistance } from "@/lib/distance";
import { formatDistance } from "@/lib/distance";
import type { Language } from "@/lib/translations";
import { t } from "@/lib/translations";

type Props = {
  branch: BranchWithDistance;
  language: Language;
  featured?: boolean;
};

export function BranchCard({ branch, language, featured = false }: Props) {
  const name = language === "ar" ? branch.nameAr : branch.nameEn;
  const address = language === "ar" ? branch.addressAr : branch.addressEn;
  const area = language === "ar" ? branch.areaAr : branch.areaEn;
  const city = language === "ar" ? branch.cityAr : branch.cityEn;

  return (
    <article className={`group relative overflow-hidden rounded-[2rem] border bg-white p-5 shadow-card transition hover:-translate-y-1 hover:shadow-xl ${featured ? "border-tvBlue/40" : "border-slate-100"}`}>
      <div className="absolute -end-12 -top-12 h-32 w-32 rounded-full bg-blue-50 transition group-hover:bg-blue-100" />
      <div className="relative">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {featured && (
              <span className="mb-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-tvBlue">
                {t[language].recommended}
              </span>
            )}
            <h3 className="text-xl font-black leading-tight text-tvDark">{name}</h3>
            <p className="mt-1 text-sm font-semibold text-tvMuted">{area} · {city}</p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-tvBlue text-xl text-white shadow-lg shadow-blue-200">
            📍
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <InfoRow label={t[language].address} value={address} />
          {branch.distanceKm !== undefined && (
            <InfoRow label={t[language].distance} value={formatDistance(branch.distanceKm, language)} />
          )}
          {branch.phone.length > 0 && <InfoRow label={t[language].phone} value={branch.phone.join(" · ")} />}
          {branch.email && <InfoRow label="Email" value={branch.email} />}
        </div>

        <a
          href={branch.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-tvBlue px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-600"
        >
          {t[language].openMaps}
        </a>
      </div>
    </article>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xs font-black uppercase tracking-wide text-tvMuted">{label}</p>
      <p className="mt-1 font-bold text-tvDark">{value}</p>
    </div>
  );
}
