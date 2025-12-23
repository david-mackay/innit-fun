import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { requireAuthenticatedUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { reactions } from "@/server/db/schema";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser();
    const { id: postId } = await params;
    const body = await req.json();
    const { emoji } = body;

    if (!emoji) {
      return NextResponse.json({ error: "Emoji required" }, { status: 400 });
    }

    // Check existing reaction
    const existing = await db.query.reactions.findFirst({
      where: and(
        eq(reactions.userId, user.id),
        eq(reactions.postId, postId),
        eq(reactions.emoji, emoji)
      ),
    });

    if (existing) {
      // Remove reaction (toggle)
      await db.delete(reactions).where(eq(reactions.id, existing.id));
      return NextResponse.json({ success: true, action: "removed" });
    } else {
      // Add reaction
      await db.insert(reactions).values({
        userId: user.id,
        postId,
        emoji,
      });
      return NextResponse.json({ success: true, action: "added" });
    }
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    console.error("/api/posts/[id]/react POST error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
