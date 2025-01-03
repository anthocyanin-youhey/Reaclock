// src/utils/apiClient.ts
export const apiClient = async (url: string, options: any = {}) => {
  const token = localStorage.getItem("authToken");

  // ヘッダーを安全に構築
  const headers = {
    ...(options.headers || {}), // options.headersがundefinedの場合は空オブジェクトを設定
    Authorization: `Bearer ${token}`,
  };

  // リクエストを送信
  const response = await fetch(url, { ...options, headers });

  // ステータスコード401の場合の処理（認証エラー時）
  if (response.status === 401) {
    // トークンが無効な場合はログアウト処理
    localStorage.removeItem("authToken");
    window.location.href = "/login";
  }

  return response.json(); // レスポンスをJSONとして返す
};
