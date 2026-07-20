"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DirectoryUser = {
  department?: string;
  Department?: string;
};

type DepartmentMetric = {
  department: string;
  users: number;
};

export default function DepartmentChart() {
  const [users, setUsers] = useState<DirectoryUser[]>([]);
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

        const text = await response.text();
        const data = text ? JSON.parse(text) : [];

        if (!response.ok) {
          throw new Error(
            data?.error || "Unable to retrieve directory analytics."
          );
        }

        const userList = Array.isArray(data)
          ? data
          : Array.isArray(data?.users)
            ? data.users
            : [];

        setUsers(userList);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to retrieve directory analytics."
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadUsers();
  }, []);

  const chartData = useMemo<DepartmentMetric[]>(() => {
    const counts = new Map<string, number>();

    users.forEach((user) => {
      const rawDepartment =
        user.department || user.Department || "";

      const department = normaliseDepartment(rawDepartment);

      if (!department) {
        return;
      }

      counts.set(
        department,
        (counts.get(department) || 0) + 1
      );
    });

    return Array.from(counts.entries())
      .map(([department, userCount]) => ({
        department,
        users: userCount,
      }))
      .sort((a, b) => b.users - a.users);
  }, [users]);

  const assignedUsers = chartData.reduce(
    (total, item) => total + item.users,
    0
  );

  const chartHeight = Math.max(360, chartData.length * 48);

  return (
    <div>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
            Directory Analytics
          </p>

          <h2 className="mt-2 text-2xl font-bold text-slate-950">
            Users by Department
          </h2>

          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            Live distribution of assigned Active Directory accounts.
          </p>
        </div>

        <div className="flex gap-3">
          <Metric
            label="Departments"
            value={chartData.length}
          />

          <Metric
            label="Assigned users"
            value={assignedUsers}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="mt-8 h-96 animate-pulse rounded-2xl bg-slate-100" />
      ) : error ? (
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5">
          <p className="font-semibold text-red-700">
            Analytics unavailable
          </p>

          <p className="mt-2 text-sm text-red-600">
            {error}
          </p>
        </div>
      ) : chartData.length === 0 ? (
        <div className="mt-8 flex h-72 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50">
          <div className="text-center">
            <p className="font-semibold text-slate-700">
              No department assignments found
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Department data will appear after users are assigned.
            </p>
          </div>
        </div>
      ) : (
        <div
          className="mt-8 w-full"
          style={{ height: chartHeight }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{
                top: 5,
                right: 24,
                bottom: 5,
                left: 15,
              }}
            >
              <CartesianGrid
                horizontal={false}
                strokeDasharray="4 4"
              />

              <XAxis
                type="number"
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
              />

              <YAxis
                type="category"
                dataKey="department"
                width={125}
                axisLine={false}
                tickLine={false}
                tick={{
                  fontSize: 12,
                  fontWeight: 600,
                }}
              />

              <Tooltip
                cursor={{
                  fill: "rgba(148, 163, 184, 0.12)",
                }}
                formatter={(value) => [
                  `${Number(value)} accounts`,
                  "Directory users",
                ]}
              />

              <Bar
                dataKey="users"
                radius={[0, 8, 8, 0]}
                maxBarSize={24}
                fill="#2563eb"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="min-w-28 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold text-slate-950">
        {value}
      </p>
    </div>
  );
}

function normaliseDepartment(value: string) {
  const cleaned = value.trim();

  if (
    !cleaned ||
    cleaned === "-" ||
    cleaned.toLowerCase() === "not assigned"
  ) {
    return "";
  }

  const lower = cleaned.toLowerCase();

  if (
    lower === "human resources" ||
    lower === "hr"
  ) {
    return "Human Resources";
  }

  if (
    lower === "information technology" ||
    lower === "it"
  ) {
    return "IT";
  }

  return cleaned
    .split(/\s+/)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1).toLowerCase()
    )
    .join(" ");
}