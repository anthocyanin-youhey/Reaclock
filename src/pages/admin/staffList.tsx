// src/pages/admin/staffList.tsx
import AdminLayout from "../../components/AdminLayout"; // 共通レイアウト
import { useRouter } from "next/router"; // ページ遷移用
import { useState, useEffect } from "react"; // 状態管理と副作用
import { supabase } from "../../utils/supabaseCliants"; // Supabaseクライアント
import { requireAdminAuth } from "../../utils/authHelpers"; // サーバーサイド認証

export const getServerSideProps = requireAdminAuth;

export default function StaffList({ admin }: { admin: { name: string } }) {
  const router = useRouter();
  const [staffList, setStaffList] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<any>(null); // 削除対象スタッフ
  const [isModalOpen, setIsModalOpen] = useState(false); // モーダル表示状態
  const [searchQuery, setSearchQuery] = useState(""); // 検索クエリ
  const [sortKey, setSortKey] = useState<string>("employee_number"); // ソート基準
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc"); // ソート順

  // スタッフリストを取得
  const fetchStaffList = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, employee_number, name, is_admin");

      if (error) {
        console.error("スタッフリスト取得エラー:", error);
        setErrorMessage("スタッフリストの取得に失敗しました。");
        return;
      }

      setStaffList(data || []);
    } catch (error) {
      console.error("データ取得中にエラーが発生:", error);
      setErrorMessage("データ取得中にエラーが発生しました。");
    }
  };

  // スタッフ削除処理
  const handleDeleteStaff = async (staffId: number) => {
    try {
      const { error } = await supabase.from("users").delete().eq("id", staffId);

      if (error) {
        console.error("削除エラー:", error);
        alert("スタッフの削除に失敗しました。");
      } else {
        alert("スタッフが正常に削除されました。");
        fetchStaffList(); // リストを更新
        setIsModalOpen(false); // モーダルを閉じる
      }
    } catch (error) {
      console.error("削除処理中にエラー:", error);
      alert("削除処理中にエラーが発生しました。");
    }
  };

  // ソート処理
  const sortStaffList = (key: string) => {
    const newOrder = sortOrder === "asc" ? "desc" : "asc"; // ソート順を切り替え
    setSortKey(key);
    setSortOrder(newOrder);

    const sortedList = [...staffList].sort((a, b) => {
      if (a[key] < b[key]) return newOrder === "asc" ? -1 : 1;
      if (a[key] > b[key]) return newOrder === "asc" ? 1 : -1;
      return 0;
    });

    setStaffList(sortedList);
  };

  // 検索処理
  const filterStaffList = () => {
    return staffList.filter(
      (staff) =>
        staff.employee_number.includes(searchQuery) ||
        staff.name.includes(searchQuery)
    );
  };

  useEffect(() => {
    fetchStaffList();
  }, []);

  const filteredList = filterStaffList();

  return (
    <AdminLayout adminName={admin.name}>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-4">スタッフ一覧</h1>
        {errorMessage && <p className="text-red-500">{errorMessage}</p>}

        {/* 取扱説明文 */}
        <div className="mb-6 p-4 bg-blue-100 border border-blue-300 rounded">
          <p className="text-sm text-blue-800">
            シフトを登録するには、各スタッフの「勤務地データ」を先に登録してください。
            <br />
            登録した勤務地データを使ってシフト登録を行うシステムになっています。
          </p>
        </div>

        {/* 検索欄 */}
        <div className="mb-4 flex items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="社員番号または名前で検索"
            className="w-1/3 border px-4 py-2 rounded mr-4"
          />
        </div>

        <table className="min-w-full bg-white border-collapse border border-gray-300">
          <thead>
            <tr>
              <th
                className="border border-gray-300 px-4 py-2 cursor-pointer"
                onClick={() => sortStaffList("employee_number")}
              >
                社員番号
                {sortKey === "employee_number" &&
                  (sortOrder === "asc" ? " ▲" : " ▼")}
              </th>
              <th
                className="border border-gray-300 px-4 py-2 cursor-pointer"
                onClick={() => sortStaffList("name")}
              >
                名前
                {sortKey === "name" && (sortOrder === "asc" ? " ▲" : " ▼")}
              </th>
              <th
                className="border border-gray-300 px-4 py-2 cursor-pointer"
                onClick={() => sortStaffList("is_admin")}
              >
                権限
                {sortKey === "is_admin" && (sortOrder === "asc" ? " ▲" : " ▼")}
              </th>
              <th className="border border-gray-300 px-4 py-2">アクション</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.map((staff) => (
              <tr key={staff.id}>
                <td className="border border-gray-300 px-4 py-2">
                  {staff.employee_number}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {staff.name}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {staff.is_admin ? (
                    <span className="text-green-500 font-bold">管理者</span>
                  ) : (
                    <span className="text-gray-500">スタッフ</span>
                  )}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {/* 社員情報編集ボタン */}
                  <button
                    className="text-blue-500 hover:underline mr-2"
                    onClick={() => router.push(`/admin/editStaff/${staff.id}`)}
                  >
                    社員情報編集
                  </button>

                  {/* 打刻履歴編集ボタン */}
                  <button
                    className="text-purple-500 hover:underline mr-2"
                    onClick={() =>
                      router.push(`/admin/staffAttendance/${staff.id}`)
                    }
                  >
                    打刻履歴編集
                  </button>

                  {/* 勤務データ登録ボタン */}
                  <button
                    className="text-green-500 hover:underline mr-2"
                    onClick={() => router.push(`/admin/workData/${staff.id}`)}
                  >
                    勤務地データ登録
                  </button>

                  {/* シフト登録ボタン */}
                  <button
                    className="text-orange-500 hover:underline mr-2"
                    onClick={() =>
                      router.push(`/admin/shiftRegister/${staff.id}`)
                    }
                  >
                    シフト登録
                  </button>

                  {/* スタッフ削除ボタン */}
                  <button
                    className="text-red-500 hover:underline"
                    onClick={() => {
                      setSelectedStaff(staff);
                      setIsModalOpen(true); // モーダルを開く
                    }}
                  >
                    社員情報削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 削除確認モーダル */}
        {isModalOpen && selectedStaff && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white p-6 rounded shadow-md w-96">
              <h2 className="text-xl font-bold mb-4 text-center">確認</h2>
              <p className="mb-4 text-center">
                {`「${selectedStaff.name} (社員番号: ${selectedStaff.employee_number})」を削除しますか？`}
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => handleDeleteStaff(selectedStaff.id)}
                  className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  削除
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  中止
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
