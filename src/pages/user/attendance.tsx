// 必要なインポート
import { useState, useEffect } from "react";
import { supabase } from "../../utils/supabaseCliants";
import UserLayout from "../../components/UserLayout";
import { requireUserAuth } from "../../utils/authHelpers";
import { formatToJapanTime } from "../../utils/dateHelpers";
import * as XLSX from "xlsx"; // Excelエクスポートライブラリ

export const getServerSideProps = requireUserAuth;

export default function AttendancePage({
  user,
}: {
  user: { id: string; name: string };
}) {
  const [records, setRecords] = useState<Record<string, any>>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  ); // デフォルトで現在の月 (YYYY-MM)
  const [daysInMonth, setDaysInMonth] = useState<string[]>([]);

  useEffect(() => {
    // 月の日付リストを生成
    const calculateDaysInMonth = () => {
      const [year, month] = selectedMonth.split("-").map(Number);
      const days = new Date(year, month, 0).getDate();
      const dates = Array.from(
        { length: days },
        (_, i) => `${selectedMonth}-${String(i + 1).padStart(2, "0")}`
      );
      setDaysInMonth(dates);
    };

    calculateDaysInMonth();
  }, [selectedMonth]);

  useEffect(() => {
    const fetchAttendanceRecords = async () => {
      try {
        const { data, error } = await supabase
          .from("attendance_records")
          .select("work_date, clock_in, clock_out")
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

        const recordsMap = (data || []).reduce((acc, record) => {
          acc[record.work_date] = record;
          return acc;
        }, {} as Record<string, any>);

        setErrorMessage("");
        setRecords(recordsMap);
      } catch (error) {
        console.error("サーバーエラー:", error);
        setErrorMessage("サーバーエラーが発生しました。");
      }
    };

    fetchAttendanceRecords();
  }, [selectedMonth, user.id]);

  // Excel出力機能
  const exportToExcel = () => {
    const exportData = daysInMonth.map((date) => {
      const record = records[date];
      return {
        日付: date,
        出勤時刻: record?.clock_in ? formatToJapanTime(record.clock_in) : "-",
        退勤時刻: record?.clock_out ? formatToJapanTime(record.clock_out) : "-",
      };
    });

    // ヘッダー行
    const headerData = [
      {
        日付: `対象スタッフ: ${user.name}`,
        出勤時刻: `対象年月: ${selectedMonth}`,
      },
    ];

    // 列見出し
    const columnHeaders = [
      { 日付: "日付", 出勤時刻: "出勤時刻", 退勤時刻: "退勤時刻" },
    ];

    // データを結合
    const fullData = [...headerData, ...columnHeaders, ...exportData];

    // ワークシート作成
    const worksheet = XLSX.utils.json_to_sheet(fullData, { skipHeader: true });

    // ワークブック作成
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Records");

    // ファイル名を生成
    const fileName = `打刻履歴-${user.name}-${selectedMonth.replace(
      "-",
      ""
    )}.xlsx`;

    // ファイルをダウンロード
    XLSX.writeFile(workbook, fileName);
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
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 mb-4"
        >
          Excelに出力
        </button>

        {errorMessage && <p className="text-red-500">{errorMessage}</p>}

        {daysInMonth.length > 0 ? (
          <table className="min-w-full bg-white border border-gray-300">
            <thead>
              <tr>
                <th className="border border-gray-300 px-4 py-2">日付</th>
                <th className="border border-gray-300 px-4 py-2">出勤時刻</th>
                <th className="border border-gray-300 px-4 py-2">退勤時刻</th>
              </tr>
            </thead>
            <tbody>
              {daysInMonth.map((date) => {
                const record = records[date];

                return (
                  <tr key={date}>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      {date}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      {record?.clock_in
                        ? formatToJapanTime(record.clock_in)
                        : "-"}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      {record?.clock_out
                        ? formatToJapanTime(record.clock_out)
                        : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500">選択した月のデータはありません。</p>
        )}
      </div>
    </UserLayout>
  );
}
