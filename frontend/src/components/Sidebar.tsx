"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import axios from "axios";
import { LayoutDashboard, Warehouse, Package, ArrowRightLeft, History, Boxes, Settings, FileBarChart, Hammer, BookOpen, ShoppingCart, Users, ChevronDown, ChevronRight, Truck, ShoppingBag, ClipboardList, Plus, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, hasPermission } = useAuth();
  const [companyName, setCompanyName] = useState("ERP Lite");
  const [logoUrl, setLogoUrl] = useState("");
  const [activeModules, setActiveModules] = useState<string[] | null>(null);
  const [openMenus, setOpenMenus] = useState<{[key: string]: boolean}>({
    tanim: true,
    stok: true,
    ops: true,
    rapor: true
  });

  const toggleMenu = (key: string) => {
    setOpenMenus(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const baseURL = typeof window !== "undefined" ? `http://${window.location.hostname}:8080/api` : "http://localhost:8080/api";
        const res = await axios.get(`${baseURL}/settings`);
        if (res.data["company_name"]) setCompanyName(res.data["company_name"]);
        if (res.data["company_logo"]) setLogoUrl(res.data["company_logo"]);
        if (res.data["active_modules"]) {
          try { setActiveModules(JSON.parse(res.data["active_modules"])); } catch (e) {}
        }
      } catch (err) {}
    };
    fetchSettings();
  }, [pathname]);

  const MenuHeader = ({ id, label, icon: Icon }: any) => {
    const isOpen = openMenus[id];
    return (
      <button 
        onClick={() => toggleMenu(id)}
        className={`flex items-center justify-between w-full p-2.5 rounded-lg transition-all mb-1 group ${
          isOpen 
            ? "bg-slate-800/50 text-white" 
            : "text-slate-400 hover:bg-slate-800/30 hover:text-white"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`transition-colors ${isOpen ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"}`}>
            <Icon size={18} />
          </div>
          <span className="font-bold text-[13px] tracking-tight">{label}</span>
        </div>
        <div className={`transition-all duration-300 ${isOpen ? "rotate-45 text-blue-400" : "text-slate-600 group-hover:text-slate-400"}`}>
          <Plus size={16} />
        </div>
      </button>
    );
  };

  const SubLink = ({ href, label, icon: Icon, colorClass = "" }: any) => {
    const isActive = pathname === href;
    return (
      <Link 
        href={href} 
        className={`flex items-center gap-3 p-2.5 pl-9 rounded-lg transition-all text-[13px] relative group ${
          isActive 
            ? "bg-blue-600/10 text-blue-400 font-bold" 
            : "text-slate-500 hover:text-slate-200 hover:bg-slate-800/20"
        } ${colorClass}`}
      >
        {isActive && (
          <div className="absolute left-0 w-1 h-5 bg-blue-500 rounded-r-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
        )}
        <Icon size={14} className={`${isActive ? "opacity-100" : "opacity-40 group-hover:opacity-100"} transition-opacity`} />
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <div className="w-64 bg-[#0a0c10] text-white min-h-screen flex flex-col border-r border-slate-800/50">
      <div className="p-6 flex flex-col gap-6 flex-1 overflow-hidden">
        {/* Logo Section */}
        <div className="flex flex-col gap-1 items-start mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
              {logoUrl ? <img src={logoUrl} alt="L" className="w-7 h-7 object-contain" /> : <Boxes className="text-white" size={24} />}
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight leading-none text-white">{companyName}</span>
              <span className="text-[10px] font-bold text-blue-500/80 uppercase tracking-widest mt-1">Sistem Yönetimi</span>
            </div>
          </div>
          
          <div className="mt-6 w-full p-3 bg-slate-900/50 rounded-xl border border-slate-800/50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden">
              <div className="w-full h-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold text-xs uppercase">
                {user?.username?.[0] || "U"}
              </div>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold truncate text-slate-200">{user?.username}</span>
              <span className="text-[9px] uppercase font-black text-slate-500 tracking-tighter">
                {user?.is_admin ? "Üst Yönetici" : "Personel"}
              </span>
            </div>
            <button onClick={logout} className="ml-auto p-1.5 hover:bg-red-500/10 text-slate-600 hover:text-red-500 rounded-lg transition-colors">
              <LogOut size={14} />
            </button>
          </div>
        </div>

        <nav className="flex flex-col gap-1 overflow-y-auto pr-2 custom-scrollbar flex-1">
          <Link href="/" className={`flex items-center gap-3 p-2.5 rounded-lg transition-all mb-4 ${
            pathname === "/" ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "text-slate-400 hover:bg-slate-800/40 hover:text-white"
          }`}>
            <LayoutDashboard size={18} />
            <span className="font-bold text-[13px]">Dashboard</span>
          </Link>

          {/* Stok & Depo */}
          {hasPermission("stok") && activeModules?.includes("stok") && (
            <div className="mb-2">
              <MenuHeader id="stok" label="Depo & Stok" icon={Boxes} />
              {openMenus.stok && (
                <div className="flex flex-col gap-0.5 mt-0.5">
                  <SubLink href="/stok-listesi" label="Mevcut Stoklar" icon={Warehouse} />
                  <SubLink href="/mal-kabul" label="Mal Kabul Masası" icon={Truck} />
                  <SubLink href="/stok-islemleri" label="Stok İşlemleri" icon={ArrowRightLeft} />
                  <SubLink href="/hareket-gecmisi" label="Hareket Geçmişi" icon={History} />
                </div>
              )}
            </div>
          )}

          {/* Operasyonlar */}
          <div className="mb-2">
            <MenuHeader id="ops" label="Operasyonlar" icon={Hammer} />
            {openMenus.ops && (
              <div className="flex flex-col gap-0.5 mt-0.5">
                {hasPermission("satinalma") && activeModules?.includes("satinalma") && (
                  <SubLink href="/satinalma-listesi" label="Satınalma Siparişleri" icon={ShoppingBag} />
                )}
                {hasPermission("teklif") && activeModules?.includes("teklif") && (
                  <SubLink href="/teklifler" label="Teklif Yönetimi" icon={ClipboardList} />
                )}
                {hasPermission("satis") && activeModules?.includes("satis") && (
                  <SubLink href="/satis" label="Satış & Sevkiyat" icon={ShoppingCart} />
                )}
                {hasPermission("uretim") && activeModules?.includes("uretim") && (
                  <SubLink href="/is-emirleri" label="Üretim İş Emirleri" icon={Hammer} />
                )}
              </div>
            )}
          </div>

          {/* Tanımlamalar */}
          {hasPermission("tanimlar") && activeModules?.includes("tanimlar") && (
            <div className="mb-2">
              <MenuHeader id="tanim" label="Tanımlamalar" icon={Settings} />
              {openMenus.tanim && (
                <div className="flex flex-col gap-0.5 mt-0.5">
                  <SubLink href="/urunler" label="Ürün Listesi" icon={Package} />
                  <SubLink href="/receteler" label="Ürün Reçeteleri" icon={BookOpen} />
                  <SubLink href="/musteriler" label="Müşteri Yönetimi" icon={Users} />
                  <SubLink href="/tedarikciler" label="Tedarikçi Yönetimi" icon={Truck} />
                  <SubLink href="/depolar" label="Depo Tanımları" icon={Warehouse} />
                </div>
              )}
            </div>
          )}

          {/* Raporlar */}
          {hasPermission("raporlar") && activeModules?.includes("raporlar") && (
            <div className="mb-2">
              <MenuHeader id="rapor" label="Raporlar" icon={FileBarChart} />
              {openMenus.rapor && (
                <div className="flex flex-col gap-0.5 mt-0.5">
                  <SubLink href="/raporlama" label="Raporlama Merkezi" icon={FileBarChart} />
                </div>
              )}
            </div>
          )}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-800/50 bg-slate-900/20">
        {user?.is_admin && (
          <Link href="/admin" className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-800 transition text-slate-400 hover:text-white text-sm font-medium">
            <Settings size={16} />
            <span>Sistem Ayarları</span>
          </Link>
        )}
        <div className="mt-2 px-3 flex justify-between items-center opacity-40">
          <span className="text-[9px] font-black tracking-[0.2em]">ERP LITE</span>
          <span className="text-[9px] font-bold">v1.2.0</span>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
      `}</style>
    </div>
  );
}
