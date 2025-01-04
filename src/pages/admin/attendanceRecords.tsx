// reaclock/src/pages/admin/attendanceRecords.tsx
import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabaseCliants";
import AdminLayout from "../../components/AdminLayout";
import * as XLSX from "xlsx"; // Excelエクスポート用ライブラリ

import { requireAdminAuth } from "../../utils/authHelpers";

export const getServerSideProps = requireAdminAuth;

export default function AttendanceRecords({
  admin,
}: {
  admin: { name: string };
}) {
  const [staffList, setStaffList] = useState<any[]>([]); // 全スタッフ情報
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null); // 選択されたスタッフID
  const [selectedStaffName, setSelectedStaffName] = useState<string>(""); // 選択されたスタッフ名
  const [attendanceData, setAttendanceData] = useState<any[]>([]); // 打刻データ
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });
  const [error, setError] = useState<string>("");

  // カレンダーの日付を生成
  const generateCalendarDays = (month: string) => {
    const [year, monthIndex] = month.split("-").map(Number);
    const daysInMonth = new Date(year, monthIndex, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };

  // スタッフリストを取得
  const fetchStaffList = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, employee_number")
        .order("employee_number", { ascending: true });

      if (error) {
        setError("スタッフ情報の取得に失敗しました。");
        console.error(error);
      } else {
        setStaffList(data || []);
      }
    } catch (err) {
      console.error("スタッフ情報取得エラー:", err);
      setError("データ取得中にエラーが発生しました。");
    }
  };

  // 選択されたスタッフの打刻データを取得
  const fetchAttendanceData = async (staffId: string) => {
    try {
      const { data, error } = await supabase
        .from("attendance_records")
        .select("work_date, clock_in, clock_out") // 必要なカラムのみ取得
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
        setError("打刻履歴の取得に失敗しました。");
        console.error(error);
      } else {
        setAttendanceData(data || []);

        // 選択されたスタッフの名前を取得
        const selectedStaff = staffList.find(
          (staff) => staff.id === parseInt(staffId)
        );
        setSelectedStaffName(selectedStaff ? selectedStaff.name : "不明");
      }
    } catch (err) {
      console.error("データ取得エラー:", err);
      setError("データ取得中にエラーが発生しました。");
    }
  };

  // スタッフ選択時の処理
  const handleStaffSelection = (staffId: string) => {
    setSelectedStaffId(staffId);
    const selectedStaff = staffList.find(
      (staff) => staff.id === parseInt(staffId)
    );
    setSelectedStaffName(selectedStaff ? selectedStaff.name : "不明");
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

    // 対象スタッフ名と対象年月をヘッダーに追加
    const headerData = [
      {
        日付: `対象スタッフ: ${selectedStaffName}`,
        出勤時間: "",
        退勤時間: "",
      },
      { 日付: `対象年月: ${selectedMonth}`, 出勤時間: "", 退勤時間: "" },
      {}, // 空行
    ];

    // ヘッダー行を結合
    const fullData = [...headerData, ...exportData];

    // ワークシート作成
    const ws = XLSX.utils.json_to_sheet(fullData);

    // ワークブック作成とダウンロード
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Records");
    XLSX.writeFile(
      wb,
      `attendance_records_${selectedMonth}_${selectedStaffName}.xlsx`
    );
  };

  useEffect(() => {
    fetchStaffList();
  }, []);

  useEffect(() => {
    if (selectedStaffId) {
      fetchAttendanceData(selectedStaffId);
    }
  }, [selectedStaffId, selectedMonth]);

  const days = generateCalendarDays(selectedMonth);

  return (
    <AdminLayout adminName={admin.name}>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">打刻履歴</h1>
        {error && <p className="text-red-500 mb-4">{error}</p>}

        {/* スタッフ選択 */}
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
          disabled={!selectedStaffId}
          className={`mb-6 px-4 py-2 rounded ${
            selectedStaffId
              ? "bg-green-500 text-white hover:bg-green-600"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          Excelに出力
        </button>

        {/* カレンダー表示 */}
        {selectedStaffId && (
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
        )}
      </div>
    </AdminLayout>
  );
}
