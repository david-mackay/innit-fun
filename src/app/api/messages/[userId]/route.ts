import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, or } from "drizzle-orm";

import {
  requireAuthenticatedUser,
  resolveUserIdFromUrlId,
} from "@/server/auth/session";
import { db } from "@/server/db";
import { messages } from "@/server/db/schema";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const user = await requireAuthenticatedUser();
    const { userId: urlUserId } = await params;
    const otherUserId = await resolveUserIdFromUrlId(urlUserId);

    if (!otherUserId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const history = await db.query.messages.findMany({
      where: or(
        and(
          eq(messages.senderId, user.id),
          eq(messages.receiverId, otherUserId)
        ),
        and(
          eq(messages.senderId, otherUserId),
          eq(messages.receiverId, user.id)
        )
      ),
      orderBy: [asc(messages.createdAt)],
      with: {
        sender: {
          columns: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return NextResponse.json({ messages: history });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    console.error("/api/messages/[userId] GET error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
