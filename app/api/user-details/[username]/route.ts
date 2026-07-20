import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    username: string;
  }>;
};

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const { username } = await context.params;
    const decodedUsername = decodeURIComponent(username).trim();

    if (!decodedUsername) {
      return NextResponse.json(
        {
          success: false,
          error: "Username is required.",
        },
        { status: 400 }
      );
    }

    const response = await fetch(
      `http://192.168.206.128:3001/user-details/${encodeURIComponent(
        decodedUsername
      )}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    const responseText = await response.text();

    let data: {
      success?: boolean;
      error?: string;
      [key: string]: unknown;
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