// src/pages/user/attendance.tsx
import { useState, useEffect } from "react";
import { supabase } from "../../utils/supabaseCliants";
import UserLayout from "../../components/UserLayout"; // ユーザー用共通レイアウト
import { requireUserAuth } from "../../utils/authHelpers"; // サーバーサイド認証チェック

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

  useEffect(() => {
    const fetchAttendanceRecords = async () => {
      try {
        const { data, error } = await supabase
          .from("attendance_records")
          .select("*")
          .eq("user_id", user.id)
          .gte("work_date", `${selectedMonth}-01`)
          .lt("work_date", `${selectedMonth}-31`) // 選択した月の範囲を指定
          .order("work_date", { ascending: true });

        if (error) {
          console.error("データ取得エラー:", error);
          setErrorMessage("データ取得に失敗しました。");
          return;
        }

        // データ取得成功時にエラーメッセージをクリア
        setErrorMessage("");
        setRecords(data || []);
      } catch (error) {
        console.error("サーバーエラー:", error);
        setErrorMessage("サーバーエラーが発生しました。");
      }
    };

    fetchAttendanceRecords();
  }, [selectedMonth, user.id]);

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
        {errorMessage && <p className="text-red-500">{errorMessage}</p>}
        {records.length > 0 ? (
          <table className="min-w-full bg-white border border-gray-300">
            <thead>
              <tr>
                <th className="border border-gray-300 px-4 py-2">日付</th>
                <th className="border border-gray-300 px-4 py-2">出勤時刻</th>
                <th className="border border-gray-300 px-4 py-2">退勤時刻</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td className="border border-gray-300 px-4 py-2">
                    {record.work_date}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {record.clock_in || "未記録"}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {record.clock_out || "未記録"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500">選択した月の打刻記録はありません。</p>
        )}
      </div>
    </UserLayout>
  );
}
