"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ShoppingCart, Plus, Users, Trash2, Package, CheckCircle, Search, Truck, Clock, AlertTriangle } from "lucide-react";

const API_URL = typeof window !== "undefined" ? `http://${window.location.hostname}:8080/api` : "http://localhost:8080/api";

export default function Satis() {
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  
  // Sale Form State
  const [customerId, setCustomerId] = useState("");
  const [note, setNote] = useState("");
  
  // Basket State
  const [basket, setBasket] = useState<any[]>([]);
  
  // Current Item Selection State
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [itemQuantity, setItemQuantity] = useState("1");
  const [itemUnitPrice, setItemUnitPrice] = useState("1");
  
  // Customer Form State
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  
  const [message, setMessage] = useState<{type: "error" | "success", text: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const fetchData = async () => {
    try {
      const [pRes, wRes, cRes, sRes, salesRes] = await Promise.all([
        axios.get(`${API_URL}/products`),
        axios.get(`${API_URL}/warehouses`),
        axios.get(`${API_URL}/customers`),
        axios.get(`${API_URL}/stocks`),
        axios.get(`${API_URL}/sales`)
      ]);
      setProducts(pRes.data || []);
      setWarehouses(wRes.data || []);
      setCustomers(cRes.data || []);
      setStocks(sRes.data || []);
      setSales(salesRes.data || []);
    } catch (err) {
      console.error("Veri çekme hatası:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // When warehouse changes, clear selected product
  useEffect(() => {
    setSelectedProductId("");
  }, [selectedWarehouseId]);

  const addToBasket = () => {
    if (!selectedProductId || !selectedWarehouseId || !itemQuantity || !itemUnitPrice) {
      alert("Lütfen ürün, depo, miktar ve fiyat bilgilerini eksiksiz girin.");
      return;
    }

    const product = products.find(p => String(p.id) === selectedProductId);
    const warehouse = warehouses.find(w => String(w.id) === selectedWarehouseId);
    
    // Check available stock
    const available = stocks.find(s => String(s.warehouse_id) === selectedWarehouseId && String(s.product_id) === selectedProductId)?.quantity || 0;
    const alreadyInBasket = basket
      .filter(item => String(item.product_id) === selectedProductId && String(item.warehouse_id) === selectedWarehouseId)
      .reduce((sum, item) => sum + item.quantity, 0);

    const requested = Math.floor(Number(itemQuantity));

    if (requested + alreadyInBasket > available) {
      alert(`Yetersiz Stok! Bu depoda toplam ${available} adet var. Sepetinizde zaten ${alreadyInBasket} adet var.`);
      return;
    }

    const newItem = {
      product_id: Number(selectedProductId),
      product_name: product?.name,
      product_barcode: product?.barcode,
      warehouse_id: Number(selectedWarehouseId),
      warehouse_name: warehouse?.name,
      quantity: requested, 
      unit_price: Number(itemUnitPrice),
      total_price: requested * Number(itemUnitPrice)
    };

    setBasket([...basket, newItem]);
    setSelectedProductId("");
    setItemQuantity("1");
    setItemUnitPrice("1");
  };

  const removeFromBasket = (index: number) => {
    setBasket(basket.filter((_, i) => i !== index));
  };

  const handleAddCustomer = async () => {
    if (!newCustomerName) return;
    try {
      await axios.post(`${API_URL}/customers`, { name: newCustomerName, phone: newCustomerPhone });
      setNewCustomerName("");
      setNewCustomerPhone("");
      setIsCustomerDialogOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSale = async () => {
    setMessage(null);
    if (!customerId || basket.length === 0) {
      setMessage({ type: "error", text: "Lütfen müşteri seçin ve sepete en az bir ürün ekleyin." });
      return;
    }

    setLoading(true);
    setActionLoading(true);
    try {
      await axios.post(`${API_URL}/sales`, {
        customer_id: Number(customerId),
        items: basket.map(item => ({
          product_id: item.product_id,
          warehouse_id: item.warehouse_id,
          quantity: item.quantity,
          unit_price: item.unit_price
        })),
        note: note,
        user_id: 1,
        sale_date: new Date().toISOString()
      });
      
      setMessage({ type: "success", text: "Sipariş başarıyla oluşturuldu ve Sevkiyat Masası'na gönderildi!" });
      setBasket([]);
      setCustomerId("");
      setNote("");
      fetchData();
    } catch (error: any) {
      setMessage({ type: "error", text: error.response?.data?.error || "Satış sırasında bir hata oluştu." });
    } finally {
      setLoading(false);
      setActionLoading(false);
    }
  };

  const handleDeleteSale = async (id: number) => {
    if (!confirm("Bu satışı iptal etmek istediğinizden emin misiniz? Stoklar geri yüklenecektir.")) return;
    
    setActionLoading(true);
    try {
      await axios.delete(`${API_URL}/sales/${id}`);
      setMessage({ type: "success", text: "Satış iptal edildi." });
      fetchData();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || "İptal işlemi başarısız.";
      setMessage({ type: "error", text: errorMsg });
    } finally {
      setActionLoading(false);
    }
  };

  const totalBasketAmount = basket.reduce((sum, item) => sum + item.total_price, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {actionLoading && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center">
          <div className="bg-white p-10 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-bold text-slate-800 uppercase tracking-tight">İşlem Yapılıyor...</p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Satış & Sevkiyat Yönetimi</h1>
        <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
          <DialogTrigger className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg transition-all active:scale-95">
            <Plus className="w-4 h-4" /> Yeni Müşteri
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Yeni Müşteri Tanımla</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Müşteri / Firma Adı</Label>
                <Input value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} placeholder="Örn: ABC Ltd." />
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)} placeholder="05xx..." />
              </div>
              <Button onClick={handleAddCustomer} className="w-full bg-blue-600">Kaydet</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"} className={message.type === "success" ? "border-green-500 bg-green-50 text-green-700" : ""}>
          <CheckCircle className="w-4 h-4" />
          <AlertTitle>{message.type === "error" ? "Hata" : "Başarılı"}</AlertTitle>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sol Panel: Basket and Product Selection */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-t-4 border-t-blue-600 shadow-md !overflow-visible">
            <CardHeader className="bg-slate-50 py-4 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" /> Ürün Seç ve Sepete Ekle
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 !overflow-visible">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">1. Depo</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 transition-all"
                    value={selectedWarehouseId}
                    onChange={e => setSelectedWarehouseId(e.target.value)}
                  >
                    <option value="">Seçiniz...</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2 relative">
                  <Label className="text-xs font-bold text-slate-500 uppercase">2. Ürün</Label>
                  <div 
                    className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm ${!selectedWarehouseId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-500'} transition-all`}
                    onClick={() => selectedWarehouseId && setIsSearchOpen(!isSearchOpen)}
                  >
                    <span className={`font-bold truncate ${selectedProductId ? "text-slate-900" : "text-slate-400"}`}>
                      {selectedProductId 
                        ? products.find(p => String(p.id) === selectedProductId)?.name || "Seçiniz..."
                        : "Ürün Ara..."
                      }
                    </span>
                    <Search className="w-4 h-4 text-slate-400" />
                  </div>

                  {isSearchOpen && selectedWarehouseId && (
                    <div className="absolute z-50 w-full min-w-[300px] mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-3 border-b bg-slate-50 flex items-center gap-2">
                        <Search className="w-4 h-4 text-slate-400" />
                        <Input 
                          placeholder="Ürün adı veya barkod..." 
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          autoFocus
                          className="h-8 text-xs border-none bg-transparent focus-visible:ring-0 p-0 shadow-none"
                        />
                      </div>
                      <div className="max-h-[300px] overflow-y-auto custom-scrollbar bg-white">
                        {products
                          .filter(p => 
                            p.name.toLocaleLowerCase("tr-TR").includes(searchTerm.toLocaleLowerCase("tr-TR")) || 
                            p.barcode.toLocaleLowerCase("tr-TR").includes(searchTerm.toLocaleLowerCase("tr-TR"))
                          )
                          .map(p => {
                            const s = stocks.find(st => String(st.warehouse_id) === selectedWarehouseId && st.product_id === p.id);
                            const currentQty = s ? s.quantity : 0;
                            return (
                              <div 
                                key={p.id}
                                className="flex items-center justify-between p-3 border-b border-slate-50 hover:bg-blue-50 cursor-pointer"
                                onClick={() => {
                                  setSelectedProductId(String(p.id));
                                  setIsSearchOpen(false);
                                  setSearchTerm("");
                                  if (p.sale_price) setItemUnitPrice(String(p.sale_price));
                                }}
                              >
                                <div className="flex flex-col">
                                  <span className="font-bold text-sm text-slate-800">{p.name}</span>
                                  <span className="text-[10px] text-slate-400 font-mono">{p.barcode}</span>
                                </div>
                                <div className="text-right">
                                  <span className={`text-xs font-black ${currentQty > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                    Stok: {currentQty}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        }
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">Miktar</Label>
                  <Input type="number" min="1" value={itemQuantity} onChange={e => setItemQuantity(e.target.value)} className="h-10 font-bold" />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">Birim Fiyat</Label>
                  <div className="flex gap-2">
                    <Input type="number" value={itemUnitPrice} onChange={e => setItemUnitPrice(e.target.value)} className="h-10 font-bold" />
                    <Button onClick={addToBasket} className="bg-blue-600 h-10 px-4">Ekle</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md overflow-hidden">
            <CardHeader className="bg-slate-50 py-4 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-green-600" /> Sepet Listesi
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead>Ürün Bilgisi</TableHead>
                    <TableHead>Depo</TableHead>
                    <TableHead className="text-right">Miktar</TableHead>
                    <TableHead className="text-right">Toplam</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {basket.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <p className="font-bold text-sm leading-tight">{item.product_name}</p>
                        <p className="text-[10px] text-slate-400">{item.product_barcode}</p>
                      </TableCell>
                      <TableCell className="text-xs font-medium">{item.warehouse_name}</TableCell>
                      <TableCell className="text-right font-bold text-sm">{item.quantity} Adet</TableCell>
                      <TableCell className="text-right font-black text-blue-700">{item.total_price.toLocaleString('tr-TR')} ₺</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeFromBasket(idx)} className="text-red-500 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {basket.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-slate-400 italic text-sm">Sepetiniz boş.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Sağ Panel: Summary and Confirm */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-t-4 border-t-green-600 shadow-xl sticky top-6">
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="text-lg">Satışı Onayla</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-bold">Müşteri / Firma</Label>
                <select 
                  className="flex h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-green-600 transition-all"
                  value={customerId}
                  onChange={e => setCustomerId(e.target.value)}
                >
                  <option value="">Müşteri Seçiniz...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold">Genel Not</Label>
                <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Açıklama..." className="h-11" />
              </div>

              <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-inner space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-slate-400 text-sm font-bold">GENEL TOPLAM</span>
                  <span className="text-3xl font-black text-green-400">{totalBasketAmount.toLocaleString('tr-TR')} ₺</span>
                </div>
                <Button 
                  onClick={handleSale} 
                  disabled={loading || !customerId || basket.length === 0}
                  className={`w-full h-14 font-black text-sm uppercase tracking-tighter rounded-xl transition-all ${
                    basket.length > 0 && !customerId 
                    ? "bg-amber-500 hover:bg-amber-600 text-slate-900 border-2 border-amber-400" 
                    : "bg-green-500 hover:bg-green-600 text-slate-900"
                  }`}
                >
                  {loading ? "GÖNDERİLİYOR..." : 
                   (basket.length > 0 && !customerId) ? "MÜŞTERİ SEÇİMİ BEKLENİYOR" : 
                   "SİPARİŞİ OLUŞTUR & SEVKİYATA GÖNDER"}
                </Button>
                {basket.length > 0 && !customerId && (
                  <div className="flex items-center justify-center gap-2 mt-2 py-1 px-3 bg-amber-400/10 border border-amber-400/20 rounded-lg animate-pulse">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span className="text-[10px] text-amber-400 font-black tracking-widest uppercase">Lütfen önce yukarıdan müşteri seçiniz!</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Geçmiş Tablosu */}
      <Card className="shadow-xl border-t-4 border-t-slate-800">
        <CardHeader className="bg-slate-50 border-b py-4 flex flex-row justify-between items-center">
          <CardTitle className="text-xl font-black text-slate-800 flex items-center gap-2 uppercase">
            <Clock className="w-6 h-6 text-blue-600" /> Satış Geçmişi
          </CardTitle>
          <Badge className="bg-blue-100 text-blue-700 font-bold border-blue-200">Toplam {sales.length} Kayıt</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="font-bold">No</TableHead>
                <TableHead className="font-bold">Müşteri</TableHead>
                <TableHead className="font-bold">Ürünler</TableHead>
                <TableHead className="font-bold">Durum</TableHead>
                <TableHead className="text-right font-bold">Toplam Tutar</TableHead>
                <TableHead className="text-right w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((sale) => (
                <TableRow key={sale.id} className="hover:bg-slate-50 transition-colors group">
                  <TableCell className="font-mono font-bold text-slate-400 text-xs">#SAL-{sale.id}</TableCell>
                  <TableCell>
                    <p className="font-bold text-slate-800 leading-tight">{sale.customer?.name}</p>
                    <p className="text-[10px] text-slate-400 italic truncate max-w-[200px]">{sale.note}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 max-h-[120px] overflow-y-auto scrollbar-thin">
                      {sale.items?.map((item: any, i: number) => (
                        <div key={i} className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                          <Package className="w-3 h-3 text-blue-400" />
                          <span>{item.product?.name} ({item.quantity})</span>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      sale.status === "Sevk Edildi" 
                      ? "bg-green-100 text-green-700 hover:bg-green-100 border-green-200" 
                      : "bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200"
                    }>
                      {sale.status === "Sevk Edildi" ? "SEVK EDİLDİ" : "HAZIRLANIYOR"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-black text-slate-900">{sale.total_price.toLocaleString('tr-TR')} ₺</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteSale(sale.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {sales.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20 text-slate-400 italic">Kayıt bulunamadı.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
