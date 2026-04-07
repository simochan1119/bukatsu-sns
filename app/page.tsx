"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { observeAuthState } from "@/lib/auth";
import HomeCalendar from "@/app/components/HomeCalendar";
import { BadgeChip, RoleChip } from "@/app/components/BadgeChips";

type Role = "student" | "teacher" | "leader";

type UserProfile = {
  uid?: string;
  displayName: string;
  email: string;
  role: Role;
  bio?: string;
  selfTags?: string[];
  certifiedTags?: string[];
  badges?: string[];
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
          const data = snap.data() as Omit<UserProfile, "uid">;
          setProfile({
            uid: firebaseUser.uid,
            displayName: data.displayName ?? "",
            email: data.email ?? firebaseUser.email ?? "",
            role: (data.role ?? "student") as Role,
            bio: data.bio ?? "",
            selfTags: Array.isArray(data.selfTags) ? data.selfTags : [],
            certifiedTags: Array.isArray(data.certifiedTags) ? data.certifiedTags : [],
            badges: Array.isArray(data.badges) ? data.badges : [],
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
    try {
      await signOut(auth);
    } catch (error) {
      console.error("ログアウト失敗", error);
    }
  };

  const renderTags = (tags?: string[], borderColor = "#ccc", background = "#fff") => {
    if (!tags || tags.length === 0) {
      return <span>まだありません</span>;
    }

    return (
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        {tags.map((tag, index) => (
          <span
            key={index}
            style={{
              border: `1px solid ${borderColor}`,
              background,
              borderRadius: 999,
              padding: "6px 10px",
              fontSize: 14,
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
      return <span>まだありません</span>;
    }

    return (
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        {badges.map((badge, index) => (
          <BadgeChip key={`${badge}-${index}`} label={badge} />
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
        <h1 style={{ fontSize: 36, fontWeight: "bold", marginBottom: 20 }}>
          部活SNS
        </h1>
        <p style={{ marginBottom: 16 }}>ログインしていません。</p>
        <Link href="/login">ログイン画面へ</Link>
      </main>
    );
  }

  const role = profile?.role ?? "student";

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 36, fontWeight: "bold", marginBottom: 24 }}>
        部活SNS
      </h1>

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 16,
          padding: 20,
          display: "grid",
          gap: 16,
        }}
      >
        <p
          style={{
            fontSize: 24,
            fontWeight: "bold",
            margin: 0,
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          ようこそ、{profile?.displayName ?? user.email} さん
          {role !== "student" && <RoleChip role={role} />}
        </p>

        <div>
          <strong>ひとこと:</strong>{" "}
          {profile?.bio?.trim() ? profile.bio : "まだありません"}
        </div>

        <div>
          <strong>自己申告タグ（生徒が設定）</strong>
          {renderTags(profile?.selfTags)}
        </div>

        <div>
          <strong>教員認定タグ（教員が設定）</strong>
          {renderTags(profile?.certifiedTags, "#9ec0ff", "#f7fbff")}
        </div>

        <div>
          <strong>バッジ（教員が設定）</strong>
          {renderBadges(profile?.badges)}
        </div>

        <div style={{ marginTop: 8 }}>
          <HomeCalendar />
        </div>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 8 }}>
          <Link href="/members">部員一覧へ</Link>
          <Link href="/profile/edit">プロフィール編集</Link>

          {role === "teacher" && <Link href="/admin/edit">教員用編集</Link>}

          <button
            onClick={handleLogout}
            style={{
              padding: "8px 12px",
              cursor: "pointer",
              borderRadius: 8,
              border: "1px solid #ccc",
              background: "#fff",
            }}
          >
            ログアウト
          </button>
        </div>
      </div>
    </main>
  );
}