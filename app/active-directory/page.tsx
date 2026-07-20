"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

type DirectoryUser = {
  id?: number;
  name?: string;
  username?: string;
  department?: string;
  enabled?: boolean;
  lockedOut?: boolean;
  status?: string;
};

type RiskLevel = "healthy" | "review" | "critical";

type OrganizationalUnitSummary = {
  name: string;
  userCount: number;
  enabledCount: number;
  disabledCount: number;
  lockedCount: number;
  unassignedCount: number;
  riskLevel: RiskLevel;
  riskScore: number;
  reason: string;
};

const departments = [
  "IT",
  "Finance",
  "HR",
  "Sales",
  "Marketing",
  "Operations",
  "Executive",
  "Customer Support",
];

export default function ActiveDirectoryPage() {
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastSuccessfulSync, setLastSuccessfulSync] =
    useState<Date | null>(null);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<
    "all" | RiskLevel
  >("all");

  async function loadUsers(showRefresh = false) {
    if (showRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

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
            : "Unable to retrieve Active Directory users.";

        throw new Error(errorMessage);
      }

      if (!Array.isArray(data)) {
        throw new Error(
          "The users API did not return a directory user list."
        );
      }

      setUsers(data as DirectoryUser[]);
      setLastSuccessfulSync(new Date());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to retrieve Active Directory users."
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    void loadUsers();

    const refreshInterval = window.setInterval(() => {
      void loadUsers(true);
    }, 60000);

    return () => {
      window.clearInterval(refreshInterval);
    };
  }, []);

  const statistics = useMemo(() => {
    const enabledUsers = users.filter(
      (user) => user.enabled !== false
    ).length;

    const disabledUsers = users.filter(
      (user) => user.enabled === false
    ).length;

    const lockedUsers = users.filter(
      (user) => user.lockedOut === true
    ).length;

    const unassignedUsers = users.filter(
      (user) =>
        !normaliseDepartment(user.department) ||
        normaliseDepartment(user.department) ===
          "not assigned"
    ).length;

    const directoryCoverage =
      users.length === 0
        ? 0
        : Math.round(
            ((users.length - unassignedUsers) /
              users.length) *
              100
          );

    const healthScore =
      users.length === 0
        ? 0
        : Math.max(
            0,
            Math.round(
              100 -
                (lockedUsers / users.length) * 55 -
                (disabledUsers / users.length) * 25 -
                (unassignedUsers / users.length) * 20
            )
          );

    return {
      totalUsers: users.length,
      enabledUsers,
      disabledUsers,
      lockedUsers,
      unassignedUsers,
      directoryCoverage,
      healthScore,
    };
  }, [users]);

  const organizationalUnits = useMemo<
    OrganizationalUnitSummary[]
  >(() => {
    return departments.map((department) => {
      const matchingUsers = users.filter(
        (user) =>
          normaliseDepartment(user.department) ===
          normaliseDepartment(department)
      );

      const enabledCount = matchingUsers.filter(
        (user) => user.enabled !== false
      ).length;

      const disabledCount = matchingUsers.filter(
        (user) => user.enabled === false
      ).length;

      const lockedCount = matchingUsers.filter(
        (user) => user.lockedOut === true
      ).length;

      const unassignedCount = matchingUsers.filter(
        (user) => !user.username || !user.name
      ).length;

      let riskLevel: RiskLevel = "healthy";
      let reason = "No account risks detected";

      if (lockedCount > 0) {
        riskLevel = "critical";
        reason = `${lockedCount} locked ${
          lockedCount === 1 ? "account" : "accounts"
        } require administrator action`;
      } else if (
        disabledCount > 0 ||
        unassignedCount > 0
      ) {
        riskLevel = "review";
        reason =
          disabledCount > 0
            ? `${disabledCount} disabled ${
                disabledCount === 1
                  ? "account"
                  : "accounts"
              } require review`
            : "Incomplete account metadata detected";
      }

      const riskScore = Math.max(
        0,
        Math.round(
          100 -
            lockedCount * 35 -
            disabledCount * 12 -
            unassignedCount * 8
        )
      );

      return {
        name: department,
        userCount: matchingUsers.length,
        enabledCount,
        disabledCount,
        lockedCount,
        unassignedCount,
        riskLevel,
        riskScore,
        reason,
      };
    });
  }, [users]);

  const visibleOrganizationalUnits = useMemo(() => {
    const query = search.trim().toLowerCase();

    return organizationalUnits
      .filter((organizationalUnit) => {
        const matchesSearch =
          !query ||
          organizationalUnit.name
            .toLowerCase()
            .includes(query);

        const matchesRisk =
          riskFilter === "all" ||
          organizationalUnit.riskLevel === riskFilter;

        return matchesSearch && matchesRisk;
      })
      .sort((first, second) => {
        const priority = {
          critical: 0,
          review: 1,
          healthy: 2,
        };

        const riskDifference =
          priority[first.riskLevel] -
          priority[second.riskLevel];

        if (riskDifference !== 0) {
          return riskDifference;
        }

        return second.userCount - first.userCount;
      });
  }, [organizationalUnits, riskFilter, search]);

  const recommendations = useMemo(() => {
    const items: {
      title: string;
      detail: string;
      level: RiskLevel;
      href: string;
    }[] = [];

    if (statistics.lockedUsers > 0) {
      items.push({
        title: "Review locked accounts",
        detail: `${statistics.lockedUsers} ${
          statistics.lockedUsers === 1
            ? "account is"
            : "accounts are"
        } blocked and may require identity verification.`,
        level: "critical",
        href: "/users",
      });
    }

    if (statistics.disabledUsers > 0) {
      items.push({
        title: "Validate disabled identities",
        detail: `${statistics.disabledUsers} disabled ${
          statistics.disabledUsers === 1
            ? "account"
            : "accounts"
        } should be confirmed against current employment status.`,
        level: "review",
        href: "/users",
      });
    }

    if (statistics.unassignedUsers > 0) {
      items.push({
        title: "Complete directory metadata",
        detail: `${statistics.unassignedUsers} ${
          statistics.unassignedUsers === 1
            ? "identity is"
            : "identities are"
        } missing a valid department assignment.`,
        level: "review",
        href: "/users",
      });
    }

    if (items.length === 0) {
      items.push({
        title: "No immediate remediation required",
        detail:
          "No locked accounts, disabled-account exceptions or missing department assignments were detected.",
        level: "healthy",
        href: "/users",
      });
    }

    return items;
  }, [statistics]);

  return (
    <main className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <div className="min-w-0 flex-1">
        <Header />

        <div className="p-6 md:p-8 lg:p-10">
          <section className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-600">
                Identity Operations Center
              </p>

              <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                Active Directory
              </h1>

              <p className="mt-3 max-w-3xl text-slate-500">
                Live identity posture, organizational-unit
                risk assessment and administrator workflows
                retrieved from the Windows Server domain.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void loadUsers(true)}
                disabled={isRefreshing}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800 transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRefreshing
                  ? "Synchronizing..."
                  : "Synchronize Directory"}
              </button>

              <Link
                href="/users/create"
                className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-5 py-3 font-bold text-white transition hover:bg-slate-800"
              >
                + Provision Identity
              </Link>
            </div>
          </section>

          {error && (
            <section className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6">
              <p className="font-bold text-red-800">
                Directory telemetry unavailable
              </p>

              <p className="mt-2 break-words text-sm text-red-700">
                {error}
              </p>

              <button
                type="button"
                onClick={() => void loadUsers()}
                className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800"
              >
                Retry connection
              </button>
            </section>
          )}

          <section className="mt-8 overflow-hidden rounded-3xl bg-slate-950 text-white shadow-2xl">
            <div className="grid gap-8 p-7 xl:grid-cols-[1.35fr_0.65fr] xl:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-300">
                    Domain control plane
                  </p>

                  <span className="rounded-full border border-green-400/30 bg-green-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-300">
                    Live identity telemetry
                  </span>
                </div>

                <h2 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
                  contoso.local
                </h2>

                <p className="mt-3 max-w-2xl text-slate-300">
                  Identity data is queried through the
                  Enterprise API and PowerShell automation
                  layer from the domain environment.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <ControlStatus
                    label="Enterprise API"
                    value={error ? "Unavailable" : "Online"}
                    healthy={!error}
                  />

                  <ControlStatus
                    label="Domain Controller"
                    value="DC01"
                    healthy={!error}
                  />

                  <ControlStatus
                    label="Directory Sync"
                    value={
                      lastSuccessfulSync
                        ? "Current"
                        : "Pending"
                    }
                    healthy={Boolean(lastSuccessfulSync)}
                  />
                </div>

                <p className="mt-5 text-sm text-slate-400">
                  Last successful synchronization:{" "}
                  {lastSuccessfulSync
                    ? formatDate(lastSuccessfulSync)
                    : "Waiting for first successful query"}
                </p>
              </div>

              <HealthScore
                score={statistics.healthScore}
                totalUsers={statistics.totalUsers}
              />
            </div>
          </section>

          <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              label="Managed Identities"
              value={statistics.totalUsers}
              description="Live directory accounts"
            />

            <MetricCard
              label="Enabled"
              value={statistics.enabledUsers}
              description="Sign-in permitted"
              tone="healthy"
            />

            <MetricCard
              label="Disabled"
              value={statistics.disabledUsers}
              description="Lifecycle review"
              tone={
                statistics.disabledUsers > 0
                  ? "review"
                  : "healthy"
              }
            />

            <MetricCard
              label="Locked"
              value={statistics.lockedUsers}
              description="Immediate attention"
              tone={
                statistics.lockedUsers > 0
                  ? "critical"
                  : "healthy"
              }
            />

            <MetricCard
              label="OU Coverage"
              value={`${statistics.directoryCoverage}%`}
              description="Department assignment"
              tone={
                statistics.directoryCoverage >= 95
                  ? "healthy"
                  : "review"
              }
            />
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-[1.45fr_0.55fr]">
            <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
              <div className="border-b border-slate-200 p-6">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                      Identity governance
                    </p>

                    <h2 className="mt-2 text-2xl font-black text-slate-950">
                      Organizational Unit Posture
                    </h2>

                    <p className="mt-2 text-sm text-slate-500">
                      Units are automatically prioritized by
                      account risk and administrator attention.
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <FilterButton
                        label="All"
                        count={organizationalUnits.length}
                        active={riskFilter === "all"}
                        onClick={() => setRiskFilter("all")}
                      />

                      <FilterButton
                        label="Healthy"
                        count={
                          organizationalUnits.filter(
                            (item) =>
                              item.riskLevel === "healthy"
                          ).length
                        }
                        active={riskFilter === "healthy"}
                        onClick={() =>
                          setRiskFilter("healthy")
                        }
                      />

                      <FilterButton
                        label="Review"
                        count={
                          organizationalUnits.filter(
                            (item) =>
                              item.riskLevel === "review"
                          ).length
                        }
                        active={riskFilter === "review"}
                        onClick={() =>
                          setRiskFilter("review")
                        }
                      />

                      <FilterButton
                        label="Critical"
                        count={
                          organizationalUnits.filter(
                            (item) =>
                              item.riskLevel === "critical"
                          ).length
                        }
                        active={riskFilter === "critical"}
                        onClick={() =>
                          setRiskFilter("critical")
                        }
                      />
                    </div>
                  </div>

                  <input
                    type="search"
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search organizational units..."
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 xl:max-w-sm"
                  />
                </div>
              </div>

              {isLoading ? (
                <LoadingTable />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[920px]">
                      <thead className="bg-slate-100 text-left text-sm text-slate-600">
                        <tr>
                          <th className="px-6 py-4">
                            Organizational Unit
                          </th>

                          <th className="px-6 py-4">
                            Identities
                          </th>

                          <th className="px-6 py-4">
                            Exceptions
                          </th>

                          <th className="px-6 py-4">
                            Risk Score
                          </th>

                          <th className="px-6 py-4">
                            Posture
                          </th>

                          <th className="px-6 py-4">
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {visibleOrganizationalUnits.map(
                          (organizationalUnit) => (
                            <tr
                              key={organizationalUnit.name}
                              className="border-t border-slate-100 transition hover:bg-slate-50"
                            >
                              <td className="px-6 py-5">
                                <p className="font-bold text-slate-950">
                                  {organizationalUnit.name}
                                </p>

                                <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
                                  {organizationalUnit.reason}
                                </p>
                              </td>

                              <td className="px-6 py-5">
                                <p className="font-bold text-slate-900">
                                  {
                                    organizationalUnit.userCount
                                  }
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {
                                    organizationalUnit.enabledCount
                                  }{" "}
                                  enabled
                                </p>
                              </td>

                              <td className="px-6 py-5">
                                <p className="font-semibold text-slate-800">
                                  {
                                    organizationalUnit.disabledCount
                                  }{" "}
                                  disabled
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {
                                    organizationalUnit.lockedCount
                                  }{" "}
                                  locked
                                </p>
                              </td>

                              <td className="px-6 py-5">
                                <RiskScoreBar
                                  score={
                                    organizationalUnit.riskScore
                                  }
                                />
                              </td>

                              <td className="px-6 py-5">
                                <RiskBadge
                                  level={
                                    organizationalUnit.riskLevel
                                  }
                                />
                              </td>

                              <td className="px-6 py-5">
                                <Link
                                  href={`/organizational-units/${encodeURIComponent(
                                    organizationalUnit.name
                                  )}`}
                                  className="inline-flex rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700"
                                >
                                  Inspect
                                </Link>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>

                  {visibleOrganizationalUnits.length === 0 && (
                    <div className="p-12 text-center">
                      <p className="font-bold text-slate-700">
                        No organizational units match the
                        current filters.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                Prioritized remediation
              </p>

              <h2 className="mt-2 text-2xl font-black text-slate-950">
                Identity Recommendations
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Suggested administrator actions derived from
                the current account posture.
              </p>

              <div className="mt-6 space-y-4">
                {recommendations.map(
                  (recommendation, index) => (
                    <RecommendationCard
                      key={`${recommendation.title}-${index}`}
                      index={index + 1}
                      title={recommendation.title}
                      detail={recommendation.detail}
                      level={recommendation.level}
                      href={recommendation.href}
                    />
                  )
                )}
              </div>

              <div className="mt-6 border-t border-slate-200 pt-6">
                <p className="text-sm font-bold text-slate-900">
                  Administrative workflows
                </p>

                <div className="mt-4 grid gap-3">
                  <OperationLink
                    href="/users"
                    title="Manage identities"
                    description="Search accounts and perform lifecycle actions."
                  />

                  <OperationLink
                    href="/users/create"
                    title="Provision identity"
                    description="Create an account with OU and group assignment."
                  />

                  <OperationLink
                    href="/reports"
                    title="Identity reports"
                    description="Review account and audit information."
                  />
                </div>
              </div>
            </section>
          </section>

          <section className="mt-8 grid gap-6 lg:grid-cols-3">
            <GovernanceCard
              title="Live Directory Telemetry"
              description="Identity data is retrieved through the Enterprise API and PowerShell rather than hardcoded frontend records."
            />

            <GovernanceCard
              title="Risk-Based Prioritization"
              description="Locked accounts, disabled identities and incomplete OU assignments are scored and surfaced for review."
            />

            <GovernanceCard
              title="Identity Lifecycle Operations"
              description="Provisioning, account management, organizational-unit inspection and reporting remain connected workflows."
            />
          </section>
        </div>
      </div>
    </main>
  );
}

function HealthScore({
  score,
  totalUsers,
}: {
  score: number;
  totalUsers: number;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
        Identity security score
      </p>

      <div className="mt-5 flex items-center gap-6">
        <div
          className="relative grid h-32 w-32 shrink-0 place-items-center rounded-full"
          style={{
            background: `conic-gradient(rgb(74 222 128) ${
              score * 3.6
            }deg, rgb(30 41 59) 0deg)`,
          }}
        >
          <div className="grid h-24 w-24 place-items-center rounded-full bg-slate-950">
            <div className="text-center">
              <p className="text-3xl font-black">
                {score}
              </p>

              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                of 100
              </p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xl font-bold">
            {getScoreLabel(score)}
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Calculated from {totalUsers} live identities,
            account availability and OU assignment coverage.
          </p>
        </div>
      </div>
    </div>
  );
}

function ControlStatus({
  label,
  value,
  healthy,
}: {
  label: string;
  value: string;
  healthy: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/10 px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p
        className={`mt-2 font-bold ${
          healthy
            ? "text-green-300"
            : "text-red-300"
        }`}
      >
        <span className="mr-2">●</span>
        {value}
      </p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  description,
  tone = "default",
}: {
  label: string;
  value: number | string;
  description: string;
  tone?: "default" | "healthy" | "review" | "critical";
}) {
  const valueStyle = {
    default: "text-slate-950",
    healthy: "text-green-600",
    review: "text-amber-600",
    critical: "text-red-600",
  }[tone];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <p
        className={`mt-3 text-4xl font-black ${valueStyle}`}
      >
        {value}
      </p>

      <p className="mt-3 text-sm text-slate-500">
        {description}
      </p>
    </section>
  );
}

function FilterButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
        active
          ? "border-slate-950 bg-slate-950 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700"
      }`}
    >
      {label}

      <span
        className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
          active
            ? "bg-white/15 text-white"
            : "bg-slate-100 text-slate-600"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function RiskScoreBar({
  score,
}: {
  score: number;
}) {
  const safeScore = Math.min(
    Math.max(score, 0),
    100
  );

  const barStyle =
    safeScore >= 90
      ? "bg-green-500"
      : safeScore >= 70
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div className="min-w-32">
      <div className="flex items-center justify-between text-sm">
        <span className="font-bold text-slate-900">
          {safeScore}
        </span>

        <span className="text-xs text-slate-500">
          /100
        </span>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full ${barStyle}`}
          style={{
            width: `${safeScore}%`,
          }}
        />
      </div>
    </div>
  );
}

