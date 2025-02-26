//reaclock\src\pages\admin\attendanceRecords.tsx
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

  const generateDatesForMonth = (month: string) => {
    const [year, monthIndex] = month.split("-").map(Number);
    const daysInMonth = new Date(year, monthIndex, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = String(i + 1).padStart(2, "0");
      return `${month}-${day}`;
    });
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
        console.log("取得したスタッフリスト:", data); // デバッグ用
        setStaffList(data || []);
      }
    } catch (err) {
      console.error("スタッフ情報取得エラー:", err);
      setError("データ取得中にエラーが発生しました。");
    }
  };

  //登録済みシフトデータ取得用の関数

  // ✅ インターフェース定義
  interface WorkData {
    location_name: string;
  }

  interface UserHourlyRate {
    hourly_rate: number;
    work_data: WorkData | WorkData[]; // 配列も考慮
  }

  interface AttendanceRecord {
    clock_in?: string;
    clock_out?: string;
    status?: string;
    absent_reason?: string;
  }

  interface ShiftRecord {
    id: string;
    date: string;
    start_time?: string;
    end_time?: string;
    user_hourly_rates: UserHourlyRate | UserHourlyRate[];
    attendance_records?: AttendanceRecord;
  }

  // ✅ 勤務データ取得 (勤務地情報含む)
  const fetchAttendanceAndShiftData = async (staffId: string) => {
    try {
      const { data, error } = await supabase
        .from("shifts")
        .select(
          `
        id,
        date,
        start_time,
        end_time,
        user_hourly_rates!fk_shifts_user_hourly_rate(
          hourly_rate,
          work_data!fk_user_hourly_rates_work_location(location_name)
        ),
        attendance_records!fk_attendance_records_shift(
          id,
          clock_in,
          clock_out,
          status,
          absent_reason
        )
      `
        )
        .eq("user_id", staffId)
        .gte("date", `${selectedMonth}-01`)
        .lte(
          "date",
          `${selectedMonth}-${new Date(
            Number(selectedMonth.split("-")[0]),
            Number(selectedMonth.split("-")[1]),
            0
          ).getDate()}`
        )
        .order("date", { ascending: true });

      if (error) {
        setError("データの取得に失敗しました。");
        console.error("データ取得エラー:", error);
      } else {
        console.log("✅ 取得したデータ:", data);

        // ✅ attendanceMap をここに移動
        const attendanceMap = (data || []).reduce((acc, record) => {
          acc[record.date] = {
            clock_in: record.attendance_records?.[0]?.clock_in ?? "-",
            clock_out: record.attendance_records?.[0]?.clock_out ?? "-",
          };
          return acc;
        }, {} as Record<string, any>);

        console.log("✅ attendanceMap:", attendanceMap);

        setAttendanceAndShiftData(
          (data as ShiftRecord[]).map((record) => {
            const userHourlyRate = Array.isArray(record.user_hourly_rates)
              ? record.user_hourly_rates[0]
              : record.user_hourly_rates;

            const workLocation = Array.isArray(userHourlyRate?.work_data)
              ? userHourlyRate.work_data[0]?.location_name ?? "-"
              : (userHourlyRate?.work_data as WorkData)?.location_name ?? "-";

            const clockIn = record.attendance_records?.[0]?.clock_in ?? "-";
            const clockOut = record.attendance_records?.[0]?.clock_out ?? "-";

            return {
              ...record,
              hourly_rate: userHourlyRate?.hourly_rate ?? "-",
              location_name: workLocation,
              clock_in: clockIn,
              clock_out: clockOut,
            };
          })
        );
      }
    } catch (err) {
      console.error("❌ データ取得エラー:", err);
      setError("データ取得中にエラーが発生しました。");
    }
  };

  const markAsAbsent = async (date: string, reason: string) => {
    try {
      const { data: existingRecord, error: fetchError } = await supabase
        .from("attendance_records")
        .select("id")
        .eq("user_id", selectedStaffId)
        .eq("work_date", date)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        console.error("欠勤チェックエラー:", fetchError);
        setError("欠勤登録中にエラーが発生しました。");
        return;
      }

      if (existingRecord) {
        const { error: updateError } = await supabase
          .from("attendance_records")
          .update({
            status: "欠勤",
            absent_reason: reason,
          })
          .eq("id", existingRecord.id);

        if (updateError) {
          console.error("欠勤更新エラー:", updateError);
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
          console.error("欠勤挿入エラー:", insertError);
          setError("欠勤登録中にエラーが発生しました。");
          return;
        }
      }

      console.log("欠勤登録成功: ", { date, reason }); // デバッグ用
      fetchAttendanceAndShiftData(selectedStaffId!);
    } catch (err) {
      console.error("欠勤登録エラー:", err);
      setError("欠勤登録中にエラーが発生しました。");
    }
  };

  const cancelAbsent = async (date: string) => {
    try {
      const { error } = await supabase
        .from("attendance_records")
        .update({ status: null, absent_reason: null })
        .eq("user_id", selectedStaffId)
        .eq("work_date", date);

      if (error) {
        console.error("欠勤取り消しエラー:", error);
        setError("欠勤取り消し中にエラーが発生しました。");
      } else {
        fetchAttendanceAndShiftData(selectedStaffId!);
      }
    } catch (err) {
      console.error("欠勤取り消しエラー:", err);
      setError("欠勤取り消し中にエラーが発生しました。");
    }
  };

  const determineStatus = (record: any): string => {
    const attendance = record.attendance_records || {};
    const shiftStartTime = record.start_time
      ? new Date(`${record.date}T${record.start_time}`)
      : null;
    const clockInTime = attendance.clock_in
      ? new Date(`${record.date}T${attendance.clock_in}`)
      : null;
    const now = new Date();

    // シフトが未登録の場合
    if (!shiftStartTime && !record.end_time) {
      return "-";
    }

    // 欠勤の場合
    if (attendance.status === "欠勤") {
      return "欠勤";
    }

    // 出勤打刻がない場合でシフト開始時間を過ぎている場合
    if (!clockInTime && shiftStartTime && now > shiftStartTime) {
      return "遅刻";
    }

    // 出勤打刻があるが遅刻している場合
    if (clockInTime && shiftStartTime && clockInTime > shiftStartTime) {
      return "遅刻";
    }

    // 出勤済みの場合
    if (clockInTime) {
      return "出勤";
    }

    // 未出勤の場合
    return "未出勤";
  };

  const calculateDailyPay = (record: any): string => {
    const attendance = record.attendance_records || {};
    const shiftStart = record.start_time
      ? new Date(`1970-01-01T${record.start_time}`)
      : null;
    const shiftEnd = record.end_time
      ? new Date(`1970-01-01T${record.end_time}`)
      : null;
    const hourlyRate = record.user_hourly_rates?.hourly_rate;

    if (
      !attendance.clock_in ||
      !attendance.clock_out ||
      !shiftStart ||
      !shiftEnd ||
      !hourlyRate
    ) {
      return "-";
    }

    const clockIn = new Date(`1970-01-01T${attendance.clock_in}`);
    const clockOut = new Date(`1970-01-01T${attendance.clock_out}`);

    const actualStart = clockIn > shiftStart ? clockIn : shiftStart;
    const actualEnd = clockOut < shiftEnd ? clockOut : shiftEnd;

    const workedMilliseconds = actualEnd.getTime() - actualStart.getTime();
    if (workedMilliseconds <= 0) return "-";

    const workedHours = workedMilliseconds / (1000 * 60 * 60);
    return `${Math.floor(workedHours * hourlyRate)}円`;
  };

  const exportToExcel = () => {
    if (!selectedStaffId) {
      setError("スタッフを選択してください。");
      return;
    }

    // 選択されたスタッフ情報を取得
    const staff = staffList.find(
      (s) => String(s.id) === String(selectedStaffId)
    );
    if (!staff) {
      setError("スタッフ情報を取得できませんでした。");
      console.error(
        "スタッフ情報が見つかりません。選択されたID:",
        selectedStaffId
      );
      console.error("スタッフリスト:", staffList);
      return;
    }

    const staffName = staff.name || "スタッフ";

    // 対象年月のフォーマット
    const year = selectedMonth.split("-")[0];
    const month = selectedMonth.split("-")[1];
    const formattedMonth = `${year}年${month}月`;

    // ファイル名を設定
    const fileName = `${formattedMonth}-${staffName}-勤怠管理表.xlsx`;

    console.log("生成されたファイル名:", fileName); // デバッグ用

    const header = [
      "日付",
      "シフト開始",
      "シフト終了",
      "勤務地",
      "時給",
      "出勤打刻",
      "退勤打刻",
      "ステータス",
      "日給",
      "欠勤理由",
    ];

    // 全日分のデータ生成
    const dates = generateDatesForMonth(selectedMonth);
    const data = dates.map((date) => {
      const record =
        attendanceAndShiftData.find((item) => item.date === date) || {};
      const attendance = record.attendance_records || {};
      return [
        date, // 日付
        record.start_time || "-", // シフト開始
        record.end_time || "-", // シフト終了
        record.work_data?.work_location || "-", // 勤務地
        record.hourly_rate ? `${record.hourly_rate}円` : "-", // 時給
        attendance.clock_in ? formatToJapanTime(attendance.clock_in) : "-", // 出勤打刻
        attendance.clock_out ? formatToJapanTime(attendance.clock_out) : "-", // 退勤打刻
        determineStatus(record), // ステータス
        calculateDailyPay(record), // 日給
        attendance.absent_reason || "-", // 欠勤理由
      ];
    });

    // シート作成
    const worksheet = XLSX.utils.aoa_to_sheet([header, ...data]);

    // 列幅調整
    worksheet["!cols"] = header.map(() => ({ wch: 15 }));

    // ワークブック作成
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "勤怠データ");

    // ファイル出力
    XLSX.writeFile(workbook, fileName);
  };

  useEffect(() => {
    fetchStaffList();
  }, []);

  useEffect(() => {
    if (selectedStaffId) {
      fetchAttendanceAndShiftData(selectedStaffId);
    }
  }, [selectedStaffId, selectedMonth]);

  const handleReasonChange = (date: string, value: string) => {
    setAbsentReasons((prev) => ({ ...prev, [date]: value }));
  };

  const markAsAbsentAndClearReason = async (date: string) => {
    const reason = absentReasons[date];
    if (!reason) {
      alert("欠勤理由を入力してください。");
      return;
    }

    await markAsAbsent(date, reason);

    setAbsentReasons((prev) => ({ ...prev, [date]: "" })); // 入力欄をクリア
  };

  return (
    <AdminLayout adminName={admin.name}>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">打刻履歴と勤務データ</h1>
        {error && <p className="text-red-500 mb-4">{error}</p>}

        <div className="mb-6 text-gray-600">
          <h2 className="font-bold text-sm md:text-base">日給計算について</h2>
          <p className="text-xs md:text-sm">
            日給は以下のルールで計算されます：
          </p>
          <ul className="list-disc pl-5 text-xs md:text-sm">
            <li>出勤・退勤打刻の時間から勤務時間を計算します。</li>
            <li>勤務時間はシフト時間を基準に15分単位で切り捨てされます。</li>
            <li>勤務時間 × 時給 = 日給</li>
          </ul>
          <br />
          <h2 className="font-bold text-sm md:text-base">欠勤登録について</h2>
          <ul className="list-disc pl-5 text-xs md:text-sm">
            <li>
              欠勤ボタンを押下するには先に欠勤理由を入力してください（例：病欠 ,
              無断欠勤...）
            </li>
          </ul>
        </div>

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

        <button
          onClick={exportToExcel}
          className="bg-green-500 text-white px-2 py-1 rounded text-sm md:text-base hover:bg-green-600 mb-4"
        >
          Excel 出力
        </button>

        {selectedStaffId && (
          <div className="overflow-x-auto">
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
                  <th className="border border-gray-300 px-2 py-1">出勤打刻</th>
                  <th className="border border-gray-300 px-2 py-1">退勤打刻</th>
                  <th className="border border-gray-300 px-2 py-1">
                    ステータス
                  </th>
                  <th className="border border-gray-300 px-2 py-1">日給</th>
                  <th className="border border-gray-300 px-2 py-1">欠勤理由</th>
                  <th className="border border-gray-300 px-2 py-1">操作</th>
                </tr>
              </thead>
              <tbody>
                {generateDatesForMonth(selectedMonth).map((date) => {
                  const record =
                    attendanceAndShiftData.find((item) => item.date === date) ||
                    {};
                  const shift = record || {};
                  const attendance = record.attendance_records || {};
                  const workData = shift.work_data || {};
                  const status = determineStatus(record);
                  const isAbsent = status === "欠勤";

                  return (
                    <tr key={date} className={isAbsent ? "bg-gray-200" : ""}>
                      <td className="border px-2 py-1">{date}</td>
                      <td className="border px-2 py-1">
                        {shift.start_time || "-"}
                      </td>
                      <td className="border px-2 py-1">
                        {shift.end_time || "-"}
                      </td>
                      <td className="border px-2 py-1">
                        {record.location_name || "-"}
                      </td>
                      <td className="border px-2 py-1">
                        {record.hourly_rate ? `${record.hourly_rate}円` : "-"}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        {record?.clock_in && record?.clock_in !== "-"
                          ? formatToJapanTime(record.clock_in)
                          : "-"}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        {record?.clock_out && record?.clock_out !== "-"
                          ? formatToJapanTime(record.clock_out)
                          : "-"}
                      </td>
                      <td className="border px-2 py-1">{status}</td>
                      <td className="border px-2 py-1">
                        {calculateDailyPay(record)}
                      </td>
                      <td className="border px-2 py-1">
                        {shift.start_time || shift.end_time ? (
                          attendance.absent_reason || (
                            <input
                              type="text"
                              placeholder="欠勤理由を入力"
                              value={absentReasons[date] || ""}
                              onChange={(e) =>
                                handleReasonChange(date, e.target.value)
                              }
                              className="border px-2 py-1"
                            />
                          )
                        ) : (
                          <span>-</span>
                        )}
                      </td>
                      <td className="border px-2 py-1 text-center">
                        {!isAbsent ? (
                          <button
                            onClick={() => markAsAbsentAndClearReason(date)}
                            className={`bg-red-500 text-white px-2 py-1 rounded text-xs md:text-sm hover:bg-red-600 ${
                              !absentReasons[date]
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            }`}
                            disabled={!absentReasons[date]}
                          >
                            欠勤
                          </button>
                        ) : (
                          <button
                            onClick={() => cancelAbsent(date)}
                            className="bg-green-500 text-white px-2 py-1 rounded text-xs md:text-sm hover:bg-green-600"
                          >
                            欠勤取消
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
