// src/pages/admin/workData/[id].tsx
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import AdminLayout from "../../../components/AdminLayout";
import { supabase } from "../../../utils/supabaseCliants";
import { requireAdminAuth } from "../../../utils/authHelpers";

export const getServerSideProps = requireAdminAuth;

export default function WorkData({ admin }: { admin: { name: string } }) {
  const router = useRouter();
  const { id } = router.query; // スタッフID
  const [staffInfo, setStaffInfo] = useState<any>(null); // スタッフ情報
  const [workLocation, setWorkLocation] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [hourlyRate, setHourlyRate] = useState("");
  const [workDataList, setWorkDataList] = useState<any[]>([]); // 勤務データ一覧
  const [editingWorkDataId, setEditingWorkDataId] = useState<number | null>(
    null
  ); // 編集中のデータID

  // スタッフ情報を取得する関数
  const fetchStaffInfo = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("name, employee_number")
        .eq("id", id)
        .single();

      if (error) {
        console.error("スタッフ情報取得エラー:", error);
        alert("スタッフ情報の取得に失敗しました。");
      } else {
        setStaffInfo(data);
      }
    } catch (err) {
      console.error("スタッフ情報取得エラー:", err);
    }
  };

  // スタッフの勤務データを取得する関数
  const fetchWorkDataList = async () => {
    try {
      const { data, error } = await supabase
        .from("work_data")
        .select("id, work_location, start_time, end_time, hourly_rate")
        .eq("user_id", id);

      if (error) {
        console.error("勤務データ取得エラー:", error);
        alert("勤務データの取得に失敗しました。");
      } else {
        setWorkDataList(data || []);
      }
    } catch (err) {
      console.error("勤務データ取得エラー:", err);
    }
  };

  useEffect(() => {
    if (id) {
      fetchStaffInfo();
      fetchWorkDataList();
    }
  }, [id]);

  // 勤務データを登録する関数
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingWorkDataId) {
        // 修正処理
        const { error } = await supabase
          .from("work_data")
          .update({
            work_location: workLocation,
            start_time: startTime,
            end_time: endTime,
            hourly_rate: parseFloat(hourlyRate),
          })
          .eq("id", editingWorkDataId);

        if (error) {
          alert("勤務データ修正に失敗しました。");
          console.error(error);
        } else {
          alert("勤務データが修正されました！");
          fetchWorkDataList();
          resetForm();
        }
      } else {
        // 新規登録処理
        const { error } = await supabase.from("work_data").insert([
          {
            user_id: id,
            work_location: workLocation,
            start_time: startTime,
            end_time: endTime,
            hourly_rate: parseFloat(hourlyRate),
          },
        ]);

        if (error) {
          alert("勤務データ登録に失敗しました。");
          console.error(error);
        } else {
          alert("勤務データが登録されました！");
          fetchWorkDataList();
          resetForm();
        }
      }
    } catch (err) {
      console.error("エラー:", err);
      alert("エラーが発生しました。");
    }
  };

  // 勤務データを削除する関数
  const handleDelete = async (workDataId: number) => {
    if (!confirm("この勤務データを削除しますか？")) return;

    try {
      const { error } = await supabase
        .from("work_data")
        .delete()
        .eq("id", workDataId);

      if (error) {
        alert("勤務データ削除に失敗しました。");
        console.error(error);
      } else {
        alert("勤務データが削除されました！");
        fetchWorkDataList();
      }
    } catch (err) {
      console.error("勤務データ削除エラー:", err);
      alert("勤務データ削除中にエラーが発生しました。");
    }
  };

  // 編集用フォームにデータをセットする関数
  const handleEdit = (workData: any) => {
    setEditingWorkDataId(workData.id);
    setWorkLocation(workData.work_location);
    setStartTime(workData.start_time);
    setEndTime(workData.end_time);
    setHourlyRate(String(workData.hourly_rate));
  };

  // フォームをリセットする関数
  const resetForm = () => {
    setEditingWorkDataId(null);
    setWorkLocation("");
    setStartTime("09:00");
    setEndTime("18:00");
    setHourlyRate("");
  };

  return (
    <AdminLayout adminName={admin.name}>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-4">勤務データ登録</h1>
        {staffInfo ? (
          <div className="mb-6">
            <p className="text-lg font-bold">
              登録対象: {staffInfo.employee_number} - {staffInfo.name}
            </p>
          </div>
        ) : (
          <p className="text-red-500 mb-6">スタッフ情報を読み込んでいます...</p>
        )}

        {/* 勤務データ登録フォーム */}
        <form onSubmit={handleSubmit} className="max-w-lg mx-auto">
          <div className="mb-4">
            <label className="block font-bold mb-2">勤務地</label>
            <input
              type="text"
              value={workLocation}
              onChange={(e) => setWorkLocation(e.target.value)}
              className="w-full border px-4 py-2"
              placeholder="勤務地を入力"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block font-bold mb-2">出勤時間</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full border px-4 py-2"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block font-bold mb-2">退勤時間</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full border px-4 py-2"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block font-bold mb-2">時給単価 (円)</label>
            <input
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              className="w-full border px-4 py-2"
              placeholder="時給単価を入力"
              required
            />
          </div>
          <div className="flex gap-4">
            <button
              type="submit"
              className={`${
                editingWorkDataId
                  ? "bg-yellow-500 hover:bg-yellow-600"
                  : "bg-green-500 hover:bg-green-600"
              } text-white px-6 py-2 rounded`}
            >
              {editingWorkDataId ? "修正" : "登録"}
            </button>
            {editingWorkDataId && (
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
              >
                キャンセル
              </button>
            )}
          </div>
        </form>

        {/* 勤務データ一覧 */}
        <h2 className="text-xl font-bold mt-10 mb-4">登録済み勤務データ一覧</h2>
        {workDataList.length > 0 ? (
          <table className="w-full bg-white border-collapse border border-gray-300">
            <thead>
              <tr>
                <th className="border border-gray-300 px-4 py-2">勤務地</th>
                <th className="border border-gray-300 px-4 py-2">出勤時間</th>
                <th className="border border-gray-300 px-4 py-2">退勤時間</th>
                <th className="border border-gray-300 px-4 py-2">時給単価</th>
                <th className="border border-gray-300 px-4 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {workDataList.map((work) => (
                <tr key={work.id}>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    {work.work_location}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    {work.start_time}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    {work.end_time}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    {work.hourly_rate} 円
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(work)}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                      >
                        修正
                      </button>
                      <button
                        onClick={() => handleDelete(work.id)}
                        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                      >
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500">
            登録されている勤務データはありません。
          </p>
        )}
      </div>
    </AdminLayout>
  );
}
