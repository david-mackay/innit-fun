import { NextRequest, NextResponse } from "next/server";
import { and, eq, not, or, sql } from "drizzle-orm";

import { requireAuthenticatedUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { friendships, users } from "@/server/db/schema";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();

    // 1. Get my friends
    const myFriendships = await db.query.friendships.findMany({
      where: or(
        eq(friendships.userId1, user.id),
        eq(friendships.userId2, user.id)
      ),
    });

    const myFriendIds = myFriendships.map((f) =>
      f.userId1 === user.id ? f.userId2 : f.userId1
    );

    // 2. Get friends of friends (Discovery)
    // Find friendships where ONE user is in myFriendIds AND the other is NOT me and NOT in myFriendIds

    // Simplest way: Fetch all friendships involving my friends
    // Then filter in memory for small scale app.

    // Optimization: query friendships where userId1 IN myFriendIds OR userId2 IN myFriendIds

    const fofFriendships = await db.query.friendships.findMany({
      where: or(
        and(
          or(
            // Check if userId1 is a friend
            // In Drizzle we can't easily do `inArray(friendships.userId1, myFriendIds)` if list is empty, so check length
            myFriendIds.length > 0
              ? sql`${friendships.userId1} IN ${myFriendIds}`
              : sql`1=0`,
            myFriendIds.length > 0
              ? sql`${friendships.userId2} IN ${myFriendIds}`
              : sql`1=0`
          )
        )
      ),
      with: {
        user1: true,
        user2: true,
      },
    });

    const discoveredUsersMap = new Map();

    fofFriendships.forEach((f) => {
      const u1 = f.user1;
      const u2 = f.user2;

      const otherUser = myFriendIds.includes(u1.id) ? u2 : u1;

      // Skip if it's me
      if (otherUser.id === user.id) return;
      // Skip if already my friend
      if (myFriendIds.includes(otherUser.id)) return;

      // Add to discovery
      if (!discoveredUsersMap.has(otherUser.id)) {
        discoveredUsersMap.set(otherUser.id, {
          ...otherUser,
          mutualFriends: 1,
        });
      } else {
        const existing = discoveredUsersMap.get(otherUser.id);
        existing.mutualFriends += 1;
      }
    });

    // Convert to array
    const discoveries = Array.from(discoveredUsersMap.values())
      .sort((a, b) => b.mutualFriends - a.mutualFriends)
      .slice(0, 10); // Limit 10

    // Also return my friends for the list
    const myFriendsDetails = await db.query.users.findMany({
      where:
        myFriendIds.length > 0 ? sql`${users.id} IN ${myFriendIds}` : sql`1=0`,
    });

    return NextResponse.json({
      friends: myFriendsDetails,
      discovery: discoveries,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    console.error("/api/friends GET error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

