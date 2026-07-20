"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  ShieldAlert,
  X,
} from "lucide-react";

type AuditLog = {
  id?: string;
  action?: string;
  administrator?: string;
  username?: string;
  targetUser?: string;
  details?: string;
  status?: string;
  timestamp?: string;
};

type AuditApiResponse =
  | AuditLog[]
  | {
      success?: boolean;
      logs?: AuditLog[];
      auditLogs?: AuditLog[];
      error?: string;
    };

const pageDetails: Record<
  string,
  {
    title: string;
    description: string;
  }
> = {
  "/": {
    title: "Dashboard",
    description:
      "Welcome back, Administrator.",
  },
  "/users": {
    title: "Users",
    description:
      "Manage Active Directory identities and account operations.",
  },
  "/active-directory": {
    title: "Active Directory",
    description:
      "Monitor directory services, departments and organizational units.",
  },
  "/file-server": {
    title: "File Server",
    description:
      "Monitor SMB shares, permissions and storage infrastructure.",
  },
  "/reports": {
    title: "Reports",
    description:
      "Review governance, compliance and infrastructure evidence.",
  },
  "/settings": {
    title: "Settings",
    description:
      "View infrastructure configuration and operational health.",
  },
};

export default function Header() {
  const pathname = usePathname();

  const [logs, setLogs] = useState<
    AuditLog[]
  >([]);

  const [isOpen, setIsOpen] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [error, setError] = useState("");

  const [lastReadAt, setLastReadAt] =
    useState<number>(0);

  const notificationRef =
    useRef<HTMLDivElement>(null);

  const currentPage = getCurrentPage(
    pathname
  );

  async function loadNotifications(
    refresh = false
  ) {
    if (refresh) {
      setIsRefreshing(true);
    }

    setError("");

    try {
      const response = await fetch(
        "/api/audit-logs",
        {
          cache: "no-store",
        }
      );

      const text = await response.text();

      let data: AuditApiResponse;

      try {
        data = JSON.parse(
          text
        ) as AuditApiResponse;
      } catch {
        throw new Error(
          "The audit service returned invalid data."
        );
      }

      if (!response.ok) {
        throw new Error(
          !Array.isArray(data) && data.error
            ? data.error
            : "Unable to retrieve notifications."
        );
      }

      const liveLogs = Array.isArray(data)
        ? data
        : Array.isArray(data.logs)
          ? data.logs
          : Array.isArray(data.auditLogs)
            ? data.auditLogs
            : [];

      const sortedLogs = [...liveLogs].sort(
        (a, b) =>
          getTimestamp(b.timestamp) -
          getTimestamp(a.timestamp)
      );

      setLogs(sortedLogs);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to load notifications."
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    const storedLastRead =
      window.localStorage.getItem(
        "enterprise-notifications-last-read"
      );

    if (storedLastRead) {
      setLastReadAt(
        Number(storedLastRead)
      );
    }

    void loadNotifications();

    const interval = window.setInterval(
      () => {
        void loadNotifications();
      },
      30000
    );

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(
      event: MouseEvent
    ) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(
          event.target as Node
        )
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  const unreadCount = useMemo(() => {
    return logs.filter(
      (log) =>
        getTimestamp(log.timestamp) >
        lastReadAt
    ).length;
  }, [logs, lastReadAt]);

  function markAllAsRead() {
    const newestTimestamp =
      logs.length > 0
        ? Math.max(
            ...logs.map((log) =>
              getTimestamp(log.timestamp)
            )
          )
        : Date.now();

    setLastReadAt(newestTimestamp);

    window.localStorage.setItem(
      "enterprise-notifications-last-read",
      String(newestTimestamp)
    );
  }

  function toggleNotifications() {
    setIsOpen((current) => !current);
  }

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur md:px-8">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
          {currentPage.title}
        </h1>

        <p className="mt-1 hidden text-sm text-slate-500 sm:block md:text-base">
          {currentPage.description}
        </p>
      </div>

      <div className="ml-5 flex items-center gap-3">
        <div
          ref={notificationRef}
          className="relative"
        >
          <button
            type="button"
            onClick={toggleNotifications}
            className={`relative flex h-11 w-11 items-center justify-center rounded-xl border transition ${
              isOpen
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
            }`}
            aria-label="Open notifications"
            aria-expanded={isOpen}
          >
            <Bell size={20} />

            {unreadCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white ring-2 ring-white">
                {unreadCount > 99
                  ? "99+"
                  : unreadCount}
              </span>
            )}
          </button>

          {isOpen && (
            <div className="absolute right-0 top-14 z-50 w-[min(390px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-slate-950">
                      Notifications
                    </h2>

                    {unreadCount > 0 && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                        {unreadCount} new
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    Live administrative activity
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setIsOpen(false)
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close notifications"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
                <button
                  type="button"
                  onClick={() =>
                    void loadNotifications(true)
                  }
                  disabled={isRefreshing}
                  className="flex items-center gap-2 text-xs font-bold text-slate-600 transition hover:text-slate-950 disabled:opacity-50"
                >
                  <RefreshCw
                    size={14}
                    className={
                      isRefreshing
                        ? "animate-spin"
                        : ""
                    }
                  />

                  Refresh
                </button>

                <button
                  type="button"
                  onClick={markAllAsRead}
                  disabled={
                    unreadCount === 0
                  }
                  className="flex items-center gap-2 text-xs font-bold text-blue-600 transition hover:text-blue-800 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  <Check size={14} />
                  Mark all as read
                </button>
              </div>

              <div className="max-h-[430px] overflow-y-auto">
                {isLoading ? (
                  <NotificationLoading />
                ) : error ? (
                  <div className="p-6 text-center">
                    <ShieldAlert
                      size={28}
                      className="mx-auto text-red-500"
                    />

                    <p className="mt-3 font-bold text-slate-950">
                      Audit service unavailable
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      {error}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        void loadNotifications(
                          true
                        )
                      }
                      className="mt-4 rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
                    >
                      Try again
                    </button>
                  </div>
                ) : logs.length === 0 ? (
                  <div className="p-8 text-center">
                    <Activity
                      size={28}
                      className="mx-auto text-slate-400"
                    />

                    <p className="mt-3 font-bold text-slate-950">
                      No activity recorded
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      New administrative events
                      will appear here.
                    </p>
                  </div>
                ) : (
                  logs
                    .slice(0, 10)
                    .map((log, index) => (
                      <NotificationItem
                        key={
                          log.id ||
                          `${log.timestamp}-${index}`
                        }
                        log={log}
                        unread={
                          getTimestamp(
                            log.timestamp
                          ) > lastReadAt
                        }
                      />
                    ))
                )}
              </div>

              <Link
                href="/reports"
                onClick={() => {
                  markAllAsRead();
                  setIsOpen(false);
                }}
                className="flex items-center justify-center gap-2 border-t border-slate-200 px-5 py-4 text-sm font-bold text-blue-600 transition hover:bg-blue-50"
              >
                View complete audit report
                <ChevronRight size={16} />
              </Link>
            </div>
          )}
        </div>

        <div className="hidden items-center gap-3 rounded-xl bg-slate-950 px-4 py-2.5 text-white sm:flex">
          <span className="h-2.5 w-2.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Domain
            </p>

            <p className="text-sm font-semibold">
              contoso.local
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

function NotificationItem({
  log,
  unread,
}: {
  log: AuditLog;
  unread: boolean;
}) {
  const failed =
    String(log.status || "")
      .toLowerCase() === "failed";

  const target =
    log.username ||
    log.targetUser ||
    "Infrastructure";

  return (
    <div
      className={`relative border-b border-slate-100 px-5 py-4 transition last:border-b-0 hover:bg-slate-50 ${
        unread ? "bg-blue-50/60" : ""
      }`}
    >
      {unread && (
        <span className="absolute left-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-blue-500" />
      )}

      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            failed
              ? "bg-red-100 text-red-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {failed ? (
            <ShieldAlert size={18} />
          ) : (
            <CheckCircle2 size={18} />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="truncate text-sm font-bold text-slate-950">
              {formatAction(log.action)}
            </p>

            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                failed
                  ? "bg-red-100 text-red-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {failed
                ? "Failed"
                : "Success"}
            </span>
          </div>

          <p className="mt-1 truncate text-sm text-slate-600">
            {target}
          </p>

          {log.details && (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
              {log.details}
            </p>
          )}

          <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-400">
            <span className="truncate">
              {log.administrator ||
                "Administrator"}
            </span>

            <time className="shrink-0">
              {formatRelativeTime(
                log.timestamp
              )}
            </time>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationLoading() {
  return (
    <div className="space-y-1 p-3">
      {[1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="flex animate-pulse gap-3 rounded-xl p-3"
        >
          <div className="h-9 w-9 shrink-0 rounded-xl bg-slate-200" />

          <div className="flex-1">
            <div className="h-3 w-2/3 rounded bg-slate-200" />
            <div className="mt-3 h-3 w-1/2 rounded bg-slate-200" />
            <div className="mt-3 h-2 w-1/3 rounded bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

function getCurrentPage(pathname: string) {
  if (pageDetails[pathname]) {
    return pageDetails[pathname];
  }

  const matchingRoute = Object.keys(
    pageDetails
  )
    .filter((route) => route !== "/")
    .find((route) =>
      pathname.startsWith(`${route}/`)
    );

  if (matchingRoute) {
    return pageDetails[matchingRoute];
  }

  return {
    title: "Enterprise Portal",
    description:
      "Infrastructure administration and monitoring.",
  };
}

function getTimestamp(
  value?: string
): number {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(
    value
  ).getTime();

  return Number.isNaN(timestamp)
    ? 0
    : timestamp;
}

function formatAction(
  action?: string
): string {
  if (!action) {
    return "Administrative activity";
  }

  return action
    .replace(
      /([a-z])([A-Z])/g,
      "$1 $2"
    )
    .replace(/[-_]/g, " ");
}

function formatRelativeTime(
  value?: string
): string {
  const timestamp =
    getTimestamp(value);

  if (!timestamp) {
    return "Unknown time";
  }

  const difference =
    Date.now() - timestamp;

  const seconds = Math.floor(
    difference / 1000
  );

  if (seconds < 30) {
    return "Just now";
  }

  const minutes = Math.floor(
    seconds / 60
  );

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(
    minutes / 60
  );

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(
    hours / 24
  );

  if (days < 7) {
    return `${days}d ago`;
  }

  return new Intl.DateTimeFormat(
    "en-SG",
    {
      day: "2-digit",
      month: "short",
    }
  ).format(new Date(timestamp));
}