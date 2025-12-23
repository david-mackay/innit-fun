import { NextRequest, NextResponse } from "next/server";
import { and, eq, or } from "drizzle-orm";

import {
  requireAuthenticatedUser,
  resolveUserIdFromUrlId,
} from "@/server/auth/session";
import { db } from "@/server/db";
import { friendships } from "@/server/db/schema";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    const { targetUserId: urlTargetId, action } = await req.json(); // action: 'accept' or 'reject'

    const targetUserId = await resolveUserIdFromUrlId(urlTargetId);
    if (!targetUserId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find pending request where current user is receiver (userId2)
    // Actually, we need to check both directions because we might be accepting.
    // Wait, if I accept, I must be the receiver.
    // So look for userId1 = requester, userId2 = me, status = pending.

    const request = await db.query.friendships.findFirst({
      where: and(
        eq(friendships.userId1, targetUserId),
        eq(friendships.userId2, user.id),
        eq(friendships.status, "pending")
      ),
    });

    if (!request) {
      return NextResponse.json(
        { error: "No pending request found" },
        { status: 404 }
      );
    }

    if (action === "accept") {
      await db
        .update(friendships)
        .set({ status: "accepted" })
        .where(eq(friendships.id, request.id));
    } else if (action === "reject") {
      await db.delete(friendships).where(eq(friendships.id, request.id));
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("/api/friends/accept POST error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
