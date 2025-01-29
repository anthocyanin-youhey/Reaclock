import { useState, useEffect } from "react";
import { requireUserAuth } from "../../utils/authHelpers";
import UserLayout from "../../components/UserLayout";
import { supabase } from "../../utils/supabaseCliants";

export const getServerSideProps = requireUserAuth;

type ShiftData = {
  start_time: string | null;
  end_time: string | null;
  hourly_rate: number | null;
};

export default function ClockPage({
  user,
}: {
  user: { name: string; id: number };
}) {
  const [status, setStatus] = useState("");
  const [isClockInDisabled, setIsClockInDisabled] = useState(false);
  const [isClockOutDisabled, setIsClockOutDisabled] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>("未設定");
  const [clockInTime, setClockInTime] = useState<string>("未記録");
  const [clockOutTime, setClockOutTime] = useState<string>("未記録");
  const [shiftInfo, setShiftInfo] = useState<{
    startTime: string;
    endTime: string;
    hourlyRate: string;
  }>({
    startTime: "未設定",
    endTime: "未設定",
    hourlyRate: "未設定",
  });
  const [todayWorkLocation, setTodayWorkLocation] = useState<string>("未設定");

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const jstTime = new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(now);
      setCurrentTime(jstTime);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchAttendanceAndShift = async () => {
      try {
        const now = new Date();
        const jstDate = new Intl.DateTimeFormat("ja-JP", {
          timeZone: "Asia/Tokyo",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
          .format(now)
          .split("/")
          .join("-");

        const { data: attendanceData, error: attendanceError } = await supabase
          .from("attendance_records")
          .select("*")
          .eq("user_id", user.id)
          .eq("work_date", jstDate)
          .maybeSingle();

        if (attendanceError) {
          console.error("出退勤情報の取得エラー:", attendanceError);
        } else {
          setClockInTime(
            attendanceData?.clock_in
              ? new Date(
                  `2000-01-01T${attendanceData.clock_in}`
                ).toLocaleTimeString("ja-JP", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "未記録"
          );
          setClockOutTime(
            attendanceData?.clock_out
              ? new Date(
                  `2000-01-01T${attendanceData.clock_out}`
                ).toLocaleTimeString("ja-JP", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "未記録"
          );
          setIsClockInDisabled(!!attendanceData?.clock_in);
          setIsClockOutDisabled(!!attendanceData?.clock_out);
        }

        const { data: shiftData, error: shiftError } = await supabase
          .from("shifts")
          .select("id, work_data_id, start_time, end_time")
          .eq("user_id", user.id)
          .eq("date", jstDate)
          .maybeSingle();

        if (shiftError) {
          console.error("シフト情報の取得エラー:", shiftError);
          return;
        }

        if (shiftData?.work_data_id) {
          const { data: workData, error: workDataError } = await supabase
            .from("work_data")
            .select("work_location, hourly_rate")
            .eq("id", shiftData.work_data_id)
            .single();

          if (workDataError) {
            console.error("勤務地情報の取得エラー:", workDataError);
          } else if (workData) {
            setShiftInfo({
              startTime: shiftData.start_time
                ? new Date(
                    `2000-01-01T${shiftData.start_time}`
                  ).toLocaleTimeString("ja-JP", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "未設定",
              endTime: shiftData.end_time
                ? new Date(
                    `2000-01-01T${shiftData.end_time}`
                  ).toLocaleTimeString("ja-JP", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "未設定",
              hourlyRate: workData.hourly_rate
                ? `${workData.hourly_rate}円`
                : "未設定",
            });
            setTodayWorkLocation(workData.work_location || "未設定");
          }
        } else {
          setShiftInfo({
            startTime: "未設定",
            endTime: "未設定",
            hourlyRate: "未設定",
          });
          setTodayWorkLocation("未設定");
        }
      } catch (err) {
        console.error("システムエラー:", err);
        setStatus("システムエラーが発生しました。");
      }
    };

    fetchAttendanceAndShift();
  }, [user.id]);

  const handleClock = async (type: "clock_in" | "clock_out") => {
    try {
      const now = new Date();
      const jstTime = new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(now);
      const jstDate = now.toISOString().split("T")[0];

      const response = await fetch("/api/user/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          type,
          time: jstTime,
          date: jstDate,
        }),
      });

      if (response.ok) {
        const formattedTime = jstTime.slice(0, 5);
        if (type === "clock_in") {
          setClockInTime(formattedTime);
          setIsClockInDisabled(true);
          setStatus("出勤が記録されました。");
        } else {
          setClockOutTime(formattedTime);
          setIsClockOutDisabled(true);
          setStatus("退勤が記録されました。");
        }
      } else {
        setStatus("記録に失敗しました。");
      }
    } catch (error) {
      console.error("記録エラー:", error);
      setStatus("記録中にエラーが発生しました。");
    }
  };

  return (
    <UserLayout userName={user.name}>
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-8">出退勤打刻</h1>
        <p className="text-4xl font-bold mb-6">{currentTime}</p>

        <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto mb-8">
          <h2 className="text-2xl font-bold mb-4">今日のシフト情報</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
              <span className="text-gray-600">勤務地</span>
              <span
                className={`font-medium ${
                  todayWorkLocation === "未設定"
                    ? "text-gray-400"
                    : "text-blue-600"
                }`}
              >
                {todayWorkLocation}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
              <span className="text-gray-600">開始時間</span>
              <span
                className={`font-medium ${
                  shiftInfo.startTime === "未設定" ? "text-gray-400" : ""
                }`}
              >
                {shiftInfo.startTime}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
              <span className="text-gray-600">終了時間</span>
              <span
                className={`font-medium ${
                  shiftInfo.endTime === "未設定" ? "text-gray-400" : ""
                }`}
              >
                {shiftInfo.endTime}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">時給</span>
              <span
                className={`font-medium ${
                  shiftInfo.hourlyRate === "未設定"
                    ? "text-gray-400"
                    : "text-green-600"
                }`}
              >
                {shiftInfo.hourlyRate}
              </span>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <p className="text-xl mb-2">出勤時間：{clockInTime}</p>
          <p className="text-xl">退勤時間：{clockOutTime}</p>
        </div>
        <p className="text-red-500 mt-4">{status}</p>
        <div className="flex justify-center gap-4 mt-6">
          <button
            onClick={() => handleClock("clock_in")}
            className={`px-6 py-3 rounded ${
              isClockInDisabled
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
            disabled={isClockInDisabled}
          >
            出勤
          </button>
          <button
            onClick={() => handleClock("clock_out")}
            className={`px-6 py-3 rounded ${
              isClockOutDisabled
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-red-500 hover:bg-red-600 text-white"
            }`}
            disabled={isClockOutDisabled}
          >
            退勤
          </button>
        </div>
      </div>
    </UserLayout>
  );
}
