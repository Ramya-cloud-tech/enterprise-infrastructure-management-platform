"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import StatCard from "./components/StatCard";
import RecentActivity from "./components/RecentActivity";
import DepartmentChart from "./components/DepartmentChart";

type DirectoryUser = {
  username?: string;
  name?: string;
  department?: string;
  enabled?: boolean;
  lockedOut?: boolean;
};

type AuditLog = {
  id?: string;
  administrator?: string;
  action?: string;
  username?: string;
  details?: string;
  status?: string;
  timestamp?: string;
  createdAt?: string;
};

type AuditLogResponse =
  | AuditLog[]
  | {
      success?: boolean;
      logs?: AuditLog[];
      data?: AuditLog[];
    };

type FileShare = {
  name?: string;
  path?: string;
  shareName?: string;
  sizeBytes?: number;
  fileCount?: number;
  folderCount?: number;
};

type FileShareResponse =
  | FileShare[]
  | {
      success?: boolean;
      shares?: FileShare[];
      fileShares?: FileShare[];
      data?: FileShare[];
    };

type ServiceStatus = "online" | "warning" | "offline";

type InfrastructureState = {
  users: DirectoryUser[];
  auditLogs: AuditLog[];
  fileShares: FileShare[];
  apiStatus: ServiceStatus;
  directoryStatus: ServiceStatus;
  fileServerStatus: ServiceStatus;
  auditStatus: ServiceStatus;
  refreshDuration: number | null;
};

const initialInfrastructureState: InfrastructureState = {
  users: [],
  auditLogs: [],
  fileShares: [],
  apiStatus: "warning",
  directoryStatus: "warning",
  fileServerStatus: "warning",
  auditStatus: "warning",
  refreshDuration: null,
};

export default function Home() {
  const [infrastructure, setInfrastructure] =
    useState<InfrastructureState>(
      initialInfrastructureState
    );

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError("");

    const requestStarted = performance.now();

    const [usersResult, auditResult, sharesResult] =
      await Promise.allSettled([
        fetchJson<DirectoryUser[]>("/api/users"),
        fetchJson<AuditLogResponse>("/api/audit-logs"),
        fetchJson<FileShareResponse>("/api/file-shares"),
      ]);

    const requestFinished = performance.now();
    const refreshDuration = Math.round(
      requestFinished - requestStarted
    );

    const users =
      usersResult.status === "fulfilled" &&
      Array.isArray(usersResult.value)
        ? usersResult.value
        : [];

    const auditLogs =
      auditResult.status === "fulfilled"
        ? extractAuditLogs(auditResult.value)
        : [];

    const fileShares =
      sharesResult.status === "fulfilled"
        ? extractFileShares(sharesResult.value)
        : [];

    const apiStatus: ServiceStatus =
      usersResult.status === "fulfilled"
        ? "online"
        : "offline";

    const directoryStatus: ServiceStatus =
      usersResult.status === "fulfilled"
        ? "online"
        : "offline";

    const fileServerStatus: ServiceStatus =
      sharesResult.status === "fulfilled"
        ? "online"
        : "offline";

    const auditStatus: ServiceStatus =
      auditResult.status === "fulfilled"
        ? "online"
        : "offline";

    setInfrastructure({
      users,
      auditLogs,
      fileShares,
      apiStatus,
      directoryStatus,
      fileServerStatus,
      auditStatus,
      refreshDuration,
    });

    const failedServices = [
      usersResult.status === "rejected"
        ? "Active Directory"
        : null,
      auditResult.status === "rejected"
        ? "Audit service"
        : null,
      sharesResult.status === "rejected"
        ? "File server"
        : null,
    ].filter(Boolean);

    if (failedServices.length > 0) {
      setError(
        `${failedServices.join(
          ", "
        )} could not be reached. Other available services are still displayed.`
      );
    }

    setLastUpdated(new Date());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadDashboard();

    const refreshTimer = window.setInterval(() => {
      void loadDashboard();
    }, 60_000);

    return () => window.clearInterval(refreshTimer);
  }, [loadDashboard]);

  const statistics = useMemo(() => {
    const enabledUsers = infrastructure.users.filter(
      (user) => user.enabled !== false
    ).length;

    const disabledUsers = infrastructure.users.filter(
      (user) => user.enabled === false
    ).length;

    const lockedUsers = infrastructure.users.filter(
      (user) => user.lockedOut === true
    ).length;

    const departments = new Set(
      infrastructure.users
        .map((user) =>
          normaliseDepartment(user.department)
        )
        .filter(Boolean)
    );

    return {
      totalUsers: infrastructure.users.length,
      enabledUsers,
      disabledUsers,
      lockedUsers,
      departments: departments.size,
      fileShares: infrastructure.fileShares.length,
      auditEvents: infrastructure.auditLogs.length,
    };
  }, [infrastructure]);

  const infrastructureScore = useMemo(() => {
    const statuses = [
      infrastructure.apiStatus,
      infrastructure.directoryStatus,
      infrastructure.fileServerStatus,
      infrastructure.auditStatus,
    ];

    let score = statuses.reduce((total, status) => {
      if (status === "online") return total + 25;
      if (status === "warning") return total + 12;
      return total;
    }, 0);

    if (statistics.lockedUsers > 0) score -= 8;
    if (statistics.disabledUsers > 0) score -= 4;
    if (statistics.fileShares === 0) score -= 4;
    if (statistics.auditEvents === 0) score -= 4;
    if (
      infrastructure.refreshDuration !== null &&
      infrastructure.refreshDuration > 3000
    ) {
      score -= 3;
    }

    return Math.max(0, Math.min(100, score));
  }, [infrastructure, statistics]);

  const serviceStatuses = [
  infrastructure.apiStatus,
  infrastructure.directoryStatus,
  infrastructure.fileServerStatus,
  infrastructure.auditStatus,
];

