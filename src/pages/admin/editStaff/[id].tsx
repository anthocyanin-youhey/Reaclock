import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { supabase } from "../../../utils/supabaseCliants";
import AdminLayout from "../../../components/AdminLayout";
import { requireAdminAuth } from "../../../utils/authHelpers";

export const getServerSideProps = requireAdminAuth;

export default function EditStaff({
  admin,
}: {
  admin: { name: string; id: number };
}) {
  const router = useRouter();
  const { id } = router.query;
  const staffId = parseInt(id as string, 10);
  const [staff, setStaff] = useState<any>({ name: "", is_admin: false });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const fetchStaffData = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("name, is_admin")
      .eq("id", staffId)
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

  const handleUpdate = async () => {
    if (password !== confirmPassword) {
      alert("パスワードが一致しません。");
      return;
    }

    try {
      const response = await fetch("/api/admin/updateStaff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: staffId,
          name: staff.name,
          password: password || null,
          is_admin: staff.is_admin,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message || "スタッフ情報を更新しました！");
        router.push("/admin/staffList");
      } else {
        alert(data.error || "スタッフ情報の更新に失敗しました。");
      }
    } catch (error) {
      console.error("更新エラー:", error);
      alert("更新中にエラーが発生しました。");
    }
  };

  return (
    <AdminLayout adminName={admin.name}>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-4">社員情報編集</h1>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <div className="space-y-4">
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

          <div>
            <label className="block font-bold mb-2">新しいパスワード</label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワードを入力"
              className="w-full border px-4 py-2"
            />
          </div>

          <div>
            <label className="block font-bold mb-2">パスワード確認</label>
            <input
              type="text"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="パスワードを再入力"
              className="w-full border px-4 py-2"
            />
          </div>

          <div className="flex items-center space-x-4">
            <label className="font-bold">管理者権限:</label>
            <input
              type="checkbox"
              checked={staff.is_admin}
              onChange={(e) =>
                setStaff({ ...staff, is_admin: e.target.checked })
              }
            />
          </div>

          <button
            onClick={handleUpdate}
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
          >
            更新
          </button>

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
