"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import * as XLSX from "xlsx";
import { format, startOfDay, endOfDay } from "date-fns";
import { tr } from "date-fns/locale";
import { FileSpreadsheet } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}/api` : "http://localhost:8080/api");

export default function Raporlama() {
  const [activeTab, setActiveTab] = useState<"stok" | "hareket" | "satinalma">("hareket");
  
  // Data States
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters for Stock
  const [stockWarehouseFilter, setStockWarehouseFilter] = useState("all");

  // Filters for Movements
  const [movStartDate, setMovStartDate] = useState("");
  const [movEndDate, setMovEndDate] = useState("");
  const [movType, setMovType] = useState("all");
  const [movWarehouse, setMovWarehouse] = useState("all");
  const [movCustomer, setMovCustomer] = useState("all");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [wRes, sRes, mRes, pRes, cRes] = await Promise.all([
          axios.get(`${API_URL}/warehouses`),
          axios.get(`${API_URL}/stocks`),
          axios.get(`${API_URL}/movements?limit=all`),
          axios.get(`${API_URL}/purchases`),
          axios.get(`${API_URL}/customers`)
        ]);
        setWarehouses(wRes.data || []);
        setStocks(sRes.data || []);
        setMovements(mRes.data || []);
        setPurchases(pRes.data || []);
        setCustomers(cRes.data || []);
      } catch (err) {
        console.error("Veri çekme hatası:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter Logics
  const filteredStocks = stocks.filter((s: any) => 
    stockWarehouseFilter === "all" || String(s.warehouse_id) === stockWarehouseFilter
  );

  const filteredMovements = movements.filter((m: any) => {
    let isValid = true;
    
    // Type filter
    if (movType !== "all" && m.type !== movType) isValid = false;
    
    // Warehouse filter
    if (movWarehouse !== "all") {
      const wId = Number(movWarehouse);
      if (m.from_warehouse_id !== wId && m.to_warehouse_id !== wId) {
        isValid = false;
      }
    }

    // Customer filter
    if (movCustomer !== "all" && String(m.customer_id) !== movCustomer) {
      isValid = false;
    }

    // Date filter
    if (movStartDate || movEndDate) {
      if (!m.timestamp) {
        isValid = false;
      } else {
        const mDate = new Date(m.timestamp);
        const start = movStartDate ? startOfDay(new Date(movStartDate)) : new Date(0);
        const end = movEndDate ? endOfDay(new Date(movEndDate)) : new Date(3000, 1, 1);
        
        if (mDate < start || mDate > end) {
          isValid = false;
        }
      }
    }

    return isValid;
  });

  const exportStocksToExcel = () => {
    const data = filteredStocks.map((s: any) => ({
      "Depo Adı": s.warehouse?.name || "-",
      "Barkod": s.product?.barcode || "-",
      "Ürün Adı": s.product?.name || "-",
      "Cins": s.product?.category || "-",
      "Mevcut Miktar": s.quantity,
      "Birim": s.product?.unit || "-",
      "Min Stok": s.product?.min_stock_level || 0
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stok Durumu");
    XLSX.writeFile(wb, `Depo_Mevcut_Stok_Raporu_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
  };

  const exportMovementsToExcel = () => {
    const data = filteredMovements.map((m: any) => ({
      "Tarih": m.timestamp ? format(new Date(m.timestamp), 'dd MMM yyyy HH:mm', { locale: tr }) : "-",
      "İşlem Türü": m.type,
      "Barkod": m.product?.barcode || "-",
      "Ürün Adı": m.product?.name || "-",
      "Müşteri / Tedarikçi": m.customer?.name || m.supplier?.name || "-",
      "Miktar": m.quantity,
      "Birim": m.product?.unit || "-",
      "Çıkış Depo": m.from_warehouse?.name || "-",
      "Giriş Depo": m.to_warehouse?.name || "-",
      "Not / Açıklama": m.note || "-",
      "İşlemi Yapan": m.user?.username || "-"
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stok Hareketleri");
    XLSX.writeFile(wb, `Hareket_Raporu_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
  };

  if (loading) return <div className="p-10 text-center">Rapor verileri yükleniyor...</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Raporlama Merkezi</h1>
      </div>

      <div className="flex gap-4 border-b pb-2">
        <Button 
          variant={activeTab === "hareket" ? "default" : "outline"} 
          onClick={() => setActiveTab("hareket")}
          className="font-semibold"
        >
          Tarih & İşlem Bazlı Hareket Raporu
        </Button>
        <Button 
          variant={activeTab === "stok" ? "default" : "outline"} 
          onClick={() => setActiveTab("stok")}
          className="font-semibold"
        >
          Depo Toplam Stok Raporu
        </Button>
        <Button 
          variant={activeTab === "satinalma" ? "default" : "outline"} 
          onClick={() => setActiveTab("satinalma")}
          className="font-semibold"
        >
          Satınalma Sipariş Takibi
        </Button>
      </div>

      {activeTab === "hareket" && (
        <Card className="border-t-4 border-t-blue-600 shadow-md">
          <CardHeader className="bg-gray-50 border-b">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <CardTitle className="text-xl">Hareket Geçmişi Detaylı Filtreleme</CardTitle>
              <Button onClick={exportMovementsToExcel} className="bg-green-600 hover:bg-green-700 font-bold">
                <FileSpreadsheet className="w-5 h-5 mr-2" /> Excel'e Aktar
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6 mt-6">
              <div className="space-y-2">
                <Label className="text-gray-600">Başlangıç Tarihi</Label>
                <Input type="date" value={movStartDate} onChange={e => setMovStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-600">Bitiş Tarihi</Label>
                <Input type="date" value={movEndDate} onChange={e => setMovEndDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-600">İşlem Türü</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600"
                  value={movType} onChange={e => setMovType(e.target.value)}
                >
                  <option value="all">Tüm İşlemler</option>
                  <option value="Giriş">Giriş</option>
                  <option value="Çıkış">Çıkış</option>
                  <option value="Transfer">Transfer</option>
                  <option value="Satış">Satış</option>
                  <option value="Satış Sevkiyatı">Satış Sevkiyatı</option>
                  <option value="Satınalma Girişi">Satınalma Girişi</option>
                  <option value="Üretim Sarfiyatı">Üretim Sarfiyatı</option>
                  <option value="Üretimden Giriş">Üretimden Giriş</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-600">İlgili Depo</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600"
                  value={movWarehouse} onChange={e => setMovWarehouse(e.target.value)}
                >
                  <option value="all">Tüm Depolar</option>
                  {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-600">Müşteri / Firma</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600"
                  value={movCustomer} onChange={e => setMovCustomer(e.target.value)}
                >
                  <option value="all">Tüm Müşteriler</option>
                  {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="max-h-[600px] overflow-y-auto border rounded-md">
              <Table>
                <TableHeader className="bg-gray-100 sticky top-0 shadow-sm z-10">
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>İşlem</TableHead>
                    <TableHead>Ürün</TableHead>
                    <TableHead>Müşteri / Firma</TableHead>
                    <TableHead>Miktar</TableHead>
                    <TableHead>Çıkış Depo</TableHead>
                    <TableHead>Giriş Depo</TableHead>
                    <TableHead>Not</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovements.map((m: any) => (
                    <TableRow key={m.id} className="hover:bg-blue-50/50">
                      <TableCell className="whitespace-nowrap font-mono text-xs">
                        {m.timestamp ? format(new Date(m.timestamp), 'dd MMM yyyy HH:mm', { locale: tr }) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            m.type === "Giriş" || m.type === "Üretimden Giriş" ? "default" : 
                            m.type === "Çıkış" || m.type === "Satış" || m.type === "Üretim Sarfiyatı" ? "destructive" : 
                            "secondary"
                          }
                          className={m.type === "Satış" ? "bg-green-600 hover:bg-green-700" : ""}
                        >
                          {m.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-blue-900">{m.product?.name}</TableCell>
                      <TableCell className="text-xs font-bold text-slate-700">
                        {m.customer?.name || m.supplier?.name || (m.type === "Satış" ? "Bilinmeyen Firma" : "-")}
                      </TableCell>
                      <TableCell className="font-bold text-gray-700">{m.quantity} <span className="text-xs font-normal text-gray-500">{m.product?.unit}</span></TableCell>
                      <TableCell>{m.from_warehouse?.name || "-"}</TableCell>
                      <TableCell>{m.to_warehouse?.name || "-"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate" title={m.note}>{m.note || "-"}</TableCell>
                    </TableRow>
                  ))}
                  {filteredMovements.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-muted-foreground font-medium">Kriterlere uygun hareket bulunamadı.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 text-sm text-gray-500 text-right">
              Toplam <span className="font-bold">{filteredMovements.length}</span> kayıt listeleniyor.
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "stok" && (
        <Card className="border-t-4 border-t-blue-600 shadow-md">
          <CardHeader className="bg-gray-50 border-b">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <CardTitle className="text-xl">Anlık Stok Durumu (Tüm Depolar)</CardTitle>
              <Button onClick={exportStocksToExcel} className="bg-green-600 hover:bg-green-700 font-bold">
                <FileSpreadsheet className="w-5 h-5 mr-2" /> Excel'e Aktar
              </Button>
            </div>
            <div className="flex items-center gap-4 mt-6">
              <Label className="text-gray-600 font-bold">Depoya Göre Filtrele:</Label>
              <select 
                className="flex h-10 w-64 rounded-md border border-input bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600"
                value={stockWarehouseFilter} onChange={e => setStockWarehouseFilter(e.target.value)}
              >
                <option value="all">Tüm Depoları Göster</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="max-h-[600px] overflow-y-auto border rounded-md">
              <Table>
                <TableHeader className="bg-gray-100 sticky top-0 shadow-sm z-10">
                  <TableRow>
                    <TableHead>Depo</TableHead>
                    <TableHead>Barkod</TableHead>
                    <TableHead>Ürün Adı</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Miktar</TableHead>
                    <TableHead>Birim</TableHead>
                    <TableHead className="text-right">Kritik Seviye</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStocks.map((s: any, idx: number) => (
                    <TableRow key={idx} className="hover:bg-blue-50/50">
                      <TableCell className="font-semibold text-slate-700">{s.warehouse?.name}</TableCell>
                      <TableCell className="font-mono text-xs">{s.product?.barcode}</TableCell>
                      <TableCell className="font-medium text-blue-900">{s.product?.name}</TableCell>
                      <TableCell><Badge variant="outline">{s.product?.category || "-"}</Badge></TableCell>
                      <TableCell className="text-right font-bold text-gray-800">
                        <span className={s.quantity <= (s.product?.min_stock_level || 0) ? "text-red-600" : ""}>
                          {s.quantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-500">{s.product?.unit}</TableCell>
                      <TableCell className="text-right text-gray-400 italic">{s.product?.min_stock_level || 0}</TableCell>
                    </TableRow>
                  ))}
                  {filteredStocks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Bu depoda stok bulunmuyor.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "satinalma" && (
        <Card className="border-t-4 border-t-orange-600 shadow-md">
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle>Satınalma Siparişleri ve Mal Kabul Durumu</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="max-h-[600px] overflow-y-auto border rounded-md">
              <Table>
                <TableHeader className="bg-gray-100 sticky top-0 shadow-sm z-10">
                  <TableRow>
                    <TableHead>Sipariş No</TableHead>
                    <TableHead>Tedarikçi</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Toplam Tutar</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Ürün Detayı</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono font-bold">#{p.id}</TableCell>
                      <TableCell className="font-bold">{p.supplier?.name}</TableCell>
                      <TableCell>{format(new Date(p.purchase_date), 'dd MMM yyyy', { locale: tr })}</TableCell>
                      <TableCell className="font-bold">{p.total_price.toLocaleString('tr-TR')} ₺</TableCell>
                      <TableCell>
                        <Badge 
                          className={
                            p.status === 'Tamamlandı' ? 'bg-green-600' : 
                            p.status === 'Bekliyor' ? 'bg-orange-500' : 'bg-red-500'
                          }
                        >
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {p.items?.map((item: any, i: number) => (
                          <div key={i}>{item.quantity} {item.product?.name}</div>
                        ))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
