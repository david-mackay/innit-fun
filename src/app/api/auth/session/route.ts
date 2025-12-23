import { NextRequest, NextResponse } from "next/server";

import {
  getAuthenticatedUser,
  createSessionToken,
  setSessionCookie,
  getOrCreateUser,
} from "@/server/auth/session";

export const runtime = "nodejs";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }
  return NextResponse.json({ authenticated: true, user });
}

export async function POST(req: NextRequest) {
  try {
    const { walletAddress } = (await req.json()) as {
      walletAddress?: string;
    };

    if (!walletAddress || typeof walletAddress !== "string") {
      return NextResponse.json(
        { error: "Missing walletAddress" },
        { status: 400 }
      );
    }

    // Try to get/create DB user to get real UUID
    const dbUser = await getOrCreateUser(walletAddress);

    // Create session token using UUID if available, else wallet address (fallback)
    const token = createSessionToken(walletAddress, dbUser?.id);

    const response = NextResponse.json({
      ok: true,
      user: dbUser || { id: walletAddress, walletAddress },
    });
    setSessionCookie(response, token);

    return response;
  } catch (error) {
    console.error("/api/auth/session POST error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