const overallStatus: ServiceStatus =
  serviceStatuses.some((status) => status === "offline")
    ? "offline"
    : serviceStatuses.some((status) => status === "warning")
      ? "warning"
      : "online";

  return (
    <main className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <div className="min-w-0 flex-1">
        <Header />

        <div className="p-5 md:p-8">
          {/* Hero */}
          <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 px-6 py-8 text-white shadow-2xl md:px-9">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl" />
            <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />

            <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-400">
                    Hybrid Infrastructure Operations
                  </p>

                  <StatusPill
                    status={overallStatus}
                    text={
                      overallStatus === "online"
                        ? "All core services operational"
                        : overallStatus === "warning"
                          ? "Partial service degradation"
                          : "Infrastructure unavailable"
                    }
                  />
                </div>

                <h1 className="mt-4 max-w-4xl text-3xl font-bold tracking-tight md:text-5xl">
                  Enterprise Operations Center
                </h1>

                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
                  Unified monitoring for Active Directory,
                  Windows infrastructure, PowerShell automation,
                  file services and enterprise audit activity.
                </p>

                <div className="mt-6 flex flex-wrap gap-3 text-xs text-slate-400">
                  <span>Domain: contoso.local</span>
                  <span>•</span>
                  <span>
                    Auto-refresh: 60 seconds
                  </span>
                  <span>•</span>
                  <span>
                    Last sync:{" "}
                    {lastUpdated
                      ? lastUpdated.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })
                      : "Waiting"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row xl:flex-col">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Infrastructure score
                  </p>

                  <div className="mt-2 flex items-end gap-2">
                    <p className="text-4xl font-bold">
                      {infrastructureScore}
                    </p>
                    <p className="pb-1 text-slate-400">
                      / 100
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void loadDashboard()}
                  disabled={isLoading}
                  className="rounded-2xl bg-blue-600 px-6 py-4 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading
                    ? "Running health checks..."
                    : "Run Health Check"}
                </button>
              </div>
            </div>
          </section>

          {error && (
            <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="font-bold text-amber-900">
                Partial infrastructure warning
              </p>

              <p className="mt-2 text-sm text-amber-700">
                {error}
              </p>
            </section>
          )}

          {/* Statistics */}
          <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Directory Users"
              value={statistics.totalUsers}
            />

            <StatCard
              title="Enabled Accounts"
              value={statistics.enabledUsers}
            />

            <StatCard
              title="File Shares"
              value={statistics.fileShares}
            />

            <StatCard
              title="Audit Events"
              value={statistics.auditEvents}
            />
          </section>

          {/* Live topology */}
          <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-slate-900">
                    Live Infrastructure Topology
                  </h2>

                  <span className="flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                    LIVE
                  </span>
                </div>

                <p className="mt-2 text-sm text-slate-500">
                  Real-time connectivity and service health
                  across the enterprise administration stack.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <LegendItem
                  label="Online"
                  status="online"
                />
                <LegendItem
                  label="Degraded"
                  status="warning"
                />
                <LegendItem
                  label="Offline"
                  status="offline"
                />
              </div>
            </div>

            <div className="relative min-h-[680px] overflow-hidden bg-slate-950 p-5 md:p-10">
              <div className="topology-grid absolute inset-0 opacity-30" />

              <div className="relative mx-auto flex max-w-6xl flex-col items-center">
                <TopologyNode
                  title="Next.js Portal"
                  subtitle="Administrator Interface"
                  status="online"
                  metric="Frontend operational"
                  icon="UI"
                  href="/"
                />

                <VerticalConnection
                  active={
                    infrastructure.apiStatus === "online"
                  }
                />

                <TopologyNode
                  title="Enterprise API"
                  subtitle="Express REST Gateway"
                  status={infrastructure.apiStatus}
                  metric={
                    infrastructure.refreshDuration !== null
                      ? `${formatDuration(
                          infrastructure.refreshDuration
                        )} health check`
                      : "No response"
                  }
                  icon="API"
                  href="/settings"
                />

                <VerticalConnection
                  active={
                    infrastructure.directoryStatus ===
                    "online"
                  }
                />

                <TopologyNode
                  title="Windows Server"
                  subtitle="Infrastructure Host"
                  status={
                    infrastructure.apiStatus === "online"
                      ? "online"
                      : "offline"
                  }
                  metric="PowerShell execution layer"
                  icon="WS"
                  href="/settings"
                />

                <div className="relative mt-10 w-full">
                  <div className="absolute left-1/2 top-0 h-8 w-px -translate-x-1/2 bg-slate-600" />
                  <div className="absolute left-[16.5%] right-[16.5%] top-8 h-px bg-slate-600" />

                  <div className="grid gap-8 pt-16 md:grid-cols-3">
                    <TopologyNode
                      title="DC01"
                      subtitle="Active Directory"
                      status={
                        infrastructure.directoryStatus
                      }
                      metric={`${statistics.totalUsers} directory users`}
                      icon="AD"
                      href="/active-directory"
                      compact
                    />

                    <TopologyNode
                      title="File Services"
                      subtitle="SMB Share Infrastructure"
                      status={
                        infrastructure.fileServerStatus
                      }
                      metric={`${statistics.fileShares} active shares`}
                      icon="FS"
                      href="/file-server"
                      compact
                    />

                    <TopologyNode
                      title="Automation"
                      subtitle="PowerShell Engine"
                      status={
                        infrastructure.auditStatus
                      }
                      metric={`${statistics.auditEvents} recorded events`}
                      icon="PS"
                      href="/reports"
                      compact
                    />
                  </div>
                </div>

                <div className="mt-10 grid w-full gap-4 md:grid-cols-3">
                  <TopologyMetric
                    label="Account health"
                    value={
                      statistics.lockedUsers === 0
                        ? "No lockouts"
                        : `${statistics.lockedUsers} locked`
                    }
                    status={
                      statistics.lockedUsers === 0
                        ? "online"
                        : "warning"
                    }
                  />

                  <TopologyMetric
                    label="Department coverage"
                    value={`${statistics.departments} departments`}
                    status="online"
                  />

                  <TopologyMetric
                    label="Disabled identities"
                    value={`${statistics.disabledUsers} accounts`}
                    status={
                      statistics.disabledUsers > 0
                        ? "warning"
                        : "online"
                    }
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Operational status */}
          <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <ServiceCard
              title="Enterprise API"
              description="Express service gateway"
              status={infrastructure.apiStatus}
              detail={
                infrastructure.refreshDuration !== null
                  ? `${formatDuration(
                      infrastructure.refreshDuration
                    )} dashboard refresh`
                  : "Connection failed"
              }
            />

            <ServiceCard
              title="Identity Services"
              description="contoso.local directory"
              status={
                infrastructure.directoryStatus
              }
              detail={`${statistics.enabledUsers} enabled accounts`}
            />

            <ServiceCard
              title="File Services"
              description="Department SMB shares"
              status={
                infrastructure.fileServerStatus
              }
              detail={`${statistics.fileShares} shares discovered`}
            />

            <ServiceCard
              title="Audit Pipeline"
              description="Administrative evidence"
              status={infrastructure.auditStatus}
              detail={`${statistics.auditEvents} events available`}
            />
          </section>

          {/* Administrator actions */}
          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm md:p-8">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                  Controlled operations
                </p>

                <h2 className="mt-2 text-2xl font-bold text-slate-900">
                  Administrator Actions
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Execute common identity and infrastructure
                  administration workflows.
                </p>
              </div>

              <Link
                href="/reports"
                className="text-sm font-bold text-blue-600 hover:text-blue-700"
              >
                View operational reports →
              </Link>
            </div>

            <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <ActionLink
                href="/users/create"
                title="Create Identity"
                description="Provision a controlled Active Directory account."
                number="01"
              />

              <ActionLink
                href="/users"
                title="Manage Access"
                description="Reset, unlock, enable or disable identities."
                number="02"
              />

              <ActionLink
                href="/file-server"
                title="Inspect File Services"
                description="Review SMB shares, storage and permissions."
                number="03"
              />

              <ActionLink
                href="/reports"
                title="Generate Evidence"
                description="Export identity, infrastructure and audit reports."
                number="04"
              />
            </div>
          </section>

          {/* Existing live components */}
          <div className="mt-8 grid gap-8 xl:grid-cols-2">
            <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
              <RecentActivity />
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
              <DepartmentChart />
            </section>
          </div>
        </div>
      </div>

      <style jsx>{`
        .topology-grid {
          background-image:
            linear-gradient(
              rgba(148, 163, 184, 0.08) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(148, 163, 184, 0.08) 1px,
              transparent 1px
            );
          background-size: 32px 32px;
        }

        @keyframes dataFlow {
          0% {
            transform: translateY(-12px);
            opacity: 0;
          }

          20% {
            opacity: 1;
          }

          80% {
            opacity: 1;
          }

          100% {
            transform: translateY(62px);
            opacity: 0;
          }
        }

        .data-pulse {
          animation: dataFlow 2.4s linear infinite;
        }
      `}</style>
    </main>
  );
}

