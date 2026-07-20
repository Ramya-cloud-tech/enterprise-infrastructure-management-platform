import { NextResponse } from "next/server";

const BACKEND_API_URL =
  process.env.BACKEND_API_URL ||
  "http://192.168.206.128:3001";

type BackendUser = {
  Name?: string;
  SamAccountName?: string;
  Department?: string;
  Title?: string;
  Enabled?: boolean;
  LockedOut?: boolean;
  Email?: string;
  DistinguishedName?: string;

  name?: string;
  username?: string;
  department?: string;
  title?: string;
  enabled?: boolean;
  lockedOut?: boolean;
  email?: string;
  distinguishedName?: string;
};

export async function GET(): Promise<NextResponse> {
  try {
    const response = await fetch(
      `${BACKEND_API_URL}/users`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    const responseText = await response.text();

    let data: unknown;

    try {
      data = responseText
        ? JSON.parse(responseText)
        : [];
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Active Directory returned an invalid JSON response.",
        },
        { status: 502 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(data, {
        status: response.status,
      });
    }

    const backendUsers = Array.isArray(data)
      ? (data as BackendUser[])
      : [];

    const users = backendUsers.map((user) => ({
      name:
        user.name ||
        user.Name ||
        "Unknown User",

      username:
        user.username ||
        user.SamAccountName ||
        "",

      department:
        user.department ||
        user.Department ||
        "",

      title:
        user.title ||
        user.Title ||
        "",

      enabled:
        user.enabled ??
        user.Enabled ??
        false,

      lockedOut:
        user.lockedOut ??
        user.LockedOut ??
        false,

      email:
        user.email ||
        user.Email ||
        "",

      distinguishedName:
        user.distinguishedName ||
        user.DistinguishedName ||
        "",
    }));

    return NextResponse.json(users, {
      status: 200,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to connect to Active Directory.",
      },
      { status: 500 }
    );
  }
}