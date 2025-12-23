import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { requireAuthenticatedUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";

export const runtime = "nodejs";

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    const body = await req.json();
    
    const { displayName, bio, avatarUrl } = body;

    // Validate inputs
    if (displayName && displayName.length > 50) {
      return NextResponse.json({ error: "Display name too long" }, { status: 400 });
    }
    if (bio && bio.length > 160) {
      return NextResponse.json({ error: "Bio too long" }, { status: 400 });
    }

    const updated = await db
      .update(users)
      .set({
        displayName,
        bio,
        avatarUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning()
      .then((rows) => rows[0]);

    return NextResponse.json({ user: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    console.error("/api/users/profile PUT error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    
    const currentUser = await db.query.users.findFirst({
        where: eq(users.id, user.id),
    });

    return NextResponse.json({ user: currentUser });
  } catch (error) {
     if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    console.error("/api/users/profile GET error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

