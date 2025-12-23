import { NextRequest, NextResponse } from "next/server";
import { and, count, eq } from "drizzle-orm";

import { requireAuthenticatedUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { friendships, messages } from "@/server/db/schema";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();

    // 1. Unread Messages Count
    const unreadMessagesData = await db
      .select({ count: count() })
      .from(messages)
      .where(and(eq(messages.receiverId, user.id), eq(messages.isRead, false)));

    const unreadMessages = unreadMessagesData[0].count;

    // 2. Pending Friend Requests Count
    const pendingRequestsData = await db
      .select({ count: count() })
      .from(friendships)
      .where(
        and(eq(friendships.userId2, user.id), eq(friendships.status, "pending"))
      );

    const pendingRequests = pendingRequestsData[0].count;

    return NextResponse.json({
      unreadMessages,
      pendingRequests,
      total: unreadMessages + pendingRequests,
    });
  } catch (error) {
    console.error("/api/notifications/counts GET error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
