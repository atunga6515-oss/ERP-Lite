"use client";

import { useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, User, ShieldCheck, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleForgotPassword = async () => {
    const email = prompt("Kayıtlı e-posta adresinizi girin:");
    if (!email) return;
    try {
      const baseURL = typeof window !== "undefined" ? `http://${window.location.hostname}:8080/api` : "http://localhost:8080/api";
      const res = await axios.post(`${baseURL}/auth/forgot-password`, { email });
      setInfo(res.data.message);
      setError("");
    } catch {
      setError("Şifre sıfırlama talebi gönderilemedi.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const baseURL = typeof window !== "undefined" ? `http://${window.location.hostname}:8080/api` : "http://localhost:8080/api";
      const res = await axios.post(`${baseURL}/auth/login`, {
        username,
        password
      });
      login(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Giriş başarısız. Lütfen bilgilerinizi kontrol edin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Background Ornaments */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]"></div>

      <Card className="w-full max-w-md bg-slate-900 border-slate-800 shadow-2xl relative z-10">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-600/10 rounded-2xl border border-blue-500/20">
              <ShieldCheck className="w-10 h-10 text-blue-500" />
            </div>
          </div>
          <CardTitle className="text-2xl font-black text-white tracking-tight">ERP LITE v1.2.0</CardTitle>
          <CardDescription className="text-slate-400">
            Sisteme devam etmek için giriş yapın.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {info && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                {info}
              </div>
            )}
            
            <div className="space-y-2">
              <Label className="text-slate-300">Kullanıcı Adı</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <Input 
                  placeholder="Kullanıcı adınız"
                  className="bg-slate-800 border-slate-700 text-white pl-10 focus:ring-blue-600"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-slate-300">Şifre</Label>
                <button type="button" onClick={handleForgotPassword} className="text-xs text-blue-400 hover:underline">Şifremi Unuttum?</button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <Input 
                  type="password"
                  placeholder="••••••••"
                  className="bg-slate-800 border-slate-700 text-white pl-10 focus:ring-blue-600"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-md font-bold transition-all shadow-lg shadow-blue-600/20"
              disabled={loading}
            >
              {loading ? "Giriş Yapılıyor..." : "Giriş Yap"}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-500">
              © 2026 ERP Lite Cloud Systems. <br/> Tüm hakları saklıdır.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
