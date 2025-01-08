/**
 * 時刻文字列を日本時間のフォーマットで返します。
 * 無効な入力の場合は "-" を返します。
 * @param time - 時刻 (例: "12:34:56" または "12:34")
 * @returns 時刻を日本時間フォーマット (HH:MM)
 */
export const formatToJapanTime = (time: string | null | undefined): string => {
  if (!time) return "-"; // 無効な値の場合は "-" を返す

  try {
    // HH:MM:SS 形式かどうかを確認
    const timeParts = time.split(":");
    if (timeParts.length === 3) {
      // 秒を含む形式の場合
      const [hour, minute] = timeParts;
      return `${hour}:${minute}`;
    }

    // デフォルト処理 (HH:MM の場合)
    const date = new Date(`1970-01-01T${time}:00+09:00`);
    return new Intl.DateTimeFormat("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Tokyo",
    }).format(date);
  } catch (err) {
    console.error("Invalid time format:", time, err);
    return "-";
  }
};

/**
 * フル日時を日本時間でフォーマットします。
 * @param isoString - ISO形式の日付文字列 (例: "2025-01-06T03:45:00Z")
 * @returns フォーマット済み日時文字列
 */
export const formatFullJapanTime = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    return date.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Tokyo",
    });
  } catch (err) {
    console.error("Invalid ISO string:", isoString, err);
    return "-";
  }
};
