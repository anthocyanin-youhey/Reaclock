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
        .from("shifts")
        .select(
          `
          date,
          start_time,
          end_time,
          hourly_rate,
          work_data!fk_shifts_work_data (
            work_location
          ),
          attendance_records!left (
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
        setAttendanceAndShiftData(data || []);
      }
    } catch (err) {
      console.error("データ取得エラー:", err);
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
      ? new Date(`1970-01-01T${record.start_time}`)
      : null;
    const clockInTime = attendance.clock_in
      ? new Date(`1970-01-01T${attendance.clock_in}`)
      : null;

    if (attendance.status === "欠勤") {
      return "欠勤";
    }

    if (!clockInTime) {
      return "未出勤";
    }

    if (shiftStartTime && clockInTime > shiftStartTime) {
      return "遅刻";
    }

    return "出勤";
  };

  const calculateDailyPay = (record: any): string => {
    const attendance = record.attendance_records || {};
    const shiftStart = record.start_time
      ? new Date(`1970-01-01T${record.start_time}`)
      : null;
    const shiftEnd = record.end_time
      ? new Date(`1970-01-01T${record.end_time}`)
      : null;
    const hourlyRate = record.hourly_rate;

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

    const workedHours = Math.floor(workedMilliseconds / (1000 * 60 * 60));

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

  const handleReasonChange = (date: string, value: string) => {
    setAbsentReasons((prev) => ({ ...prev, [date]: value }));
  };

  return (
    <AdminLayout adminName={admin.name}>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">打刻履歴と勤務データ</h1>
        {error && <p className="text-red-500 mb-4">{error}</p>}

        <div className="mb-6 text-gray-600">
          <h2 className="font-bold">日給計算について</h2>
          <p className="text-sm">日給は以下のルールで計算されます：</p>
          <ul className="list-disc pl-5 text-sm">
            <li>出勤・退勤打刻の時間から勤務時間を計算します。</li>
            <li>勤務時間はシフト時間を基準に15分単位で切り捨てされます。</li>
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
                <th className="border border-gray-300 px-4 py-2">日給</th>
                <th className="border border-gray-300 px-4 py-2">欠勤理由</th>
                <th className="border border-gray-300 px-4 py-2">操作</th>
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
                      {attendance.clock_in
                        ? formatToJapanTime(attendance.clock_in)
                        : "-"}
                    </td>
                    <td className="border px-4 py-2">
                      {attendance.clock_out
                        ? formatToJapanTime(attendance.clock_out)
                        : "-"}
                    </td>
                    <td className="border px-4 py-2">{status}</td>
                    <td className="border px-4 py-2">
                      {calculateDailyPay(record)}
                    </td>
                    <td className="border px-4 py-2">
                      {attendance.absent_reason || (
                        <input
                          type="text"
                          placeholder="欠勤理由を入力"
                          value={absentReasons[date] || ""}
                          onChange={(e) =>
                            handleReasonChange(date, e.target.value)
                          }
                          className="border px-2 py-1"
                        />
                      )}
                    </td>
                    <td className="border px-4 py-2 text-center">
                      {!isAbsent ? (
                        <button
                          onClick={() =>
                            markAsAbsent(date, absentReasons[date] || "")
                          }
                          className={`bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 ${
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
                          className="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
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
        )}
      </div>
    </AdminLayout>
  );
}
