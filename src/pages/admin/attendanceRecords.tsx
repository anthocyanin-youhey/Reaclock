// src/pages/admin/attendanceRecords.tsx

import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabaseCliants";
import AdminLayout from "../../components/AdminLayout";
import { requireAdminAuth } from "../../utils/authHelpers";
import { formatToJapanTime } from "../../utils/dateHelpers";
import * as XLSX from "xlsx"; // Excel出力用

export const getServerSideProps = requireAdminAuth;

export default function AttendanceRecords({
  admin,
}: {
  admin: { name: string };
}) {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedStaffName, setSelectedStaffName] = useState<string>("不明");
  const [attendanceAndShiftData, setAttendanceAndShiftData] = useState<any[]>(
    []
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });
  const [error, setError] = useState<string>("");

  const generateCalendarDays = (month: string) => {
    const [year, monthIndex] = month.split("-").map(Number);
    const daysInMonth = new Date(year, monthIndex, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };

  const fetchStaffList = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, employee_number")
        .order("employee_number", { ascending: true });

      if (error) {
        setError("スタッフ情報の取得に失敗しました。");
        console.error("スタッフ情報取得エラー:", error);
      } else {
        setStaffList(data || []);
      }
    } catch (err) {
      console.error("スタッフ情報取得エラー:", err);
      setError("データ取得中にエラーが発生しました。");
    }
  };

  const fetchAttendanceAndShiftData = async (staffId: string) => {
    try {
      const { data, error } = await supabase
        .from("attendance_records")
        .select(
          `
          work_date,
          clock_in,
          clock_out,
          shifts!left (
            start_time,
            end_time,
            hourly_rate,
            work_data!fk_shifts_work_data (
              work_location
            )
          )
        `
        )
        .eq("user_id", staffId)
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
        setError("データの取得に失敗しました。");
        console.error("勤怠データ取得エラー:", error);
      } else {
        setAttendanceAndShiftData(data || []);
      }
    } catch (err) {
      console.error("データ取得エラー:", err);
      setError("データ取得中にエラーが発生しました。");
    }
  };

  const handleStaffSelection = (staffId: string) => {
    setSelectedStaffId(staffId);
    const selectedStaff = staffList.find(
      (staff) => staff.id === parseInt(staffId)
    );
    setSelectedStaffName(selectedStaff ? selectedStaff.name : "不明");
  };

  const calculateDailyPay = (record: any) => {
    if (!record.clock_in || !record.clock_out) return "-";

    const shift = record.shifts || {};
    const hourlyRate = shift.hourly_rate;
    if (!hourlyRate) return "-";

    const startTime = new Date(`1970-01-01T${shift.start_time}`);
    const endTime = new Date(`1970-01-01T${shift.end_time}`);
    let clockIn = new Date(`1970-01-01T${record.clock_in}`);
    let clockOut = new Date(`1970-01-01T${record.clock_out}`);

    // 出勤打刻がシフト開始時間より早い場合はシフト開始時間を使用
    if (clockIn < startTime) {
      clockIn = startTime;
    }

    // 遅刻を判定し、15分刻みで調整
    if (clockIn > startTime) {
      const diffMinutes =
        Math.ceil(
          (clockIn.getTime() - startTime.getTime()) / (15 * 60 * 1000)
        ) * 15;
      clockIn = new Date(startTime.getTime() + diffMinutes * 60 * 1000);
    }

    // 退勤打刻がシフト終了時間より遅い場合はシフト終了時間を使用
    if (clockOut > endTime) {
      clockOut = endTime;
    }

    // 労働時間の計算
    const workedHours =
      (clockOut.getTime() - clockIn.getTime()) / (60 * 60 * 1000);
    if (workedHours <= 0) return "-";

    // 日給を計算
    const dailyPay = workedHours * hourlyRate;
    return `${Math.floor(dailyPay)}円`;
  };

  const exportToExcel = () => {
    if (!attendanceAndShiftData.length || !selectedStaffId) {
      alert("エクスポートするデータがありません。");
      return;
    }

    const workbook = XLSX.utils.book_new();
    const sheetData = [];

    sheetData.push([`スタッフ名: ${selectedStaffName}`]);
    sheetData.push([`取得年月: ${selectedMonth}`]);
    sheetData.push([]);
    sheetData.push([
      "日付",
      "シフト開始",
      "シフト終了",
      "勤務地",
      "時給",
      "出勤打刻",
      "退勤打刻",
      "日給",
    ]);

    attendanceAndShiftData.forEach((record: any) => {
      const shift = record.shifts || {};
      const workData = shift.work_data || {};

      sheetData.push([
        record.work_date || "-",
        shift.start_time || "-",
        shift.end_time || "-",
        workData.work_location || "-",
        shift.hourly_rate || "-",
        formatToJapanTime(record.clock_in) || "-",
        formatToJapanTime(record.clock_out) || "-",
        calculateDailyPay(record),
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "勤務履歴");

    const fileName = `${selectedStaffName}-${selectedMonth.replace(
      "-",
      ""
    )}-勤務履歴.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const days = generateCalendarDays(selectedMonth);

  useEffect(() => {
    fetchStaffList();
  }, []);

  useEffect(() => {
    if (selectedStaffId) {
      fetchAttendanceAndShiftData(selectedStaffId);
    }
  }, [selectedStaffId, selectedMonth]);

  return (
    <AdminLayout adminName={admin.name}>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">打刻履歴と勤務データ</h1>
        {error && <p className="text-red-500 mb-4">{error}</p>}

        <div className="mb-6">
          <label className="block font-bold mb-2">スタッフを選択</label>
          <select
            onChange={(e) => handleStaffSelection(e.target.value)}
            value={selectedStaffId || ""}
            className="border px-4 py-2 w-full sm:w-auto"
          >
            <option value="" disabled>
              スタッフを選択してください
            </option>
            {staffList.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.employee_number} - {staff.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="block font-bold mb-2">月を選択</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border px-4 py-2 w-full sm:w-auto"
          />
        </div>

        <button
          onClick={exportToExcel}
          className="mb-6 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Excelにエクスポート
        </button>

        {selectedStaffId && (
          <table className="w-full bg-white border-collapse border border-gray-300">
            <thead>
              <tr>
                <th className="border border-gray-300 px-4 py-2">日付</th>
                <th className="border border-gray-300 px-4 py-2">シフト開始</th>
                <th className="border border-gray-300 px-4 py-2">シフト終了</th>
                <th className="border border-gray-300 px-4 py-2">勤務地</th>
                <th className="border border-gray-300 px-4 py-2">時給</th>
                <th className="border border-gray-300 px-4 py-2">出勤打刻</th>
                <th className="border border-gray-300 px-4 py-2">退勤打刻</th>
                <th className="border border-gray-300 px-4 py-2">日給</th>
              </tr>
            </thead>
            <tbody>
              {days.map((day) => {
                const date = `${selectedMonth}-${String(day).padStart(2, "0")}`;
                const record =
                  attendanceAndShiftData.find(
                    (item) => item.work_date === date
                  ) || {};
                const shift = record.shifts || {};
                const workData = shift.work_data || {};

                const isAttendanceMissing =
                  shift.start_time && (!record.clock_in || !record.clock_out);

                return (
                  <tr
                    key={day}
                    className={isAttendanceMissing ? "bg-red-100" : ""}
                  >
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      {date}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      {shift.start_time || "-"}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      {shift.end_time || "-"}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      {workData.work_location || "-"}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      {shift.hourly_rate || "-"}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      {formatToJapanTime(record.clock_in) || "-"}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      {formatToJapanTime(record.clock_out) || "-"}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      {calculateDailyPay(record)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
