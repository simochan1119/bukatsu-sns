"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    setMessage("");

    if (!email || !password || !displayName) {
      setMessage("新規登録には名前・メールアドレス・パスワードが必要です。");
      return;
    }

    try {
      setLoading(true);

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        displayName,
        role: "student",
        selfTags: [],
        badges: [],
        createdAt: serverTimestamp(),
      });

      setMessage("新規登録できました。ログイン済みの状態です。");
      router.push("/");
    } catch (error: unknown) {
      if (error instanceof Error) {
        setMessage(`新規登録に失敗しました: ${error.message}`);
      } else {
        setMessage("新規登録に失敗しました。");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setMessage("");

    if (!email || !password) {
      setMessage("メールアドレスとパスワードを入力してください。");
      return;
    }

    try {
      setLoading(true);

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (!userDoc.exists()) {
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.email?.split("@")[0] ?? "ユーザー",
          role: "student",
          selfTags: [],
          badges: [],
          createdAt: serverTimestamp(),
        });
      }

      setMessage("ログイン成功");
      router.push("/");
    } catch (error: unknown) {
      if (error instanceof Error) {
        setMessage(`ログインに失敗しました: ${error.message}`);
      } else {
        setMessage("ログインに失敗しました。");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 420, margin: "40px auto", padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: "bold", marginBottom: 24 }}>
        部活SNS ログイン
      </h1>

      <div style={{ display: "grid", gap: 12 }}>
        <input
          type="text"
          placeholder="表示名（新規登録用）"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          style={{ padding: 12, fontSize: 16 }}
        />

        <input
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: 12, fontSize: 16 }}
        />

        <input
          type="password"
          placeholder="パスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: 12, fontSize: 16 }}
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{ padding: 12, fontSize: 16, cursor: "pointer" }}
        >
          {loading ? "処理中..." : "ログイン"}
        </button>

        <button
          onClick={handleSignUp}
          disabled={loading}
          style={{ padding: 12, fontSize: 16, cursor: "pointer" }}
        >
          {loading ? "処理中..." : "新規登録"}
        </button>

        {message && (
          <p style={{ marginTop: 8, color: "#333", whiteSpace: "pre-wrap" }}>
            {message}
          </p>
        )}
      </div>
    </main>
  );
}