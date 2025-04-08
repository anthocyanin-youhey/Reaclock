// reaclock/src/pages/admin/attendanceRecords.tsx

import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabaseCliants";
import AdminLayout from "../../components/AdminLayout";
import { requireAdminAuth } from "../../utils/authHelpers";
import { formatToJapanTime } from "../../utils/dateHelpers";
import * as XLSX from "xlsx"; // Excel出力用

export const getServerSideProps = requireAdminAuth;

/** 15分単位で切り捨てるヘルパー関数 */
function floorToQuarter(dateObj: Date): Date {
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth();
  const date = dateObj.getDate();
  const hours = dateObj.getHours();
  const minutes = dateObj.getMinutes();
  const flooredMinutes = minutes - (minutes % 15);
  return new Date(year, month, date, hours, flooredMinutes, 0, 0);
}

/**
 * 合計勤務時間（分）に応じた休憩時間（分）を返す関数
 * - totalMinutes < 405（6時間45分未満） → 0分
 * - 406分～525分（6時間46分～8時間45分） → 45分
 * - totalMinutes ≥ 541分（9時間1分以上） → 60分
 * - 525～540分は45分とする
 */
function calculateBreakMinutes(totalMinutes: number): number {
  if (totalMinutes < 405) {
    return 0;
  } else if (totalMinutes < 541) {
    return 45;
  } else {
    return 60;
  }
}

interface WorkData {
  location_name?: string;
  is_deleted?: boolean; // 論理削除判定
}

interface UserHourlyRate {
  hourly_rate?: number;
  work_data?: WorkData | WorkData[];
}

interface ShiftRecord {
  date: string;
  start_time?: string;
  end_time?: string;
  user_hourly_rates?: UserHourlyRate | UserHourlyRate[];
}

interface AttendanceRecord {
  work_date: string;
  clock_in?: string;
  clock_out?: string;
  status?: string;
  absent_reason?: string;
}

type PartialShiftRecord = {
  start_time?: string;
  end_time?: string;
  hourly_rate?: number | string;
  location_name?: string;
  is_deleted?: boolean;
};

type PartialAttendanceRecord = {
  clock_in?: string;
  clock_out?: string;
  status?: string | null;
  absent_reason?: string;
};

