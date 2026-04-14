"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn, Mail, Lock, Loader2 } from "lucide-react";
import { useAppContext } from "@/context/AppContext";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useAppContext();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        ...formData,
        redirect: false,
      });

      if (res?.error) {
        setError(t("invalidCredentials"));
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError(t("failedSignIn"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="glass card">
        <h1 className="glow-text">{t("welcome")}</h1>
        <p style={{ color: "rgba(255,255,255,0.6)", marginBottom: "2rem" }}>
          {t("welcomeSubtitle")}
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          <div style={{ position: "relative" }}>
            <Mail size={18} style={{ position: "absolute", left: "12px", top: "14px", color: "var(--accent)" }} />
            <input
              type="email"
              placeholder={t("email")}
              className="input-field"
              style={{ paddingLeft: "40px" }}
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div style={{ position: "relative" }}>
            <Lock size={18} style={{ position: "absolute", left: "12px", top: "14px", color: "var(--accent)" }} />
            <input
              type="password"
              placeholder={t("password")}
              className="input-field"
              style={{ paddingLeft: "40px" }}
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          {error && <p className="error-bg">{error}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <LogIn size={20} />}
            {t("signIn")}
          </button>
        </form>

        <p style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.9rem" }}>
          {t("dontHaveAccount")}{" "}
          <Link href="/register" style={{ color: "var(--accent)", fontWeight: "600" }}>
            {t("joinNowBtn")}
          </Link>
        </p>
      </div>
      
      <style jsx global>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
