import { NextResponse } from "next/server";
import {
  PDFDocument,
  PDFPage,
  PDFFont,
  StandardFonts,
  rgb,
} from "pdf-lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    username: string;
  }>;
};

type UserData = {
  success: boolean;
  username: string;
  displayName: string | null;
  department: string | null;
  jobTitle: string | null;
  employeeId: string | null;
  manager: string | null;
  email: string | null;
  enabled: boolean;
  lockedOut: boolean;
  lastLogin: string | null;
  passwordLastSet: string | null;
  ou: string | null;
  domain: string;
  groups: string[];
};

type AuditLog = {
  id: string;
  administrator: string;
  action: string;
  username: string;
  details: string;
  status: string;
  timestamp: string;
};

const ENTERPRISE_API = "http://192.168.206.128:3001";

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const { username } = await context.params;
    const decodedUsername = decodeURIComponent(username).trim();

    if (!decodedUsername) {
      return NextResponse.json(
        {
          success: false,
          error: "Username is required.",
        },
        { status: 400 }
      );
    }

    const [userResponse, auditResponse] = await Promise.all([
      fetch(
        `${ENTERPRISE_API}/user-details/${encodeURIComponent(
          decodedUsername
        )}`,
        {
          cache: "no-store",
        }
      ),
      fetch(`${ENTERPRISE_API}/audit-logs`, {
        cache: "no-store",
      }),
    ]);

    const userText = await userResponse.text();
    const auditText = await auditResponse.text();

    let userData: UserData;
    let auditData: {
      success: boolean;
      logs: AuditLog[];
      error?: string;
    };

    try {
      userData = JSON.parse(userText) as UserData;
    } catch {
      throw new Error(
        userText || "Active Directory returned invalid user data."
      );
    }

    try {
      auditData = JSON.parse(auditText);
    } catch {
      throw new Error(
        auditText || "Audit service returned invalid data."
      );
    }

    if (!userResponse.ok || !userData.success) {
      throw new Error(
        "Unable to retrieve Active Directory user information."
      );
    }

    const userAuditLogs = Array.isArray(auditData.logs)
      ? auditData.logs
          .filter(
            (log) =>
              log.username.toLowerCase() ===
              decodedUsername.toLowerCase()
          )
          .slice(0, 15)
      : [];

    const reportId = createReportId(decodedUsername);
    const generatedAt = new Date();

    const pdfBytes = await createEnterpriseReport({
      user: userData,
      logs: userAuditLogs,
      reportId,
      generatedAt,
    });

    const safeUsername = decodedUsername.replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    );

    const pdfArrayBuffer = pdfBytes.buffer.slice(
  pdfBytes.byteOffset,
  pdfBytes.byteOffset + pdfBytes.byteLength
) as ArrayBuffer;