export default function AttendanceRecords({
  admin,
}: {
  admin: { name: string };
}) {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [attendanceAndShiftData, setAttendanceAndShiftData] = useState<any[]>(
    []
  );
  const [absentReasons, setAbsentReasons] = useState<Record<string, string>>(
    {}
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });
  const [error, setError] = useState<string>("");

  // ▼ 日付リスト生成
  const generateDatesForMonth = (month: string): string[] => {
    const [year, monthIndex] = month.split("-").map(Number);
    const daysInMonth = new Date(year, monthIndex, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = String(i + 1).padStart(2, "0");
      return `${month}-${day}`;
    });
  };

  // ▼ スタッフ一覧取得
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

  // ▼ attendance_records を取得
  const fetchAttendanceRecords = async (
    staffId: string,
    lastDay: number
  ): Promise<AttendanceRecord[]> => {
    const { data, error } = await supabase
      .from("attendance_records")
      .select("work_date, clock_in, clock_out, status, absent_reason")
      .eq("user_id", staffId)
      .gte("work_date", `${selectedMonth}-01`)
      .lte("work_date", `${selectedMonth}-${lastDay}`)
      .order("work_date", { ascending: true });
    if (error) throw error;
    return (data as AttendanceRecord[]) || [];
  };

  // ▼ shifts を取得
  const fetchShiftRecords = async (
    staffId: string,
    lastDay: number
  ): Promise<ShiftRecord[]> => {
    const { data, error } = await supabase
      .from("shifts")
      .select(
        `
        date,
        start_time,
        end_time,
        user_hourly_rates!fk_shifts_user_hourly_rate(
          hourly_rate,
          work_data!fk_user_hourly_rates_work_location(
            location_name,
            is_deleted
          )
        )
      `
      )
      .eq("user_id", staffId)
      .gte("date", `${selectedMonth}-01`)
      .lte("date", `${selectedMonth}-${lastDay}`)
      .order("date", { ascending: true });
    if (error) throw error;
    return (data as ShiftRecord[]) || [];
  };

  // ▼ attendance_records と shifts のデータを取得＆マージ
  const fetchAttendanceAndShiftData = async (staffId: string) => {
    try {
      const [year, monthIndex] = selectedMonth.split("-").map(Number);
      const lastDay = new Date(year, monthIndex, 0).getDate();
      const [attendanceData, shiftData] = await Promise.all([
        fetchAttendanceRecords(staffId, lastDay),
        fetchShiftRecords(staffId, lastDay),
      ]);

      // --- map化 (attendance_records)
      const attendanceMap: Record<string, PartialAttendanceRecord> =
        attendanceData.reduce((acc, rec) => {
          acc[rec.work_date] = {
            clock_in: rec.clock_in,
            clock_out: rec.clock_out,
            status: rec.status ?? null,
            absent_reason: rec.absent_reason,
          };
          return acc;
        }, {} as Record<string, PartialAttendanceRecord>);

      // --- map化 (shifts)
      const shiftMap: Record<string, PartialShiftRecord> = shiftData.reduce(
        (acc, rec) => {
          let hr: number | string = "-";
          let loc = "-";
          let deleted = false;
          const userHourlyRates = rec.user_hourly_rates;
          if (Array.isArray(userHourlyRates)) {
            const first = userHourlyRates[0];
            hr = first?.hourly_rate ?? "-";
            if (Array.isArray(first?.work_data)) {
              const wd = first.work_data[0];
              if (wd) {
                loc = wd.is_deleted
                  ? `${wd.location_name}（削除済み）`
                  : wd.location_name ?? "-";
                deleted = !!wd.is_deleted;
              }
            } else if (first?.work_data) {
              const wd = first.work_data;
              loc = wd.is_deleted
                ? `${wd.location_name}（削除済み）`
                : wd.location_name ?? "-";
              deleted = !!wd.is_deleted;
            }
          } else if (userHourlyRates) {
            hr = userHourlyRates.hourly_rate ?? "-";
            if (Array.isArray(userHourlyRates.work_data)) {
              const wd = userHourlyRates.work_data[0];
              if (wd) {
                loc = wd.is_deleted
                  ? `${wd.location_name}（削除済み）`
                  : wd.location_name ?? "-";
                deleted = !!wd.is_deleted;
              }
            } else if (userHourlyRates.work_data) {
              const wd = userHourlyRates.work_data;
              loc = wd.is_deleted
                ? `${wd.location_name}（削除済み）`
                : wd.location_name ?? "-";
              deleted = !!wd.is_deleted;
            }
          }
          acc[rec.date] = {
            start_time: rec.start_time || "-",
            end_time: rec.end_time || "-",
            hourly_rate: hr || "-",
            location_name: loc || "-",
            is_deleted: deleted,
          };
          return acc;
        },
        {} as Record<string, PartialShiftRecord>
      );

      // --- 日付ごとにマージ
      const allDates = generateDatesForMonth(selectedMonth);
      const combinedData = allDates.map((date) => {
        const shiftRec = shiftMap[date] || {};
        const attRec = attendanceMap[date] || {};
        return {
          date,
          start_time: shiftRec.start_time || "-",
          end_time: shiftRec.end_time || "-",
          hourly_rate: shiftRec.hourly_rate || "-",
          location_name: shiftRec.location_name || "-",
          clock_in: attRec.clock_in || "-",
          clock_out: attRec.clock_out || "-",
          status: attRec.status || null,
          absent_reason: attRec.absent_reason || "-",
        };
      });

      setAttendanceAndShiftData(combinedData);
      setError("");
    } catch (err: any) {
      console.error("❌ データ取得エラー:", err);
      setError("データ取得中にエラーが発生しました。");
    }
  };

  // ▼ ステータス判定
  const determineStatus = (record: any): string => {
    if (record.status === "欠勤") return "欠勤";
    if (!record.start_time || record.start_time === "-") return "-";
    const shiftStart = new Date(`${record.date}T${record.start_time}`);
    const now = new Date();
    const clockIn =
      record.clock_in && record.clock_in !== "-"
        ? new Date(`${record.date}T${record.clock_in}`)
        : null;
    const clockOut =
      record.clock_out && record.clock_out !== "-"
        ? new Date(`${record.date}T${record.clock_out}`)
        : null;
    if (!clockIn) return now > shiftStart ? "遅刻" : "未出勤";
    if (clockIn && !clockOut) return "出勤中";
    if (clockIn && clockOut) return "退勤済み";
    return "-";
  };

  /**
   * ▼ 15分単位で切り捨てた打刻時刻から算出する合計勤務時間（分）を求める関数
   */
  const calculateTotalMinutes = (record: any): number => {
    const clockInTime = new Date(`${record.date}T${record.clock_in}`);
    const clockOutTime = new Date(`${record.date}T${record.clock_out}`);
    const flooredClockIn = floorToQuarter(clockInTime);
    const flooredClockOut = floorToQuarter(clockOutTime);
    const diffMs = flooredClockOut.getTime() - flooredClockIn.getTime();
    return diffMs > 0 ? diffMs / (1000 * 60) : 0;
  };

  /**
   * ▼ 日給計算（休憩時間考慮版）
   * （合計勤務時間（分） - 休憩時間（分））× (時給÷60) = 日給
   */
  const calculateDailyPay = (record: any): string => {
    if (
      !record.clock_in ||
      !record.clock_out ||
      record.clock_in === "-" ||
      record.clock_out === "-" ||
      !record.hourly_rate ||
      isNaN(Number(record.hourly_rate)) ||
      !record.start_time ||
      !record.end_time ||
      record.start_time === "-" ||
      record.end_time === "-"
    ) {
      return "-";
    }
    const totalMinutes = calculateTotalMinutes(record);
    if (totalMinutes <= 0) return "-";
    const breakMinutes = calculateBreakTime(record);
    const netMinutes = totalMinutes - breakMinutes;
    if (netMinutes <= 0) return "-";
    const numericRate = Number(record.hourly_rate);
    const pay = Math.floor(netMinutes * (numericRate / 60));
    return `${pay}円`;
  };

  /**
   * ▼ 合計勤務時間（実働時間：休憩控除後）の文字列を返す関数
   * 有効な打刻情報がある場合、（合計勤務時間 - 休憩時間）を「X時間Y分」で返す
   */
  const calculateEffectiveWorkTime = (record: any): string => {
    if (
      !record.clock_in ||
      !record.clock_out ||
      record.clock_in === "-" ||
      record.clock_out === "-" ||
      !record.start_time ||
      !record.end_time ||
      record.start_time === "-" ||
      record.end_time === "-"
    ) {
      return "-";
    }
    const totalMinutes = calculateTotalMinutes(record);
    const breakMinutes = calculateBreakTime(record);
    const netMinutes = totalMinutes - breakMinutes;
    if (netMinutes <= 0) return "-";
    const hours = Math.floor(netMinutes / 60);
    const minutes = Math.round(netMinutes % 60);
    return `${hours}時間${minutes}分`;
  };

  /**
   * ▼ 休憩時間を返す関数（実働時間ルールに基づく）
   * - 合計勤務時間 < 405分 → 休憩 0分
   * - 合計勤務時間が 406分～540分（※6時間46分～9時間） → 休憩 45分
   * - 合計勤務時間が 541分以上 → 休憩 60分
   */
  const calculateBreakTime = (record: any): number => {
    if (
      !record.clock_in ||
      !record.clock_out ||
      record.clock_in === "-" ||
      record.clock_out === "-" ||
      !record.start_time ||
      !record.end_time ||
      record.start_time === "-" ||
      record.end_time === "-"
    ) {
      return 0;
    }
    // ここでは、合計勤務時間（打刻差分）を基に休憩時間を計算
    const totalMinutes = calculateTotalMinutes(record);
    return calculateBreakMinutes(totalMinutes);
  };

  /**
   * ▼ 合計勤務時間（休憩前）の文字列を返す関数
   */
  const calculateTotalWorkTime = (record: any): string => {
    if (
      !record.clock_in ||
      !record.clock_out ||
      record.clock_in === "-" ||
      record.clock_out === "-"
    ) {
      return "-";
    }
    const start = new Date(`${record.date}T${record.clock_in}`);
    const end = new Date(`${record.date}T${record.clock_out}`);
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) return "-";
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return `${hours}時間${minutes}分`;
  };

  // ▼ 欠勤登録
  const markAsAbsentAndClearReason = async (date: string) => {
    const reason = absentReasons[date];
    if (!reason) {
      alert("欠勤理由を入力してください。");
      return;
    }
    try {
      const { data: existingRecord, error: fetchError } = await supabase
        .from("attendance_records")
        .select("id")
        .eq("user_id", selectedStaffId)
        .eq("work_date", date)
        .single();
      if (fetchError && fetchError.code !== "PGRST116") {
        console.error("❌ 欠勤チェックエラー:", fetchError);
        setError("欠勤登録中にエラーが発生しました。");
        return;
      }
      if (existingRecord) {
        const { error: updateError } = await supabase
          .from("attendance_records")
          .update({ status: "欠勤", absent_reason: reason })
          .eq("id", existingRecord.id);
        if (updateError) {
          console.error("❌ 欠勤更新エラー:", updateError);
          setError("欠勤登録中にエラーが発生しました。");
          return;
        }
      } else {
        const { error: insertError } = await supabase
          .from("attendance_records")
          .insert({
            user_id: selectedStaffId,
            work_date: date,
            status: "欠勤",
            absent_reason: reason,
          });
        if (insertError) {
          console.error("❌ 欠勤挿入エラー:", insertError);
          setError("欠勤登録中にエラーが発生しました。");
          return;
        }
      }
      console.log("✅ 欠勤登録成功:", { date, reason });
      setAbsentReasons((prev) => ({ ...prev, [date]: "" }));
      await fetchAttendanceAndShiftData(selectedStaffId!);
    } catch (err) {
      console.error("❌ 欠勤登録エラー:", err);
      setError("欠勤登録中にエラーが発生しました。");
    }
  };

  // ▼ 欠勤取消
  const cancelAbsent = async (date: string) => {
    try {
      const { error } = await supabase
        .from("attendance_records")
        .update({ status: null, absent_reason: null })
        .eq("user_id", selectedStaffId)
        .eq("work_date", date);
      if (error) {
        console.error("❌ 欠勤取り消しエラー:", error);
        setError("欠勤取り消し中にエラーが発生しました。");
      } else {
        console.log("✅ 欠勤取消成功:", date);
        setAbsentReasons((prev) => ({ ...prev, [date]: "" }));
        await fetchAttendanceAndShiftData(selectedStaffId!);
      }
    } catch (err) {
      console.error("❌ 欠勤取り消しエラー:", err);
      setError("欠勤取り消し中にエラーが発生しました。");
    }
  };

  // ▼ Excel 出力
  const exportToExcel = () => {
    if (!selectedStaffId) {
      setError("スタッフを選択してください。");
      return;
    }
    const staff = staffList.find(
      (s) => String(s.id) === String(selectedStaffId)
    );
    if (!staff) {
      setError("スタッフ情報を取得できませんでした。");
      return;
    }
    const staffName = staff.name || "スタッフ";
    const [year, month] = selectedMonth.split("-");
    const formattedMonth = `${year}年${month}月`;
    const fileName = `${formattedMonth}-${staffName}-勤怠管理表.xlsx`;
    const header = [
      "日付",
      "シフト開始",
      "シフト終了",
      "勤務地",
      "時給",
      "休憩",
      "合計勤務時間（実働）",
      "出勤打刻",
      "退勤打刻",
      "ステータス",
      "日給",
      "欠勤理由",
    ];
    const dates = generateDatesForMonth(selectedMonth);
    const data = dates.map((date) => {
      const record =
        attendanceAndShiftData.find((item) => item.date === date) || {};
      const hourlyRateCell =
        record.hourly_rate && !isNaN(Number(record.hourly_rate))
          ? `${record.hourly_rate}円`
          : "-";
      const breakTimeCell =
        record.clock_in && record.clock_out
          ? `${calculateBreakTime(record)}分`
          : "-";
      const totalWorkTime = calculateTotalWorkTime(record);
      const effectiveWorkTime = calculateEffectiveWorkTime(record);
      return [
        date,
        record.start_time || "-",
        record.end_time || "-",
        record.location_name || "-",
        hourlyRateCell,
        breakTimeCell,
        `${totalWorkTime}（実働: ${effectiveWorkTime}）`,
        record.clock_in && record.clock_in !== "-"
          ? formatToJapanTime(record.clock_in)
          : "-",
        record.clock_out && record.clock_out !== "-"
          ? formatToJapanTime(record.clock_out)
          : "-",
        determineStatus(record),
        calculateDailyPay(record),
        record.absent_reason || "-",
      ];
    });
    const worksheet = XLSX.utils.aoa_to_sheet([header, ...data]);
    worksheet["!cols"] = header.map(() => ({ wch: 15 }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "勤怠データ");
    XLSX.writeFile(workbook, fileName);
  };

  // ▼ 「データがない日」判定
  const isNoDataDay = (record: any): boolean => {
    const noShift = record.start_time === "-" && record.end_time === "-";
    const noClock = record.clock_in === "-" && record.clock_out === "-";
    const notAbsent = record.status !== "欠勤";
    return noShift && noClock && notAbsent;
  };

  // ▼ 初回スタッフ一覧取得
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
      <div className="container mx-auto py-6 px-4">
        <h1 className="text-2xl font-bold mb-6 text-center">
          打刻履歴と勤務データ
        </h1>
        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}

        <div className="mb-6 text-gray-600">
          <h2 className="font-bold text-sm md:text-base">日給計算について</h2>
          <p className="text-xs md:text-sm">
            日給は以下のルールで計算されます：
          </p>
          <ul className="list-disc pl-5 text-xs md:text-sm">
            <li>出勤・退勤打刻の時間から勤務時間を計算します。</li>
            <li>
              勤務時間は、打刻時刻（15分単位に切り捨てた値）の差分を用います。
              <br />
              合計勤務時間が 405分未満（6時間44分以下） → 休憩 0 分、
              <br />
              406分～540分（6時間46分～9時間） → 休憩 45 分、
              <br />
              541分以上（9時間1分以上） → 休憩 60 分
            </li>
            <li>（合計勤務時間 − 休憩時間）× (時給÷60) = 日給</li>
            <li>
              合計勤務時間は、打刻時刻の差分（休憩控除前）の時間を示します。
            </li>
          </ul>
          <br />
          <h2 className="font-bold text-sm md:text-base">欠勤登録について</h2>
          <ul className="list-disc pl-5 text-xs md:text-sm">
            <li>
              欠勤ボタンを押下するには先に欠勤理由を入力してください（例：病欠,
              無断欠勤...）
            </li>
          </ul>
        </div>

        {/* スタッフ選択 */}
        <div className="mb-6">
          <label className="block font-bold text-sm md:text-base mb-2">
            スタッフを選択
          </label>
          <select
            onChange={(e) => setSelectedStaffId(e.target.value)}
            value={selectedStaffId || ""}
            className="border px-2 py-1 w-full sm:w-auto text-sm md:text-base"
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
          <label className="block font-bold text-sm md:text-base mb-2">
            月を選択
          </label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border px-2 py-1 w-full sm:w-auto text-sm md:text-base"
          />
        </div>

        {/* Excel 出力 */}
        <button
          onClick={exportToExcel}
          className="bg-green-500 text-white px-2 py-1 rounded text-sm md:text-base hover:bg-green-600 mb-4 block sm:inline-block"
        >
          Excel 出力
        </button>

        {/* レスポンシブ表示 */}
        {selectedStaffId && (
          <>
            {/* (A) スマホ表示: カードレイアウト */}
            <div className="block md:hidden space-y-4">
              {attendanceAndShiftData.map((record: any) => {
                const status = determineStatus(record);
                const isAbsent = status === "欠勤";
                const hourlyRateCell =
                  record.hourly_rate && !isNaN(Number(record.hourly_rate))
                    ? `${record.hourly_rate}円`
                    : "-";
                const breakTimeCell = calculateBreakTime(record) + "分";
                const totalWorkTime = calculateTotalWorkTime(record);
                const effectiveWorkTime = calculateEffectiveWorkTime(record);
                return (
                  <div
                    key={record.date}
                    className={`border p-3 rounded shadow-sm ${
                      isAbsent ? "bg-gray-200" : "bg-white"
                    }`}
                  >
                    <div className="text-sm font-bold mb-1">{record.date}</div>
                    <div className="text-sm">
                      <span className="font-bold">シフト:</span>{" "}
                      {record.start_time || "-"} ~ {record.end_time || "-"}
                    </div>
                    <div className="text-sm">
                      <span className="font-bold">勤務地:</span>{" "}
                      {record.location_name || "-"}
                    </div>
                    <div className="text-sm">
                      <span className="font-bold">時給:</span> {hourlyRateCell}
                    </div>
                    <div className="text-sm">
                      <span className="font-bold">休憩:</span> {breakTimeCell}
                    </div>
                    <div className="text-sm">
                      <span className="font-bold">合計勤務時間:</span>{" "}
                      {totalWorkTime}（実働: {effectiveWorkTime}）
                    </div>
                    <div className="text-sm">
                      <span className="font-bold">出勤:</span>{" "}
                      {record.clock_in !== "-"
                        ? formatToJapanTime(record.clock_in)
                        : "-"}
                    </div>
                    <div className="text-sm">
                      <span className="font-bold">退勤:</span>{" "}
                      {record.clock_out !== "-"
                        ? formatToJapanTime(record.clock_out)
                        : "-"}
                    </div>
                    <div className="text-sm">
                      <span className="font-bold">ステータス:</span> {status}
                    </div>
                    <div className="text-sm">
                      <span className="font-bold">日給:</span>{" "}
                      {calculateDailyPay(record)}
                    </div>
                    <div className="text-sm">
                      <span className="font-bold">欠勤理由:</span>{" "}
                      {isAbsent ? (
                        record.absent_reason || "-"
                      ) : (
                        <input
                          type="text"
                          placeholder="欠勤理由を入力"
                          value={absentReasons[record.date] || ""}
                          onChange={(e) =>
                            setAbsentReasons((prev) => ({
                              ...prev,
                              [record.date]: e.target.value,
                            }))
                          }
                          className="border px-2 py-1 text-xs mt-1"
                        />
                      )}
                    </div>
                    <div className="mt-2">
                      {isAbsent ? (
                        <button
                          onClick={() => cancelAbsent(record.date)}
                          className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
                        >
                          欠勤取消
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            markAsAbsentAndClearReason(record.date)
                          }
                          className={`bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 ${
                            !absentReasons[record.date]
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                          disabled={!absentReasons[record.date]}
                        >
                          欠勤
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* (B) PC表示: テーブルレイアウト */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full bg-white border-collapse border border-gray-300 text-xs md:text-sm">
                <thead>
                  <tr>
                    <th className="border border-gray-300 px-2 py-1">日付</th>
                    <th className="border border-gray-300 px-2 py-1">
                      シフト開始
                    </th>
                    <th className="border border-gray-300 px-2 py-1">
                      シフト終了
                    </th>
                    <th className="border border-gray-300 px-2 py-1">勤務地</th>
                    <th className="border border-gray-300 px-2 py-1">時給</th>
                    <th className="border border-gray-300 px-2 py-1">休憩</th>
                    <th className="border border-gray-300 px-2 py-1">
                      合計勤務時間
                      <br />
                      (実働)
                    </th>
                    <th className="border border-gray-300 px-2 py-1">
                      出勤打刻
                    </th>
                    <th className="border border-gray-300 px-2 py-1">
                      退勤打刻
                    </th>
                    <th className="border border-gray-300 px-2 py-1">
                      ステータス
                    </th>
                    <th className="border border-gray-300 px-2 py-1">日給</th>
                    <th className="border border-gray-300 px-2 py-1">
                      欠勤理由
                    </th>
                    <th className="border border-gray-300 px-2 py-1">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceAndShiftData.map((record: any) => {
                    const status = determineStatus(record);
                    const isAbsent = status === "欠勤";
                    const hourlyRateCell =
                      record.hourly_rate && !isNaN(Number(record.hourly_rate))
                        ? `${record.hourly_rate}円`
                        : "-";
                    const breakTimeCell = calculateBreakTime(record) + "分";
                    const totalWorkTime = calculateTotalWorkTime(record);
                    const effectiveWorkTime =
                      calculateEffectiveWorkTime(record);
                    return (
                      <tr
                        key={record.date}
                        className={isAbsent ? "bg-gray-300" : ""}
                      >
                        <td className="border px-2 py-1">{record.date}</td>
                        <td className="border px-2 py-1">
                          {record.start_time || "-"}
                        </td>
                        <td className="border px-2 py-1">
                          {record.end_time || "-"}
                        </td>
                        <td className="border px-2 py-1">
                          {record.location_name || "-"}
                        </td>
                        <td className="border px-2 py-1">{hourlyRateCell}</td>
                        <td className="border px-2 py-1">{breakTimeCell}</td>
                        <td className="border px-2 py-1">
                          {totalWorkTime}（実働: {effectiveWorkTime}）
                        </td>
                        <td className="border px-2 py-1">
                          {record.clock_in !== "-"
                            ? formatToJapanTime(record.clock_in)
                            : "-"}
                        </td>
                        <td className="border px-2 py-1">
                          {record.clock_out !== "-"
                            ? formatToJapanTime(record.clock_out)
                            : "-"}
                        </td>
                        <td className="border px-2 py-1">{status}</td>
                        <td className="border px-2 py-1">
                          {calculateDailyPay(record)}
                        </td>
                        <td className="border px-2 py-1">
                          {isAbsent ? (
                            record.absent_reason || "-"
                          ) : (
                            <input
                              type="text"
                              placeholder="欠勤理由を入力"
                              value={absentReasons[record.date] || ""}
                              onChange={(e) =>
                                setAbsentReasons((prev) => ({
                                  ...prev,
                                  [record.date]: e.target.value,
                                }))
                              }
                              className="border px-2 py-1 text-xs"
                            />
                          )}
                        </td>
                        <td className="border px-2 py-1 text-center">
                          {isAbsent ? (
                            <button
                              onClick={() => cancelAbsent(record.date)}
                              className="bg-green-500 text-white px-2 py-1 rounded text-xs md:text-sm hover:bg-green-600"
                            >
                              欠勤取消
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                markAsAbsentAndClearReason(record.date)
                              }
                              className={`bg-red-500 text-white px-2 py-1 rounded text-xs md:text-sm hover:bg-red-600 ${
                                !absentReasons[record.date]
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              }`}
                              disabled={!absentReasons[record.date]}
                            >
                              欠勤
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
