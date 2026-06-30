import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import type { Branch } from "@/data/branches";
import { isAuthorizedAdminRequest } from "@/lib/admin-auth";
import { getCachedBranches, getBranches, getNextBranchId, saveBranches } from "@/lib/branches-store";

export async function GET() {
  try {
    const branches = await getCachedBranches();
    return NextResponse.json(branches, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to load branches." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAuthorizedAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Partial<Branch>;
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
    revalidateTag("branches");
    return NextResponse.json(branch, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create branch." }, { status: 500 });
  }
}
