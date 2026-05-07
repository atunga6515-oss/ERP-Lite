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
import { ShoppingCart, Plus, Users, Trash2, Package, CheckCircle, Search } from "lucide-react";

const API_URL = "http://localhost:8080/api";

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

  // When warehouse changes, clear selected product
  useEffect(() => {
    setSelectedProductId("");
  }, [selectedWarehouseId]);

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
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
      alert(`Yetersiz Stok! Bu depoda toplam ${available} adet var. Sepetinizde zaten ${alreadyInBasket} adet var. En fazla ${available - alreadyInBasket} adet daha ekleyebilirsiniz.`);
      return;
    }

    const newItem = {
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
      
      setMessage({ type: "success", text: "Satış başarıyla gerçekleştirildi. Tüm ürünler stoktan düşüldü." });
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
    if (!confirm("Bu satışı iptal etmek istediğinizden emin misiniz? Ürünler depoya geri yüklenecektir.")) return;
    
    setActionLoading(true);
    try {
      await axios.delete(`${API_URL}/sales/${id}`);
      setMessage({ type: "success", text: "Satış iptal edildi ve stoklar depoya geri yüklendi." });
      fetchData();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || "İptal işlemi başarısız.";
      setMessage({ type: "error", text: errorMsg });
      alert(errorMsg);
    } finally {
      setActionLoading(false);
    }
  };

  const totalBasketAmount = basket.reduce((sum, item) => sum + item.total_price, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {actionLoading && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center animate-in fade-in duration-300">
          <div className="bg-white p-10 rounded-3xl shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full mx-4 border border-slate-100">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></div>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-center">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">İşlem Yapılıyor</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Stok kartları güncelleniyor ve sevkiyat kayıtları işleniyor. <br />Lütfen bekleyiniz...
              </p>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full animate-pulse" style={{width: '80%'}}></div>
            </div>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Satış / Sevkiyat Masası</h1>
        
        <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
          <DialogTrigger className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-md cursor-pointer transition-colors">
              <Plus className="w-4 h-4" /> Yeni Müşteri Ekle
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Müşteri Tanımla</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Müşteri / Firma Adı</Label>
                <Input value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} placeholder="Örn: ABC Tekstil Ltd. Şti." />
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)} placeholder="05xx..." />
              </div>
              <Button onClick={handleAddCustomer} className="w-full">Müşteriyi Kaydet</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"} className={message.type === "success" ? "border-green-500 text-green-700 bg-green-50 shadow-sm" : ""}>
          <CheckCircle className="w-4 h-4" />
          <AlertTitle>{message.type === "error" ? "Hata" : "Başarılı"}</AlertTitle>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-t-4 border-t-blue-600 shadow-md">
            <CardHeader className="bg-gray-50 border-b py-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Ürün Seç ve Sepete Ekle
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-600 uppercase">1. Sevkiyat Deposu</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600"
                    value={selectedWarehouseId}
                    onChange={e => setSelectedWarehouseId(e.target.value)}
                  >
                    <option value="">Depo Seçiniz...</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2 relative">
                  <Label className="text-xs font-bold text-gray-600 uppercase">2. Ürün Seçimi</Label>
                  <div 
                    className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm ${!selectedWarehouseId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400'} transition-all`}
                    onClick={() => selectedWarehouseId && setIsSearchOpen(!isSearchOpen)}
                  >
                    <span className={`font-bold truncate whitespace-nowrap max-w-[200px] ${selectedProductId ? "text-slate-900" : "text-slate-400"}`}>
                      {!selectedWarehouseId 
                        ? "Önce Depo Seçin"
                        : (selectedProductId 
                            ? products.find(p => String(p.id) === selectedProductId)?.name || "Seçiniz..."
                            : "Ürün Seçiniz...")
                      }
                    </span>
                    <Search className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                  </div>

                  {isSearchOpen && selectedWarehouseId && (
                    <div className="absolute z-50 w-[300px] mt-2 bg-white border border-slate-200 rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                      <div className="p-2 border-b bg-slate-50">
                        <Input 
                          placeholder="Ürün adı veya barkod..." 
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          autoFocus
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="max-h-[350px] overflow-y-auto p-2 grid grid-cols-1 md:grid-cols-2 gap-2 bg-slate-50/50">
                        {products
                          .filter(p => {
                            const warehouse = warehouses.find(w => String(w.id) === selectedWarehouseId);
                            const isProductionWarehouse = warehouse?.name?.toLowerCase().includes("üretim");
                            const isProducedProduct = p.barcode?.startsWith("ALP");
                            if (isProductionWarehouse) return isProducedProduct;
                            return !isProducedProduct;
                          })
                          .filter(p => {
                            const s = stocks.find(st => String(st.warehouse_id) === selectedWarehouseId && st.product_id === p.id);
                            return s && s.quantity > 0;
                          })
                          .filter(p => 
                            p.name.toLocaleLowerCase("tr-TR").includes(searchTerm.toLocaleLowerCase("tr-TR")) || 
                            p.barcode.toLocaleLowerCase("tr-TR").includes(searchTerm.toLocaleLowerCase("tr-TR"))
                          )
                          .map(p => {
                            const s = stocks.find(st => String(st.warehouse_id) === selectedWarehouseId && st.product_id === p.id);
                            const isSelected = String(p.id) === selectedProductId;
                            return (
                              <div 
                                key={p.id}
                                className={`flex flex-col p-2.5 border rounded-xl transition-all cursor-pointer group hover:shadow-md ${
                                  isSelected 
                                  ? 'bg-blue-600 border-blue-600 text-white shadow-blue-100' 
                                  : 'bg-white border-slate-200 hover:border-blue-400'
                                }`}
                                onClick={() => {
                                  setSelectedProductId(String(p.id));
                                  setIsSearchOpen(false);
                                  setSearchTerm("");
                                }}
                              >
                                <div className="flex justify-between items-start mb-0.5">
                                  <span className={`text-[8px] font-mono ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                                    {p.barcode}
                                  </span>
                                  <span className={`text-[8px] font-bold ${isSelected ? 'text-white' : 'text-green-600'}`}>
                                    Mevcut: {s?.quantity}
                                  </span>
                                </div>
                                <span className="font-bold text-[10px] leading-tight line-clamp-2">{p.name}</span>
                              </div>
                            );
                          })
                        }
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-600 uppercase">Miktar (Tam Sayı)</Label>
                  <Input 
                    type="number" min="1" step="1"
                    value={itemQuantity} 
                    onChange={e => setItemQuantity(e.target.value)}
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
                    <Button onClick={addToBasket} className="bg-blue-600 hover:bg-blue-700 h-10 px-4">
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
                <ShoppingCart className="w-5 h-5 text-green-600" />
                Satış Listesi (Sepet)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Ürün Bilgisi</TableHead>
                    <TableHead>Depo</TableHead>
                    <TableHead className="text-right">Miktar</TableHead>
                    <TableHead className="text-right">Birim Fiyat</TableHead>
                    <TableHead className="text-right">Toplam</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {basket.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <p className="font-bold">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">{item.product_barcode}</p>
                      </TableCell>
                      <TableCell>{item.warehouse_name}</TableCell>
                      <TableCell className="text-right font-bold">{item.quantity} Adet</TableCell>
                      <TableCell className="text-right">{item.unit_price.toLocaleString('tr-TR')} ₺</TableCell>
                      <TableCell className="text-right font-bold text-green-700">{item.total_price.toLocaleString('tr-TR')} ₺</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeFromBasket(idx)} className="text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {basket.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground italic">
                        Sepetiniz boş. Üst kısımdan ürün ekleyebilirsiniz.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card className="border-t-4 border-t-green-600 shadow-lg sticky top-6">
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="text-lg">Satışı Onayla</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-gray-700">Müşteri / Firma</Label>
                <select 
                  className="flex h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-green-600"
                  value={customerId}
                  onChange={e => setCustomerId(e.target.value)}
                >
                  <option value="">Lütfen Müşteri Seçin...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-gray-700">Genel Açıklama</Label>
                <Input 
                  value={note} onChange={e => setNote(e.target.value)} 
                  placeholder="Sipariş no, sevkiyat detayları vb."
                  className="h-11"
                />
              </div>

              <div className="bg-slate-900 text-white p-6 rounded-xl space-y-4 shadow-xl">
                <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                  <span className="text-slate-400 text-sm">Ürün Kalemi</span>
                  <span className="font-bold">{basket.length} Adet</span>
                </div>
                <div className="flex justify-between items-end pt-2">
                  <span className="text-slate-400 text-sm mb-1">Genel Toplam</span>
                  <span className="text-3xl font-black text-green-400">
                    {totalBasketAmount.toLocaleString('tr-TR')} ₺
                  </span>
                </div>
                
                <Button 
                  onClick={handleSale} 
                  disabled={loading || !customerId || basket.length === 0}
                  className="w-full bg-green-500 hover:bg-green-600 text-slate-900 h-14 text-xl font-black mt-4 transition-all active:scale-95"
                >
                  {loading ? "Tamamlanıyor..." : "SATIŞI TAMAMLA"}
                </Button>
              </div>

              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <div className="bg-blue-100 p-2 rounded-full">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-[11px] text-blue-700 font-bold uppercase">Müşteri Rehberi</p>
                  <p className="text-xs text-blue-900">{customers.length} kayıtlı müşteri bulunuyor.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Satış Geçmişi Listesi */}
      <Card className="shadow-xl border-t-4 border-t-slate-800">
        <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between py-4">
          <div>
            <CardTitle className="text-xl font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
              Satış ve Sevkiyat Geçmişi
            </CardTitle>
            <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-widest">Son Gerçekleşen İşlemler</p>
          </div>
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">
            Toplam {sales.length} Kayıt
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="w-[120px] font-bold">Satış No</TableHead>
                <TableHead className="font-bold">Müşteri</TableHead>
                <TableHead className="font-bold">Tarih</TableHead>
                <TableHead className="font-bold">Ürünler</TableHead>
                <TableHead className="text-right font-bold">Toplam Tutar</TableHead>
                <TableHead className="text-right font-bold w-[100px]">Aksiyon</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((sale) => (
                <TableRow key={sale.id} className="hover:bg-slate-50 transition-colors group">
                  <TableCell className="font-mono font-bold text-slate-500">SAL-{sale.id.toString().padStart(5, '0')}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800">{sale.customer?.name}</span>
                      <span className="text-[10px] text-slate-400 font-medium italic">{sale.note || "Açıklama yok"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-slate-600">
                    {new Date(sale.created_at).toLocaleString('tr-TR')}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {sale.items?.slice(0, 2).map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 text-[11px] font-medium text-slate-600">
                          <Package className="w-3 h-3 text-blue-400" />
                          <span>{item.product?.name} ({item.quantity} {item.product?.unit})</span>
                        </div>
                      ))}
                      {sale.items?.length > 2 && (
                        <span className="text-[10px] text-blue-500 font-black italic">...ve {sale.items.length - 2} ürün daha</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-black text-slate-900">
                    {sale.total_price.toLocaleString('tr-TR')} ₺
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDeleteSale(sale.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all font-bold text-[10px]"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> İPTAL ET
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {sales.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20 text-slate-400 italic">
                    Henüz bir satış kaydı bulunmuyor.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
