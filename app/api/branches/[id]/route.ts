import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import type { Branch } from "@/data/branches";
import { isAuthorizedAdminRequest } from "@/lib/admin-auth";
import { deleteBranch, getBranchById, upsertBranch } from "@/lib/branches-store";

export const dynamic = "force-dynamic";

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
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid branch id." }, { status: 400 });
  }

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
    const { adminPassword: _adminPassword, ...branchBody } = body;
    const existing = await getBranchById(id);

    if (!existing) {
      return NextResponse.json({ error: "Branch not found." }, { status: 404 });
    }

    const branch: Branch = {
      ...existing,
      ...branchBody,
      id,
      nameEn: branchBody.nameEn?.trim() ?? existing.nameEn,
      nameAr: branchBody.nameAr?.trim() ?? existing.nameAr,
      addressEn: branchBody.addressEn?.trim() ?? existing.addressEn,
      addressAr: branchBody.addressAr?.trim() ?? existing.addressAr,
      cityEn: branchBody.cityEn?.trim() ?? existing.cityEn,
      cityAr: branchBody.cityAr?.trim() ?? existing.cityAr,
      areaEn: branchBody.areaEn?.trim() ?? existing.areaEn,
      areaAr: branchBody.areaAr?.trim() ?? existing.areaAr,
      phone: Array.isArray(branchBody.phone) ? branchBody.phone : existing.phone,
      email: branchBody.email?.trim() ?? existing.email,
      latitude: branchBody.latitude === undefined ? existing.latitude : branchBody.latitude,
      longitude: branchBody.longitude === undefined ? existing.longitude : branchBody.longitude,
      mapsUrl: branchBody.mapsUrl?.trim() ?? existing.mapsUrl,
      keywords: Array.isArray(branchBody.keywords) ? branchBody.keywords : existing.keywords,
    };

    await upsertBranch(branch);
    revalidateTag("branches");
    revalidatePath("/");
    return NextResponse.json(branch);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update branch.";
    return NextResponse.json({ error: message }, { status: 500 });
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
    revalidatePath("/");
    return NextResponse.json(branches);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete branch.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
