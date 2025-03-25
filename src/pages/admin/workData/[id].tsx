// reaclock/src/pages/admin/workData/[id].tsx

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import AdminLayout from "../../../components/AdminLayout";
import { supabase } from "../../../utils/supabaseCliants";
import { requireAdminAuth } from "../../../utils/authHelpers";

export const getServerSideProps = requireAdminAuth;

export default function WorkData({ admin }: { admin: { name: string } }) {
  const router = useRouter();
  const { id } = router.query; // スタッフID

  // スタッフ情報（usersテーブル）
  const [staffInfo, setStaffInfo] = useState<any>(null);
  // work_dataから取得した勤務地情報（デフォルト時給も含む）
  const [workLocations, setWorkLocations] = useState<any[]>([]);
  // user_hourly_ratesから取得した各勤務地ごとのスタッフ個別の時給（work_location_idをキーとする）
  const [hourlyRates, setHourlyRates] = useState<Record<number, number>>({});
  // 編集用の入力値を保持する state（キーは work_location_id）
  const [editingRates, setEditingRates] = useState<Record<number, string>>({});

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

  // 勤務地情報取得（論理削除フラグとデフォルト時給も取得）
  const fetchWorkLocations = async () => {
    const { data, error } = await supabase
      .from("work_data")
      .select("id, location_name, is_deleted, hourly_rate");

    if (error) {
      console.error("勤務地情報取得エラー:", error);
    } else {
      setWorkLocations(data || []);
    }
  };

  // ユーザーごとの時給データ取得（user_hourly_ratesテーブル）
  const fetchUserHourlyRates = async () => {
    const { data, error } = await supabase
      .from("user_hourly_rates")
      .select("id, work_location_id, hourly_rate")
      .eq("user_id", id);

    if (error) {
      console.error("時給情報取得エラー:", error);
    } else {
      // work_location_id をキーとして、hourly_rate をマッピング
      const ratesMap: Record<number, number> = {};
      (data || []).forEach((rate: any) => {
        ratesMap[rate.work_location_id] = rate.hourly_rate;
      });
      setHourlyRates(ratesMap);
    }
  };

  // 編集用入力値の変更ハンドラー
  const handleRateChange = (workLocationId: number, value: string) => {
    setEditingRates((prev) => ({ ...prev, [workLocationId]: value }));
  };

  // 時給更新処理（既存レコードの更新または新規登録）
  const handleSaveRate = async (workLocationId: number) => {
    const newRate = parseFloat(editingRates[workLocationId]);
    if (isNaN(newRate)) {
      alert("有効な時給を入力してください。");
      return;
    }

    // 既にレコードがあるかチェック
    const { data, error } = await supabase
      .from("user_hourly_rates")
      .select("id")
      .eq("user_id", id)
      .eq("work_location_id", workLocationId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("レコード確認エラー:", error);
      alert("エラーが発生しました。");
      return;
    }

    if (data) {
      // 既存レコードがあれば更新
      const { error: updateError } = await supabase
        .from("user_hourly_rates")
        .update({ hourly_rate: newRate })
        .eq("id", data.id);
      if (updateError) {
        console.error("時給更新エラー:", updateError);
        alert("時給の更新に失敗しました。");
        return;
      }
    } else {
      // レコードがなければ新規登録
      const { error: insertError } = await supabase
        .from("user_hourly_rates")
        .insert([
          {
            user_id: id,
            work_location_id: workLocationId,
            hourly_rate: newRate,
          },
        ]);
      if (insertError) {
        console.error("時給登録エラー:", insertError);
        alert("時給の登録に失敗しました。");
        return;
      }
    }
    // state の更新
    setHourlyRates((prev) => ({ ...prev, [workLocationId]: newRate }));
    setEditingRates((prev) => ({ ...prev, [workLocationId]: "" }));
    alert("時給が更新されました！");
  };

  // 時給データ削除
  const handleDeleteRate = async (workLocationId: number) => {
    if (!confirm("この勤務データを削除しますか？")) return;

    const { error } = await supabase
      .from("user_hourly_rates")
      .delete()
      .eq("user_id", id)
      .eq("work_location_id", workLocationId);
    if (error) {
      console.error("時給データ削除エラー:", error);
      alert("削除に失敗しました。");
      return;
    }
    // state 更新：該当キーを削除
    setHourlyRates((prev) => {
      const updated = { ...prev };
      delete updated[workLocationId];
      return updated;
    });
    alert("勤務データが削除されました！");
  };

  return (
    <AdminLayout adminName={admin.name}>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-4">時給編集画面</h1>

        {staffInfo && (
          <p className="text-lg font-bold">
            対象: {staffInfo.employee_number} - {staffInfo.name}
          </p>
        )}

        <h2 className="text-xl font-bold mt-6 mb-4">勤務地ごとの時給</h2>
        <ul>
          {workLocations.length > 0 ? (
            workLocations.map((loc) => {
              const defaultRate = loc.hourly_rate;
              const staffRate = hourlyRates[loc.id];
              const isEditing =
                editingRates.hasOwnProperty(loc.id) &&
                editingRates[loc.id] !== "";
              return (
                <li
                  key={loc.id}
                  className="border-b py-2 flex justify-between items-center"
                >
                  <div>
                    <span className="font-bold">
                      {loc.is_deleted
                        ? `${loc.location_name}（削除済み）`
                        : loc.location_name}
                    </span>
                    ：
                    {staffRate !== undefined && staffRate !== defaultRate ? (
                      <span className="text-blue-600">
                        {staffRate}円（デフォルト：{defaultRate}円）
                      </span>
                    ) : (
                      <span className="text-black">
                        {defaultRate !== undefined
                          ? `${defaultRate}円（デフォルトの時給）`
                          : "未登録"}
                      </span>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      value={editingRates[loc.id] || ""}
                      onChange={(e) => handleRateChange(loc.id, e.target.value)}
                      className="border px-2 py-1 rounded w-24"
                      placeholder="新時給"
                    />
                    <button
                      onClick={() => handleSaveRate(loc.id)}
                      className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => handleDeleteRate(loc.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                    >
                      削除
                    </button>
                  </div>
                </li>
              );
            })
          ) : (
            <p className="text-gray-500">登録された勤務地情報がありません。</p>
          )}
        </ul>
      </div>
    </AdminLayout>
  );
}
