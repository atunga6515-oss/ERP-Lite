"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown, ShoppingBag, Send, Clock, Hammer, PlayCircle, CheckCircle2, Truck } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const API_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}/api` : "http://localhost:8080/api");

export default function Dashboard() {
  const [products, setProducts] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [criticalSortConfig, setCriticalSortConfig] = useState<{ key: string, direction: "asc" | "desc" } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, stockRes, movRes, purRes, woRes, saleRes] = await Promise.all([
          axios.get(`${API_URL}/products`),
          axios.get(`${API_URL}/stocks`),
          axios.get(`${API_URL}/movements`),
          axios.get(`${API_URL}/purchases`),
          axios.get(`${API_URL}/work-orders`),
          axios.get(`${API_URL}/sales`),
        ]);
        setProducts(prodRes.data || []);
        setStocks(stockRes.data || []);
        setMovements(movRes.data || []);
        setPurchases(purRes.data || []);
        setWorkOrders(woRes.data || []);
        setSales(saleRes.data || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalProducts = products.length;
  
  // Calculate warehouse stock map for summary cards
  const productStockMap: Record<number, number> = {};
  const warehouseStockMap: Record<string, number> = {};
  stocks.forEach(stock => {
    productStockMap[stock.product_id] = (productStockMap[stock.product_id] || 0) + stock.quantity;
    const wName = stock.warehouse?.name || "Bilinmeyen Depo";
    warehouseStockMap[wName] = (warehouseStockMap[wName] || 0) + stock.quantity;
  });

  // Critical stocks: per-warehouse check
  const criticalStockItems = stocks
    .filter(stock => {
      const product = products.find(p => p.id === stock.product_id);
      if (!product || product.min_stock_level <= 0) return false;
      return stock.quantity <= product.min_stock_level;
    })
    .map(stock => {
      const product = products.find(p => p.id === stock.product_id)!;
      return {
        id: `${stock.warehouse_id}-${stock.product_id}`,
        product_name: product.name,
        barcode: product.barcode,
        warehouse_name: stock.warehouse?.name || "?",
        current_qty: stock.quantity,
        min_stock_level: product.min_stock_level,
      };
    });

  const handleCriticalSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (criticalSortConfig && criticalSortConfig.key === key && criticalSortConfig.direction === "asc") {
      direction = "desc";
    }
    setCriticalSortConfig({ key, direction });
  };

  let sortedCriticalStocks = [...criticalStockItems];
  if (criticalSortConfig !== null) {
    sortedCriticalStocks.sort((a, b) => {
      let valA, valB;
      switch (criticalSortConfig.key) {
        case "name": valA = a.product_name?.toLowerCase() || ""; valB = b.product_name?.toLowerCase() || ""; break;
        case "barcode": valA = a.barcode?.toLowerCase() || ""; valB = b.barcode?.toLowerCase() || ""; break;
        case "warehouse": valA = a.warehouse_name?.toLowerCase() || ""; valB = b.warehouse_name?.toLowerCase() || ""; break;
        case "current": valA = a.current_qty; valB = b.current_qty; break;
        case "min": valA = a.min_stock_level; valB = b.min_stock_level; break;
        default: return 0;
      }
      if (valA < valB) return criticalSortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return criticalSortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (criticalSortConfig?.key !== columnKey) return <ArrowUpDown className="w-4 h-4 ml-1 opacity-40 group-hover:opacity-100 transition-opacity" />;
    if (criticalSortConfig.direction === "asc") return <ArrowUp className="w-4 h-4 ml-1 text-blue-600" />;
    return <ArrowDown className="w-4 h-4 ml-1 text-blue-600" />;
  };

  if (loading) return <div className="p-10 flex justify-center">Yükleniyor...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Ürün Çeşidi</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-xs mt-2 pb-2 border-b border-slate-100">
              <span className="flex items-center gap-1.5 text-slate-500">Ürün Gamı Çeşidi</span>
              <span className="font-black text-slate-700 text-lg">{totalProducts}</span>
            </div>
            <div className="pt-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Depo Bazlı Stok Adetleri</div>
              {Object.entries(warehouseStockMap).map(([wName, qty]) => (
                <div key={wName} className="flex items-center justify-between text-xs py-0.5">
                  <span className="flex items-center gap-1.5 text-blue-600 truncate max-w-[120px]" title={wName}>{wName}</span>
                  <span className="font-bold text-blue-700">{qty}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kritik Stok Uyarıları</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalStockItems.length}</div>
            {criticalStockItems.length > 0 && (
              <p className="text-xs text-muted-foreground">Stok seviyesi kritik düzeyde olan ürünler var.</p>
            )}
          </CardContent>
        </Card>
        <Card className={purchases.filter(p => p.status !== 'Tamamlandı' && p.status !== 'İptal').length > 0 ? 'border-orange-200 bg-orange-50/30' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bekleyen Siparişler</CardTitle>
            <ShoppingBag className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-500"><Clock className="w-3 h-3" /> Hazırlanıyor</span>
              <span className="font-black text-slate-700">{purchases.filter(p => p.status === 'Hazırlanıyor').length}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-blue-500"><Send className="w-3 h-3" /> Sipariş Verildi</span>
              <span className="font-black text-blue-700">{purchases.filter(p => p.status === 'Sipariş Verildi').length}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-orange-500"><Package className="w-3 h-3" /> Mal Kabul Bekliyor</span>
              <span className="font-black text-orange-700">{purchases.filter(p => p.status === 'Sipariş Verildi').length}</span>
            </div>
          </CardContent>
        </Card>
        <Card className={workOrders.filter(w => w.status !== 'Tamamlandı' && w.status !== 'İptal').length > 0 ? 'border-purple-200 bg-purple-50/30' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Üretim İş Emirleri</CardTitle>
            <Hammer className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-500"><Clock className="w-3 h-3" /> Planlandı</span>
              <span className="font-black text-slate-700">{workOrders.filter(w => w.status === 'Planlandı').length}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-purple-500"><PlayCircle className="w-3 h-3" /> Üretimde</span>
              <span className="font-black text-purple-700">{workOrders.filter(w => w.status === 'Üretimde').length}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-green-500"><CheckCircle2 className="w-3 h-3" /> Tamamlandı</span>
              <span className="font-black text-green-700">{workOrders.filter(w => w.status === 'Tamamlandı').length}</span>
            </div>
          </CardContent>
        </Card>
        <Card className={sales.filter(s => s.status === 'Hazırlanıyor').length > 0 ? 'border-blue-200 bg-blue-50/30' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sevkiyat Masası</CardTitle>
            <Truck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-500"><Clock className="w-3 h-3" /> Hazırlanıyor</span>
              <span className="font-black text-slate-700">{sales.filter(s => s.status === 'Hazırlanıyor').length}</span>
            </div>
            <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-blue-100">
              <span className="flex items-center gap-1.5 text-blue-600 font-bold underline">
                <Link href="/sevkiyat">Sevkiyata Git →</Link>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Kritik Stok Raporu ({criticalStockItems.length})</CardTitle>
          </CardHeader>
          <CardContent className="resize-y overflow-auto min-h-[350px] max-h-[800px] scrollbar-thin">
            {criticalStockItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">Şu an kritik seviyede stok bulunmuyor.</p>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="p-0 border-r border-slate-200">
                      <div className="resize-x overflow-hidden min-w-[150px] max-w-[600px] px-4 py-3 cursor-pointer group select-none hover:bg-slate-100 transition-colors" onClick={() => handleCriticalSort("name")}>
                        <div className="flex items-center font-bold">Ürün <SortIcon columnKey="name" /></div>
                      </div>
                    </TableHead>
                    <TableHead className="p-0 border-r border-slate-200">
                      <div className="resize-x overflow-hidden min-w-[120px] max-w-[400px] px-4 py-3 cursor-pointer group select-none hover:bg-slate-100 transition-colors" onClick={() => handleCriticalSort("barcode")}>
                        <div className="flex items-center font-bold">Barkod <SortIcon columnKey="barcode" /></div>
                      </div>
                    </TableHead>
                    <TableHead className="p-0 border-r border-slate-200">
                      <div className="resize-x overflow-hidden min-w-[120px] max-w-[400px] px-4 py-3 cursor-pointer group select-none hover:bg-slate-100 transition-colors" onClick={() => handleCriticalSort("warehouse")}>
                        <div className="flex items-center font-bold">Depo <SortIcon columnKey="warehouse" /></div>
                      </div>
                    </TableHead>
                    <TableHead className="p-0 border-r border-slate-200">
                      <div className="resize-x overflow-hidden min-w-[100px] max-w-[200px] px-4 py-3 cursor-pointer group select-none hover:bg-slate-100 transition-colors" onClick={() => handleCriticalSort("current")}>
                        <div className="flex items-center font-bold">Mevcut <SortIcon columnKey="current" /></div>
                      </div>
                    </TableHead>
                    <TableHead className="p-0">
                      <div className="resize-x overflow-hidden min-w-[100px] max-w-[200px] px-4 py-3 cursor-pointer group select-none hover:bg-slate-100 transition-colors" onClick={() => handleCriticalSort("min")}>
                        <div className="flex items-center font-bold">Kritik <SortIcon columnKey="min" /></div>
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCriticalStocks.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium truncate max-w-0" title={item.product_name}>{item.product_name}</TableCell>
                      <TableCell className="truncate max-w-0">{item.barcode}</TableCell>
                      <TableCell className="text-xs font-semibold text-slate-600 truncate max-w-0">{item.warehouse_name}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">{item.current_qty}</Badge>
                      </TableCell>
                      <TableCell>{item.min_stock_level}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Son İşlemler (Audit Log)</CardTitle>
          </CardHeader>
          <CardContent className="resize-y overflow-auto min-h-[350px] max-h-[800px] scrollbar-thin">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="p-0 border-r border-slate-200">
                    <div className="resize-x overflow-hidden min-w-[150px] max-w-[500px] px-4 py-3 font-bold">Ürün</div>
                  </TableHead>
                  <TableHead className="p-0 border-r border-slate-200">
                    <div className="resize-x overflow-hidden min-w-[120px] max-w-[300px] px-4 py-3 font-bold">İşlem</div>
                  </TableHead>
                  <TableHead className="p-0 border-r border-slate-200">
                    <div className="resize-x overflow-hidden min-w-[150px] max-w-[500px] px-4 py-3 font-bold">İlgili Firma</div>
                  </TableHead>
                  <TableHead className="p-0 border-r border-slate-200">
                    <div className="resize-x overflow-hidden min-w-[80px] max-w-[150px] px-4 py-3 font-bold">Miktar</div>
                  </TableHead>
                  <TableHead className="p-0">
                    <div className="resize-x overflow-hidden min-w-[120px] max-w-[300px] px-4 py-3 font-bold">Tarih</div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell className="truncate max-w-0" title={m.product?.name}>{m.product?.name}</TableCell>
                    <TableCell className="truncate max-w-0">
                      <Badge variant={m.type?.includes("Giriş") ? "default" : m.type?.includes("Çıkış") ? "destructive" : "secondary"}>
                        {m.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-600 truncate max-w-0">
                      {m.customer?.name || (m.type === "Satış" ? "Bilinmeyen Firma" : "-")}
                    </TableCell>
                    <TableCell className="font-bold">{m.quantity}</TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-0">
                      {m.timestamp ? format(new Date(m.timestamp), "dd MMM yyyy HH:mm", { locale: tr }) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
                {movements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">Henüz işlem yok.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Bekleyen Sevkiyatlar Tablosu */}
      {sales.filter(s => s.status === 'Hazırlanıyor').length > 0 && (
        <Card className="border-t-4 border-t-blue-600">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-blue-800 uppercase font-black tracking-tight">
              <Truck className="w-6 h-6" /> Bekleyen Sevkiyat Masası
            </CardTitle>
            <Link href="/sevkiyat" className="text-xs bg-blue-600 text-white px-3 py-1 rounded-full font-bold hover:bg-blue-700 transition-colors">YÖNETİM PANELİNE GİT</Link>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-bold">Sipariş No</TableHead>
                  <TableHead className="font-bold">Müşteri</TableHead>
                  <TableHead className="font-bold">Kayıt Tarihi</TableHead>
                  <TableHead className="font-bold">Ürün Sayısı</TableHead>
                  <TableHead className="text-right font-bold">Toplam Tutar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.filter(s => s.status === 'Hazırlanıyor').map((s: any) => (
                  <TableRow key={s.id} className="hover:bg-blue-50/50 group">
                    <TableCell className="font-mono font-bold text-slate-500">#SAL-{s.id.toString().padStart(5, '0')}</TableCell>
                    <TableCell className="font-black text-slate-800">{s.customer?.name || '-'}</TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {s.created_at ? format(new Date(s.created_at), 'dd MMM yyyy HH:mm', { locale: tr }) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">
                        {s.items?.length || 0} Kalem Ürün
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-black text-blue-900">{s.total_price?.toLocaleString('tr-TR')} ₺</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Bekleyen Satınalma Siparişleri */}
      {purchases.filter(p => p.status === 'Hazırlanıyor' || p.status === 'Sipariş Verildi').length > 0 && (
        <Card className="border-t-4 border-t-orange-500">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-orange-700 uppercase font-black tracking-tight">
              <ShoppingBag className="w-6 h-6" /> Bekleyen Satınalma Siparişleri
            </CardTitle>
            <Link href="/satinalma-listesi" className="text-xs text-blue-600 hover:underline font-bold">Tümünü Gör →</Link>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-bold">Sipariş No</TableHead>
                  <TableHead className="font-bold">Tedarikçi</TableHead>
                  <TableHead className="font-bold">Tarih</TableHead>
                  <TableHead className="font-bold">Durum</TableHead>
                  <TableHead className="text-right font-bold">Tutar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.filter(p => p.status === 'Hazırlanıyor' || p.status === 'Sipariş Verildi').map((p: any) => (
                  <TableRow key={p.id} className="hover:bg-orange-50/50">
                    <TableCell className="font-mono font-bold text-slate-500">PO-{p.id.toString().padStart(5, '0')}</TableCell>
                    <TableCell className="font-semibold text-blue-700">{p.supplier?.name || '-'}</TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {p.purchase_date ? format(new Date(p.purchase_date), 'dd MMM yyyy', { locale: tr }) : '-'}
                    </TableCell>
                    <TableCell>
                      {p.status === 'Hazırlanıyor' && (
                        <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100"><Clock className="w-3 h-3 mr-1" /> Hazırlanıyor</Badge>
                      )}
                      {p.status === 'Sipariş Verildi' && (
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100"><Send className="w-3 h-3 mr-1" /> Sipariş Verildi</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-black">{p.total_price?.toLocaleString('tr-TR')} ₺</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
