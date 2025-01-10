// src/pages/admin/shiftRegister/[id].tsx
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import AdminLayout from "../../../components/AdminLayout";
import { supabase } from "../../../utils/supabaseCliants";
import { requireAdminAuth } from "../../../utils/authHelpers";

export const getServerSideProps = requireAdminAuth;

export default function ShiftCalendar({ admin }: { admin: { name: string } }) {
  const router = useRouter();
  const { id } = router.query;
  const [staffInfo, setStaffInfo] = useState<any>(null);
  const [workData, setWorkData] = useState<any[]>([]);
  const [shiftData, setShiftData] = useState<any[]>([]);
  const [originalShiftData, setOriginalShiftData] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });

  const daysInMonth = (month: string) => {
    const [year, monthIndex] = month.split("-").map(Number);
    return new Date(year, monthIndex, 0).getDate();
  };

  const fetchStaffInfo = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("name, employee_number")
        .eq("id", id)
        .single();

      if (error) throw error;
      setStaffInfo(data);
    } catch (err) {
      console.error("スタッフ情報取得エラー:", err);
      alert("スタッフ情報の取得に失敗しました。");
    }
  };

  const fetchWorkData = async () => {
    try {
      const { data, error } = await supabase
        .from("work_data")
        .select("id, work_location, start_time, end_time, hourly_rate")
        .eq("user_id", id);

      if (error) throw error;
      setWorkData(data || []);
    } catch (err) {
      console.error("勤務データ取得エラー:", err);
    }
  };

  const fetchShiftData = async () => {
    try {
      const { data, error } = await supabase
        .from("shifts")
        .select("id, work_data_id, date, start_time, end_time, hourly_rate")
        .eq("user_id", id)
        .gte("date", `${selectedMonth}-01`)
        .lte(
          "date",
          `${selectedMonth}-${String(daysInMonth(selectedMonth)).padStart(
            2,
            "0"
          )}`
        );

      if (error) throw error;
      setShiftData(data || []);
      setOriginalShiftData(data || []);
    } catch (err) {
      console.error("シフトデータ取得エラー:", err);
    }
  };

  const handleShiftChange = (
    day: number,
    field: "workData" | "startTime" | "endTime" | "hourlyRate",
    value: string
  ) => {
    const date = `${selectedMonth}-${String(day).padStart(2, "0")}`;
    const existingShift = shiftData.find((shift) => shift.date === date);

    if (field === "workData" && value === "") {
      setShiftData((prev) =>
        prev.map((shift) =>
          shift.date === date
            ? {
                ...shift,
                work_data_id: null,
                start_time: null,
                end_time: null,
                hourly_rate: null,
              }
            : shift
        )
      );
    } else {
      if (existingShift) {
        setShiftData((prev) =>
          prev.map((shift) =>
            shift.date === date
              ? {
                  ...shift,
                  ...(field === "workData" && {
                    work_data_id: parseInt(value),
                    start_time:
                      workData.find((work) => work.id === parseInt(value))
                        ?.start_time || "",
                    end_time:
                      workData.find((work) => work.id === parseInt(value))
                        ?.end_time || "",
                    hourly_rate:
                      workData.find((work) => work.id === parseInt(value))
                        ?.hourly_rate || "",
                  }),
                  ...(field === "startTime" && { start_time: value }),
                  ...(field === "endTime" && { end_time: value }),
                  ...(field === "hourlyRate" && {
                    hourly_rate: parseFloat(value),
                  }),
                }
              : shift
          )
        );
      } else {
        setShiftData((prev) => [
          ...prev,
          {
            user_id: id,
            date,
            ...(field === "workData" && {
              work_data_id: parseInt(value),
              start_time:
                workData.find((work) => work.id === parseInt(value))
                  ?.start_time || "",
              end_time:
                workData.find((work) => work.id === parseInt(value))
                  ?.end_time || "",
              hourly_rate:
                workData.find((work) => work.id === parseInt(value))
                  ?.hourly_rate || "",
            }),
            ...(field === "startTime" && { start_time: value }),
            ...(field === "endTime" && { end_time: value }),
            ...(field === "hourlyRate" && { hourly_rate: parseFloat(value) }),
          },
        ]);
      }
    }
  };

  const saveShifts = async () => {
    try {
      for (const shift of shiftData) {
        if (!shift.work_data_id) {
          if (shift.id) {
            // 削除対象のデータ
            const { error } = await supabase
              .from("shifts")
              .delete()
              .eq("id", shift.id);
            if (error) throw error;
          }
          continue; // 空のシフトはスキップ
        }

        const existingShift = originalShiftData.find(
          (orig) => orig.date === shift.date
        );

        if (existingShift) {
          // 同じ日付のデータがすでに存在する場合は更新
          if (
            shift.work_data_id !== existingShift.work_data_id ||
            shift.start_time !== existingShift.start_time ||
            shift.end_time !== existingShift.end_time ||
            shift.hourly_rate !== existingShift.hourly_rate
          ) {
            const { error } = await supabase
              .from("shifts")
              .update({
                work_data_id: shift.work_data_id,
                start_time: shift.start_time,
                end_time: shift.end_time,
                hourly_rate: shift.hourly_rate,
              })
              .eq("id", existingShift.id);

            if (error) throw error;
          }
        } else {
          // 新規挿入
          const { error } = await supabase.from("shifts").insert({
            user_id: shift.user_id,
            date: shift.date,
            work_data_id: shift.work_data_id,
            start_time: shift.start_time,
            end_time: shift.end_time,
            hourly_rate: shift.hourly_rate,
          });
          if (error) throw error;
        }
      }

      alert("シフトが更新されました！");
      setOriginalShiftData([...shiftData]); // 保存後に現在のシフトを元データとしてセット
    } catch (err) {
      console.error("シフト保存エラー:", err);
      alert("シフト保存中にエラーが発生しました。");
    }
  };

  const resetShifts = () => {
    setShiftData([...originalShiftData]);
  };

  useEffect(() => {
    if (id) {
      fetchStaffInfo();
      fetchWorkData();
      fetchShiftData();
    }
  }, [id, selectedMonth]);

  const days = Array.from(
    { length: daysInMonth(selectedMonth) },
    (_, i) => i + 1
  );

  return (
    <AdminLayout adminName={admin.name}>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">シフト登録</h1>
        {staffInfo ? (
          <div className="mb-6">
            <p className="text-lg font-bold">
              登録対象: {staffInfo.employee_number} - {staffInfo.name}
            </p>
          </div>
        ) : (
          <p className="text-red-500 mb-6">スタッフ情報を読み込んでいます...</p>
        )}
        <div className="mb-6">
          <label className="block font-bold mb-2">月を選択</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border px-4 py-2 w-full sm:w-auto"
          />
        </div>

        {staffInfo && (
          <>
            <table className="w-full bg-white border-collapse border border-gray-300">
              <thead>
                <tr>
                  <th className="border border-gray-300 px-4 py-2">日付</th>
                  <th className="border border-gray-300 px-4 py-2">勤務地</th>
                  <th className="border border-gray-300 px-4 py-2">出勤時間</th>
                  <th className="border border-gray-300 px-4 py-2">退勤時間</th>
                  <th className="border border-gray-300 px-4 py-2">時給単価</th>
                </tr>
              </thead>
              <tbody>
                {days.map((day) => {
                  const date = `${selectedMonth}-${String(day).padStart(
                    2,
                    "0"
                  )}`;
                  const shift = shiftData.find((s) => s.date === date) || {};
                  const workDataId = shift.work_data_id || null;
                  const isDisabled = !workDataId;
                  return (
                    <tr key={day}>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        {date}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        <select
                          value={workDataId || ""}
                          onChange={(e) =>
                            handleShiftChange(day, "workData", e.target.value)
                          }
                          className="border px-2 py-1 w-full"
                        >
                          <option value="">-</option>
                          {workData.map((work) => (
                            <option key={work.id} value={work.id}>
                              {work.work_location}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        <input
                          type="time"
                          value={shift.start_time || ""}
                          onChange={(e) =>
                            handleShiftChange(day, "startTime", e.target.value)
                          }
                          className="border px-2 py-1 w-full"
                          disabled={isDisabled}
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        <input
                          type="time"
                          value={shift.end_time || ""}
                          onChange={(e) =>
                            handleShiftChange(day, "endTime", e.target.value)
                          }
                          className="border px-2 py-1 w-full"
                          disabled={isDisabled}
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        <input
                          type="number"
                          value={shift.hourly_rate || ""}
                          onChange={(e) =>
                            handleShiftChange(day, "hourlyRate", e.target.value)
                          }
                          className="border px-2 py-1 w-full"
                          disabled={isDisabled}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex mt-6 gap-4">
              <button
                onClick={saveShifts}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                更新
              </button>
              <button
                onClick={resetShifts}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                リセット
              </button>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
