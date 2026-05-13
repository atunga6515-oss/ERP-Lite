"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Hammer, ClipboardList, AlertTriangle, ArrowLeft, CheckCircle, PackageSearch, PackageCheck, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_URL = typeof window !== "undefined" ? `http://${window.location.hostname}:8080/api` : "http://localhost:8080/api";

export default function IsEmriOlustur() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  
  // Form State
  const [selectedProductId, setSelectedProductId] = useState("");
  const [sourceWarehouseId, setSourceWarehouseId] = useState("");
  const [targetWarehouseId, setTargetWarehouseId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pRes, wRes, rRes] = await Promise.all([
          axios.get(`${API_URL}/products`),
          axios.get(`${API_URL}/warehouses`),
          axios.get(`${API_URL}/recipes`)
        ]);
        
        const allProducts = pRes.data || [];
        const allRecipes = rRes.data || [];
        
        const producibleProducts = allProducts.filter((p: any) => 
          allRecipes.some((r: any) => r.product_id === p.id)
        );
        
        setProducts(producibleProducts);
        setWarehouses(wRes.data || []);

        if (wRes.data && wRes.data.length > 0) {
          const firstWarehouseId = String(wRes.data[0].id);
          console.log("Setting default warehouse:", firstWarehouseId);
          setSourceWarehouseId(firstWarehouseId);
          setTargetWarehouseId(firstWarehouseId);
        }
      } catch (err) {
        console.error("Fetch data error:", err);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !sourceWarehouseId || !targetWarehouseId || !quantity) {
      alert("Lütfen tüm alanları doldurun.");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/work-orders`, {
        product_id: Number(selectedProductId),
        source_warehouse_id: Number(sourceWarehouseId),
        target_warehouse_id: Number(targetWarehouseId),
        quantity: Number(quantity),
        note: note,
        start_date: new Date().toISOString(),
        status: "Planlandı"
      });
      setMessage("İş emri başarıyla oluşturuldu. Listeye yönlendiriliyorsunuz...");
      setTimeout(() => router.push("/is-emirleri"), 1500);
    } catch (err: any) {
      alert(err.response?.data?.error || "Hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {loading && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center animate-in fade-in duration-300">
          <div className="bg-white p-10 rounded-3xl shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full mx-4 border border-slate-100">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-purple-600 rounded-full animate-ping"></div>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-center">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">İşlem Başlatıldı</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                İş emriniz oluşturuluyor ve stoklar analiz ediliyor. <br />Lütfen bu pencereyi kapatmayınız...
              </p>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-purple-600 h-full animate-pulse" style={{width: '60%'}}></div>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center gap-4">
        <Link href="/is-emirleri">
          <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <h1 className="text-3xl font-bold">Yeni İş Emri Oluştur</h1>
      </div>

      {message && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="py-4 flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" /> {message}
          </CardContent>
        </Card>
      )}

      <Card className="border-t-4 border-t-purple-600 shadow-xl !overflow-visible">
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle className="text-lg flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Hammer className="w-5 h-5 text-purple-600" /> Üretim Planlama Formu
            </div>
            <span className="text-[11px] font-normal text-slate-500 bg-slate-200 px-2 py-1 rounded">
              Sadece Ürün Reçetesi (BOM) tanımlı ürünler için iş emri açılabilir.
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-8 px-8 pb-10 !overflow-visible">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Ürün Seçimi */}
            <div className="space-y-2 relative">
              <Label className="font-bold text-lg">1. Üretilecek Mamul Seçimi</Label>
              <div 
                className="flex h-14 w-full items-center justify-between rounded-md border-2 border-slate-200 bg-white px-4 py-2 text-lg font-bold cursor-pointer hover:border-purple-400 transition-all"
                onClick={() => setIsSearchOpen(!isSearchOpen)}
              >
                <span className={selectedProductId ? "text-slate-900" : "text-slate-400"}>
                  {selectedProductId 
                    ? products.find(p => String(p.id) === selectedProductId)?.name || "Seçiniz..."
                    : "Mamul Seçiniz..."
                  }
                </span>
                <Search className="w-5 h-5 text-slate-400" />
              </div>

              {isSearchOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white border-2 border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-3 border-b bg-slate-50">
                    <Input 
                      placeholder="Ürün adı veya barkod ile ara..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      autoFocus
                      className="h-10 border-slate-300 focus:ring-purple-600"
                    />
                  </div>
                  <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                    {products
                      .filter(p => 
                        p.name.toLocaleLowerCase('tr-TR').includes(searchTerm.toLocaleLowerCase('tr-TR')) || 
                        p.barcode.toLocaleLowerCase('tr-TR').includes(searchTerm.toLocaleLowerCase('tr-TR'))
                      )
                      .map(p => (
                        <div 
                          key={p.id}
                          className={`flex items-center justify-between p-3 border-b border-slate-50 transition-all cursor-pointer group hover:bg-purple-50/50 ${
                            String(p.id) === selectedProductId 
                            ? 'bg-purple-50 border-l-4 border-l-purple-600' 
                            : 'bg-white border-l-4 border-l-transparent'
                          }`}
                          onClick={() => {
                            setSelectedProductId(String(p.id));
                            setIsSearchOpen(false);
                            setSearchTerm("");
                          }}
                        >
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold`}>
                                {p.barcode}
                              </span>
                              <span className="font-bold text-sm text-slate-800">{p.name}</span>
                            </div>
                            <span className="text-[11px] text-slate-400 italic">{p.category || "Kategori belirtilmemiş"}</span>
                          </div>
                          <div className="text-right">
                            {String(p.id) === selectedProductId && <CheckCircle className="w-5 h-5 text-purple-600" />}
                          </div>
                        </div>
                      ))
                    }
                    {products.filter(p => 
                        p.name.toLocaleLowerCase('tr-TR').includes(searchTerm.toLocaleLowerCase('tr-TR')) || 
                        p.barcode.toLocaleLowerCase('tr-TR').includes(searchTerm.toLocaleLowerCase('tr-TR'))
                      ).length === 0 && (
                      <div className="p-12 text-center text-slate-400 text-sm">
                        <PackageSearch className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        Ürün bulunamadı.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Depo Seçimleri */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-6 bg-blue-50/50 border-2 border-dashed border-blue-200 rounded-xl space-y-4">
                <div className="flex items-center gap-2 text-blue-700 font-bold">
                  <PackageSearch className="w-5 h-5" /> Hammadde Kaynak Depo
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500 uppercase">Parçaların Düşeceği Yer</Label>
                  <select 
                    className="flex h-12 w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600"
                    value={sourceWarehouseId}
                    onChange={e => setSourceWarehouseId(e.target.value)}
                    required
                  >
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="p-6 bg-green-50/50 border-2 border-dashed border-green-200 rounded-xl space-y-4">
                <div className="flex items-center gap-2 text-green-700 font-bold">
                  <PackageCheck className="w-5 h-5" /> Mamul Giriş Depo
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500 uppercase">Bitmiş Ürünün Gideceği Yer</Label>
                  <select 
                    className="flex h-12 w-full rounded-md border border-green-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-green-600"
                    value={targetWarehouseId}
                    onChange={e => setTargetWarehouseId(e.target.value)}
                    required
                  >
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Miktar ve Not */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="font-bold">Üretim Miktarı</Label>
                <Input 
                  type="number" min="1" step="1"
                  value={quantity} 
                  onChange={e => setQuantity(e.target.value.replace(/[,.]/g, ''))}
                  className="h-12 text-lg font-black border-2"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="font-bold">Planlama Notu</Label>
                <Input 
                  value={note} 
                  onChange={e => setNote(e.target.value)} 
                  placeholder="Örn: Müşteri siparişi üzerine..."
                  className="h-12 border-2"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 h-16 text-xl font-bold shadow-xl"
            >
              {loading ? "Planlanıyor..." : "İŞ EMRİNİ OLUŞTUR VE ÜRETİME HAZIRLA"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
