// /src/pages/admin/createStaff.tsx
import { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import { requireAdminAuth } from "../../utils/authHelpers";

export const getServerSideProps = requireAdminAuth;

export default function CreateStaff({ admin }: { admin: { name: string } }) {
  const [name, setName] = useState(""); // 名前
  const [password, setPassword] = useState(""); // パスワード
  const [confirmPassword, setConfirmPassword] = useState(""); // 確認用パスワード
  const [employeeNumber, setEmployeeNumber] = useState(""); // 生成された社員番号
  const [statusMessage, setStatusMessage] = useState(""); // ステータスメッセージ
  const [adminName, setAdminName] = useState<string | null>(null); // ログイン中の管理者名（初期値は null）

  // 社員番号を生成
  const generateEmployeeNumber = async () => {
    const today = new Date();
    const date = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(
      2,
      "0"
    )}${String(today.getDate()).padStart(2, "0")}`;

    try {
      const response = await fetch(`/api/admin/getEmployeeCount?date=${date}`);
      const data = await response.json();

      if (response.ok) {
        const count = data.count + 1; // その日の登録数に1を加える
        const newEmployeeNumber = `${date}${String(count).padStart(2, "0")}`;
        setEmployeeNumber(newEmployeeNumber);
      } else {
        console.error("社員番号生成エラー:", data.error);
        setStatusMessage("社員番号の生成に失敗しました。");
      }
    } catch (error) {
      console.error("ネットワークエラー:", error);
      setStatusMessage("社員番号の生成中にエラーが発生しました。");
    }
  };

  // 管理者名を取得
  const fetchAdminName = async () => {
    try {
      const response = await fetch("/api/admin/getAdminInfo");
      const data = await response.json();

      if (response.ok) {
        setAdminName(data.name || "管理者");
      } else {
        console.error("管理者名取得エラー:", data.error);
        setAdminName("管理者");
      }
    } catch (error) {
      console.error("ネットワークエラー:", error);
      setAdminName("管理者");
    }
  };

  // 初回レンダリング時に社員番号を生成し、管理者名を取得
  useEffect(() => {
    generateEmployeeNumber();
    fetchAdminName();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !password || !confirmPassword) {
      setStatusMessage("全てのフィールドを入力してください。");
      return;
    }

    if (password !== confirmPassword) {
      setStatusMessage("パスワードが一致しません。");
      return;
    }

    try {
      const response = await fetch("/api/admin/registerStaff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          password,
          employee_number: employeeNumber,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatusMessage("スタッフ登録が成功しました！");
        setName("");
        setPassword("");
        setConfirmPassword("");
        generateEmployeeNumber(); // 新しい社員番号を生成
      } else {
        setStatusMessage(data.error || "スタッフ登録に失敗しました。");
      }
    } catch (error) {
      console.error("エラー:", error);
      setStatusMessage("ネットワークエラーが発生しました。");
    }
  };

  // 管理者名がまだ取得されていない場合はローディング表示
  if (adminName === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl font-bold">読み込み中...</p>
      </div>
    );
  }

  return (
    <AdminLayout adminName={admin.name}>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-4">スタッフ新規登録</h1>
        <form onSubmit={handleSubmit} className="max-w-md mx-auto">
          {/* 名前入力 */}
          <div className="mb-4">
            <label className="block mb-2 font-bold text-gray-700">名前</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border rounded"
              required
            />
          </div>

          {/* 社員番号表示 */}
          <div className="mb-4">
            <label className="block mb-2 font-bold text-gray-700">
              社員番号
            </label>
            <input
              type="text"
              value={employeeNumber}
              readOnly
              className="w-full px-4 py-2 border rounded bg-gray-100"
            />
          </div>

          {/* パスワード入力 */}
          <div className="mb-4">
            <label className="block mb-2 font-bold text-gray-700">
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded"
              required
            />
          </div>

          {/* パスワード確認入力 */}
          <div className="mb-4">
            <label className="block mb-2 font-bold text-gray-700">
              パスワード（確認）
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded"
              required
            />
          </div>

          {/* ステータスメッセージ */}
          {statusMessage && (
            <p
              className={`mb-4 text-center ${
                statusMessage.includes("成功")
                  ? "text-green-500"
                  : "text-red-500"
              }`}
            >
              {statusMessage}
            </p>
          )}

          {/* 登録ボタン */}
          <button
            type="submit"
            className="w-full px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600"
          >
            登録
          </button>
        </form>
      </div>
    </AdminLayout>
  );
}
