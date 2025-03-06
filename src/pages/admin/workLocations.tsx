// reaclock\src\pages\admin\workLocations.tsx

import { useState, useEffect } from "react";
import { supabase } from "../../utils/supabaseCliants";
import { requireAdminAuth } from "../../utils/authHelpers";
import AdminLayout from "../../components/AdminLayout";

export const getServerSideProps = requireAdminAuth;

export default function WorkLocations({ admin }: { admin: { name: string } }) {
  const [locationName, setLocationName] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [locations, setLocations] = useState<any[]>([]);
  const [statusMessage, setStatusMessage] = useState(""); // ステータスメッセージ

  // 編集中の勤務地用ステート
  const [editingLocationId, setEditingLocationId] = useState<number | null>(
    null
  );
  const [editingLocationName, setEditingLocationName] = useState<string>("");
  const [editingStartTime, setEditingStartTime] = useState<string>("");
  const [editingEndTime, setEditingEndTime] = useState<string>("");

  // 既存の勤務地を取得
  useEffect(() => {
    const fetchLocations = async () => {
      const { data, error } = await supabase.from("work_data").select("*");
      if (error) {
        console.error("勤務地取得エラー:", error.message);
        setStatusMessage(`勤務地の取得に失敗しました: ${error.message}`);
      } else {
        setLocations(data || []);
      }
    };
    fetchLocations();
  }, []);

  // 新規勤務地を登録
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!locationName) {
      setStatusMessage("勤務地名を入力してください。");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("work_data")
        .insert([
          {
            location_name: locationName,
            start_time: startTime,
            end_time: endTime,
            is_deleted: false, // 論理削除用フラグの初期値
          },
        ])
        .select();

      if (error) {
        console.error("勤務地登録エラー:", error.message);
        setStatusMessage(`登録に失敗しました: ${error.message}`);
      } else {
        setStatusMessage("✅ 勤務地が登録されました！");
        setLocations([...locations, data[0]]);
        setLocationName("");
        setStartTime("09:00");
        setEndTime("18:00");
      }
    } catch (err) {
      console.error("ネットワークエラー:", err);
      setStatusMessage("ネットワークエラーが発生しました。");
    }
  };

  // 勤務地データの削除処理
  const handleDelete = async (workDataId: number) => {
    if (!confirm("この勤務地を削除しますか？")) return;

    try {
      // まず、shiftsテーブルで参照されているかチェック
      const { data: shiftData, error: shiftError } = await supabase
        .from("shifts")
        .select("id")
        .eq("work_location_id", workDataId);

      if (shiftError) {
        console.error("シフト参照チェックエラー:", shiftError.message);
        return;
      }

      // 次に、user_hourly_ratesテーブルで参照されているかチェック
      const { data: rateData, error: rateError } = await supabase
        .from("user_hourly_rates")
        .select("id")
        .eq("work_location_id", workDataId);

      if (rateError) {
        console.error("時給参照チェックエラー:", rateError.message);
        return;
      }

      const isReferenced =
        (shiftData && shiftData.length > 0) ||
        (rateData && rateData.length > 0);

      if (isReferenced) {
        // 論理削除処理
        const { error } = await supabase
          .from("work_data")
          .update({ is_deleted: true })
          .eq("id", workDataId);

        if (error) {
          alert("論理削除に失敗しました。");
          console.error("論理削除エラー:", error.message);
        } else {
          alert("この勤務地は他画面で使用されているため、論理削除しました。");
          // state 更新：対象レコードに is_deleted を反映
          setLocations(
            locations.map((loc) =>
              loc.id === workDataId ? { ...loc, is_deleted: true } : loc
            )
          );
        }
      } else {
        // 物理削除
        const { error } = await supabase
          .from("work_data")
          .delete()
          .eq("id", workDataId);

        if (error) {
          alert("削除に失敗しました。");
          console.error("削除エラー:", error.message);
        } else {
          alert("勤務地が完全に削除されました！");
          setLocations(locations.filter((loc) => loc.id !== workDataId));
        }
      }
    } catch (err) {
      console.error("削除処理中のエラー:", err);
      alert("ネットワークエラーが発生しました。");
    }
  };

  // 編集モードに切り替え
  const startEditingLocation = (loc: any) => {
    setEditingLocationId(loc.id);
    setEditingLocationName(loc.location_name);
    setEditingStartTime(loc.start_time);
    setEditingEndTime(loc.end_time);
  };

  // 編集キャンセル
  const cancelEditing = () => {
    setEditingLocationId(null);
    setEditingLocationName("");
    setEditingStartTime("");
    setEditingEndTime("");
  };

  // 保存（編集）処理：勤務地名、出勤時間、退勤時間を更新
  const handleSaveLocation = async (locId: number) => {
    if (!editingLocationName) {
      setStatusMessage("勤務地名を入力してください。");
      return;
    }
    try {
      const { data, error } = await supabase
        .from("work_data")
        .update({
          location_name: editingLocationName,
          start_time: editingStartTime,
          end_time: editingEndTime,
        })
        .eq("id", locId)
        .select();

      if (error) {
        console.error("勤務地更新エラー:", error.message);
        setStatusMessage(`更新に失敗しました: ${error.message}`);
      } else {
        setStatusMessage("✅ 勤務地が更新されました！");
        setLocations(
          locations.map((loc) => {
            if (loc.id === locId) {
              return {
                ...loc,
                location_name: editingLocationName,
                start_time: editingStartTime,
                end_time: editingEndTime,
              };
            }
            return loc;
          })
        );
        cancelEditing();
      }
    } catch (err) {
      console.error("ネットワークエラー:", err);
      setStatusMessage("ネットワークエラーが発生しました。");
    }
  };

  return (
    <AdminLayout adminName={admin.name}>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-4">勤務地情報登録</h1>

        <form onSubmit={handleSubmit} className="max-w-lg mx-auto">
          {/* 勤務地名 */}
          <div className="mb-4">
            <label className="block font-bold mb-2">勤務地名</label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="w-full px-4 py-2 border rounded"
              required
            />
          </div>

          {/* 出勤時間 */}
          <div className="mb-4">
            <label className="block font-bold mb-2">出勤時間</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-4 py-2 border rounded"
              required
            />
          </div>

          {/* 退勤時間 */}
          <div className="mb-4">
            <label className="block font-bold mb-2">退勤時間</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-4 py-2 border rounded"
              required
            />
          </div>

          {/* ステータスメッセージ */}
          {statusMessage && (
            <p
              className={`mb-4 text-center ${
                statusMessage.includes("✅") ? "text-green-500" : "text-red-500"
              }`}
            >
              {statusMessage}
            </p>
          )}

          {/* 登録ボタン */}
          <button
            type="submit"
            className="w-full px-4 py-2 text-white bg-green-500 rounded hover:bg-green-600"
          >
            登録
          </button>
        </form>

        {/* 登録済み勤務地一覧 */}
        <h2 className="text-xl font-bold mt-10 mb-4">登録済み勤務地</h2>
        <ul>
          {locations.length > 0 ? (
            locations.map((loc) => (
              <li
                key={loc.id}
                className={`border-b py-2 flex justify-between items-center ${
                  loc.is_deleted ? "opacity-50" : ""
                }`}
              >
                {editingLocationId === loc.id ? (
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={editingLocationName}
                        onChange={(e) => setEditingLocationName(e.target.value)}
                        className="border px-2 py-1 rounded"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="time"
                        value={editingStartTime}
                        onChange={(e) => setEditingStartTime(e.target.value)}
                        className="border px-2 py-1 rounded"
                      />
                      <span>-</span>
                      <input
                        type="time"
                        value={editingEndTime}
                        onChange={(e) => setEditingEndTime(e.target.value)}
                        className="border px-2 py-1 rounded"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleSaveLocation(loc.id)}
                        className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                      >
                        保存
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="bg-gray-400 text-white px-3 py-1 rounded hover:bg-gray-500"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center w-full">
                    <span>
                      {loc.location_name}
                      {loc.is_deleted && "（削除済み）"} ({loc.start_time} -{" "}
                      {loc.end_time})
                    </span>
                    <div className="flex space-x-2">
                      {!loc.is_deleted && (
                        <button
                          onClick={() => startEditingLocation(loc)}
                          className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                        >
                          編集
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(loc.id)}
                        className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))
          ) : (
            <p className="text-gray-500">登録された勤務地はありません。</p>
          )}
        </ul>
      </div>
    </AdminLayout>
  );
}
