// reaclock/src/pages/admin/shiftRegister/[id].tsx

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
  // workData: 全勤務地情報（デフォルト時給、編集済み時給の有無を含む）
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

  interface UserHourlyRates {
    id: number;
    hourly_rate: number;
  }

  interface ShiftDataType {
    id: number;
    work_data_id: number;
    user_hourly_rate_id: number | null;
    date: string;
    start_time: string;
    end_time: string;
    user_hourly_rates: UserHourlyRates[];
    hourly_rate: number;
  }

  // 指定した月の末日を返す
  const daysInMonth = (month: string) => {
    const [year, monthIndex] = month.split("-").map(Number);
    return new Date(year, monthIndex, 0).getDate();
  };

  // スタッフ情報取得
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

  /**
   * 全ての勤務地情報を取得し、ユーザー個別の時給がある場合はそれを優先する
   */
  const fetchWorkData = async () => {
    try {
      // ① 全勤務地
      const { data: allLocations, error: locErr } = await supabase
        .from("work_data")
        .select(
          "id, location_name, start_time, end_time, hourly_rate, is_deleted"
        );
      if (locErr) throw locErr;

      // ② ユーザー個別の時給データ
      const { data: userRates, error: rateErr } = await supabase
        .from("user_hourly_rates")
        .select("work_location_id, hourly_rate, id")
        .eq("user_id", id);
      if (rateErr) throw rateErr;

      // userRates を work_location_id キーのマップにする
      const userRatesMap: Record<number, { hourly_rate: number; id: number }> =
        {};
      (userRates || []).forEach((rate: any) => {
        userRatesMap[rate.work_location_id] = {
          hourly_rate: rate.hourly_rate,
          id: rate.id,
        };
      });

      // ③ マージ
      const merged = (allLocations || []).map((loc: any) => {
        const userRate = userRatesMap[loc.id];
        return {
          id: loc.id,
          location_name: loc.is_deleted
            ? `${loc.location_name}（削除済み）`
            : loc.location_name,
          start_time: loc.start_time || "00:00",
          end_time: loc.end_time || "00:00",
          default_hourly_rate: loc.hourly_rate,
          hourly_rate: userRate ? userRate.hourly_rate : loc.hourly_rate,
          isDefault: userRate ? false : true,
          user_hourly_rate_id: userRate ? userRate.id : null,
          is_deleted: loc.is_deleted,
        };
      });

      setWorkData(merged);
    } catch (err) {
      console.error("勤務データ取得エラー:", err);
      alert("勤務地情報の取得中にエラーが発生しました。");
    }
  };

  /**
   * shifts テーブルから当月のシフトを取得
   */
  const fetchShiftData = async () => {
    try {
      const lastDay = daysInMonth(selectedMonth);
      const { data, error } = await supabase
        .from("shifts")
        .select(
          `
          id,
          work_data_id,
          user_hourly_rate_id,
          date,
          start_time,
          end_time,
          user_hourly_rates!fk_shifts_user_hourly_rate(
            id,
            hourly_rate
          )
        `
        )
        .eq("user_id", id)
        .gte("date", `${selectedMonth}-01`)
        .lte("date", `${selectedMonth}-${String(lastDay).padStart(2, "0")}`);
      if (error) throw error;

      const formattedData: ShiftDataType[] = (data || []).map((item: any) => {
        const arrayRate = Array.isArray(item.user_hourly_rates)
          ? item.user_hourly_rates[0]?.hourly_rate ?? 0
          : item.user_hourly_rates?.hourly_rate ?? 0;
        return {
          ...item,
          hourly_rate: arrayRate,
        };
      });

      setShiftData(formattedData);
      setOriginalShiftData(formattedData);
    } catch (err) {
      console.error("シフトデータ取得エラー:", err);
      alert("シフトデータ取得中にエラーが発生しました。");
    }
  };

  /**
   * シフト画面の UI 変更を shiftData に反映
   */
  const handleShiftChange = (
    day: number,
    field: "workData" | "startTime" | "endTime" | "hourlyRate",
    value: string
  ) => {
    const date = `${selectedMonth}-${String(day).padStart(2, "0")}`;
    const existingShift = shiftData.find((shift) => shift.date === date);

    if (field === "workData") {
      // 勤務地を選択
      const selectedLoc = workData.find((wd) => wd.id === Number(value));
      if (!selectedLoc) return;

      const updatedShift = {
        work_data_id: Number(value),
        user_hourly_rate_id: selectedLoc.user_hourly_rate_id,
        start_time: selectedLoc.start_time,
        end_time: selectedLoc.end_time,
        hourly_rate: selectedLoc.hourly_rate,
      };

      if (existingShift) {
        setShiftData((prev) =>
          prev.map((shift) =>
            shift.date === date ? { ...shift, ...updatedShift } : shift
          )
        );
      } else {
        setShiftData((prev) => [
          ...prev,
          { user_id: id, date, ...updatedShift },
        ]);
      }
    } else if (field === "startTime") {
      if (existingShift) {
        setShiftData((prev) =>
          prev.map((shift) =>
            shift.date === date ? { ...shift, start_time: value } : shift
          )
        );
      } else {
        setShiftData((prev) => [
          ...prev,
          { user_id: id, date, start_time: value },
        ]);
      }
    } else if (field === "endTime") {
      if (existingShift) {
        setShiftData((prev) =>
          prev.map((shift) =>
            shift.date === date ? { ...shift, end_time: value } : shift
          )
        );
      } else {
        setShiftData((prev) => [
          ...prev,
          { user_id: id, date, end_time: value },
        ]);
      }
    } else if (field === "hourlyRate") {
      if (existingShift) {
        setShiftData((prev) =>
          prev.map((shift) =>
            shift.date === date
              ? { ...shift, hourly_rate: Number(value) }
              : shift
          )
        );
      } else {
        setShiftData((prev) => [
          ...prev,
          { user_id: id, date, hourly_rate: Number(value) },
        ]);
      }
    }
  };

  /**
   * DB保存
   */
  const saveShifts = async () => {
    try {
      await Promise.all(
        shiftData.map(async (shift) => {
          if (!shift.work_data_id) return;

          const existingShift = originalShiftData.find(
            (orig) => orig.date === shift.date
          );

          const shiftPayload = {
            work_data_id: shift.work_data_id,
            user_hourly_rate_id: shift.user_hourly_rate_id,
            start_time: shift.start_time,
            end_time: shift.end_time,
          };

          if (existingShift && existingShift.id) {
            const { error } = await supabase
              .from("shifts")
              .update(shiftPayload)
              .eq("id", existingShift.id);
            if (error) throw error;
          } else {
            const { error } = await supabase.from("shifts").insert({
              user_id: id,
              date: shift.date,
              ...shiftPayload,
            });
            if (error) throw error;
          }
        })
      );
      alert("シフトが更新されました！");
      setOriginalShiftData([...shiftData]);
    } catch (err) {
      console.error("シフト保存エラー:", err);
      alert("シフト保存中にエラーが発生しました。");
    }
  };

  /**
   * リセット
   */
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

        {/* 注釈を追加 */}
        <div className="mb-4 text-sm text-gray-600">
          ※<strong>（勤務地名）⚠️</strong>
          は個別の時給が設定されている際に表示されます。
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
                  const workDataId = shift.work_data_id || "";
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
                          {workData.map((wd) => {
                            // 個別時給設定があるかどうかで表示を変える
                            const displayText = wd.isDefault
                              ? `${wd.location_name}`
                              : `${wd.location_name} ⚠️`;

                            return (
                              <option key={wd.id} value={wd.id}>
                                {displayText}
                              </option>
                            );
                          })}
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
