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

const API_URL = typeof window !== "undefined" ? `http://${window.location.hostname}:8080/api` : "http://localhost:8080/api";

export default function StokIslemleri() {
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  
  const [type, setType] = useState("Giriş");
  const [globalNote, setGlobalNote] = useState("");
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [customerId, setCustomerId] = useState("");
  
  const [search, setSearch] = useState("");
  const [selectedItems, setSelectedItems] = useState<{ [key: number]: number }>({}); 
  
  const [message, setMessage] = useState<{type: "error" | "success", text: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);

  const fetchData = async () => {
    try {
      const [pRes, wRes, sRes, cRes] = await Promise.all([
        axios.get(`${API_URL}/products`),
        axios.get(`${API_URL}/warehouses`),
        axios.get(`${API_URL}/stocks`),
        axios.get(`${API_URL}/customers`)
      ]);
      setProducts(pRes.data || []);
      setWarehouses(wRes.data || []);
      setStocks(sRes.data || []);
      setCustomers(cRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setSelectedItems({});
  }, [type, fromWarehouseId, toWarehouseId]);

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
    const selectedProductIds = Object.keys(selectedItems);
    
    if (selectedProductIds.length === 0) {
      setMessage({ type: "error", text: "Lütfen tablodan işlem yapılacak en az bir ürün seçin." });
      return;
    }

    if (type === "Satış") {
      if (!customerId || !fromWarehouseId) {
        setMessage({ type: "error", text: "Satış işlemi için lütfen müşteri ve depo seçin." });
        return;
      }

      const salePayload = {
        customer_id: Number(customerId),
        note: globalNote,
        user_id: 1,
        sale_date: new Date().toISOString(),
        items: selectedProductIds.map(id => ({
          product_id: Number(id),
          warehouse_id: Number(fromWarehouseId),
          quantity: selectedItems[Number(id)],
          unit_price: 0 
        }))
      };

      setLoading(true);
      try {
        await axios.post(`${API_URL}/sales`, salePayload);
        setMessage({ type: "success", text: `${salePayload.items.length} kalem ürün satışı başarıyla kaydedildi!` });
        setSelectedItems({});
        setGlobalNote("");
        fetchData();
      } catch (error: any) {
        setMessage({ type: "error", text: error.response?.data?.error || "Satış kaydedilirken hata oluştu." });
      } finally {
        setLoading(false);
      }
      return;
    }

    if ((type === "Çıkış" || type === "Transfer") && !fromWarehouseId) {
      setMessage({ type: "error", text: "Lütfen çıkış yapılacak depoyu seçin." });
      return;
    }
    if ((type === "Giriş" || type === "Transfer") && !toWarehouseId) {
      setMessage({ type: "error", text: "Lütfen giriş yapılacak depoyu seçin." });
      return;
    }

    const payload = selectedProductIds.map(id => {
      const pId = Number(id);
      const req: any = {
        product_id: pId,
        quantity: selectedItems[pId],
        type: type,
        note: globalNote,
        user_id: 1 
      };
      if (type === "Giriş") req.to_warehouse_id = Number(toWarehouseId);
      else if (type === "Çıkış") req.from_warehouse_id = Number(fromWarehouseId);
      else if (type === "Transfer") {
        req.from_warehouse_id = Number(fromWarehouseId);
        req.to_warehouse_id = Number(toWarehouseId);
      }
      return req;
    });

    setLoading(true);
    try {
      await axios.post(`${API_URL}/stocks/move/bulk`, payload);
      setMessage({ type: "success", text: `${payload.length} adet ürün için toplu ${type.toLowerCase()} işlemi başarıyla kaydedildi!` });
      setSelectedItems({});
      setGlobalNote("");
      fetchData();
    } catch (error: any) {
      setMessage({ type: "error", text: error.response?.data?.error || "Bir hata oluştu." });
    } finally {
      setLoading(false);
    }
  };

  let displayProducts: any[] = [];

  if (type === "Çıkış" || type === "Transfer" || type === "Satış") {
    if (fromWarehouseId) {
      const availableStocks = stocks.filter(s => String(s.warehouse_id) === fromWarehouseId && s.quantity > 0);
      const availableProductIds = availableStocks.map(s => s.product_id);
      displayProducts = products.filter(p => availableProductIds.includes(p.id)).map(p => {
        const s = availableStocks.find(s => s.product_id === p.id);
        return { ...p, currentStock: s ? s.quantity : 0 };
      });
    }
  } else if (type === "Giriş") {
    displayProducts = products.map(p => {
      let currentStock = 0;
      if (toWarehouseId) {
        const s = stocks.find(s => String(s.warehouse_id) === toWarehouseId && s.product_id === p.id);
        if (s) currentStock = s.quantity;
      }
      return { ...p, currentStock };
    });
  }

  let filteredProducts = displayProducts.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.barcode.includes(search) || 
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  if (showCriticalOnly) {
    filteredProducts = filteredProducts.filter(p => p.currentStock <= p.min_stock_level);
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight">Toplu Stok İşlemleri</h1>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 h-fit sticky top-6">
          <CardHeader>
            <CardTitle>İşlem Detayları</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col gap-2">
              <Label>İşlem Türü</Label>
              <div className="flex flex-wrap gap-2">
                {["Giriş", "Çıkış", "Transfer", "Satış"].map(t => (
                  <Button 
                    key={t} 
                    variant={type === t ? "default" : "outline"}
                    onClick={() => setType(t)}
                    className="flex-1"
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>

            {(type === "Çıkış" || type === "Transfer" || type === "Satış") && (
              <div className="space-y-2">
                <Label>Çıkış Yapılacak Depo</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={fromWarehouseId}
                  onChange={e => setFromWarehouseId(e.target.value)}
                >
                  <option value="">Depo Seçiniz...</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            )}

            {type === "Satış" && (
              <div className="space-y-2">
                <Label>Müşteri Seçimi</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={customerId}
                  onChange={e => setCustomerId(e.target.value)}
                >
                  <option value="">Müşteri Seçiniz...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {(type === "Giriş" || type === "Transfer") && (
              <div className="space-y-2">
                <Label>Giriş Yapılacak Depo</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={toWarehouseId}
                  onChange={e => setToWarehouseId(e.target.value)}
                >
                  <option value="">Depo Seçiniz...</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Açıklama / Not (Tümü için)</Label>
              <Input 
                value={globalNote}
                onChange={e => setGlobalNote(e.target.value)}
                placeholder="Örn: Pazartesi sevkiyatı"
              />
            </div>

            {message && (
              <Alert variant={message.type === "error" ? "destructive" : "default"} className={message.type === "success" ? "border-green-500 text-green-700 bg-green-50" : ""}>
                <AlertTitle>{message.type === "error" ? "Hata" : "Başarılı"}</AlertTitle>
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            <Button onClick={handleSubmit} disabled={loading} className="w-full font-bold">
              {loading ? "İşleniyor..." : `Seçili Ürünleri Onayla (${Object.keys(selectedItems).length})`}
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <CardTitle>İşlem Yapılacak Ürünleri Seçin</CardTitle>
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="flex items-center space-x-2 bg-orange-50 px-3 py-1.5 rounded-md border border-orange-100">
                  <input 
                    type="checkbox" 
                    id="criticalFilter"
                    className="w-4 h-4 cursor-pointer accent-orange-600"
                    checked={showCriticalOnly}
                    onChange={(e) => setShowCriticalOnly(e.target.checked)}
                  />
                  <Label htmlFor="criticalFilter" className="text-xs font-bold text-orange-700 cursor-pointer">Sadece Kritik Stoklar</Label>
                </div>
                <Input 
                  placeholder="Ürün Ara..." 
                  className="max-w-xs h-9" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[600px] overflow-y-auto border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="w-[240px]">Seçim ve İşlem Miktarı</TableHead>
                    <TableHead>Barkod</TableHead>
                    <TableHead>Ürün Adı</TableHead>
                    <TableHead>Mevcut Stok</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map(p => {
                    const isSelected = selectedItems[p.id] !== undefined;
                    return (
                      <TableRow key={p.id} className={isSelected ? "bg-blue-50" : ""}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <input 
                              type="checkbox" 
                              className="w-5 h-5 cursor-pointer accent-blue-600"
                              checked={isSelected}
                              onChange={(e) => handleCheckboxChange(p.id, e.target.checked)}
                            />
                            {isSelected && (
                              <div className="flex items-center gap-2">
                                <Input 
                                  type="number" 
                                  min="1"
                                  max={(type === "Çıkış" || type === "Transfer" || type === "Satış") ? p.currentStock : undefined}
                                  step="1"
                                  className="w-20 h-8 font-bold border-blue-400 focus-visible:ring-blue-500"
                                  value={selectedItems[p.id] || ""}
                                  onChange={(e) => {
                                    let val = Number(e.target.value);
                                    if ((type === "Çıkış" || type === "Transfer" || type === "Satış") && val > p.currentStock) {
                                      val = p.currentStock;
                                    }
                                    handleQuantityChange(p.id, val.toString());
                                  }}
                                  autoFocus
                                />
                                <div className="flex flex-col">
                                  <span className="text-[10px] leading-tight text-muted-foreground">Mevcut</span>
                                  <span className="text-xs font-bold text-blue-700 whitespace-nowrap">
                                    {p.currentStock} {p.unit}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{p.barcode}</TableCell>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>
                          <Badge variant={p.currentStock > 0 ? "outline" : "secondary"} className={p.currentStock > 0 ? "bg-green-50 text-green-700 border-green-200" : ""}>
                            {type === "Giriş" && !toWarehouseId ? "?" : p.currentStock} {p.unit}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                        {(type === "Çıkış" || type === "Transfer" || type === "Satış") && !fromWarehouseId 
                          ? "Lütfen önce sol taraftan çıkış yapılacak depoyu seçin." 
                          : "Bu kritere veya seçili depoya uygun stok/ürün bulunamadı."}
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
