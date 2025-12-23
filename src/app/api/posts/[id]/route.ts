import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray, or, sql } from "drizzle-orm";

import { requireAuthenticatedUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { eventAttendees, friendships, posts } from "@/server/db/schema";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser();
    const { id: postId } = await params;

    // 1. Fetch Post
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
      with: {
        author: true,
        reactions: {
          with: { user: { columns: { id: true, displayName: true } } },
        },
        stacks: {
          with: {
            user: { columns: { id: true, displayName: true, avatarUrl: true } },
          },
          limit: 20,
        },
        attendees: {
          where: (attendees, { eq }) => eq(attendees.status, "going"),
          with: {
            user: { columns: { id: true, displayName: true, avatarUrl: true } },
          },
        },
        referencePost: {
          with: { author: { columns: { displayName: true } } },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // 2. Access Control: +1 Protocol
    // Allowed if:
    // A. I am the author
    // B. Author is my friend
    // C. I am an attendee
    // D. A friend of mine is an attendee

    if (post.userId === user.id) {
      return NextResponse.json({ post });
    }

    // Get friend IDs
    const userFriendships = await db.query.friendships.findMany({
      where: or(
        eq(friendships.userId1, user.id),
        eq(friendships.userId2, user.id)
      ),
    });
    const friendIds = userFriendships.map((f) =>
      f.userId1 === user.id ? f.userId2 : f.userId1
    );

    // Is Author a Friend?
    if (friendIds.includes(post.userId)) {
      return NextResponse.json({ post });
    }

    // If it's not an event, and not friend, maybe strict block?
    // The plan focuses on events. If it's a regular post, usually strict friend-only.
    // But let's check attendees anyway if it's an event.

    if (post.type === "event") {
      // Am I attending?
      const amIAttending = post.attendees.some((a) => a.userId === user.id);
      if (amIAttending) {
        return NextResponse.json({ post });
      }

      // Is a Friend Attending?
      const isFriendAttending = post.attendees.some((a) =>
        friendIds.includes(a.userId)
      );
      if (isFriendAttending) {
        return NextResponse.json({ post });
      }
    }

    // Default: Access Denied
    return NextResponse.json(
      {
        error:
          "Access Denied. You must be friends with the host or an attendee.",
      },
      { status: 403 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    console.error("/api/posts/[id] GET error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser();
    const { id: postId } = await params;

    const post = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Authorization: Author OR Wall Owner
    const isAuthor = post.userId === user.id;
    const isWallOwner = post.targetUserId === user.id;

    if (!isAuthor && !isWallOwner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await db.delete(posts).where(eq(posts.id, postId));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    console.error("/api/posts/[id] DELETE error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
