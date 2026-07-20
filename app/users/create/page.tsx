"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type CreateUserResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  username?: string;
};

export default function CreateUserPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [department, setDepartment] = useState("HR");
  const [jobTitle, setJobTitle] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [managerUsername, setManagerUsername] = useState("");
  const [temporaryPassword, setTemporaryPassword] =
    useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const createSuggestedUsername = (
    first: string,
    last: string
  ) => {
    const cleanFirst = first
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    const cleanLast = last
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    if (!cleanFirst || !cleanLast) return "";

    return `${cleanFirst}.${cleanLast}`;
  };

  const handleFirstNameChange = (value: string) => {
    setFirstName(value);

    if (!username || username === createSuggestedUsername(firstName, lastName)) {
      setUsername(createSuggestedUsername(value, lastName));
    }
  };

  const handleLastNameChange = (value: string) => {
    setLastName(value);

    if (!username || username === createSuggestedUsername(firstName, lastName)) {
      setUsername(createSuggestedUsername(firstName, value));
    }
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");

    if (temporaryPassword !== confirmPassword) {
      setError("The temporary passwords do not match.");
      return;
    }

    if (temporaryPassword.length < 8) {
      setError(
        "The temporary password must contain at least 8 characters."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
          username,
          department,
          jobTitle,
          temporaryPassword,
          employeeId,
          managerUsername,
        }),
      });

      const responseText = await response.text();

      let data: CreateUserResponse;

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          responseText ||
            "The server returned an invalid response."
        );
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to create the user."
        );
      }

      alert(
        data.message || "User created successfully!"
      );

      router.push(
        `/users/${encodeURIComponent(
          data.username || username
        )}`
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to create the user."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl bg-white p-8 shadow">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
                Identity Lifecycle Management
              </p>

              <h1 className="mt-2 text-4xl font-bold">
                Create Active Directory User
              </h1>

              <p className="mt-3 text-slate-500">
                Provision a new employee account with OU placement,
                manager assignment and department security-group access.
              </p>
            </div>

            <Link
              href="/users"
              className="rounded-xl border border-slate-300 px-5 py-3 font-semibold hover:bg-slate-100"
            >
              Back to Users
            </Link>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-3xl bg-white p-8 shadow"
        >
          <div>
            <h2 className="text-2xl font-bold">
              Employee Information
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Fields marked as required must be completed before
              provisioning the account.
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <Field
              label="First Name"
              value={firstName}
              onChange={handleFirstNameChange}
              placeholder="e.g. Sarah"
              required
            />

            <Field
              label="Last Name"
              value={lastName}
              onChange={handleLastNameChange}
              placeholder="e.g. Lim"
              required
            />

            <Field
              label="Username"
              value={username}
              onChange={setUsername}
              placeholder="e.g. sarah.lim"
              required
            />

            <Field
              label="Employee ID"
              value={employeeId}
              onChange={setEmployeeId}
              placeholder="e.g. EMP036"
            />

            <SelectField
              label="Department / OU"
              value={department}
              onChange={setDepartment}
              options={[
                "Finance",
                "HR",
                "IT",
                "Sales",
                "Marketing",
                "Operations",
                "Executive",
                "Customer Support",
              ]}
            />

            <Field
              label="Job Title"
              value={jobTitle}
              onChange={setJobTitle}
              placeholder="e.g. HR Executive"
              required
            />

            <Field
              label="Manager Username"
              value={managerUsername}
              onChange={setManagerUsername}
              placeholder="e.g. marcus.lim"
            />

            <div className="hidden md:block" />

            <PasswordField
              label="Temporary Password"
              value={temporaryPassword}
              onChange={setTemporaryPassword}
              required
            />

            <PasswordField
              label="Confirm Temporary Password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              required
            />
          </div>

          <div className="mt-8 rounded-2xl bg-slate-100 p-5">
            <h3 className="font-bold">
              Automatic provisioning actions
            </h3>

            <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
              <p>✓ Create enabled Active Directory account</p>
              <p>✓ Place account in the selected OU</p>
              <p>✓ Assign department security group</p>
              <p>✓ Assign manager when provided</p>
              <p>✓ Set corporate email and UPN</p>
              <p>✓ Require password change at first logon</p>
              <p>✓ Record administrator Ramya in audit log</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col-reverse gap-4 sm:flex-row sm:justify-end">
            <Link
              href="/users"
              className="rounded-xl border border-slate-300 px-6 py-3 text-center font-semibold hover:bg-slate-100"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`rounded-xl px-6 py-3 font-semibold text-white transition ${
                isSubmitting
                  ? "cursor-not-allowed bg-slate-400"
                  : "bg-slate-900 hover:bg-slate-700"
              }`}
            >
              {isSubmitting
                ? "Creating User..."
                : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">
        {label}
        {required && (
          <span className="ml-1 text-red-600">*</span>
        )}
      </span>

      <input
        type="text"
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        required={required}
        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">
        {label}
        {required && (
          <span className="ml-1 text-red-600">*</span>
        )}
      </span>

      <input
        type="password"
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        required={required}
        autoComplete="new-password"
        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">
        {label}
        <span className="ml-1 text-red-600">*</span>
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        {options.map((option) => (
          <option
            key={option}
            value={option}
          >
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}