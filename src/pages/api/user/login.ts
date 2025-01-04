//reaclock\src\pages\api\user\login.ts
import { supabase } from "../../../utils/supabaseCliants";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { serialize } from "cookie";

// JWT_SECRET を環境変数から取得（デフォルト値は開発用）
const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { employee_number, password } = req.body;

    // 入力値の確認
    if (!employee_number || !password) {
      return res
        .status(400)
        .json({ error: "社員番号とパスワードを入力してください。" });
    }

    try {
      // Supabaseから該当ユーザーを検索
      const { data: user, error } = await supabase
        .from("users")
        .select("id, password_hash, is_admin")
        .eq("employee_number", employee_number)
        .single();

      // ユーザーが見つからない場合
      if (error || !user) {
        return res
          .status(404)
          .json({ error: "入力された社員番号は存在しません。" });
      }

      // パスワードの検証
      const isPasswordValid = await bcrypt.compare(
        password,
        user.password_hash
      );
      if (!isPasswordValid) {
        return res
          .status(401)
          .json({ error: "パスワードが正しくありません。" });
      }

      // 管理者が利用者画面にログインしようとした場合
      if (user.is_admin) {
        return res
          .status(403)
          .json({ error: "管理者はこの画面にはログインできません。" });
      }

      // JWTトークンの作成
      const token = jwt.sign({ userId: user.id, scope: "user" }, JWT_SECRET, {
        expiresIn: "1h",
      });

      // クッキーを設定
      res.setHeader(
        "Set-Cookie",
        serialize("user_session", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 3600, // 1時間
        })
      );

      // 成功レスポンス
      return res.status(200).json({ message: "ログイン成功！", token });
    } catch (err) {
      console.error("ログインエラー:", err);
      return res.status(500).json({ error: "サーバーエラーが発生しました。" });
    }
  } else {
    // POST以外のリクエストを拒否
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