function TopologyNode({
  title,
  subtitle,
  status,
  metric,
  icon,
  href,
  compact = false,
}: {
  title: string;
  subtitle: string;
  status: ServiceStatus;
  metric: string;
  icon: string;
  href: string;
  compact?: boolean;
}) {
  const statusStyles = getStatusStyles(status);

  return (
    <Link
      href={href}
      className={`group relative z-10 block w-full rounded-2xl border bg-slate-900/95 shadow-2xl backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-blue-400 ${
        compact ? "max-w-none p-5" : "max-w-sm p-6"
      } ${statusStyles.border}`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-xs font-black ${statusStyles.icon}`}
        >
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-white">
                {title}
              </h3>

              <p className="mt-1 text-xs text-slate-400">
                {subtitle}
              </p>
            </div>

            <span
              className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${statusStyles.dot}`}
            />
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-700/70 pt-4">
            <p className="truncate text-xs text-slate-300">
              {metric}
            </p>

            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${statusStyles.text}`}
            >
              {status}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function VerticalConnection({
  active,
}: {
  active: boolean;
}) {
  return (
    <div className="relative h-20 w-8">
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-slate-600" />

      {active && (
        <div className="data-pulse absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-full bg-blue-400 shadow-[0_0_18px_rgba(96,165,250,0.95)]" />
      )}
    </div>
  );
}

function TopologyMetric({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: ServiceStatus;
}) {
  const styles = getStatusStyles(status);

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-400">
            {label}
          </p>

          <p className="mt-1 font-bold text-white">
            {value}
          </p>
        </div>

        <span
          className={`h-2.5 w-2.5 rounded-full ${styles.dot}`}
        />
      </div>
    </div>
  );
}

function ServiceCard({
  title,
  description,
  status,
  detail,
}: {
  title: string;
  description: string;
  status: ServiceStatus;
  detail: string;
}) {
  const styles = getStatusStyles(status);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-bold text-slate-900">
            {title}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {description}
          </p>
        </div>

        <span
          className={`h-3 w-3 rounded-full ${styles.dot}`}
        />
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <p
          className={`text-xs font-bold uppercase tracking-wider ${styles.text}`}
        >
          {status}
        </p>

        <p className="mt-1 text-sm text-slate-600">
          {detail}
        </p>
      </div>
    </div>
  );
}

function StatusPill({
  status,
  text,
}: {
  status: ServiceStatus;
  text: string;
}) {
  const styles = getStatusStyles(status);

  return (
    <span
      className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${styles.pill}`}
    >
      <span
        className={`h-2 w-2 rounded-full ${styles.dot}`}
      />
      {text}
    </span>
  );
}

