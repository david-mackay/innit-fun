import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, or, sql } from "drizzle-orm";

import { requireAuthenticatedUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { messages, users } from "@/server/db/schema";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();

    // Fetch conversations
    // We want unique interlocutors and the latest message for each.
    // This is a bit complex in SQL/Drizzle query builder.
    // Simpler approach for MVP:
    // 1. Fetch all messages involving the user, sorted by date desc.
    // 2. Process in memory to find unique conversations.
    
    const allMessages = await db.query.messages.findMany({
        where: or(
            eq(messages.senderId, user.id),
            eq(messages.receiverId, user.id)
        ),
        orderBy: [desc(messages.createdAt)],
        with: {
            sender: true,
            receiver: true
        }
    });

    const conversationsMap = new Map();

    for (const msg of allMessages) {
        const otherUser = msg.senderId === user.id ? msg.receiver : msg.sender;
        if (!conversationsMap.has(otherUser.id)) {
            conversationsMap.set(otherUser.id, {
                user: otherUser,
                lastMessage: msg
            });
        }
    }

    const conversations = Array.from(conversationsMap.values());

    return NextResponse.json({ conversations });

  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    console.error("/api/messages GET error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    const body = await req.json();
    const { receiverId, content, type, mediaUrl, amount, transactionHash } = body;

    if (!receiverId) {
        return NextResponse.json({ error: "Receiver required" }, { status: 400 });
    }

    const created = await db.insert(messages).values({
        senderId: user.id,
        receiverId,
        content,
        type: type || "text",
        mediaUrl,
        amount: amount ? amount.toString() : null,
        transactionHash,
    }).returning().then(rows => rows[0]);

    return NextResponse.json({ message: created }, { status: 201 });

  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    console.error("/api/messages POST error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
