"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function DebugPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function load() {
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        
        let waka = null;
        let leader = null;
        
        usersSnap.forEach(snap => {
          const d = snap.data();
          if (d.displayName === "若林") waka = { id: snap.id, ...d };
          if (d.role === "leader") leader = { id: snap.id, ...d };
        });

        if (!waka) {
          setError("若林さんが見つかりません。");
          return;
        }
        if (!leader) {
          setError("リーダーが見つかりません。");
          return;
        }

        const eventsSnap = await getDocs(collection(db, "events"));
        
        const hasSchedule = (eventData: any) => {
          const title = typeof eventData?.title === "string" ? eventData.title.trim() : "";
          const time = typeof eventData?.time === "string" ? eventData.time.trim() : "";
          const note = typeof eventData?.note === "string" ? eventData.note.trim() : "";
          return title !== "" || time !== "" || note !== "";
        };

        const allEvents = eventsSnap.docs
          .filter(d => hasSchedule(d.data()))
          .map(d => d.id).sort();

        const createdAt = waka.createdAt as Timestamp;
        let createdDateString = "2026-05-01";
        if (createdAt) {
          const date = createdAt.toDate();
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, "0");
          const d = String(date.getDate()).padStart(2, "0");
          const userCreatedAt = `${y}-${m}-${d}`;
          if (userCreatedAt > "2026-05-01") {
            createdDateString = userCreatedAt;
          }
        }

        const today = new Date();
        today.setDate(today.getDate() - 1);
        const yYest = today.getFullYear();
        const mYest = String(today.getMonth() + 1).padStart(2, "0");
        const dYest = String(today.getDate()).padStart(2, "0");
        const yesterdayString = `${yYest}-${mYest}-${dYest}`;

        const validEvents = allEvents.filter(dateKey => dateKey >= createdDateString && dateKey <= yesterdayString);

        let leaderAttendance = 0;
        let studentAttendance = 0;
        let eventsList: any[] = [];

        for (const dateKey of validEvents) {
          const leaderAbsent = leader.absence?.[dateKey] === true;
          const studentAbsent = waka.absence?.[dateKey] === true;

          eventsList.push({
            date: dateKey,
            leaderAttended: !leaderAbsent,
            studentAttended: !studentAbsent
          });

          if (!leaderAbsent) leaderAttendance++;
          if (!studentAbsent) studentAttendance++;
        }

        const rawScore = leaderAttendance === 0 ? 0 : (studentAttendance / leaderAttendance) * 100;
        const manualPoints = waka.manualPoints || 0;
        const badgesCount = Array.isArray(waka.badges) ? waka.badges.length : 0;
        const certifiedTagsCount = Array.isArray(waka.certifiedTags) ? waka.certifiedTags.length : 0;
        const bonusPoints = (badgesCount + certifiedTagsCount) * 3;
        
        const finalScore = Math.floor(rawScore) + manualPoints + bonusPoints;

        setData({
          waka: {
            id: waka.id,
            displayName: waka.displayName,
            createdAt: createdDateString,
            manualPoints,
            badgesCount,
            certifiedTagsCount,
            bonusPoints
          },
          leader: {
            id: leader.id,
            displayName: leader.displayName
          },
          calculation: {
            allEventsCount: allEvents.length,
            validEventsCount: validEvents.length,
            leaderAttendance,
            studentAttendance,
            rawScore,
            finalScore
          },
          eventsDetails: eventsList
        });
      } catch (err: any) {
        setError(err.message);
      }
    }
    load();
  }, []);

  if (error) return <div style={{ padding: 20 }}>エラー: {error}</div>;
  if (!data) return <div style={{ padding: 20 }}>読み込み中...</div>;

  return (
    <main style={{ padding: 24, maxWidth: 800, margin: "0 auto", lineHeight: 1.6 }}>
      <h2>📊 「若林」さんのスコア計算 デバッグ情報</h2>
      <div style={{ background: "#f8fafc", padding: 16, borderRadius: 8, marginBottom: 16 }}>
        <p><strong>若林さんの基準日（入部日）:</strong> {data.waka.createdAt}</p>
        <p><strong>手動ポイント:</strong> {data.waka.manualPoints} pt</p>
        <p><strong>タグ・バッジボーナス:</strong> {data.waka.bonusPoints} pt</p>
      </div>

      <div style={{ background: "#e0f2fe", padding: 16, borderRadius: 8, marginBottom: 16 }}>
        <h3>🧮 計算結果</h3>
        <p>入部以降の活動日: {data.calculation.validEventsCount} 日</p>
        <p>同期間の <strong>リーダーの出席数 (分母)</strong>: {data.calculation.leaderAttendance} 日</p>
        <p>同期間の <strong>若林さんの出席数 (分子)</strong>: {data.calculation.studentAttendance} 日</p>
        <hr />
        <p><strong>出席率:</strong></p>
        <code>({data.calculation.studentAttendance} ÷ {data.calculation.leaderAttendance}) × 100 = {data.calculation.rawScore.toFixed(2)} %</code>
        <p><strong>最終スコア:</strong></p>
        <code>Math.floor({data.calculation.rawScore.toFixed(2)}) + {data.waka.manualPoints} (手動) + {data.waka.bonusPoints} (ボーナス) = <strong>{data.calculation.finalScore} pt</strong></code>
      </div>

      <h3>📅 入部以降のイベント別 出席状況</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
        <thead>
          <tr style={{ background: "#eee", textAlign: "left" }}>
            <th style={{ padding: 8, border: "1px solid #ccc" }}>日付</th>
            <th style={{ padding: 8, border: "1px solid #ccc" }}>リーダー</th>
            <th style={{ padding: 8, border: "1px solid #ccc" }}>若林さん</th>
          </tr>
        </thead>
        <tbody>
          {data.eventsDetails.map((ev: any, i: number) => (
            <tr key={i}>
              <td style={{ padding: 8, border: "1px solid #ccc" }}>{ev.date}</td>
              <td style={{ padding: 8, border: "1px solid #ccc" }}>{ev.leaderAttended ? "〇 出席" : "× 欠席"}</td>
              <td style={{ padding: 8, border: "1px solid #ccc" }}>{ev.studentAttended ? "〇 出席" : "× 欠席"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
