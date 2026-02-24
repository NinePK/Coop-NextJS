import { NextRequest, NextResponse } from "next/server";
import { execute, queryRows } from "@/lib/mysql";

export const runtime = "nodejs";

type WeeklyReportRow = {
  id: number;
  student_id: string;
  semester_year: number;
  semester_no: number;
  week_no: number;
  start_date: string;
  end_date: string;
  department: string | null;
  work_summary: string | null;
  problem: string | null;
  status: "good" | "normal" | "worse" | "danger";
  fix_action: string | null;
  course_fix_action: string | null;
  experience: string | null;
  suggestion: string | null;
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

function asInt(value: unknown, name: string, min?: number, max?: number) {
  const n = Number(value);
  if (!Number.isInteger(n)) {
    throw new Error(`${name} must be an integer`);
  }
  if (typeof min === "number" && n < min) {
    throw new Error(`${name} must be >= ${min}`);
  }
  if (typeof max === "number" && n > max) {
    throw new Error(`${name} must be <= ${max}`);
  }
  return n;
}

function asDate(value: unknown, name: string) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${name} must be YYYY-MM-DD`);
  }
  return value;
}

export async function GET(request: NextRequest) {
  const studentId = request.nextUrl.searchParams.get("studentId")?.trim();

  if (!studentId) return bad("studentId is required");

  try {
    const rows = await queryRows<WeeklyReportRow[]>(
      `SELECT *
       FROM weekly_reports
       WHERE student_id = $1
       ORDER BY semester_year DESC, semester_no DESC, week_no ASC, id ASC`,
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

    const semesterYear = asInt(body.semesterYear, "semesterYear", 2000, 3000);
    const semesterNo = asInt(body.semesterNo, "semesterNo", 1, 3);
    const weekNo = asInt(body.weekNo, "weekNo", 1, 40);
    const startDate = asDate(body.startDate, "startDate");
    const endDate = asDate(body.endDate, "endDate");

    await execute(
      `INSERT INTO weekly_reports (
         student_id,
         semester_year, semester_no,
         week_no, start_date, end_date, department,
         work_summary, problem, status, fix_action, course_fix_action, experience, suggestion
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (student_id, semester_year, semester_no, week_no) DO UPDATE SET
         start_date = EXCLUDED.start_date,
         end_date = EXCLUDED.end_date,
         department = EXCLUDED.department,
         work_summary = EXCLUDED.work_summary,
         problem = EXCLUDED.problem,
         status = EXCLUDED.status,
         fix_action = EXCLUDED.fix_action,
         course_fix_action = EXCLUDED.course_fix_action,
         experience = EXCLUDED.experience,
         suggestion = EXCLUDED.suggestion,
         updated_at = NOW()`,
      [
        studentId,
        semesterYear,
        semesterNo,
        weekNo,
        startDate,
        endDate,
        cleanText(body.department),
        cleanText(body.workSummary),
        cleanText(body.problem),
        ["good", "normal", "worse", "danger"].includes(String(body.status))
          ? String(body.status)
          : "normal",
        cleanText(body.fixAction),
        cleanText(body.courseFixAction),
        cleanText(body.experience),
        cleanText(body.suggestion),
      ],
    );

    const rows = await queryRows<WeeklyReportRow[]>(
      `SELECT *
       FROM weekly_reports
       WHERE student_id = $1 AND semester_year = $2 AND semester_no = $3 AND week_no = $4
       LIMIT 1`,
      [studentId, semesterYear, semesterNo, weekNo],
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
    const semesterYear = asInt(body.semesterYear, "semesterYear", 2000, 3000);
    const semesterNo = asInt(body.semesterNo, "semesterNo", 1, 3);
    const weekNo = asInt(body.weekNo, "weekNo", 1, 40);

    await execute(
      `DELETE FROM weekly_reports
       WHERE student_id = $1 AND semester_year = $2 AND semester_no = $3 AND week_no = $4`,
      [studentId, semesterYear, semesterNo, weekNo],
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return bad(error instanceof Error ? error.message : "Delete failed", 400);
  }
}
