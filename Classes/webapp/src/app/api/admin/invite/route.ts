import { NextResponse } from "next/server";
import { getAuthenticatedContext } from "@/lib/api-auth";
import { isTeacher } from "@/lib/env";
import {
  inviteUserToOrg,
  listPendingInvitations,
  cancelInvitation,
} from "@/lib/github";

/** GET — List pending org invitations */
export async function GET() {
  const ctx = await getAuthenticatedContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { octokit, owner, session } = ctx;
  if (!isTeacher(session.user.githubUsername)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invitations = await listPendingInvitations(octokit, owner);
  return NextResponse.json({ invitations });
}

/** POST — Invite a student by GitHub username or email */
export async function POST(request: Request) {
  const ctx = await getAuthenticatedContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { octokit, owner, session } = ctx;
  if (!isTeacher(session.user.githubUsername)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { usernameOrEmail } = body as { usernameOrEmail?: string };

  if (!usernameOrEmail || !usernameOrEmail.trim()) {
    return NextResponse.json(
      { error: "A GitHub username or email is required." },
      { status: 400 }
    );
  }

  const result = await inviteUserToOrg(
    octokit,
    owner,
    usernameOrEmail.trim()
  );

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({ success: true });
}

/** DELETE — Cancel a pending invitation */
export async function DELETE(request: Request) {
  const ctx = await getAuthenticatedContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { octokit, owner, session } = ctx;
  if (!isTeacher(session.user.githubUsername)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { invitationId } = body as { invitationId?: number };

  if (!invitationId) {
    return NextResponse.json(
      { error: "Invitation ID is required." },
      { status: 400 }
    );
  }

  try {
    await cancelInvitation(octokit, owner, invitationId);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to cancel invitation" },
      { status: 500 }
    );
  }
}
