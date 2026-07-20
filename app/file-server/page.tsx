"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

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
  InheritanceFlags?: string;
};

type FileShare = {
  Name: string;
  Description?: string;
  Server?: string;
  SharePath: string;
  LocalPath: string;
  Status: string;
  FileCount: number;
  FolderCount: number;
  ShareSizeGB: number;
  Drive?: string;
  DriveUsedGB: number;
  DriveFreeGB: number;
  DriveCapacityGB: number;
  DriveUsagePercent: number;
  SharePermissions: SharePermission[];
  NtfsPermissions: NtfsPermission[];
};

type ApiFileShare = {
  name?: string;
  description?: string;
  server?: string;
  sharePath?: string;
  localPath?: string;
  status?: string;
  fileCount?: number;
  folderCount?: number;
  shareSizeGB?: number;
  drive?: string;
  driveUsedGB?: number;
  driveFreeGB?: number;
  driveCapacityGB?: number;
  driveUsagePercent?: number;
  sharePermissions?: SharePermission[];
  ntfsPermissions?: NtfsPermission[];
};

type FileShareResponse = {
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

type ShareFilter = "all" | "healthy" | "review" | "offline";

export default function FileServerPage() {
  const [shares, setShares] = useState<FileShare[]>([]);
  const [serverName, setServerName] = useState("Unknown");
  const [generatedAt, setGeneratedAt] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ShareFilter>("all");
  const [selectedShare, setSelectedShare] = useState<FileShare | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function loadFileShares(showRefresh = false) {
  if (showRefresh) {
    setIsRefreshing(true);
  } else {
    setIsLoading(true);
  }

  setError("");

  try {
    const response = await fetch("/api/file-shares", {
      method: "GET",
      cache: "no-store",
    });

    const text = await response.text();

    let data: FileShareResponse;

    try {
      data = text
        ? (JSON.parse(text) as FileShareResponse)
        : {};
    } catch {
      throw new Error(
        text || "The file server API returned invalid JSON."
      );
    }

    const successful =
      data.success === true ||
      data.Success === true;

    if (!response.ok || !successful) {
      throw new Error(
        data.error ||
          data.Error ||
          "Unable to retrieve file-server data."
      );
    }

    let liveShares: FileShare[] = [];

    if (Array.isArray(data.shares)) {
      liveShares = data.shares.map((share) => ({
        Name: share.name || "Unnamed Share",
        Description: share.description || "",
        Server: share.server || "",
        SharePath: share.sharePath || "",
        LocalPath: share.localPath || "",
        Status: share.status || "Unknown",
        FileCount: Number(share.fileCount || 0),
        FolderCount: Number(share.folderCount || 0),
        ShareSizeGB: Number(share.shareSizeGB || 0),
        Drive: share.drive || "",
        DriveUsedGB: Number(share.driveUsedGB || 0),
        DriveFreeGB: Number(share.driveFreeGB || 0),
        DriveCapacityGB: Number(
          share.driveCapacityGB || 0
        ),
        DriveUsagePercent: Number(
          share.driveUsagePercent || 0
        ),
        SharePermissions: Array.isArray(
          share.sharePermissions
        )
          ? share.sharePermissions
          : [],
        NtfsPermissions: Array.isArray(
          share.ntfsPermissions
        )
          ? share.ntfsPermissions
          : [],
      }));
    } else if (Array.isArray(data.Shares)) {
      liveShares = data.Shares;
    }

    setShares(liveShares);

    setServerName(
      data.server ||
        data.Server ||
        liveShares[0]?.Server ||
        "Windows Server"
    );

    setGeneratedAt(
      data.generatedAt ||
        data.GeneratedAt ||
        ""
    );
  } catch (error) {
    setShares([]);
    setServerName("Unavailable");

    setError(
      error instanceof Error
        ? error.message
        : "Unable to connect to the file server."
    );
  } finally {
    setIsLoading(false);
    setIsRefreshing(false);
  }
}
  const filteredShares = useMemo(() => {
    const query = search.trim().toLowerCase();

    return shares
      .filter((share) => {
        const matchesSearch =
          !query ||
          [
            share.Name,
            share.SharePath,
            share.LocalPath,
            share.Server,
            share.Description,
          ].some((value) =>
            String(value || "")
              .toLowerCase()
              .includes(query),
          );

        if (!matchesSearch) {
          return false;
        }

        const severity = getShareAssessment(share).severity;

        if (activeFilter === "healthy") {
          return severity === "healthy";
        }

        if (activeFilter === "review") {
          return severity === "warning";
        }

        if (activeFilter === "offline") {
          return severity === "critical";
        }

        return true;
      })
      .sort((first, second) => {
        const priority = {
          critical: 0,
          warning: 1,
          healthy: 2,
        };

        const firstPriority = priority[getShareAssessment(first).severity];
        const secondPriority = priority[getShareAssessment(second).severity];

        if (firstPriority !== secondPriority) {
          return firstPriority - secondPriority;
        }

        return first.Name.localeCompare(second.Name);
      });
  }, [activeFilter, search, shares]);

  const statistics = useMemo(() => {
    const onlineShares = shares.filter(
      (share) => String(share.Status).toLowerCase() === "online",
    ).length;

    const totalFiles = shares.reduce(
      (total, share) => total + Number(share.FileCount || 0),
      0,
    );

    const totalFolders = shares.reduce(
      (total, share) => total + Number(share.FolderCount || 0),
      0,
    );

    const capacityValues = shares
      .map((share) => Number(share.DriveCapacityGB || 0))
      .filter((value) => value > 0);

    const usedValues = shares
      .map((share) => Number(share.DriveUsedGB || 0))
      .filter((value) => value >= 0);

    const totalCapacity =
      capacityValues.length > 0 ? Math.max(...capacityValues) : 0;

    const totalUsed = usedValues.length > 0 ? Math.max(...usedValues) : 0;

    const usagePercentage =
      totalCapacity > 0 ? Math.round((totalUsed / totalCapacity) * 100) : 0;

    const permissionRisks = shares.filter((share) =>
      hasBroadAccess(share),
    ).length;

    const warningShares = shares.filter(
      (share) => getShareAssessment(share).severity === "warning",
    ).length;

    const offlineShares = shares.filter(
      (share) => getShareAssessment(share).severity === "critical",
    ).length;

    const healthyShares = Math.max(
      shares.length - warningShares - offlineShares,
      0,
    );

    const healthScore =
      shares.length === 0
        ? 0
        : Math.max(
            0,
            Math.round(
              100 -
                (warningShares / shares.length) * 35 -
                (offlineShares / shares.length) * 65 -
                (usagePercentage >= 80 ? 10 : 0),
            ),
          );

    return {
      totalShares: shares.length,
      onlineShares,
      totalFiles,
      totalFolders,
      totalCapacity,
      totalUsed,
      usagePercentage,
      permissionRisks,
      warningShares,
      offlineShares,
      healthyShares,
      healthScore,
    };
  }, [shares]);

  return (
    <main className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <div className="min-w-0 flex-1">
        <Header />

        <div className="p-6 md:p-8 lg:p-10">
          <section className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
                Infrastructure Operations
              </p>

              <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
                File Services
              </h1>

              <p className="mt-3 max-w-3xl text-slate-500">
                Live SMB share inventory, storage monitoring and access-control
                visibility retrieved from the Windows Server environment.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-3">
                <p className="text-xs font-bold uppercase tracking-wider text-green-700">
                  Data Source
                </p>

                <p className="mt-1 font-bold text-green-900">
                  Live Windows Server
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadFileShares(true)}
                disabled={isRefreshing}
                className="rounded-xl bg-slate-900 px-5 py-3 font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRefreshing ? "Refreshing..." : "Refresh Infrastructure"}
              </button>
            </div>
          </section>

          {error && (
            <section className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6">
              <p className="font-bold text-red-800">
                File Server Connection Failed
              </p>

              <p className="mt-2 text-sm text-red-700">{error}</p>

              <button
                type="button"
                onClick={() => void loadFileShares()}
                className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800"
              >
                Retry Connection
              </button>
            </section>
          )}

          <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-6">
            <MetricCard
              label="SMB Shares"
              value={String(statistics.totalShares)}
              description="Discovered live"
            />

            <MetricCard
              label="Online"
              value={String(statistics.onlineShares)}
              description="Available shares"
              healthy={
                statistics.totalShares > 0 &&
                statistics.onlineShares === statistics.totalShares
              }
            />

            <MetricCard
              label="Files"
              value={statistics.totalFiles.toLocaleString("en-SG")}
              description="Across all shares"
            />

            <MetricCard
              label="Folders"
              value={statistics.totalFolders.toLocaleString("en-SG")}
              description="Across all shares"
            />

            <MetricCard
              label="Disk Usage"
              value={`${statistics.usagePercentage}%`}
              description={`${statistics.totalUsed.toFixed(2)} GB used`}
              warning={statistics.usagePercentage >= 80}
            />

            <MetricCard
              label="Permission Reviews"
              value={String(statistics.permissionRisks)}
              description="Broad access detected"
              warning={statistics.permissionRisks > 0}
            />
          </section>

          <section className="mt-8 overflow-hidden rounded-3xl bg-slate-950 text-white shadow-2xl">
            <div className="grid gap-8 p-7 xl:grid-cols-[1.35fr_0.65fr] xl:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-300">
                    File Services Control Plane
                  </p>

                  <span className="rounded-full border border-green-400/30 bg-green-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-300">
                    Live telemetry
                  </span>
                </div>

                <h2 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
                  {serverName}
                </h2>

                <p className="mt-3 max-w-2xl text-slate-300">
                  Continuous SMB inventory, access-control assessment and
                  storage telemetry collected through the Enterprise API and
                  PowerShell.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <HealthItem
                    label="Enterprise API"
                    value={error ? "Unavailable" : "Online"}
                    healthy={!error}
                  />

                  <HealthItem
                    label="SMB Availability"
                    value={`${statistics.onlineShares}/${statistics.totalShares} Online`}
                    healthy={
                      statistics.totalShares > 0 &&
                      statistics.onlineShares === statistics.totalShares
                    }
                  />

                  <HealthItem
                    label="PowerShell"
                    value={error ? "Failed" : "Connected"}
                    healthy={!error}
                  />
                </div>

                {generatedAt && (
                  <p className="mt-5 text-sm text-slate-400">
                    Last successful scan: {formatDate(generatedAt)}
                  </p>
                )}
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  Infrastructure health score
                </p>

                <div className="mt-5 flex items-center gap-6">
                  <div
                    className="relative grid h-32 w-32 shrink-0 place-items-center rounded-full"
                    style={{
                      background: `conic-gradient(rgb(74 222 128) ${statistics.healthScore * 3.6}deg, rgb(30 41 59) 0deg)`,
                    }}
                  >
                    <div className="grid h-24 w-24 place-items-center rounded-full bg-slate-950">
                      <div className="text-center">
                        <p className="text-3xl font-black">
                          {statistics.healthScore}
                        </p>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          percent
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xl font-bold">
                      {getScoreLabel(statistics.healthScore)}
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Calculated from availability, permission exposure and
                      capacity thresholds.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-5 md:grid-cols-3">
            <OperationalInsight
              label="Healthy Shares"
              value={String(statistics.healthyShares)}
              description="Online with no broad-access or capacity risks detected."
              tone="healthy"
            />

            <OperationalInsight
              label="Security Reviews"
              value={String(statistics.warningShares)}
              description="Shares requiring permission or storage review."
              tone={statistics.warningShares > 0 ? "warning" : "healthy"}
            />

            <OperationalInsight
              label="Unavailable Shares"
              value={String(statistics.offlineShares)}
              description="Share paths that could not be reached during the latest scan."
              tone={statistics.offlineShares > 0 ? "critical" : "healthy"}
            />
          </section>

          <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Share Governance Inventory
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Prioritized by operational and access-control risk so
                  administrators can review the highest-impact findings first.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <FilterButton
                    label="All shares"
                    count={statistics.totalShares}
                    active={activeFilter === "all"}
                    onClick={() => setActiveFilter("all")}
                  />

                  <FilterButton
                    label="Healthy"
                    count={statistics.healthyShares}
                    active={activeFilter === "healthy"}
                    onClick={() => setActiveFilter("healthy")}
                  />

                  <FilterButton
                    label="Review"
                    count={statistics.warningShares}
                    active={activeFilter === "review"}
                    onClick={() => setActiveFilter("review")}
                  />

                  <FilterButton
                    label="Offline"
                    count={statistics.offlineShares}
                    active={activeFilter === "offline"}
                    onClick={() => setActiveFilter("offline")}
                  />
                </div>
              </div>

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search shares, paths or servers..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 xl:max-w-md"
              />
            </div>
          </section>

          <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
            {isLoading ? (
              <LoadingTable />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1100px]">
                    <thead className="bg-slate-100 text-left text-sm text-slate-600">
                      <tr>
                        <th className="px-6 py-4">Share</th>

                        <th className="px-6 py-4">SMB Path</th>

                        <th className="px-6 py-4">Contents</th>

                        <th className="px-6 py-4">Storage</th>

                        <th className="px-6 py-4">Share Access</th>

                        <th className="px-6 py-4">Health</th>

                        <th className="px-6 py-4">Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredShares.map((share) => (
                        <tr
                          key={`${share.Server}-${share.Name}`}
                          className="border-t border-slate-100 transition hover:bg-slate-50"
                        >
                          <td className="px-6 py-5">
                            <p className="font-bold text-slate-900">
                              {formatShareName(share.Name)}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {share.LocalPath}
                            </p>
                          </td>

                          <td className="px-6 py-5">
                            <code className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">
                              {share.SharePath}
                            </code>
                          </td>

                          <td className="px-6 py-5">
                            <p className="font-semibold text-slate-900">
                              {Number(share.FileCount || 0).toLocaleString(
                                "en-SG",
                              )}{" "}
                              files
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              {Number(share.FolderCount || 0).toLocaleString(
                                "en-SG",
                              )}{" "}
                              folders
                            </p>
                          </td>

                          <td className="min-w-56 px-6 py-5">
                            <StorageBar
                              used={Number(share.DriveUsedGB || 0)}
                              capacity={Number(share.DriveCapacityGB || 0)}
                              percentage={Number(share.DriveUsagePercent || 0)}
                            />
                          </td>

                          <td className="px-6 py-5">
                            <p className="font-semibold text-slate-900">
                              {(share.SharePermissions || []).length} entries
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              {(share.NtfsPermissions || []).length} NTFS rules
                            </p>
                          </td>

                          <td className="px-6 py-5">
                            <ShareHealthBadge share={share} />
                          </td>

                          <td className="px-6 py-5">
                            <button
                              type="button"
                              onClick={() => setSelectedShare(share)}
                              className="rounded-lg bg-slate-900 px-4 py-2 font-bold text-white transition hover:bg-slate-700"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredShares.length === 0 && (
                  <div className="p-12 text-center">
                    <p className="font-bold text-slate-700">No shares found</p>

                    <p className="mt-2 text-sm text-slate-500">
                      Try a different search term.
                    </p>
                  </div>
                )}
              </>
            )}
          </section>

          <section className="mt-8 grid gap-6 lg:grid-cols-3">
            <SecurityCard
              title="Live Infrastructure Data"
              description="Share information is retrieved through Express and PowerShell directly from the Windows Server environment."
            />

            <SecurityCard
              title="Access-Control Visibility"
              description="SMB and NTFS permission entries are available for security and least-privilege reviews."
            />

            <SecurityCard
              title="Operational Monitoring"
              description="The portal monitors availability, contents and disk-capacity information for every discovered share."
            />
          </section>
        </div>
      </div>

      {selectedShare && (
        <ShareDetailsModal
          share={selectedShare}
          onClose={() => setSelectedShare(null)}
        />
      )}
    </main>
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
          ? "border-slate-900 bg-slate-900 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700"
      }`}
    >
      {label}
      <span
        className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
          active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function MetricCard({
  label,
  value,
  description,
  warning = false,
  healthy = false,
}: {
  label: string;
  value: string;
  description: string;
  warning?: boolean;
  healthy?: boolean;
}) {
  let valueStyle = "text-slate-900";

  if (warning) {
    valueStyle = "text-amber-600";
  } else if (healthy) {
    valueStyle = "text-green-600";
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>

      <p className={`mt-3 text-4xl font-bold ${valueStyle}`}>{value}</p>

      <p className="mt-3 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function HealthItem({
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
          healthy ? "text-green-300" : "text-red-300"
        }`}
      >
        {healthy ? "● " : "● "}
        {value}
      </p>
    </div>
  );
}

