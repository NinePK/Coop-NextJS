import { NextRequest, NextResponse } from "next/server";
import { execute, queryRows } from "@/lib/mysql";

export const runtime = "nodejs";

type DailyReportRow = {
  id: number;
  student_id: string;
  report_date: string;
  work_start_time: string | null;
  work_end_time: string | null;
  department: string | null;
  work_summary: string | null;
  problem: string | null;
  fix_action: string | null;
  experience: string | null;
  suggestion: string | null;
  student_signature_name: string | null;
  created_at: string;
  updated_at: string;
};

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function cleanText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function asDate(value: unknown, name: string) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${name} must be YYYY-MM-DD`);
  }
  return value;
}

function asTimeOrNull(value: unknown, name: string) {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || !/^\d{2}:\d{2}$/.test(value)) {
    throw new Error(`${name} must be HH:MM`);
  }
  return `${value}:00`;
}

export async function GET(request: NextRequest) {
  const studentId = request.nextUrl.searchParams.get("studentId")?.trim();
  if (!studentId) return bad("studentId is required");

  try {
    const rows = await queryRows<DailyReportRow[]>(
      `SELECT *
       FROM daily_reports
       WHERE student_id = $1
       ORDER BY report_date DESC, id DESC`,
      [studentId],
    );
    return NextResponse.json({
      student: rows[0] ? { studentId: rows[0].student_id } : null,
      rows,
    });
  } catch (error) {
    return bad(error instanceof Error ? error.message : "Database error", 500);
  }
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return bad("Invalid JSON body");
  }

  try {
    const studentId = cleanText(body.studentId);
    if (!studentId) throw new Error("studentId is required");

    const reportDate = asDate(body.reportDate, "reportDate");
    const workStartTime = asTimeOrNull(body.workStartTime, "workStartTime");
    const workEndTime = asTimeOrNull(body.workEndTime, "workEndTime");

    await execute(
      `INSERT INTO daily_reports (
         student_id, report_date,
         work_start_time, work_end_time, department,
         work_summary, problem, fix_action, experience, suggestion,
         student_signature_name
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (student_id, report_date) DO UPDATE SET
         work_start_time = EXCLUDED.work_start_time,
         work_end_time = EXCLUDED.work_end_time,
         department = EXCLUDED.department,
         work_summary = EXCLUDED.work_summary,
         problem = EXCLUDED.problem,
         fix_action = EXCLUDED.fix_action,
         experience = EXCLUDED.experience,
         suggestion = EXCLUDED.suggestion,
         student_signature_name = EXCLUDED.student_signature_name,
         updated_at = NOW()`,
      [
        studentId,
        reportDate,
        workStartTime,
        workEndTime,
        cleanText(body.department),
        cleanText(body.workSummary),
        cleanText(body.problem),
        cleanText(body.fixAction),
        cleanText(body.experience),
        cleanText(body.suggestion),
        cleanText(body.studentSignatureName),
      ],
    );

    const rows = await queryRows<DailyReportRow[]>(
      `SELECT *
       FROM daily_reports
       WHERE student_id = $1 AND report_date = $2
       LIMIT 1`,
      [studentId, reportDate],
    );

    return NextResponse.json({ ok: true, row: rows[0] ?? null });
  } catch (error) {
    return bad(error instanceof Error ? error.message : "Save failed", 400);
  }
}

export async function DELETE(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return bad("Invalid JSON body");
  }

  try {
    const studentId = cleanText(body.studentId);
    if (!studentId) throw new Error("studentId is required");
    const reportDate = asDate(body.reportDate, "reportDate");

    await execute(
      `DELETE FROM daily_reports
       WHERE student_id = $1 AND report_date = $2`,
      [studentId, reportDate],
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return bad(error instanceof Error ? error.message : "Delete failed", 400);
  }
}
