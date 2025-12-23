import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { posts } from "@/server/db/schema";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const eventPost = await db.query.posts.findFirst({
      where: eq(posts.id, id),
      with: {
        author: {
          columns: {
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!eventPost || eventPost.type !== "event") {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Return limited details
    return NextResponse.json({
      event: {
        id: eventPost.id,
        content: eventPost.content,
        mediaUrl: eventPost.mediaUrl,
        eventDate: eventPost.eventDate,
        // eventLocation: hidden for privacy in public preview
        vibe: eventPost.vibe,
        author: eventPost.author,
      },
    });
  } catch (error) {
    console.error("/api/public/events/[id] GET error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
