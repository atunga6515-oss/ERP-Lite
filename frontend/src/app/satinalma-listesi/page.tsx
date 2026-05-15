"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Truck, ChevronDown, ChevronUp, FileText, Send, Filter, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Purchase, PurchaseItem, Supplier } from "@/types";

const API_URL = typeof window !== "undefined" ? `http://${window.location.hostname}:8080/api` : "http://localhost:8080/api";

export default function SatinalmaListesi() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<number[]>([]);
  
  // Filter States
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  
  // Order Dialog State
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<number | null>(null);
  const [itemSuppliers, setItemSuppliers] = useState<Record<number, string>>({});
  
  // New Supplier Dialog State
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");

  const fetchData = async () => {
    try {
      const [pRes, sRes] = await Promise.all([
        axios.get(`${API_URL}/purchases`),
        axios.get(`${API_URL}/suppliers`)
      ]);
      setPurchases(pRes.data || []);
      setSuppliers(sRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleRow = (id: number) => {
    setExpandedRows(prev => prev.includes(id) ? prev.filter((r: number) => r !== id) : [...prev, id]);
  };


  const handlePlaceOrder = async () => {
    const selectedPurchase = purchases.find((p: Purchase) => p.id === selectedPurchaseId);
    const allItemsHaveSupplier = selectedPurchase?.items?.every((item: PurchaseItem) => itemSuppliers[item.id]);

    if (!selectedPurchaseId || !allItemsHaveSupplier) {
      alert("Lütfen siparişteki TÜM ürünler için bir tedarikçi seçin.");
      return;
    }
    
    // Convert string keys/values to numbers for the API
    const formattedSuppliers: Record<number, number> = {};
    for (const [itemId, supplierId] of Object.entries(itemSuppliers)) {
      if (supplierId) {
        formattedSuppliers[Number(itemId)] = Number(supplierId);
      }
    }

    setActionLoading(true);
    try {
      await axios.post(`${API_URL}/purchases/${selectedPurchaseId}/place-order`, {
        item_suppliers: formattedSuppliers
      });
      setIsOrderDialogOpen(false);
      setItemSuppliers({});
      setSelectedPurchaseId(null);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || "Sipariş verilemedi.");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Hazırlanıyor": return <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-slate-200">Hazırlanıyor</Badge>;
      case "Sipariş Verildi": return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200"><Send className="w-3 h-3 mr-1" /> Sipariş Verildi</Badge>;
      case "Tamamlandı": return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Tamamlandı</Badge>;
      case "İptal": return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">İptal Edildi</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const filteredPurchases = purchases.filter((p: Purchase) => {
    const statusMatch = statusFilter === "all" || p.status === statusFilter;
    const supplierMatch = supplierFilter === "all" || String(p.supplier_id) === supplierFilter;
    return statusMatch && supplierMatch;
  });

  const handleAddSupplier = async () => {
    if (!newSupplierName.trim()) return;
    try {
      await axios.post(`${API_URL}/suppliers`, { name: newSupplierName });
      setNewSupplierName("");
      setIsSupplierDialogOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

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
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Sipariş Onaylanıyor</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Tedarikçi bildirimleri gönderiliyor ve sipariş dosyası oluşturuluyor. <br />Lütfen bekleyiniz...
              </p>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full animate-pulse" style={{width: '70%'}}></div>
            </div>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Satınalma Sipariş Listesi</h1>
          <p className="text-slate-500 mt-1">Sipariş yaşam döngüsünü buradan yönetin.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isSupplierDialogOpen} onOpenChange={setIsSupplierDialogOpen}>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Yeni Tedarikçi Tanımla</DialogTitle>
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
          <Button variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50 font-bold h-12" onClick={() => setIsSupplierDialogOpen(true)}>
            <Truck className="w-4 h-4 mr-2" /> Yeni Tedarikçi
          </Button>
          <Link href="/satinalma">
            <Button className="bg-blue-600 hover:bg-blue-700 font-bold h-12 px-6">
              <Plus className="w-5 h-5 mr-2" /> YENİ SİPARİŞ OLUŞTUR
            </Button>
          </Link>
        </div>
      </div>

      {/* Compact Filter Bar */}
      <div className="flex items-center gap-4 p-4 bg-white rounded-xl border shadow-sm">
        <div className="flex items-center gap-2 text-slate-500">
          <Filter className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Hızlı Filtre:</span>
        </div>
        <div className="flex gap-2">
          <select 
            className="h-9 rounded-md border bg-slate-50 px-3 text-xs font-semibold focus:ring-2 focus:ring-blue-600"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">Tüm Durumlar</option>
            <option value="Hazırlanıyor">Hazırlanıyor</option>
            <option value="Sipariş Verildi">Sipariş Verildi</option>
            <option value="Tamamlandı">Tamamlandı</option>
            <option value="İptal">İptal Edildi</option>
          </select>
          <select 
            className="h-9 rounded-md border bg-slate-50 px-3 text-xs font-semibold focus:ring-2 focus:ring-blue-600"
            value={supplierFilter}
            onChange={e => setSupplierFilter(e.target.value)}
          >
            <option value="all">Tüm Tedarikçiler</option>
            {suppliers.map((s: Supplier) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="ml-auto text-[10px] text-slate-400 font-bold uppercase">
          Toplam {filteredPurchases.length} Kayıt Listeleniyor
        </div>
      </div>

      <Card className="border-t-4 border-t-blue-600 shadow-lg">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead className="w-[120px]">Sipariş No</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead>Tedarikçi</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
                <TableHead className="text-right">Aksiyonlar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPurchases.map((p: Purchase) => (
                <React.Fragment key={p.id}>
                  <TableRow className={`hover:bg-slate-50 transition-colors ${expandedRows.includes(p.id) ? 'bg-slate-50' : ''}`}>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => toggleRow(p.id)}>
                        {expandedRows.includes(p.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-slate-500">PO-{p.id.toString().padStart(5, '0')}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(p.purchase_date), 'dd MMM yyyy HH:mm', { locale: tr })}
                    </TableCell>
                    <TableCell className="font-bold text-blue-700">
                      {(() => {
                        if (!p.items || p.items.length === 0) return <span className="text-slate-400 italic font-normal">Belirsiz</span>;
                        const uniqueSuppliers = new Set(p.items.map((i: PurchaseItem) => i.supplier?.name).filter(Boolean));
                        if (uniqueSuppliers.size === 0) return <span className="text-slate-400 italic font-normal">Tedarikçi Seçilmedi</span>;
                        if (uniqueSuppliers.size === 1) return Array.from(uniqueSuppliers)[0] as string;
                        return <span className="text-orange-600">Çoklu Tedarikçi ({uniqueSuppliers.size})</span>;
                      })()}
                    </TableCell>
                    <TableCell>{getStatusBadge(p.status)}</TableCell>
                    <TableCell className="text-right font-black">
                      {p.total_price.toLocaleString('tr-TR')} ₺
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {p.status === "Hazırlanıyor" && (
                          <Button 
                            size="sm" 
                            onClick={() => {
                              setSelectedPurchaseId(p.id);
                              setIsOrderDialogOpen(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 font-bold h-8 px-2 text-[10px]"
                          >
                            <Send className="w-3 h-3 mr-1" /> SİPARİŞİ VER
                          </Button>
                        )}
                        {p.status === "Sipariş Verildi" && (
                          <Link href="/mal-kabul">
                            <Button size="sm" variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 hover:bg-orange-100 font-bold h-8 px-2 text-[10px]">
                              <Truck className="w-3 h-3 mr-1" /> MAL KABUL BEKLEYOR
                            </Button>
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  
                  {expandedRows.includes(p.id) && (
                    <TableRow key={`${p.id}-detail`} className="bg-slate-50/80">
                      <TableCell colSpan={7} className="p-6">
                        <div className="bg-white rounded-lg border shadow-md p-6 space-y-6">
                          <div className="flex justify-between items-start border-b pb-4">
                            <h4 className="text-sm font-bold flex items-center gap-2 text-slate-700 uppercase tracking-wider">
                              <FileText className="w-4 h-4 text-blue-500" /> Sipariş İçeriği
                            </h4>
                          </div>

                          <Table>
                            <TableHeader className="bg-slate-50">
                              <TableRow>
                                <TableHead className="text-xs">Ürün / Parça</TableHead>
                                <TableHead className="text-xs">Depo</TableHead>
                                <TableHead className="text-xs text-right">Miktar</TableHead>
                                <TableHead className="text-xs text-right">Birim Fiyat</TableHead>
                                <TableHead className="text-xs text-right">Toplam</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {p.items?.map((item: PurchaseItem) => (
                                <TableRow key={item.id}>
                                  <TableCell className="text-sm font-semibold">
                                    {item.product?.name}
                                    <div className="text-[10px] text-slate-400 font-mono">{item.product?.barcode}</div>
                                  </TableCell>
                                  <TableCell className="text-xs font-medium text-slate-600">
                                    {item.warehouse?.name}
                                  </TableCell>
                                  <TableCell className="text-sm text-right font-bold">{item.quantity} {item.product?.unit}</TableCell>
                                  <TableCell className="text-sm text-right">{item.unit_price.toLocaleString('tr-TR')} ₺</TableCell>
                                  <TableCell className="text-sm text-right font-black">{item.total_price.toLocaleString('tr-TR')} ₺</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Tedarikçi Bilgisi</p>
                              <p className="text-sm font-semibold">{p.supplier?.name || "Henüz Seçilmedi"}</p>
                              <p className="text-xs text-slate-500">{p.supplier?.phone}</p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Sipariş Notu</p>
                              <p className="text-sm italic text-slate-600">{p.note || "Açıklama belirtilmemiş."}</p>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
              {filteredPurchases.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-20 text-slate-400">
                    Filtreye uygun sipariş bulunamadı.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Place Order Dialog */}
      <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-600" />
              Tedarikçi Seçimi
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
              <Label className="text-xs font-bold uppercase text-slate-500">Bu siparişteki ürünler için tedarikçileri atayın:</Label>
              <div className="space-y-3 mt-2">
                {purchases.find((p: Purchase) => p.id === selectedPurchaseId)?.items?.map((item: PurchaseItem) => (
                  <div key={item.id} className="flex flex-col gap-1 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-sm font-semibold text-slate-700">{item.product?.name}</span>
                    <div className="flex gap-2 text-xs text-slate-500">
                      <span>Miktar: {item.quantity} {item.product?.unit}</span>
                      <span>|</span>
                      <span>Birim Fiyat: {item.unit_price.toLocaleString('tr-TR')} ₺</span>
                    </div>
                    <select 
                      className="mt-2 flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm focus:ring-2 focus:ring-blue-600 font-medium"
                      value={itemSuppliers[item.id] || ""}
                      onChange={e => setItemSuppliers({ ...itemSuppliers, [item.id]: e.target.value })}
                    >
                      <option value="">Tedarikçi Seçiniz...</option>
                      {suppliers.map((s: Supplier) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            <p className="text-xs text-slate-500 bg-blue-50 p-3 rounded-lg border border-blue-100 italic">
              * Tedarikçi seçildiğinde sipariş durumu otomatik olarak "Sipariş Verildi" konumuna geçecektir.
            </p>
            <button 
              type="button"
              onClick={() => { setIsOrderDialogOpen(false); setIsSupplierDialogOpen(true); }}
              className="text-xs text-orange-600 font-bold hover:underline cursor-pointer"
            >
              + Listede yok mu? Yeni tedarikçi tanımla
            </button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOrderDialogOpen(false)}>İptal</Button>
            <Button onClick={handlePlaceOrder} className="bg-blue-600 hover:bg-blue-700 font-bold">SİPARİŞİ ONAYLA</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
