// src/pages/admin/attendanceCalendar.tsx

import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabaseCliants";
import AdminLayout from "../../components/AdminLayout";
import * as XLSX from "xlsx"; // Excelエクスポート用ライブラリ

export default function AttendanceCalendar() {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [error, setError] = useState<string>("");

  // カレンダーの日付を生成
  const generateCalendarDays = (month: string) => {
    const [year, monthIndex] = month.split("-").map(Number);
    const daysInMonth = new Date(year, monthIndex, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };

  // Supabaseから打刻データを取得
  const fetchAttendanceData = async () => {
    try {
      const { data, error } = await supabase
        .from("attendance_records")
        .select("work_date, clock_in, clock_out")
        .gte("work_date", `${selectedMonth}-01`)
        .lte(
          "work_date",
          `${selectedMonth}-${new Date(
            Number(selectedMonth.split("-")[0]),
            Number(selectedMonth.split("-")[1]),
            0
          ).getDate()}`
        )
        .order("work_date", { ascending: true });

      if (error) {
        setError("打刻履歴の取得に失敗しました。");
        console.error(error);
      } else {
        setAttendanceData(data || []);
      }
    } catch (err) {
      console.error("データ取得エラー:", err);
      setError("データ取得中にエラーが発生しました。");
    }
  };

  // Excel出力機能
  const exportToExcel = () => {
    const days = generateCalendarDays(selectedMonth);
    const exportData = days.map((day) => {
      const date = `${selectedMonth}-${String(day).padStart(2, "0")}`;
      const record = attendanceData.find((item) => item.work_date === date) || {
        clock_in: "-",
        clock_out: "-",
      };
      return {
        日付: date,
        出勤時間: record.clock_in,
        退勤時間: record.clock_out,
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Records");
    XLSX.writeFile(wb, `attendance_calendar_${selectedMonth}.xlsx`);
  };

  useEffect(() => {
    fetchAttendanceData();
  }, [selectedMonth]);

  const days = generateCalendarDays(selectedMonth);

  return (
    <AdminLayout adminName="管理者">
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">打刻履歴カレンダー</h1>
        {error && <p className="text-red-500 mb-4">{error}</p>}

        {/* 月選択 */}
        <div className="mb-6">
          <label className="block font-bold mb-2">月を選択</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border px-4 py-2 w-full sm:w-auto"
          />
        </div>

        {/* Excel出力ボタン */}
        <button
          onClick={exportToExcel}
          className="mb-6 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Excelに出力
        </button>

        {/* カレンダー表示 */}
        <table className="w-full bg-white border-collapse border border-gray-300">
          <thead>
            <tr>
              <th className="border border-gray-300 px-4 py-2">日付</th>
              <th className="border border-gray-300 px-4 py-2">出勤時間</th>
              <th className="border border-gray-300 px-4 py-2">退勤時間</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => {
              const date = `${selectedMonth}-${String(day).padStart(2, "0")}`;
              const record =
                attendanceData.find((item) => item.work_date === date) || {};
              return (
                <tr key={day}>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    {date}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    {record.clock_in || "-"}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    {record.clock_out || "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
