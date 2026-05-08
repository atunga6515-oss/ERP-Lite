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
import { Hammer, Sparkles, Activity } from "lucide-react";

const API_URL = typeof window !== "undefined" ? `http://${window.location.hostname}:8080/api` : "http://localhost:8080/api";

export default function Uretim() {
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  
  // Production
  const [producedProductId, setProducedProductId] = useState("");
  const [producedQuantity, setProducedQuantity] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [activeRecipe, setActiveRecipe] = useState<any>(null);
  
  // Consumption
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [search, setSearch] = useState("");
  const [selectedItems, setSelectedItems] = useState<{ [key: number]: number }>({});
  
  const [globalNote, setGlobalNote] = useState("");
  const [message, setMessage] = useState<{type: "error" | "success", text: string} | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [pRes, wRes, sRes] = await Promise.all([
        axios.get(`${API_URL}/products`),
        axios.get(`${API_URL}/warehouses`),
        axios.get(`${API_URL}/stocks`)
      ]);
      setProducts(pRes.data || []);
      setWarehouses(wRes.data || []);
      setStocks(sRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (producedProductId) {
      axios.get(`${API_URL}/recipes/product/${producedProductId}`)
        .then(res => setActiveRecipe(res.data))
        .catch(() => setActiveRecipe(null));
    } else {
      setActiveRecipe(null);
    }
  }, [producedProductId]);

  const applyRecipe = () => {
    if (!activeRecipe) return;
    if (!producedQuantity || Number(producedQuantity) <= 0) {
      alert("Lütfen önce üretilecek miktarı girin.");
      return;
    }
    
    const qty = Number(producedQuantity);
    const newSelectedItems: { [key: number]: number } = {};
    activeRecipe.items?.forEach((item: any) => {
      newSelectedItems[item.product_id] = item.quantity * qty;
    });
    
    // 1. First, determine the warehouse
    let targetFromWarehouse = fromWarehouseId;
    if (!targetFromWarehouse && warehouses.length > 0) {
      const uretimDepo = warehouses.find(w => w.name?.toLocaleLowerCase('tr-TR').includes("üretim"));
      if (uretimDepo) {
        targetFromWarehouse = String(uretimDepo.id);
        setFromWarehouseId(targetFromWarehouse);
      } else {
        alert("Lütfen önce hammadde deposunu seçin.");
        return;
      }
    } else if (!targetFromWarehouse) {
      alert("Lütfen önce hammadde deposunu seçin.");
      return;
    }

    // 2. Set items
    setSelectedItems(newSelectedItems);
  };

  const handleCheckboxChange = (productId: number, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => ({ ...prev, [productId]: 1 }));
    } else {
      const newItems = { ...selectedItems };
      delete newItems[productId];
      setSelectedItems(newItems);
    }
  };

  const handleQuantityChange = (productId: number, val: string) => {
    setSelectedItems(prev => ({ ...prev, [productId]: Number(val) }));
  };

  const handleSubmit = async () => {
    setMessage(null);
    if (!producedProductId || !producedQuantity || !toWarehouseId) {
      setMessage({ type: "error", text: "Lütfen üretilecek ürün, miktar ve giriş yapılacak depoyu eksiksiz seçin." });
      return;
    }

    const selectedProductIds = Object.keys(selectedItems);
    if (selectedProductIds.length === 0) {
      setMessage({ type: "error", text: "Lütfen üretimde kullanılacak en az bir hammadde seçin." });
      return;
    }

    if (!fromWarehouseId) {
      setMessage({ type: "error", text: "Lütfen hammaddelerin çekileceği (sarfiyat) deposunu seçin." });
      return;
    }

    const consumed_items = selectedProductIds.map(id => ({
      product_id: Number(id),
      quantity: selectedItems[Number(id)],
      from_warehouse_id: Number(fromWarehouseId)
    }));

    const payload = {
      produced_product_id: Number(producedProductId),
      produced_quantity: Number(producedQuantity),
      to_warehouse_id: Number(toWarehouseId),
      consumed_items: consumed_items,
      note: globalNote,
      user_id: 1 
    };

    setLoading(true);
    try {
      await axios.post(`${API_URL}/stocks/produce`, payload);
      setMessage({ type: "success", text: `Üretim başarıyla tamamlandı! Sarfiyat çıkışları ve ürün girişi sisteme işlendi.` });
      setSelectedItems({});
      setProducedProductId("");
      setProducedQuantity("");
      setGlobalNote("");
      fetchData();
    } catch (error: any) {
      setMessage({ type: "error", text: error.response?.data?.error || "Bir hata oluştu." });
    } finally {
      setLoading(false);
    }
  };

  let displayProducts: any[] = [];
  if (fromWarehouseId) {
    const warehouseStocks = stocks.filter(s => String(s.warehouse_id) === fromWarehouseId);
    const warehouseProductIds = warehouseStocks.map(s => s.product_id);
    const selectedProductIds = Object.keys(selectedItems).map(Number);
    
    displayProducts = products
      .filter(p => {
        const isProduced = String(p.id) === producedProductId;
        if (isProduced) return false;

        // If searching, show all matching products
        if (search.trim().length > 0) {
          return p.name?.toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR')) || 
                 p.barcode?.toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR'));
        }

        // Otherwise show warehouse items + selected items
        return warehouseProductIds.includes(p.id) || selectedProductIds.includes(p.id);
      })
      .map(p => {
        const s = warehouseStocks.find(s => s.product_id === p.id);
        return { ...p, currentStock: s ? s.quantity : 0 };
      });
  }

  const filteredProducts = displayProducts
    .sort((a, b) => {
      const aSelected = selectedItems[a.id] !== undefined;
      const bSelected = selectedItems[b.id] !== undefined;
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return 0;
    });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight">Üretim / Montaj Masası</h1>

      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"} className={message.type === "success" ? "border-green-500 text-green-700 bg-green-50 shadow-sm" : ""}>
          <AlertTitle className="font-bold">{message.type === "error" ? "Hata Oluştu" : "İşlem Başarılı"}</AlertTitle>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sol Panel: Ne Üretilecek? */}
        <Card className="lg:col-span-4 border-t-4 border-t-orange-500 shadow-lg h-fit">
          <CardHeader className="bg-orange-50">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-600" />
              Üretim Planı
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold">Üretilecek Mamul</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={producedProductId}
                  onChange={e => setProducedProductId(e.target.value)}
                >
                  <option value="">Mamul Seçiniz...</option>
                  {products.filter(p => p.barcode?.startsWith("ALP")).map(p => (
                    <option key={p.id} value={p.id}>{p.barcode} - {p.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Üretilecek Miktar</Label>
                <Input 
                  type="number" min="1" 
                  value={producedQuantity} 
                  onChange={e => setProducedQuantity(e.target.value)}
                  placeholder="Örn: 10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-bold">Giriş Yapılacak Depo (Mamul Deposu)</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={toWarehouseId}
                onChange={e => setToWarehouseId(e.target.value)}
              >
                <option value="">Depo Seçiniz...</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>

            {activeRecipe ? (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertTitle className="text-blue-800 font-bold">Reçete Bulundu!</AlertTitle>
                <AlertDescription className="text-blue-700 flex flex-col gap-3">
                  Bu ürün için tanımlı bir reçete var. Otomatik olarak sarfiyat listesini oluşturabilirsiniz.
                  <Button variant="outline" size="sm" onClick={applyRecipe} className="w-fit bg-white border-blue-400 text-blue-700 hover:bg-blue-100 font-bold">
                    REÇETEYİ UYGULA
                  </Button>
                </AlertDescription>
              </Alert>
            ) : producedProductId && (
              <Alert variant="destructive">
                <AlertDescription>Bu ürün için henüz bir reçete tanımlanmamış. Hammaddeleri aşağıdan manuel seçmelisiniz.</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label className="font-bold text-gray-700">Üretim Notu / Parti No</Label>
              <Input value={globalNote} onChange={e => setGlobalNote(e.target.value)} placeholder="Örn: Batch #2024-01" />
            </div>
            
            <Button onClick={handleSubmit} disabled={loading || !producedProductId} className="w-full bg-slate-900 hover:bg-slate-800 h-14 text-xl font-black">
              <Hammer className="w-6 h-6 mr-2" />
              ÜRETİMİ GERÇEKLEŞTİR
            </Button>
          </CardContent>
        </Card>

        {/* Sağ Panel: Ne Kullanılacak? (Sarfiyat) */}
        <Card className="lg:col-span-8 border-t-4 border-t-blue-500 shadow-lg flex flex-col">
          <CardHeader className="bg-blue-50">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Hammadde Sarfiyatı
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label className="font-bold">Hammaddelerin Çekileceği Depo</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={fromWarehouseId}
                onChange={e => setFromWarehouseId(e.target.value)}
              >
                <option value="">Depo Seçiniz...</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>

            <div className="flex gap-2">
              <Input 
                placeholder="Hammadde Ara..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10"
              />
            </div>

            <div className="max-h-[500px] overflow-y-auto border rounded-md">
              <Table>
                <TableHeader className="bg-gray-100 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-[180px]">Seçim ve Miktar</TableHead>
                    <TableHead>Ürün</TableHead>
                    <TableHead>Stok</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map(p => {
                    const isSelected = selectedItems[p.id] !== undefined;
                    return (
                      <TableRow key={p.id} className={isSelected ? "bg-blue-50" : ""}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 cursor-pointer"
                              checked={isSelected}
                              onChange={(e) => handleCheckboxChange(p.id, e.target.checked)}
                            />
                            {isSelected && (
                              <Input 
                                type="number" 
                                min="1" step="1"
                                className="w-20 h-8 font-bold"
                                value={selectedItems[p.id] || ""}
                                onChange={(e) => handleQuantityChange(p.id, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === ",") e.preventDefault();
                                }}
                              />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <p className="font-bold">{p.name}</p>
                          <p className="text-gray-500">{p.barcode}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant={p.currentStock > 0 ? "outline" : "secondary"} className="w-fit">
                              Mevcut: {p.currentStock} {p.unit}
                            </Badge>
                            {isSelected && (
                              <Badge variant={p.currentStock - (selectedItems[p.id] || 0) >= 0 ? "default" : "destructive"} className="w-fit text-[10px]">
                                Kalan: {p.currentStock - (selectedItems[p.id] || 0)} {p.unit}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-10 text-muted-foreground italic">
                        {fromWarehouseId ? "Hammadde bulunamadı." : "Lütfen önce hammadde deposunu seçin."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
