import { NextResponse } from "next/server";
import { isValidAdminPassword } from "@/lib/admin-auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { password?: string };
    const valid = isValidAdminPassword(body.password);
    return NextResponse.json({ valid });
  } catch {
    return NextResponse.json({ valid: false });
  }
}
