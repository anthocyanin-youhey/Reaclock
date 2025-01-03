// src/pages/api/admin/logout.ts

export default async function handler(req, res) {
  if (req.method === "POST") {
    // セッション用クッキーを削除
    res.setHeader(
      "Set-Cookie",
      "admin_session=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax"
    );
    res.status(200).json({ message: "ログアウトしました。" });
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
