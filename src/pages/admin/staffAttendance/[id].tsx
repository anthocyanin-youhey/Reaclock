// src/pages/admin/staffAttendance/[id].tsx

import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { supabase } from "../../../utils/supabaseCliants";
import AdminLayout from "../../../components/AdminLayout";

export default function StaffAttendance() {
  const router = useRouter();
  const { id } = router.query; // スタッフIDを取得
  const [records, setRecords] = useState<any[]>([]);
  const [error, setError] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });
  const [changeLogs, setChangeLogs] = useState<any[]>([]); // 変更ログ
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false); // モーダル状態

  // 打刻履歴を取得
  const fetchRecords = async () => {
    try {
      const { data, error } = await supabase
        .from("attendance_records"
        .select("id, work_date, clock_in, clock_out")
        .eq("user_id", id)
        .gte("work_date", `${selectedMonth}-01`)
        .lte(
          "work_date",
          `${selectedMonth}-${new Date(
            Number(selectedMonth.split("-")[0]),
            Number(selectedMonth.split("-")[1]),
            0
          ).getDate()}`
        )
        .order("work_date", { ascending: false });

      if (error) {
        setError("打刻履歴の取得に失敗しました。");
        console.error(error);
      } else {
        setRecords(
          data.map((record) => ({
            ...record,
            clock_in_hour: record.clock_in
              ? record.clock_in.split(":")[0]
              : "--",
            clock_in_minute: record.clock_in
              ? record.clock_in.split(":")[1]
              : "--",
            clock_out_hour: record.clock_out
              ? record.clock_out.split(":")[0]
              : "--",
            clock_out_minute: record.clock_out
              ? record.clock_out.split(":")[1]
              : "--",
            hasChanges: false, // 初期状態では変更なし
          }))
        );
      }
    } catch (err) {
      console.error("データ取得エラー:", err);
      setError("データ取得中にエラーが発生しました。");
    }
  };

  // 時刻変更ハンドラー
  const handleTimeChange = (recordId: string, field: string, value: string) => {
    setRecords((prev) =>
      prev.map((record) => {
        if (record.id === recordId) {
          const updatedRecord = { ...record, [field]: value };
          updatedRecord.hasChanges =
            updatedRecord.clock_in_hour !== record.clock_in_hour ||
            updatedRecord.clock_in_minute !== record.clock_in_minute ||
            updatedRecord.clock_out_hour !== record.clock_out_hour ||
            updatedRecord.clock_out_minute !== record.clock_out_minute;
          return updatedRecord;
        }
        return record;
      })
    );
  };

  // レコードの保存
  const saveRecord = async (recordId: string, updatedRecord: any) => {
    try {
      const clock_in = `${updatedRecord.clock_in_hour}:${updatedRecord.clock_in_minute}`;
      const clock_out = `${updatedRecord.clock_out_hour}:${updatedRecord.clock_out_minute}`;

      const { data: existingRecord, error: fetchError } = await supabase
        .from("attendance_records")
        .select("clock_in, clock_out, user_id")
        .eq("id", recordId)
        .single();

      if (fetchError) {
        alert("現在のレコード取得に失敗しました。");
        console.error(fetchError);
        return;
      }

      const { data: existingLogs, error: logFetchError } = await supabase
        .from("attendance_change_logs")
        .select("id")
        .eq("attendance_id", recordId)
        .order("changed_at", { ascending: false });

      if (logFetchError) {
        console.error("変更ログの取得に失敗しました:", logFetchError);
        return;
      }

      const changeNumber = existingLogs ? existingLogs.length + 1 : 1;

      const { error: updateError } = await supabase
        .from("attendance_records")
        .update({ clock_in, clock_out })
        .eq("id", recordId);

      if (updateError) {
        alert("レコード更新に失敗しました。");
        console.error(updateError);
        return;
      }

      const { error: logError } = await supabase
        .from("attendance_change_logs")
        .insert({
          attendance_id: recordId,
          user_id: existingRecord.user_id,
          old_clock_in: existingRecord.clock_in,
          new_clock_in: clock_in,
          old_clock_out: existingRecord.clock_out,
          new_clock_out: clock_out,
          changed_by: 1, // 管理者ID（仮に1を設定）
          changed_at: new Date().toISOString(),
          change_number: changeNumber,
        });

      if (logError) {
        console.error("変更ログの保存に失敗しました:", logError);
      } else {
        console.log("変更ログが記録されました。");
      }

      alert("保存が完了しました！");
      fetchRecords();
    } catch (err) {
      console.error("保存エラー:", err);
      alert("保存中にエラーが発生しました。");
    }
  };

  // 変更ログを取得
  const fetchChangeLog = async (recordId: string) => {
    try {
      const { data, error } = await supabase
        .from("attendance_change_logs")
        .select("*")
        .eq("attendance_id", recordId)
        .order("changed_at", { ascending: false });

      if (error) {
        alert("変更ログの取得に失敗しました。");
        console.error(error);
      } else {
        setChangeLogs(data);
        setIsModalOpen(true); // モーダルを表示
      }
    } catch (err) {
      console.error("変更ログ取得エラー:", err);
      alert("変更ログ取得中にエラーが発生しました。");
    }
  };

  useEffect(() => {
    if (id) fetchRecords();
  }, [id, selectedMonth]);

  return (
    <AdminLayout adminName="管理者">
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-4">打刻履歴編集</h1>
        {error && <p className="text-red-500 mb-4">{error}</p>}

        {/* 月選択 */}
        <div className="mb-6">
          <label className="block font-bold mb-2">月を選択</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border px-4 py-2"
          />
        </div>

        {/* 打刻履歴テーブル */}
        <table className="w-full bg-white border-collapse border border-gray-300">
          <thead>
            <tr>
              <th className="border border-gray-300 px-4 py-2">勤務日</th>
              <th className="border border-gray-300 px-4 py-2">出勤時間</th>
              <th className="border border-gray-300 px-4 py-2">退勤時間</th>
              <th className="border border-gray-300 px-4 py-2">保存・ログ</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id}>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {record.work_date}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  <div className="flex justify-center space-x-2">
                    <select
                      value={record.clock_in_hour}
                      onChange={(e) =>
                        handleTimeChange(
                          record.id,
                          "clock_in_hour",
                          e.target.value
                        )
                      }
                      className="border px-2 py-1"
                    >
                      {Array.from({ length: 24 }, (_, hour) => (
                        <option
                          key={hour}
                          value={String(hour).padStart(2, "0")}
                        >
                          {String(hour).padStart(2, "0")}
                        </option>
                      ))}
                    </select>
                    <span>:</span>
                    <select
                      value={record.clock_in_minute}
                      onChange={(e) =>
                        handleTimeChange(
                          record.id,
                          "clock_in_minute",
                          e.target.value
                        )
                      }
                      className="border px-2 py-1"
                    >
                      {Array.from({ length: 60 }, (_, minute) => (
                        <option
                          key={minute}
                          value={String(minute).padStart(2, "0")}
                        >
                          {String(minute).padStart(2, "0")}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  <div className="flex justify-center space-x-2">
                    <select
                      value={record.clock_out_hour}
                      onChange={(e) =>
                        handleTimeChange(
                          record.id,
                          "clock_out_hour",
                          e.target.value
                        )
                      }
                      className="border px-2 py-1"
                    >
                      {Array.from({ length: 24 }, (_, hour) => (
                        <option
                          key={hour}
                          value={String(hour).padStart(2, "0")}
                        >
                          {String(hour).padStart(2, "0")}
                        </option>
                      ))}
                    </select>
                    <span>:</span>
                    <select
                      value={record.clock_out_minute}
                      onChange={(e) =>
                        handleTimeChange(
                          record.id,
                          "clock_out_minute",
                          e.target.value
                        )
                      }
                      className="border px-2 py-1"
                    >
                      {Array.from({ length: 60 }, (_, minute) => (
                        <option
                          key={minute}
                          value={String(minute).padStart(2, "0")}
                        >
                          {String(minute).padStart(2, "0")}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  <button
                    onClick={() =>
                      saveRecord(record.id, {
                        clock_in_hour: record.clock_in_hour,
                        clock_in_minute: record.clock_in_minute,
                        clock_out_hour: record.clock_out_hour,
                        clock_out_minute: record.clock_out_minute,
                      })
                    }
                    disabled={!record.hasChanges} // 変更がない場合は無効化
                    className={`px-4 py-2 rounded ${
                      record.hasChanges
                        ? "bg-blue-500 text-white hover:bg-blue-600"
                        : "bg-gray-300 text-gray-700 cursor-not-allowed"
                    }`}
                  >
                    保存
                  </button>
                  <button
                    onClick={() => fetchChangeLog(record.id)}
                    className="ml-2 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    変更ログ
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* モーダルウィンドウ */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-md w-3/4 max-w-lg relative">
            <h2 className="text-xl font-bold mb-4">変更ログ</h2>
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 bg-red-500 text-white rounded-full p-2 hover:bg-red-700"
            >
              ✕
            </button>
            {changeLogs.length > 0 ? (
              <ul>
                {changeLogs.map((log) => (
                  <li key={log.id} className="mb-2">
                    <p>
                      <strong>変更番号:</strong> {log.change_number}
                    </p>
                    <p>
                      <strong>変更日時:</strong>{" "}
                      {new Date(log.changed_at).toLocaleString()}
                    </p>
                    <p>
                      <strong>出勤時刻:</strong> {log.old_clock_in || "なし"} →{" "}
                      {log.new_clock_in || "なし"}
                    </p>
                    <p>
                      <strong>退勤時刻:</strong> {log.old_clock_out || "なし"} →{" "}
                      {log.new_clock_out || "なし"}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p>変更ログが見つかりません。</p>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
