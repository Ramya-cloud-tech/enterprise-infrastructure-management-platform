import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const username = String(body.username || "").trim();
    const newPassword = String(body.newPassword || "").trim();

    if (!username || !newPassword) {
      return NextResponse.json(
        {
          success: false,
          error: "Username and new password are required.",
        },
        { status: 400 }
      );
    }

    const response = await fetch(
      "http://192.168.206.128:3001/reset-password",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          newPassword,
        }),
        cache: "no-store",
      }
    );

    // Read as text first because the Express API may return plain text
    const responseText = await response.text();

    let data: {
      success?: boolean;
      message?: string;
      error?: string;
    };

    try {
      data = JSON.parse(responseText);
    } catch {
      data = {
        success: false,
        error: responseText || "Enterprise API returned an invalid response.",
      };
    }

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to contact the Enterprise API.",
      },
      { status: 500 }
    );
  }
}