return new NextResponse(pdfArrayBuffer, {
  status: 200,
  headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="AD-User-Report-${safeUsername}.pdf"`,
    "Cache-Control": "no-store",
  },
});
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate the report.",
      },
      { status: 500 }
    );
  }
}

async function createEnterpriseReport({
  user,
  logs,
  reportId,
  generatedAt,
}: {
  user: UserData;
  logs: AuditLog[];
  reportId: string;
  generatedAt: Date;
}) {
  const pdf = await PDFDocument.create();

  pdf.setTitle(
    `Active Directory User Report - ${user.username}`
  );
  pdf.setAuthor("Enterprise Administration Portal");
  pdf.setSubject("Active Directory User Security Report");
  pdf.setKeywords([
    "Active Directory",
    "User Report",
    "Audit",
    "Enterprise Administration",
  ]);
  pdf.setCreator("Enterprise Administration Portal");

  const regularFont = await pdf.embedFont(
    StandardFonts.Helvetica
  );

  const boldFont = await pdf.embedFont(
    StandardFonts.HelveticaBold
  );

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 48;

  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const dark = rgb(0.05, 0.09, 0.18);
  const muted = rgb(0.35, 0.4, 0.5);
  const light = rgb(0.94, 0.96, 0.98);
  const green = rgb(0.03, 0.55, 0.28);
  const red = rgb(0.8, 0.1, 0.12);
  const border = rgb(0.82, 0.85, 0.89);

  const ensureSpace = (requiredHeight: number) => {
    if (y - requiredHeight < 70) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;

      drawContinuationHeader(
        page,
        boldFont,
        regularFont,
        reportId,
        user.username,
        dark,
        muted,
        pageWidth,
        margin
      );

      y -= 50;
    }
  };

  // Main header
  page.drawRectangle({
    x: 0,
    y: pageHeight - 126,
    width: pageWidth,
    height: 126,
    color: dark,
  });

  page.drawText("ENTERPRISE ADMINISTRATION", {
    x: margin,
    y: pageHeight - 42,
    size: 10,
    font: boldFont,
    color: rgb(0.65, 0.76, 0.95),
  });

  page.drawText("Active Directory User Report", {
    x: margin,
    y: pageHeight - 72,
    size: 23,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  page.drawText(
    user.displayName || user.username,
    {
      x: margin,
      y: pageHeight - 100,
      size: 13,
      font: regularFont,
      color: rgb(0.85, 0.89, 0.96),
    }
  );

  page.drawText("CONFIDENTIAL - INTERNAL USE ONLY", {
    x: pageWidth - margin - 183,
    y: pageHeight - 42,
    size: 8,
    font: boldFont,
    color: rgb(1, 0.78, 0.35),
  });

  y = pageHeight - 157;

  // Report metadata
  drawSectionTitle(
    page,
    "REPORT CONTROL",
    margin,
    y,
    boldFont,
    dark
  );

  y -= 24;

  const metadata = [
    ["Report ID", reportId],
    [
      "Generated At",
      formatDateTime(generatedAt),
    ],
    ["Generated By", "Ramya"],
    ["Source System", "contoso.local Active Directory"],
    ["Classification", "Confidential - Internal Use Only"],
  ];

  y = drawKeyValueGrid({
    page,
    entries: metadata,
    x: margin,
    y,
    width: pageWidth - margin * 2,
    regularFont,
    boldFont,
    dark,
    muted,
    light,
  });

  y -= 24;

  // Executive summary
  drawSectionTitle(
    page,
    "EXECUTIVE SUMMARY",
    margin,
    y,
    boldFont,
    dark
  );

  y -= 25;

  const statusText = user.enabled
    ? "Enabled"
    : "Disabled";

  const lockedText = user.lockedOut
    ? "Locked"
    : "Not locked";

  const summary =
    `${user.displayName || user.username} is an Active Directory user in the ` +
    `${user.ou || "unknown"} organizational unit. The account is currently ` +
    `${statusText.toLowerCase()} and is ${lockedText.toLowerCase()}. ` +
    `This report contains the user's directory attributes, security-group ` +
    `memberships and recent administrative audit activity.`;

  y = drawWrappedText({
    page,
    text: summary,
    x: margin,
    y,
    maxWidth: pageWidth - margin * 2,
    font: regularFont,
    size: 10,
    color: dark,
    lineHeight: 15,
  });

  y -= 20;

  // User profile
  ensureSpace(220);

  drawSectionTitle(
    page,
    "USER PROFILE",
    margin,
    y,
    boldFont,
    dark
  );

  y -= 24;

  const userEntries = [
    [
      "Display Name",
      user.displayName || "Not set",
    ],
    ["Username", user.username],
    [
      "Department",
      user.department || "Not set",
    ],
    ["Job Title", user.jobTitle || "Not set"],
    [
      "Employee ID",
      user.employeeId || "Not set",
    ],
    ["Manager", user.manager || "Not set"],
    ["Email", user.email || "Not set"],
    ["Domain", user.domain || "Not set"],
  ];

  y = drawKeyValueGrid({
    page,
    entries: userEntries,
    x: margin,
    y,
    width: pageWidth - margin * 2,
    regularFont,
    boldFont,
    dark,
    muted,
    light,
  });

  y -= 24;

  // Security status
  ensureSpace(175);

  drawSectionTitle(
    page,
    "ACCOUNT SECURITY STATUS",
    margin,
    y,
    boldFont,
    dark
  );

  y -= 24;

  page.drawRectangle({
    x: margin,
    y: y - 45,
    width: pageWidth - margin * 2,
    height: 54,
    color: light,
    borderColor: border,
    borderWidth: 0.8,
  });

  page.drawText("Account Status", {
    x: margin + 15,
    y: y - 12,
    size: 9,
    font: regularFont,
    color: muted,
  });

  page.drawText(statusText, {
    x: margin + 15,
    y: y - 31,
    size: 13,
    font: boldFont,
    color: user.enabled ? green : red,
  });

  page.drawText("Lock Status", {
    x: margin + 175,
    y: y - 12,
    size: 9,
    font: regularFont,
    color: muted,
  });

  page.drawText(lockedText, {
    x: margin + 175,
    y: y - 31,
    size: 13,
    font: boldFont,
    color: user.lockedOut ? red : green,
  });

  page.drawText("Organizational Unit", {
    x: margin + 340,
    y: y - 12,
    size: 9,
    font: regularFont,
    color: muted,
  });

  page.drawText(user.ou || "Unknown", {
    x: margin + 340,
    y: y - 31,
    size: 13,
    font: boldFont,
    color: dark,
  });

  y -= 70;

  const securityDetails = [
    [
      "Password Last Set",
      user.passwordLastSet || "Unknown",
    ],
    ["Last Login", user.lastLogin || "Never"],
  ];

  y = drawKeyValueGrid({
    page,
    entries: securityDetails,
    x: margin,
    y,
    width: pageWidth - margin * 2,
    regularFont,
    boldFont,
    dark,
    muted,
    light,
  });

  y -= 24;

  // Security groups
  ensureSpace(150);

  drawSectionTitle(
    page,
    "SECURITY GROUP MEMBERSHIPS",
    margin,
    y,
    boldFont,
    dark
  );

  y -= 24;

  if (user.groups.length === 0) {
    page.drawText("No security groups were returned.", {
      x: margin,
      y,
      size: 10,
      font: regularFont,
      color: muted,
    });

    y -= 20;
  } else {
    for (const group of user.groups) {
      ensureSpace(28);

      page.drawRectangle({
        x: margin,
        y: y - 18,
        width: pageWidth - margin * 2,
        height: 26,
        color: light,
        borderColor: border,
        borderWidth: 0.5,
      });

      page.drawCircle({
        x: margin + 14,
        y: y - 5,
        size: 3,
        color: green,
      });

      page.drawText(group, {
        x: margin + 26,
        y: y - 9,
        size: 10,
        font: regularFont,
        color: dark,
      });

      y -= 31;
    }
  }

  y -= 12;

  // Audit activity
  ensureSpace(150);

  drawSectionTitle(
    page,
    "RECENT ADMINISTRATIVE ACTIVITY",
    margin,
    y,
    boldFont,
    dark
  );

  y -= 25;

  if (logs.length === 0) {
    page.drawText(
      "No administrative activity has been recorded for this user.",
      {
        x: margin,
        y,
        size: 10,
        font: regularFont,
        color: muted,
      }
    );

    y -= 20;
  } else {
    for (const log of logs) {
      ensureSpace(88);

      const boxHeight = 74;

      page.drawRectangle({
        x: margin,
        y: y - boxHeight + 8,
        width: pageWidth - margin * 2,
        height: boxHeight,
        color: rgb(1, 1, 1),
        borderColor: border,
        borderWidth: 0.8,
      });

      page.drawText(log.action, {
        x: margin + 14,
        y: y - 12,
        size: 11,
        font: boldFont,
        color: dark,
      });

      page.drawText(
        `Administrator: ${log.administrator}`,
        {
          x: margin + 14,
          y: y - 29,
          size: 8.5,
          font: regularFont,
          color: muted,
        }
      );

      page.drawText(
        formatDateTime(new Date(log.timestamp)),
        {
          x: pageWidth - margin - 130,
          y: y - 12,
          size: 8,
          font: regularFont,
          color: muted,
        }
      );

      drawWrappedText({
        page,
        text: log.details,
        x: margin + 14,
        y: y - 46,
        maxWidth: pageWidth - margin * 2 - 28,
        font: regularFont,
        size: 8.5,
        color: dark,
        lineHeight: 11,
      });

      y -= boxHeight + 10;
    }
  }

  // Add footers after all pages are created
  const pages = pdf.getPages();

  pages.forEach((currentPage, index) => {
    const currentPageWidth = currentPage.getWidth();

    currentPage.drawLine({
      start: {
        x: margin,
        y: 47,
      },
      end: {
        x: currentPageWidth - margin,
        y: 47,
      },
      thickness: 0.6,
      color: border,
    });

    currentPage.drawText(
      `Report ID: ${reportId}`,
      {
        x: margin,
        y: 29,
        size: 7.5,
        font: regularFont,
        color: muted,
      }
    );

    currentPage.drawText(
      "CONFIDENTIAL - INTERNAL USE ONLY",
      {
        x: currentPageWidth / 2 - 67,
        y: 29,
        size: 7,
        font: boldFont,
        color: muted,
      }
    );

    currentPage.drawText(
      `Page ${index + 1} of ${pages.length}`,
      {
        x: currentPageWidth - margin - 55,
        y: 29,
        size: 7.5,
        font: regularFont,
        color: muted,
      }
    );
  });

  return pdf.save();
}

function drawSectionTitle(
  page: PDFPage,
  title: string,
  x: number,
  y: number,
  font: PDFFont,
  color: ReturnType<typeof rgb>
) {
  page.drawText(title, {
    x,
    y,
    size: 11,
    font,
    color,
  });

  page.drawLine({
    start: {
      x,
      y: y - 7,
    },
    end: {
      x: page.getWidth() - x,
      y: y - 7,
    },
    thickness: 1,
    color: rgb(0.84, 0.87, 0.91),
  });
}

function drawContinuationHeader(
  page: PDFPage,
  boldFont: PDFFont,
  regularFont: PDFFont,
  reportId: string,
  username: string,
  dark: ReturnType<typeof rgb>,
  muted: ReturnType<typeof rgb>,
  pageWidth: number,
  margin: number
) {
  page.drawText("Active Directory User Report", {
    x: margin,
    y: page.getHeight() - 38,
    size: 13,
    font: boldFont,
    color: dark,
  });

  page.drawText(username, {
    x: margin,
    y: page.getHeight() - 55,
    size: 8,
    font: regularFont,
    color: muted,
  });

  page.drawText(reportId, {
    x: pageWidth - margin - 120,
    y: page.getHeight() - 38,
    size: 8,
    font: regularFont,
    color: muted,
  });

  page.drawLine({
    start: {
      x: margin,
      y: page.getHeight() - 65,
    },
    end: {
      x: pageWidth - margin,
      y: page.getHeight() - 65,
    },
    thickness: 0.8,
    color: rgb(0.84, 0.87, 0.91),
  });
}

function drawKeyValueGrid({
  page,
  entries,
  x,
  y,
  width,
  regularFont,
  boldFont,
  dark,
  muted,
  light,
}: {
  page: PDFPage;
  entries: string[][];
  x: number;
  y: number;
  width: number;
  regularFont: PDFFont;
  boldFont: PDFFont;
  dark: ReturnType<typeof rgb>;
  muted: ReturnType<typeof rgb>;
  light: ReturnType<typeof rgb>;
}) {
  const columns = 2;
  const gap = 12;
  const cellWidth = (width - gap) / columns;
  const rowHeight = 47;

  entries.forEach((entry, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);

    const cellX = x + column * (cellWidth + gap);
    const cellY = y - row * rowHeight;

    page.drawRectangle({
      x: cellX,
      y: cellY - 36,
      width: cellWidth,
      height: 41,
      color: light,
    });

    page.drawText(entry[0], {
      x: cellX + 11,
      y: cellY - 10,
      size: 8,
      font: regularFont,
      color: muted,
    });

    const displayValue = truncateText(
      entry[1],
      boldFont,
      9.5,
      cellWidth - 22
    );

    page.drawText(displayValue, {
      x: cellX + 11,
      y: cellY - 27,
      size: 9.5,
      font: boldFont,
      color: dark,
    });
  });

  const rows = Math.ceil(entries.length / columns);

  return y - rows * rowHeight;
}

function drawWrappedText({
  page,
  text,
  x,
  y,
  maxWidth,
  font,
  size,
  color,
  lineHeight,
}: {
  page: PDFPage;
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  font: PDFFont;
  size: number;
  color: ReturnType<typeof rgb>;
  lineHeight: number;
}) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine
      ? `${currentLine} ${word}`
      : word;

    const width = font.widthOfTextAtSize(
      testLine,
      size
    );

    if (width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }

      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  lines.forEach((line, index) => {
    page.drawText(line, {
      x,
      y: y - index * lineHeight,
      size,
      font,
      color,
    });
  });

  return y - lines.length * lineHeight;
}

function truncateText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
) {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) {
    return text;
  }

  let truncated = text;

  while (
    truncated.length > 0 &&
    font.widthOfTextAtSize(
      `${truncated}...`,
      size
    ) > maxWidth
  ) {
    truncated = truncated.slice(0, -1);
  }

  return `${truncated}...`;
}

function createReportId(username: string) {
  const date = new Date();

  const datePart = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");

  const randomPart = Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase();

  const safeUsername = username
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();

  return `ADR-${datePart}-${safeUsername}-${randomPart}`;
}

function formatDateTime(date: Date) {
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString("en-SG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Singapore",
  });
}