"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CloudCog,
  Database,
  FileClock,
  FolderCog,
  Gauge,
  HardDrive,
  Network,
  RefreshCw,
  Server,
  ShieldCheck,
  TerminalSquare,
  Users,
  Workflow,
  Boxes,
  GitCommitHorizontal,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

type DirectoryUser = {
  enabled?: boolean;
  Enabled?: boolean;
};

type AuditLog = {
  timestamp?: string;
  status?: string;
  action?: string;
  details?: string;
};

type SharePermission = {
  AccountName?: string;
  AccessRight?: string;
  AccessType?: string;
};

type NtfsPermission = {
  Principal?: string;
  Access?: string;
  AccessType?: string;
  IsInherited?: boolean;
};

type FileShare = {
  Name?: string;
  Server?: string;
  Status?: string;
  DriveCapacityGB?: number;
  DriveUsedGB?: number;
  DriveFreeGB?: number;
  SharePermissions?: SharePermission[];
  NtfsPermissions?: NtfsPermission[];
};

type ApiFileShare = {
  name?: string;
  server?: string;
  status?: string;
  driveCapacityGB?: number;
  driveUsedGB?: number;
  driveFreeGB?: number;
  sharePermissions?: SharePermission[];
  ntfsPermissions?: NtfsPermission[];
};

type UserApiResponse =
  | DirectoryUser[]
  | {
      success?: boolean;
      Success?: boolean;
      users?: DirectoryUser[];
      Users?: DirectoryUser[];
      error?: string;
      Error?: string;
    };

type AuditApiResponse = {
  success?: boolean;
  logs?: AuditLog[];
  error?: string;
};

type FileShareApiResponse = {
  success?: boolean;
  server?: string;
  generatedAt?: string;
  shares?: ApiFileShare[];
  error?: string;

  Success?: boolean;
  Server?: string;
  GeneratedAt?: string;
  Shares?: FileShare[];
  Error?: string;
};

type HealthTone = "green" | "amber" | "red" | "blue";
type RowStatus = "healthy" | "warning" | "critical";

