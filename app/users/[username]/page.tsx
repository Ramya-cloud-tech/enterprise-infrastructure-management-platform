"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type UserData = {
  username: string;
  displayName: string | null;
  department: string | null;
  jobTitle: string | null;
  employeeId: string | null;
  manager: string | null;
  email: string | null;
  enabled: boolean;
  lockedOut: boolean;
  lastLogin: string | null;
  passwordLastSet: string | null;
  ou: string | null;
  domain: string;
  groups: string[];
};

type AuditLog = {
  id: string;
  administrator: string;
  action: string;
  username: string;
  details: string;
  status: string;
  timestamp: string;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  logs?: AuditLog[];
};

export default function UserDetails() {
  const params = useParams();

  const rawUsername = params?.username as string;
  const username = rawUsername
    ? decodeURIComponent(rawUsername)
    : "";

  const [isProcessing, setIsProcessing] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const readJsonResponse = async (
    response: Response
  ): Promise<ApiResponse> => {
    const responseText = await response.text();

    if (!responseText.trim()) {
      return {
        success: false,
        error: "The server returned an empty response.",
      };
    }

    try {
      return JSON.parse(responseText) as ApiResponse;
    } catch {
      return {
        success: false,
        error: responseText,
      };
    }
  };

  const loadUserDetails = async () => {
    if (!username) return;

    setIsLoadingUser(true);
    setLoadError("");

    try {
      const response = await fetch(
        `/api/user-details/${encodeURIComponent(username)}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const responseText = await response.text();

      let data: UserData & {
        success?: boolean;
        error?: string;
      };

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          responseText ||
            "The user-details API returned an invalid response."
        );
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to load user details."
        );
      }

      setUserData(data);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Unable to load user details."
      );
    } finally {
      setIsLoadingUser(false);
    }
  };

  const loadAuditLogs = async () => {
    if (!username) return;

    try {
      const response = await fetch("/api/audit-logs", {
        method: "GET",
        cache: "no-store",
      });

      const data = await readJsonResponse(response);

      if (!response.ok || !data.success) {
        console.error(
          data.error || "Unable to retrieve audit logs."
        );
        return;
      }

      const logs = Array.isArray(data.logs) ? data.logs : [];

      const matchingLogs = logs.filter(
        (log) =>
          log.username.toLowerCase() === username.toLowerCase()
      );

      setAuditLogs(matchingLogs);
    } catch (error) {
      console.error("Unable to load audit logs:", error);
    }
  };

  const refreshPageData = async () => {
    await Promise.all([
      loadUserDetails(),
      loadAuditLogs(),
    ]);
  };

  useEffect(() => {
    if (!username) return;

    void refreshPageData();
  }, [username]);

  const resetPassword = async () => {
    const newPassword = prompt("Enter new password:");

    if (!newPassword) return;

    setIsProcessing(true);

    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          newPassword,
        }),
      });

      const data = await readJsonResponse(response);

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Password reset failed."
        );
      }

      alert(
        data.message || "Password reset successfully!"
      );

      await refreshPageData();
    } catch (error) {
      alert(
        "Error: " +
          (error instanceof Error
            ? error.message
            : "Password reset failed.")
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const unlockUser = async () => {
    const confirmed = confirm(
      `Unlock ${username}?`
    );

    if (!confirmed) return;

    setIsProcessing(true);

    try {
      const response = await fetch("/api/unlock-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
        }),
      });

      const data = await readJsonResponse(response);

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to unlock the account."
        );
      }

      alert(
        data.message || "Account unlocked successfully!"
      );

      await refreshPageData();
    } catch (error) {
      alert(
        "Error: " +
          (error instanceof Error
            ? error.message
            : "Unable to unlock the account.")
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const disableUser = async () => {
    const confirmed = confirm(
      `Disable ${username}? This user will no longer be able to sign in.`
    );

    if (!confirmed) return;

    setIsProcessing(true);

    try {
      const response = await fetch("/api/disable-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
        }),
      });

      const data = await readJsonResponse(response);

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to disable the account."
        );
      }

      alert(
        data.message || "Account disabled successfully!"
      );

      await refreshPageData();
    } catch (error) {
      alert(
        "Error: " +
          (error instanceof Error
            ? error.message
            : "Unable to disable the account.")
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const enableUser = async () => {
    const confirmed = confirm(
      `Enable ${username}? This user will be allowed to sign in again.`
    );

    if (!confirmed) return;

    setIsProcessing(true);

    try {
      const response = await fetch("/api/enable-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
        }),
      });

      const data = await readJsonResponse(response);

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to enable the account."
        );
      }

      alert(
        data.message || "Account enabled successfully!"
      );

      await refreshPageData();
    } catch (error) {
      alert(
        "Error: " +
          (error instanceof Error
            ? error.message
            : "Unable to enable the account.")
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const moveUser = async () => {
    const targetOU = prompt(
      "Enter target OU: Finance, HR, IT, Sales, Marketing, Operations, Executive, or Customer Support"
    );

    if (!targetOU?.trim()) return;

    const cleanedTargetOU = targetOU.trim();

    const confirmed = confirm(
      `Move ${username} to the ${cleanedTargetOU} OU?`
    );

    if (!confirmed) return;

    setIsProcessing(true);

    try {
      const response = await fetch("/api/move-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          targetOU: cleanedTargetOU,
        }),
      });

      const data = await readJsonResponse(response);

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to move the user."
        );
      }

      alert(
        data.message || "User moved successfully!"
      );

      await refreshPageData();
    } catch (error) {
      alert(
        "Error: " +
          (error instanceof Error
            ? error.message
            : "Unable to move the user.")
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoadingUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-2xl bg-white px-8 py-6 shadow">
          <p className="text-xl font-semibold">
            Loading Active Directory user...
          </p>
        </div>
      </main>
    );
  }

  if (loadError || !userData) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-10">
        <div className="max-w-xl rounded-2xl bg-white p-8 shadow">
          <h1 className="text-2xl font-bold">
            Unable to load user
          </h1>

          <p className="mt-3 break-words text-red-600">
            {loadError ||
              "User data was not returned."}
          </p>

          <button
            onClick={() => void refreshPageData()}
            className="mt-6 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="rounded-3xl bg-white p-8 shadow">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-6">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-slate-900 text-4xl font-bold text-white">
                {getInitials(
                  userData.displayName || username
                )}
              </div>

              <div>
                <h1 className="text-4xl font-bold">
                  {userData.displayName || username}
                </h1>

                <p className="mt-2 text-slate-500">
                  {username} · Active Directory User
                </p>

                <span
                  className={`mt-4 inline-flex rounded-full px-4 py-2 text-sm font-semibold ${
                    userData.enabled
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  ●{" "}
                  {userData.enabled
                    ? "Enabled"
                    : "Disabled"}
                </span>
              </div>
            </div>

            <button
  type="button"
  onClick={() => {
    window.open(
      `/api/generate-user-report/${encodeURIComponent(username)}`,
      "_blank"
    );
  }}
  className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white hover:bg-slate-700"
>
  Generate Report
</button>
          </div>
        </div>

        {/* Information Cards */}
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <section className="rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-6 text-2xl font-bold">
              User Information
            </h2>

            <div className="space-y-5">
              <Info
                label="Username"
                value={userData.username || username}
              />

              <Info
                label="Department"
                value={
                  userData.department || "Not set"
                }
              />

              <Info
                label="Job Title"
                value={userData.jobTitle || "Not set"}
              />

              <Info
                label="Employee ID"
                value={
                  userData.employeeId || "Not set"
                }
              />

              <Info
                label="Manager"
                value={userData.manager || "Not set"}
              />

              <Info
                label="Email"
                value={userData.email || "Not set"}
              />
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-6 text-2xl font-bold">
              Active Directory
            </h2>

            <div className="space-y-5">
              <Info
                label="OU"
                value={userData.ou || "Unknown"}
              />

              <Info
                label="Account Status"
                value={
                  userData.enabled
                    ? "Enabled"
                    : "Disabled"
                }
              />

              <Info
                label="Locked"
                value={
                  userData.lockedOut ? "Yes" : "No"
                }
              />

              <Info
                label="Password Last Set"
                value={
                  userData.passwordLastSet ||
                  "Unknown"
                }
              />

              <Info
                label="Last Login"
                value={userData.lastLogin || "Never"}
              />

              <Info
                label="Domain"
                value={
                  userData.domain || "contoso.local"
                }
              />
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-6 text-2xl font-bold">
              Security Groups
            </h2>

            <div className="space-y-3">
              {userData.groups.length > 0 ? (
                userData.groups.map((group) => (
                  <Group
                    key={group}
                    name={group}
                  />
                ))
              ) : (
                <p className="text-slate-500">
                  No security groups found.
                </p>
              )}
            </div>
          </section>
        </div>

        {/* Administrator Actions */}
        <section className="mt-8 rounded-2xl bg-white p-8 shadow">
          <h2 className="mb-8 text-2xl font-bold">
            Administrator Actions
          </h2>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <ActionButton
              label="Reset Password"
              processingLabel="Processing..."
              isProcessing={isProcessing}
              onClick={resetPassword}
              normalClass="bg-slate-900 hover:bg-slate-700"
            />

            <ActionButton
              label="Unlock Account"
              processingLabel="Processing..."
              isProcessing={isProcessing}
              onClick={unlockUser}
              normalClass="bg-blue-600 hover:bg-blue-500"
            />

            <ActionButton
              label="Disable User"
              processingLabel="Processing..."
              isProcessing={isProcessing}
              onClick={disableUser}
              normalClass="bg-yellow-500 hover:bg-yellow-400"
            />

            <ActionButton
              label="Enable User"
              processingLabel="Processing..."
              isProcessing={isProcessing}
              onClick={enableUser}
              normalClass="bg-green-600 hover:bg-green-500"
            />

            <ActionButton
              label="Move OU"
              processingLabel="Processing..."
              isProcessing={isProcessing}
              onClick={moveUser}
              normalClass="bg-purple-600 hover:bg-purple-500"
            />

            <button
              type="button"
              disabled
              title="Delete User will be connected later."
              className="cursor-not-allowed rounded-xl bg-red-300 py-4 font-semibold text-white"
            >
              Delete User
            </button>
          </div>
        </section>

        {/* Audit Log */}
        <section className="mt-8 rounded-2xl bg-white p-8 shadow">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                Activity Audit Log
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Administrative actions recorded for{" "}
                {username}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadAuditLogs()}
              className="rounded-lg border px-4 py-2 font-semibold hover:bg-slate-100"
            >
              Refresh
            </button>
          </div>

          <div className="space-y-4">
            {auditLogs.length > 0 ? (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl border border-slate-200 p-5"
                >
                  <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-lg font-bold">
                        {log.action}
                      </p>

                      <p className="mt-2 text-sm text-slate-600">
                        Administrator:{" "}
                        <span className="font-semibold text-slate-900">
                          {log.administrator}
                        </span>
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        User:{" "}
                        <span className="font-semibold text-slate-900">
                          {log.username}
                        </span>
                      </p>

                      <p className="mt-3 text-slate-600">
                        {log.details}
                      </p>
                    </div>

                    <div className="md:text-right">
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-semibold ${
                          log.status === "Success"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {log.status}
                      </span>

                      <p className="mt-3 text-sm text-slate-500">
                        {formatTimestamp(log.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl bg-slate-100 p-6 text-center">
                <p className="text-slate-500">
                  No administrator activity has been
                  recorded yet.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function ActionButton({
  label,
  processingLabel,
  isProcessing,
  onClick,
  normalClass,
}: {
  label: string;
  processingLabel: string;
  isProcessing: boolean;
  onClick: () => void | Promise<void>;
  normalClass: string;
}) {
  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={isProcessing}
      className={`rounded-xl py-4 font-semibold text-white transition ${
        isProcessing
          ? "cursor-not-allowed bg-slate-400"
          : normalClass
      }`}
    >
      {isProcessing ? processingLabel : label}
    </button>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-words font-semibold">
        {value}
      </p>
    </div>
  );
}

function Group({ name }: { name: string }) {
  return (
    <div className="rounded-lg bg-slate-100 p-3">
      {name}
    </div>
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

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toLocaleString("en-SG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}