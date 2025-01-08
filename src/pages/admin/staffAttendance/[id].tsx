import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { supabase } from "../../../utils/supabaseCliants";
import AdminLayout from "../../../components/AdminLayout";
import { requireAdminAuth } from "../../../utils/authHelpers";

export const getServerSideProps = requireAdminAuth;

export default function StaffAttendance({
  admin,
}: {
  admin: { name: string; id: number };
}) {
  const router = useRouter();
  const { id } = router.query; // スタッフID
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

  const hourOptions = Array.from({ length: 24 }, (_, i) =>
    String(i).padStart(2, "0")
  ); // 時間選択肢
  const minuteOptions = Array.from({ length: 60 }, (_, i) =>
    String(i).padStart(2, "0")
  ); // 分選択肢

  // 打刻履歴を取得
  const fetchRecords = async () => {
    try {
      const firstDay = `${selectedMonth}-01`;
      const lastDay = `${selectedMonth}-${new Date(
        parseInt(selectedMonth.split("-")[0]),
        parseInt(selectedMonth.split("-")[1]),
        0
      ).getDate()}`;

      const { data, error } = await supabase
        .from("attendance_records")
        .select("id, work_date, clock_in, clock_out")
        .eq("user_id", id)
        .gte("work_date", firstDay)
        .lte("work_date", lastDay)
        .order("work_date", { ascending: true });

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
            hasChanges: false,
          }))
        );
      }
    } catch (err) {
      console.error("データ取得エラー:", err);
      setError("データ取得中にエラーが発生しました。");
    }
  };

  // 保存処理
  const saveRecord = async (record: any) => {
    const {
      id: recordId,
      clock_in_hour,
      clock_in_minute,
      clock_out_hour,
      clock_out_minute,
    } = record;

    const clock_in = `${clock_in_hour}:${clock_in_minute}`;
    const clock_out = `${clock_out_hour}:${clock_out_minute}`;

    try {
      // 現在のレコードを取得
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

      // レコードを更新
      const { error: updateError } = await supabase
        .from("attendance_records")
        .update({ clock_in, clock_out })
        .eq("id", recordId);

      if (updateError) {
        alert("レコード更新に失敗しました。");
        console.error(updateError);
        return;
      }

      // 変更ログ番号の取得
      const { count: logCount, error: logCountError } = await supabase
        .from("attendance_change_logs")
        .select("id", { count: "exact" })
        .eq("attendance_id", recordId);

      if (logCountError) {
        console.error("ログ番号取得エラー:", logCountError);
      }

      const changeNumber = (logCount || 0) + 1; // 初回の場合は1

      // 現在の日本時間
      const changedAt = new Date().toLocaleString("ja-JP", {
        timeZone: "Asia/Tokyo",
      });

      // 変更ログの保存
      const { error: logError } = await supabase
        .from("attendance_change_logs")
        .insert({
          attendance_id: recordId,
          user_id: existingRecord.user_id,
          old_clock_in: existingRecord.clock_in,
          new_clock_in: clock_in,
          old_clock_out: existingRecord.clock_out,
          new_clock_out: clock_out,
          changed_by: admin.id, // 管理者ID
          changed_at: changedAt, // 日本時間の変更日時
          change_number: changeNumber, // ログ番号
        });

      if (logError) {
        console.error("変更ログ保存エラー:", logError);
      } else {
        console.log("変更ログが記録されました。");
      }

      alert("保存が完了しました！");
      fetchRecords(); // データを再取得
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
        .order("change_number", { ascending: true });

      if (error) {
        alert("変更ログの取得に失敗しました。");
        console.error(error);
      } else {
        setChangeLogs(
          data.map((log) => ({
            ...log,
            changed_at: new Date(log.changed_at).toLocaleString("ja-JP", {
              timeZone: "Asia/Tokyo",
            }),
          }))
        );
        setIsModalOpen(true); // モーダルを表示
      }
    } catch (err) {
      console.error("変更ログ取得エラー:", err);
      alert("変更ログ取得中にエラーが発生しました。");
    }
  };

  // 変更ログの削除
  const deleteChangeLog = async (logId: string) => {
    try {
      const { error } = await supabase
        .from("attendance_change_logs")
        .delete()
        .eq("id", logId);

      if (error) {
        alert("変更ログの削除に失敗しました。");
        console.error(error);
      } else {
        alert("変更ログを削除しました！");
        setChangeLogs((prev) => prev.filter((log) => log.id !== logId));
      }
    } catch (err) {
      console.error("削除エラー:", err);
      alert("削除中にエラーが発生しました。");
    }
  };

  // プルダウンでの時刻変更ハンドラー
  const handleTimeChange = (recordId: string, field: string, value: string) => {
    setRecords((prev) =>
      prev.map((record) =>
        record.id === recordId
          ? {
              ...record,
              [field]: value,
              hasChanges: true, // 変更があったフラグをセット
            }
          : record
      )
    );
  };

  useEffect(() => {
    if (id) fetchRecords();
  }, [id, selectedMonth]);

  return (
    <AdminLayout adminName={admin.name}>
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
              <th className="border border-gray-300 px-4 py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id}>
                {/* 勤務日 */}
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {record.work_date}
                </td>
                {/* 出勤時間 */}
                <td className="border border-gray-300 px-4 py-2 text-center">
                  <div className="flex justify-center">
                    <select
                      value={record.clock_in_hour}
                      onChange={(e) =>
                        handleTimeChange(
                          record.id,
                          "clock_in_hour",
                          e.target.value
                        )
                      }
                      className="border rounded px-2 py-1 mr-2"
                    >
                      {hourOptions.map((hour) => (
                        <option key={hour} value={hour}>
                          {hour}
                        </option>
                      ))}
                    </select>
                    <select
                      value={record.clock_in_minute}
                      onChange={(e) =>
                        handleTimeChange(
                          record.id,
                          "clock_in_minute",
                          e.target.value
                        )
                      }
                      className="border rounded px-2 py-1"
                    >
                      {minuteOptions.map((minute) => (
                        <option key={minute} value={minute}>
                          {minute}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                {/* 退勤時間 */}
                <td className="border border-gray-300 px-4 py-2 text-center">
                  <div className="flex justify-center">
                    <select
                      value={record.clock_out_hour}
                      onChange={(e) =>
                        handleTimeChange(
                          record.id,
                          "clock_out_hour",
                          e.target.value
                        )
                      }
                      className="border rounded px-2 py-1 mr-2"
                    >
                      {hourOptions.map((hour) => (
                        <option key={hour} value={hour}>
                          {hour}
                        </option>
                      ))}
                    </select>
                    <select
                      value={record.clock_out_minute}
                      onChange={(e) =>
                        handleTimeChange(
                          record.id,
                          "clock_out_minute",
                          e.target.value
                        )
                      }
                      className="border rounded px-2 py-1"
                    >
                      {minuteOptions.map((minute) => (
                        <option key={minute} value={minute}>
                          {minute}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                {/* 操作ボタン */}
                <td className="border border-gray-300 px-4 py-2 text-center">
                  <button
                    onClick={() => saveRecord(record)}
                    disabled={!record.hasChanges}
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
                  <li key={log.id} className="mb-2 border-b pb-2">
                    <p>
                      <strong>変更番号:</strong> {log.change_number}
                    </p>
                    <p>
                      <strong>変更日時:</strong> {log.changed_at}
                    </p>
                    <p>
                      <strong>出勤時刻:</strong> {log.old_clock_in || "--"} →{" "}
                      {log.new_clock_in || "--"}
                    </p>
                    <p>
                      <strong>退勤時刻:</strong> {log.old_clock_out || "--"} →{" "}
                      {log.new_clock_out || "--"}
                    </p>
                    <button
                      onClick={() => deleteChangeLog(log.id)}
                      className="mt-2 bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600"
                    >
                      削除
                    </button>
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
