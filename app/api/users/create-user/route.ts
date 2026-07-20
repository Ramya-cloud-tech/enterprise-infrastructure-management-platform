import { NextRequest, NextResponse } from "next/server";

const BACKEND_API_URL = "http://192.168.206.128:3001";

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const body = await request.json();

    const response = await fetch(
      `${BACKEND_API_URL}/create-user`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
      }
    );

    const data = await response.json();

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
            : "Unable to create the user.",
      },
      { status: 500 }
    );
  }
}