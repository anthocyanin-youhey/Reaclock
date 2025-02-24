//\reaclock\src\pages\admin\attendanceStatus.tsx
import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabaseCliants";
import AdminLayout from "../../components/AdminLayout";
import { requireAdminAuth } from "../../utils/authHelpers";
import { formatToJapanTime } from "../../utils/dateHelpers";
import { useLateCount } from "../../context/LateCountContext";

export const getServerSideProps = requireAdminAuth;

type AttendanceRecord = {
  id: number;
  work_date: string;
  clock_in?: string;
  status?: string;
  users: {
    name: string;
    employee_number: string;
  };
  shifts: {
    start_time: string;
    user_hourly_rates: {
      work_data: {
        location_name: string;
      };
    };
  };
};

export default function AttendanceStatus({
  admin,
}: {
  admin: { name: string };
}) {
  const [lateComers, setLateComers] = useState<AttendanceRecord[]>([]);
  const [error, setError] = useState<string>("");
  const [todayDate, setTodayDate] = useState<string>(""); // ✅ useStateで定義
  const { setLateCount } = useLateCount();

  // ✅ 日本時間の日付を取得
  const getJapanDate = () => {
    const formatter = new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = formatter.formatToParts(new Date());
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const date = getJapanDate();
    setTodayDate(date); // ✅ 日付をセット
    fetchTodayLateComers(date); // ✅ 日付を渡して取得
  }, []);

  // ✅ 今日の遅刻者取得関数をtodayDate引数化
  const fetchTodayLateComers = async (date: string) => {
    if (!date) {
      console.error("日付が未定義です。");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("attendance_records")
        .select(
          `
    id,
    work_date,
    clock_in,
    status,
    users!inner (
      name,
      employee_number
    ),
    shifts!fk_attendance_records_shift (
      start_time,
      work_data!inner (
        location_name
      )
    )
    `
        )
        .eq("work_date", date)
        .order("clock_in", { ascending: true });

      if (error) {
        setError("データの取得に失敗しました。");
        console.error("Supabaseエラー:", error);
        return;
      }

      console.log("取得したデータ:", data);

      const formattedData: AttendanceRecord[] = (data || []).map(
        (record: any) => ({
          id: record.id,
          work_date: record.work_date,
          clock_in: record.clock_in,
          status: record.status || "未対応",
          users: record.users,
          shifts: {
            start_time: record.shifts?.start_time || "-",
            user_hourly_rates: {
              work_data: {
                location_name: record.shifts?.work_data?.location_name || "-",
              },
            },
          },
        })
      );
      setLateComers(formattedData);
    } catch (err) {
      console.error("データ取得エラー:", err);
      setError("データ取得中にエラーが発生しました。");
    }
  };

  // 遅刻者を「対応済み」に変更する関数
  const handleResolve = async (id: number) => {
    try {
      const { error } = await supabase
        .from("attendance_records")
        .update({ status: "対応済み" }) // 対応済みに更新
        .eq("id", id);

      if (error) {
        console.error("対応済みへの変更に失敗しました:", error);
        setError("対応済みへの変更に失敗しました。");
        return;
      }

      const updatedLateComers = lateComers.map((record) =>
        record.id === id ? { ...record, status: "対応済み" } : record
      );
      setLateComers(updatedLateComers);

      // 未対応件数を更新
      const unresolvedCount = updatedLateComers.filter(
        (record) => record.status === "未対応"
      ).length;
      setLateCount(unresolvedCount);
    } catch (err) {
      console.error("対応済みへの変更エラー:", err);
      setError("対応済みへの変更中にエラーが発生しました。");
    }
  };

  // 遅刻者を「未対応」に戻す関数
  const handleUnresolve = async (id: number) => {
    try {
      const { error } = await supabase
        .from("attendance_records")
        .update({ status: "未対応" }) // 未対応に戻す
        .eq("id", id);

      if (error) {
        console.error("未対応への変更に失敗しました:", error);
        setError("未対応への変更に失敗しました。");
        return;
      }

      const updatedLateComers = lateComers.map((record) =>
        record.id === id ? { ...record, status: "未対応" } : record
      );
      setLateComers(updatedLateComers);

      // 未対応件数を更新
      const unresolvedCount = updatedLateComers.filter(
        (record) => record.status === "未対応"
      ).length;
      setLateCount(unresolvedCount);
    } catch (err) {
      console.error("未対応への変更エラー:", err);
      setError("未対応への変更中にエラーが発生しました。");
    }
  };

  useEffect(() => {
    const date = getJapanDate();
    setTodayDate(date); // ✅ ステートに日付を設定
  }, []);

  useEffect(() => {
    if (todayDate) {
      fetchTodayLateComers(todayDate); // ✅ todayDateを引数として渡す
    }
  }, [todayDate]);

  return (
    <AdminLayout adminName={admin.name}>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">遅刻ステータス確認</h1>
        {error && <p className="text-red-500">{error}</p>}

        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold">
            {todayDate || "日付を取得中..."} {/* ✅ ローディング対応 */}
          </h2>
        </div>

        <h2 className="text-xl font-bold mb-4">今日の遅刻者一覧</h2>
        {lateComers.length > 0 ? (
          <table className="table-auto w-full bg-white border border-gray-300">
            <thead>
              <tr>
                <th className="border px-4 py-2">社員番号</th>
                <th className="border px-4 py-2">名前</th>
                <th className="border px-4 py-2">シフト開始</th>
                <th className="border px-4 py-2">勤務地</th>{" "}
                {/* ✅ 追加：勤務地 */}
                <th className="border px-4 py-2">出勤打刻</th>
                <th className="border px-4 py-2">遅刻時間</th>
                <th className="border px-4 py-2">状態</th>
                <th className="border px-4 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {lateComers.map((record) => {
                const shiftStart = record.shifts.start_time
                  ? new Date(`1970-01-01T${record.shifts.start_time}Z`)
                  : null;
                const clockIn = record.clock_in
                  ? new Date(`1970-01-01T${record.clock_in}Z`)
                  : null;
                const lateMinutes =
                  shiftStart && clockIn
                    ? Math.floor(
                        (clockIn.getTime() - shiftStart.getTime()) / (1000 * 60)
                      )
                    : 0;

                const lateHours = Math.floor(lateMinutes / 60);
                const lateTime = `${lateHours > 0 ? `${lateHours}時間` : ""}${
                  lateMinutes % 60
                }分`;

                return (
                  <tr key={record.id}>
                    <td className="border px-4 py-2">
                      {record.users.employee_number || "-"}
                    </td>
                    <td className="border px-4 py-2">
                      {record.users.name || "-"}
                    </td>
                    <td className="border px-4 py-2">
                      {record.shifts.start_time || "-"}
                    </td>
                    <td className="border px-4 py-2">
                      {record.shifts.user_hourly_rates?.work_data
                        ?.location_name || "-"}
                    </td>
                    <td className="border px-4 py-2">
                      {formatToJapanTime(record.clock_in) || "-"}
                    </td>
                    <td className="border px-4 py-2">{lateTime}</td>
                    <td className="border px-4 py-2">{record.status}</td>
                    <td className="border px-4 py-2">
                      {record.status === "未対応" ? (
                        <button
                          onClick={() => handleResolve(record.id)}
                          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                        >
                          対応済みにする
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUnresolve(record.id)}
                          className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
                        >
                          未対応に戻す
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-600">遅刻者はいません。</p>
        )}
      </div>
    </AdminLayout>
  );
}
