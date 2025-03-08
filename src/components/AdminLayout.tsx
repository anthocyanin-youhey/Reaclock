// reaclock\src\components\AdminLayout.tsx

import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { useLateCount } from "../context/LateCountContext"; // 遅刻件数を取得するためのコンテキスト

export default function AdminLayout({
  children,
  adminName,
}: {
  children: React.ReactNode;
  adminName: string;
}) {
  const router = useRouter();
  const [logoutMessage, setLogoutMessage] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false); // ハンバーガーメニューの開閉状態

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
    <div className="flex flex-col min-h-screen relative">
      <header className="bg-blue-500 text-white relative z-50">
        {/* 
          max-w-screen-xl: 1280px幅までのコンテナ 
          → 1280px以上では中央寄せ 
        */}
        <div className="container max-w-screen-xl mx-auto flex justify-between items-center py-4 px-6">
          {/* タイトルと管理者名：管理者ダッシュボードをクリックでホームへ */}
          <div>
            <Link href="/admin/dashboard" legacyBehavior>
              <a className="text-xl font-bold hover:opacity-80">
                管理者ダッシュボード
              </a>
            </Link>
            <p className="text-sm mt-1">{adminName} さんでログイン中</p>
          </div>

          {/* デスクトップ用ナビゲーション (xl以上で表示) */}
          <nav className="hidden xl:flex space-x-4 items-center">
            <Link href="/admin/dashboard">
              <span className="py-2 px-4 rounded text-sm hover:bg-blue-600 cursor-pointer">
                ホーム
              </span>
            </Link>
            <Link href="/admin/createStaff">
              <span className="py-2 px-4 rounded text-sm hover:bg-blue-600 cursor-pointer">
                スタッフ新規登録
              </span>
            </Link>
            <Link href="/admin/staffList">
              <span className="py-2 px-4 rounded text-sm hover:bg-blue-600 cursor-pointer">
                スタッフ一覧
              </span>
            </Link>
            <Link href="/admin/attendanceRecords">
              <span className="py-2 px-4 rounded text-sm hover:bg-blue-600 cursor-pointer">
                打刻履歴
              </span>
            </Link>
            <Link href="/admin/attendanceStatus">
              <span className="py-2 px-4 rounded text-sm hover:bg-blue-600 cursor-pointer flex items-center">
                遅刻チェック
                {lateCount > 0 && (
                  <span className="ml-2 text-yellow-500 font-bold">
                    ⚠ 未対応{lateCount}件
                  </span>
                )}
              </span>
            </Link>
            <Link href="/admin/workLocations">
              <span className="py-2 px-4 rounded text-sm hover:bg-blue-600 cursor-pointer">
                勤務地情報登録
              </span>
            </Link>
          </nav>

          {/* デスクトップ用ログアウトボタン (xl以上で表示) */}
          <div className="hidden xl:flex items-center space-x-4">
            <button
              onClick={handleLogout}
              className="py-2 px-4 rounded border border-red-500 bg-red-500 text-white text-sm hover:bg-white hover:text-red-500 transition-all"
            >
              ログアウト
            </button>
          </div>

          {/* ハンバーガーメニューボタン（モバイル～lgまで表示） */}
          <button
            className="xl:hidden text-white focus:outline-none z-50"
            onClick={() => setMenuOpen(true)}
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
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* モバイル用オーバーレイ */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setMenuOpen(false)}
        ></div>
      )}

      {/* モバイル用サイドバー（右からスライドイン） (xl未満で表示) */}
      <div
        className={`fixed top-0 right-0 w-64 h-full bg-blue-500 text-white z-50 transform transition-transform duration-300 ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-4 flex flex-col space-y-4">
          <button
            className="self-end focus:outline-none"
            onClick={() => setMenuOpen(false)}
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          <Link href="/admin/dashboard">
            <span
              onClick={() => setMenuOpen(false)}
              className="py-2 px-2 rounded text-sm hover:bg-blue-600 cursor-pointer"
            >
              ホーム
            </span>
          </Link>
          <Link href="/admin/createStaff">
            <span
              onClick={() => setMenuOpen(false)}
              className="py-2 px-2 rounded text-sm hover:bg-blue-600 cursor-pointer"
            >
              スタッフ新規登録
            </span>
          </Link>
          <Link href="/admin/staffList">
            <span
              onClick={() => setMenuOpen(false)}
              className="py-2 px-2 rounded text-sm hover:bg-blue-600 cursor-pointer"
            >
              スタッフ一覧
            </span>
          </Link>
          <Link href="/admin/attendanceRecords">
            <span
              onClick={() => setMenuOpen(false)}
              className="py-2 px-2 rounded text-sm hover:bg-blue-600 cursor-pointer"
            >
              打刻履歴
            </span>
          </Link>
          <Link href="/admin/attendanceStatus">
            <span
              onClick={() => setMenuOpen(false)}
              className="py-2 px-2 rounded text-sm hover:bg-blue-600 cursor-pointer flex items-center"
            >
              遅刻チェック
              {lateCount > 0 && (
                <span className="ml-2 text-yellow-300 font-bold">
                  ⚠ 未対応{lateCount}件
                </span>
              )}
            </span>
          </Link>
          <Link href="/admin/workLocations">
            <span
              onClick={() => setMenuOpen(false)}
              className="py-2 px-2 rounded text-sm hover:bg-blue-600 cursor-pointer"
            >
              勤務地情報登録
            </span>
          </Link>
          <button
            onClick={() => {
              setMenuOpen(false);
              handleLogout();
            }}
            className="block w-full text-left py-2 px-2 mt-2 rounded border border-red-400 bg-red-500 text-white text-sm hover:bg-white hover:text-red-500 transition-all"
          >
            ログアウト
          </button>
        </div>
      </div>

      {logoutMessage && (
        <div className="fixed top-10 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded shadow">
          {logoutMessage}
        </div>
      )}

      {/* メインコンテンツ */}
      <main className="flex-grow container max-w-screen-xl mx-auto px-6 py-4">
        {children}
      </main>

      <footer className="bg-gray-800 text-white py-4">
        <div className="container max-w-screen-xl mx-auto text-center">
          <p>&copy; 2024 打刻アプリ - 管理者専用</p>
        </div>
      </footer>
    </div>
  );
}
