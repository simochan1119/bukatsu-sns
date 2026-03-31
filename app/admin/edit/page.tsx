"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, updateDoc } from "firebase/firestore";

type Badge = {
  name: string;
  level: number;
};

type AppUser = {
  uid: string;
  displayName: string;
  role: "student" | "teacher";
  certifiedTags?: string[];
  badges?: Badge[];
};

export default function AdminEditPage() {
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
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

        const myData = mySnap.data();
        const role = myData.role ?? "student";
        setCurrentRole(role);

        if (role !== "teacher") {
          setLoading(false);
          return;
        }

        const snap = await getDocs(collection(db, "users"));
        const list = snap.docs.map((d) => d.data() as AppUser);
        setUsers(list);
      } catch (error) {
        console.error("教員画面の読み込み失敗", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleCertifiedTagsChange = (index: number, value: string) => {
    const newUsers = [...users];
    newUsers[index].certifiedTags = value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    setUsers(newUsers);
  };

  const handleBadgesChange = (index: number, value: string) => {
    const badges = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const [name, level] = item.split(":").map((v) => v.trim());
        return {
          name,
          level: Number(level || 1),
        };
      });

    const newUsers = [...users];
    newUsers[index].badges = badges;
    setUsers(newUsers);
  };

  const badgeArrayToInput = (badges?: Badge[]) => {
    if (!badges || badges.length === 0) return "";
    return badges.map((b) => `${b.name}:${b.level}`).join(", ");
  };

  const saveUser = async (user: AppUser) => {
    try {
      await updateDoc(doc(db, "users", user.uid), {
        certifiedTags: user.certifiedTags || [],
        badges: user.badges || [],
      });
      alert("保存できました");
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
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
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
              gap: 10,
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: "bold", margin: 0 }}>
              {u.displayName}
            </h2>

            <p style={{ margin: 0 }}>ロール: {u.role}</p>

            <div>
              <label style={{ display: "block", marginBottom: 6 }}>
                教員認定タグ（カンマ区切り）
              </label>
              <input
                type="text"
                value={(u.certifiedTags || []).join(", ")}
                onChange={(e) => handleCertifiedTagsChange(index, e.target.value)}
                style={{ width: "100%", padding: 10 }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 6 }}>
                バッジ（例: Unity:3, 後輩サポーター:2）
              </label>
              <input
                type="text"
                value={badgeArrayToInput(u.badges)}
                onChange={(e) => handleBadgesChange(index, e.target.value)}
                style={{ width: "100%", padding: 10 }}
              />
            </div>

            <div>
              <button
                onClick={() => saveUser(u)}
                style={{ padding: "8px 12px", cursor: "pointer" }}
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