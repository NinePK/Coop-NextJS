"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type StatusType = "good" | "normal" | "worse" | "danger";

type WeeklyRow = {
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
  status: StatusType;
  fix_action: string | null;
  course_fix_action: string | null;
  experience: string | null;
  suggestion: string | null;
};

type ApiResponse = {
  student: { studentId: string } | null;
  rows: WeeklyRow[];
  error?: string;
};

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

type DailyApiResponse = {
  student: { studentId: string } | null;
  rows: DailyRow[];
  error?: string;
};

function toTimeInput(v: string | null) {
  if (!v) return "";
  return v.slice(0, 5);
}

function fmtDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function fmtDateThaiLong(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

function statusText(status: StatusType) {
  return { good: "ดี", normal: "ปกติ", worse: "เฝ้าระวัง", danger: "เร่งด่วน" }[status];
}

function statusClass(status: StatusType) {
  return {
    good: "bg-emerald-100 text-emerald-800",
    normal: "bg-slate-100 text-slate-700",
    worse: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-800",
  }[status];
}

async function loadScript(src: string) {
  await new Promise<void>((resolve, reject) => {
    const found = document.querySelector(`script[data-src="${src}"]`);
    if (found) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

async function ensureThaiJsPdfFonts(jsPDFCtor: unknown) {
  const w = window as Window & {
    jspdf?: { jsPDF: unknown };
    __coopPdfFontsReady?: Promise<void>;
  };

  if (!w.__coopPdfFontsReady) {
    w.__coopPdfFontsReady = (async () => {
      w.jspdf = { jsPDF: jsPDFCtor };
      await loadScript("/fonts/THSarabunNew-normal.js");
      await loadScript("/fonts/THSarabunNew-bold.js");
    })();
  }

  await w.__coopPdfFontsReady;
}

export default function StudentDashboard({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const [studentId, setStudentId] = useState("");
  const [rows, setRows] = useState<WeeklyRow[]>([]);
  const [dailyRows, setDailyRows] = useState<DailyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    description: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  function showToast(message: string, tone: "success" | "error" = "success") {
    setToast({ message, tone });
    window.setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 2200);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      const p = await params;
      if (!active) return;
      setStudentId(p.studentId);
      try {
        const res = await fetch(
          `/api/weekly-reports?studentId=${encodeURIComponent(p.studentId)}`,
          { cache: "no-store" },
        );
        const data = (await res.json()) as ApiResponse;
        if (!res.ok) throw new Error(data.error || "à¹‚à¸«à¸¥à¸”à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ");
        if (!active) return;
        setRows(data.rows ?? []);

        const dailyRes = await fetch(
          `/api/daily-reports?studentId=${encodeURIComponent(p.studentId)}`,
          { cache: "no-store" },
        );
        const dailyData = (await dailyRes.json()) as DailyApiResponse;
        if (!dailyRes.ok) throw new Error(dailyData.error || "à¹‚à¸«à¸¥à¸”à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸£à¸²à¸¢à¸§à¸±à¸™à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ");
        if (!active) return;
        setDailyRows(dailyData.rows ?? []);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [params]);

  const grouped = useMemo(() => {
    const m = new Map<string, WeeklyRow[]>();
    for (const row of rows) {
      const key = `${row.semester_year}-${row.semester_no}`;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(row);
    }
    return [...m.entries()].map(([key, list]) => ({
      key,
      semesterYear: list[0].semester_year,
      semesterNo: list[0].semester_no,
      rows: [...list].sort((a, b) => a.week_no - b.week_no),
    }));
  }, [rows]);

  const latestDailyRows = useMemo(
    () => [...dailyRows].sort((a, b) => b.report_date.localeCompare(a.report_date)).slice(0, 10),
    [dailyRows],
  );

  async function exportPdf() {
    if (rows.length === 0) return;

    const { jsPDF } = await import("jspdf");
    await ensureThaiJsPdfFonts(jsPDF);

    const doc = new jsPDF({ unit: "mm", format: "a4" });

    const allRows = grouped
      .flatMap((g) => g.rows)
      .sort((a, b) => {
        if (a.semester_year !== b.semester_year) return b.semester_year - a.semester_year;
        if (a.semester_no !== b.semester_no) return b.semester_no - a.semester_no;
        return a.week_no - b.week_no;
      });
    const keyTh: Record<string, string> = {
      week: "à¸ªà¸±à¸›à¸”à¸²à¸«à¹Œà¸—à¸µà¹ˆ",
      dept: "à¹à¸œà¸™à¸à¸›à¸à¸´à¸šà¸±à¸•à¸´à¸‡à¸²à¸™",
      startDate: "à¹€à¸£à¸´à¹ˆà¸¡à¸à¸²à¸£à¸šà¸±à¸™à¸—à¸¶à¸",
      endDate: "à¸ªà¸´à¹‰à¸™à¸ªà¸¸à¸”à¸à¸²à¸£à¸šà¸±à¸™à¸—à¸¶à¸",
      job: "à¸‡à¸²à¸™à¸—à¸µà¹ˆà¸›à¸à¸´à¸šà¸±à¸•à¸´",
      problem: "à¸›à¸±à¸à¸«à¸²à¸—à¸µà¹ˆà¸žà¸šà¹ƒà¸™à¸à¸²à¸£à¸›à¸à¸´à¸šà¸±à¸•à¸´à¸‡à¸²à¸™",
      status: "à¸ªà¸–à¸²à¸™à¸°à¸à¸²à¸£à¸›à¸à¸´à¸šà¸±à¸•à¸´à¸‡à¸²à¸™",
      fixed: "à¸à¸²à¸£à¹à¸à¹‰à¸›à¸±à¸à¸«à¸²",
      courseFixed: "à¸£à¸²à¸¢à¸§à¸´à¸Šà¸²à¸—à¸µà¹ˆà¸™à¸³à¸¡à¸²à¹ƒà¸Šà¹‰",
      exp: "à¸ªà¸´à¹ˆà¸‡à¸—à¸µà¹ˆà¹„à¸”à¹‰à¸£à¸±à¸š",
      suggestion: "à¸‚à¹‰à¸­à¹€à¸ªà¸™à¸­à¹à¸™à¸°",
      training_id: "à¸«à¸¡à¸²à¸¢à¹€à¸¥à¸‚à¸à¸¶à¸à¸‡à¸²à¸™",
    };

    const jsonData = allRows.map((r) => ({
      week: `${r.week_no} ( ${fmtDateThaiLong(r.start_date)} à¸–à¸¶à¸‡ ${fmtDateThaiLong(r.end_date)} )`,
      dept: r.department ?? "-",
      status: r.status,
      job: r.work_summary ?? "-",
      problem: r.problem ?? "-",
      fixed: r.fix_action ?? "-",
      courseFixed: r.course_fix_action ?? "-",
      exp: r.experience ?? "-",
      suggestion: r.suggestion ?? "-",
    }));

    const pageWidth = doc.internal.pageSize.width - 50;
    const pageHeight = doc.internal.pageSize.height - 50;
    const fontSize = 14;
    const marginY = 25;
    const marginX = 25;
    const defaultYJump = 5;

    const drawWatermark = () => {
      const anyDoc = doc as unknown as {
        saveGraphicsState?: () => void;
        restoreGraphicsState?: () => void;
        GState?: new (opts: { opacity: number }) => unknown;
        setGState?: (state: unknown) => void;
      };

      anyDoc.saveGraphicsState?.();
      if (anyDoc.GState && anyDoc.setGState) {
        anyDoc.setGState(new anyDoc.GState({ opacity: 0.26 }));
      }
      doc.setFont("THSarabunNew", "bold");
      doc.setFontSize(120);
      doc.setTextColor(155, 155, 155);
      doc.text("coop.ict.up.ac.th", 25, 250, { angle: 45 });
      doc.link(18, 128, 175, 65, { url: "https://coop.ict.up.ac.th" });
      anyDoc.restoreGraphicsState?.();
      doc.setTextColor(0, 0, 0);
    };

    doc.setFontSize(fontSize);

    jsonData.forEach((item, id) => {
      drawWatermark();
      doc.setFont("THSarabunNew", "normal");
      doc.setFontSize(fontSize);

      let y = marginY;

      Object.keys(item).forEach((key) => {
        doc.setFont("THSarabunNew", "bold");

        if (y > pageHeight + marginY) {
          doc.addPage();
          drawWatermark();
          doc.setFont("THSarabunNew", "normal");
          doc.setFontSize(fontSize);
          y = 10;
        }

        const value = String(item[key as keyof typeof item] ?? "-");
        const wrappedText = doc.splitTextToSize(value, pageWidth);

        if (y > pageHeight - marginY) {
          doc.addPage();
          drawWatermark();
          doc.setFont("THSarabunNew", "normal");
          doc.setFontSize(fontSize);
          y = marginY;
        }

        doc.text(`${keyTh[key]}:`, marginX, y);
        doc.setFont("THSarabunNew", "normal");

        if (["week", "dept", "status"].includes(key)) {
          doc.text(wrappedText, marginX + 30, y);
        } else {
          let iterations = 1;
          let newText = "";

          y += 2.5;
          wrappedText.forEach((line: string) => {
            const posY = y + defaultYJump * iterations++;
            if (posY > pageHeight - marginY) {
              doc.text(newText, marginX, y + defaultYJump);
              doc.addPage();
              drawWatermark();
              doc.setFont("THSarabunNew", "normal");
              doc.setFontSize(fontSize);

              iterations = 1;
              newText = "";
              y = marginY;
            }
            newText += `${line}\n`;
          });

          if (iterations > 1) {
            doc.text(newText, marginX, y + defaultYJump);
          }

          y = y + defaultYJump * ++iterations;
        }

        y += (3 * fontSize) / 4;
        if (y > pageHeight + marginY) {
          doc.addPage();
          drawWatermark();
          doc.setFont("THSarabunNew", "normal");
          doc.setFontSize(fontSize);
          y = marginY;
        }
      });

      if (id < jsonData.length - 1) {
        doc.addPage();
      }
    });

    doc.save(`${studentId}.pdf`);
  }

  async function exportDailyPdf() {
    if (dailyRows.length === 0) return;

    const { jsPDF } = await import("jspdf");
    await ensureThaiJsPdfFonts(jsPDF);
    const doc = new jsPDF({ unit: "mm", format: "a4" });

    const monthTh = [
      "",
      "à¸¡à¸à¸£à¸²à¸„à¸¡",
      "à¸à¸¸à¸¡à¸ à¸²à¸žà¸±à¸™à¸˜à¹Œ",
      "à¸¡à¸µà¸™à¸²à¸„à¸¡",
      "à¹€à¸¡à¸©à¸²à¸¢à¸™",
      "à¸žà¸¤à¸©à¸ à¸²à¸„à¸¡",
      "à¸¡à¸´à¸–à¸¸à¸™à¸²à¸¢à¸™",
      "à¸à¸£à¸à¸Žà¸²à¸„à¸¡",
      "à¸ªà¸´à¸‡à¸«à¸²à¸„à¸¡",
      "à¸à¸±à¸™à¸¢à¸²à¸¢à¸™",
      "à¸•à¸¸à¸¥à¸²à¸„à¸¡",
      "à¸žà¸¤à¸¨à¸ˆà¸´à¸à¸²à¸¢à¸™",
      "à¸˜à¸±à¸™à¸§à¸²à¸„à¸¡",
    ];

    const sorted = [...dailyRows].sort((a, b) => b.report_date.localeCompare(a.report_date));

    const textLines = (text: string | null | undefined, x: number, y: number, maxW = 145, maxLines = 3) => {
      const t = (text || "").trim();
      const lines = doc.splitTextToSize(t || " ", maxW).slice(0, maxLines);
      lines.forEach((line: string, i: number) => {
        doc.text(String(line), x, y + i * 7);
      });
    };

    const dottedLine = (x1: number, y1: number, x2: number, y2: number) => {
      const anyDoc = doc as unknown as { setLineDashPattern?: (dash: number[], phase?: number) => void };
      anyDoc.setLineDashPattern?.([0.6, 0.8], 0);
      doc.line(x1, y1, x2, y2);
      anyDoc.setLineDashPattern?.([], 0);
    };

    sorted.forEach((row, idx) => {
      if (idx > 0) doc.addPage();

      const d = new Date(row.report_date);
      const dateNum = Number.isNaN(d.getTime()) ? "" : String(d.getDate());
      const monthName = Number.isNaN(d.getTime()) ? "" : monthTh[d.getMonth() + 1];
      const yearBuddhist = Number.isNaN(d.getTime()) ? "" : String(d.getFullYear() + 543);

      doc.setFont("THSarabunNew", "bold");
      doc.setFontSize(16);
      doc.text("à¸šà¸±à¸™à¸—à¸¶à¸à¸à¸²à¸£à¸›à¸à¸´à¸šà¸±à¸•à¸´à¸‡à¸²à¸™", 105, 22, { align: "center" });

      doc.setFont("THSarabunNew", "normal");
      doc.setFontSize(12);

      doc.text("à¸§à¸±à¸™", 18, 38);
      dottedLine(21, 39, 44, 39);
      doc.text("à¸—à¸µà¹ˆ", 45, 38);
      dottedLine(48, 39, 59, 39);
      doc.text("à¹€à¸”à¸·à¸­à¸™", 60, 38);
      dottedLine(69, 39, 99, 39);
      doc.text("à¸žà¸¸à¸—à¸˜à¸¨à¸±à¸à¸£à¸²à¸Š", 100, 38);
      dottedLine(116, 39, 137, 39);
      doc.text("à¹€à¸§à¸¥à¸²à¸›à¸à¸´à¸šà¸±à¸•à¸´à¸‡à¸²à¸™", 138, 38);
      dottedLine(159, 39, 177, 39);
      doc.text("à¸™. à¸–à¸¶à¸‡", 178, 38);
      dottedLine(188, 39, 202, 39);
      doc.text("à¸™.", 203, 38);

      doc.text(dateNum, 32.5, 38);
      doc.text(dateNum, 52.5, 38);
      doc.text(monthName, 81, 38);
      doc.text(yearBuddhist, 126, 38);
      doc.text(toTimeInput(row.work_start_time) || "", 168, 38, { align: "center" });
      doc.text(toTimeInput(row.work_end_time) || "", 195, 38, { align: "center" });

      doc.text("à¹à¸œà¸™à¸à¸—à¸µà¹ˆà¹€à¸‚à¹‰à¸²à¹„à¸›à¸›à¸à¸´à¸šà¸±à¸•à¸´à¸‡à¸²à¸™à¸§à¸±à¸™à¸™à¸µà¹‰", 18, 45);
      dottedLine(58, 46, 202, 46);
      doc.text(row.department || "", 59, 45);

      const sections: Array<{ title: string; body: string | null; top: number }> = [
        { title: "1.   à¸‡à¸²à¸™à¸—à¸µà¹ˆà¸›à¸à¸´à¸šà¸±à¸•à¸´", body: row.work_summary, top: 58 },
        { title: "2.   à¸›à¸±à¸à¸«à¸²à¸—à¸µà¹ˆà¸žà¸šà¹ƒà¸™à¸à¸²à¸£à¸›à¸à¸´à¸šà¸±à¸•à¸´à¸‡à¸²à¸™", body: row.problem, top: 91 },
        { title: "3.   à¸à¸²à¸£à¹à¸à¹‰à¸›à¸±à¸à¸«à¸²", body: row.fix_action, top: 124 },
        { title: "4.   à¸›à¸£à¸°à¸ªà¸šà¸à¸²à¸£à¸“à¹Œ / à¸„à¸§à¸²à¸¡à¸£à¸¹à¹‰à¸—à¸µà¹ˆà¹„à¸”à¹‰à¸£à¸±à¸š", body: row.experience, top: 157 },
        { title: "5.   à¸‚à¹‰à¸­à¹€à¸ªà¸™à¸­à¹à¸™à¸°", body: row.suggestion, top: 190 },
      ];

      sections.forEach((s) => {
        doc.text(s.title, 18, s.top);
        dottedLine(18, s.top + 7, 202, s.top + 7);
        dottedLine(18, s.top + 14, 202, s.top + 14);
        dottedLine(18, s.top + 21, 202, s.top + 21);
        textLines(s.body, 20, s.top + 5.8, 178, 3);
      });

      doc.text("à¸¥à¸‡à¸Šà¸·à¹ˆà¸­", 18, 238);
      dottedLine(28, 239, 83, 239);
      doc.text("à¸¥à¸‡à¸Šà¸·à¹ˆà¸­", 117, 238);
      dottedLine(127, 239, 202, 239);
      doc.text("(", 18, 244);
      dottedLine(21, 245, 83, 245);
      doc.text(")", 84, 244);
      doc.text("(", 117, 244);
      dottedLine(120, 245, 202, 245);
      doc.text(")", 203, 244);
      doc.text(row.student_signature_name || "", 52, 244, {
        align: "center",
      });
      doc.text("à¸™à¸´à¸ªà¸´à¸•", 52, 251, { align: "center" });
      doc.text("à¸žà¸™à¸±à¸à¸‡à¸²à¸™à¸—à¸µà¹ˆà¸›à¸£à¸¶à¸à¸©à¸²", 160, 251, { align: "center" });
    });

    doc.save(`${studentId}-daily.pdf`);
  }

  async function deleteWeeklyRow(row: WeeklyRow) {
    const runDelete = async () => {
      try {
        const res = await fetch("/api/weekly-reports", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId,
            semesterYear: row.semester_year,
            semesterNo: row.semester_no,
            weekNo: row.week_no,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error || "ลบไม่สำเร็จ");
        setRows((prev) =>
          prev.filter(
            (r) =>
              !(
                r.semester_year === row.semester_year &&
                r.semester_no === row.semester_no &&
                r.week_no === row.week_no
              ),
          ),
        );
        showToast(`ลบ Weekly สัปดาห์ที่ ${row.week_no} แล้ว`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "เกิดข้อผิดพลาด";
        setError(msg);
        showToast(msg, "error");
      }
    };
    setConfirmModal({
      title: "ยืนยันการลบ Weekly",
      description: `ต้องการลบข้อมูลสัปดาห์ที่ ${row.week_no} ใช่หรือไม่`,
      onConfirm: runDelete,
    });
  }

  async function deleteDailyRow(row: DailyRow) {
    const runDelete = async () => {
      try {
        const res = await fetch("/api/daily-reports", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId,
            reportDate: row.report_date,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error || "ลบไม่สำเร็จ");
        setDailyRows((prev) => prev.filter((r) => r.report_date !== row.report_date));
        showToast(`ลบบันทึกรายวัน ${fmtDate(row.report_date)} แล้ว`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "เกิดข้อผิดพลาด";
        setError(msg);
        showToast(msg, "error");
      }
    };
    setConfirmModal({
      title: "ยืนยันการลบบันทึกรายวัน",
      description: `ต้องการลบรายการวันที่ ${fmtDate(row.report_date)} ใช่หรือไม่`,
      onConfirm: runDelete,
    });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_10%_10%,#dbeafe_0%,#e2e8f0_35%,#cbd5e1_100%)] p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.45)] backdrop-blur md:p-6">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-200/60 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-8 left-10 h-24 w-24 rounded-full bg-indigo-200/70 blur-xl" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Student Dashboard
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                หน้าหลักนิสิต
              </h1>
              <p className="mt-1 text-sm text-slate-600">รหัสนิสิต: {studentId}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatPill label="Weekly" value={rows.length} tone="blue" />
                <StatPill label="Daily" value={dailyRows.length} tone="indigo" />
              </div>
            </div>
            <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:min-w-[520px]">
              <Link
                href={`/student/${encodeURIComponent(studentId)}/weekly`}
                className={actionBtn("blue")}
              >
                ไปหน้า ฟอร์ม Weekly
              </Link>
              <Link
                href={`/student/${encodeURIComponent(studentId)}/daily`}
                className={actionBtn("indigo")}
              >
                ฟอร์ม Daily
              </Link>
              <button
                type="button"
                onClick={exportPdf}
                disabled={rows.length === 0}
                className={actionBtn("dark")}
              >
                Export Weekly PDF
              </button>
              <button
                type="button"
                onClick={exportDailyPdf}
                disabled={dailyRows.length === 0}
                className={actionBtn("violet")}
              >
                Export Daily PDF
              </button>
            </div>
          </div>
          {error ? (
            <p className="relative mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </section>

        <section className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-[0_15px_50px_-35px_rgba(15,23,42,0.45)] backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">รายการ Weekly ที่กรอกแล้ว</h2>
            <span className="text-sm text-slate-600">{rows.length} รายการ</span>
          </div>

          {loading ? (
            <p className="text-sm text-slate-600">กำลังโหลดข้อมูล...</p>
          ) : rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-slate-500">
              ยังไม่มีข้อมูลรายสัปดาห์
            </p>
          ) : (
            <div className="space-y-5">
              {grouped.map((g) => (
                <div
                  key={g.key}
                  className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3">
                    <div className="font-semibold text-slate-800">
                      ภาคการศึกษา {g.semesterNo}/{g.semesterYear}
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                      {g.rows.length} สัปดาห์
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-slate-900">
                      <thead className="bg-slate-100 text-slate-700">
                        <tr>
                          <Th>สัปดาห์</Th>
                          <Th>วันที่</Th>
                          <Th>แผนก</Th>
                          <Th>สถานะ</Th>
                          <Th>งานที่ทำ</Th>
                          <Th>ปัญหา</Th>
                          <Th>แก้ไข / ลบ</Th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-900">
                        {g.rows.map((r) => (
                          <tr
                            key={r.id}
                            className="border-t border-slate-100 align-top transition-colors hover:bg-slate-50/80"
                          >
                            <Td>{r.week_no}</Td>
                            <Td>
                              {fmtDate(r.start_date)} - {fmtDate(r.end_date)}
                            </Td>
                            <Td>{r.department || "-"}</Td>
                            <Td>
                              <span className={`rounded-full px-2 py-1 text-xs ${statusClass(r.status)}`}>
                                {statusText(r.status)}
                              </span>
                            </Td>
                            <Td>{r.work_summary || "-"}</Td>
                            <Td>{r.problem || "-"}</Td>
                            <Td>
                              <div className="flex flex-wrap gap-2">
                                <Link
                                  href={`/student/${encodeURIComponent(studentId)}/weekly?semesterYear=${r.semester_year}&semesterNo=${r.semester_no}&weekNo=${r.week_no}`}
                                  className={miniActionBtn("blue")}
                                >
                                  แก้ไข
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => void deleteWeeklyRow(r)}
                                  className={miniActionBtn("red")}
                                >
                                  ลบ
                                </button>
                              </div>
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-[0_15px_50px_-35px_rgba(15,23,42,0.45)] backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">รายการ Daily ที่กรอกแล้ว</h2>
            <span className="text-sm text-slate-600">{dailyRows.length} รายการ</span>
          </div>

          {loading ? (
            <p className="text-sm text-slate-600">กำลังโหลดข้อมูล...</p>
          ) : dailyRows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-slate-500">
              ยังไม่มีข้อมูลรายวัน
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <table className="min-w-full text-sm text-slate-900">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <Th>วันที่</Th>
                    <Th>เวลา</Th>
                    <Th>แผนก</Th>
                    <Th>งานที่ทำ</Th>
                    <Th>แก้ไข / ลบ</Th>
                  </tr>
                </thead>
                <tbody className="text-slate-900">
                  {latestDailyRows.map((r) => (
                    <tr
                      key={r.id}
                      className="border-t border-slate-100 align-top transition-colors hover:bg-slate-50/80"
                    >
                      <Td>{fmtDate(r.report_date)}</Td>
                      <Td>
                        {(toTimeInput(r.work_start_time) || "-") +
                          " - " +
                          (toTimeInput(r.work_end_time) || "-")}
                      </Td>
                      <Td>{r.department || "-"}</Td>
                      <Td>{r.work_summary || "-"}</Td>
                      <Td>
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/student/${encodeURIComponent(studentId)}/daily?date=${r.report_date}`}
                            className={miniActionBtn("indigo")}
                          >
                            แก้ไข
                          </Link>
                          <button
                            type="button"
                            onClick={() => void deleteDailyRow(r)}
                            className={miniActionBtn("red")}
                          >
                            ลบ
                          </button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
      {toast ? (
        <div className="pointer-events-none fixed bottom-5 right-5 z-50">
          <div
            className={`rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-xl backdrop-blur ${
              toast.tone === "success"
                ? "bg-emerald-600/95 shadow-emerald-900/20"
                : "bg-red-600/95 shadow-red-900/20"
            }`}
          >
            {toast.message}
          </div>
        </div>
      ) : null}
      {confirmModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="ปิดหน้าต่างยืนยัน"
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]"
            onClick={() => setConfirmModal(null)}
          />
          <div className="relative w-full max-w-md rounded-3xl border border-white/70 bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">{confirmModal.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{confirmModal.description}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="rounded-xl bg-slate-100 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-200"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={async () => {
                  const action = confirmModal.onConfirm;
                  setConfirmModal(null);
                  await action();
                }}
                className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-500"
              >
                ยืนยันลบ
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-700">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="max-w-sm whitespace-pre-wrap px-3 py-3 text-slate-900">{children}</td>;
}

function StatPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "blue" | "indigo";
}) {
  const toneClass =
    tone === "blue"
      ? "bg-blue-50 text-blue-700 ring-blue-200"
      : "bg-indigo-50 text-indigo-700 ring-indigo-200";
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${toneClass}`}>
      <span>{label}</span>
      <span className="rounded-full bg-white/90 px-2 py-0.5 text-[11px]">{value}</span>
    </span>
  );
}

function actionBtn(tone: "blue" | "indigo" | "dark" | "violet") {
  const base =
    "inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0";
  const map = {
    blue: "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400",
    indigo: "bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400",
    dark: "bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700",
    violet: "bg-gradient-to-r from-violet-700 to-indigo-600 hover:from-violet-600 hover:to-indigo-500",
  } as const;
  return `${base} ${map[tone]}`;
}

function miniActionBtn(tone: "blue" | "indigo" | "red") {
  const base =
    "inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold transition duration-150 hover:-translate-y-0.5 active:translate-y-0";
  const map = {
    blue: "bg-blue-50 text-blue-700 ring-1 ring-blue-100 hover:bg-blue-100",
    indigo: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100 hover:bg-indigo-100",
    red: "bg-red-50 text-red-700 ring-1 ring-red-100 hover:bg-red-100",
  } as const;
  return `${base} ${map[tone]}`;
}

function esc(v: string) {
  return v
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
