"use client";

import { useEffect, useMemo, useState } from "react";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  setDoc,
} from "firebase/firestore";

type AvailabilityMap = Record<string, boolean>;

type EventData = {
  time?: string | null;
  title?: string;
  note?: string | null;
  [key: string]: unknown;
};

type UserData = {
  id: string;
  displayName?: string;
  availability?: AvailabilityMap;
  role?: "student" | "teacher";
  [key: string]: unknown;
};

function formatDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMonthMatrix(baseDate: Date) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay();
  const startDate = new Date(year, month, 1 - startDay);

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    days.push(d);
  }

  return days;
}

export default function HomeCalendar() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [events, setEvents] = useState<Record<string, EventData>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [myAvailability, setMyAvailability] = useState<AvailabilityMap>({});
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [month, setMonth] = useState(() => new Date());

  const user = auth.currentUser;

  useEffect(() => {
    const load = async () => {
      try {
        const userSnap = await getDocs(collection(db, "users"));
        const list: UserData[] = userSnap.docs.map((d) => ({
          ...(d.data() as Omit<UserData, "id">),
          id: d.id,
        }));

        setUsers(list);

        const me = list.find((u) => u.id === user?.uid);
        setMyAvailability(me?.availability || {});
        setRole(me?.role || "student");

        const eventSnap = await getDocs(collection(db, "events"));
        const ev: Record<string, EventData> = {};
        eventSnap.forEach((snap) => {
          ev[snap.id] = snap.data() as EventData;
        });
        setEvents(ev);
      } catch (error) {
        console.error("データ読み込みエラー:", error);
      }
    };

    load();
  }, [user]);

  const days = useMemo(() => getMonthMatrix(month), [month]);

  const prevMonth = () => {
    setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(formatDateKey(today));
  };

  const toggle = async (dateKey: string) => {
    if (!user) return;

    const next = { ...myAvailability };

    if (next[dateKey]) {
      delete next[dateKey];
    } else {
      next[dateKey] = true;
    }

    setMyAvailability(next);

    try {
      await updateDoc(doc(db, "users", user.uid), {
        availability: next,
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.uid
            ? {
                ...u,
                availability: next,
              }
            : u
        )
      );
    } catch (error) {
      console.error("参加状態更新エラー:", error);
      setMyAvailability(myAvailability);
    }
  };

  const editEvent = async (dateKey: string) => {
    const current = events[dateKey];

    const title = prompt("活動内容", current?.title ?? "");
    if (title === null) return;

    const time = prompt("時間（例:15:40-18:00）", current?.time ?? "");
    if (time === null) return;

    const note = prompt("メモ", current?.note ?? "");
    if (note === null) return;

    try {
      await setDoc(doc(db, "events", dateKey), {
        title,
        time,
        note,
      });

      setEvents((prev) => ({
        ...prev,
        [dateKey]: { title, time, note },
      }));
    } catch (error) {
      console.error("イベント更新エラー:", error);
    }
  };

  const getParticipants = (dateKey: string) => {
    return users.filter((u) => u.availability?.[dateKey]);
  };

  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];

  return (
    <div style={{ marginTop: 40 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <h2 style={{ margin: 0 }}>📅 活動カレンダー</h2>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={prevMonth}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #ccc",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            ←
          </button>

          <div style={{ fontWeight: "bold", minWidth: 100, textAlign: "center" }}>
            {month.getFullYear()}年 {month.getMonth() + 1}月
          </div>

          <button
            type="button"
            onClick={nextMonth}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #ccc",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            →
          </button>

          <button
            type="button"
            onClick={goToToday}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #ccc",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            今日
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 6,
          marginBottom: 6,
        }}
      >
        {dayNames.map((name) => (
          <div
            key={name}
            style={{
              textAlign: "center",
              fontWeight: "bold",
              padding: "4px 0",
            }}
          >
            {name}
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 6,
        }}
      >
        {days.map((day) => {
          const key = formatDateKey(day);
          const event = events[key];
          const isMine = !!myAvailability[key];
          const isToday = key === formatDateKey(new Date());
          const isSelected = key === selectedDate;
          const isCurrentMonth = day.getMonth() === month.getMonth();

          let border = "1px solid #ccc";
          if (isToday) border = "2px solid #2563eb";
          if (isSelected) border = "3px solid #000";

          let background = "#fff";
          if (event) background = "#dbeafe";
          if (isMine) background = "#dcfce7";

          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedDate(key)}
              style={{
                minHeight: 90,
                borderRadius: 10,
                border,
                padding: 6,
                background,
                cursor: "pointer",
                color: isCurrentMonth ? "#111" : "#999",
              }}
            >
              <div style={{ fontWeight: "bold" }}>{day.getDate()}</div>

              <div style={{ fontSize: 12, marginTop: 4 }}>
                {event?.time?.trim() ? event.time : "-"}
              </div>

              <div style={{ fontSize: 12, marginTop: 4 }}>
                {isMine ? "参加可" : "未定"}
              </div>
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div
          style={{
            marginTop: 20,
            padding: 12,
            border: "1px solid #ccc",
            borderRadius: 10,
          }}
        >
          <h3 style={{ marginTop: 0 }}>{selectedDate}</h3>

          {events[selectedDate] ? (
            <>
              <p style={{ margin: "6px 0" }}>
                <strong>時間:</strong> {events[selectedDate].time || "-"}
              </p>
              <p style={{ margin: "6px 0" }}>
                <strong>活動:</strong> {events[selectedDate].title || "-"}
              </p>
              <p style={{ margin: "6px 0" }}>
                <strong>メモ:</strong> {events[selectedDate].note || "-"}
              </p>
            </>
          ) : (
            <p style={{ margin: "6px 0" }}>この日の予定はまだありません。</p>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <button
              type="button"
              onClick={() => toggle(selectedDate)}
              style={{
                padding: "8px 12px",
                background: myAvailability[selectedDate] ? "#fecaca" : "#bbf7d0",
                borderRadius: 8,
                border: "1px solid #ccc",
                cursor: "pointer",
              }}
            >
              {myAvailability[selectedDate] ? "参加取り消し" : "参加する"}
            </button>

            {role === "teacher" && (
              <button
                type="button"
                onClick={() => editEvent(selectedDate)}
                style={{
                  padding: "8px 12px",
                  background: "#fde68a",
                  borderRadius: 8,
                  border: "1px solid #ccc",
                  cursor: "pointer",
                }}
              >
                イベント編集
              </button>
            )}
          </div>

          <h4 style={{ marginTop: 16, marginBottom: 8 }}>参加できる人</h4>
          {getParticipants(selectedDate).length > 0 ? (
            <ul style={{ marginTop: 0, paddingLeft: 20 }}>
              {getParticipants(selectedDate).map((u) => (
                <li key={u.id}>{u.displayName || "名前未設定"}</li>
              ))}
            </ul>
          ) : (
            <p style={{ marginTop: 0 }}>まだいません</p>
          )}
        </div>
      )}
    </div>
  );
}