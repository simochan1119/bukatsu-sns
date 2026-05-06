"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { observeAuthState } from "@/lib/auth";
import HomeCalendar from "@/app/components/HomeCalendar";
import { BadgeChip, GradeChip, RoleChip } from "@/app/components/BadgeChips";
import { styles } from "@/app/components/ui";

type Role = "student" | "teacher" | "leader";

type UserProfile = {
  uid?: string;
  displayName: string;
  email: string;
  role: Role;
  grade?: number;
  bio?: string;
  selfTags?: string[];
  certifiedTags?: string[];
  badges?: string[];
  photoURL?: string;
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = observeAuthState(async (firebaseUser) => {
      setUser(firebaseUser);

      if (!firebaseUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));

        if (snap.exists()) {
          const data = snap.data();

          setProfile({
            uid: firebaseUser.uid,
            displayName: data.displayName ?? "",
            email: data.email ?? firebaseUser.email ?? "",
            role: (data.role ?? "student") as Role,
            grade: typeof data.grade === "number" ? data.grade : undefined,
            bio: data.bio ?? "",
            selfTags: Array.isArray(data.selfTags) ? data.selfTags : [],
            certifiedTags: Array.isArray(data.certifiedTags)
              ? data.certifiedTags
              : [],
            badges: Array.isArray(data.badges) ? data.badges : [],
            photoURL: data.photoURL ?? "",
          });
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error("プロフィール取得失敗", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  const renderTags = (
    tags?: string[],
    borderColor = "#ccc",
    background = "#fff",
    color = "#333"
  ) => {
    if (!tags || tags.length === 0) {
      return <span style={{ color: "#666" }}>なし</span>;
    }

    return (
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        {tags.map((tag, i) => (
          <span
            key={i}
            style={{
              border: `1px solid ${borderColor}`,
              background,
              color,
              borderRadius: 999,
              padding: "6px 10px",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    );
  };

  const renderBadges = (badges?: string[]) => {
    if (!badges || badges.length === 0) {
      return <span style={{ color: "#666" }}>なし</span>;
    }

    return (
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        {badges.map((badge, i) => (
          <BadgeChip key={`${badge}-${i}`} label={badge} />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <main style={{ padding: 24 }}>
        <p>読み込み中...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
        <h1 style={{ fontSize: 32, fontWeight: "bold", marginBottom: 20 }}>
          部活SNS
        </h1>

        <div style={styles.card}>
          <p style={{ marginBottom: 16 }}>ログインしていません。</p>
          <Link href="/login" style={styles.buttonPrimary}>
            ログインへ
          </Link>
        </div>
      </main>
    );
  }

  const role = profile?.role ?? "student";

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 32, fontWeight: "bold", marginBottom: 20 }}>
        部活SNS
      </h1>

      <div style={styles.card}>
        {/* プロフィールヘッダー */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 18,
          }}
        >
          <img
            src={profile?.photoURL || "/default-avatar.png"}
            style={{
              width: 90,
              height: 90,
              borderRadius: "50%",
              objectFit: "cover",
              border: "2px solid #ddd",
              background: "#f5f5f5",
            }}
          />

          <div style={{ flex: 1 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 26,
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {profile?.displayName || user.email}
              {role !== "student" && <RoleChip role={role} />}
              <GradeChip grade={profile?.grade} />
            </h2>

            <p style={{ margin: "8px 0 0", color: "#666" }}>
              {profile?.email}
            </p>
          </div>
        </div>

        {/* ひとこと */}
        <div
          style={{
            padding: 14,
            borderRadius: 12,
            background: "#f8fafc",
            border: "1px solid #e5e7eb",
          }}
        >
          <strong>ひとこと</strong>
          <p style={{ margin: "8px 0 0" }}>
            {profile?.bio?.trim() ? profile.bio : "まだありません"}
          </p>
        </div>

        {/* タグ類 */}
        <div style={{ display: "grid", gap: 16, marginTop: 18 }}>
          <div>
            <strong>自己申告タグ</strong>
            {renderTags(profile?.selfTags)}
          </div>

          <div>
            <strong>教員認定タグ</strong>
            {renderTags(
              profile?.certifiedTags,
              "#fbc02d",
              "#fff8e1",
              "#795548"
            )}
          </div>

          <div>
            <strong>バッジ</strong>
            {renderBadges(profile?.badges)}
          </div>
        </div>

        {/* ボタン */}
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginTop: 22,
          }}
        >
          <Link href="/members" style={styles.linkButton}>
            部員一覧
          </Link>

          <Link href="/profile/edit" style={styles.buttonSecondary}>
            プロフィール編集
          </Link>

          {role === "teacher" && (
            <Link href="/admin/edit" style={styles.buttonPrimary}>
              教員用編集
            </Link>
          )}

          <button onClick={handleLogout} style={styles.buttonDanger}>
            ログアウト
          </button>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <HomeCalendar />
      </div>
    </main>
  );
}