// /src/pages/admin/editStaff/[id].tsx

import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { supabase } from "../../../utils/supabaseCliants";
import AdminLayout from "../../../components/AdminLayout";

export default function EditStaff() {
  const router = useRouter();
  const { id } = router.query; // URLパラメータからスタッフIDを取得
  const [staff, setStaff] = useState<any>({ name: "" });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  // スタッフ情報を取得
  const fetchStaffData = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("name")
      .eq("id", id)
      .single();

    if (error) {
      setError("スタッフ情報の取得に失敗しました。");
      console.error(error);
      return;
    }
    setStaff(data || {});
  };

  useEffect(() => {
    if (id) {
      fetchStaffData();
    }
  }, [id]);

  // スタッフ情報を更新
  const handleUpdate = async () => {
    if (password !== confirmPassword) {
      alert("パスワードが一致しません。");
      return;
    }

    try {
      const response = await fetch("/api/admin/updateStaff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: staff.name, password }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message || "スタッフ情報を更新しました！");
        router.push("/admin/staffList"); // スタッフ一覧画面に戻る
      } else {
        alert(data.error || "スタッフ情報の更新に失敗しました。");
      }
    } catch (error) {
      console.error("更新エラー:", error);
      alert("更新中にエラーが発生しました。");
    }
  };

  return (
    <AdminLayout adminName="管理者">
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-4">社員情報編集</h1>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <div className="space-y-4">
          {/* 名前入力欄 */}
          <div>
            <label className="block font-bold mb-2">名前</label>
            <input
              type="text"
              value={staff.name}
              onChange={(e) => setStaff({ ...staff, name: e.target.value })}
              placeholder="名前"
              className="w-full border px-4 py-2"
            />
          </div>

          {/* パスワード入力欄 */}
          <div>
            <label className="block font-bold mb-2">新しいパスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワードを入力"
              className="w-full border px-4 py-2"
            />
          </div>

          {/* パスワード確認欄 */}
          <div>
            <label className="block font-bold mb-2">パスワード確認</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="パスワードを再入力"
              className="w-full border px-4 py-2"
            />
          </div>

          {/* 更新ボタン */}
          <button
            onClick={handleUpdate}
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
          >
            更新
          </button>

          {/* スタッフ一覧に戻るボタン */}
          <button
            onClick={() => router.push("/admin/staffList")}
            className="mt-4 bg-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-400"
          >
            スタッフ一覧に戻る
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
