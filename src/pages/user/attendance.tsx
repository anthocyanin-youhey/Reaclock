// src/pages/user/attendance.tsx
import { useState, useEffect } from "react";
import { supabase } from "../../utils/supabaseCliants";
import UserLayout from "../../components/UserLayout"; // ユーザー用共通レイアウト
import { requireUserAuth } from "../../utils/authHelpers"; // サーバーサイド認証チェック
import * as XLSX from "xlsx"; // Excelエクスポート用ライブラリ

export const getServerSideProps = requireUserAuth;

export default function AttendancePage({
  user,
}: {
  user: { id: string; name: string };
}) {
  const [records, setRecords] = useState<any[]>([]); // 打刻履歴データ
  const [errorMessage, setErrorMessage] = useState(""); // エラーメッセージ
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  ); // 現在の年月 (YYYY-MM)
  const [daysInMonth, setDaysInMonth] = useState<number[]>([]); // 月の日付リスト

  useEffect(() => {
    // 月の日数を生成
    const generateDaysInMonth = () => {
      const [year, month] = selectedMonth.split("-").map(Number);
      const days = new Date(year, month, 0).getDate();
      setDaysInMonth(Array.from({ length: days }, (_, i) => i + 1));
    };

    const fetchAttendanceRecords = async () => {
      try {
        const { data, error } = await supabase
          .from("attendance_records")
          .select("*")
          .eq("user_id", user.id)
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
          console.error("データ取得エラー:", error);
          setErrorMessage("データ取得に失敗しました。");
          return;
        }

        setErrorMessage("");
        setRecords(data || []);
      } catch (error) {
        console.error("サーバーエラー:", error);
        setErrorMessage("サーバーエラーが発生しました。");
      }
    };

    generateDaysInMonth();
    fetchAttendanceRecords();
  }, [selectedMonth, user.id]);

  // Excel出力機能
  const exportToExcel = () => {
    const exportData = daysInMonth.map((day) => {
      const date = `${selectedMonth}-${String(day).padStart(2, "0")}`;
      const record = records.find((item) => item.work_date === date) || {
        clock_in: "-",
        clock_out: "-",
      };
      return {
        日付: date,
        出勤時間: record.clock_in || "-",
        退勤時間: record.clock_out || "-",
      };
    });

    // 対象スタッフ名と対象年月をヘッダーに追加
    const headerData = [
      {
        日付: `対象スタッフ: ${user.name}`,
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
    XLSX.writeFile(wb, `attendance_records_${selectedMonth}_${user.name}.xlsx`);
  };

  return (
    <UserLayout userName={user.name}>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-4">打刻履歴</h1>

        <div className="mb-4">
          <label htmlFor="month" className="font-bold mr-2">
            月を選択:
          </label>
          <input
            type="month"
            id="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1"
          />
        </div>

        <button
          onClick={exportToExcel}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mb-4"
        >
          Excelに出力
        </button>

        {errorMessage && <p className="text-red-500">{errorMessage}</p>}

        {records.length > 0 || daysInMonth.length > 0 ? (
          <table className="min-w-full bg-white border border-gray-300 mb-4">
            <thead>
              <tr>
                <th className="border border-gray-300 px-4 py-2">日付</th>
                <th className="border border-gray-300 px-4 py-2">出勤時刻</th>
                <th className="border border-gray-300 px-4 py-2">退勤時刻</th>
              </tr>
            </thead>
            <tbody>
              {daysInMonth.map((day) => {
                const date = `${selectedMonth}-${String(day).padStart(2, "0")}`;
                const record =
                  records.find((item) => item.work_date === date) || {};
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
        ) : (
          <p className="text-gray-500">選択した月の打刻記録はありません。</p>
        )}
      </div>
    </UserLayout>
  );
}
