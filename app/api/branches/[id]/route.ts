import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import type { Branch } from "@/data/branches";
import { isAuthorizedAdminRequest } from "@/lib/admin-auth";
import { deleteBranch, getBranchById, upsertBranch } from "@/lib/branches-store";

type RouteContext = { params: { id: string } };

export async function GET(_request: Request, { params }: RouteContext) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid branch id." }, { status: 400 });
  }

  try {
    const branch = await getBranchById(id);
    if (!branch) {
      return NextResponse.json({ error: "Branch not found." }, { status: 404 });
    }
    return NextResponse.json(branch);
  } catch {
    return NextResponse.json({ error: "Failed to load branch." }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  if (!isAuthorizedAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid branch id." }, { status: 400 });
  }

  try {
    const body = (await request.json()) as Partial<Branch>;
    const existing = await getBranchById(id);

    if (!existing) {
      return NextResponse.json({ error: "Branch not found." }, { status: 404 });
    }

    const branch: Branch = {
      ...existing,
      ...body,
      id,
      nameEn: body.nameEn?.trim() ?? existing.nameEn,
      nameAr: body.nameAr?.trim() ?? existing.nameAr,
      addressEn: body.addressEn?.trim() ?? existing.addressEn,
      addressAr: body.addressAr?.trim() ?? existing.addressAr,
      cityEn: body.cityEn?.trim() ?? existing.cityEn,
      cityAr: body.cityAr?.trim() ?? existing.cityAr,
      areaEn: body.areaEn?.trim() ?? existing.areaEn,
      areaAr: body.areaAr?.trim() ?? existing.areaAr,
      phone: Array.isArray(body.phone) ? body.phone : existing.phone,
      email: body.email?.trim() ?? existing.email,
      latitude: body.latitude === undefined ? existing.latitude : body.latitude,
      longitude: body.longitude === undefined ? existing.longitude : body.longitude,
      mapsUrl: body.mapsUrl?.trim() ?? existing.mapsUrl,
      keywords: Array.isArray(body.keywords) ? body.keywords : existing.keywords,
    };

    await upsertBranch(branch);
    revalidateTag("branches");
    return NextResponse.json(branch);
  } catch {
    return NextResponse.json({ error: "Failed to update branch." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  if (!isAuthorizedAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid branch id." }, { status: 400 });
  }

  try {
    const existing = await getBranchById(id);
    if (!existing) {
      return NextResponse.json({ error: "Branch not found." }, { status: 404 });
    }

    const branches = await deleteBranch(id);
    revalidateTag("branches");
    return NextResponse.json(branches);
  } catch {
    return NextResponse.json({ error: "Failed to delete branch." }, { status: 500 });
  }
}
