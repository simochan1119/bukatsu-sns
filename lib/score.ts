import { collection, getDocs, doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

function hasSchedule(eventData: any) {
  const title = typeof eventData?.title === "string" ? eventData.title.trim() : "";
  const time = typeof eventData?.time === "string" ? eventData.time.trim() : "";
  const note = typeof eventData?.note === "string" ? eventData.note.trim() : "";
  return title !== "" || time !== "" || note !== "";
}

export async function calculateUserScore(uid: string): Promise<number | null> {
  const userDoc = await getDoc(doc(db, "users", uid));
  if (!userDoc.exists()) return null;
  const userData = userDoc.data();
  if (userData.role === "teacher") return null;

  const usersSnap = await getDocs(collection(db, "users"));
  let leaderData: Record<string, any> | null = null;
  usersSnap.forEach(snap => {
    const data = snap.data();
    if (data.role === "leader") {
      leaderData = data;
    }
  });

  if (!leaderData) return null;

  const eventsSnap = await getDocs(collection(db, "events"));
  // 空のイベントドキュメント（予定なし）を除外する
  const allEvents = eventsSnap.docs
    .filter(d => hasSchedule(d.data()))
    .map(d => d.id);

  const createdAt = userData.createdAt as Timestamp;
  let createdDateString = "2026-05-01"; // デフォルトの基準日
  if (createdAt) {
    const date = createdAt.toDate();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const userCreatedAt = `${y}-${m}-${d}`;
    // 5/1より後に入部した場合は、アカウント作成日を基準にする
    if (userCreatedAt > "2026-05-01") {
      createdDateString = userCreatedAt;
    }
  }

  // 昨日時点までの日付文字列を作成
  const today = new Date();
  today.setDate(today.getDate() - 1); // 昨日
  const yYest = today.getFullYear();
  const mYest = String(today.getMonth() + 1).padStart(2, "0");
  const dYest = String(today.getDate()).padStart(2, "0");
  const yesterdayString = `${yYest}-${mYest}-${dYest}`;

  // 入部日 〜 昨日 までの範囲に絞る
  const validEvents = allEvents.filter(dateKey => dateKey >= createdDateString && dateKey <= yesterdayString);

  let leaderAttendance = 0;
  let studentAttendance = 0;

  for (const dateKey of validEvents) {
    const leaderAbsent = leaderData.absence?.[dateKey] === true;
    const studentAbsent = userData.absence?.[dateKey] === true;

    if (!leaderAbsent) leaderAttendance++;
    if (!studentAbsent) studentAttendance++;
  }

  if (leaderAttendance === 0) {
    const badgesCount = Array.isArray(userData.badges) ? userData.badges.length : 0;
    const certifiedTagsCount = Array.isArray(userData.certifiedTags) ? userData.certifiedTags.length : 0;
    const bonusPoints = (badgesCount + certifiedTagsCount) * 3;
    return (userData.manualPoints || 0) + bonusPoints;
  }

  const badgesCount = Array.isArray(userData.badges) ? userData.badges.length : 0;
  const certifiedTagsCount = Array.isArray(userData.certifiedTags) ? userData.certifiedTags.length : 0;
  const bonusPoints = (badgesCount + certifiedTagsCount) * 3;

  const rawScore = (studentAttendance / leaderAttendance) * 100;
  const finalScore = Math.floor(rawScore) + (userData.manualPoints || 0) + bonusPoints;

  return finalScore;
}
