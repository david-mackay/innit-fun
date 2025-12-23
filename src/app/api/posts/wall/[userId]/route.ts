import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, isNull, or } from "drizzle-orm";

import {
  requireAuthenticatedUser,
  resolveUserIdFromUrlId,
} from "@/server/auth/session";
import { db } from "@/server/db";
import { posts } from "@/server/db/schema";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const user = await requireAuthenticatedUser();
    const { userId: urlUserId } = await params;

    const targetUserId = await resolveUserIdFromUrlId(urlUserId);
    if (!targetUserId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const wallPosts = await db.query.posts.findMany({
      where: or(
        eq(posts.targetUserId, targetUserId),
        and(
          eq(posts.userId, targetUserId),
          isNull(posts.targetUserId),
          eq(posts.isFeatured, true)
        )
      ),
      orderBy: [desc(posts.createdAt)],
      limit: 50,
      with: {
        author: true,
        reactions: true,
        stacks: true,
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

    return NextResponse.json({ posts: wallPosts });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    console.error("/api/posts/wall/[userId] GET error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
