import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { useLateCount } from "../context/LateCountContext";

export default function AdminLayout({
  children,
  adminName,
}: {
  children: React.ReactNode;
  adminName: string;
}) {
  const router = useRouter();
  const { lateCount } = useLateCount();
  const [logoutMessage, setLogoutMessage] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false); // ローディング制御

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true); // ローディング開始
      const response = await fetch("/api/admin/logout", { method: "POST" });
      if (response.ok) {
        setLogoutMessage("ログアウトしました");
        setTimeout(() => {
          router.push("/admin/login");
        }, 1500); // ローディングを表示したまま少し待つ
      } else {
        setLogoutMessage("ログアウトに失敗しました");
        setIsLoggingOut(false);
      }
    } catch (e) {
      console.error("ログアウト失敗", e);
      setLogoutMessage("ログアウトに失敗しました");
      setIsLoggingOut(false);
    }
  };

  // ローディング表示中ならログイン時と同じスタイルで表示
  if (isLoggingOut) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-solid"></div>
          <p className="text-gray-700 text-lg font-semibold">ログアウト中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* === Header === */}
      <header className="bg-white shadow border-b border-gray-200 fixed w-full z-50">
        <div className="max-w-screen-xl mx-auto flex justify-between items-center py-4 px-6">
          <Link
            href="/admin/dashboard"
            className="text-2xl font-light text-gray-800"
          >
            <span className="font-bold">Lua</span>9311
          </Link>

          <nav className="hidden md:flex space-x-8 text-sm text-gray-700">
            {navItems.map(({ href, title, subtitle }) => (
              <Link
                key={href}
                href={href}
                className="group relative flex flex-col items-center"
              >
                <span className="font-medium">{title}</span>
                <span className="text-xs text-gray-500">{subtitle}</span>
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-500 transition-all group-hover:w-full"></span>
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center space-x-4 text-sm">
            <span className="text-gray-600">{adminName} さん</span>
            <button
              onClick={handleLogout}
              className="text-red-500 border border-red-500 px-3 py-1 rounded hover:bg-red-500 hover:text-white transition"
            >
              ログアウト
            </button>
          </div>

          <button
            onClick={() => setMenuOpen(true)}
            className="md:hidden text-gray-800 focus:outline-none"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </header>

      {menuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-40 transition-opacity duration-300"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 right-0 w-64 h-full bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-blue-600 font-semibold">{adminName} さん</p>
            <button onClick={() => setMenuOpen(false)}>
              <svg
                className="w-6 h-6 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          {navItems.map(({ href, title, subtitle }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="block py-2 border-b text-sm"
            >
              <div className="font-semibold">{title}</div>
              <div className="text-xs text-gray-500">{subtitle}</div>
            </Link>
          ))}
          <button
            onClick={() => {
              setMenuOpen(false);
              handleLogout();
            }}
            className="mt-6 bg-red-500 text-white py-2 w-full rounded hover:bg-red-600 transition"
          >
            ログアウト
          </button>
        </div>
      </aside>

      <main className="pt-24 px-6 flex-grow max-w-screen-xl mx-auto w-full">
        {children}
      </main>

      <footer className="bg-gray-800 text-white text-sm text-center py-4">
        &copy; 2024 打刻アプリ - 管理者専用
      </footer>

      {logoutMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded shadow z-50">
          {logoutMessage}
        </div>
      )}
    </div>
  );
}

const navItems = [
  { href: "/admin/dashboard", title: "Dashboard", subtitle: "ダッシュボード" },
  { href: "/admin/createStaff", title: "Register", subtitle: "スタッフ登録" },
  { href: "/admin/staffList", title: "Staff List", subtitle: "スタッフ一覧" },
  { href: "/admin/attendanceRecords", title: "Records", subtitle: "打刻履歴" },
  {
    href: "/admin/attendanceStatus",
    title: "Late Check",
    subtitle: "遅刻確認",
  },
  { href: "/admin/workLocations", title: "Locations", subtitle: "勤務地管理" },
];
