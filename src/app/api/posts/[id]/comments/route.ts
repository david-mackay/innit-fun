import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { postComments } from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthenticatedUserWithDb } from "@/server/auth/session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;

    const comments = await db.query.postComments.findMany({
      where: eq(postComments.postId, postId),
      with: {
        user: true,
      },
      orderBy: [desc(postComments.createdAt)],
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const session = await getAuthenticatedUserWithDb();

    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { mediaUrl } = await req.json();

    if (!mediaUrl) {
      return NextResponse.json(
        { error: "Media URL is required" },
        { status: 400 }
      );
    }

    const [comment] = await db
      .insert(postComments)
      .values({
        postId,
        userId: session.id,
        mediaUrl,
      })
      .returning();

    const commentWithUser = await db.query.postComments.findFirst({
      where: eq(postComments.id, comment.id),
      with: {
        user: true,
      },
    });

    return NextResponse.json({ comment: commentWithUser });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}
