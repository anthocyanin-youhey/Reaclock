// /src/pages/api/admin/getEmployeeCount.ts
import { supabase } from "../../../utils/supabaseCliants";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { date } = req.query;

    try {
      const { data, error } = await supabase
        .from("users")
        .select("id", { count: "exact" })
        .like("employee_number", `${date}%`);

      if (error) {
        return res.status(500).json({ error: "データ取得に失敗しました。" });
      }

      res.status(200).json({ count: data.length });
    } catch (error) {
      res.status(500).json({ error: "サーバーエラーが発生しました。" });
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
