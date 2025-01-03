// src/components/UserLayout.tsx
import Link from "next/link";
import { useRouter } from "next/router";

export default function UserLayout({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string;
}) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/user/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        // ログイン画面にリダイレクト
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
      <header className="bg-green-500 text-white">
        <div className="container mx-auto flex justify-between items-center py-4 px-6">
          <h1 className="text-xl font-bold">利用者画面</h1>
          <nav className="flex space-x-4">
            <Link href="/user/clock">打刻</Link>
            <Link href="/user/attendance">履歴</Link>
            <button
              onClick={handleLogout}
              className="hover:underline text-white bg-transparent border-none cursor-pointer"
            >
              ログアウト
            </button>
          </nav>
          {userName && (
            <p className="text-sm font-light ml-4">
              {userName} さんでログイン中
            </p>
          )}
        </div>
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
