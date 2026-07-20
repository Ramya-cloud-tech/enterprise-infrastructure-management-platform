"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type DirectoryUser = {
  username?: string;
  samAccountName?: string;
  SamAccountName?: string;

  displayName?: string;
  name?: string;
  Name?: string;

  department?: string;
  Department?: string;

  title?: string;
  Title?: string;

  enabled?: boolean;
  Enabled?: boolean;

  lockedOut?: boolean;
  LockedOut?: boolean;

  email?: string;
  Email?: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadUsers = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch("/api/users", {
          method: "GET",
          cache: "no-store",
        });

        const responseText = await response.text();

        let data: unknown;

        try {
          data = JSON.parse(responseText);
        } catch {
          throw new Error(
            responseText || "The users API returned invalid data."
          );
        }

        if (!response.ok) {
          const apiError =
            typeof data === "object" &&
            data !== null &&
            "error" in data
              ? String(data.error)
              : "Unable to retrieve users.";

          throw new Error(apiError);
        }

        const userList = Array.isArray(data)
          ? data
          : typeof data === "object" &&
              data !== null &&
              "users" in data &&
              Array.isArray(data.users)
            ? data.users
            : [];

        setUsers(userList as DirectoryUser[]);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to retrieve users."
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return users;
    }

    return users.filter((user) => {
      const username =
        user.username ||
        user.samAccountName ||
        user.SamAccountName ||
        "";

      const displayName =
        user.displayName ||
        user.name ||
        user.Name ||
        "";

      const department =
        user.department ||
        user.Department ||
        "";

      const title =
        user.title ||
        user.Title ||
        "";

      const email =
        user.email ||
        user.Email ||
        "";

      return [
        username,
        displayName,
        department,
        title,
        email,
      ].some((value) =>
        value.toLowerCase().includes(query)
      );
    });
  }, [users, search]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-2xl bg-white px-8 py-6 shadow">
          <p className="text-xl font-semibold">
            Loading Active Directory users...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl bg-white p-8 shadow">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
                Identity Management
              </p>

              <h1 className="mt-2 text-4xl font-bold">
                Active Directory Users
              </h1>

              <p className="mt-2 text-slate-500">
                Search, review and manage enterprise directory accounts.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/users/create"
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-700"
              >
                + Create User
              </Link>

              <div className="rounded-xl bg-slate-100 px-5 py-3">
                <p className="text-sm text-slate-500">
                  Total users
                </p>

                <p className="text-2xl font-bold">
                  {users.length}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search by name, username, department, title or email..."
              className="w-full rounded-xl border border-slate-300 px-5 py-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {error ? (
          <div className="mt-8 rounded-2xl bg-white p-8 shadow">
            <h2 className="text-xl font-bold text-red-600">
              Unable to load users
            </h2>

            <p className="mt-3 text-slate-600">
              {error}
            </p>
          </div>
        ) : (
          <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow">
            <div className="border-b px-6 py-5">
              <h2 className="text-2xl font-bold">
                Directory Accounts
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Showing {filteredUsers.length} user
                {filteredUsers.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-100 text-left">
                  <tr>
                    <th className="px-6 py-4">
                      User
                    </th>

                    <th className="px-6 py-4">
                      Username
                    </th>

                    <th className="px-6 py-4">
                      Department
                    </th>

                    <th className="px-6 py-4">
                      Title
                    </th>

                    <th className="px-6 py-4">
                      Status
                    </th>

                    <th className="px-6 py-4">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user, index) => {
                      const username =
                        user.username ||
                        user.samAccountName ||
                        user.SamAccountName ||
                        "";

                      const displayName =
                        user.displayName ||
                        user.name ||
                        user.Name ||
                        username ||
                        "Unknown User";

                      const department =
                        user.department ||
                        user.Department ||
                        "Not assigned";

                      const title =
                        user.title ||
                        user.Title ||
                        "Not set";

                      const email =
                        user.email ||
                        user.Email ||
                        "No email assigned";

                      const enabled =
                        user.enabled ??
                        user.Enabled ??
                        true;

                      const initials = getInitials(displayName);

                      return (
                        <tr
                          key={
                            username ||
                            `${displayName}-${index}`
                          }
                          className="border-t transition hover:bg-slate-50"
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-4">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 font-bold text-white">
                                {initials}
                              </div>

                              <div>
                                <p className="font-semibold">
                                  {displayName}
                                </p>

                                <p className="text-sm text-slate-500">
                                  {email}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-5 text-slate-600">
                            {username || "Not set"}
                          </td>

                          <td className="px-6 py-5">
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                              {department}
                            </span>
                          </td>

                          <td className="px-6 py-5 text-slate-600">
                            {title}
                          </td>

                          <td className="px-6 py-5">
                            <span
                              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                                enabled
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {enabled
                                ? "Enabled"
                                : "Disabled"}
                            </span>
                          </td>

                          <td className="px-6 py-5">
                            {username ? (
                              <Link
                                href={`/users/${encodeURIComponent(
                                  username
                                )}`}
                                className="inline-flex rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-700"
                              >
                                Manage
                              </Link>
                            ) : (
                              <span className="text-sm text-slate-400">
                                No username
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-slate-500"
                      >
                        No users match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function getInitials(value: string) {
  const words = value
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "?";
  }

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}