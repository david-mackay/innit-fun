import { NextRequest, NextResponse } from "next/server";
import { and, eq, or } from "drizzle-orm";

import {
  requireAuthenticatedUser,
  resolveUserIdFromUrlId,
} from "@/server/auth/session";
import { db } from "@/server/db";
import { friendships, users } from "@/server/db/schema";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();

    // Fetch pending requests where I am the receiver (userId2)
    const pendingRequests = await db.query.friendships.findMany({
      where: and(
        eq(friendships.userId2, user.id),
        eq(friendships.status, "pending")
      ),
      with: {
        user1: {
          // Requester
          columns: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return NextResponse.json({ requests: pendingRequests });
  } catch (error) {
    console.error("/api/friends/request GET error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    const { targetUserId: urlTargetId } = await req.json();

    const targetUserId = await resolveUserIdFromUrlId(urlTargetId);
    if (!targetUserId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (targetUserId === user.id) {
      return NextResponse.json(
        { error: "Cannot add yourself" },
        { status: 400 }
      );
    }

    // Check existing
    const existing = await db.query.friendships.findFirst({
      where: or(
        and(
          eq(friendships.userId1, user.id),
          eq(friendships.userId2, targetUserId)
        ),
        and(
          eq(friendships.userId1, targetUserId),
          eq(friendships.userId2, user.id)
        )
      ),
    });

    if (existing) {
      if (existing.status === "pending") {
        return NextResponse.json(
          { error: "Request already pending" },
          { status: 400 }
        );
      }
      if (existing.status === "accepted") {
        return NextResponse.json({ error: "Already friends" }, { status: 400 });
      }
    }

    // Create request
    // We store: userId1 = Sender, userId2 = Receiver, status = pending
    await db.insert(friendships).values({
      userId1: user.id,
      userId2: targetUserId,
      status: "pending",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("/api/friends/request POST error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
