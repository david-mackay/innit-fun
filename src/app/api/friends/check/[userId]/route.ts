import { NextRequest, NextResponse } from "next/server";
import { and, eq, or } from "drizzle-orm";

import {
  requireAuthenticatedUser,
  resolveUserIdFromUrlId,
} from "@/server/auth/session";
import { db } from "@/server/db";
import { friendships } from "@/server/db/schema";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const user = await requireAuthenticatedUser();
    const { userId: urlTargetId } = await params;
    const targetUserId = await resolveUserIdFromUrlId(urlTargetId);

    if (!targetUserId || targetUserId === user.id) {
      return NextResponse.json({ status: "none" });
    }

    const friendship = await db.query.friendships.findFirst({
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

    if (!friendship) {
      return NextResponse.json({ status: "none" });
    }

    if (friendship.status === "accepted") {
      return NextResponse.json({ status: "friends" });
    }

    if (friendship.status === "pending") {
      // Check who sent it
      if (friendship.userId1 === user.id) {
        return NextResponse.json({ status: "sent" });
      } else {
        return NextResponse.json({ status: "received" });
      }
    }

    return NextResponse.json({ status: "none" });
  } catch (error) {
    console.error("/api/friends/check GET error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
