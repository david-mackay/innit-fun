import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { requireAuthenticatedUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { eventAttendees, posts } from "@/server/db/schema";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser();
    const { id: postId } = await params;
    const body = await req.json();
    const { status } = body; // 'going' or 'not_going'

    if (!["going", "not_going"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // 1. Fetch Event Post
    const eventPost = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
    });

    if (!eventPost || eventPost.type !== "event") {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // 2. Check existing attendance
    const existing = await db.query.eventAttendees.findFirst({
      where: and(
        eq(eventAttendees.userId, user.id),
        eq(eventAttendees.postId, postId)
      ),
    });

    // 3. Update Attendance
    if (status === "going") {
      if (!existing) {
        await db.insert(eventAttendees).values({
          userId: user.id,
          postId,
          status: "going",
        });
      } else if (existing.status !== "going") {
        await db
          .update(eventAttendees)
          .set({ status: "going", createdAt: new Date() }) // Update timestamp to bump
          .where(eq(eventAttendees.id, existing.id));
      } else {
        // Already going
        return NextResponse.json({ success: true });
      }

      // 4. Create Broadcast Post
      // "David is going to Beach Party"
      // Truncate content for title if needed
      const eventTitle =
        eventPost.content?.split("\n")[0].substring(0, 30) || "an event";

      await db.insert(posts).values({
        userId: user.id,
        type: "broadcast",
        content: `${
          user.displayName || "Someone"
        } is going to ${eventTitle}...`,
        referencePostId: postId,
        vibe: eventPost.vibe, // Inherit vibe?
        createdAt: new Date(),
      });
    } else if (status === "not_going") {
      if (existing) {
        await db
          .delete(eventAttendees)
          .where(eq(eventAttendees.id, existing.id));

        // Optional: Broadcast "No longer going"?
        // User asked: "User actions such as when a user is going... or is no longer going... should generate a 'broadcast' type post"

        const eventTitle =
          eventPost.content?.split("\n")[0].substring(0, 30) || "an event";
        await db.insert(posts).values({
          userId: user.id,
          type: "broadcast",
          content: `${
            user.displayName || "Someone"
          } is no longer going to ${eventTitle}.`,
          referencePostId: postId,
          vibe: "sad", // Sad vibe for bailing?
          createdAt: new Date(),
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    console.error("/api/posts/[id]/attend POST error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
