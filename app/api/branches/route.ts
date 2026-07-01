import { NextResponse } from "next/server";
import type { Branch } from "@/data/branches";
import { isAuthorizedAdminRequest } from "@/lib/admin-auth";
import { getBranches, getNextBranchId, invalidateBranchesCache, saveBranches } from "@/lib/branches-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const branches = await getBranches();
    return NextResponse.json(branches, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to load branches." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: Partial<Branch> & { adminPassword?: string };
  try {
    body = (await request.json()) as Partial<Branch> & { adminPassword?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isAuthorizedAdminRequest(request, body.adminPassword)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const branches = await getBranches();
    const branch: Branch = {
      id: body.id ?? getNextBranchId(branches),
      nameEn: body.nameEn?.trim() || "New Branch",
      nameAr: body.nameAr?.trim() || "فرع جديد",
      addressEn: body.addressEn?.trim() || "",
      addressAr: body.addressAr?.trim() || "",
      cityEn: body.cityEn?.trim() || "Cairo",
      cityAr: body.cityAr?.trim() || "القاهرة",
      areaEn: body.areaEn?.trim() || "",
      areaAr: body.areaAr?.trim() || "",
      phone: Array.isArray(body.phone) ? body.phone : [],
      email: body.email?.trim() || "",
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      mapsUrl: body.mapsUrl?.trim() || "",
      keywords: Array.isArray(body.keywords) ? body.keywords : [],
    };

    branches.push(branch);
    await saveBranches(branches);
    invalidateBranchesCache();
    return NextResponse.json(branch, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create branch.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
