// /src/utils/authHelpers.ts
import { supabase } from "./supabaseCliants";
import { parseCookies } from "nookies";
import jwt from "jsonwebtoken";

// 環境変数から JWT_SECRET を取得（サーバーサイドで管理）
const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

// JWTトークンの検証
const verifyToken = (token: string, scope: string) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    if (!decoded || decoded.scope !== scope) {
      console.error(
        `スコープが一致しません: 必要: ${scope}, 実際: ${decoded.scope}`
      );
      return null;
    }

    return decoded;
  } catch (error) {
    console.error("トークン検証エラー:", error);
    return null;
  }
};

// サーバーサイド認証: 利用者用
export const requireUserAuth = async (context) => {
  const cookies = parseCookies(context);
  const userToken = cookies["user_session"]; // 利用者セッション

  if (!userToken) {
    console.log("利用者セッションが存在しません。");
    return {
      redirect: {
        destination: "/user/login",
        permanent: false,
      },
    };
  }

  const decoded = verifyToken(userToken, "user");
  if (!decoded) {
    console.log("利用者トークンが無効です。");
    return {
      redirect: {
        destination: "/user/login",
        permanent: false,
      },
    };
  }

  // データベースから利用者情報を取得
  const { data: user, error } = await supabase
    .from("users")
    .select("id, name, is_admin")
    .eq("id", decoded.userId)
    .single();

  if (error || !user || user.is_admin) {
    console.log("利用者の認証に失敗しました。");
    return {
      redirect: {
        destination: "/user/login",
        permanent: false,
      },
    };
  }

  return { props: { user } };
};

// サーバーサイド認証: 管理者用
export const requireAdminAuth = async (context?: any) => {
  const cookies = context ? parseCookies(context) : parseCookies(); // クライアント・サーバー両方対応
  const adminToken = cookies["admin_session"];

  if (!adminToken) {
    return context
      ? { redirect: { destination: "/admin/login", permanent: false } }
      : null;
  }

  const decoded = verifyToken(adminToken, "admin");
  if (!decoded) {
    return context
      ? { redirect: { destination: "/admin/login", permanent: false } }
      : null;
  }

  const { data: admin, error } = await supabase
    .from("users")
    .select("id, name, is_admin")
    .eq("id", decoded.userId)
    .single();

  if (error || !admin || !admin.is_admin) {
    return context
      ? { redirect: { destination: "/admin/login", permanent: false } }
      : null;
  }

  return context ? { props: { admin } } : admin; // クライアントなら `admin` オブジェクトだけ返す
};
