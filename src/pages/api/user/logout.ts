// src/pages/api/user/logout.ts
import { destroyCookie } from "nookies";

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      // ユーザーセッションを削除
      destroyCookie({ res }, "user_session", { path: "/" });

      return res.status(200).json({ message: "ログアウト成功" });
    } catch (error) {
      console.error("ログアウトエラー:", error);
      return res.status(500).json({ error: "サーバーエラーが発生しました。" });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
