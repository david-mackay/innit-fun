import { NextRequest, NextResponse } from "next/server";
import { and, eq, or } from "drizzle-orm";

import { requireAuthenticatedUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { friendships, invites, users } from "@/server/db/schema";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    const invite = await db.query.invites.findFirst({
      where: eq(invites.code, code),
      with: {
        creator: true,
      },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    if (invite.status !== "active") {
      return NextResponse.json(
        { error: "Invite is no longer active" },
        { status: 410 }
      );
    }

    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "Invite has expired" },
        { status: 410 }
      );
    }

    // Return limited creator info
    const { id, displayName, avatarUrl, bio } = invite.creator;

    return NextResponse.json({
      invite: {
        code: invite.code,
        expiresAt: invite.expiresAt,
        creator: { id, displayName, avatarUrl, bio },
      },
    });
  } catch (error) {
    console.error("/api/invites/[code] GET error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const user = await requireAuthenticatedUser();
    const { code } = await params;

    const invite = await db.query.invites.findFirst({
      where: eq(invites.code, code),
    });

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    if (invite.status !== "active") {
      return NextResponse.json(
        { error: "Invite is no longer active" },
        { status: 410 }
      );
    }

    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "Invite has expired" },
        { status: 410 }
      );
    }

    if (invite.creatorId === user.id) {
      return NextResponse.json(
        { error: "Cannot accept your own invite" },
        { status: 400 }
      );
    }

    // Check if friendship already exists
    const existingFriendship = await db.query.friendships.findFirst({
      where: or(
        and(
          eq(friendships.userId1, user.id),
          eq(friendships.userId2, invite.creatorId)
        ),
        and(
          eq(friendships.userId1, invite.creatorId),
          eq(friendships.userId2, user.id)
        )
      ),
    });

    if (existingFriendship) {
      return NextResponse.json({ message: "Already friends" }, { status: 200 });
    }

    // Create friendship
    await db.insert(friendships).values({
      userId1: user.id,
      userId2: invite.creatorId,
      status: "accepted", // Auto-accept via invite code
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    console.error("/api/invites/[code] POST error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const user = await requireAuthenticatedUser();
    const { code } = await params;

    const invite = await db.query.invites.findFirst({
      where: eq(invites.code, code),
    });

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    if (invite.creatorId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await db
      .update(invites)
      .set({ status: "used" }) // Or 'inactive' but schema says 'active', 'used'. Let's use 'used' or add 'inactive' to schema logic if needed. 'used' stops it from being shown.
      .where(eq(invites.id, invite.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    console.error("/api/invites/[code] DELETE error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
