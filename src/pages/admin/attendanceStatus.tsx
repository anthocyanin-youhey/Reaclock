// reaclock/src/pages/admin/attendanceStatus.tsx

import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabaseCliants";
import AdminLayout from "../../components/AdminLayout";
import { requireAdminAuth } from "../../utils/authHelpers";
import { useLateCount } from "../../context/LateCountContext";

export const getServerSideProps = requireAdminAuth;

/** YYYY-MM-DD形式の本日の日付を返す */
function getJapanDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** HH:MM形式の現在時刻を返す */
function getCurrentTime(): string {
  const now = new Date();
  return now.toLocaleTimeString("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** 遅刻者を格納する型 */
type TardyInfo = {
  userId: number;
  userName: string; // users.name
  employeeNumber: string; // users.employee_number
  shiftId: number;
  shiftStartTime: string; // shifts.start_time
  clockInTime: string | null; // attendance_records.clock_in
  status: "遅刻" | "対応済み";
  locationName: string; // work_data.location_name
};

export default function AttendanceStatus({
  admin,
}: {
  admin: { name: string };
}) {
  // 選択日 (初期値: 今日)
  const [selectedDate, setSelectedDate] = useState(getJapanDate());
  // 遅刻者リスト
  const [tardyList, setTardyList] = useState<TardyInfo[]>([]);
  // エラーメッセージ
  const [error, setError] = useState("");
  // ナビバーの未対応件数コンテキスト
  const { setLateCount } = useLateCount();

  useEffect(() => {
    fetchTardyShiftsForDate(selectedDate);
  }, [selectedDate]);

  /**
   * 指定日の遅刻者をマルチステップで取得し、tardyListにセット。
   * 選択日が当日の場合のみ、未対応件数をナビバーに反映。
   */
  async function fetchTardyShiftsForDate(date: string) {
    try {
      setError("");
      // ① shiftsテーブルから取得
      const { data: shifts, error: shiftError } = await supabase
        .from("shifts")
        .select("id, user_id, date, start_time, user_hourly_rate_id")
        .eq("date", date);
      if (shiftError) throw shiftError;

      if (!shifts || shifts.length === 0) {
        // シフトがなければ遅刻者もいない
        setTardyList([]);
        // 当日なら0件を反映、そうでなければ触らない or 0件
        if (date === getJapanDate()) {
          setLateCount(0);
        }
        return;
      }

      // 当日なら現在時刻(1970-01-01基準)を作成
      const currentJapanDate = getJapanDate();
      let nowTime: Date | null = null;
      if (date === currentJapanDate) {
        nowTime = new Date(`1970-01-01T${getCurrentTime()}:00`);
      }

      const resultList: TardyInfo[] = [];

      // ② 各シフトについて順次取得
      for (const shift of shifts) {
        // シフト開始時刻がなければ判定不可
        if (!shift.start_time) continue;
        const shiftStartDate = new Date(`1970-01-01T${shift.start_time}`);
        if (isNaN(shiftStartDate.getTime())) continue;

        // 当日かつシフト開始前なら遅刻判定しない
        if (date === currentJapanDate && nowTime && nowTime < shiftStartDate) {
          continue;
        }

        // 2-1) attendance_records 取得
        const { data: attData, error: attError } = await supabase
          .from("attendance_records")
          .select("id, clock_in, status")
          .eq("user_id", shift.user_id)
          .eq("work_date", date)
          .single();
        if (attError && attError.code !== "PGRST116") throw attError;

        let clockInStr: string | null = null;
        let clockInDate: Date | null = null;
        let recordStatus: "遅刻" | "対応済み" = "遅刻";

        if (attData?.clock_in) {
          clockInStr = attData.clock_in;
          clockInDate = new Date(`1970-01-01T${clockInStr}`);
        }
        if (attData?.status === "対応済み") {
          recordStatus = "対応済み";
        }

        // 遅刻判定
        let isTardy = false;
        if (clockInDate) {
          // 打刻あり → シフト開始後なら遅刻
          if (clockInDate > shiftStartDate) {
            isTardy = true;
          }
        } else {
          // 打刻なし → 過去日 or (当日かつ現在時刻>シフト開始) なら遅刻
          if (
            date !== currentJapanDate ||
            (nowTime && nowTime > shiftStartDate)
          ) {
            isTardy = true;
          }
        }

        if (!isTardy) continue;

        // 2-2) usersテーブル
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("name, employee_number")
          .eq("id", shift.user_id)
          .single();
        if (userError) {
          console.error("ユーザー情報取得エラー:", userError);
          continue;
        }

        // 2-3) user_hourly_rates → work_data
        let locationName = "-";
        if (shift.user_hourly_rate_id) {
          const { data: rateData, error: rateError } = await supabase
            .from("user_hourly_rates")
            .select("id, work_location_id")
            .eq("id", shift.user_hourly_rate_id)
            .single();
          if (!rateError && rateData) {
            if (rateData.work_location_id) {
              const { data: wdData, error: wdError } = await supabase
                .from("work_data")
                .select("location_name, is_deleted")
                .eq("id", rateData.work_location_id)
                .single();
              if (!wdError && wdData) {
                locationName = wdData.is_deleted
                  ? `${wdData.location_name}（削除済み）`
                  : wdData.location_name;
              }
            }
          }
        }

        // 遅刻者データを作成
        resultList.push({
          userId: shift.user_id,
          userName: userData?.name || "不明",
          employeeNumber: userData?.employee_number || "不明",
          shiftId: shift.id,
          shiftStartTime: shift.start_time,
          clockInTime: clockInStr,
          status: recordStatus,
          locationName,
        });
      }

      setTardyList(resultList);

      // 当日だけ未対応件数を更新
      if (date === currentJapanDate) {
        setLateCount(resultList.filter((t) => t.status === "遅刻").length);
      } else {
        // 過去日は反映しない
        setLateCount(0);
      }
    } catch (err: any) {
      console.error("遅刻取得エラー:", err);
      setError("遅刻取得中にエラーが発生しました。");
    }
  }

  /** 遅刻 → 対応済み */
  async function handleResolve(shiftId: number) {
    try {
      // shiftId と attendance_records.id は別物の場合が多い
      // 例としてここでは eq("id", shiftId) としているが、実際は "attendance_records" のIDが必要
      const { error } = await supabase
        .from("attendance_records")
        .update({ status: "対応済み" })
        .eq("id", shiftId);
      if (error) throw error;

      setTardyList((prev) =>
        prev.map((record) =>
          record.shiftId === shiftId
            ? { ...record, status: "対応済み" }
            : record
        )
      );
      // 当日なら未対応件数を再計算、過去日なら更新しない
      if (selectedDate === getJapanDate()) {
        setLateCount((prev) => Math.max(prev - 1, 0));
      }
    } catch (err) {
      console.error("対応済みへの変更エラー:", err);
      setError("対応済みへの変更中にエラーが発生しました。");
    }
  }

  /** 対応済み → 遅刻 */
  async function handleUnresolve(shiftId: number) {
    try {
      const { error } = await supabase
        .from("attendance_records")
        .update({ status: "遅刻" })
        .eq("id", shiftId);
      if (error) throw error;

      setTardyList((prev) =>
        prev.map((record) =>
          record.shiftId === shiftId ? { ...record, status: "遅刻" } : record
        )
      );
      // 当日だけ反映
      if (selectedDate === getJapanDate()) {
        setLateCount((prev) => prev + 1);
      }
    } catch (err) {
      console.error("未対応への変更エラー:", err);
      setError("未対応への変更中にエラーが発生しました。");
    }
  }

  // 当日かどうか
  const isToday = selectedDate === getJapanDate();
  // 当日の場合だけ "(HH:MM時点)" を表示
  const currentTimeText = isToday ? `（${getCurrentTime()}時点）` : "";
  // 当日以外なら「※その日全体のデータを表示しています。」の注釈
  const noteText = !isToday
    ? "※選択日の遅刻者一覧はその日全体のデータを表示しています。"
    : "";

  return (
    <AdminLayout adminName={admin.name}>
      <div className="container mx-auto py-6">
        {error && <p className="text-red-500 mb-4">{error}</p>}

        {/* 日付選択 */}
        <div className="mb-4">
          <label className="block font-bold text-lg mb-2">対象日</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border px-3 py-1"
          />
        </div>

        {/* タイトル表示 */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold">
            {selectedDate}
            {isToday && (
              <span className="ml-2 text-xl font-normal">
                {currentTimeText}
              </span>
            )}
          </h2>
          {noteText && <p className="text-sm text-gray-500">{noteText}</p>}
        </div>

        <h1 className="text-2xl font-bold mb-4">遅刻ステータス確認</h1>
        <h2 className="text-xl font-bold mb-4">選択日の遅刻者一覧</h2>

        {tardyList.length > 0 ? (
          <>
            {/* --- (A) スマホ表示: カードレイアウト (md未満) --- */}
            <div className="block md:hidden space-y-4">
              {tardyList.map((record) => {
                const tardyType = record.clockInTime ? "打刻遅れ" : "無打刻";
                return (
                  <div
                    key={record.shiftId}
                    className="border p-4 rounded shadow bg-white"
                  >
                    <div className="text-sm font-bold mb-2">
                      {record.userName} ({record.employeeNumber})
                    </div>
                    <div className="text-sm">
                      <span className="font-bold">シフト開始: </span>
                      {record.shiftStartTime}
                    </div>
                    <div className="text-sm">
                      <span className="font-bold">勤務地: </span>
                      {record.locationName}
                    </div>
                    <div className="text-sm">
                      <span className="font-bold">出勤打刻: </span>
                      {record.clockInTime ?? "-"}
                    </div>
                    <div className="text-sm">
                      <span className="font-bold">状態: </span>
                      {record.status}（{tardyType}）
                    </div>
                    <div className="mt-2">
                      {isToday ? (
                        record.status === "遅刻" ? (
                          <button
                            onClick={() => handleResolve(record.shiftId)}
                            className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
                          >
                            対応完了
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUnresolve(record.shiftId)}
                            className="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600"
                          >
                            未対応に戻す
                          </button>
                        )
                      ) : (
                        <span className="text-gray-400 text-xs">
                          過去日のため操作不可
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* --- (B) PC表示: テーブル (md以上) --- */}
            <div className="hidden md:block overflow-x-auto">
              <table className="table-auto w-full bg-white border border-gray-300">
                <thead>
                  <tr>
                    <th className="border px-4 py-2">社員番号</th>
                    <th className="border px-4 py-2">名前</th>
                    <th className="border px-4 py-2">シフト開始</th>
                    <th className="border px-4 py-2">勤務地</th>
                    <th className="border px-4 py-2">出勤打刻</th>
                    <th className="border px-4 py-2">状態</th>
                    <th className="border px-4 py-2">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {tardyList.map((record) => {
                    const tardyType = record.clockInTime
                      ? "打刻遅れ"
                      : "無打刻";
                    return (
                      <tr key={record.shiftId}>
                        <td className="border px-4 py-2">
                          {record.employeeNumber}
                        </td>
                        <td className="border px-4 py-2">{record.userName}</td>
                        <td className="border px-4 py-2">
                          {record.shiftStartTime}
                        </td>
                        <td className="border px-4 py-2">
                          {record.locationName}
                        </td>
                        <td className="border px-4 py-2">
                          {record.clockInTime ?? "-"}
                        </td>
                        <td className="border px-4 py-2">
                          {record.status}
                          <br />
                          <span className="text-xs text-gray-500">
                            ({tardyType})
                          </span>
                        </td>
                        <td className="border px-4 py-2">
                          {isToday ? (
                            record.status === "遅刻" ? (
                              <button
                                onClick={() => handleResolve(record.shiftId)}
                                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                              >
                                対応完了にする
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUnresolve(record.shiftId)}
                                className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
                              >
                                未対応に戻す
                              </button>
                            )
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-gray-600">遅刻者はいません。</p>
        )}
      </div>
    </AdminLayout>
  );
}