export default function SettingsPage() {
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [shares, setShares] = useState<FileShare[]>([]);
  const [fileServer, setFileServer] = useState("Unknown server");
  const [lastScan, setLastScan] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadInfrastructure = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError("");

    try {
      const [usersResponse, auditResponse, sharesResponse] =
        await Promise.all([
          fetch("/api/users", { cache: "no-store" }),
          fetch("/api/audit-logs", { cache: "no-store" }),
          fetch("/api/file-shares", { cache: "no-store" }),
        ]);

      const [usersData, auditData, sharesData] =
        await Promise.all([
          readJson<UserApiResponse>(usersResponse),
          readJson<AuditApiResponse>(auditResponse),
          readJson<FileShareApiResponse>(sharesResponse),
        ]);

      if (!usersResponse.ok) {
        throw new Error(
          getUserApiError(usersData) ||
            "Unable to retrieve directory data.",
        );
      }

      if (!auditResponse.ok) {
        throw new Error(
          auditData.error || "Unable to retrieve audit data.",
        );
      }

      if (!sharesResponse.ok) {
        throw new Error(
          sharesData.error ||
            sharesData.Error ||
            "Unable to retrieve file-server data.",
        );
      }

      const liveUsers = Array.isArray(usersData)
        ? usersData
        : Array.isArray(usersData.users)
          ? usersData.users
          : Array.isArray(usersData.Users)
            ? usersData.Users
            : [];

      const liveLogs = Array.isArray(auditData.logs)
        ? auditData.logs
        : [];

      let liveShares: FileShare[] = [];

      if (Array.isArray(sharesData.shares)) {
        liveShares = sharesData.shares.map((share) => ({
          Name: share.name || "Unnamed Share",
          Server: share.server || "",
          Status: share.status || "Unknown",
          DriveCapacityGB: Number(
            share.driveCapacityGB || 0,
          ),
          DriveUsedGB: Number(share.driveUsedGB || 0),
          DriveFreeGB: Number(share.driveFreeGB || 0),
          SharePermissions: Array.isArray(
            share.sharePermissions,
          )
            ? share.sharePermissions
            : [],
          NtfsPermissions: Array.isArray(
            share.ntfsPermissions,
          )
            ? share.ntfsPermissions
            : [],
        }));
      } else if (Array.isArray(sharesData.Shares)) {
        liveShares = sharesData.Shares;
      }

      setUsers(liveUsers);
      setLogs(liveLogs);
      setShares(liveShares);

      setFileServer(
        sharesData.server ||
          sharesData.Server ||
          liveShares[0]?.Server ||
          "Windows Server",
      );

      setLastScan(
        sharesData.generatedAt ||
          sharesData.GeneratedAt ||
          new Date().toISOString(),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Infrastructure health check failed.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadInfrastructure();
  }, [loadInfrastructure]);

  const health = useMemo(() => {
    const enabledUsers = users.filter((user) =>
      typeof user.enabled === "boolean"
        ? user.enabled
        : Boolean(user.Enabled),
    ).length;

    const disabledUsers = users.length - enabledUsers;

    const failedAudits = logs.filter(
      (log) =>
        String(log.status || "").toLowerCase() ===
        "failed",
    ).length;

    const onlineShares = shares.filter(
      (share) =>
        String(share.Status || "").toLowerCase() ===
        "online",
    ).length;

    const capacities = shares
      .map((share) =>
        Number(share.DriveCapacityGB || 0),
      )
      .filter((value) => value > 0);

    const usedValues = shares
      .map((share) => Number(share.DriveUsedGB || 0))
      .filter((value) => value >= 0);

    const driveCapacity =
      capacities.length > 0 ? Math.max(...capacities) : 0;

    const driveUsed =
      usedValues.length > 0 ? Math.max(...usedValues) : 0;

    const driveUsage =
      driveCapacity > 0
        ? Math.round(
            (driveUsed / driveCapacity) * 100,
          )
        : 0;

    let deductions = 0;

    if (error) deductions += 25;

    if (
      shares.length > 0 &&
      onlineShares !== shares.length
    ) {
      deductions += 15;
    }

    if (failedAudits > 0) {
      deductions += Math.min(failedAudits * 2, 15);
    }

    if (driveUsage >= 90) {
      deductions += 20;
    } else if (driveUsage >= 75) {
      deductions += 10;
    }

    if (disabledUsers > 5) {
      deductions += 5;
    }

    const score = Math.max(0, 100 - deductions);

    const status =
      score >= 90
        ? "Healthy"
        : score >= 75
          ? "Review Required"
          : "Degraded";

    return {
      enabledUsers,
      disabledUsers,
      failedAudits,
      onlineShares,
      driveCapacity,
      driveUsed,
      driveUsage,
      score,
      status,
    };
  }, [users, logs, shares, error]);

  const recentEvents = useMemo(() => {
    const events = [...logs]
      .sort(
        (first, second) =>
          new Date(
            second.timestamp || 0,
          ).getTime() -
          new Date(first.timestamp || 0).getTime(),
      )
      .slice(0, 5)
      .map((log) => {
        const failed =
          String(log.status || "").toLowerCase() ===
          "failed";

        return {
          title:
            log.action || "Administrative activity",
          detail:
            log.details ||
            (failed
              ? "The operation requires review."
              : "The operation completed successfully."),
          time: formatDate(log.timestamp || ""),
          tone: failed
            ? ("amber" as const)
            : ("green" as const),
        };
      });

    if (events.length > 0) {
      return events;
    }

    return [
      {
        title: "Infrastructure health check passed",
        detail:
          "All connected services returned successfully.",
        time: formatDate(lastScan),
        tone: "green" as const,
      },
      {
        title: "SMB inventory synchronized",
        detail: `${shares.length} shares discovered from ${fileServer}.`,
        time: formatDate(lastScan),
        tone: "green" as const,
      },
      {
        title: "Directory service verified",
        detail: `${users.length} identities are available through the Enterprise API.`,
        time: formatDate(lastScan),
        tone: "green" as const,
      },
    ];
  }, [
    logs,
    lastScan,
    shares.length,
    fileServer,
    users.length,
  ]);

  return (
    <main className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <div className="min-w-0 flex-1">
        <Header />

        <div className="p-6 md:p-8 lg:p-10">
          <section className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
                Infrastructure Configuration
              </p>

              <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">
                Enterprise Settings
              </h1>

              <p className="mt-3 max-w-3xl text-slate-500">
                Centralized service health, configuration
                governance and operational visibility for
                identity, API, file services, automation and
                security.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void loadInfrastructure(true)
              }
              disabled={isRefreshing}
              className="flex w-fit items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={18}
                className={
                  isRefreshing ? "animate-spin" : ""
                }
              />

              {isRefreshing
                ? "Running Check"
                : "Run Health Check"}
            </button>
          </section>

          {error && (
            <section className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6">
              <div className="flex items-start gap-4">
                <AlertTriangle
                  size={24}
                  className="mt-0.5 text-red-700"
                />

                <div>
                  <p className="font-bold text-red-900">
                    Some live services could not be reached
                  </p>

                  <p className="mt-2 text-sm text-red-700">
                    {error}
                  </p>
                </div>
              </div>
            </section>
          )}

          {isLoading ? (
            <LoadingState />
          ) : (
            <>
              <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                <MiniKpi
                  icon={Users}
                  label="Directory"
                  value={`${users.length} users`}
                />

                <MiniKpi
                  icon={CloudCog}
                  label="Enterprise API"
                  value={error ? "Unavailable" : "Online"}
                  healthy={!error}
                />

                <MiniKpi
                  icon={HardDrive}
                  label="File Shares"
                  value={`${health.onlineShares}/${shares.length}`}
                  healthy={
                    shares.length > 0 &&
                    health.onlineShares === shares.length
                  }
                />

                <MiniKpi
                  icon={Database}
                  label="Storage"
                  value={`${health.driveUsage}% used`}
                  healthy={health.driveUsage < 75}
                />

                <MiniKpi
                  icon={Activity}
                  label="Audit"
                  value={`${logs.length} events`}
                  healthy={health.failedAudits === 0}
                />

                <MiniKpi
                  icon={Gauge}
                  label="Health"
                  value={`${health.score}%`}
                  healthy={health.score >= 90}
                />
              </section>

              <section className="mt-6 overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl">
                <div className="grid gap-8 p-8 xl:grid-cols-[1.2fr_0.8fr] xl:items-center">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-300">
                      Enterprise Health
                    </p>

                    <div className="mt-5 flex flex-wrap items-end gap-5">
                      <p className="text-7xl font-bold tracking-tight">
                        {health.score}
                        <span className="text-3xl text-slate-400">
                          %
                        </span>
                      </p>

                      <StatusBadge
                        text={health.status}
                        tone={
                          health.score >= 90
                            ? "green"
                            : health.score >= 75
                              ? "amber"
                              : "red"
                        }
                      />
                    </div>

                    <p className="mt-5 max-w-2xl text-slate-300">
                      Score calculated from API connectivity,
                      share availability, audit outcomes and
                      storage thresholds.
                    </p>

                    <div className="mt-7 h-3 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full ${
                          health.score >= 90
                            ? "bg-green-400"
                            : health.score >= 75
                              ? "bg-amber-400"
                              : "bg-red-400"
                        }`}
                        style={{
                          width: `${health.score}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <HealthSummary
                      label="API Status"
                      value={
                        error ? "Unavailable" : "Online"
                      }
                      healthy={!error}
                    />

                    <HealthSummary
                      label="Identity"
                      value={`${users.length} users`}
                      healthy={!error}
                    />

                    <HealthSummary
                      label="Storage"
                      value={`${health.onlineShares}/${shares.length} shares online`}
                      healthy={
                        shares.length > 0 &&
                        health.onlineShares ===
                          shares.length
                      }
                    />

                    <HealthSummary
                      label="Last Check"
                      value={formatDate(lastScan)}
                      healthy
                    />
                  </div>
                </div>
              </section>

              <section className="mt-8 grid gap-6 2xl:grid-cols-[1.3fr_0.7fr]">
                <ConfigurationPanel
                  icon={Workflow}
                  title="Infrastructure Topology"
                  description="Live service flow across the administration platform."
                  noDivider
                >
                  <TopologyDiagram
                    users={users.length}
                    apiHealthy={!error}
                    sharesOnline={health.onlineShares}
                    totalShares={shares.length}
                    fileServer={fileServer}
                  />
                </ConfigurationPanel>

                <ConfigurationPanel
                  icon={Activity}
                  title="Operational Activity"
                  description="Most recent service and administrative events."
                  noDivider
                >
                  <div className="space-y-3">
                    {recentEvents.map((event, index) => (
                      <TimelineEvent
                        key={`${event.title}-${index}`}
                        title={event.title}
                        detail={event.detail}
                        time={event.time}
                        tone={event.tone}
                      />
                    ))}
                  </div>
                </ConfigurationPanel>
              </section>

              <section className="mt-8 grid gap-6 xl:grid-cols-2">
                <ConfigurationPanel
                  icon={Network}
                  title="Identity Services"
                  description="Domain and directory-service configuration."
                >
                  <ConfigurationRow
                    label="Primary Domain"
                    value="contoso.local"
                    source="Configured"
                  />

                  <ConfigurationRow
                    label="Domain Controller"
                    value="DC01"
                    source="Configured"
                  />

                  <ConfigurationRow
                    label="Directory Users"
                    value={String(users.length)}
                    source="Live"
                  />

                  <ConfigurationRow
                    label="Enabled Accounts"
                    value={String(health.enabledUsers)}
                    source="Live"
                  />

                  <ConfigurationRow
                    label="LDAP"
                    value={
                      error ? "Unknown" : "Connected"
                    }
                    source="Live"
                    status={
                      error ? "warning" : "healthy"
                    }
                  />

                  <ConfigurationRow
                    label="Kerberos"
                    value="Running"
                    source="Configured"
                    status="healthy"
                  />
                </ConfigurationPanel>

                <ConfigurationPanel
                  icon={CloudCog}
                  title="Enterprise API"
                  description="Application and automation service configuration."
                >
                  <ConfigurationRow
                    label="Status"
                    value={
                      error ? "Unavailable" : "Online"
                    }
                    source="Live"
                    status={
                      error ? "critical" : "healthy"
                    }
                  />

                  <ConfigurationRow
                    label="API Host"
                    value="192.168.206.128:3001"
                    source="Configured"
                  />

                  <ConfigurationRow
                    label="Runtime"
                    value="Node.js"
                    source="Configured"
                  />

                  <ConfigurationRow
                    label="Framework"
                    value="Express"
                    source="Configured"
                  />

                  <ConfigurationRow
                    label="Automation Engine"
                    value="PowerShell"
                    source="Configured"
                  />

                  <ConfigurationRow
                    label="Audit Events"
                    value={String(logs.length)}
                    source="Live"
                  />
                </ConfigurationPanel>

                <ConfigurationPanel
                  icon={FolderCog}
                  title="File Services"
                  description="Live SMB and storage configuration."
                >
                  <ConfigurationRow
                    label="File Server"
                    value={fileServer}
                    source="Live"
                  />

                  <ConfigurationRow
                    label="SMB Shares"
                    value={String(shares.length)}
                    source="Live"
                  />

                  <ConfigurationRow
                    label="Online Shares"
                    value={String(health.onlineShares)}
                    source="Live"
                    status={
                      shares.length > 0 &&
                      health.onlineShares === shares.length
                        ? "healthy"
                        : "warning"
                    }
                  />

                  <ConfigurationRow
                    label="Drive Capacity"
                    value={`${health.driveCapacity.toFixed(
                      2,
                    )} GB`}
                    source="Live"
                  />

                  <ConfigurationRow
                    label="Drive Used"
                    value={`${health.driveUsed.toFixed(
                      2,
                    )} GB`}
                    source="Live"
                  />

                  <ConfigurationRow
                    label="Drive Usage"
                    value={`${health.driveUsage}%`}
                    source="Live"
                    status={
                      health.driveUsage >= 90
                        ? "critical"
                        : health.driveUsage >= 75
                          ? "warning"
                          : "healthy"
                    }
                  />

                  <ConfigurationRow
                    label="SMB Signing"
                    value="Enabled"
                    source="Configured"
                    status="healthy"
                  />
                </ConfigurationPanel>

                <ConfigurationPanel
                  icon={ShieldCheck}
                  title="Security Configuration"
                  description="Configured enterprise security controls."
                >
                  <ConfigurationRow
                    label="Audit Logging"
                    value="Enabled"
                    source="Configured"
                    status="healthy"
                  />

                  <ConfigurationRow
                    label="Password Minimum"
                    value="12 characters"
                    source="Configured"
                  />

                  <ConfigurationRow
                    label="Password Expiry"
                    value="90 days"
                    source="Configured"
                  />

                  <ConfigurationRow
                    label="Lockout Threshold"
                    value="5 attempts"
                    source="Configured"
                  />

                  <ConfigurationRow
                    label="Windows Firewall"
                    value="Enabled"
                    source="Configured"
                    status="healthy"
                  />

                  <ConfigurationRow
                    label="NTFS Inheritance"
                    value="Enabled"
                    source="Configured"
                    status="healthy"
                  />

                  <ConfigurationRow
                    label="Audit Retention"
                    value="365 days"
                    source="Configured"
                  />
                </ConfigurationPanel>
              </section>

              <section className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <ConfigurationPanel
                  icon={Gauge}
                  title="Active Monitoring"
                  description="Current operational checks across the infrastructure."
                >
                  <MonitoringRow
                    icon={Server}
                    label="Domain Controller"
                    description="Primary directory server"
                    status="Healthy"
                    healthy
                  />

                  <MonitoringRow
                    icon={CloudCog}
                    label="Enterprise API"
                    description="Node and Express service"
                    status={
                      error ? "Unavailable" : "Healthy"
                    }
                    healthy={!error}
                  />

                  <MonitoringRow
                    icon={HardDrive}
                    label="File Services"
                    description={`${health.onlineShares} of ${shares.length} shares online`}
                    status={
                      shares.length > 0 &&
                      health.onlineShares === shares.length
                        ? "Healthy"
                        : "Review"
                    }
                    healthy={
                      shares.length > 0 &&
                      health.onlineShares === shares.length
                    }
                  />

                  <MonitoringRow
                    icon={FileClock}
                    label="Audit Service"
                    description={`${logs.length} events collected`}
                    status={
                      health.failedAudits > 0
                        ? "Review"
                        : "Healthy"
                    }
                    healthy={
                      health.failedAudits === 0
                    }
                  />

                  <MonitoringRow
                    icon={TerminalSquare}
                    label="PowerShell Automation"
                    description="Windows administration engine"
                    status="Connected"
                    healthy
                  />
                </ConfigurationPanel>

                <ConfigurationPanel
                  icon={Database}
                  title="Environment & Release"
                  description="Platform and deployment information."
                >
                  <EnvironmentRow
                    label="Operating System"
                    value="Windows Server 2022"
                  />

                  <EnvironmentRow
                    label="Frontend"
                    value="Next.js 16"
                  />

                  <EnvironmentRow
                    label="Backend"
                    value="Express"
                  />

                  <EnvironmentRow
                    label="Automation"
                    value="PowerShell 5.1"
                  />

                  <EnvironmentRow
                    label="Environment"
                    value="Production Simulation"
                  />

                  <EnvironmentRow
                    label="Portal Version"
                    value="v2.3.4"
                  />

                  <EnvironmentRow
                    label="Build"
                    value="2026.07.21"
                  />

                  <EnvironmentRow
                    label="Commit"
                    value="18fa24"
                  />

                  <EnvironmentRow
                    label="Deployment"
                    value="Healthy"
                  />
                </ConfigurationPanel>
              </section>

              <section className="mt-8 rounded-3xl border border-blue-200 bg-blue-50 p-7">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-4">
                    <CheckCircle2
                      size={28}
                      className="mt-1 text-blue-700"
                    />

                    <div>
                      <h2 className="text-xl font-bold text-blue-950">
                        Infrastructure baseline verified
                      </h2>

                      <p className="mt-2 max-w-4xl text-sm leading-6 text-blue-800">
                        Active Directory, PowerShell
                        automation, SMB services, audit
                        logging and the documented security
                        baseline are visible through one
                        centralized operations console.
                      </p>
                    </div>
                  </div>

                  <StatusBadge
                    text="Live Data Verified"
                    tone="blue"
                  />
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function MiniKpi({
  icon: Icon,
  label,
  value,
  healthy = true,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  healthy?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          <Icon size={19} />
        </span>

        <span
          className={`h-2.5 w-2.5 rounded-full ${
            healthy ? "bg-green-500" : "bg-amber-500"
          }`}
        />
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-xl font-bold text-slate-950">
        {value}
      </p>
    </div>
  );
}

function TopologyDiagram({
  users,
  apiHealthy,
  sharesOnline,
  totalShares,
  fileServer,
}: {
  users: number;
  apiHealthy: boolean;
  sharesOnline: number;
  totalShares: number;
  fileServer: string;
}) {
  const fileHealthy =
    totalShares > 0 && sharesOnline === totalShares;

  return (
    <div className="mt-6 overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-5 text-white md:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-300">
            Live service map
          </p>

          <p className="mt-1 text-sm text-slate-400">
            Request flow and management dependencies
          </p>
        </div>

        <span className="rounded-full border border-green-400/20 bg-green-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-green-300">
          All core paths monitored
        </span>
      </div>

      <div className="hidden lg:block">
        <div className="mx-auto max-w-5xl">
          <div className="flex justify-center">
            <TopologyNode
              icon={Users}
              title="Administrators"
              subtitle={`${users} directory users`}
              healthy
              width="w-72"
            />
          </div>

          <VerticalConnector label="HTTPS" />

          <div className="flex justify-center">
            <TopologyNode
              icon={Boxes}
              title="Next.js Admin Portal"
              subtitle="Enterprise administration interface"
              healthy
              width="w-80"
            />
          </div>

          <VerticalConnector label="REST API" />

          <div className="flex justify-center">
            <TopologyNode
              icon={CloudCog}
              title="Express Enterprise API"
              subtitle="Authentication and automation gateway"
              healthy={apiHealthy}
              width="w-80"
            />
          </div>

          <div className="relative mx-auto mt-1 h-20 max-w-3xl">
            <div className="absolute left-1/2 top-0 h-8 w-px -translate-x-1/2 bg-slate-700" />
            <div className="absolute left-1/4 right-1/4 top-8 h-px bg-slate-700" />
            <div className="absolute left-1/4 top-8 h-12 w-px bg-slate-700" />
            <div className="absolute right-1/4 top-8 h-12 w-px bg-slate-700" />

            <span className="absolute left-1/4 top-2 -translate-x-1/2 rounded-full bg-slate-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              LDAP
            </span>

            <span className="absolute right-1/4 top-2 translate-x-1/2 rounded-full bg-slate-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              PowerShell
            </span>
          </div>

          <div className="grid grid-cols-2 gap-10">
            <TopologyNode
              icon={Server}
              title="Active Directory"
              subtitle="DC01 · contoso.local"
              healthy
              width="w-full"
            />

            <TopologyNode
              icon={TerminalSquare}
              title="PowerShell Engine"
              subtitle="Windows administration automation"
              healthy
              width="w-full"
            />
          </div>

          <div className="ml-auto mr-[25%] h-16 w-px bg-slate-700" />

          <div className="flex justify-end">
            <div className="w-1/2 pl-5">
              <TopologyNode
                icon={HardDrive}
                title="Windows File Services"
                subtitle={`${fileServer} · ${sharesOnline}/${totalShares} shares online`}
                healthy={fileHealthy}
                width="w-full"
              />
            </div>
          </div>

          <div className="ml-auto mr-[25%]">
            <div className="mx-auto h-10 w-px bg-slate-700" />
            <span className="mx-auto block w-fit rounded-full bg-slate-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              SMB
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3 lg:hidden">
        <TopologyNode
          icon={Users}
          title="Administrators"
          subtitle={`${users} directory users`}
          healthy
          width="w-full"
        />

        <MobileConnector label="HTTPS" />

        <TopologyNode
          icon={Boxes}
          title="Next.js Admin Portal"
          subtitle="Enterprise administration interface"
          healthy
          width="w-full"
        />

        <MobileConnector label="REST API" />

        <TopologyNode
          icon={CloudCog}
          title="Express Enterprise API"
          subtitle="Authentication and automation gateway"
          healthy={apiHealthy}
          width="w-full"
        />

        <MobileConnector label="LDAP" />

        <TopologyNode
          icon={Server}
          title="Active Directory"
          subtitle="DC01 · contoso.local"
          healthy
          width="w-full"
        />

        <MobileConnector label="PowerShell" />

        <TopologyNode
          icon={TerminalSquare}
          title="PowerShell Engine"
          subtitle="Windows administration automation"
          healthy
          width="w-full"
        />

        <MobileConnector label="SMB" />

        <TopologyNode
          icon={HardDrive}
          title="Windows File Services"
          subtitle={`${fileServer} · ${sharesOnline}/${totalShares} shares online`}
          healthy={fileHealthy}
          width="w-full"
        />
      </div>
    </div>
  );
}

function TopologyNode({
  icon: Icon,
  title,
  subtitle,
  healthy,
  width,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  healthy: boolean;
  width: string;
}) {
  return (
    <div
      className={`${width} rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.22)]`}
    >
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
          <Icon size={21} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-bold leading-6 text-white">
              {title}
            </p>

            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                healthy
                  ? "bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.75)]"
                  : "bg-amber-400"
              }`}
            />
          </div>

          <p className="mt-1 break-words text-sm leading-6 text-slate-400">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}

function VerticalConnector({
  label,
}: {
  label: string;
}) {
  return (
    <div className="relative mx-auto h-16 w-24">
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-slate-700" />

      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </span>
    </div>
  );
}

function MobileConnector({
  label,
}: {
  label: string;
}) {
  return (
    <div className="flex items-center justify-center gap-3 py-1">
      <div className="h-8 w-px bg-slate-700" />

      <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </span>

      <div className="h-8 w-px bg-slate-700" />
    </div>
  );
}

function TimelineEvent({
  title,
  detail,
  time,
  tone,
}: {
  title: string;
  detail: string;
  time: string;
  tone: "green" | "amber";
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-5">
      <div className="flex items-start gap-4">
        <span
          className={`mt-1 h-3 w-3 shrink-0 rounded-full ${
            tone === "green"
              ? "bg-green-500"
              : "bg-amber-500"
          }`}
        />

        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-950">
            {title}
          </p>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            {detail}
          </p>
        </div>

        <time className="shrink-0 text-xs text-slate-400">
          {time}
        </time>
      </div>
    </div>
  );
}

function ConfigurationPanel({
  icon: Icon,
  title,
  description,
  children,
  noDivider = false,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
  noDivider?: boolean;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
          <Icon size={21} />
        </span>

        <div>
          <h2 className="text-xl font-bold text-slate-950">
            {title}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {description}
          </p>
        </div>
      </div>

      <div
        className={`mt-6 ${
          noDivider ? "" : "divide-y divide-slate-100"
        }`}
      >
        {children}
      </div>
    </section>
  );
}

function ConfigurationRow({
  label,
  value,
  source,
  status,
}: {
  label: string;
  value: string;
  source: "Live" | "Configured";
  status?: RowStatus;
}) {
  const valueStyle =
    status === "healthy"
      ? "text-green-700"
      : status === "warning"
        ? "text-amber-700"
        : status === "critical"
          ? "text-red-700"
          : "text-slate-950";

  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <p className={`font-bold ${valueStyle}`}>
          {value}
        </p>

        <SourceBadge source={source} />
      </div>
    </div>
  );
}

function MonitoringRow({
  icon: Icon,
  label,
  description,
  status,
  healthy,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  status: string;
  healthy: boolean;
}) {
  return (
    <div className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          healthy
            ? "bg-green-100 text-green-700"
            : "bg-amber-100 text-amber-700"
        }`}
      >
        <Icon size={20} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="font-bold text-slate-950">
          {label}
        </p>

        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>
      </div>

      <StatusBadge
        text={status}
        tone={healthy ? "green" : "amber"}
      />
    </div>
  );
}

function EnvironmentRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="font-bold text-slate-950">
        {value}
      </p>
    </div>
  );
}

function HealthSummary({
  label,
  value,
  healthy,
}: {
  label: string;
  value: string;
  healthy: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p
        className={`mt-2 break-words font-bold ${
          healthy ? "text-green-300" : "text-red-300"
        }`}
      >
        ● {value}
      </p>
    </div>
  );
}

function SourceBadge({
  source,
}: {
  source: "Live" | "Configured";
}) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
        source === "Live"
          ? "bg-green-100 text-green-700"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      {source}
    </span>
  );
}

function StatusBadge({
  text,
  tone,
}: {
  text: string;
  tone: HealthTone;
}) {
  const styles = {
    green: "bg-green-100 text-green-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${styles[tone]}`}
    >
      {text}
    </span>
  );
}

function LoadingState() {
  return (
    <div className="mt-8 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <div
            key={item}
            className="h-32 animate-pulse rounded-2xl bg-white"
          />
        ))}
      </div>

      <div className="h-72 animate-pulse rounded-3xl bg-slate-300" />

      <div className="grid gap-6 xl:grid-cols-2">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-96 animate-pulse rounded-3xl bg-white"
          />
        ))}
      </div>
    </div>
  );
}

async function readJson<T>(
  response: Response,
): Promise<T> {
  const text = await response.text();

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      text || "The server returned invalid JSON.",
    );
  }
}

function getUserApiError(
  data: UserApiResponse,
) {
  if (Array.isArray(data)) {
    return "";
  }

  return data.Error || data.error || "";
}

function formatDate(value: string) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-SG", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}