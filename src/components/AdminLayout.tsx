import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { useLateCount } from "../context/LateCountContext"; // 遅刻件数を取得するためのコンテキスト

export default function AdminLayout({
  children,
  adminName,
}: {
  children: React.ReactNode;
  adminName: string; // 必須に変更
}) {
  const router = useRouter();
  const [logoutMessage, setLogoutMessage] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false); // ハンバーガーメニューの開閉状態

  // 未対応遅刻件数を取得するコンテキスト
  const { lateCount } = useLateCount();

  // ログアウト処理
  const handleLogout = async () => {
    try {
      const response = await fetch("/api/admin/logout", { method: "POST" });

      if (response.ok) {
        setLogoutMessage("ログアウトしました！");
        setTimeout(() => {
          router.push("/admin/login");
        }, 1500);
      } else {
        setLogoutMessage("ログアウトに失敗しました。");
      }
    } catch (error) {
      console.error("ログアウト処理中にエラーが発生しました:", error);
      setLogoutMessage("ログアウトに失敗しました。");
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-blue-500 text-white relative">
        <div className="container mx-auto flex justify-between items-center py-4 px-6">
          {/* タイトルと管理者名 */}
          <div>
            <h1 className="text-xl font-bold">管理者ダッシュボード</h1>
            <p className="text-sm mt-1">{adminName} さんでログイン中</p>
          </div>

          {/* ナビゲーション（デスクトップ） */}
          <nav className="hidden md:flex space-x-4 items-center">
            <Link href="/admin/dashboard">
              <span className="block py-2 px-4 rounded text-sm hover:bg-blue-600 cursor-pointer">
                ホーム
              </span>
            </Link>
            <Link href="/admin/createStaff">
              <span className="block py-2 px-4 rounded text-sm hover:bg-blue-600 cursor-pointer">
                スタッフ新規登録
              </span>
            </Link>
            <Link href="/admin/staffList">
              <span className="block py-2 px-4 rounded text-sm hover:bg-blue-600 cursor-pointer">
                スタッフ一覧
              </span>
            </Link>
            <Link href="/admin/attendanceRecords">
              <span className="block py-2 px-4 rounded text-sm hover:bg-blue-600 cursor-pointer">
                打刻履歴
              </span>
            </Link>
            <Link href="/admin/attendanceStatus">
              <span className="block py-2 px-4 rounded text-sm hover:bg-blue-600 cursor-pointer flex items-center">
                遅刻チェック
                {lateCount > 0 && (
                  <span className="ml-2 text-yellow-500 font-bold">
                    ⚠ 未対応{lateCount}件
                  </span>
                )}
              </span>
            </Link>
            <Link href="/admin/workLocations">
              <span className="block py-2 px-4 rounded text-sm hover:bg-blue-600 cursor-pointer">
                勤務地情報登録
              </span>
            </Link>
          </nav>

          {/* ログイン中の管理者名とログアウトボタン（デスクトップ） */}
          <div className="hidden md:flex items-center space-x-4">
            <button
              onClick={handleLogout}
              className="py-2 px-4 rounded border border-red-500 bg-red-500 text-white text-sm hover:bg-white hover:text-red-500 transition-all"
            >
              ログアウト
            </button>
          </div>

          {/* ハンバーガーメニューボタン */}
          <button
            className="block md:hidden text-white focus:outline-none z-50"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={
                  menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"
                }
              />
            </svg>
          </button>
        </div>
      </header>

      {logoutMessage && (
        <div className="fixed top-10 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded shadow">
          {logoutMessage}
        </div>
      )}

      <main className="flex-grow container mx-auto px-6 py-4">{children}</main>

      <footer className="bg-gray-800 text-white py-4">
        <div className="container mx-auto text-center">
          <p>&copy; 2024 打刻アプリ - 管理者専用</p>
        </div>
      </footer>
    </div>
  );
}
