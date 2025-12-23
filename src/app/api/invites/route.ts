import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { and, desc, eq, gt, or } from "drizzle-orm";

import { requireAuthenticatedUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { invites } from "@/server/db/schema";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();

    // Fetch active invites for this user
    // active status AND (expiresAt > now OR expiresAt is null)
    const activeInvites = await db.query.invites.findMany({
      where: and(
        eq(invites.creatorId, user.id),
        eq(invites.status, "active"),
        or(
          gt(invites.expiresAt, new Date())
          // check for null if allowed, though schema says expiresAt is timestamp but invite logic sets it.
          // In schema it is nullable? let's check schema.
          // schema: expiresAt: timestamp("expires_at"), -> nullable by default unless notNull()
        )
      ),
      orderBy: [desc(invites.createdAt)],
    });

    return NextResponse.json({ invites: activeInvites });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    console.error("/api/invites GET error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();

    // Create a random code (e.g. 12 chars hex)
    const code = randomBytes(6).toString("hex");

    // Default expiration: 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const created = await db
      .insert(invites)
      .values({
        code,
        creatorId: user.id,
        expiresAt,
        status: "active",
      })
      .returning()
      .then((rows) => rows[0]);

    return NextResponse.json({ invite: created }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    console.error("/api/invites POST error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
