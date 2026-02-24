"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type DailyRow = {
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
};

type ApiResponse = { student: { studentId: string } | null; rows: DailyRow[]; error?: string };

type FormState = {
  reportDate: string;
  workStartTime: string;
  workEndTime: string;
  department: string;
  workSummary: string;
  problem: string;
  fixAction: string;
  experience: string;
  suggestion: string;
  studentSignatureName: string;
};

function defaultForm(): FormState {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return {
    reportDate: `${yyyy}-${mm}-${dd}`,
    workStartTime: "",
    workEndTime: "",
    department: "",
    workSummary: "",
    problem: "",
    fixAction: "",
    experience: "",
    suggestion: "",
    studentSignatureName: "",
  };
}

function toTimeInput(v: string | null) {
  if (!v) return "";
  return v.slice(0, 5);
}

export default function DailyPage({ params }: { params: Promise<{ studentId: string }> }) {
  const search = useSearchParams();
  const router = useRouter();
  const editDateParam = search.get("date") ?? "";
  const [studentId, setStudentId] = useState("");
  const [rows, setRows] = useState<DailyRow[]>([]);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [savePopupOpen, setSavePopupOpen] = useState(false);

  function showToast(messageText: string, tone: "success" | "error" = "success") {
    setToast({ message: messageText, tone });
    window.setTimeout(() => {
      setToast((prev) => (prev?.message === messageText ? null : prev));
    }, 2200);
  }

  async function fetchRows(pStudentId: string) {
    const res = await fetch(`/api/daily-reports?studentId=${encodeURIComponent(pStudentId)}`, {
      cache: "no-store",
    });
    const data = (await res.json()) as ApiResponse;
    if (!res.ok) throw new Error(data.error || "โหลดข้อมูลไม่สำเร็จ");
    return data.rows ?? [];
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const p = await params;
        if (!active) return;
        setStudentId(p.studentId);

        const loaded = await fetchRows(p.studentId);
        if (!active) return;
        setRows(loaded);

        if (editDateParam) {
          const row = loaded.find((r) => r.report_date === editDateParam);
          if (!row) return;
          setForm({
            reportDate: row.report_date,
            workStartTime: toTimeInput(row.work_start_time),
            workEndTime: toTimeInput(row.work_end_time),
            department: row.department ?? "",
            workSummary: row.work_summary ?? "",
            problem: row.problem ?? "",
            fixAction: row.fix_action ?? "",
            experience: row.experience ?? "",
            suggestion: row.suggestion ?? "",
            studentSignatureName: row.student_signature_name ?? "",
          });
          return;
        }

        if (loaded.length > 0) {
          const latest = [...loaded].sort((a, b) => b.report_date.localeCompare(a.report_date))[0];
          setForm((prev) => ({
            ...prev,
            workStartTime: toTimeInput(latest.work_start_time) || prev.workStartTime,
            workEndTime: toTimeInput(latest.work_end_time) || prev.workEndTime,
            department: latest.department ?? prev.department,
            studentSignatureName: latest.student_signature_name ?? prev.studentSignatureName,
          }));
        }
      } catch (e) {
        if (!active) return;
        const msg = e instanceof Error ? e.message : "เกิดข้อผิดพลาด";
        setError(msg);
        showToast(msg, "error");
      }
    })();

    return () => {
      active = false;
    };
  }, [params, editDateParam]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/daily-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          reportDate: form.reportDate,
          workStartTime: form.workStartTime,
          workEndTime: form.workEndTime,
          department: form.department,
          workSummary: form.workSummary,
          problem: form.problem,
          fixAction: form.fixAction,
          experience: form.experience,
          suggestion: form.suggestion,
          studentSignatureName: form.studentSignatureName,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");

      const refreshed = await fetchRows(studentId);
      setRows(refreshed);
      setMessage("บันทึกข้อมูลรายวันเรียบร้อย");
      showToast("บันทึกข้อมูลรายวันเรียบร้อย", "success");
      setSavePopupOpen(true);
      router.replace(`/student/${encodeURIComponent(studentId)}/daily`);
      window.setTimeout(() => setSavePopupOpen(false), 900);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "เกิดข้อผิดพลาด";
      setError(msg);
      showToast(msg, "error");
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
              <h1 className="text-2xl font-bold text-slate-900">ฟอร์มบันทึกรายวัน</h1>
              <p className="text-sm text-slate-600">รหัสนิสิต: {studentId}</p>
            </div>
            <Link
              href={`/student/${encodeURIComponent(studentId)}`}
              className="rounded-xl bg-slate-900 px-4 py-2 text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              กลับหน้าหลัก
            </Link>
          </div>
          {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="วันที่">
                <input
                  type="date"
                  value={form.reportDate}
                  onChange={(e) => setForm((v) => ({ ...v, reportDate: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                />
              </Field>
              <Field label="เวลาเริ่มงาน">
                <TimePicker24
                  value={form.workStartTime}
                  onChange={(value) => setForm((v) => ({ ...v, workStartTime: value }))}
                />
              </Field>
              <Field label="เวลาสิ้นสุดงาน">
                <TimePicker24
                  value={form.workEndTime}
                  onChange={(value) => setForm((v) => ({ ...v, workEndTime: value }))}
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="แผนก / หน่วยงาน">
                <input
                  value={form.department}
                  onChange={(e) => setForm((v) => ({ ...v, department: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                />
              </Field>
              <Field label="ชื่อในวงเล็บ (ฝั่งนิสิต)">
                <input
                  value={form.studentSignatureName}
                  onChange={(e) => setForm((v) => ({ ...v, studentSignatureName: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  placeholder="เช่น นาย... / นางสาว..."
                />
              </Field>
            </div>

            <Field label="1) งานที่ปฏิบัติ">
              <textarea
                rows={4}
                value={form.workSummary}
                onChange={(e) => setForm((v) => ({ ...v, workSummary: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
              />
            </Field>
            <Field label="2) ปัญหาที่พบในการปฏิบัติงาน">
              <textarea
                rows={4}
                value={form.problem}
                onChange={(e) => setForm((v) => ({ ...v, problem: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
              />
            </Field>
            <Field label="3) การแก้ปัญหา">
              <textarea
                rows={4}
                value={form.fixAction}
                onChange={(e) => setForm((v) => ({ ...v, fixAction: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
              />
            </Field>
            <Field label="4) ประสบการณ์ / ความรู้ที่ได้รับ">
              <textarea
                rows={4}
                value={form.experience}
                onChange={(e) => setForm((v) => ({ ...v, experience: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
              />
            </Field>
            <Field label="5) ข้อเสนอแนะ">
              <textarea
                rows={4}
                value={form.suggestion}
                onChange={(e) => setForm((v) => ({ ...v, suggestion: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
              />
            </Field>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white transition hover:-translate-y-0.5 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-300"
              >
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMessage(null);
                  setError(null);
                  setForm((prev) => {
                    const reset = defaultForm();
                    return {
                      ...reset,
                      workStartTime: prev.workStartTime,
                      workEndTime: prev.workEndTime,
                      department: prev.department,
                      studentSignatureName: prev.studentSignatureName,
                    };
                  });
                  router.replace(`/student/${encodeURIComponent(studentId)}/daily`);
                  showToast("ล้างฟอร์มแล้ว", "success");
                }}
                className="rounded-xl bg-slate-200 px-4 py-3 text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-300"
              >
                ล้างฟอร์ม
              </button>
            </div>
          </form>
        </section>
      </div>
      {toast ? (
        <div className="pointer-events-none fixed bottom-5 right-5 z-50">
          <div
            className={`rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-xl ${
              toast.tone === "success" ? "bg-emerald-600" : "bg-red-600"
            }`}
          >
            {toast.message}
          </div>
        </div>
      ) : null}
      {savePopupOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]" />
          <div className="relative w-full max-w-sm rounded-3xl border border-white/80 bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              ✓
            </div>
            <h3 className="text-lg font-bold text-slate-900">บันทึกสำเร็จ</h3>
            <p className="mt-1 text-sm text-slate-600">บันทึกข้อมูลรายวันเรียบร้อย</p>
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

function TimePicker24({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [hour = "", minute = ""] = value.split(":");
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
  const minuteQuickPicks = ["00", "15", "30", "45"];
  const hourListId = "daily-hour-options";
  const minuteListId = "daily-minute-options";

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <input
          list={hourListId}
          value={hour}
          inputMode="numeric"
          placeholder="ชั่วโมง"
          maxLength={2}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
            if (raw === "") {
              onChange("");
              return;
            }
            onChange(`${raw.padStart(2, "0")}:${minute || "00"}`);
          }}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
        />
        <span className="font-semibold text-slate-500">:</span>
        <input
          list={minuteListId}
          value={minute}
          inputMode="numeric"
          placeholder="นาที"
          maxLength={2}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
            if (raw === "" && !hour) {
              onChange("");
              return;
            }
            onChange(`${hour || "00"}:${(raw || "00").padStart(2, "0")}`);
          }}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
        />
        <datalist id={hourListId}>
          {hours.map((h) => (
            <option key={h} value={h} />
          ))}
        </datalist>
        <datalist id={minuteListId}>
          {minutes.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {minuteQuickPicks.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onChange(`${hour || "00"}:${m}`)}
            className={`rounded-md px-2 py-1 text-xs font-medium transition ${
              minute === m
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {m} นาที
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange("")}
          className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
        >
          ล้างเวลา
        </button>
      </div>
      <p className="text-xs text-slate-500">รูปแบบ 24 ชั่วโมง (เวลาไทย)</p>
    </div>
  );
}
