"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Branch } from "@/data/branches";
import { isValidEgyptCoordinate } from "@/lib/branch-location";
import { branchesSortedByDistance, formatDistance, formatDriveTime, type BranchWithDistance } from "@/lib/distance";
import { t, type Language } from "@/lib/translations";

type LocationState = {
  label: string;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
} | null;

const cityFilters = ["all", "Cairo", "Giza", "Alexandria", "Tanta", "Gharbia", "Kafr El Sheikh"] as const;

const cityLabels: Record<(typeof cityFilters)[number], { en: string; ar: string }> = {
  all: { en: "All cities", ar: "كل المدن" },
  Cairo: { en: "Cairo", ar: "القاهرة" },
  Giza: { en: "Giza", ar: "الجيزة" },
  Alexandria: { en: "Alexandria", ar: "الإسكندرية" },
  Tanta: { en: "Tanta", ar: "طنطا" },
  Gharbia: { en: "Gharbia", ar: "الغربية" },
  "Kafr El Sheikh": { en: "Kafr El Sheikh", ar: "كفر الشيخ" },
};

type BranchFinderProps = {
  initialBranches: Branch[];
};

export default function BranchFinder({ initialBranches }: BranchFinderProps) {
  const [language, setLanguage] = useState<Language>("ar");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCity, setActiveCity] = useState<(typeof cityFilters)[number]>("all");
  const [branchList, setBranchList] = useState<Branch[]>(initialBranches);
  const [sortedBranches, setSortedBranches] = useState<BranchWithDistance[]>(initialBranches);
  const [location, setLocation] = useState<LocationState>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [message, setMessage] = useState("");

  const branchListRef = useRef<Branch[]>([]);
  const isArabic = language === "ar";

  useEffect(() => {
    branchListRef.current = branchList;
  }, [branchList]);

  useEffect(() => {
    fetch("/api/branches", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Could not refresh branches.");
        return response.json() as Promise<Branch[]>;
      })
      .then((branches) => {
        setBranchList(branches);
        setSortedBranches(branches);
      })
      .catch(() => {
        // Keep server-rendered initialBranches if refresh fails.
      });
  }, []);

  const nearestBranches = useMemo(() => {
    if (!location) return [];
    return sortedBranches.slice(0, 2);
  }, [location, sortedBranches]);

  const filteredBranches = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return sortedBranches.filter((branch) => {
      const cityMatch = activeCity === "all" || branch.cityEn === activeCity;
      if (!cityMatch) return false;

      if (!query) return true;

      const searchableText = [
        branch.nameEn,
        branch.nameAr,
        branch.addressEn,
        branch.addressAr,
        branch.cityEn,
        branch.cityAr,
        branch.areaEn,
        branch.areaAr,
        ...branch.keywords,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [activeCity, searchQuery, sortedBranches]);

  function toggleLanguage() {
    setLanguage((current) => (current === "en" ? "ar" : "en"));
  }

  function handleFindNearest() {
    if (!navigator.geolocation) {
      setStatus("error");
      setMessage(t[language].locationUnavailable);
      return;
    }

    if (!branchListRef.current.length) {
      setStatus("error");
      setMessage(t[language].locationUnavailable);
      return;
    }

    setStatus("loading");
    setMessage(t[language].locating);

    let watchId: number | undefined;
    let bestPosition: GeolocationPosition | null = null;
    let settled = false;
    const startedAt = Date.now();

    const finish = (position: GeolocationPosition) => {
      if (settled) return;

      const { latitude, longitude, accuracy } = position.coords;
      if (!isValidEgyptCoordinate(latitude, longitude)) {
        settled = true;
        if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
        setStatus("error");
        setMessage(t[language].locationUnavailable);
        return;
      }

      const elapsed = Date.now() - startedAt;
      const hasGoodAccuracy = accuracy <= 80;
      const waitedLongEnough = elapsed >= 12000;

      if (!hasGoodAccuracy && !waitedLongEnough) {
        return;
      }

      settled = true;
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
        watchId = undefined;
      }

      const userLocation = { latitude, longitude };
      const sorted = branchesSortedByDistance(branchListRef.current, userLocation);
      setSortedBranches(sorted);
      setLocation({
        ...userLocation,
        accuracyMeters: accuracy,
        label: isArabic ? "موقعك الحالي" : "Your current location",
      });
      setActiveCity("all");
      setSearchQuery("");
      setStatus("success");
      setMessage(
        accuracy > 500
          ? t[language].locationLowAccuracy
          : t[language].locationDetected
      );
    };

    const onError = (error: GeolocationPositionError) => {
      if (settled) return;
      if (bestPosition) {
        finish(bestPosition);
        return;
      }
      settled = true;
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
        watchId = undefined;
      }
      setStatus("error");
      setMessage(error.code === error.PERMISSION_DENIED ? t[language].locationBlocked : t[language].locationUnavailable);
    };

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (!bestPosition || position.coords.accuracy < bestPosition.coords.accuracy) {
          bestPosition = position;
        }
        finish(position);
      },
      onError,
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
    );

    window.setTimeout(() => {
      if (bestPosition) {
        finish(bestPosition);
      } else if (!settled) {
        settled = true;
        if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
        setStatus("error");
        setMessage(t[language].locationUnavailable);
      }
    }, 15000);
  }

  function handleBrowseAll() {
    setSearchQuery("");
    setActiveCity("all");
    document.getElementById("all-branches")?.scrollIntoView({ behavior: "smooth" });
  }

  function handleClearLocation() {
    setLocation(null);
    setSortedBranches(branchList);
    setStatus("idle");
    setMessage("");
  }

  const dir = isArabic ? "rtl" : "ltr";

  return (
    <main dir={dir} className="min-h-screen bg-[#f8f9fb] text-slate-950">
      <Navigation language={language} isArabic={isArabic} onToggleLanguage={toggleLanguage} />

      <section className="relative overflow-hidden bg-[#0a0f1e] px-5 pb-20 pt-14 text-center sm:px-8 sm:pt-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_100%,rgba(37,99,235,0.20)_0%,transparent_70%)]" />
        <div className="pointer-events-none absolute left-1/2 top-8 h-56 w-56 -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-4xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#2d3a55] bg-[#1a2540] px-4 py-2 text-xs font-semibold text-[#6b9aff]">
            <span>⌖</span>
            {t[language].branchLocator}
          </div>

          <h1 className="mx-auto max-w-3xl text-4xl font-semibold leading-tight tracking-[-0.03em] text-white sm:text-6xl">
            {isArabic ? (
              <>
                اعرف أقرب فرع<br />
                <span className="text-[#2563eb]">لتكنولوجي فالي</span>
              </>
            ) : (
              <>
                Find your nearest<br />
                <span className="text-[#2563eb]">Technology Valley</span> branch
              </>
            )}
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm font-medium leading-7 text-[#6b7a9a] sm:text-base">
            {t[language].heroSubtitle}
          </p>

          <div className="mx-auto mt-8 flex max-w-2xl items-center gap-2 rounded-xl border border-[#2d3a55] bg-[#111827] p-2 ps-4 shadow-2xl shadow-black/20">
            <span className="shrink-0 text-lg text-[#4b5a7a]">⌕</span>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t[language].searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-white outline-none placeholder:text-[#4b5a7a]"
            />
            <button
              type="button"
              onClick={() => document.getElementById("all-branches")?.scrollIntoView({ behavior: "smooth" })}
              className="rounded-lg bg-[#2563eb] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-500 sm:text-sm"
            >
              {t[language].search}
            </button>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={handleFindNearest}
              disabled={status === "loading"}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-950/40 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span>◎</span>
              {status === "loading" ? t[language].locating : t[language].findNearest}
            </button>
            <button
              type="button"
              onClick={handleBrowseAll}
              className="inline-flex items-center gap-2 rounded-xl border border-[#2d3a55] bg-transparent px-6 py-3 text-sm font-semibold text-[#a0aec0] transition hover:border-blue-400 hover:text-white"
            >
              <span>☰</span>
              {t[language].browseAll}
            </button>
          </div>
        </div>
      </section>

      {message && (
        <div className={status === "error" ? "border-b border-red-200 bg-red-50 px-5 py-3" : "border-b border-[#1a4a2a] bg-[#0d2a1a] px-5 py-3"}>
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 text-sm font-semibold">
            <div className="flex items-center gap-2">
              <span className={status === "error" ? "text-red-600" : "text-[#22c55e]"}>{status === "error" ? "!" : "✓"}</span>
              <span className={status === "error" ? "text-red-700" : "text-[#4ade80]"}>{message}</span>
            </div>
            {location && (
              <button type="button" onClick={handleClearLocation} className="text-xs font-bold text-[#86efac] underline underline-offset-4">
                {t[language].reset}
              </button>
            )}
          </div>
        </div>
      )}

      {location && (
        <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
          <SectionHeader
            icon="★"
            title={t[language].nearestTitle}
            badge={t[language].twoFound}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {nearestBranches.map((branch, index) => (
              <BranchCard key={branch.id} branch={branch} language={language} nearest={index === 0} />
            ))}
          </div>
        </section>
      )}

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <hr className="border-slate-200" />
      </div>

      <section id="all-branches" className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <SectionHeader icon="▣" title={t[language].allBranches} />
          <a
            href="https://www.google.com/maps/search/Technology+Valley+Egypt"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-[#2563eb] hover:underline"
          >
            {t[language].seeMapView}
          </a>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {cityFilters.map((city) => {
            const label = isArabic ? cityLabels[city].ar : cityLabels[city].en;
            return (
              <button
                key={city}
                type="button"
                onClick={() => setActiveCity(city)}
                className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                  activeCity === city
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:text-blue-700"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          {filteredBranches.length ? (
            filteredBranches.map((branch) => <BranchListItem key={branch.id} branch={branch} language={language} />)
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
              {t[language].noResults}
            </div>
          )}
        </div>
      </section>

      <footer className="mt-8 bg-[#0a0f1e] px-5 py-7 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-xs font-medium text-[#4b5a7a] sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Technology Valley. {t[language].rights}</p>
          <div className="flex gap-6">
            <a className="hover:text-[#6b9aff]" href="tel:15100">{t[language].contact}</a>
            <a className="hover:text-[#6b9aff]" href="#all-branches">{t[language].branches}</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Navigation({ language, isArabic, onToggleLanguage }: { language: Language; isArabic: boolean; onToggleLanguage: () => void }) {
  return (
    <nav className="flex h-20 items-center justify-between bg-[#0a0f1e] px-5 sm:px-8">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5">
          <img src="/tv-logo.png" alt="Technology Valley" width={48} height={48} loading="eager" decoding="async" className="h-full w-full object-contain" />
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight text-white sm:text-base">Technology Valley</div>
          <div className="text-[10px] font-medium uppercase tracking-wide text-[#6b7a9a] sm:text-xs">Technology That Changes Your Life</div>
        </div>
      </div>

      <button
        type="button"
        onClick={onToggleLanguage}
        className="flex items-center gap-2 rounded-xl border border-[#2d3a55] px-4 py-2 text-xs font-semibold text-[#a0aec0] transition hover:border-[#2563eb] hover:text-white sm:text-sm"
        aria-label="Toggle language"
      >
        <span className={!isArabic ? "text-white" : ""}>EN</span>
        <span className="text-[#2d3a55]">|</span>
        <span className={isArabic ? "text-white" : ""}>عربي</span>
      </button>
    </nav>
  );
}

function SectionHeader({ icon, title, badge }: { icon: string; title: string; badge?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-lg text-[#2563eb]">{icon}</span>
      <h2 className="text-base font-semibold text-slate-950 sm:text-lg">{title}</h2>
      {badge && <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700">{badge}</span>}
    </div>
  );
}

function BranchCard({ branch, language, nearest }: { branch: BranchWithDistance; language: Language; nearest?: boolean }) {
  const isArabic = language === "ar";
  const branchText = getBranchText(branch, language);

  return (
    <article className={`relative rounded-2xl border bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,0.06)] ${nearest ? "border-blue-300 ring-1 ring-blue-100" : "border-slate-200"}`}>
      {nearest && (
        <div className={`absolute top-0 rounded-b-md bg-[#2563eb] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white ${isArabic ? "right-4" : "left-4"}`}>
          {t[language].nearest}
        </div>
      )}

      <div className="mt-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-950 sm:text-base">{branchText.name}</h3>
          <p className="mt-1 text-xs font-medium text-slate-500">{branchText.area} · {branchText.city}</p>
        </div>
        {branch.distanceKm !== undefined && (
          <div className="shrink-0 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            {formatDistance(branch.distanceKm, language)}
          </div>
        )}
      </div>

      <InfoLine icon="⌖" text={branchText.address} />
      {branch.phone.length > 0 && <InfoLine icon="☎" text={branch.phone.join(" · ")} />}
      {branch.email && <InfoLine icon="✉" text={branch.email} />}
      {branch.distanceKm !== undefined && <InfoLine icon="⌁" text={formatDriveTime(branch.distanceKm, language)} />}

      <div className="mt-4 flex gap-2">
        <a
          href={branch.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-500"
        >
          <span>↗</span>
          {t[language].openMaps}
        </a>
        {branch.phone.length > 0 && (
          <a
            href={`tel:${branch.phone[0]}`}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-blue-300 hover:text-blue-700"
          >
            <span>☎</span>
            {t[language].call}
          </a>
        )}
      </div>
    </article>
  );
}

function BranchListItem({ branch, language }: { branch: BranchWithDistance | Branch; language: Language }) {
  const branchText = getBranchText(branch, language);

  return (
    <article className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_8px_22px_rgba(15,23,42,0.035)] transition hover:border-blue-200">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-600">⌖</div>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-slate-950">{branchText.name}</h3>
        <p className="mt-1 truncate text-xs font-medium text-slate-500">{branchText.address}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        {"distanceKm" in branch && branch.distanceKm !== undefined && (
          <span className="text-[11px] font-semibold text-blue-600">{formatDistance(branch.distanceKm, language)}</span>
        )}
        <a
          href={branch.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-blue-200 px-3 py-1.5 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-50"
        >
          {t[language].directions}
        </a>
      </div>
    </article>
  );
}

function InfoLine({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="mt-3 flex items-start gap-2 text-xs font-medium leading-5 text-slate-600">
      <span className="mt-0.5 shrink-0 text-slate-400">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function getBranchText(branch: Branch, language: Language) {
  return {
    name: language === "ar" ? branch.nameAr : branch.nameEn,
    address: language === "ar" ? branch.addressAr : branch.addressEn,
    area: language === "ar" ? branch.areaAr : branch.areaEn,
    city: language === "ar" ? branch.cityAr : branch.cityEn,
  };
}

