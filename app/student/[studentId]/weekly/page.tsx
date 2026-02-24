"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type StatusType = "good" | "normal" | "worse" | "danger";

type WeeklyRow = {
  student_id: string;
  semester_year: number;
  semester_no: number;
  week_no: number;
  start_date: string;
  end_date: string;
  department: string | null;
  work_summary: string | null;
  problem: string | null;
  status: StatusType;
  fix_action: string | null;
  course_fix_action: string | null;
  experience: string | null;
  suggestion: string | null;
};

type ApiResponse = { rows: WeeklyRow[]; error?: string };

type FormState = {
  semesterYear: string;
  semesterNo: string;
  weekNo: string;
  startDate: string;
  endDate: string;
  department: string;
  workSummary: string;
  problem: string;
  status: StatusType;
  fixAction: string;
  courseFixAction: string;
  experience: string;
  suggestion: string;
};

function defaultForm(): FormState {
  const y = new Date().getFullYear() + 543;
  return {
    semesterYear: String(y),
    semesterNo: "1",
    weekNo: "1",
    startDate: "",
    endDate: "",
    department: "",
    workSummary: "",
    problem: "",
    status: "normal",
    fixAction: "",
    courseFixAction: "",
    experience: "",
    suggestion: "",
  };
}

export default function WeeklyFormPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const search = useSearchParams();
  const router = useRouter();
  const semesterYearParam = search.get("semesterYear") ?? "";
  const semesterNoParam = search.get("semesterNo") ?? "";
  const weekNoParam = search.get("weekNo") ?? "";
  const [studentId, setStudentId] = useState("");
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savePopupOpen, setSavePopupOpen] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const p = await params;
      if (!active) return;
      setStudentId(p.studentId);

      const semesterYearQ = Number(semesterYearParam || 0);
      const semesterNoQ = Number(semesterNoParam || 0);
      const weekNoQ = Number(weekNoParam || 0);

      try {
        const res = await fetch(
          `/api/weekly-reports?studentId=${encodeURIComponent(p.studentId)}`,
          { cache: "no-store" },
        );
        const data = (await res.json()) as ApiResponse;
        if (!res.ok) throw new Error(data.error || "โหลดข้อมูลไม่สำเร็จ");
        const rows = data.rows || [];

        if (semesterYearQ && semesterNoQ && weekNoQ) {
          const row = rows.find(
            (r) =>
              r.semester_year === semesterYearQ &&
              r.semester_no === semesterNoQ &&
              r.week_no === weekNoQ,
          );
          if (!row || !active) return;
          setForm({
            semesterYear: String(row.semester_year),
            semesterNo: String(row.semester_no),
            weekNo: String(row.week_no),
            startDate: row.start_date,
            endDate: row.end_date,
            department: row.department ?? "",
            workSummary: row.work_summary ?? "",
            problem: row.problem ?? "",
            status: row.status,
            fixAction: row.fix_action ?? "",
            courseFixAction: row.course_fix_action ?? "",
            experience: row.experience ?? "",
            suggestion: row.suggestion ?? "",
          });
          return;
        }

        if (!active || rows.length === 0) return;

        const latest = [...rows].sort((a, b) => {
          if (a.semester_year !== b.semester_year) return b.semester_year - a.semester_year;
          if (a.semester_no !== b.semester_no) return b.semester_no - a.semester_no;
          return b.week_no - a.week_no;
        })[0];

        setForm((prev) => ({
          ...prev,
          department: latest.department ?? prev.department,
        }));
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
      }
    })();

    return () => {
      active = false;
    };
  }, [params, semesterYearParam, semesterNoParam, weekNoParam]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/weekly-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          semesterYear: Number(form.semesterYear),
          semesterNo: Number(form.semesterNo),
          weekNo: Number(form.weekNo),
          startDate: form.startDate,
          endDate: form.endDate,
          department: form.department,
          workSummary: form.workSummary,
          problem: form.problem,
          status: form.status,
          fixAction: form.fixAction,
          courseFixAction: form.courseFixAction,
          experience: form.experience,
          suggestion: form.suggestion,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");
      setMessage("บันทึกข้อมูลเรียบร้อย");
      setSavePopupOpen(true);
      window.setTimeout(() => {
        setSavePopupOpen(false);
        router.push(`/student/${encodeURIComponent(studentId)}`);
      }, 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">ฟอร์ม Weekly</h1>
              <p className="text-sm text-slate-600">รหัสนิสิต: {studentId}</p>
            </div>
            <Link
              href={`/student/${encodeURIComponent(studentId)}`}
              className="rounded-xl bg-slate-900 px-4 py-2 text-white"
            >
              กลับหน้าหลัก
            </Link>
          </div>
          {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Field label="ปีการศึกษา">
                <input
                  type="number"
                  value={form.semesterYear}
                  onChange={(e) => setForm((v) => ({ ...v, semesterYear: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                />
              </Field>
              <Field label="ภาคการศึกษา">
                <select
                  value={form.semesterNo}
                  onChange={(e) => setForm((v) => ({ ...v, semesterNo: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </select>
              </Field>
              <Field label="สัปดาห์ที่">
                <select
                  value={form.weekNo}
                  onChange={(e) => setForm((v) => ({ ...v, weekNo: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                >
                  {Array.from({ length: 40 }, (_, i) => i + 1).map((week) => (
                    <option key={week} value={String(week)}>
                      {week}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="ตำแหน่ง">
                <input
                  value={form.department}
                  onChange={(e) => setForm((v) => ({ ...v, department: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="เริ่มวันที่">
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((v) => ({ ...v, startDate: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                />
              </Field>
              <Field label="สิ้นสุดวันที่">
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((v) => ({ ...v, endDate: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                />
              </Field>
            </div>

            <Field label="งานที่ทำ">
              <textarea
                rows={4}
                value={form.workSummary}
                onChange={(e) => setForm((v) => ({ ...v, workSummary: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              />
            </Field>
            <Field label="ปัญหาที่พบ">
              <textarea
                rows={4}
                value={form.problem}
                onChange={(e) => setForm((v) => ({ ...v, problem: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              />
            </Field>
            <Field label="วิธีแก้ปัญหา">
              <textarea
                rows={4}
                value={form.fixAction}
                onChange={(e) => setForm((v) => ({ ...v, fixAction: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              />
            </Field>
            <Field label="สิ่งที่เรียนในรายวิชาที่ช่วยแก้">
              <textarea
                rows={4}
                value={form.courseFixAction}
                onChange={(e) => setForm((v) => ({ ...v, courseFixAction: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              />
            </Field>
            <Field label="ประสบการณ์/สิ่งที่ได้เรียนรู้">
              <textarea
                rows={4}
                value={form.experience}
                onChange={(e) => setForm((v) => ({ ...v, experience: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              />
            </Field>
            <Field label="ข้อเสนอแนะ">
              <textarea
                rows={4}
                value={form.suggestion}
                onChange={(e) => setForm((v) => ({ ...v, suggestion: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              />
            </Field>

            <Field label="สถานะ">
              <div className="flex flex-wrap gap-2">
                {(["good", "normal", "worse", "danger"] as StatusType[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm((v) => ({ ...v, status: s }))}
                    className={`rounded-full px-3 py-2 text-sm ${form.status === s ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
                      }`}
                  >
                    {statusLabel(s)}
                  </button>
                ))}
              </div>
            </Field>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-500 hover:shadow-lg active:translate-y-0 disabled:cursor-not-allowed disabled:bg-emerald-300 disabled:hover:translate-y-0"
              >
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
              <button
                type="button"
                onClick={() => setForm(defaultForm())}
                className="rounded-xl bg-slate-200 px-4 py-3"
              >
                ล้างฟอร์ม
              </button>
            </div>
          </form>
        </section>
      </div>
      {savePopupOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/35 backdrop-blur-[2px]" />
          <div className="relative w-full max-w-sm rounded-3xl border border-white/80 bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              ✓
            </div>
            <h3 className="text-lg font-bold text-slate-900">บันทึกสำเร็จ</h3>
            <p className="mt-1 text-sm text-slate-600">กำลังกลับไปหน้า Dashboard...</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-sm font-medium text-slate-700">{label}</div>
      {children}
    </label>
  );
}

function statusLabel(status: StatusType) {
  return { good: "ดี", normal: "ปกติ", worse: "เฝ้าระวัง", danger: "เร่งด่วน" }[status];
}

