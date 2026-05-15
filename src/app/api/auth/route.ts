import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { password } = await request.json();
  const correctPassword = process.env.LOGIN_PASSWORD || "admin";

  if (password === correctPassword) {
    const authSecret = process.env.AUTH_SECRET || "default_secret_change_me";
    const response = NextResponse.json({ success: true });
    response.cookies.set("auth_token", authSecret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });
    return response;
  }

  return NextResponse.json({ success: false, error: "Wrong password" }, { status: 401 });
}
