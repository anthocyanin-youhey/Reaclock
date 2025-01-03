// src/components/AdminLayout.tsx
import Link from "next/link"; // Next.js のリンクコンポーネント
import { useRouter } from "next/router"; // ルーティング用
import { useState } from "react"; // 状態管理

export default function AdminLayout({
  children,
  adminName,
}: {
  children: React.ReactNode; // 子コンポーネントを受け取る
  adminName: string; // 管理者名を表示するためのプロパティ
}) {
  const router = useRouter(); // ルーティング用のオブジェクト
  const [logoutMessage, setLogoutMessage] = useState<string>(""); // ログアウトメッセージを管理

  // ログアウト処理
  const handleLogout = async () => {
    try {
      // セッションを削除する API エンドポイントにリクエストを送信
      const response = await fetch("/api/admin/logout", { method: "POST" });

      if (response.ok) {
        setLogoutMessage("ログアウトしました！"); // メッセージを設定
        setTimeout(() => {
          router.push("/admin/login"); // ログイン画面にリダイレクト
        }, 1500);
      } else {
        setLogoutMessage("ログアウトに失敗しました。"); // エラーメッセージを表示
      }
    } catch (error) {
      console.error("ログアウト処理中にエラーが発生しました:", error);
      setLogoutMessage("ログアウトに失敗しました。");
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* ヘッダー部分 */}
      <header className="bg-blue-500 text-white">
        <div className="container mx-auto flex justify-between items-center py-4 px-6">
          <h1 className="text-xl font-bold">管理者ダッシュボード</h1>
          <nav className="flex space-x-4">
            <Link href="/admin/dashboard">ホーム</Link>
            <Link href="/admin/createStaff">スタッフ新規登録</Link>
            <Link href="/admin/staffList">スタッフ一覧</Link>
            <Link href="/admin/attendanceRecords">打刻履歴</Link>
            <button
              onClick={handleLogout}
              className="hover:underline text-white bg-transparent border-none cursor-pointer"
            >
              ログアウト
            </button>
          </nav>
          {adminName && (
            <p className="text-sm font-light ml-4">
              {adminName} さんでログイン中
            </p>
          )}
        </div>
      </header>

      {/* ログアウトメッセージ */}
      {logoutMessage && (
        <div className="fixed top-10 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded shadow">
          {logoutMessage}
        </div>
      )}

      {/* メインコンテンツ */}
      <main className="flex-grow container mx-auto px-6 py-4">{children}</main>

      {/* フッター部分 */}
      <footer className="bg-gray-800 text-white py-4">
        <div className="container mx-auto text-center">
          <p>&copy; 2024 打刻アプリ - 管理者専用</p>
        </div>
      </footer>
    </div>
  );
}
