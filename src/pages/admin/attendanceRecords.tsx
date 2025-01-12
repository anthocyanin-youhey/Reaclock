import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabaseCliants";
import AdminLayout from "../../components/AdminLayout";
import { requireAdminAuth } from "../../utils/authHelpers";
import { formatToJapanTime } from "../../utils/dateHelpers";

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
        setStaffList(data || []);
      }
    } catch (err) {
      console.error("スタッフ情報取得エラー:", err);
      setError("データ取得中にエラーが発生しました。");
    }
  };

  const fetchAttendanceAndShiftData = async (staffId: string) => {
    try {
      const { data, error } = await supabase
        .from("attendance_records")
        .select(
          `
          id,
          work_date,
          clock_in,
          clock_out,
          status,
          shifts!left (
            start_time,
            end_time,
            hourly_rate,
            work_data!fk_shifts_work_data (
              work_location
            )
          )
        `
        )
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
        setError("勤怠データの取得に失敗しました。");
        console.error("勤怠データ取得エラー:", error);
      } else {
        setAttendanceAndShiftData(data || []);
      }
    } catch (err) {
      console.error("データ取得エラー:", err);
      setError("データ取得中にエラーが発生しました。");
    }
  };

  const markAsAbsent = async (recordId: number) => {
    try {
      const { error } = await supabase
        .from("attendance_records")
        .update({ status: "欠勤" })
        .eq("id", recordId);

      if (error) {
        console.error("欠勤ステータス更新エラー:", error);
      } else if (selectedStaffId) {
        fetchAttendanceAndShiftData(selectedStaffId);
      }
    } catch (err) {
      console.error("欠勤更新中にエラーが発生しました:", err);
    }
  };

  const cancelAbsent = async (recordId: number) => {
    try {
      const { error } = await supabase
        .from("attendance_records")
        .update({ status: null })
        .eq("id", recordId);

      if (error) {
        console.error("欠勤取り消しエラー:", error);
      } else if (selectedStaffId) {
        fetchAttendanceAndShiftData(selectedStaffId);
      }
    } catch (err) {
      console.error("欠勤取り消し中にエラーが発生しました:", err);
    }
  };

  const calculateStatus = (record: any) => {
    if (!record.shifts) return { status: "-", lateTime: null }; // シフトが登録されていない場合

    if (record.status === "欠勤") return { status: "欠勤", lateTime: null };

    const clockIn = record.clock_in
      ? new Date(`1970-01-01T${record.clock_in}`)
      : null;
    const startTime = record.shifts.start_time
      ? new Date(`1970-01-01T${record.shifts.start_time}`)
      : null;

    if (!clockIn) return { status: "未出勤", lateTime: null };

    if (startTime && clockIn > startTime) {
      const diffMs = clockIn.getTime() - startTime.getTime();
      const lateMinutes = Math.floor(diffMs / (1000 * 60));
      const hours = Math.floor(lateMinutes / 60);
      const minutes = lateMinutes % 60;
      return {
        status: "遅刻",
        lateTime: `${hours > 0 ? `${hours}時間` : ""}${minutes}分`,
      };
    }

    return { status: "出勤", lateTime: null };
  };

  const roundDownToNearest15Minutes = (date: Date) => {
    const minutes = date.getMinutes();
    const roundedMinutes = Math.floor(minutes / 15) * 15;
    date.setMinutes(roundedMinutes, 0, 0); // 秒・ミリ秒をリセット
    return date;
  };

  const calculateDailyPay = (record: any) => {
    if (!record.clock_in || !record.clock_out) return "-";

    const shift = record.shifts || {};
    const hourlyRate = shift.hourly_rate;
    if (!hourlyRate) return "-";

    let shiftStart = new Date(`1970-01-01T${shift.start_time}`);
    let shiftEnd = new Date(`1970-01-01T${shift.end_time}`);

    const clockIn = record.clock_in
      ? roundDownToNearest15Minutes(new Date(`1970-01-01T${record.clock_in}`))
      : null;
    const clockOut = record.clock_out
      ? roundDownToNearest15Minutes(new Date(`1970-01-01T${record.clock_out}`))
      : null;

    if (clockIn && clockIn > shiftStart) shiftStart = clockIn;
    if (clockOut && clockOut < shiftEnd) shiftEnd = clockOut;

    const workedMilliseconds = shiftEnd.getTime() - shiftStart.getTime();
    if (workedMilliseconds <= 0) return "-";

    const workedMinutes = Math.floor(workedMilliseconds / (1000 * 60));
    const workedHours = workedMinutes / 60;

    return `${Math.floor(workedHours * hourlyRate)}円`;
  };

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
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">打刻履歴と勤務データ</h1>
        {error && <p className="text-red-500 mb-4">{error}</p>}

        <div className="mb-6 text-gray-600">
          <h2 className="font-bold">日給計算について</h2>
          <p className="text-sm">日給は以下のルールで計算されます：</p>
          <ul className="list-disc pl-5 text-sm">
            <li>
              出勤・退勤打刻の時間からシフト時間を基準に勤務時間を計算します。
            </li>
            <li>勤務時間は15分単位で計算され、切り捨てられます。</li>
            <li>勤務時間 × 時給 = 日給</li>
          </ul>
        </div>

        <div className="mb-6">
          <label className="block font-bold mb-2">スタッフを選択</label>
          <select
            onChange={(e) => setSelectedStaffId(e.target.value)}
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

        <div className="mb-6">
          <label className="block font-bold mb-2">月を選択</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border px-4 py-2 w-full sm:w-auto"
          />
        </div>

        {selectedStaffId && (
          <table className="w-full bg-white border-collapse border border-gray-300">
            <thead>
              <tr>
                <th className="border border-gray-300 px-4 py-2">日付</th>
                <th className="border border-gray-300 px-4 py-2">シフト開始</th>
                <th className="border border-gray-300 px-4 py-2">シフト終了</th>
                <th className="border border-gray-300 px-4 py-2">勤務地</th>
                <th className="border border-gray-300 px-4 py-2">時給</th>
                <th className="border border-gray-300 px-4 py-2">出勤打刻</th>
                <th className="border border-gray-300 px-4 py-2">退勤打刻</th>
                <th className="border border-gray-300 px-4 py-2">ステータス</th>
                <th className="border border-gray-300 px-4 py-2">遅刻時間</th>
                <th className="border border-gray-300 px-4 py-2">日給</th>
                <th className="border border-gray-300 px-4 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {generateDatesForMonth(selectedMonth).map((date) => {
                const record =
                  attendanceAndShiftData.find(
                    (item) => item.work_date === date
                  ) || {};
                const { status, lateTime } = calculateStatus(record);
                const shift = record.shifts || {};
                const workData = shift.work_data || {};

                return (
                  <tr
                    key={date}
                    className={record.status === "欠勤" ? "bg-gray-200" : ""}
                  >
                    <td className="border px-4 py-2">{date}</td>
                    <td className="border px-4 py-2">
                      {shift.start_time || "-"}
                    </td>
                    <td className="border px-4 py-2">
                      {shift.end_time || "-"}
                    </td>
                    <td className="border px-4 py-2">
                      {workData.work_location || "-"}
                    </td>
                    <td className="border px-4 py-2">
                      {shift.hourly_rate ? `${shift.hourly_rate}円` : "-"}
                    </td>
                    <td className="border px-4 py-2">
                      {record.clock_in
                        ? formatToJapanTime(record.clock_in)
                        : "-"}
                    </td>
                    <td className="border px-4 py-2">
                      {record.clock_out
                        ? formatToJapanTime(record.clock_out)
                        : "-"}
                    </td>
                    <td className="border px-4 py-2">{status || "-"}</td>
                    <td className="border px-4 py-2">{lateTime || "-"}</td>
                    <td className="border px-4 py-2">
                      {calculateDailyPay(record)}
                    </td>
                    <td className="border px-4 py-2 text-center">
                      {record.shifts ? (
                        record.status === "欠勤" ? (
                          <button
                            onClick={() => cancelAbsent(record.id)}
                            className="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                          >
                            欠勤取消
                          </button>
                        ) : (
                          <button
                            onClick={() => markAsAbsent(record.id)}
                            className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                          >
                            欠勤
                          </button>
                        )
                      ) : (
                        "-"
                      )}
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
