"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const id = studentId.trim();
    if (!id) return;
    router.push(`/student/${encodeURIComponent(id)}`);
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto mt-16 max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Weekly Report</h1>
        <p className="mt-2 text-sm text-slate-600">
          กรอกรหัสนิสิตเพื่อเข้าสู่หน้าหลักและดู/กรอกแบบฟอร์มรายสัปดาห์
        </p>

        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            inputMode="numeric"
            placeholder="รหัสนิสิต"
            className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
          />
          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-5 py-3 font-medium text-white"
          >
            เข้าหน้าหลัก
          </button>
        </form>
      </div>
    </div>
  );
}