function RiskBadge({
  level,
}: {
  level: RiskLevel;
}) {
  const configuration = {
    healthy: {
      label: "Healthy",
      style: "bg-green-100 text-green-700",
    },
    review: {
      label: "Review",
      style: "bg-amber-100 text-amber-700",
    },
    critical: {
      label: "Critical",
      style: "bg-red-100 text-red-700",
    },
  }[level];

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${configuration.style}`}
    >
      {configuration.label}
    </span>
  );
}

function RecommendationCard({
  index,
  title,
  detail,
  level,
  href,
}: {
  index: number;
  title: string;
  detail: string;
  level: RiskLevel;
  href: string;
}) {
  const style = {
    healthy:
      "border-green-200 bg-green-50",
    review:
      "border-amber-200 bg-amber-50",
    critical:
      "border-red-200 bg-red-50",
  }[level];

  return (
    <Link
      href={href}
      className={`block rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:shadow-md ${style}`}
    >
      <div className="flex items-start gap-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-sm font-black text-slate-700 shadow-sm">
          {index}
        </span>

        <div>
          <p className="font-bold text-slate-950">
            {title}
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            {detail}
          </p>
        </div>
      </div>
    </Link>
  );
}

function OperationLink({
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
      className="block rounded-xl border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-blue-50"
    >
      <p className="font-bold text-slate-900">
        {title}
      </p>

      <p className="mt-1 text-sm leading-5 text-slate-500">
        {description}
      </p>
    </Link>
  );
}

function GovernanceCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="font-bold text-slate-950">
        {title}
      </p>

      <p className="mt-3 text-sm leading-6 text-slate-500">
        {description}
      </p>
    </section>
  );
}

function LoadingTable() {
  return (
    <div className="space-y-4 p-6">
      {[1, 2, 3, 4, 5].map((item) => (
        <div
          key={item}
          className="grid animate-pulse gap-4 rounded-xl bg-slate-50 p-5 md:grid-cols-5"
        >
          <div className="h-4 rounded bg-slate-200" />
          <div className="h-4 rounded bg-slate-200" />
          <div className="h-4 rounded bg-slate-200" />
          <div className="h-4 rounded bg-slate-200" />
          <div className="h-4 rounded bg-slate-200" />
        </div>
      ))}
    </div>
  );
}

function getScoreLabel(score: number) {
  if (score >= 90) return "Strong identity posture";
  if (score >= 75) return "Operational with reviews";
  if (score >= 50) return "Attention required";
  return "Critical remediation required";
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}

function normaliseDepartment(value?: string) {
  const normalised = String(value || "")
    .trim()
    .toLowerCase();

  if (normalised === "human resources") {
    return "hr";
  }

  if (normalised === "customer support") {
    return "customer support";
  }

  return normalised;
}