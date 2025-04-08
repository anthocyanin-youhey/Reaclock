// pages/admin/staff/[id].tsx
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { supabase } from "../../../utils/supabaseCliants";
import AdminLayout from "../../../components/AdminLayout";
import { requireAdminAuth } from "../../../utils/authHelpers";

export const getServerSideProps = requireAdminAuth;

interface AttendanceRecord {
  id: number | null;
  work_date: string;
  location_id: number | "";
  shift_start_time: string;
  shift_end_time: string;
  clock_in: string;
  clock_out: string;
  hasChanges: boolean;
}

interface WorkLocation {
  id: number;
  location_name: string;
  start_time: string;
  end_time: string;
}

interface StaffInfo {
  name: string;
  employee_number: string;
}

export default function StaffAttendance({
  admin,
}: {
  admin: { name: string; id: number };
}) {
  const router = useRouter();
  const { id } = router.query;

  const [staffInfo, setStaffInfo] = useState<StaffInfo | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [workLocations, setWorkLocations] = useState<WorkLocation[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });
  const [error, setError] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [changeLogs, setChangeLogs] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      fetchStaffInfo();
      fetchWorkLocations();
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id, selectedMonth]);

  const fetchStaffInfo = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("name, employee_number")
      .eq("id", id)
      .single();

    if (error) {
      console.error("スタッフ情報の取得エラー:", error);
      setError("スタッフ情報の取得中にエラーが発生しました。");
    } else {
      setStaffInfo(data);
    }
  };

  const fetchWorkLocations = async () => {
    const { data } = await supabase
      .from("work_data")
      .select("*")
      .eq("is_deleted", false);
    setWorkLocations(data || []);
  };
  const fetchData = async () => {
    const daysInMonth = new Date(
      Number(selectedMonth.split("-")[0]),
      Number(selectedMonth.split("-")[1]),
      0
    ).getDate();
    const firstDay = `${selectedMonth}-01`;
    const lastDay = `${selectedMonth}-${String(daysInMonth).padStart(2, "0")}`;

    const { data: attendanceData } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("user_id", id)
      .gte("work_date", firstDay)
      .lte("work_date", lastDay);

    const { data: shiftsData } = await supabase
      .from("shifts")
      .select("*, work_data(*)")
      .eq("user_id", id)
      .gte("date", firstDay)
      .lte("date", lastDay);

    const recordsMerged: AttendanceRecord[] = Array.from(
      { length: daysInMonth },
      (_, i) => {
        const dateStr = `${selectedMonth}-${String(i + 1).padStart(2, "0")}`;
        const attendance =
          attendanceData?.find((a) => a.work_date === dateStr) || {};
        const shift = shiftsData?.find((s) => s.date === dateStr) || {};

        return {
          id: attendance.id || null,
          work_date: dateStr,
          location_id: shift.work_data_id || "",
          shift_start_time: shift.start_time || "-",
          shift_end_time: shift.end_time || "-",
          clock_in: attendance.clock_in || "",
          clock_out: attendance.clock_out || "",
          hasChanges: false,
        };
      }
    );

    setRecords(recordsMerged);
  };

  const handleLocationChange = (date: string, locId: number) => {
    const loc = workLocations.find((w) => w.id === locId);
    setRecords((prev) =>
      prev.map((r) =>
        r.work_date === date
          ? {
              ...r,
              location_id: locId,
              shift_start_time: loc?.start_time || "-",
              shift_end_time: loc?.end_time || "-",
              hasChanges: true,
            }
          : r
      )
    );
  };

  const handleInputChange = (
    date: string,
    field: "clock_in" | "clock_out",
    value: string
  ) => {
    setRecords((prev) =>
      prev.map((r) =>
        r.work_date === date ? { ...r, [field]: value, hasChanges: true } : r
      )
    );
  };

  const handleReset = () => {
    if (confirm("すべての変更を破棄して元に戻しますか？")) {
      fetchData();
    }
  };

  const saveRecord = async (rec: AttendanceRecord) => {
    const status = rec.clock_out ? "退勤済み" : rec.clock_in ? "出勤中" : null;

    const { data: prevRec } = await supabase
      .from("attendance_records")
      .select("clock_in, clock_out")
      .eq("id", rec.id)
      .maybeSingle();

    try {
      const { data } = await supabase
        .from("attendance_records")
        .upsert(
          {
            id: rec.id || undefined,
            user_id: id,
            work_date: rec.work_date,
            shift_id: rec.location_id || null,
            clock_in: rec.clock_in || null,
            clock_out: rec.clock_out || null,
            status,
          },
          { onConflict: "user_id,work_date" }
        )
        .select()
        .single();

      await supabase.from("shifts").upsert(
        {
          user_id: id,
          date: rec.work_date,
          work_data_id: rec.location_id,
          start_time:
            rec.shift_start_time !== "-" ? rec.shift_start_time : null,
          end_time: rec.shift_end_time !== "-" ? rec.shift_end_time : null,
        },
        { onConflict: "user_id,date" }
      );

      if (
        prevRec &&
        (prevRec.clock_in !== rec.clock_in ||
          prevRec.clock_out !== rec.clock_out)
      ) {
        await supabase.from("attendance_change_logs").insert({
          attendance_id: data.id,
          user_id: id,
          changed_by: admin.id,
          old_clock_in: prevRec.clock_in,
          new_clock_in: rec.clock_in,
          old_clock_out: prevRec.clock_out,
          new_clock_out: rec.clock_out,
          change_type: "打刻修正",
          changed_at: new Date(),
        });
      }

      alert(`${rec.work_date} を保存しました`);
      fetchData();
    } catch (err) {
      console.error("保存エラー:", err);
      alert("保存に失敗しました。");
    }
  };
  const deleteRecord = async (rec: AttendanceRecord) => {
    if (!confirm(`${rec.work_date} の打刻・シフトを削除しますか？`)) return;
    try {
      await Promise.all([
        rec.id && supabase.from("attendance_records").delete().eq("id", rec.id),
        supabase
          .from("shifts")
          .delete()
          .eq("user_id", id)
          .eq("date", rec.work_date),
      ]);
      alert(`${rec.work_date} を削除しました`);
      fetchData();
    } catch (err) {
      console.error("削除エラー:", err);
      alert("削除に失敗しました。");
    }
  };

  const openLogs = async (attendanceId: number) => {
    const { data } = await supabase
      .from("attendance_change_logs")
      .select("*")
      .eq("attendance_id", attendanceId)
      .order("changed_at", { ascending: false });
    setChangeLogs(data || []);
    setIsModalOpen(true);
  };

  const deleteChangeLog = async (logId: number) => {
    if (!confirm("このログを削除しますか？")) return;
    try {
      await supabase.from("attendance_change_logs").delete().eq("id", logId);
      setChangeLogs((prev) => prev.filter((log) => log.id !== logId));
    } catch (err) {
      console.error("ログ削除エラー:", err);
      alert("ログの削除に失敗しました。");
    }
  };

  return (
    <AdminLayout adminName={admin.name}>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold text-center mb-2">
          打刻履歴とシフト編集
        </h1>
        <p className="text-sm text-gray-600 text-center mb-4">
          ※ シフトが登録されている日だけ打刻を編集できます
        </p>

        {staffInfo && (
          <div className="mb-4 text-center text-lg font-semibold text-gray-700">
            {staffInfo.employee_number} - {staffInfo.name}
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start mb-4 gap-4">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border rounded px-2 py-1"
          />
          <button
            onClick={handleReset}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            リセット
          </button>
        </div>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <div className="overflow-x-auto">
          <table className="table-auto w-full bg-white border border-gray-300 text-sm">
            <thead>
              <tr>
                <th className="border px-2 py-1">日付</th>
                <th className="border px-2 py-1">勤務地</th>
                <th className="border px-2 py-1">シフト開始</th>
                <th className="border px-2 py-1">シフト終了</th>
                <th className="border px-2 py-1">出勤</th>
                <th className="border px-2 py-1">退勤</th>
                <th className="border px-2 py-1">操作</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec) => {
                const editable =
                  rec.shift_start_time !== "-" && rec.shift_end_time !== "-";
                return (
                  <tr key={rec.work_date}>
                    <td className="border px-2 py-1">{rec.work_date}</td>
                    <td className="border px-2 py-1">
                      <select
                        value={rec.location_id}
                        onChange={(e) =>
                          handleLocationChange(rec.work_date, +e.target.value)
                        }
                        className="w-full border rounded"
                      >
                        <option value="">選択</option>
                        {workLocations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.location_name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="border px-2 py-1">{rec.shift_start_time}</td>
                    <td className="border px-2 py-1">{rec.shift_end_time}</td>
                    <td className="border px-2 py-1">
                      <input
                        type="time"
                        value={rec.clock_in}
                        onChange={(e) =>
                          handleInputChange(
                            rec.work_date,
                            "clock_in",
                            e.target.value
                          )
                        }
                        disabled={!editable}
                        className="border rounded w-24 text-center"
                      />
                    </td>
                    <td className="border px-2 py-1">
                      <input
                        type="time"
                        value={rec.clock_out}
                        onChange={(e) =>
                          handleInputChange(
                            rec.work_date,
                            "clock_out",
                            e.target.value
                          )
                        }
                        disabled={!editable}
                        className="border rounded w-24 text-center"
                      />
                    </td>
                    <td className="border px-2 py-1 space-x-2 text-center">
                      {editable && (
                        <>
                          <button
                            onClick={() => saveRecord(rec)}
                            className="bg-blue-500 text-white px-2 py-1 rounded"
                          >
                            保存
                          </button>
                          {rec.id && (
                            <>
                              <button
                                onClick={() => openLogs(rec.id)}
                                className="bg-gray-500 text-white px-2 py-1 rounded"
                              >
                                ログ
                              </button>
                              <button
                                onClick={() => deleteRecord(rec)}
                                className="bg-red-500 text-white px-2 py-1 rounded"
                              >
                                削除
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow-md w-full max-w-md">
              <h2 className="text-lg font-bold mb-4">変更ログ</h2>
              <ul className="space-y-2 max-h-80 overflow-y-auto text-sm">
                {changeLogs.map((log) => (
                  <li key={log.id} className="border-b pb-2">
                    <div>{new Date(log.changed_at).toLocaleString()}</div>
                    <div>
                      出勤: {log.old_clock_in || "-"} →{" "}
                      {log.new_clock_in || "-"}
                    </div>
                    <div>
                      退勤: {log.old_clock_out || "-"} →{" "}
                      {log.new_clock_out || "-"}
                    </div>
                    <button
                      onClick={() => deleteChangeLog(log.id)}
                      className="text-red-500 text-xs mt-1"
                    >
                      このログを削除
                    </button>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setIsModalOpen(false)}
                className="mt-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                閉じる
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
