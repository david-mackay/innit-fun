import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";

import {
  requireAuthenticatedUser,
  resolveUserIdFromUrlId,
} from "@/server/auth/session";
import { db } from "@/server/db";
import { eventAttendees, friendships, posts, users } from "@/server/db/schema";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const cursor = searchParams.get("cursor"); // timestamp

    // 1. Get friend IDs
    const userFriendships = await db.query.friendships.findMany({
      where: or(
        eq(friendships.userId1, user.id),
        eq(friendships.userId2, user.id)
      ),
    });

    const friendIds = userFriendships.map((f) =>
      f.userId1 === user.id ? f.userId2 : f.userId1
    );

    // Include self
    friendIds.push(user.id);

    // 2. Get Events friends are attending (+1 Protocol)
    let attendedPostIds: string[] = [];
    if (friendIds.length > 0) {
      const attended = await db.query.eventAttendees.findMany({
        where: inArray(eventAttendees.userId, friendIds),
        columns: { postId: true },
      });
      attendedPostIds = attended.map((a) => a.postId);
    }

    if (friendIds.length === 0 && attendedPostIds.length === 0) {
      return NextResponse.json({ posts: [], nextCursor: null });
    }

    // 3. Query posts
    const now = new Date();

    // Logic: (Author is Friend OR Friend is Attending) AND (Not Wall Post) AND (Not Expired)
    const whereClause = and(
      or(
        friendIds.length > 0 ? inArray(posts.userId, friendIds) : undefined,
        attendedPostIds.length > 0
          ? inArray(posts.id, attendedPostIds)
          : undefined
      ),
      isNull(posts.targetUserId),
      or(isNull(posts.expiresAt), gt(posts.expiresAt, now)),
      cursor ? sql`${posts.createdAt} < ${new Date(cursor)}` : undefined
    );

    const feedPosts = await db.query.posts.findMany({
      where: whereClause,
      orderBy: [desc(posts.createdAt)],
      limit: limit + 1,
      with: {
        author: {
          columns: {
            id: true,
            displayName: true,
            avatarUrl: true,
            walletAddress: true,
          },
        },
        reactions: {
          with: {
            user: {
              columns: {
                id: true,
                displayName: true,
              },
            },
          },
        },
        stacks: {
          with: {
            user: {
              columns: {
                id: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
          limit: 5,
        },
        attendees: {
          where: (attendees, { eq }) => eq(attendees.status, "going"),
          with: {
            user: {
              columns: {
                id: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
          limit: 10,
        },
        referencePost: {
          with: {
            author: {
              columns: { displayName: true },
            },
          },
        },
      },
    });

    let nextCursor = null;
    if (feedPosts.length > limit) {
      const nextItem = feedPosts.pop();
      nextCursor = nextItem?.createdAt.toISOString();
    }

    return NextResponse.json({ posts: feedPosts, nextCursor });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    console.error("/api/posts GET error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    const body = await req.json();

    const {
      content,
      type,
      mediaUrl,
      vibe,
      expiresAt,
      eventDate,
      eventLocation,
      targetUserId: urlTargetUserId,
    } = body;

    if (!content && !mediaUrl) {
      return NextResponse.json(
        { error: "Content or media required" },
        { status: 400 }
      );
    }

    // Resolve targetUserId if present
    let targetUserId = null;
    if (urlTargetUserId) {
      targetUserId = await resolveUserIdFromUrlId(urlTargetUserId);
      if (!targetUserId) {
        return NextResponse.json(
          { error: "Target user not found" },
          { status: 404 }
        );
      }
    }

    if (targetUserId && targetUserId !== user.id) {
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
        return NextResponse.json(
          { error: "Must be friends to post on wall" },
          { status: 403 }
        );
      }
    }

    const created = await db
      .insert(posts)
      .values({
        userId: user.id,
        targetUserId: targetUserId || null,
        content,
        type: type || "text",
        mediaUrl,
        vibe,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        eventDate: eventDate ? new Date(eventDate) : null,
        eventLocation,
        isFeatured: false,
      })
      .returning()
      .then((rows) => rows[0]);

    // Fetch author to return complete object
    const postWithAuthor = await db.query.posts.findFirst({
      where: eq(posts.id, created.id),
      with: {
        author: true,
        reactions: true,
        stacks: true,
        attendees: true,
      },
    });

    return NextResponse.json({ post: postWithAuthor }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    console.error("/api/posts POST error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
