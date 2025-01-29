// reaclock/src/pages/admin/staffList.tsx

// 必要なモジュールのインポート
import AdminLayout from "../../components/AdminLayout";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { supabase } from "../../utils/supabaseCliants";
import { requireAdminAuth } from "../../utils/authHelpers";

// 管理者認証の設定
export const getServerSideProps = requireAdminAuth;

// スタッフ一覧管理コンポーネント
export default function StaffList({ admin }: { admin: { name: string } }) {
  // ルーターと基本的な状態管理の初期化
  const router = useRouter();
  const [staffList, setStaffList] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  // モーダル関連の状態管理
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 検索とソート関連の状態管理
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<string>("employee_number");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // アクションモーダル関連の状態管理
  const [selectedStaffForAction, setSelectedStaffForAction] =
    useState<any>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);

  // Supabaseからスタッフ一覧を取得する関数
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

  // スタッフ削除処理の関数
  const handleDeleteStaff = async (staffId: number) => {
    try {
      const { error } = await supabase.from("users").delete().eq("id", staffId);

      if (error) {
        console.error("削除エラー:", error);
        alert("スタッフの削除に失敗しました。");
      } else {
        alert("スタッフが正常に削除されました。");
        fetchStaffList();
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error("削除処理中にエラー:", error);
      alert("削除処理中にエラーが発生しました。");
    }
  };

  // リストのソート処理を行う関数
  const sortStaffList = (key: string) => {
    const newOrder = sortOrder === "asc" ? "desc" : "asc";
    setSortKey(key);
    setSortOrder(newOrder);

    const sortedList = [...staffList].sort((a, b) => {
      if (a[key] < b[key]) return newOrder === "asc" ? -1 : 1;
      if (a[key] > b[key]) return newOrder === "asc" ? 1 : -1;
      return 0;
    });

    setStaffList(sortedList);
  };

  // 検索条件でリストをフィルタリングする関数
  const filterStaffList = () => {
    return staffList.filter(
      (staff) =>
        staff.employee_number.includes(searchQuery) ||
        staff.name.includes(searchQuery)
    );
  };

  // 初回レンダリング時のデータ取得
  useEffect(() => {
    fetchStaffList();
  }, []);

  // フィルタリング済みリストの取得
  const filteredList = filterStaffList();

  // UIレンダリング
  return (
    <AdminLayout adminName={admin.name}>
      <div className="container mx-auto py-6">
        {/* ページヘッダーと説明文 */}
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

        {/* 検索フィールド */}
        <div className="mb-4 flex items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="社員番号または名前で検索"
            className="w-1/3 border px-4 py-2 rounded mr-4"
          />
        </div>

        {/* スタッフ一覧テーブル */}
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border-collapse border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th
                  onClick={() => sortStaffList("employee_number")}
                  className="border border-gray-300 px-2 py-2 cursor-pointer whitespace-nowrap text-sm hover:bg-gray-100"
                >
                  社員番号
                  <span className="ml-1">
                    {sortKey === "employee_number" &&
                      (sortOrder === "asc" ? "▲" : "▼")}
                  </span>
                </th>
                <th
                  onClick={() => sortStaffList("name")}
                  className="border border-gray-300 px-2 py-2 cursor-pointer whitespace-nowrap text-sm hover:bg-gray-100"
                >
                  名前
                  <span className="ml-1">
                    {sortKey === "name" && (sortOrder === "asc" ? "▲" : "▼")}
                  </span>
                </th>
                <th
                  onClick={() => sortStaffList("is_admin")}
                  className="border border-gray-300 px-2 py-2 cursor-pointer whitespace-nowrap text-sm hover:bg-gray-100"
                >
                  権限
                  <span className="ml-1">
                    {sortKey === "is_admin" &&
                      (sortOrder === "asc" ? "▲" : "▼")}
                  </span>
                </th>
                <th className="border border-gray-300 px-2 py-2 whitespace-nowrap text-sm hidden xl:table-cell">
                  アクション
                </th>
                <th className="border border-gray-300 px-2 py-2 whitespace-nowrap text-sm hidden xl:table-cell">
                  削除
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((staff) => (
                <tr key={staff.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-2 py-2 whitespace-nowrap text-sm">
                    {staff.employee_number}
                  </td>
                  <td
                    className="border border-gray-300 px-2 py-2 whitespace-nowrap text-sm xl:cursor-default cursor-pointer hover:bg-blue-50 xl:hover:bg-transparent relative group"
                    onClick={() => {
                      if (window.innerWidth < 1280) {
                        // xl breakpoint
                        setSelectedStaffForAction(staff);
                        setIsActionModalOpen(true);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span>{staff.name}</span>
                    </div>
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-center whitespace-nowrap text-sm">
                    {staff.is_admin ? (
                      <span className="text-green-500 font-medium">管理者</span>
                    ) : (
                      <span className="text-gray-500">スタッフ</span>
                    )}
                  </td>
                  <td className="border border-gray-300 p-1.5 hidden xl:table-cell">
                    <div className="grid grid-cols-2 gap-1">
                      {/* PCサイズ時のアクションボタン群 */}
                      <button
                        className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium hover:bg-blue-600 transition-colors duration-200 whitespace-nowrap w-full"
                        onClick={() =>
                          router.push(`/admin/editStaff/${staff.id}`)
                        }
                      >
                        編集
                      </button>
                      <button
                        className="bg-purple-500 text-white px-2 py-1 rounded text-xs font-medium hover:bg-purple-600 transition-colors duration-200 whitespace-nowrap w-full"
                        onClick={() =>
                          router.push(`/admin/staffAttendance/${staff.id}`)
                        }
                      >
                        打刻履歴編集
                      </button>
                      <button
                        className="bg-green-500 text-white px-2 py-1 rounded text-xs font-medium hover:bg-green-600 transition-colors duration-200 whitespace-nowrap w-full"
                        onClick={() =>
                          router.push(`/admin/workData/${staff.id}`)
                        }
                      >
                        勤務地データ登録
                      </button>
                      <button
                        className="bg-orange-500 text-white px-2 py-1 rounded text-xs font-medium hover:bg-orange-600 transition-colors duration-200 whitespace-nowrap w-full"
                        onClick={() =>
                          router.push(`/admin/shiftRegister/${staff.id}`)
                        }
                      >
                        シフト登録
                      </button>
                    </div>
                  </td>
                  <td className="border border-gray-300 p-1.5 text-center hidden xl:table-cell">
                    <button
                      className="bg-red-500 text-white px-4 py-1 rounded text-xs font-medium hover:bg-red-600 transition-colors duration-200 whitespace-nowrap w-full"
                      onClick={() => {
                        setSelectedStaff(staff);
                        setIsModalOpen(true);
                      }}
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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

        {/* アクションモーダル（1280px未満時） */}
        {isActionModalOpen && selectedStaffForAction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="p-4 border-b">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">
                    {selectedStaffForAction.name}
                  </h3>
                  <span className="text-sm text-gray-500">
                    社員番号: {selectedStaffForAction.employee_number}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <button
                  className="bg-blue-500 text-white px-4 py-2.5 rounded text-sm font-medium hover:bg-blue-600 transition-colors duration-200 w-full flex items-center justify-center space-x-2"
                  onClick={() => {
                    router.push(
                      `/admin/editStaff/${selectedStaffForAction.id}`
                    );
                    setIsActionModalOpen(false);
                  }}
                >
                  <span>社員情報編集</span>
                </button>
                <button
                  className="bg-purple-500 text-white px-4 py-2.5 rounded text-sm font-medium hover:bg-purple-600 transition-colors duration-200 w-full flex items-center justify-center space-x-2"
                  onClick={() =>
                    router.push(
                      `/admin/staffAttendance/${selectedStaffForAction.id}`
                    )
                  }
                >
                  <span>打刻履歴編集</span>
                </button>
                <button
                  className="bg-green-500 text-white px-4 py-2.5 rounded text-sm font-medium hover:bg-green-600 transition-colors duration-200 w-full flex items-center justify-center space-x-2"
                  onClick={() =>
                    router.push(`/admin/workData/${selectedStaffForAction.id}`)
                  }
                >
                  <span>勤務地データ登録</span>
                </button>
                <button
                  className="bg-orange-500 text-white px-4 py-2.5 rounded text-sm font-medium hover:bg-orange-600 transition-colors duration-200 w-full flex items-center justify-center space-x-2"
                  onClick={() =>
                    router.push(
                      `/admin/shiftRegister/${selectedStaffForAction.id}`
                    )
                  }
                >
                  <span>シフト登録</span>
                </button>
                <button
                  className="bg-red-500 text-white px-4 py-2.5 rounded text-sm font-medium hover:bg-red-600 transition-colors duration-200 w-full flex items-center justify-center space-x-2"
                  onClick={() => {
                    setSelectedStaff(selectedStaffForAction);
                    setIsActionModalOpen(false);
                    setIsModalOpen(true);
                  }}
                >
                  <span>社員情報削除</span>
                </button>
              </div>
              <div className="p-4 border-t">
                <button
                  className="bg-gray-100 text-gray-800 px-4 py-2.5 rounded text-sm font-medium hover:bg-gray-200 transition-colors duration-200 w-full"
                  onClick={() => setIsActionModalOpen(false)}
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
