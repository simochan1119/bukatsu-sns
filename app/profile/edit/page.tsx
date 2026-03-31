"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function ProfileEditPage() {
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setDisplayName(data.displayName || "");
          setBio(data.bio || "");
          setTagsInput((data.selfTags || []).join(", "));
        }
      } catch (error) {
        console.error("プロフィール取得失敗", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) {
      setMessage("ログインしてください");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const selfTags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await updateDoc(doc(db, "users", user.uid), {
        displayName,
        bio,
        selfTags,
      });

      setMessage("保存できました");
    } catch (error) {
      console.error("保存失敗", error);
      setMessage("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main style={{ padding: 24 }}>
        <p>読み込み中...</p>
      </main>
    );
  }

  if (!auth.currentUser) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: "bold", marginBottom: 16 }}>
          プロフィール編集
        </h1>
        <p>ログインが必要です。</p>
        <p style={{ marginTop: 12 }}>
          <Link href="/login">ログイン画面へ</Link>
        </p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: "bold", marginBottom: 16 }}>
        プロフィール編集
      </h1>

      <p style={{ marginBottom: 20 }}>
        <Link href="/">ホームへ戻る</Link>
      </p>

      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: 12,
          padding: 16,
          display: "grid",
          gap: 14,
        }}
      >
        <div>
          <label style={{ display: "block", marginBottom: 6 }}>表示名</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 6 }}>ひとこと</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 6 }}>
            自己申告タグ（カンマ区切り）
          </label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="初心者歓迎, 相談OK, Unity好き"
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <div>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ padding: "8px 12px", cursor: "pointer" }}
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>

        {message && <p>{message}</p>}
      </div>
    </main>
  );
}