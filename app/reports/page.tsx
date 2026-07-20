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
  Database,
  Download,
  FileText,
  FolderLock,
  HardDrive,
  Printer,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

type DirectoryUser = {
  username?: string;
  Username?: string;
  samAccountName?: string;
  SamAccountName?: string;

  displayName?: string;
  DisplayName?: string;
  name?: string;
  Name?: string;

  enabled?: boolean;
  Enabled?: boolean;

  department?: string;
  Department?: string;

  lockedOut?: boolean;
  LockedOut?: boolean;

  passwordExpired?: boolean;
  PasswordExpired?: boolean;

  jobTitle?: string;
  JobTitle?: string;
  title?: string;
  Title?: string;
};

type AuditLog = {
  id?: string;
  administrator?: string;
  action?: string;
  username?: string;
  details?: string;
  status?: string;
  timestamp?: string;
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
  SharePath?: string;
  LocalPath?: string;
  Status?: string;

  FileCount?: number;
  FolderCount?: number;
  ShareSizeGB?: number;

  DriveUsedGB?: number;
  DriveFreeGB?: number;
  DriveCapacityGB?: number;
  DriveUsagePercent?: number;

  SharePermissions?: SharePermission[];
  NtfsPermissions?: NtfsPermission[];
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

type ApiFileShare = {
  name?: string;
  server?: string;
  sharePath?: string;
  localPath?: string;
  status?: string;

  fileCount?: number;
  folderCount?: number;
  shareSizeGB?: number;

  driveUsedGB?: number;
  driveFreeGB?: number;
  driveCapacityGB?: number;
  driveUsagePercent?: number;

  sharePermissions?: SharePermission[];
  ntfsPermissions?: NtfsPermission[];
};

type FileShareApiResponse = {
  success?: boolean;
  server?: string;
  generatedAt?: string;
  shareCount?: number;
  shares?: ApiFileShare[];
  error?: string;

  Success?: boolean;
  Server?: string;
  GeneratedAt?: string;
  ShareCount?: number;
  Shares?: FileShare[];
  Error?: string;
};

type DepartmentSummary = {
  department: string;
  total: number;
  enabled: number;
  disabled: number;
};

type PermissionFinding = {
  share: string;
  path: string;
  principal: string;
  access: string;
  severity: "High" | "Medium";
  reason: string;
};

export default function ReportsPage() {
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [shares, setShares] = useState<FileShare[]>([]);

  const [serverName, setServerName] =
    useState("Unknown server");

  const [generatedAt, setGeneratedAt] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [error, setError] = useState("");

  const loadReports = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError("");

      try {
        const [
          usersResponse,
          auditResponse,
          sharesResponse,
        ] = await Promise.all([
          fetch("/api/users", {
            cache: "no-store",
          }),
          fetch("/api/audit-logs", {
            cache: "no-store",
          }),
          fetch("/api/file-shares", {
            cache: "no-store",
          }),
        ]);

        const [
          usersData,
          auditData,
          sharesData,
        ] = await Promise.all([
          readJson<UserApiResponse>(
            usersResponse,
            "directory users"
          ),
          readJson<AuditApiResponse>(
            auditResponse,
            "audit logs"
          ),
          readJson<FileShareApiResponse>(
            sharesResponse,
            "file shares"
          ),
        ]);

        if (!usersResponse.ok) {
          throw new Error(
            getApiError(usersData) ||
              "Unable to retrieve directory users."
          );
        }

        if (!auditResponse.ok) {
          throw new Error(
            auditData.error ||
              "Unable to retrieve audit logs."
          );
        }

        if (!sharesResponse.ok) {
          throw new Error(
            sharesData.Error ||
              sharesData.error ||
              "Unable to retrieve file shares."
          );
        }

        const liveUsers = Array.isArray(usersData)
          ? usersData
          : Array.isArray(usersData.users)
            ? usersData.users
            : Array.isArray(usersData.Users)
              ? usersData.Users
              : [];

        const liveLogs = Array.isArray(
          auditData.logs
        )
          ? auditData.logs
          : [];

        let liveShares: FileShare[] = [];

        if (Array.isArray(sharesData.shares)) {
          liveShares = sharesData.shares.map((share) => ({
            Name: share.name || "Unnamed Share",
            Server: share.server || "",
            SharePath: share.sharePath || "",
            LocalPath: share.localPath || "",
            Status: share.status || "Unknown",
            FileCount: Number(share.fileCount || 0),
            FolderCount: Number(share.folderCount || 0),
            ShareSizeGB: Number(share.shareSizeGB || 0),
            DriveUsedGB: Number(share.driveUsedGB || 0),
            DriveFreeGB: Number(share.driveFreeGB || 0),
            DriveCapacityGB: Number(share.driveCapacityGB || 0),
            DriveUsagePercent: Number(share.driveUsagePercent || 0),
            SharePermissions: Array.isArray(share.sharePermissions)
              ? share.sharePermissions
              : [],
            NtfsPermissions: Array.isArray(share.ntfsPermissions)
              ? share.ntfsPermissions
              : [],
          }));
        } else if (Array.isArray(sharesData.Shares)) {
          liveShares = sharesData.Shares;
        }

        setUsers(liveUsers);
        setLogs(liveLogs);
        setShares(liveShares);

        setServerName(
          sharesData.server ||
            sharesData.Server ||
            liveShares[0]?.Server ||
            "Windows Server",
        );

        setGeneratedAt(
          sharesData.generatedAt ||
            sharesData.GeneratedAt ||
            new Date().toISOString(),
        );
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Unable to generate infrastructure reports."
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const report = useMemo(() => {
    const normalizedUsers = users.map(normalizeUser);

    const enabledUsers = normalizedUsers.filter((user) => user.enabled);
    const disabledUsers = normalizedUsers.filter((user) => !user.enabled);
    const lockedUsers = normalizedUsers.filter((user) => user.lockedOut);
    const expiredPasswords = normalizedUsers.filter(
      (user) => user.passwordExpired,
    );

    const departmentMap = new Map<string, DepartmentSummary>();

    normalizedUsers.forEach((user) => {
      const department = user.department;
      const current = departmentMap.get(department) ?? {
        department,
        total: 0,
        enabled: 0,
        disabled: 0,
      };

      current.total += 1;

      if (user.enabled) {
        current.enabled += 1;
      } else {
        current.disabled += 1;
      }

      departmentMap.set(department, current);
    });

    const departments = Array.from(departmentMap.values()).sort(
      (first, second) =>
        second.total - first.total ||
        first.department.localeCompare(second.department),
    );

    const sortedLogs = [...logs].sort(
      (first, second) =>
        new Date(second.timestamp || 0).getTime() -
        new Date(first.timestamp || 0).getTime(),
    );

    const failedActions = sortedLogs.filter(
      (log) => String(log.status || "").toLowerCase() === "failed",
    );

    const passwordResets = sortedLogs.filter((log) =>
      String(log.action || "").toLowerCase().includes("password reset"),
    );

    const onlineShares = shares.filter(
      (share) => String(share.Status || "").toLowerCase() === "online",
    );

    const totalFiles = shares.reduce(
      (total, share) => total + Number(share.FileCount || 0),
      0,
    );

    const totalFolders = shares.reduce(
      (total, share) => total + Number(share.FolderCount || 0),
      0,
    );

    const capacities = shares
      .map((share) => Number(share.DriveCapacityGB || 0))
      .filter((value) => value > 0);

    const usedValues = shares
      .map((share) => Number(share.DriveUsedGB || 0))
      .filter((value) => value >= 0);

    // Every share on the same drive reports the same drive capacity and usage,
    // so use the maximum value rather than incorrectly summing duplicates.
    const driveCapacity = capacities.length > 0 ? Math.max(...capacities) : 0;
    const driveUsed = usedValues.length > 0 ? Math.max(...usedValues) : 0;
    const driveUsage =
      driveCapacity > 0 ? Math.round((driveUsed / driveCapacity) * 100) : 0;

    const findings = buildPermissionFindings(shares);

    let riskScore = 0;
    riskScore += disabledUsers.length * 2;
    riskScore += lockedUsers.length * 5;
    riskScore += expiredPasswords.length * 4;
    riskScore += failedActions.length * 3;
    riskScore +=
      findings.filter((finding) => finding.severity === "High").length * 6;
    riskScore +=
      findings.filter((finding) => finding.severity === "Medium").length * 3;

    if (shares.length > 0 && onlineShares.length !== shares.length) {
      riskScore += 10;
    }

    if (driveUsage >= 80) {
      riskScore += 10;
    } else if (driveUsage >= 65) {
      riskScore += 5;
    }

    const securityRating =
      riskScore <= 10
        ? "Healthy"
        : riskScore <= 30
          ? "Review Required"
          : "Elevated Risk";

    return {
      normalizedUsers,
      enabledUsers,
      disabledUsers,
      lockedUsers,
      expiredPasswords,
      departments,
      sortedLogs,
      failedActions,
      passwordResets,
      onlineShares,
      totalFiles,
      totalFolders,
      driveCapacity,
      driveUsed,
      driveUsage,
      findings,
      riskScore,
      securityRating,
    };
  }, [users, logs, shares]);

  function exportDirectoryCsv() {
    const rows = report.normalizedUsers.map(
      (user) => ({
        Username: user.username,
        DisplayName: user.displayName,
        Department: user.department,
        JobTitle: user.jobTitle,
        Enabled: user.enabled
          ? "Yes"
          : "No",
        LockedOut: user.lockedOut
          ? "Yes"
          : "No",
        PasswordExpired:
          user.passwordExpired
            ? "Yes"
            : "No",
      })
    );

    downloadCsv(
      `directory-inventory-${dateStamp()}.csv`,
      rows
    );
  }

  function exportAuditCsv() {
    const rows = report.sortedLogs.map(
      (log) => ({
        Timestamp: log.timestamp || "",
        Administrator:
          log.administrator || "",
        Action: log.action || "",
        TargetUser: log.username || "",
        Status: log.status || "",
        Details: log.details || "",
      })
    );

    downloadCsv(
      `administrative-audit-${dateStamp()}.csv`,
      rows
    );
  }

  function exportPermissionsCsv() {
    const rows = report.findings.map(
      (finding) => ({
        Severity: finding.severity,
        Share: finding.share,
        Path: finding.path,
        Principal: finding.principal,
        Access: finding.access,
        Finding: finding.reason,
      })
    );

    downloadCsv(
      `permission-review-${dateStamp()}.csv`,
      rows
    );
  }

  return (
    <main className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <div className="min-w-0 flex-1">
        <Header />

        <div className="p-6 md:p-8 lg:p-10">
          <section className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
                Governance and Compliance
              </p>

              <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">
                Infrastructure Reports
              </h1>

              <p className="mt-3 max-w-3xl text-slate-500">
                Consolidated identity,
                administrative and file-service
                reporting generated from live
                enterprise infrastructure data.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  void loadReports(true)
                }
                disabled={isRefreshing}
                className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  size={18}
                  className={
                    isRefreshing
                      ? "animate-spin"
                      : ""
                  }
                />

                {isRefreshing
                  ? "Refreshing"
                  : "Refresh Data"}
              </button>

              <button
                type="button"
                onClick={() =>
                  window.print()
                }
                className="flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 font-bold text-white transition hover:bg-slate-800"
              >
                <Printer size={18} />
                Print Audit Report
              </button>
            </div>
          </section>

          {error && (
            <section className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6">
              <div className="flex items-start gap-4">
                <AlertTriangle
                  className="mt-0.5 text-red-700"
                  size={24}
                />

                <div>
                  <p className="font-bold text-red-900">
                    Report generation failed
                  </p>

                  <p className="mt-2 text-sm text-red-700">
                    {error}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      void loadReports()
                    }
                    className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </section>
          )}

          {isLoading ? (
            <LoadingReport />
          ) : (
            <>
              <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-6">
                <MetricCard
                  icon={Users}
                  label="Directory Users"
                  value={String(
                    report.normalizedUsers
                      .length
                  )}
                  description="Total identities"
                />

                <MetricCard
                  icon={UserCheck}
                  label="Enabled"
                  value={String(
                    report.enabledUsers.length
                  )}
                  description="Active accounts"
                  tone="green"
                />

                <MetricCard
                  icon={UserX}
                  label="Disabled"
                  value={String(
                    report.disabledUsers
                      .length
                  )}
                  description="Inactive accounts"
                  tone={
                    report.disabledUsers
                      .length > 0
                      ? "amber"
                      : "default"
                  }
                />

                <MetricCard
                  icon={ShieldAlert}
                  label="Locked"
                  value={String(
                    report.lockedUsers.length
                  )}
                  description="Immediate review"
                  tone={
                    report.lockedUsers
                      .length > 0
                      ? "red"
                      : "green"
                  }
                />

                <MetricCard
                  icon={Database}
                  label="SMB Shares"
                  value={`${report.onlineShares.length}/${shares.length}`}
                  description="Online shares"
                  tone={
                    report.onlineShares
                      .length === shares.length
                      ? "green"
                      : "red"
                  }
                />

                <MetricCard
                  icon={ShieldCheck}
                  label="Security Rating"
                  value={
                    report.securityRating
                  }
                  description={`Risk score ${report.riskScore}`}
                  compact
                  tone={
                    report.securityRating ===
                    "Healthy"
                      ? "green"
                      : report.securityRating ===
                          "Review Required"
                        ? "amber"
                        : "red"
                  }
                />
              </section>

              <section className="mt-8 overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl">
                <div className="grid gap-8 p-7 lg:grid-cols-[1.4fr_1fr] lg:items-center">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-300">
                      Compliance Snapshot
                    </p>

                    <h2 className="mt-3 text-3xl font-bold">
                      Enterprise control overview
                    </h2>

                    <p className="mt-3 max-w-2xl text-slate-300">
                      Live identity, audit and
                      file-service data has been
                      consolidated into one operational
                      report.
                    </p>

                    <div className="mt-6 flex flex-wrap gap-3 text-sm">
                      <DarkBadge
                        text={`${report.departments.length} departments`}
                      />

                      <DarkBadge
                        text={`${report.sortedLogs.length} audit events`}
                      />

                      <DarkBadge
                        text={`${report.findings.length} permission findings`}
                      />

                      <DarkBadge
                        text={`${report.driveUsage}% disk used`}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <HealthPanel
                      label="Enterprise API"
                      value={
                        error
                          ? "Unavailable"
                          : "Online"
                      }
                      healthy={!error}
                    />

                    <HealthPanel
                      label="File Server"
                      value={serverName}
                      healthy={
                        report.onlineShares
                          .length ===
                        shares.length
                      }
                    />

                    <HealthPanel
                      label="Audit Logging"
                      value="Enabled"
                      healthy
                    />

                    <HealthPanel
                      label="Last Scan"
                      value={formatCompactDate(
                        generatedAt
                      )}
                      healthy
                    />
                  </div>
                </div>
              </section>

              <section className="mt-8 grid gap-6 xl:grid-cols-3">
                <ReportActionCard
                  icon={Users}
                  title="Directory Inventory"
                  description="Export all identities, departments, account states and lockout information."
                  statistic={`${report.normalizedUsers.length} identities`}
                  actionLabel="Export Users CSV"
                  onAction={
                    exportDirectoryCsv
                  }
                />

                <ReportActionCard
                  icon={Activity}
                  title="Administrative Audit"
                  description="Export administrator actions, outcomes, targets and timestamps."
                  statistic={`${report.sortedLogs.length} events`}
                  actionLabel="Export Audit CSV"
                  onAction={exportAuditCsv}
                />

                <ReportActionCard
                  icon={FolderLock}
                  title="Permission Review"
                  description="Export broad-access findings detected across live SMB shares."
                  statistic={`${report.findings.length} findings`}
                  actionLabel="Export Findings CSV"
                  onAction={
                    exportPermissionsCsv
                  }
                  warning={
                    report.findings.length > 0
                  }
                />
              </section>

              <section className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <Panel>
                  <PanelHeading
                    icon={Users}
                    title="Department Distribution"
                    description="Account health grouped by organizational department."
                  />

                  <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[650px]">
                        <thead className="bg-slate-100 text-left text-sm text-slate-600">
                          <tr>
                            <th className="px-5 py-4">
                              Department
                            </th>

                            <th className="px-5 py-4">
                              Users
                            </th>

                            <th className="px-5 py-4">
                              Enabled
                            </th>

                            <th className="px-5 py-4">
                              Disabled
                            </th>

                            <th className="px-5 py-4">
                              Health
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {report.departments.map(
                            (department) => (
                              <tr
                                key={
                                  department.department
                                }
                                className="border-t border-slate-100"
                              >
                                <td className="px-5 py-4 font-bold text-slate-900">
                                  {
                                    department.department
                                  }
                                </td>

                                <td className="px-5 py-4 text-slate-600">
                                  {
                                    department.total
                                  }
                                </td>

                                <td className="px-5 py-4 text-green-700">
                                  {
                                    department.enabled
                                  }
                                </td>

                                <td className="px-5 py-4 text-amber-700">
                                  {
                                    department.disabled
                                  }
                                </td>

                                <td className="px-5 py-4">
                                  <StatusBadge
                                    text={
                                      department.disabled ===
                                      0
                                        ? "Healthy"
                                        : "Review"
                                    }
                                    tone={
                                      department.disabled ===
                                      0
                                        ? "green"
                                        : "amber"
                                    }
                                  />
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>

                    {report.departments.length ===
                      0 && (
                      <EmptyState text="No department records were returned." />
                    )}
                  </div>
                </Panel>

                <Panel>
                  <PanelHeading
                    icon={HardDrive}
                    title="File Services Capacity"
                    description="Live storage and content statistics from the Windows Server."
                  />

                  <div className="mt-6 rounded-2xl bg-slate-100 p-6">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-sm text-slate-500">
                          Drive usage
                        </p>

                        <p className="mt-2 text-4xl font-bold text-slate-950">
                          {report.driveUsage}%
                        </p>
                      </div>

                      <p className="text-right text-sm text-slate-500">
                        {report.driveUsed.toFixed(
                          2
                        )}{" "}
                        GB used
                        <br />
                        {report.driveCapacity.toFixed(
                          2
                        )}{" "}
                        GB capacity
                      </p>
                    </div>

                    <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-300">
                      <div
                        className={`h-full rounded-full ${
                          report.driveUsage >=
                          80
                            ? "bg-red-500"
                            : report.driveUsage >=
                                65
                              ? "bg-amber-500"
                              : "bg-green-500"
                        }`}
                        style={{
                          width: `${Math.min(
                            report.driveUsage,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <SmallStatistic
                      label="Files"
                      value={report.totalFiles.toLocaleString(
                        "en-SG"
                      )}
                    />

                    <SmallStatistic
                      label="Folders"
                      value={report.totalFolders.toLocaleString(
                        "en-SG"
                      )}
                    />

                    <SmallStatistic
                      label="Shares Online"
                      value={`${report.onlineShares.length}/${shares.length}`}
                    />

                    <SmallStatistic
                      label="Permission Findings"
                      value={String(
                        report.findings.length
                      )}
                      warning={
                        report.findings.length >
                        0
                      }
                    />
                  </div>
                </Panel>
              </section>

              <section className="mt-8 grid gap-6 xl:grid-cols-2">
                <Panel>
                  <PanelHeading
                    icon={Activity}
                    title="Recent Administrative Activity"
                    description="Most recent actions captured by the audit logging service."
                  />

                  <div className="mt-6 space-y-3">
                    {report.sortedLogs
                      .slice(0, 8)
                      .map((log, index) => (
                        <AuditRow
                          key={
                            log.id ||
                            `${log.timestamp}-${index}`
                          }
                          log={log}
                        />
                      ))}

                    {report.sortedLogs.length ===
                      0 && (
                      <EmptyState text="No administrative events were recorded." />
                    )}
                  </div>
                </Panel>

                <Panel>
                  <PanelHeading
                    icon={ShieldAlert}
                    title="Access-Control Findings"
                    description="Broad or high-risk permission assignments requiring review."
                  />

                  <div className="mt-6 space-y-3">
                    {report.findings
                      .slice(0, 8)
                      .map(
                        (
                          finding,
                          index
                        ) => (
                          <PermissionFindingRow
                            key={`${finding.share}-${finding.principal}-${index}`}
                            finding={finding}
                          />
                        )
                      )}

                    {report.findings.length ===
                      0 && (
                      <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
                        <div className="flex items-center gap-3">
                          <CheckCircle2
                            className="text-green-700"
                            size={24}
                          />

                          <div>
                            <p className="font-bold text-green-900">
                              No broad-access
                              findings
                            </p>

                            <p className="mt-1 text-sm text-green-700">
                              The current share
                              permissions passed this
                              automated review.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </Panel>
              </section>

              <section className="mt-8 rounded-3xl border border-blue-200 bg-blue-50 p-7">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-4">
                    <FileText
                      className="mt-1 text-blue-700"
                      size={28}
                    />

                    <div>
                      <p className="text-xl font-bold text-blue-950">
                        Audit evidence statement
                      </p>

                      <p className="mt-2 max-w-4xl text-sm leading-6 text-blue-800">
                        This reporting centre
                        consolidates live Active
                        Directory, administrative audit
                        and Windows File Server data
                        through Next.js, Express and
                        PowerShell. Exported records can
                        be used as portfolio evidence of
                        infrastructure automation,
                        operational monitoring and
                        access-control review.
                      </p>
                    </div>
                  </div>

                  <StatusBadge
                    text="Live data verified"
                    tone="green"
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

function Panel({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
      {children}
    </section>
  );
}

function PanelHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
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
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  description,
  tone = "default",
  compact = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  description: string;
  tone?:
    | "default"
    | "green"
    | "amber"
    | "red";
  compact?: boolean;
}) {
  const styles = {
    default: {
      icon: "bg-slate-100 text-slate-700",
      value: "text-slate-950",
    },
    green: {
      icon: "bg-green-100 text-green-700",
      value: "text-green-700",
    },
    amber: {
      icon: "bg-amber-100 text-amber-700",
      value: "text-amber-700",
    },
    red: {
      icon: "bg-red-100 text-red-700",
      value: "text-red-700",
    },
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${styles[tone].icon}`}
      >
        <Icon size={20} />
      </span>

      <p className="mt-5 text-sm font-medium text-slate-500">
        {label}
      </p>

      <p
        className={`mt-2 font-bold ${styles[tone].value} ${
          compact
            ? "text-xl leading-7"
            : "text-4xl"
        }`}
      >
        {value}
      </p>

      <p className="mt-3 text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}

function ReportActionCard({
  icon: Icon,
  title,
  description,
  statistic,
  actionLabel,
  onAction,
  warning = false,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  statistic: string;
  actionLabel: string;
  onAction: () => void;
  warning?: boolean;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${
            warning
              ? "bg-amber-100 text-amber-700"
              : "bg-blue-100 text-blue-700"
          }`}
        >
          <Icon size={23} />
        </span>

        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            warning
              ? "bg-amber-100 text-amber-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {statistic}
        </span>
      </div>

      <h2 className="mt-6 text-2xl font-bold text-slate-950">
        {title}
      </h2>

      <p className="mt-3 min-h-16 text-sm leading-6 text-slate-500">
        {description}
      </p>

      <button
        type="button"
        onClick={onAction}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 font-bold text-white transition hover:bg-slate-800"
      >
        <Download size={18} />
        {actionLabel}
      </button>
    </section>
  );
}

function HealthPanel({
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
          healthy
            ? "text-green-300"
            : "text-red-300"
        }`}
      >
        ● {value}
      </p>
    </div>
  );
}

function DarkBadge({
  text,
}: {
  text: string;
}) {
  return (
    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-slate-200">
      {text}
    </span>
  );
}

function SmallStatistic({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-5">
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p
        className={`mt-2 text-2xl font-bold ${
          warning
            ? "text-amber-700"
            : "text-slate-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function AuditRow({
  log,
}: {
  log: AuditLog;
}) {
  const failed =
    String(log.status || "")
      .toLowerCase() === "failed";

  return (
    <div className="rounded-2xl border border-slate-200 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-slate-950">
              {log.action ||
                "Administrative Action"}
            </p>

            <StatusBadge
              text={
                failed ? "Failed" : "Success"
              }
              tone={
                failed ? "red" : "green"
              }
            />
          </div>

          <p className="mt-2 text-sm text-slate-600">
            {log.administrator ||
              "Administrator"}{" "}
            →{" "}
            {log.username ||
              "Unknown target"}
          </p>

          {log.details && (
            <p className="mt-2 line-clamp-2 text-sm text-slate-500">
              {log.details}
            </p>
          )}
        </div>

        <time className="shrink-0 text-xs text-slate-400">
          {formatCompactDate(
            log.timestamp || ""
          )}
        </time>
      </div>
    </div>
  );
}

function PermissionFindingRow({
  finding,
}: {
  finding: PermissionFinding;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-bold text-slate-950">
            {formatShareName(
              finding.share
            )}
          </p>

          <p className="mt-2 text-sm text-slate-600">
            {finding.principal} ·{" "}
            {finding.access}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            {finding.reason}
          </p>
        </div>

        <StatusBadge
          text={finding.severity}
          tone={
            finding.severity === "High"
              ? "red"
              : "amber"
          }
        />
      </div>
    </div>
  );
}

function StatusBadge({
  text,
  tone,
}: {
  text: string;
  tone:
    | "green"
    | "amber"
    | "red"
    | "blue";
}) {
  const style = {
    green:
      "bg-green-100 text-green-700",
    amber:
      "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${style[tone]}`}
    >
      {text}
    </span>
  );
}

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="p-8 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

function LoadingReport() {
  return (
    <div className="mt-8 space-y-6">
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map(
          (item) => (
            <div
              key={item}
              className="animate-pulse rounded-2xl bg-white p-6 shadow-sm"
            >
              <div className="h-10 w-10 rounded-xl bg-slate-200" />
              <div className="mt-5 h-4 w-24 rounded bg-slate-200" />
              <div className="mt-4 h-9 w-20 rounded bg-slate-200" />
              <div className="mt-4 h-3 w-32 rounded bg-slate-200" />
            </div>
          )
        )}
      </div>

      <div className="h-64 animate-pulse rounded-3xl bg-slate-200" />

      <div className="grid gap-6 xl:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-72 animate-pulse rounded-3xl bg-white"
          />
        ))}
      </div>
    </div>
  );
}

function normalizeUser(
  user: DirectoryUser
) {
  return {
    username:
      user.username ||
      user.Username ||
      user.samAccountName ||
      user.SamAccountName ||
      "Unknown",

    displayName:
      user.displayName ||
      user.DisplayName ||
      user.name ||
      user.Name ||
      "Unknown user",

    department: normalizeDepartment(
      user.department || user.Department || "",
    ),

    jobTitle:
      user.jobTitle ||
      user.JobTitle ||
      user.title ||
      user.Title ||
      "Not assigned",

    enabled:
      typeof user.enabled === "boolean"
        ? user.enabled
        : typeof user.Enabled ===
            "boolean"
          ? user.Enabled
          : true,

    lockedOut:
      typeof user.lockedOut ===
      "boolean"
        ? user.lockedOut
        : Boolean(user.LockedOut),

    passwordExpired:
      typeof user.passwordExpired ===
      "boolean"
        ? user.passwordExpired
        : Boolean(
            user.PasswordExpired
          ),
  };
}

function normalizeDepartment(value: string) {
  const department = value.trim();

  if (
    !department ||
    department === "-" ||
    department.toLowerCase() === "not assigned"
  ) {
    return "Unassigned";
  }

  const normalized = department.toLowerCase();

  if (normalized === "hr" || normalized === "human resources") {
    return "Human Resources";
  }

  if (normalized === "it" || normalized === "information technology") {
    return "IT";
  }

  return department
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function buildPermissionFindings(
  shares: FileShare[]
): PermissionFinding[] {
  const findings: PermissionFinding[] = [];

  const broadPrincipals = [
    "everyone",
    "authenticated users",
    "builtin\\users",
    "domain users",
  ];

  shares.forEach((share) => {
    const shareName =
      share.Name || "Unknown share";

    const sharePath =
      share.SharePath ||
      share.LocalPath ||
      "";

    (
      share.SharePermissions || []
    ).forEach((permission) => {
      const principal = String(
        permission.AccountName || ""
      );

      const access = String(
        permission.AccessRight || ""
      );

      const normalizedPrincipal =
        principal.toLowerCase();

      const broad = broadPrincipals.some(
        (value) =>
          normalizedPrincipal.includes(
            value
          )
      );

      if (broad) {
        findings.push({
          share: shareName,
          path: sharePath,
          principal,
          access,
          severity:
            access
              .toLowerCase()
              .includes("full")
              ? "High"
              : "Medium",
          reason:
            "Broad SMB access may bypass department-specific least-privilege controls.",
        });
      }
    });

    (
      share.NtfsPermissions || []
    ).forEach((permission) => {
      const principal = String(
        permission.Principal || ""
      );

      const access = String(
        permission.Access || ""
      );

      const normalizedPrincipal =
        principal.toLowerCase();

      const broad = broadPrincipals.some(
        (value) =>
          normalizedPrincipal.includes(
            value
          )
      );

      const privilegedAccess =
        access
          .toLowerCase()
          .includes("fullcontrol") ||
        access
          .toLowerCase()
          .includes("modify") ||
        access
          .toLowerCase()
          .includes("write");

      if (broad && privilegedAccess) {
        findings.push({
          share: shareName,
          path: sharePath,
          principal,
          access,
          severity: access
            .toLowerCase()
            .includes("fullcontrol")
            ? "High"
            : "Medium",
          reason:
            "Broad NTFS write access should be reviewed and replaced with department security groups.",
        });
      }
    });
  });

  return findings;
}

async function readJson<T>(
  response: Response,
  label: string
): Promise<T> {
  const text = await response.text();

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      text ||
        `The ${label} endpoint returned invalid JSON.`
    );
  }
}

function getApiError(
  data: UserApiResponse
) {
  if (Array.isArray(data)) {
    return "";
  }

  return data.Error || data.error || "";
}

function downloadCsv(
  filename: string,
  rows: Record<string, unknown>[]
) {
  if (rows.length === 0) {
    window.alert(
      "There is no report data to export."
    );

    return;
  }

  const headers = Object.keys(rows[0]);

  const csvRows = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) =>
          escapeCsvValue(row[header])
        )
        .join(",")
    ),
  ];

  const blob = new Blob(
    [csvRows.join("\n")],
    {
      type: "text/csv;charset=utf-8;",
    }
  );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

function escapeCsvValue(
  value: unknown
) {
  const text = String(value ?? "");

  return `"${text.replace(/"/g, '""')}"`;
}

function dateStamp() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function formatCompactDate(
  value: string
) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-SG",
    {
      day: "2-digit",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    }
  ).format(date);
}

function formatShareName(
  value: string
) {
  return value.replace(
    /([a-z])([A-Z])/g,
    "$1 $2"
  );
}