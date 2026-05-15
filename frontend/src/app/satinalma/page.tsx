"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Package, CheckCircle, ShoppingBag, Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Product, Warehouse } from "@/types";

const API_URL = typeof window !== "undefined" ? `http://${window.location.hostname}:8080/api` : "http://localhost:8080/api";

interface BasketItem {
  product_id: number;
  product_name?: string;
  product_barcode?: string;
  warehouse_id: number;
  warehouse_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export default function Satinalma() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  
  // Purchase Form State
  const [note, setNote] = useState("");
  
  // Basket State
  const [basket, setBasket] = useState<BasketItem[]>([]);
  
  // Current Item Selection State
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [itemQuantity, setItemQuantity] = useState("1");
  const [itemUnitPrice, setItemUnitPrice] = useState("1");
  
  // Supplier Form State
  const [newSupplierName, setNewSupplierName] = useState("");
  
  const [message, setMessage] = useState<{type: "error" | "success", text: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const fetchData = async () => {
    try {
      const [pRes, wRes] = await Promise.all([
        axios.get(`${API_URL}/products`),
        axios.get(`${API_URL}/warehouses`)
      ]);
      setProducts(pRes.data || []);
      setWarehouses(wRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle URL parameters for auto-populating basket
  useEffect(() => {
    const itemsParam = searchParams.get("items");
    if (itemsParam && products.length > 0 && warehouses.length > 0) {
      try {
        const parsedItems = JSON.parse(itemsParam);
        const newBasketItems = parsedItems.map((item: {id: number, warehouse_id: number, quantity: number}) => {
          const product = products.find((p: Product) => p.id === item.id);
          const warehouse = warehouses.find((w: Warehouse) => w.id === item.warehouse_id);
          
          return {
            product_id: item.id,
            product_name: product?.name || "Bilinmeyen Ürün",
            product_barcode: product?.barcode || "-",
            warehouse_id: item.warehouse_id,
            warehouse_name: warehouse?.name || "Bilinmeyen Depo",
            quantity: Math.ceil(item.quantity),
            unit_price: 1, // Default price
            total_price: Math.ceil(item.quantity) * 1
          };
        });
        
        setBasket(prev => [...prev, ...newBasketItems]);
        setNote("İş emri eksik hammadde tamamlaması");
        
        // Clear the URL params to prevent re-adding on refresh if needed
        // but typically searchParams are read-only here.
      } catch (err) {
        console.error("Parametre ayrıştırma hatası:", err);
      }
    }
  }, [searchParams, products, warehouses]);

  const addToBasket = () => {
    if (!selectedProductId || !selectedWarehouseId || !itemQuantity || !itemUnitPrice) {
      alert("Lütfen ürün, depo, miktar ve fiyat bilgilerini eksiksiz girin.");
      return;
    }

    const product = products.find((p: Product) => String(p.id) === selectedProductId);
    const warehouse = warehouses.find((w: Warehouse) => String(w.id) === selectedWarehouseId);
    
    const newItem: BasketItem = {
      product_id: Number(selectedProductId),
      product_name: product?.name,
      product_barcode: product?.barcode,
      warehouse_id: Number(selectedWarehouseId),
      warehouse_name: warehouse?.name,
      quantity: Math.floor(Number(itemQuantity)), 
      unit_price: Number(itemUnitPrice),
      total_price: Math.floor(Number(itemQuantity)) * Number(itemUnitPrice)
    };

    setBasket([...basket, newItem]);
    
    // Clear selection
    setSelectedProductId("");
    setItemQuantity("1");
    setItemUnitPrice("1");
  };

  const removeFromBasket = (index: number) => {
    setBasket(basket.filter((_, i) => i !== index));
  };

  const handleAddSupplier = async () => {
    if (!newSupplierName) return;
    try {
      await axios.post(`${API_URL}/suppliers`, { name: newSupplierName });
      setNewSupplierName("");
      setIsSupplierDialogOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePurchase = async () => {
    setMessage(null);
    if (basket.length === 0) {
      setMessage({ type: "error", text: "Lütfen sepete en az bir ürün ekleyin." });
      return;
    }

    const payload = {
      items: basket.map((item: BasketItem) => ({
        product_id: item.product_id,
        warehouse_id: item.warehouse_id,
        quantity: item.quantity,
        unit_price: item.unit_price
      })),
      note: note,
      user_id: 1,
      purchase_date: new Date().toISOString()
    };

    console.log("Sending Purchase Request:", payload);

    setLoading(true);
    try {
      await axios.post(`${API_URL}/purchases`, payload);
      alert("Satınalma siparişleri başarıyla oluşturuldu.");
      router.push("/satinalma-listesi");
    } catch (error: any) {
      setMessage({ type: "error", text: error.response?.data?.error || "Satınalma sırasında bir hata oluştu." });
    } finally {
      setLoading(false);
    }
  };

  const totalBasketAmount = basket.reduce((sum: number, item: BasketItem) => sum + item.total_price, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {loading && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center animate-in fade-in duration-300">
          <div className="bg-white p-10 rounded-3xl shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full mx-4 border border-slate-100">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-orange-100 border-t-orange-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-orange-600 rounded-full animate-ping"></div>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-center">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Sipariş Kaydediliyor</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Satınalma siparişiniz oluşturuluyor ve bildirimler gönderiliyor. <br />Lütfen bekleyiniz...
              </p>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-orange-600 h-full animate-pulse" style={{width: '75%'}}></div>
            </div>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Satınalma Siparişi Oluştur</h1>
        
        <Dialog open={isSupplierDialogOpen} onOpenChange={setIsSupplierDialogOpen}>
          <DialogTrigger className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2 rounded-md cursor-pointer transition-colors">
              <Plus className="w-4 h-4" /> Yeni Tedarikçi Ekle
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tedarikçi Tanımla</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tedarikçi / Firma Adı</Label>
                <Input value={newSupplierName} onChange={e => setNewSupplierName(e.target.value)} placeholder="Örn: Rulman Sanayi A.Ş." />
              </div>
              <Button onClick={handleAddSupplier} className="w-full bg-orange-600 hover:bg-orange-700">Tedarikçiyi Kaydet</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"} className={message.type === "success" ? "border-green-500 text-green-700 bg-green-50" : ""}>
          <CheckCircle className="w-4 h-4" />
          <AlertTitle>{message.type === "error" ? "Hata" : "Başarılı"}</AlertTitle>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-12 space-y-6">
          <Card className="border-t-4 border-t-orange-600 shadow-md !overflow-visible">
            <CardHeader className="bg-gray-50 border-b py-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-orange-600" />
                Siparişe Ürün Ekle
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 !overflow-visible">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-2 relative">
                  <Label className="text-xs font-bold text-gray-600 uppercase">Ürün</Label>
                  <div 
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm cursor-pointer hover:border-orange-400 transition-all shadow-sm"
                    onClick={() => setIsSearchOpen(!isSearchOpen)}
                  >
                    <span className={selectedProductId ? "text-slate-900 font-bold" : "text-slate-400 truncate"}>
                      {selectedProductId 
                        ? products.find((p: Product) => String(p.id) === selectedProductId)?.name || "Seçiniz..."
                        : "Ürün Seçiniz..."
                      }
                    </span>
                    <Search className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                  </div>

                  {isSearchOpen && (
                    <div className="absolute z-50 w-full min-w-[350px] mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-3 border-b bg-slate-50 flex items-center gap-2">
                        <Search className="w-4 h-4 text-slate-400" />
                        <Input 
                          placeholder="Ürün adı veya barkod ile ara..." 
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          autoFocus
                          className="h-9 text-sm border-none bg-transparent focus-visible:ring-0 p-0 shadow-none"
                        />
                      </div>
                      <div className="max-h-[400px] overflow-y-auto custom-scrollbar bg-white">
                        {products
                          .filter((p: Product) => 
                            p.name.toLocaleLowerCase("tr-TR").includes(searchTerm.toLocaleLowerCase("tr-TR")) || 
                            p.barcode.toLocaleLowerCase("tr-TR").includes(searchTerm.toLocaleLowerCase("tr-TR"))
                          )
                          .map((p: Product) => (
                            <div 
                              key={p.id}
                              className={`flex items-center justify-between p-3 border-b border-slate-50 transition-all cursor-pointer group hover:bg-orange-50/50 ${
                                String(p.id) === selectedProductId 
                                ? 'bg-orange-50 border-l-4 border-l-orange-600' 
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
                                <span className="text-[11px] text-slate-400 italic">{p.category || "Genel"}</span>
                              </div>
                              <div className="text-right">
                                {String(p.id) === selectedProductId && <CheckCircle className="w-5 h-5 text-orange-600" />}
                              </div>
                            </div>
                          ))
                        }
                        {products.filter(p => 
                          p.name.toLocaleLowerCase("tr-TR").includes(searchTerm.toLocaleLowerCase("tr-TR")) || 
                          p.barcode.toLocaleLowerCase("tr-TR").includes(searchTerm.toLocaleLowerCase("tr-TR"))
                        ).length === 0 && (
                          <div className="p-10 text-center text-slate-400 text-sm italic">
                            Aranan kriterlere uygun ürün bulunamadı.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-600 uppercase">Depo</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-600"
                    value={selectedWarehouseId}
                    onChange={e => setSelectedWarehouseId(e.target.value)}
                  >
                    <option value="">Depo...</option>
                    {warehouses.map((w: Warehouse) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-600 uppercase">Miktar</Label>
                  <Input 
                    type="number" min="1" step="1"
                    value={itemQuantity} 
                    onChange={e => setItemQuantity(e.target.value.replace(/[,.]/g, ''))}
                    onKeyDown={(e) => { if (e.key === ',' || e.key === '.') e.preventDefault(); }}
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-600 uppercase">Birim Fiyat (₺)</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="number" min="0" step="0.01"
                      value={itemUnitPrice} 
                      onChange={e => setItemUnitPrice(e.target.value)}
                      placeholder="0.00"
                      className="h-10"
                    />
                    <Button onClick={addToBasket} className="bg-orange-600 hover:bg-orange-700 h-10 px-4">
                      Ekle
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md overflow-hidden">
            <CardHeader className="bg-gray-50 border-b py-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-orange-600" />
                Sipariş Listesi
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Ürün</TableHead>
                    <TableHead>Depo</TableHead>
                    <TableHead className="text-right">Miktar</TableHead>
                    <TableHead className="text-right">Birim Fiyat</TableHead>
                    <TableHead className="text-right">Toplam</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {basket.map((item: BasketItem, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <p className="font-bold">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">{item.product_barcode}</p>
                      </TableCell>
                      <TableCell>{item.warehouse_name}</TableCell>
                      <TableCell className="text-right font-bold">{item.quantity} Adet</TableCell>
                      <TableCell className="text-right">{item.unit_price.toLocaleString('tr-TR')} ₺</TableCell>
                      <TableCell className="text-right font-bold text-orange-700">{item.total_price.toLocaleString('tr-TR')} ₺</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeFromBasket(idx)} className="text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-t-4 border-t-orange-600">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                <div className="flex-1 w-full space-y-2">
                  <Label className="font-bold">Genel Not / Açıklama</Label>
                  <Input 
                    value={note} onChange={e => setNote(e.target.value)} 
                    placeholder="Tüm siparişler için ortak not..." 
                    className="h-12"
                  />
                </div>
                <div className="flex flex-col items-end gap-2 min-w-[200px]">
                  <span className="text-sm text-slate-500 uppercase font-bold tracking-widest">Genel Toplam</span>
                  <span className="text-4xl font-black text-orange-600">{totalBasketAmount.toLocaleString('tr-TR')} ₺</span>
                  <Button 
                    onClick={handlePurchase} 
                    disabled={loading || basket.length === 0}
                    className="w-full bg-orange-600 hover:bg-orange-700 h-14 text-xl font-bold mt-2"
                  >
                    {loading ? "Kaydediliyor..." : "TÜM SİPARİŞLERİ OLUŞTUR"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
