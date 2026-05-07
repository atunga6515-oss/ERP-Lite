"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { AuthProvider, useAuth } from "@/context/AuthContext";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LayoutContent>{children}</LayoutContent>
    </AuthProvider>
  );
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loading } = useAuth();
  
  const isAuthPage = pathname === "/login" || pathname === "/sifre-belirle";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex bg-slate-50 min-h-screen w-full">
      {!isAuthPage && <Sidebar />}
      <main className={`${!isAuthPage ? 'flex-1 p-8 overflow-y-auto' : 'w-full'}`}>
        {children}
      </main>
    </div>
  );
}
