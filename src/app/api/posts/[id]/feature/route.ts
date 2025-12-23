import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { requireAuthenticatedUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { posts } from "@/server/db/schema";

export const runtime = "nodejs";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser();
    const { id } = await params;
    const body = await req.json();
    const { isFeatured } = body;

    const post = await db.query.posts.findFirst({
      where: eq(posts.id, id),
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Permission Logic:
    // 1. If Wall Post (targetUserId set): Only targetUserId can feature.
    // 2. If Feed Post (targetUserId null): Only userId (author) can feature.

    let canToggle = false;

    if (post.targetUserId) {
      if (post.targetUserId === user.id) {
        canToggle = true;
      }
    } else {
      if (post.userId === user.id) {
        canToggle = true;
      }
    }

    if (!canToggle) {
      return NextResponse.json(
        { error: "Unauthorized to feature this post" },
        { status: 403 }
      );
    }

    const updated = await db
      .update(posts)
      .set({ isFeatured: Boolean(isFeatured) })
      .where(eq(posts.id, id))
      .returning()
      .then((rows) => rows[0]);

    return NextResponse.json({ post: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    console.error("/api/posts/[id]/feature PUT error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
