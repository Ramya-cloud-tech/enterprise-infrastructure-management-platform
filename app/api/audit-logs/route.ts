import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch(
      "http://192.168.206.128:3001/audit-logs",
      {
        method: "GET",
        cache: "no-store",
      }
    );

    const responseText = await response.text();

    let data;

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
            : "Unable to retrieve audit logs.",
      },
      { status: 500 }
    );
  }
}