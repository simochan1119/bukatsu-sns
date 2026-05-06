"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { auth, db, storage } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { styles } from "@/app/components/ui";

export default function ProfileEditPage() {
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const [photoURL, setPhotoURL] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
          setPhotoURL(data.photoURL || "");
        }
      } catch (error) {
        console.error("プロフィール取得失敗", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) return;

    // 🔥 サイズ制限（2MB）
    if (selectedFile.size > 2 * 1024 * 1024) {
      setMessage("画像サイズは2MB以下にしてください");
      return;
    }

    setFile(selectedFile);

    // 🔥 即時プレビュー
    const previewUrl = URL.createObjectURL(selectedFile);
    setPhotoURL(previewUrl);

    setMessage("");
  };

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

      let newPhotoURL = photoURL;

      // 🔥 Storageへアップロード
      if (file) {
        const storageRef = ref(
          storage,
          `profileImages/${user.uid}/${Date.now()}.jpg`
        );

        await uploadBytes(storageRef, file);

        newPhotoURL = await getDownloadURL(storageRef);
      }

      // 🔥 Firestore更新
      await updateDoc(doc(db, "users", user.uid), {
        displayName,
        bio,
        selfTags,
        photoURL: newPhotoURL,
      });

      // 🔥 キャッシュ対策
      setPhotoURL(`${newPhotoURL}?t=${Date.now()}`);

      setMessage("保存しました！");
    } catch (error) {
      console.error("保存失敗", error);
      setMessage("保存失敗");
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
        <h1
          style={{
            fontSize: 28,
            fontWeight: "bold",
            marginBottom: 20,
          }}
        >
          プロフィール編集
        </h1>

        <p>ログインしてください。</p>

        <Link href="/login" style={styles.buttonPrimary}>
          ログインへ
        </Link>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1
        style={{
          fontSize: 28,
          fontWeight: "bold",
          marginBottom: 20,
        }}
      >
        プロフィール編集
      </h1>

      <Link href="/" style={styles.buttonSecondary}>
        ← ホームへ戻る
      </Link>

      <div
        style={{
          ...styles.card,
          marginTop: 20,
          display: "grid",
          gap: 20,
        }}
      >
        {/* 🔥 プロフィール画像 */}
        <div>
          <p
            style={{
              fontWeight: "bold",
              marginBottom: 10,
            }}
          >
            プロフィール画像
          </p>

          {/* 🔥 画像クリックで変更 */}
          <img
            src={photoURL || "/default-avatar.png"}
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: 100,
              height: 100,
              borderRadius: "50%",
              objectFit: "cover",
              border: "2px solid #ccc",
              cursor: "pointer",
              transition: "0.2s",
            }}
            title="クリックして画像変更"
          />

          <p
            style={{
              fontSize: 13,
              color: "#666",
              marginTop: 8,
            }}
          >
            画像をクリックして変更
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
        </div>

        {/* 表示名 */}
        <div>
          <p
            style={{
              fontWeight: "bold",
              marginBottom: 6,
            }}
          >
            表示名
          </p>

          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #ccc",
            }}
          />
        </div>

        {/* ひとこと */}
        <div>
          <p
            style={{
              fontWeight: "bold",
              marginBottom: 6,
            }}
          >
            ひとこと
          </p>

          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #ccc",
            }}
          />
        </div>

        {/* タグ */}
        <div>
          <p
            style={{
              fontWeight: "bold",
              marginBottom: 6,
            }}
          >
            自己申告タグ（カンマ区切り）
          </p>

          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="初心者歓迎, Unity好き"
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #ccc",
            }}
          />
        </div>

        {/* 保存 */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={styles.buttonPrimary}
        >
          {saving ? "保存中..." : "保存する"}
        </button>

        {/* メッセージ */}
        {message && (
          <p
            style={{
              color: message.includes("失敗")
                ? "red"
                : message.includes("2MB")
                ? "orange"
                : "green",
              fontWeight: "bold",
            }}
          >
            {message}
          </p>
        )}
      </div>
    </main>
  );
}