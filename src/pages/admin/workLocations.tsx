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

  // 既存の勤務地を取得
  useEffect(() => {
    const fetchLocations = async () => {
      const { data, error } = await supabase.from("work_data").select("*"); // 修正
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
          },
        ])
        .select(); // 挿入したデータを取得

      if (error) {
        console.error("勤務地登録エラー:", error.message);
        setStatusMessage(`登録に失敗しました: ${error.message}`);
      } else {
        setStatusMessage("✅ 勤務地が登録されました！");

        // 新規登録した勤務地を一覧に追加
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

  // ✅ 勤務地データを削除する関数
  const handleDelete = async (workDataId: number) => {
    if (!confirm("この勤務地を削除しますか？")) return;

    try {
      const { error } = await supabase
        .from("work_data")
        .delete()
        .eq("id", workDataId);

      if (error) {
        alert("削除に失敗しました。");
        console.error("削除エラー:", error.message);
      } else {
        setStatusMessage("✅ 勤務地が削除されました！");

        // 削除後に state を更新
        setLocations(locations.filter((loc) => loc.id !== workDataId));
      }
    } catch (err) {
      console.error("削除処理中のエラー:", err);
      alert("ネットワークエラーが発生しました。");
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
                className="border-b py-2 flex justify-between items-center"
              >
                <span>
                  {loc.location_name} ({loc.start_time} - {loc.end_time})
                </span>
                {/* ✅ 削除ボタンを追加 */}
                <button
                  onClick={() => handleDelete(loc.id)}
                  className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600"
                >
                  削除
                </button>
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
