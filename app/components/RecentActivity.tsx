"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type AuditLog = {
  id?: string;
  administrator?: string;
  Administrator?: string;
  action?: string;
  Action?: string;
  username?: string;
  Username?: string;
  details?: string;
  Details?: string;
  status?: string;
  Status?: string;
  timestamp?: string;
  Timestamp?: string;
  createdAt?: string;
};

type AuditResponse =
  | AuditLog[]
  | {
      success?: boolean;
      logs?: AuditLog[];
      data?: AuditLog[];
      error?: string;
    };

export default function RecentActivity() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastRefreshed, setLastRefreshed] =
    useState<Date | null>(null);

  const loadActivity = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/audit-logs", {
        method: "GET",
        cache: "no-store",
      });

      const responseText = await response.text();

      let data: AuditResponse;

      try {
        data = responseText
          ? (JSON.parse(responseText) as AuditResponse)
          : [];
      } catch {
        throw new Error(
          "The audit API returned an invalid response."
        );
      }

      if (!response.ok) {
        const message =
          !Array.isArray(data) &&
          typeof data === "object" &&
          data !== null &&
          data.error
            ? data.error
            : "Unable to retrieve audit activity.";

        throw new Error(message);
      }

      const auditLogs = extractLogs(data);

      const sortedLogs = [...auditLogs].sort(
        (firstLog, secondLog) => {
          return (
            getTimestamp(secondLog) -
            getTimestamp(firstLog)
          );
        }
      );

      setLogs(sortedLogs.slice(0, 6));
      setLastRefreshed(new Date());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to retrieve audit activity."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadActivity();

    const interval = window.setInterval(() => {
      void loadActivity();
    }, 30_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadActivity]);

  const successfulEvents = useMemo(
    () =>
      logs.filter(
        (log) =>
          getLogStatus(log).toLowerCase() ===
          "success"
      ).length,
    [logs]
  );

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            Audit Trail
          </p>

          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            Recent Activity
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Latest privileged operations recorded by the
            administration portal.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadActivity()}
          disabled={isLoading}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <SummaryMetric
          label="Displayed events"
          value={logs.length}
        />

        <SummaryMetric
          label="Successful"
          value={successfulEvents}
        />
      </div>

      {lastRefreshed && (
        <p className="mt-3 text-xs text-slate-400">
          Last refreshed{" "}
          {lastRefreshed.toLocaleTimeString("en-SG", {
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
          })}
        </p>
      )}

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="font-semibold text-red-700">
            Audit pipeline unavailable
          </p>

          <p className="mt-1 text-sm text-red-600">
            {error}
          </p>
        </div>
      )}

      <div className="mt-6">
        {isLoading && logs.length === 0 ? (
          <ActivitySkeleton />
        ) : logs.length > 0 ? (
          <div className="space-y-3">
            {logs.map((log, index) => (
              <ActivityItem
                key={
                  log.id ||
                  `${getRawTimestamp(log)}-${getUsername(
                    log
                  )}-${index}`
                }
                log={log}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="font-semibold text-slate-700">
              No administrative activity recorded
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Account-management actions will appear here
              after they are completed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityItem({
  log,
}: {
  log: AuditLog;
}) {
  const status = getLogStatus(log);
  const successful =
    status.toLowerCase() === "success";

  const action =
    log.action ||
    log.Action ||
    "Administrative Action";

  const administrator =
    log.administrator ||
    log.Administrator ||
    "Administrator";

  const username = getUsername(log);

  const details =
    log.details ||
    log.Details ||
    "";

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-blue-200 hover:shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-4">
          <div
            className={`mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
              successful
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {successful ? "✓" : "!"}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-bold text-slate-900">
                {action}
              </p>

              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  successful
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {successful ? "Success" : "Failed"}
              </span>
            </div>

            <p className="mt-2 text-sm text-slate-600">
              <span className="font-semibold">
                {administrator}
              </span>

              <span className="mx-2 text-slate-300">
                →
              </span>

              <span className="font-semibold">
                {username}
              </span>
            </p>

            {details && (
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                {details}
              </p>
            )}
          </div>
        </div>

        <time className="shrink-0 text-xs font-medium text-slate-400">
          {formatTimestamp(getRawTimestamp(log))}
        </time>
      </div>
    </article>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="animate-pulse rounded-2xl border border-slate-200 p-5"
        >
          <div className="flex gap-4">
            <div className="h-11 w-11 rounded-xl bg-slate-200" />

            <div className="flex-1">
              <div className="h-4 w-40 rounded bg-slate-200" />
              <div className="mt-3 h-3 w-56 rounded bg-slate-200" />
              <div className="mt-3 h-3 w-full max-w-xs rounded bg-slate-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SummaryMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl bg-slate-100 px-4 py-3">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function extractLogs(
  response: AuditResponse
): AuditLog[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response.logs)) {
    return response.logs;
  }

  if (Array.isArray(response.data)) {
    return response.data;
  }

  return [];
}

function getUsername(log: AuditLog) {
  return (
    log.username ||
    log.Username ||
    "Unknown user"
  );
}

function getLogStatus(log: AuditLog) {
  return (
    log.status ||
    log.Status ||
    "Success"
  );
}

function getRawTimestamp(log: AuditLog) {
  return (
    log.timestamp ||
    log.Timestamp ||
    log.createdAt ||
    ""
  );
}

function getTimestamp(log: AuditLog) {
  const timestamp = getRawTimestamp(log);

  if (!timestamp) {
    return 0;
  }

  const parsedTimestamp = new Date(timestamp).getTime();

  return Number.isNaN(parsedTimestamp)
    ? 0
    : parsedTimestamp;
}

function formatTimestamp(timestamp?: string) {
  if (!timestamp) {
    return "Unknown time";
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  const now = new Date();

  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  const time = new Intl.DateTimeFormat("en-SG", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

  if (isToday) {
    return `Today, ${time}`;
  }

  if (isYesterday) {
    return `Yesterday, ${time}`;
  }

  return new Intl.DateTimeFormat("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}