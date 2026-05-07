"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

const API_URL = "http://localhost:8080/api";

export default function StokListesi() {
  const [stocks, setStocks] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: "asc" | "desc" } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [stocksRes, warehousesRes] = await Promise.all([
          axios.get(`${API_URL}/stocks`),
          axios.get(`${API_URL}/warehouses`)
        ]);
        setStocks(stocksRes.data || []);
        setWarehouses(warehousesRes.data || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const filteredStocks = stocks.filter((s: any) => {
    const searchLower = search.toLocaleLowerCase('tr-TR');
    const matchesSearch = s.warehouse?.name?.toLocaleLowerCase('tr-TR').includes(searchLower) ||
      s.product?.name?.toLocaleLowerCase('tr-TR').includes(searchLower) ||
      s.product?.barcode?.toLocaleLowerCase('tr-TR').includes(searchLower) ||
      s.product?.category?.toLocaleLowerCase('tr-TR').includes(searchLower);
    
    const matchesWarehouse = selectedWarehouseId === "all" || String(s.warehouse_id) === selectedWarehouseId;
    
    return matchesSearch && matchesWarehouse;
  });

  let sortedStocks = [...filteredStocks];
  if (sortConfig !== null) {
    sortedStocks.sort((a, b) => {
      let valA, valB;
      switch (sortConfig.key) {
        case "warehouse": valA = a.warehouse?.name?.toLocaleLowerCase('tr-TR') || ""; valB = b.warehouse?.name?.toLocaleLowerCase('tr-TR') || ""; break;
        case "barcode": valA = a.product?.barcode?.toLocaleLowerCase('tr-TR') || ""; valB = b.product?.barcode?.toLocaleLowerCase('tr-TR') || ""; break;
        case "name": valA = a.product?.name?.toLocaleLowerCase('tr-TR') || ""; valB = b.product?.name?.toLocaleLowerCase('tr-TR') || ""; break;
        case "category": valA = a.product?.category?.toLocaleLowerCase('tr-TR') || ""; valB = b.product?.category?.toLocaleLowerCase('tr-TR') || ""; break;
        case "unit": valA = a.product?.unit?.toLocaleLowerCase('tr-TR') || ""; valB = b.product?.unit?.toLocaleLowerCase('tr-TR') || ""; break;
        case "quantity": valA = Number(a.quantity); valB = Number(b.quantity); break;
        default: return 0;
      }
      
      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown className="w-4 h-4 ml-1 opacity-40 group-hover:opacity-100 transition-opacity" />;
    if (sortConfig.direction === "asc") return <ArrowUp className="w-4 h-4 ml-1 text-blue-600" />;
    return <ArrowDown className="w-4 h-4 ml-1 text-blue-600" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Stok Listesi</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle>Depolardaki Mevcut Ürünler</CardTitle>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <select 
                className="flex h-10 w-full sm:w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={selectedWarehouseId}
                onChange={e => setSelectedWarehouseId(e.target.value)}
              >
                <option value="all">Tüm Depolar</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
              <Input 
                placeholder="Ürün, Barkod veya Cins Ara..." 
                className="w-full sm:w-[300px]" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4 text-muted-foreground">Yükleniyor...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none hover:bg-gray-50 transition group" onClick={() => handleSort("warehouse")}>
                    <div className="flex items-center">Depo Adı <SortIcon columnKey="warehouse" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hover:bg-gray-50 transition group" onClick={() => handleSort("barcode")}>
                    <div className="flex items-center">Barkod <SortIcon columnKey="barcode" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hover:bg-gray-50 transition group" onClick={() => handleSort("name")}>
                    <div className="flex items-center">Ürün Adı <SortIcon columnKey="name" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hover:bg-gray-50 transition group" onClick={() => handleSort("category")}>
                    <div className="flex items-center">Cins <SortIcon columnKey="category" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hover:bg-gray-50 transition group" onClick={() => handleSort("unit")}>
                    <div className="flex items-center">Birim <SortIcon columnKey="unit" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hover:bg-gray-50 transition group text-right" onClick={() => handleSort("quantity")}>
                    <div className="flex items-center justify-end">Mevcut Miktar <SortIcon columnKey="quantity" /></div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStocks.map((stock: any) => (
                  <TableRow key={`${stock.warehouse_id}-${stock.product_id}`}>
                    <TableCell className="font-medium text-blue-600">{stock.warehouse?.name}</TableCell>
                    <TableCell className="font-mono text-sm">{stock.product?.barcode}</TableCell>
                    <TableCell className="font-medium">{stock.product?.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{stock.product?.category || "-"}</Badge>
                    </TableCell>
                    <TableCell>{stock.product?.unit}</TableCell>
                    <TableCell className="text-right">
                      {stock.quantity <= (stock.product?.min_stock_level || 0) ? (
                        <div className="flex items-center justify-end gap-2">
                          <Badge variant="destructive" className="animate-pulse text-sm px-2 py-1 shadow-sm">
                            {stock.quantity}
                          </Badge>
                          <span className="text-[10px] text-red-600 font-bold animate-pulse uppercase tracking-wider hidden sm:inline">Kritik</span>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-sm px-2 py-1 bg-green-50 text-green-700 border-green-200">
                          {stock.quantity}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {sortedStocks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      Depolarda aranılan kritere uygun stok bulunamadı.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
