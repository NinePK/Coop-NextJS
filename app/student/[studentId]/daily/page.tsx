"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useId, useRef, useState } from "react";

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
              <Field label="ตำแหน่ง">
                <input
                  value={form.department}
                  onChange={(e) => setForm((v) => ({ ...v, department: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                />
              </Field>
              <Field label="ลงชื่อนิสิต (ในวงเล็บตรงลงชื่อ)">
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
            className={`rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-xl ${toast.tone === "success" ? "bg-emerald-600" : "bg-red-600"
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
  const inputId = useId();
  const [pickerOpen, setPickerOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
  const [hour = "00", minute = "00"] = value.split(":");
  const minuteQuickPicks = ["00", "15", "30", "45"];
  const pickerPanelId = `daily-time-panel-${inputId}`;

  function normalizeTime(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return "";

    const colonMatch = trimmed.match(/^(\d{1,2})\s*:\s*(\d{1,2})$/);
    const digits = trimmed.replace(/\D/g, "");

    let h: number | null = null;
    let m: number | null = null;

    if (colonMatch) {
      h = Number(colonMatch[1]);
      m = Number(colonMatch[2]);
    } else if (digits.length <= 2) {
      h = Number(digits);
      m = 0;
    } else if (digits.length === 3) {
      h = Number(digits.slice(0, 1));
      m = Number(digits.slice(1));
    } else {
      h = Number(digits.slice(0, 2));
      m = Number(digits.slice(2, 4));
    }

    if (h == null || m == null || Number.isNaN(h) || Number.isNaN(m)) return value;
    if (h < 0 || h > 23 || m < 0 || m > 59) return value;

    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  function formatTimeDraft(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 4);
    if (!digits) return "";
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  }

  function setHour(nextHour: string) {
    onChange(`${nextHour}:${minute || "00"}`);
  }

  function setMinute(nextMinute: string) {
    onChange(`${hour || "00"}:${nextMinute}`);
  }

  useEffect(() => {
    if (!pickerOpen) return;

    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setPickerOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [pickerOpen]);

  return (
    <div ref={rootRef} className="relative space-y-2">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input
          value={value}
          inputMode="numeric"
          maxLength={5}
          pattern="\d{2}:\d{2}"
          placeholder="เช่น 08:30 หรือ 830"
          onChange={(e) => onChange(formatTimeDraft(e.target.value))}
          onBlur={(e) => onChange(normalizeTime(e.target.value))}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
        />
        <button
          type="button"
          aria-expanded={pickerOpen}
          aria-controls={pickerPanelId}
          onClick={() => setPickerOpen((v) => !v)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          เวลา
          <span className={`text-xs transition ${pickerOpen ? "rotate-180" : ""}`}>▼</span>
        </button>
      </div>

      {pickerOpen ? (
        <div
          id={pickerPanelId}
          className="absolute left-0 top-[calc(100%+8px)] z-30 w-full max-w-[420px] overflow-hidden rounded-2xl border border-slate-700/80 bg-gradient-to-b from-slate-900 to-slate-950 text-white shadow-2xl ring-1 ring-black/20"
        >
          <div className="border-b border-white/10 px-4 py-3">
            <div className="text-center text-xs uppercase tracking-[0.18em] text-slate-400">Select Time</div>
            <div className="mt-1 text-center text-3xl font-semibold tabular-nums">
              {(hour || "00").padStart(2, "0")}:{(minute || "00").padStart(2, "0")}
            </div>
          </div>

          <div className="relative grid grid-cols-2 gap-3 p-3">
            <div className="pointer-events-none absolute left-3 right-3 top-1/2 h-11 -translate-y-1/2 rounded-xl border border-white/10 bg-white/5" />
            <div className="pointer-events-none absolute inset-x-3 top-3 h-16 bg-gradient-to-b from-slate-900 via-slate-900/80 to-transparent" />
            <div className="pointer-events-none absolute inset-x-3 bottom-3 h-16 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />

            <WheelColumn
              title="Hour"
              unit="H"
              options={hours}
              selected={hour || "00"}
              onSelect={setHour}
            />
            <WheelColumn
              title="Minute"
              unit="M"
              options={minutes}
              selected={minute || "00"}
              onSelect={setMinute}
            />
          </div>

          <div className="flex items-center justify-between border-t border-white/10 p-3">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setPickerOpen(false);
              }}
              className="rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              ล้างเวลา
            </button>
            <button
              type="button"
              onClick={() => setPickerOpen(false)}
              className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              เสร็จสิ้น
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {minuteQuickPicks.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMinute(m)}
            className={`rounded-md px-2 py-1 text-xs font-medium transition ${minute === m
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

    </div>
  );
}

function WheelColumn({
  title,
  unit,
  options,
  selected,
  onSelect,
}: {
  title: string;
  unit: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const ITEM_HEIGHT = 44;
  const PAD_HEIGHT = 88;

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const index = Math.max(0, options.indexOf(selected));
    const target = index * ITEM_HEIGHT;
    el.scrollTo({ top: target, behavior: "smooth" });
  }, [selected, options]);

  useEffect(() => {
    return () => {
      if (frameRef.current != null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  function handleScroll() {
    if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      const el = listRef.current;
      if (!el) return;
      const index = Math.round(el.scrollTop / ITEM_HEIGHT);
      const next = options[Math.min(options.length - 1, Math.max(0, index))];
      if (next && next !== selected) onSelect(next);
    });
  }

  return (
    <div className="space-y-2">
      <div className="px-1 text-center text-xs text-slate-400">{title}</div>
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="relative h-56 snap-y snap-mandatory overflow-y-auto rounded-xl bg-white/5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
      >
        <div style={{ height: PAD_HEIGHT }} />
        <div>
          {options.map((option) => (
            <button
              key={`${unit}-${option}`}
              type="button"
              onClick={() => onSelect(option)}
              className={`flex h-11 w-full snap-center items-center justify-center rounded-lg text-2xl tabular-nums transition ${selected === option
                ? "bg-white/10 text-white"
                : "text-slate-500 hover:text-slate-200"
                }`}
            >
              {option}
              <span className="ml-2 text-xs font-semibold text-slate-400">{unit}</span>
            </button>
          ))}
        </div>
        <div style={{ height: PAD_HEIGHT }} />
      </div>
    </div>
  );
}
