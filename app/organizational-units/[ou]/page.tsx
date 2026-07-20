"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type DirectoryUser = {
  id?: number;
  name?: string;
  displayName?: string;
  username?: string;
  samAccountName?: string;
  department?: string;
  title?: string;
  email?: string;
  enabled?: boolean;
  lockedOut?: boolean;
  status?: string;
};

const supportedOUs = [
  "IT",
  "Finance",
  "HR",
  "Sales",
  "Marketing",
  "Operations",
  "Executive",
  "Customer Support",
];

const privilegedGroupNames = [
  "IT Admins",
  "Domain Admins",
  "Enterprise Admins",
  "Administrators",
];

export default function OUPage() {
  const params = useParams();

  const rawOU = params?.ou as string;

  const ouName = rawOU
    ? decodeURIComponent(rawOU)
    : "";

  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

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
          responseText ||
            "The users API returned invalid JSON."
        );
      }

      if (!response.ok) {
        const errorMessage =
          typeof data === "object" &&
          data !== null &&
          "error" in data
            ? String(data.error)
            : "Unable to retrieve directory users.";

        throw new Error(errorMessage);
      }

      if (!Array.isArray(data)) {
        throw new Error(
          "The users API did not return a valid user list."
        );
      }

      setUsers(data as DirectoryUser[]);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to retrieve directory users."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const isValidOU = supportedOUs.some(
    (ou) =>
      normaliseDepartment(ou) ===
      normaliseDepartment(ouName)
  );

  const ouUsers = useMemo(() => {
    return users.filter(
      (user) =>
        normaliseDepartment(user.department) ===
        normaliseDepartment(ouName)
    );
  }, [users, ouName]);

  const statistics = useMemo(() => {
    const enabled = ouUsers.filter(
      (user) => user.enabled !== false
    ).length;

    const disabled = ouUsers.filter(
      (user) => user.enabled === false
    ).length;

    const locked = ouUsers.filter(
      (user) => user.lockedOut === true
    ).length;

    const missingEmployeeDetails = ouUsers.filter(
      (user) =>
        !user.title ||
        user.title === "Not assigned" ||
        !user.department
    ).length;

    return {
      total: ouUsers.length,
      enabled,
      disabled,
      locked,
      missingEmployeeDetails,
    };
  }, [ouUsers]);

  const securityGroups = useMemo(() => {
    const groups = new Set<string>();

    for (const user of ouUsers) {
      if (normaliseDepartment(ouName) === "it") {
        groups.add("IT-Users");

        if (
          String(user.title || "")
            .toLowerCase()
            .includes("administrator")
        ) {
          groups.add("IT Admins");
        }
      } else {
        groups.add(`${ouName}-Users`);
      }
    }

    return Array.from(groups);
  }, [ouUsers, ouName]);

  const riskLevel = useMemo(() => {
    if (
      statistics.locked > 0 ||
      statistics.missingEmployeeDetails > 2
    ) {
      return {
        label: "Review Required",
        style: "bg-red-100 text-red-700",
      };
    }

    if (statistics.disabled > 0) {
      return {
        label: "Monitoring",
        style: "bg-yellow-100 text-yellow-700",
      };
    }

    return {
      label: "Healthy",
      style: "bg-green-100 text-green-700",
    };
  }, [statistics]);

  if (!isValidOU) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-8">
        <div className="max-w-xl rounded-3xl bg-white p-10 text-center shadow">
          <h1 className="text-3xl font-bold">
            Organizational Unit Not Found
          </h1>

          <p className="mt-3 text-slate-500">
            The requested organizational unit is not
            configured in this portal.
          </p>

          <Link
            href="/active-directory"
            className="mt-7 inline-flex rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white hover:bg-slate-700"
          >
            Return to Active Directory
          </Link>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-2xl bg-white px-8 py-6 shadow">
          <p className="text-xl font-semibold">
            Loading {ouName} directory data...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <section className="rounded-3xl bg-slate-900 p-8 text-white shadow">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">
                Identity and Access Governance
              </p>

              <h1 className="mt-3 text-4xl font-bold md:text-5xl">
                {ouName} Organizational Unit
              </h1>

              <p className="mt-3 max-w-3xl text-slate-300">
                Review user accounts, account health,
                directory access and administrative risk
                within the {ouName} organizational unit.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void loadUsers()}
                className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 font-semibold hover:bg-white/20"
              >
                Refresh Data
              </button>

              <Link
                href={`/users/create?department=${encodeURIComponent(
                  ouName
                )}`}
                className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 font-semibold text-slate-900 hover:bg-slate-100"
              >
                + Create User
              </Link>
            </div>
          </div>
        </section>

        {error && (
          <section className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
            <h2 className="font-bold">
              Unable to load directory data
            </h2>

            <p className="mt-2 break-words text-sm">
              {error}
            </p>
          </section>
        )}

        {/* Statistics */}
        <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Total Users"
            value={statistics.total}
            description="Accounts assigned to this OU"
          />

          <MetricCard
            label="Enabled"
            value={statistics.enabled}
            description="Allowed to sign in"
          />

          <MetricCard
            label="Disabled"
            value={statistics.disabled}
            description="Access currently blocked"
          />

          <MetricCard
            label="Locked"
            value={statistics.locked}
            description="Requires administrator review"
          />

          <MetricCard
            label="Incomplete Records"
            value={statistics.missingEmployeeDetails}
            description="Missing directory attributes"
          />
        </section>

        {/* Health summary */}
        <section className="mt-8 rounded-2xl bg-white p-7 shadow">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                OU Security Posture
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Access Governance Summary
              </h2>

              <p className="mt-2 text-slate-500">
                Risk status is calculated from locked
                accounts, disabled accounts and incomplete
                identity records.
              </p>
            </div>

            <span
              className={`inline-flex w-fit rounded-full px-5 py-2 font-semibold ${riskLevel.style}`}
            >
              {riskLevel.label}
            </span>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-3">
            <ComplianceItem
              label="Locked accounts"
              value={
                statistics.locked === 0
                  ? "No immediate lockout risk"
                  : `${statistics.locked} account(s) require review`
              }
              healthy={statistics.locked === 0}
            />

            <ComplianceItem
              label="Disabled accounts"
              value={
                statistics.disabled === 0
                  ? "No disabled accounts"
                  : `${statistics.disabled} disabled account(s)`
              }
              healthy={statistics.disabled === 0}
            />

            <ComplianceItem
              label="Identity completeness"
              value={
                statistics.missingEmployeeDetails === 0
                  ? "All required attributes present"
                  : `${statistics.missingEmployeeDetails} incomplete record(s)`
              }
              healthy={
                statistics.missingEmployeeDetails === 0
              }
            />
          </div>
        </section>

        <div className="mt-8 grid gap-8 xl:grid-cols-[1.7fr_1fr]">
          {/* Live users table */}
          <section className="overflow-hidden rounded-2xl bg-white shadow">
            <div className="flex flex-col gap-4 border-b p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  Live Directory Accounts
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Users currently assigned to the {ouName} OU.
                </p>
              </div>

              <Link
                href="/users"
                className="font-semibold text-blue-600 hover:text-blue-800"
              >
                View full directory →
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-100 text-left">
                  <tr>
                    <th className="px-6 py-4">
                      User
                    </th>

                    <th className="px-6 py-4">
                      Job Title
                    </th>

                    <th className="px-6 py-4">
                      Status
                    </th>

                    <th className="px-6 py-4">
                      Lock State
                    </th>

                    <th className="px-6 py-4">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {ouUsers.length > 0 ? (
                    ouUsers.map((user, index) => {
                      const username =
                        user.username ||
                        user.samAccountName ||
                        "";

                      const displayName =
                        user.displayName ||
                        user.name ||
                        username ||
                        "Unknown User";

                      return (
                        <tr
                          key={
                            username ||
                            `${displayName}-${index}`
                          }
                          className="border-t transition hover:bg-slate-50"
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 font-bold text-white">
                                {getInitials(displayName)}
                              </div>

                              <div>
                                <p className="font-semibold">
                                  {displayName}
                                </p>

                                <p className="text-sm text-slate-500">
                                  {username || "No username"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-5 text-slate-600">
                            {user.title || "Not assigned"}
                          </td>

                          <td className="px-6 py-5">
                            <AccountBadge
                              enabled={user.enabled !== false}
                            />
                          </td>

                          <td className="px-6 py-5">
                            <LockBadge
                              locked={user.lockedOut === true}
                            />
                          </td>

                          <td className="px-6 py-5">
                            {username ? (
                              <Link
                                href={`/users/${encodeURIComponent(
                                  username
                                )}`}
                                className="inline-flex rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-700"
                              >
                                Manage
                              </Link>
                            ) : (
                              <span className="text-sm text-slate-400">
                                Unavailable
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-14 text-center text-slate-500"
                      >
                        No live users were found in this
                        organizational unit.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Access groups */}
          <section className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-2xl font-bold">
              Access Groups
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Groups associated with this organizational
              unit based on the lab configuration.
            </p>

            <div className="mt-6 space-y-4">
              {securityGroups.length > 0 ? (
                securityGroups.map((group) => {
                  const privileged =
                    privilegedGroupNames.includes(group);

                  return (
                    <div
                      key={group}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <p className="font-semibold">
                          {group}
                        </p>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            privileged
                              ? "bg-red-100 text-red-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {privileged
                            ? "Privileged"
                            : "Standard"}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-slate-500">
                        {privileged
                          ? "Administrative access should be reviewed regularly."
                          : "Standard departmental access group."}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="rounded-xl bg-slate-100 p-4 text-slate-500">
                  No access groups were identified.
                </p>
              )}
            </div>

            <div className="mt-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
              <p className="font-semibold text-yellow-800">
                Access review notice
              </p>

              <p className="mt-2 text-sm text-yellow-700">
                Group names shown here are based on your lab
                configuration. Live group-management endpoints
                can be added later.
              </p>
            </div>
          </section>
        </div>

        {/* Actions */}
        <section className="mt-8 rounded-2xl bg-white p-7 shadow">
          <h2 className="text-2xl font-bold">
            Controlled Administrative Actions
          </h2>

          <p className="mt-2 text-slate-500">
            Common identity-lifecycle and access-review workflows.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ActionLink
              href={`/users/create?department=${encodeURIComponent(
                ouName
              )}`}
              title="Provision User"
              description={`Create a new account in ${ouName}.`}
            />

            <ActionLink
              href="/users"
              title="Review Accounts"
              description="Search and manage directory identities."
            />

            <ActionLink
              href="/reports"
              title="Generate Evidence"
              description="Create identity and audit reports."
            />

            <ActionLink
              href="/active-directory"
              title="Directory Overview"
              description="Return to the full AD operations view."
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow">
      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-3 text-4xl font-bold">
        {value}
      </p>

      <p className="mt-3 text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}

function ComplianceItem({
  label,
  value,
  healthy,
}: {
  label: string;
  value: string;
  healthy: boolean;
}) {
  return (
    <div className="rounded-xl bg-slate-100 p-4">
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p
        className={`mt-2 font-semibold ${
          healthy ? "text-green-700" : "text-yellow-700"
        }`}
      >
        {healthy ? "✓ " : "⚠ "}
        {value}
      </p>
    </div>
  );
}

function AccountBadge({
  enabled,
}: {
  enabled: boolean;
}) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-sm font-semibold ${
        enabled
          ? "bg-green-100 text-green-700"
          : "bg-red-100 text-red-700"
      }`}
    >
      {enabled ? "Enabled" : "Disabled"}
    </span>
  );
}

function LockBadge({
  locked,
}: {
  locked: boolean;
}) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-sm font-semibold ${
        locked
          ? "bg-red-100 text-red-700"
          : "bg-slate-100 text-slate-700"
      }`}
    >
      {locked ? "Locked" : "Not locked"}
    </span>
  );
}

function ActionLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-200 p-5 transition hover:border-blue-300 hover:bg-blue-50"
    >
      <p className="font-bold">
        {title}
      </p>

      <p className="mt-2 text-sm text-slate-500">
        {description}
      </p>
    </Link>
  );
}

function normaliseDepartment(value?: string) {
  const normalised = String(value || "")
    .trim()
    .toLowerCase();

  if (normalised === "human resources") {
    return "hr";
  }

  return normalised;
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