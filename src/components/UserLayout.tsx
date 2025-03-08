// reaclock/src/components/UserLayout.tsx
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

export default function UserLayout({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/user/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        router.push("/user/login");
      } else {
        console.error("ログアウトに失敗しました");
      }
    } catch (error) {
      console.error("エラー:", error);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-green-500 text-white relative">
        <div className="container mx-auto flex justify-between items-center py-4 px-6">
          <div className="flex items-center space-x-2">
            {/* タイトルをクリックで /user/clock へ遷移 */}
            <Link href="/user/clock" legacyBehavior>
              <a className="text-xl font-bold hover:opacity-80">利用者画面</a>
            </Link>
            {/* スマホサイズでのユーザー名表示 */}
            <span className="text-sm font-light ml-2 md:hidden">
              {userName} さん
            </span>
          </div>

          {/* ナビゲーション（デスクトップ表示） */}
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/user/clock">
              <span className="py-2 px-4 rounded hover:bg-green-600 cursor-pointer">
                打刻
              </span>
            </Link>
            <Link href="/user/attendance">
              <span className="py-2 px-4 rounded hover:bg-green-600 cursor-pointer">
                履歴
              </span>
            </Link>
            <div className="flex items-center space-x-4">
              <p className="text-sm font-light">{userName} さんでログイン中</p>
              <button
                onClick={handleLogout}
                className="py-2 px-4 rounded border border-red-500 bg-red-500 text-white hover:bg-white hover:text-red-500 transition-all"
              >
                ログアウト
              </button>
            </div>
          </div>

          {/* ハンバーガーメニューボタン（モバイル用） */}
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

        {/* モバイル用サイドバー */}
        <nav
          className={`fixed top-0 right-0 h-full bg-green-600 text-white w-64 transform ${
            menuOpen ? "translate-x-0" : "translate-x-full"
          } transition-transform duration-300 ease-in-out z-40`}
        >
          <div className="p-6 border-b border-green-500">
            <p className="text-sm font-light">{userName} さん</p>
          </div>
          <ul className="mt-4 space-y-4 px-6">
            <li>
              <Link
                href="/user/clock"
                className="block py-2 px-4 rounded hover:bg-green-700 cursor-pointer"
                onClick={() => setMenuOpen(false)}
              >
                打刻
              </Link>
            </li>
            <li>
              <Link
                href="/user/attendance"
                className="block py-2 px-4 rounded hover:bg-green-700 cursor-pointer"
                onClick={() => setMenuOpen(false)}
              >
                履歴
              </Link>
            </li>
            <li className="mt-10">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  handleLogout();
                }}
                className="block w-full py-2 px-4 rounded border border-red-500 bg-red-500 text-white hover:bg-white hover:text-red-500 transition-all"
              >
                ログアウト
              </button>
            </li>
          </ul>
        </nav>
      </header>

      <main className="flex-grow container mx-auto px-6 py-4">{children}</main>

      <footer className="bg-gray-800 text-white py-4">
        <div className="container mx-auto text-center">
          <p>&copy; 2024 利用者画面</p>
        </div>
      </footer>
    </div>
  );
}
