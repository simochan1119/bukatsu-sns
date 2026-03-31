import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

export function observeAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}