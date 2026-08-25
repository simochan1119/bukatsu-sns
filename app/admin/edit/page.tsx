"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  BadgeChip,
  GradeChip,
  RoleChip,
} from "@/app/components/BadgeChips";

type Role = "student" | "teacher" | "leader";

type FirestoreUserDoc = {
  displayName?: string;
  email?: string;
  role?: Role;
  grade?: number;
  bio?: string;
  selfTags?: string[];
  certifiedTags?: string[];
  badges?: string[];
  manualPoints?: number;
  absence?: Record<string, boolean>;
};

type FirestoreBadgeMasterDoc = {
  name?: string;
};

type AppUser = {
  uid: string;
  displayName: string;
  role: Role;
  grade?: number;
  certifiedTags: string[];
  badges: string[];
  manualPoints: number;
  absence: Record<string, boolean>;
};

type BadgeMasterItem = {
  id: string;
  name: string;
};

export default function AdminEditPage() {
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [badgeMaster, setBadgeMaster] = useState<BadgeMasterItem[]>([]);
  const [selectedBadgeMap, setSelectedBadgeMap] = useState<Record<string, string>>(
    {}
  );
  const [newBadgeMap, setNewBadgeMap] = useState<Record<string, string>>({});
  const [absenceInputs, setAbsenceInputs] = useState<Record<string, { date: string }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        setCurrentRole("guest");
        setLoading(false);
        return;
      }

      try {
        const mySnap = await getDoc(doc(db, "users", currentUser.uid));

        if (!mySnap.exists()) {
          setCurrentRole("guest");
          setLoading(false);
          return;
        }

        const myData = mySnap.data() as FirestoreUserDoc;
        const role = myData.role ?? "student";
        setCurrentRole(role);

        if (role !== "teacher") {
          setLoading(false);
          return;
        }

        const usersSnap = await getDocs(collection(db, "users"));
        const userList: AppUser[] = usersSnap.docs.map((d) => {
          const data = d.data() as FirestoreUserDoc;

          return {
            uid: d.id,
            displayName: data.displayName ?? "名無し",
            role: (data.role ?? "student") as Role,
            grade: typeof data.grade === "number" ? data.grade : undefined,
            certifiedTags: Array.isArray(data.certifiedTags)
              ? data.certifiedTags
              : [],
            badges: Array.isArray(data.badges) ? data.badges : [],
            manualPoints: typeof data.manualPoints === "number" ? data.manualPoints : 0,
            absence: data.absence || {},
          };
        });

        setUsers(userList);

        const badgeSnap = await getDocs(collection(db, "badgeMaster"));
        const badgeList: BadgeMasterItem[] = badgeSnap.docs
          .map((d) => {
            const data = d.data() as FirestoreBadgeMasterDoc;
            return {
              id: d.id,
              name: data.name ?? "",
            };
          })
          .filter((item) => item.name.trim() !== "")
          .sort((a, b) => a.name.localeCompare(b.name, "ja"));

        setBadgeMaster(badgeList);
      } catch (error) {
        console.error("教員画面の読み込み失敗", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const normalizeArray = (arr?: string[]) => {
    return Array.from(new Set((arr || []).map((v) => v.trim()).filter(Boolean)));
  };

  const handleGradeChange = (index: number, value: string) => {
    const newUsers = [...users];
    const num = Number(value);

    newUsers[index].grade =
      value.trim() === "" || Number.isNaN(num) ? undefined : num;

    setUsers(newUsers);
  };

  const handleManualPointsChange = (index: number, value: string) => {
    const newUsers = [...users];
    const num = Number(value);

    newUsers[index].manualPoints =
      value.trim() === "" || Number.isNaN(num) ? 0 : num;

    setUsers(newUsers);
  };

  const handleAbsenceUpdate = (index: number, isAbsent: boolean) => {
    const user = users[index];
    const date = absenceInputs[user.uid]?.date;
    if (!date) {
      alert("日付を入力してください");
      return;
    }
    
    const newUsers = [...users];
    const currentAbsence = { ...newUsers[index].absence };
    
    if (isAbsent) {
      currentAbsence[date] = true;
    } else {
      delete currentAbsence[date];
    }
    
    newUsers[index].absence = currentAbsence;
    setUsers(newUsers);
    
    alert(`${user.displayName}さんの ${date} を ${isAbsent ? '欠席' : '出席'} に変更しました。\n※最終的な保存は下部の「保存」ボタンを押してください。`);
  };

  const handleCertifiedTagsChange = (index: number, value: string) => {
    const newUsers = [...users];
    newUsers[index].certifiedTags = value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    setUsers(newUsers);
  };

  const addExistingBadgeToUser = (index: number) => {
    const user = users[index];
    const selected = selectedBadgeMap[user.uid]?.trim();

    if (!selected) return;

    const newUsers = [...users];
    const currentBadges = normalizeArray(newUsers[index].badges);
    newUsers[index].badges = normalizeArray([...currentBadges, selected]);
    setUsers(newUsers);
  };

  const removeBadgeFromUser = (index: number, badgeName: string) => {
    const newUsers = [...users];
    newUsers[index].badges = (newUsers[index].badges || []).filter(
      (b) => b !== badgeName
    );
    setUsers(newUsers);
  };

  const createNewBadgeAndAddToUser = async (index: number) => {
    const user = users[index];
    const input = (newBadgeMap[user.uid] || "").trim();

    if (!input) return;

    try {
      const q = query(collection(db, "badgeMaster"), where("name", "==", input));
      const existing = await getDocs(q);

      if (existing.empty) {
        await addDoc(collection(db, "badgeMaster"), {
          name: input,
          createdAt: serverTimestamp(),
        });

        setBadgeMaster((prev) =>
          [...prev, { id: `tmp-${Date.now()}`, name: input }].sort((a, b) =>
            a.name.localeCompare(b.name, "ja")
          )
        );
      }

      const newUsers = [...users];
      const currentBadges = normalizeArray(newUsers[index].badges);
      newUsers[index].badges = normalizeArray([...currentBadges, input]);
      setUsers(newUsers);

      setNewBadgeMap((prev) => ({
        ...prev,
        [user.uid]: "",
      }));
    } catch (error) {
      console.error("新規バッジ追加失敗", error);
      alert("新規バッジの追加に失敗しました");
    }
  };

  const saveUser = async (user: AppUser) => {
    try {
      await updateDoc(doc(db, "users", user.uid), {
        grade: user.grade ?? null,
        certifiedTags: normalizeArray(user.certifiedTags),
        badges: normalizeArray(user.badges),
        manualPoints: user.manualPoints,
        absence: user.absence,
      });

      alert(`${user.displayName} を保存できました`);
    } catch (error) {
      console.error("保存失敗", error);
      alert("保存に失敗しました");
    }
  };

  if (loading) {
    return (
      <main style={{ padding: 24 }}>
        <p>読み込み中...</p>
      </main>
    );
  }

  if (currentRole !== "teacher") {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: "bold", marginBottom: 16 }}>
          教員用ページ
        </h1>
        <p>このページには教員アカウントだけアクセスできます。</p>
        <p style={{ marginTop: 12 }}>
          <Link href="/">ホームへ戻る</Link>
        </p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: "bold", marginBottom: 16 }}>
        教員用編集画面
      </h1>

      <p style={{ marginBottom: 20 }}>
        <Link href="/">ホームへ戻る</Link>
      </p>

      <div style={{ display: "grid", gap: 16 }}>
        {users.map((u, index) => (
          <div
            key={u.uid}
            style={{
              border: "1px solid #ccc",
              borderRadius: 12,
              padding: 16,
              display: "grid",
              gap: 12,
            }}
          >
            <h2
              style={{
                fontSize: 20,
                fontWeight: "bold",
                margin: 0,
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              {u.displayName}
              {u.role !== "student" && <RoleChip role={u.role} />}
              <GradeChip grade={u.grade} />
            </h2>

            <div>
              <label style={{ display: "block", marginBottom: 6 }}>学年</label>
              <select
                value={u.grade ?? ""}
                onChange={(e) => handleGradeChange(index, e.target.value)}
                style={{
                  width: "100%",
                  padding: 10,
                  border: "1px solid #ccc",
                  borderRadius: 8,
                }}
              >
                <option value="">未設定</option>
                <option value="1">1年生</option>
                <option value="2">2年生</option>
                <option value="3">3年生</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 6 }}>
                手動ポイント (微調整用)
              </label>
              <input
                type="number"
                value={u.manualPoints}
                onChange={(e) => handleManualPointsChange(index, e.target.value)}
                style={{
                  width: "100%",
                  padding: 10,
                  border: "1px solid #ccc",
                  borderRadius: 8,
                }}
              />
            </div>

            <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <label style={{ display: "block", marginBottom: 6, fontWeight: "bold" }}>
                特定日の出欠を修正 (先生専用)
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  type="date"
                  value={absenceInputs[u.uid]?.date || ""}
                  onChange={(e) =>
                    setAbsenceInputs((prev) => ({
                      ...prev,
                      [u.uid]: { date: e.target.value },
                    }))
                  }
                  style={{
                    padding: 10,
                    border: "1px solid #ccc",
                    borderRadius: 8,
                    flex: "1 1 150px",
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleAbsenceUpdate(index, false)}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    borderRadius: 8,
                    border: "1px solid #ccc",
                    background: "#dcfce7",
                    color: "#166534",
                    fontWeight: "bold"
                  }}
                >
                  出席にする
                </button>
                <button
                  type="button"
                  onClick={() => handleAbsenceUpdate(index, true)}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    borderRadius: 8,
                    border: "1px solid #ccc",
                    background: "#fee2e2",
                    color: "#991b1b",
                    fontWeight: "bold"
                  }}
                >
                  欠席にする
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 6 }}>
                教員認定タグ（カンマ区切り）
              </label>
              <input
                type="text"
                value={(u.certifiedTags || []).join(", ")}
                onChange={(e) => handleCertifiedTagsChange(index, e.target.value)}
                style={{
                  width: "100%",
                  padding: 10,
                  border: "1px solid #ccc",
                  borderRadius: 8,
                }}
                placeholder="例: C言語得意, 後輩指導OK"
              />
            </div>

            <div>
              <div style={{ marginBottom: 6, fontWeight: "bold" }}>
                現在のバッジ
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(u.badges || []).length > 0 ? (
                  u.badges.map((badge) => (
                    <span
                      key={badge}
                      style={{ display: "inline-flex", alignItems: "center" }}
                    >
                      <BadgeChip label={badge} />
                      <button
                        type="button"
                        onClick={() => removeBadgeFromUser(index, badge)}
                        style={{
                          marginLeft: -2,
                          marginRight: 8,
                          cursor: "pointer",
                          border: "1px solid #ccc",
                          background: "#fff",
                          borderRadius: 999,
                          width: 24,
                          height: 24,
                        }}
                        title="このバッジを外す"
                      >
                        ×
                      </button>
                    </span>
                  ))
                ) : (
                  <span>まだありません</span>
                )}
              </div>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 6 }}>
                既存バッジから追加
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <select
                  value={selectedBadgeMap[u.uid] || ""}
                  onChange={(e) =>
                    setSelectedBadgeMap((prev) => ({
                      ...prev,
                      [u.uid]: e.target.value,
                    }))
                  }
                  style={{
                    flex: "1 1 260px",
                    minWidth: 220,
                    padding: 10,
                    border: "1px solid #ccc",
                    borderRadius: 8,
                  }}
                >
                  <option value="">選んでください</option>
                  {badgeMaster.map((badge) => (
                    <option key={badge.id} value={badge.name}>
                      {badge.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => addExistingBadgeToUser(index)}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    borderRadius: 8,
                    border: "1px solid #ccc",
                    background: "#fff",
                  }}
                >
                  追加
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 6 }}>
                新しいバッジを作って追加
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  type="text"
                  value={newBadgeMap[u.uid] || ""}
                  onChange={(e) =>
                    setNewBadgeMap((prev) => ({
                      ...prev,
                      [u.uid]: e.target.value,
                    }))
                  }
                  placeholder="例: C言語基礎研修"
                  style={{
                    flex: "1 1 260px",
                    minWidth: 220,
                    padding: 10,
                    border: "1px solid #ccc",
                    borderRadius: 8,
                  }}
                />
                <button
                  type="button"
                  onClick={() => createNewBadgeAndAddToUser(index)}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    borderRadius: 8,
                    border: "1px solid #ccc",
                    background: "#fff",
                  }}
                >
                  新規作成して追加
                </button>
              </div>
            </div>

            <div>
              <button
                onClick={() => saveUser(u)}
                style={{
                  padding: "8px 12px",
                  cursor: "pointer",
                  borderRadius: 8,
                  border: "1px solid #ccc",
                  background: "#fff",
                }}
              >
                保存
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}