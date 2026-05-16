import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedContext } from "@/lib/api-auth";
import { isTeacher } from "@/lib/env";
import { db } from "@/lib/db";

/** GET — List all assignments */
export async function GET() {
  const ctx = await getAuthenticatedContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isTeacher(ctx.session.user.githubUsername)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const assignments = db.listAssignments();
  return NextResponse.json({ assignments });
}

/** POST — Create a new assignment definition */
export async function POST(request: NextRequest) {
  const ctx = await getAuthenticatedContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isTeacher(ctx.session.user.githubUsername)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { slug, title, description, templateRepo } = body;

  if (!slug || !title || !templateRepo) {
    return NextResponse.json(
      { error: "slug, title, and templateRepo are required" },
      { status: 400 }
    );
  }

  try {
    db.createAssignment({ slug, title, description, templateRepo });
    return NextResponse.json({ success: true, slug });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to create assignment";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