function StorageBar({
  used,
  capacity,
  percentage,
}: {
  used: number;
  capacity: number;
  percentage: number;
}) {
  const safePercentage = Math.min(Math.max(percentage, 0), 100);

  let barStyle = "bg-green-500";

  if (safePercentage >= 80) {
    barStyle = "bg-red-500";
  } else if (safePercentage >= 65) {
    barStyle = "bg-amber-500";
  }

  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-700">
          {used.toFixed(2)} GB
        </span>

        <span className="text-slate-500">{safePercentage.toFixed(1)}%</span>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full ${barStyle}`}
          style={{
            width: `${safePercentage}%`,
          }}
        />
      </div>

      <p className="mt-2 text-xs text-slate-500">
        {capacity.toFixed(2)} GB capacity
      </p>
    </div>
  );
}

function ShareHealthBadge({ share }: { share: FileShare }) {
  const health = getShareAssessment(share);

  return (
    <div className="min-w-40">
      <span
        className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ${health.style}`}
      >
        <span className="mr-2">{health.icon}</span>
        {health.label}
      </span>

      <p className="mt-2 text-xs leading-5 text-slate-500">{health.detail}</p>
    </div>
  );
}

function OperationalInsight({
  label,
  value,
  description,
  tone,
}: {
  label: string;
  value: string;
  description: string;
  tone: "healthy" | "warning" | "critical";
}) {
  const toneStyles = {
    healthy: {
      border: "border-green-200",
      background: "bg-green-50",
      value: "text-green-700",
      badge: "bg-green-100 text-green-700",
      status: "Operational",
    },
    warning: {
      border: "border-amber-200",
      background: "bg-amber-50",
      value: "text-amber-700",
      badge: "bg-amber-100 text-amber-700",
      status: "Review",
    },
    critical: {
      border: "border-red-200",
      background: "bg-red-50",
      value: "text-red-700",
      badge: "bg-red-100 text-red-700",
      status: "Attention",
    },
  }[tone];

  return (
    <div
      className={`rounded-2xl border p-6 shadow-sm ${toneStyles.border} ${toneStyles.background}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-600">{label}</p>
          <p className={`mt-2 text-4xl font-black ${toneStyles.value}`}>
            {value}
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${toneStyles.badge}`}
        >
          {toneStyles.status}
        </span>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function SecurityCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="font-bold text-slate-900">{title}</p>

      <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function ShareDetailsModal({
  share,
  onClose,
}: {
  share: FileShare;
  onClose: () => void;
}) {
  const sharePermissions = share.SharePermissions || [];

  const ntfsPermissions = share.NtfsPermissions || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b bg-white p-7">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
              Live Share Inspection
            </p>

            <h2 className="mt-2 text-3xl font-bold text-slate-900">
              {formatShareName(share.Name)}
            </h2>

            <p className="mt-2 font-mono text-sm text-slate-500">
              {share.SharePath}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2 font-bold text-slate-700 transition hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <div className="p-7">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
            <DetailCard label="Server" value={share.Server || "Unknown"} />

            <DetailCard
              label="Files"
              value={Number(share.FileCount || 0).toLocaleString("en-SG")}
            />

            <DetailCard
              label="Folders"
              value={Number(share.FolderCount || 0).toLocaleString("en-SG")}
            />

            <DetailCard
              label="Share Size"
              value={`${Number(share.ShareSizeGB || 0).toFixed(2)} GB`}
            />

            <DetailCard label="Status" value={share.Status || "Unknown"} />
          </div>

          <ShareRiskSummary share={share} />

          <section className="mt-8 rounded-2xl bg-slate-100 p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Disk Capacity
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Live capacity information from{" "}
                  {share.Drive || "the server drive"}.
                </p>
              </div>

              <div className="w-full max-w-xl">
                <StorageBar
                  used={Number(share.DriveUsedGB || 0)}
                  capacity={Number(share.DriveCapacityGB || 0)}
                  percentage={Number(share.DriveUsagePercent || 0)}
                />
              </div>
            </div>
          </section>

          <PermissionTable
            title="SMB Share Permissions"
            description="Permissions configured directly on the SMB share."
            permissions={sharePermissions.map((permission) => ({
              principal: permission.AccountName || "Unknown",
              access: permission.AccessRight || "Unknown",
              type: permission.AccessType || "Unknown",
              inherited: "Share level",
            }))}
          />

          <PermissionTable
            title="NTFS Permissions"
            description="File-system permissions applied to the local department folder."
            permissions={ntfsPermissions.map((permission) => ({
              principal: permission.Principal || "Unknown",
              access: permission.Access || "Unknown",
              type: permission.AccessType || "Unknown",
              inherited:
                permission.IsInherited === true ? "Inherited" : "Explicit",
            }))}
          />

          <section className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-6">
            <p className="font-bold text-blue-900">Infrastructure evidence</p>

            <p className="mt-2 text-sm leading-6 text-blue-800">
              This information was retrieved from the Windows Server through the
              Enterprise API and PowerShell. It is not hardcoded frontend data.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function ShareRiskSummary({ share }: { share: FileShare }) {
  const assessment = getShareAssessment(share);

  return (
    <section className={`mt-8 rounded-2xl border p-6 ${assessment.panelStyle}`}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
            Automated control assessment
          </p>

          <h3 className="mt-2 text-2xl font-bold text-slate-900">
            {assessment.label}
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            {assessment.detail}
          </p>
        </div>

        <span
          className={`inline-flex w-fit items-center rounded-full px-4 py-2 text-sm font-bold ${assessment.style}`}
        >
          <span className="mr-2">{assessment.icon}</span>
          {assessment.riskLevel} risk
        </span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/70 bg-white/70 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Findings
          </p>

          <div className="mt-3 space-y-3">
            {assessment.findings.map((finding) => (
              <div
                key={finding}
                className="flex gap-3 text-sm leading-6 text-slate-700"
              >
                <span className="font-black text-slate-400">•</span>
                <span>{finding}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/70 bg-white/70 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Recommended action
          </p>

          <p className="mt-3 text-sm leading-6 text-slate-700">
            {assessment.recommendation}
          </p>

          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Control reference
          </p>

          <p className="mt-1 text-sm font-bold text-slate-800">
            Least privilege · SMB/NTFS access review
          </p>
        </div>
      </div>
    </section>
  );
}

function PermissionTable({
  title,
  description,
  permissions,
}: {
  title: string;
  description: string;
  permissions: {
    principal: string;
    access: string;
    type: string;
    inherited: string;
  }[];
}) {
  return (
    <section className="mt-8">
      <h3 className="text-xl font-bold text-slate-900">{title}</h3>

      <p className="mt-1 text-sm text-slate-500">{description}</p>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-slate-100 text-left text-sm text-slate-600">
              <tr>
                <th className="px-5 py-4">Security Principal</th>

                <th className="px-5 py-4">Access</th>

                <th className="px-5 py-4">Type</th>

                <th className="px-5 py-4">Source</th>
              </tr>
            </thead>

            <tbody>
              {permissions.map((permission, index) => (
                <tr
                  key={`${permission.principal}-${permission.access}-${index}`}
                  className="border-t border-slate-100"
                >
                  <td className="px-5 py-4 font-semibold text-slate-900">
                    {permission.principal}
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {permission.access}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-bold ${
                        permission.type.toLowerCase() === "allow"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {permission.type}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-500">
                    {permission.inherited}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {permissions.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            No permission entries were returned.
          </div>
        )}
      </div>
    </section>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>

      <p className="mt-2 break-words font-bold text-slate-900">{value}</p>
    </div>
  );
}

function LoadingTable() {
  return (
    <div className="p-6">
      <div className="space-y-4">
        {[1, 2, 3, 4, 5, 6].map((item) => (
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
    </div>
  );
}

function getBroadPermissionFindings(share: FileShare) {
  const broadPrincipals = [
    "everyone",
    "authenticated users",
    "domain users",
    "builtin\\users",
    "guest",
    "guests",
  ];

  const elevatedRights = ["full", "change", "modify", "write"];

  return (share.SharePermissions || [])
    .filter((permission) => {
      const principal = String(permission.AccountName || "").toLowerCase();

      const right = String(permission.AccessRight || "").toLowerCase();

      const type = String(permission.AccessType || "").toLowerCase();

      return (
        type !== "deny" &&
        broadPrincipals.some((item) => principal.includes(item)) &&
        elevatedRights.some((item) => right.includes(item))
      );
    })
    .map((permission) => {
      const principal = permission.AccountName || "Unknown principal";
      const right = permission.AccessRight || "elevated access";

      return `${principal} has ${right} at the SMB share level.`;
    });
}

function hasBroadAccess(share: FileShare) {
  return getBroadPermissionFindings(share).length > 0;
}

function getShareAssessment(share: FileShare) {
  const status = String(share.Status || "").toLowerCase();

  const broadFindings = getBroadPermissionFindings(share);

  const capacity = Number(share.DriveUsagePercent || 0);

  if (status !== "online") {
    return {
      severity: "critical" as const,
      riskLevel: "Critical",
      label: "Share unavailable",
      detail:
        "The SMB path could not be reached during the latest infrastructure scan.",
      findings: [
        `Status returned by Windows Server: ${share.Status || "Unknown"}.`,
        `Path checked: ${share.SharePath || share.LocalPath || "Unknown path"}.`,
      ],
      recommendation:
        "Validate the local path, SMB service, share definition and server connectivity before restoring user access.",
      icon: "●",
      style: "bg-red-100 text-red-700",
      panelStyle: "border-red-200 bg-red-50",
    };
  }

  if (broadFindings.length > 0) {
    return {
      severity: "warning" as const,
      riskLevel: "Medium",
      label: "Permission review required",
      detail:
        "The share is online, but elevated access is assigned to a broad security principal.",
      findings: broadFindings,
      recommendation:
        "Replace broad principals with department-specific read/write security groups, then verify that NTFS permissions enforce the intended least-privilege access model.",
      icon: "!",
      style: "bg-amber-100 text-amber-700",
      panelStyle: "border-amber-200 bg-amber-50",
    };
  }

  if (capacity >= 80) {
    return {
      severity: "warning" as const,
      riskLevel: "High",
      label: "Capacity threshold exceeded",
      detail:
        "The share is available, but its hosting drive has exceeded the configured 80% threshold.",
      findings: [
        `Current drive utilization is ${capacity.toFixed(1)}%.`,
        `${Number(share.DriveFreeGB || 0).toFixed(2)} GB remains available.`,
      ],
      recommendation:
        "Review growth trends, archive inactive data and increase capacity before the drive reaches a service-impacting level.",
      icon: "!",
      style: "bg-amber-100 text-amber-700",
      panelStyle: "border-amber-200 bg-amber-50",
    };
  }

  return {
    severity: "healthy" as const,
    riskLevel: "Low",
    label: "Controls operating normally",
    detail:
      "The share is online with no broad-access or capacity risks detected by the current policy checks.",
    findings: [
      "The SMB path was reachable during the latest scan.",
      `Drive utilization is ${capacity.toFixed(1)}%, below the 80% review threshold.`,
      "No elevated share-level access was detected for configured broad principals.",
    ],
    recommendation:
      "No immediate remediation is required. Continue periodic permission recertification and capacity monitoring.",
    icon: "✓",
    style: "bg-green-100 text-green-700",
    panelStyle: "border-green-200 bg-green-50",
  };
}

function getScoreLabel(score: number) {
  if (score >= 90) return "Strong control posture";
  if (score >= 75) return "Operational with reviews";
  if (score >= 50) return "Attention required";
  return "Critical remediation required";
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function formatShareName(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2");
}