function LegendItem({
  label,
  status,
}: {
  label: string;
  status: ServiceStatus;
}) {
  const styles = getStatusStyles(status);

  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <span
        className={`h-2.5 w-2.5 rounded-full ${styles.dot}`}
      />
      {label}
    </div>
  );
}

function ActionLink({
  href,
  title,
  description,
  number,
}: {
  href: string;
  title: string;
  description: string;
  number: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border border-slate-200 p-5 transition duration-300 hover:-translate-y-1 hover:border-blue-300 hover:bg-blue-50 hover:shadow-lg"
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-black tracking-wider text-slate-300 group-hover:text-blue-300">
          {number}
        </span>

        <span className="text-lg text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600">
          →
        </span>
      </div>

      <p className="mt-5 font-bold text-slate-900 group-hover:text-blue-700">
        {title}
      </p>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {description}
      </p>
    </Link>
  );
}

function getStatusStyles(status: ServiceStatus) {
  if (status === "online") {
    return {
      dot: "bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.7)]",
      text: "text-green-600",
      border: "border-green-500/40",
      icon: "border-green-500/30 bg-green-500/10 text-green-400",
      pill: "border-green-500/30 bg-green-500/10 text-green-300",
    };
  }

  if (status === "warning") {
    return {
      dot: "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.7)]",
      text: "text-amber-600",
      border: "border-amber-400/40",
      icon: "border-amber-400/30 bg-amber-400/10 text-amber-300",
      pill: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    };
  }

  return {
    dot: "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.7)]",
    text: "text-red-600",
    border: "border-red-500/40",
    icon: "border-red-500/30 bg-red-500/10 text-red-400",
    pill: "border-red-500/30 bg-red-500/10 text-red-300",
  };
}

function extractAuditLogs(response: AuditLogResponse): AuditLog[] {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.logs)) return response.logs;
  if (Array.isArray(response.data)) return response.data;
  return [];
}

function extractFileShares(response: FileShareResponse): FileShare[] {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.shares)) return response.shares;
  if (Array.isArray(response.fileShares)) return response.fileShares;
  if (Array.isArray(response.data)) return response.data;
  return [];
}

function formatDuration(milliseconds: number) {
  if (milliseconds < 1000) return `${milliseconds}ms`;
  return `${(milliseconds / 1000).toFixed(1)}s`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  const responseText = await response.text();

  let data: unknown;

  try {
    data = responseText
      ? JSON.parse(responseText)
      : null;
  } catch {
    throw new Error(
      `${url} returned an invalid JSON response.`
    );
  }

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "error" in data
        ? String(data.error)
        : `${url} returned status ${response.status}.`;

    throw new Error(message);
  }

  return data as T;
}

function normaliseDepartment(value?: string) {
  const department = String(value || "")
    .trim()
    .toLowerCase();

  if (
    !department ||
    department === "not assigned" ||
    department === "-" 
  ) {
    return "";
  }

  if (department === "human resources") {
    return "hr";
  }

  return department;
}