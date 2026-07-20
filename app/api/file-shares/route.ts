import { NextResponse } from "next/server";

const BACKEND_API_URL =
  process.env.BACKEND_API_URL ||
  "http://192.168.206.128:3001";

type BackendShare = {
  Name?: string;
  Description?: string;
  Server?: string;
  SharePath?: string;
  LocalPath?: string;
  Status?: string;
  FileCount?: number;
  FolderCount?: number;
  ShareSizeGB?: number;
  Drive?: string;
  DriveUsedGB?: number;
  DriveFreeGB?: number;
  DriveCapacityGB?: number;
  DriveUsagePercent?: number;
  SharePermissions?: unknown[];
  NtfsPermissions?: unknown[];
};

type BackendResponse = {
  Success?: boolean;
  Server?: string;
  GeneratedAt?: string;
  ShareCount?: number;
  Shares?: BackendShare[];
  Error?: string;

  success?: boolean;
  server?: string;
  generatedAt?: string;
  shareCount?: number;
  shares?: BackendShare[];
  error?: string;
};

export async function GET(): Promise<NextResponse> {
  try {
    const response = await fetch(
      `${BACKEND_API_URL}/file-shares`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    const responseText = await response.text();

    let backendData: BackendResponse;

    try {
      backendData = responseText
        ? (JSON.parse(responseText) as BackendResponse)
        : {};
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "The file-services API returned invalid JSON.",
          shares: [],
        },
        { status: 502 }
      );
    }

    const backendShares =
      backendData.shares ||
      backendData.Shares ||
      [];

    const shares = backendShares.map((share) => ({
      name: share.Name || "Unnamed Share",
      description: share.Description || "",
      server: share.Server || "",
      sharePath: share.SharePath || "",
      localPath: share.LocalPath || "",
      status:
        share.Status?.toLowerCase() || "unknown",
      fileCount: share.FileCount || 0,
      folderCount: share.FolderCount || 0,
      shareSizeGB: share.ShareSizeGB || 0,
      drive: share.Drive || "",
      driveUsedGB: share.DriveUsedGB || 0,
      driveFreeGB: share.DriveFreeGB || 0,
      driveCapacityGB:
        share.DriveCapacityGB || 0,
      driveUsagePercent:
        share.DriveUsagePercent || 0,
      sharePermissions:
        share.SharePermissions || [],
      ntfsPermissions:
        share.NtfsPermissions || [],
    }));

    const success =
      backendData.success ??
      backendData.Success ??
      response.ok;

    const error =
      backendData.error ||
      backendData.Error ||
      "";

    return NextResponse.json(
      {
        success,
        server:
          backendData.server ||
          backendData.Server ||
          "",
        generatedAt:
          backendData.generatedAt ||
          backendData.GeneratedAt ||
          "",
        shareCount: shares.length,
        shares,
        error,
      },
      {
        status: response.ok ? 200 : response.status,
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        shares: [],
        shareCount: 0,
        error:
          error instanceof Error
            ? error.message
            : "Unable to connect to file services.",
      },
      { status: 500 }
    );
  }
}