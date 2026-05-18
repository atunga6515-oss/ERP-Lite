"use client";

import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Upload, Edit, Trash2, Download } from "lucide-react";
import { Product } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}/api` : "http://localhost:8080/api");

export default function Urunler() {
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    id: null as number | null, name: "", barcode: "", unit: "Adet", category: "", min_stock_level: 0
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadExampleExcel = () => {
    const data = [
      {
        "Adı": "Örnek Ürün 1",
        "Barkod": "PRD-001",
        "Birim": "Adet",
        "Cins": "Kategori A",
        "MinStok": 10
      },
      {
        "Adı": "Örnek Ürün 2",
        "Barkod": "PRD-002",
        "Birim": "Metre",
        "Cins": "Kategori B",
        "MinStok": 5
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ürün Taslağı");
    
    // Set column widths for better readability
    const wscols = [
      { wch: 30 }, // Adı
      { wch: 15 }, // Barkod
      { wch: 10 }, // Birim
      { wch: 20 }, // Cins
      { wch: 10 }  // MinStok
    ];
    worksheet['!cols'] = wscols;

    XLSX.writeFile(workbook, "urun_ice_aktarim_taslagi.xlsx");
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API_URL}/products`);
      setProducts(res.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openCreateDialog = () => {
    setFormData({ id: null, name: "", barcode: "", unit: "Adet", category: "", min_stock_level: 0 });
    setIsDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setFormData({
      id: product.id,
      name: product.name,
      barcode: product.barcode,
      unit: product.unit,
      category: product.category,
      min_stock_level: product.min_stock_level
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bu ürünü silmek istediğinize emin misiniz? (Ürüne bağlı stok hareketleri varsa silinmeyebilir)")) return;
    try {
      await axios.delete(`${API_URL}/products/${id}`);
      fetchProducts();
    } catch (error) {
      console.error(error);
      alert("Ürün silinirken hata oluştu.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      min_stock_level: Number(formData.min_stock_level)
    };

    try {
      if (formData.id) {
        await axios.put(`${API_URL}/products/${formData.id}`, payload);
      } else {
        await axios.post(`${API_URL}/products`, payload);
      }
      setIsDialogOpen(false);
      fetchProducts();
    } catch (error) {
      console.error(error);
      alert("Ürün kaydedilirken hata oluştu. Barkod benzersiz olmalı.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let importedProducts: any[] = [];

      if (file.name.endsWith(".csv")) {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: async (results) => {
            importedProducts = results.data.map((row: any) => ({
              name: row.Adı || row.Name || row.name,
              barcode: row.Barkod || row.Barcode || row.barcode,
              unit: row.Birim || row.Unit || row.unit || "Adet",
              category: row.Cins || row.Category || row.category || "",
              min_stock_level: Number(row.MinStok || row.MinStockLevel || row.min_stock_level || 0)
            })).filter((p: any) => p.name && p.barcode);
            
            await submitBulk(importedProducts);
          }
        });
      } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          if (!event.target?.result) return;
          const data = new Uint8Array(event.target.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          if (rows.length < 2) return;
          const headers = rows[0].map(h => String(h).toLowerCase());
          
          const getIdx = (keys: string[]) => headers.findIndex(h => keys.some(k => h.includes(k)));
          const nameIdx = getIdx(["adı", "name"]);
          const barcodeIdx = getIdx(["barkod", "barcode"]);
          const unitIdx = getIdx(["birim", "unit"]);
          const categoryIdx = getIdx(["cins", "category"]);
          const minStockIdx = getIdx(["min", "stok", "stock"]);

          if (nameIdx === -1 || barcodeIdx === -1) {
            alert("Excel dosyasında en azından 'Adı' ve 'Barkod' sütunları olmalıdır.");
            return;
          }

          importedProducts = rows.slice(1).map((row: any[]) => ({
            name: String(row[nameIdx] || ""),
            barcode: String(row[barcodeIdx] || ""),
            unit: unitIdx !== -1 ? String(row[unitIdx] || "Adet") : "Adet",
            category: categoryIdx !== -1 ? String(row[categoryIdx] || "") : "",
            min_stock_level: minStockIdx !== -1 ? Number(row[minStockIdx] || 0) : 0
          })).filter((p: any) => p.name && p.barcode && p.name !== "undefined");

          await submitBulk(importedProducts);
        };
        reader.readAsArrayBuffer(file);
      } else {
        alert("Lütfen sadece CSV veya Excel dosyası yükleyin.");
      }
    } catch (error) {
      console.error(error);
      alert("Dosya okunurken bir hata oluştu.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const submitBulk = async (productsArray: any[]) => {
    if (productsArray.length === 0) {
      alert("İçe aktarılacak geçerli veri bulunamadı.");
      return;
    }
    try {
      await axios.post(`${API_URL}/products/bulk`, productsArray);
      alert(`${productsArray.length} ürün başarıyla eklendi!`);
      fetchProducts();
    } catch (error) {
      console.error(error);
      alert("Toplu ürün eklenirken hata oluştu. (Barkodlar benzersiz olmalıdır)");
    }
  };

   const filteredProducts = products.filter((p: Product) => 
    p.name?.toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR')) || 
    p.barcode?.includes(search) ||
    p.category?.toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR'))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Ürün Listesi</h1>
        
        <div className="flex gap-3">
          <input 
            type="file" 
            accept=".csv, .xlsx, .xls" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <Button variant="outline" onClick={downloadExampleExcel} className="border-blue-500 text-blue-600 hover:bg-blue-50">
            <Download className="w-4 h-4 mr-2" />
            Örnek Excel İndir
          </Button>

          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            İçe Aktar (CSV/Excel)
          </Button>

          <Button onClick={openCreateDialog}>Yeni Ürün Ekle</Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{formData.id ? "Ürünü Düzenle" : "Yeni Ürün Ekle"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Ürün Adı</Label>
                  <Input id="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="barcode">Barkod</Label>
                  <Input id="barcode" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="unit">Birim</Label>
                    <select 
                      id="unit"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.unit} 
                      onChange={e => setFormData({...formData, unit: e.target.value})}
                    >
                      <option value="Adet">Adet</option>
                      <option value="Metre">Metre</option>
                      <option value="KG">KG</option>
                      <option value="Litre">Litre</option>
                      <option value="Paket">Paket</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Cins / Kategori</Label>
                    <Input id="category" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min_stock_level">Kritik Stok Seviyesi</Label>
                  <Input id="min_stock_level" type="number" value={formData.min_stock_level} onChange={e => setFormData({...formData, min_stock_level: Number(e.target.value)})} />
                </div>
                <Button type="submit" className="w-full">Kaydet</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Mevcut Ürünler</CardTitle>
            <Input 
              placeholder="Ürün veya Barkod Ara..." 
              className="max-w-sm" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Barkod</TableHead>
                <TableHead>Ürün Adı</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Birim</TableHead>
                <TableHead>Kritik Stok</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product: Product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-mono">{product.barcode}</TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{product.category || "-"}</Badge>
                  </TableCell>
                  <TableCell>{product.unit}</TableCell>
                  <TableCell>{product.min_stock_level}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(product)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)} className="text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Ürün bulunamadı.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
