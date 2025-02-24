import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import AdminLayout from "../../../components/AdminLayout";
import { supabase } from "../../../utils/supabaseCliants";
import { requireAdminAuth } from "../../../utils/authHelpers";

export const getServerSideProps = requireAdminAuth;

export default function WorkData({ admin }: { admin: { name: string } }) {
  const router = useRouter();
  const { id } = router.query; // スタッフID
  const [staffInfo, setStaffInfo] = useState<any>(null);
  const [workLocations, setWorkLocations] = useState<any[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [existingRates, setExistingRates] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      fetchStaffInfo();
      fetchWorkLocations();
      fetchUserHourlyRates();
    }
  }, [id]);

  // スタッフ情報取得
  const fetchStaffInfo = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("name, employee_number")
      .eq("id", id)
      .single();

    if (error) {
      console.error("スタッフ情報取得エラー:", error);
    } else {
      setStaffInfo(data);
    }
  };

  // 勤務地情報取得
  const fetchWorkLocations = async () => {
    const { data, error } = await supabase
      .from("work_data")
      .select("id, location_name");

    if (error) {
      console.error("勤務地情報取得エラー:", error);
    } else {
      setWorkLocations(data || []);
    }
  };

  // 既存の時給データを取得
  const fetchUserHourlyRates = async () => {
    const { data, error } = await supabase
      .from("user_hourly_rates")
      .select("id, work_location_id, hourly_rate")
      .eq("user_id", id);

    if (error) {
      console.error("時給情報取得エラー:", error);
    } else {
      setExistingRates(data || []);
    }
  };

  // 勤務データ登録
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase.from("user_hourly_rates").insert([
        {
          user_id: id,
          work_location_id: selectedLocationId,
          hourly_rate: parseFloat(hourlyRate),
        },
      ]);

      if (error) {
        alert("登録に失敗しました。");
        console.error(error);
      } else {
        alert("勤務データを登録しました！");
        setSelectedLocationId("");
        setHourlyRate("");
        fetchUserHourlyRates(); // 更新
      }
    } catch (err) {
      console.error("エラー:", err);
      alert("エラーが発生しました。");
    }
  };

  // ✅ 勤務データ（時給）を削除する関数
  const handleDeleteHourlyRate = async (rateId: number) => {
    if (!confirm("この勤務データを削除しますか？")) return;

    try {
      const { error } = await supabase
        .from("user_hourly_rates")
        .delete()
        .eq("id", rateId);

      if (error) {
        alert("削除に失敗しました。");
        console.error("削除エラー:", error);
      } else {
        alert("勤務データが削除されました！");
        fetchUserHourlyRates(); // 削除後に一覧を更新
      }
    } catch (err) {
      console.error("削除エラー:", err);
      alert("ネットワークエラーが発生しました。");
    }
  };

  return (
    <AdminLayout adminName={admin.name}>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-4">勤務データ登録</h1>

        {staffInfo && (
          <p className="text-lg font-bold">
            対象: {staffInfo.employee_number} - {staffInfo.name}
          </p>
        )}

        <form onSubmit={handleSubmit} className="max-w-lg mx-auto">
          <div className="mb-4">
            <label className="block font-bold mb-2">勤務地</label>
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="w-full border px-4 py-2"
              required
            >
              <option value="">勤務地を選択</option>
              {workLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.location_name}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label className="block font-bold mb-2">時給</label>
            <input
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              className="w-full border px-4 py-2"
              required
            />
          </div>
          <button
            type="submit"
            className="bg-green-500 text-white px-6 py-2 rounded"
          >
            登録
          </button>
        </form>

        {/* 既存の勤務地ごとの時給リスト */}
        <h2 className="text-xl font-bold mt-10 mb-4">既存の勤務データ</h2>
        {existingRates.length > 0 ? (
          <ul>
            {existingRates.map((rate) => {
              const location = workLocations.find(
                (loc) => loc.id === rate.work_location_id
              );
              return (
                <li
                  key={rate.id}
                  className="border-b py-2 flex justify-between items-center"
                >
                  <span>
                    {location ? location.location_name : "不明な勤務地"}:
                    <span className="ml-2">{rate.hourly_rate} 円</span>
                  </span>
                  {/* ✅ 削除ボタンを追加 */}
                  <button
                    onClick={() => handleDeleteHourlyRate(rate.id)}
                    className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600"
                  >
                    削除
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-gray-500">登録された勤務データがありません。</p>
        )}
      </div>
    </AdminLayout>
  );
}
