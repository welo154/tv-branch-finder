"use client";

import { useEffect, useState } from "react";
import type { Branch } from "@/data/branches";
import { buildMapsUrl, parseCoordsFromMapsUrl } from "@/lib/maps-utils";
import { adminAuthHeaders } from "@/lib/admin-auth";

const AUTH_KEY = "tv-admin-password";

type FormState = Omit<Branch, "id"> & { id: number | null };

const emptyForm = (): FormState => ({
  id: null,
  nameEn: "",
  nameAr: "",
  addressEn: "",
  addressAr: "",
  cityEn: "Cairo",
  cityAr: "القاهرة",
  areaEn: "",
  areaAr: "",
  phone: [],
  email: "",
  latitude: null,
  longitude: null,
  mapsUrl: "",
  keywords: [],
});

function branchToForm(branch: Branch): FormState {
  return { ...branch };
}

function parseList(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatList(values: string[]): string {
  return values.join(", ");
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [storedPassword, setStoredPassword] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [phonesText, setPhonesText] = useState("");
  const [keywordsText, setKeywordsText] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem(AUTH_KEY)?.trim();
    if (!saved) return;

    fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: saved }),
    })
      .then((response) => response.json())
      .then((data: { valid: boolean }) => {
        if (data.valid) {
          setStoredPassword(saved);
          return;
        }
        sessionStorage.removeItem(AUTH_KEY);
        setError("Session expired. Sign in again.");
      })
      .catch(() => {
        sessionStorage.removeItem(AUTH_KEY);
      });
  }, []);

  useEffect(() => {
    if (!storedPassword) {
      setLoading(false);
      return;
    }

    loadBranches(storedPassword);
  }, [storedPassword]);

  useEffect(() => {
    if (selectedId === null) return;

    const branch = branches.find((item) => item.id === selectedId);
    if (!branch) return;

    setForm(branchToForm(branch));
    setPhonesText(formatList(branch.phone));
    setKeywordsText(formatList(branch.keywords));
  }, [selectedId]);

  async function loadBranches(adminPassword: string) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/branches", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load branches.");
      const data = (await response.json()) as Branch[];
      setBranches(data);
      setSelectedId((current) => (current !== null && data.some((branch) => branch.id === current) ? current : data[0]?.id ?? null));
      void adminPassword;
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load branches.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      const response = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });
      const data = (await response.json()) as { valid: boolean };

      if (!data.valid) {
        setError("Wrong password. On the live site, use the ADMIN_PASSWORD set in Vercel (or tv-admin if none is set).");
        return;
      }

      const trimmed = password.trim();
      sessionStorage.setItem(AUTH_KEY, trimmed);
      setStoredPassword(trimmed);
      setStatus("Signed in.");
    } catch {
      setError("Could not verify password.");
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    sessionStorage.removeItem(AUTH_KEY);
    setStoredPassword(null);
    setPassword("");
    setBranches([]);
    setSelectedId(null);
    setStatus("Signed out.");
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function buildPayload(): Branch {
    return {
      id: form.id ?? 0,
      nameEn: form.nameEn.trim(),
      nameAr: form.nameAr.trim(),
      addressEn: form.addressEn.trim(),
      addressAr: form.addressAr.trim(),
      cityEn: form.cityEn.trim(),
      cityAr: form.cityAr.trim(),
      areaEn: form.areaEn.trim(),
      areaAr: form.areaAr.trim(),
      phone: parseList(phonesText),
      email: form.email?.trim() || "",
      latitude: form.latitude,
      longitude: form.longitude,
      mapsUrl: form.mapsUrl.trim(),
      keywords: parseList(keywordsText),
    };
  }

  async function handleSave() {
    if (!storedPassword) return;

    setSaving(true);
    setError("");
    setStatus("");

    try {
      const payload = buildPayload();
      const isNew = form.id === null;
      const url = isNew ? "/api/branches" : `/api/branches/${form.id}`;
      const method = isNew ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...adminAuthHeaders(storedPassword),
        },
        body: JSON.stringify({ ...payload, adminPassword: storedPassword.trim() }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error || "Save failed.");
      }

      const saved = (await response.json()) as Branch;
      setBranches((current) => {
        const next = current.filter((branch) => branch.id !== saved.id);
        next.push(saved);
        return next.sort((a, b) => a.id - b.id);
      });
      setSelectedId(saved.id);
      setForm(branchToForm(saved));
      setPhonesText(formatList(saved.phone));
      setKeywordsText(formatList(saved.keywords));
      setStatus(isNew ? "Branch created." : "Branch saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!storedPassword || form.id === null) return;
    if (!window.confirm(`Delete branch #${form.id}?`)) return;

    setSaving(true);
    setError("");
    setStatus("");

    try {
      const response = await fetch(`/api/branches/${form.id}`, {
        method: "DELETE",
        headers: adminAuthHeaders(storedPassword),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error || "Delete failed.");
      }

      const nextBranches = (await response.json()) as Branch[];
      setBranches(nextBranches);
      setSelectedId(nextBranches[0]?.id ?? null);
      setStatus("Branch deleted.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Delete failed.");
    } finally {
      setSaving(false);
    }
  }

  function handleNewBranch() {
    setSelectedId(null);
    setForm(emptyForm());
    setPhonesText("");
    setKeywordsText("");
    setStatus("Creating new branch.");
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not available in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateForm("latitude", position.coords.latitude);
        updateForm("longitude", position.coords.longitude);
        updateForm("mapsUrl", buildMapsUrl(position.coords.latitude, position.coords.longitude));
        setStatus("Coordinates updated from your current location.");
        setError("");
      },
      () => setError("Could not get your location."),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  }

  function handleParseCoordsFromUrl() {
    const coords = parseCoordsFromMapsUrl(form.mapsUrl);
    if (!coords) {
      setError("Could not read coordinates from the maps URL.");
      return;
    }

    updateForm("latitude", coords.latitude);
    updateForm("longitude", coords.longitude);
    setStatus("Coordinates extracted from maps URL.");
    setError("");
  }

  function handleBuildMapsUrl() {
    if (form.latitude === null || form.longitude === null) {
      setError("Set latitude and longitude first.");
      return;
    }

    updateForm("mapsUrl", buildMapsUrl(form.latitude, form.longitude));
    setStatus("Maps URL generated from coordinates.");
    setError("");
  }

  if (!storedPassword) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0f1e] px-5">
        <form onSubmit={handleLogin} className="w-full max-w-md rounded-2xl border border-[#2d3a55] bg-[#111827] p-8 shadow-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6b9aff]">Admin</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">Branch dashboard</h1>
          <p className="mt-2 text-sm text-[#6b7a9a]">Sign in to edit branch coordinates and details.</p>

          <label className="mt-6 block text-sm font-medium text-[#a0aec0]">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#2d3a55] bg-[#0a0f1e] px-4 py-3 text-white outline-none focus:border-[#2563eb]"
              placeholder="Default: tv-admin"
              required
            />
          </label>

          {error && <p className="mt-4 text-sm font-medium text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="mt-6 w-full rounded-xl bg-[#2563eb] px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
          >
            {saving ? "Checking..." : "Sign in"}
          </button>

          <a href="/" className="mt-4 block text-center text-sm font-medium text-[#6b9aff] hover:underline">
            Back to branch finder
          </a>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f9fb] text-slate-950">
      <header className="border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#2563eb]">Admin dashboard</p>
            <h1 className="text-2xl font-semibold text-slate-950">Edit branches</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-700">
              View site
            </a>
            <button type="button" onClick={handleNewBranch} className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100">
              New branch
            </button>
            <button type="button" onClick={handleLogout} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-red-300 hover:text-red-600">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[320px_1fr] sm:px-8">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-500">Branches ({branches.length})</h2>
          {loading ? (
            <p className="mt-4 text-sm text-slate-500">Loading...</p>
          ) : (
            <div className="mt-4 max-h-[70vh] space-y-2 overflow-y-auto">
              {branches.map((branch) => (
                <button
                  key={branch.id}
                  type="button"
                  onClick={() => setSelectedId(branch.id)}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                    selectedId === branch.id
                      ? "border-blue-300 bg-blue-50"
                      : "border-slate-200 bg-white hover:border-blue-200"
                  }`}
                >
                  <div className="text-xs font-semibold text-blue-600">#{branch.id}</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{branch.nameEn}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {branch.areaEn} · {branch.cityEn}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    {branch.latitude !== null && branch.longitude !== null
                      ? `${branch.latitude.toFixed(5)}, ${branch.longitude.toFixed(5)}`
                      : "No coordinates"}
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-slate-950">
              {form.id === null ? "New branch" : `Edit branch #${form.id}`}
            </h2>
            {status && <p className="text-sm font-medium text-green-600">{status}</p>}
          </div>
          {error && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field label="Name (English)" value={form.nameEn} onChange={(value) => updateForm("nameEn", value)} />
            <Field label="Name (Arabic)" value={form.nameAr} onChange={(value) => updateForm("nameAr", value)} dir="rtl" />
            <Field label="Address (English)" value={form.addressEn} onChange={(value) => updateForm("addressEn", value)} />
            <Field label="Address (Arabic)" value={form.addressAr} onChange={(value) => updateForm("addressAr", value)} dir="rtl" />
            <Field label="City (English)" value={form.cityEn} onChange={(value) => updateForm("cityEn", value)} />
            <Field label="City (Arabic)" value={form.cityAr} onChange={(value) => updateForm("cityAr", value)} dir="rtl" />
            <Field label="Area (English)" value={form.areaEn} onChange={(value) => updateForm("areaEn", value)} />
            <Field label="Area (Arabic)" value={form.areaAr} onChange={(value) => updateForm("areaAr", value)} dir="rtl" />
            <Field label="Email" value={form.email || ""} onChange={(value) => updateForm("email", value)} />
            <Field label="Maps URL" value={form.mapsUrl} onChange={(value) => updateForm("mapsUrl", value)} className="md:col-span-2" />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Phone numbers
              <textarea
                value={phonesText}
                onChange={(event) => setPhonesText(event.target.value)}
                rows={3}
                placeholder="0226199600, 01099305585"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-400"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Keywords
              <textarea
                value={keywordsText}
                onChange={(event) => setKeywordsText(event.target.value)}
                rows={3}
                placeholder="new cairo, التجمع الخامس, al hamad mall"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-400"
              />
            </label>
          </div>

          <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-semibold text-blue-800">Coordinates</h3>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={handleUseMyLocation} className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">
                  Use my location
                </button>
                <button type="button" onClick={handleParseCoordsFromUrl} className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">
                  Parse from maps URL
                </button>
                <button type="button" onClick={handleBuildMapsUrl} className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">
                  Build maps URL
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Latitude
                <input
                  type="number"
                  step="any"
                  value={form.latitude ?? ""}
                  onChange={(event) => updateForm("latitude", event.target.value === "" ? null : Number(event.target.value))}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-400"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Longitude
                <input
                  type="number"
                  step="any"
                  value={form.longitude ?? ""}
                  onChange={(event) => updateForm("longitude", event.target.value === "" ? null : Number(event.target.value))}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-400"
                />
              </label>
            </div>

            {form.latitude !== null && form.longitude !== null && (
              <a
                href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}&z=17`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex text-sm font-semibold text-blue-700 hover:underline"
              >
                Preview on Google Maps
              </a>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
            >
              {saving ? "Saving..." : form.id === null ? "Create branch" : "Save changes"}
            </button>
            {form.id !== null && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
              >
                Delete branch
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  dir,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  dir?: "rtl";
  className?: string;
}) {
  return (
    <label className={`block text-sm font-medium text-slate-700 ${className}`}>
      {label}
      <input
        dir={dir}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-400"
      />
    </label>
  );
}
