import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const username = String(body.username || "").trim();

    if (!username) {
      return NextResponse.json(
        {
          success: false,
          error: "Username is required.",
        },
        { status: 400 }
      );
    }

    const response = await fetch(
      "http://192.168.206.128:3001/enable-user",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
        }),
        cache: "no-store",
      }
    );

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
        error:
          responseText || "Enterprise API returned an invalid response.",
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