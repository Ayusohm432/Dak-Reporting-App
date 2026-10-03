
import type { SQLiteDatabase } from "expo-sqlite";

import {
  deserializeReport,
  serializeReport,
  updateDraftReport,
  type DakReport,
  type ReportStatus,
} from "../models/DakReport";

/**
 * Save a report to SQLite.
 *
 * If the report ID already exists, its saved data is updated.
 * Otherwise, a new row is inserted.
 *
 * The original createdAt value is preserved for updates.
 */
export async function saveReport(
  db: SQLiteDatabase,
  report: DakReport
): Promise<void> {
  const json = serializeReport(report);

  await db.runAsync(
    `INSERT INTO reports (
      id,
      reporting_month,
      reporting_period,
      district,
      block,
      coordinator_name,
      status,
      data_json,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      reporting_month = excluded.reporting_month,
      reporting_period = excluded.reporting_period,
      district = excluded.district,
      block = excluded.block,
      coordinator_name = excluded.coordinator_name,
      status = excluded.status,
      data_json = excluded.data_json,
      updated_at = excluded.updated_at;`,
    report.id,
    report.reportingMonth,
    report.reportingPeriod,
    report.district,
    report.block,
    report.coordinatorName,
    report.status,
    json,
    report.createdAt,
    report.updatedAt
  );
}

export async function setReportStatus(
  db: SQLiteDatabase,
  id: string,
  status: ReportStatus
): Promise<void> {
  const report = await getReportById(db, id);

  if (!report) {
    throw new Error("This report could not be found.");
  }

  await saveReport(db, updateDraftReport(report, { status }));
}

/**
 * Finds an existing report for the same district, block, and date range.
 */
export async function findReportForLocationAndPeriod(
  db: SQLiteDatabase,
  reportingPeriod: string,
  district: string,
  block: string
): Promise<string | null> {
  const row = await db.getFirstAsync<{ id: string }>(
    `SELECT id
     FROM reports
     WHERE reporting_period = ?
       AND lower(trim(district)) = lower(trim(?))
       AND lower(trim(block)) = lower(trim(?))
     LIMIT 1;`,
    reportingPeriod,
    district,
    block
  );

  return row?.id ?? null;
}

/**
 * Lightweight report information for the history screen.
 */
export interface ReportSummary {
  id: string;
  reportingMonth: string;
  reportingPeriod: string;
  district: string;
  block: string;
  coordinatorName: string;
  status: "draft" | "completed";
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  fullName: string;
  designation: string;
  mobile: string;
  block: string;
  district: string;
  organization: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ReportSummaryRow {
  id: string;
  reporting_month: string;
  reporting_period: string;
  district: string;
  block: string;
  coordinator_name: string;
  status: "draft" | "completed";
  created_at: string;
  updated_at: string;
}

/**
 * Returns saved reports.
 *
 * Pass a month such as "2026-09" to filter by month.
 * Leave it undefined to return all months.
 */
export async function getReports(
  db: SQLiteDatabase,
  reportingMonth?: string
): Promise<ReportSummary[]> {
  let rows: ReportSummaryRow[];

  if (reportingMonth) {
    rows = await db.getAllAsync<ReportSummaryRow>(
      `SELECT
        id,
        reporting_month,
        reporting_period,
        district,
        block,
        coordinator_name,
        status,
        created_at,
        updated_at
      FROM reports
      WHERE reporting_month = ?
      ORDER BY updated_at DESC;`,
      reportingMonth
    );
  } else {
    rows = await db.getAllAsync<ReportSummaryRow>(
      `SELECT
        id,
        reporting_month,
        reporting_period,
        district,
        block,
        coordinator_name,
        status,
        created_at,
        updated_at
      FROM reports
      ORDER BY updated_at DESC;`
    );
  }

  return rows.map((row) => ({
    id: row.id,
    reportingMonth: row.reporting_month,
    reportingPeriod: row.reporting_period,
    district: row.district,
    block: row.block,
    coordinatorName: row.coordinator_name,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getProfile(
  db: SQLiteDatabase
): Promise<UserProfile | null> {
  const row = await db.getFirstAsync<{
    id: string;
    full_name: string;
    designation: string;
    mobile: string;
    block: string;
    district: string;
    organization: string;
    status: string;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT *
     FROM user_profile
     ORDER BY updated_at DESC
     LIMIT 1;`
  );

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    fullName: row.full_name,
    designation: row.designation,
    mobile: row.mobile,
    block: row.block,
    district: row.district,
    organization: row.organization,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function saveProfile(
  db: SQLiteDatabase,
  profile: UserProfile
): Promise<UserProfile> {
  const now = new Date().toISOString();
  const payload = {
    ...profile,
    updatedAt: now,
  };

  await db.runAsync(
    `INSERT INTO user_profile (
      id,
      full_name,
      designation,
      mobile,
      block,
      district,
      organization,
      status,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      full_name = excluded.full_name,
      designation = excluded.designation,
      mobile = excluded.mobile,
      block = excluded.block,
      district = excluded.district,
      organization = excluded.organization,
      status = excluded.status,
      updated_at = excluded.updated_at;`,
    payload.id,
    payload.fullName,
    payload.designation,
    payload.mobile,
    payload.block,
    payload.district,
    payload.organization,
    payload.status,
    payload.createdAt || now,
    payload.updatedAt
  );

  return payload;
}

/**
 * Returns complete saved reports, including their form answers.
 */
export async function getAllReports(
  db: SQLiteDatabase
): Promise<DakReport[]> {
  const rows = await db.getAllAsync<{ data_json: string }>(
    `SELECT data_json
     FROM reports
     ORDER BY updated_at DESC;`
  );

  return rows.map((row) => deserializeReport(row.data_json));
}

/**
 * Loads the complete report, including its form answers.
 */
export async function getReportById(
  db: SQLiteDatabase,
  id: string
): Promise<DakReport | null> {
  const row = await db.getFirstAsync<{
    data_json: string;
  }>(
    "SELECT data_json FROM reports WHERE id = ?;",
    id
  );

  if (!row) {
    return null;
  }

  return deserializeReport(row.data_json);
}

/**
 * Deletes a report permanently from SQLite.
 */
export async function deleteReport(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync(
    "DELETE FROM reports WHERE id = ?;",
    id
  );
}

/**
 * Counts reports for a selected month.
 */
export async function countReports(
  db: SQLiteDatabase,
  reportingMonth: string
): Promise<number> {
  const result = await db.getFirstAsync<{
    total: number;
  }>(
    `SELECT COUNT(*) AS total
     FROM reports
     WHERE reporting_month = ?;`,
    reportingMonth
  );

  return result?.total ?? 0;
}
