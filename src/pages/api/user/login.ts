// /src/pages/api/user/login.ts
import { supabase } from "../../../utils/supabaseCliants";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// JWT_SECRET を安全に管理してください
const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { employee_number, password } = req.body;

    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("id, password_hash, is_admin")
        .eq("employee_number", employee_number)
        .single();

      if (error || !user) {
        return res
          .status(401)
          .json({ error: "社員番号またはパスワードが間違っています。" });
      }

      const isPasswordValid = await bcrypt.compare(
        password,
        user.password_hash
      );
      if (!isPasswordValid) {
        return res
          .status(401)
          .json({ error: "社員番号またはパスワードが間違っています。" });
      }

      // トークンのスコープを指定
      const scope = "user";

      // トークンを発行
      const token = jwt.sign(
        {
          userId: user.id,
          scope,
        },
        JWT_SECRET,
        { expiresIn: "1h" }
      );

      // 利用者用のクッキーを設定
      res.setHeader(
        "Set-Cookie",
        `user_session=${token}; Path=/; HttpOnly; SameSite=Lax`
      );

      return res.status(200).json({ message: "ログイン成功！", token });
    } catch (err) {
      console.error("ログインエラー:", err);
      return res
        .status(500)
        .json({ error: "ログイン処理中にエラーが発生しました。" });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
