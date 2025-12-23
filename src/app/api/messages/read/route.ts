import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import {
  requireAuthenticatedUser,
  resolveUserIdFromUrlId,
} from "@/server/auth/session";
import { db } from "@/server/db";
import { messages } from "@/server/db/schema";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    const { senderId: urlSenderId } = await req.json();

    const senderId = await resolveUserIdFromUrlId(urlSenderId);
    if (!senderId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Mark messages from this sender as read
    await db
      .update(messages)
      .set({ isRead: true })
      .where(
        and(
          eq(messages.senderId, senderId),
          eq(messages.receiverId, user.id),
          eq(messages.isRead, false)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("/api/messages/read POST error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
