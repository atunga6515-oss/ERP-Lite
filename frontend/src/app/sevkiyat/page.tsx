"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Truck, Package, CheckCircle, RefreshCw, AlertTriangle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const API_URL = typeof window !== "undefined" ? `http://${window.location.hostname}:8080/api` : "http://localhost:8080/api";

export default function SevkiyatMasasi() {
  const [pendingSales, setPendingSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchPendingSales = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/sales`);
      // Only show "Hazırlanıyor" status (handle missing status for old/migrated records)
      const pending = (res.data || []).filter((s: any) => !s.status || s.status === "Hazırlanıyor");
      setPendingSales(pending);
    } catch (err) {
      console.error("Satışlar yüklenirken hata:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingSales();
    
    // Auto refresh every 30 seconds
    const interval = setInterval(fetchPendingSales, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleShipSale = async (id: number) => {
    if (!confirm("Bu sevkiyatın tamamlandığını onaylıyor musunuz? Stoklar depodan düşülecektir.")) return;
    
    setActionLoading(true);
    try {
      await axios.post(`${API_URL}/sales/${id}/ship`);
      alert("Sevkiyat başarıyla tamamlandı!");
      fetchPendingSales();
    } catch (err: any) {
      alert("Hata: " + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const filteredSales = pendingSales.filter(s => 
    String(s.id).includes(searchTerm) || 
    s.customer?.name?.toLocaleLowerCase("tr-TR").includes(searchTerm.toLocaleLowerCase("tr-TR"))
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* Loading Overlay */}
      {actionLoading && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
            <RefreshCw className="w-12 h-12 text-blue-600 animate-spin" />
            <p className="font-bold text-slate-800">Stoklar Güncelleniyor...</p>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase">Sevkiyat Masası</h1>
          <p className="text-slate-500 font-medium">Hazırlanan ve kamyona yüklenecek olan siparişler</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Sipariş No veya Müşteri Ara..." 
              className="pl-10 w-[300px] h-12 rounded-xl shadow-sm border-slate-200"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <Button 
            onClick={fetchPendingSales} 
            variant="outline" 
            className="h-12 w-12 rounded-xl border-slate-200 hover:bg-slate-50"
            title="Listeyi Yenile"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin text-blue-600" : "text-slate-600"}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredSales.length === 0 ? (
          <Card className="border-2 border-dashed py-20 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
            <Truck className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-xl font-bold uppercase tracking-widest">Bekleyen Sevkiyat Yok</p>
            <p className="text-sm italic">Tüm siparişler gönderildi veya henüz yeni sipariş girilmedi.</p>
          </Card>
        ) : (
          filteredSales.map((sale) => (
            <Card key={sale.id} className="overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all border-l-8 border-l-amber-500">
              <div className="grid grid-cols-1 lg:grid-cols-12">
                {/* Sol Taraf: Müşteri ve Bilgi */}
                <div className="lg:col-span-4 p-6 bg-slate-50 border-r">
                  <div className="flex justify-between items-start mb-4">
                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 font-black px-3 py-1">
                      SEVKİYAT BEKLİYOR
                    </Badge>
                    <span className="text-xs font-mono font-bold text-slate-400">#SAL-{sale.id.toString().padStart(5, '0')}</span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 leading-tight mb-1">{sale.customer?.name}</h3>
                  <p className="text-sm text-slate-500 mb-4 font-medium italic">"{sale.note || "Not belirtilmemiş"}"</p>
                  
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-bold bg-white p-3 rounded-xl border border-slate-200">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    OFİS KAYIT: {new Date(sale.created_at).toLocaleString('tr-TR')}
                  </div>
                </div>

                {/* Orta Taraf: Ürünler */}
                <div className="lg:col-span-5 p-6">
                  <h4 className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em] mb-3">Yüklenecek Ürünler</h4>
                  <div className="space-y-3">
                    {sale.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                            <Package size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm leading-none mb-1">{item.product?.name}</p>
                            <p className="text-[10px] font-mono text-slate-400">{item.product?.barcode}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-blue-700">{item.quantity} {item.product?.unit}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{item.warehouse?.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sağ Taraf: Aksiyon */}
                <div className="lg:col-span-3 p-6 flex flex-col justify-center bg-slate-50/50 border-l">
                  <div className="mb-4 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Toplam Tutar</p>
                    <p className="text-2xl font-black text-slate-900">{sale.total_price.toLocaleString('tr-TR')} ₺</p>
                  </div>
                  <Button 
                    onClick={() => handleShipSale(sale.id)}
                    className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white font-black text-lg shadow-lg shadow-blue-200 rounded-xl flex items-center justify-center gap-3 active:scale-95 transition-transform"
                  >
                    <Truck className="w-6 h-6" />
                    SEVKİYATI TAMAMLA
                  </Button>
                  <p className="text-[10px] text-center mt-3 text-slate-400 font-medium">
                    * Butona bastığınızda ürünler stoktan düşer.
                  </p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
