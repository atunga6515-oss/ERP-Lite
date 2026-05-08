"use client";

import { useEffect, useState, Fragment } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, History, ShoppingCart, ArrowRightLeft, FileText, Send, Eye } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import Link from "next/link";

const API_URL = typeof window !== "undefined" ? `http://${window.location.hostname}:8080/api` : "http://localhost:8080/api";

export default function Teklifler() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<number[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");

  const fetchData = async () => {
    try {
      const [qRes, wRes] = await Promise.all([
        axios.get(`${API_URL}/quotes`),
        axios.get(`${API_URL}/warehouses`)
      ]);
      setQuotes(qRes.data || []);
      setWarehouses(wRes.data || []);
      if (wRes.data?.length > 0) setSelectedWarehouse(String(wRes.data[0].id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleRow = (id: number) => {
    setExpandedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      await axios.put(`${API_URL}/quotes/${id}/status`, { status });
      fetchData();
    } catch (err) {
      alert("Durum güncellenemedi.");
    }
  };

  const handleConvertToSale = async (id: number) => {
    if (!selectedWarehouse) {
      alert("Lütfen ürünlerin çıkış yapılacağı depoyu seçiniz.");
      return;
    }
    if (!confirm("Bu teklifi satışa dönüştürmek istediğinize emin misiniz? Stoklar düşülecektir.")) return;

    try {
      await axios.post(`${API_URL}/quotes/${id}/convert`, { warehouse_id: Number(selectedWarehouse) });
      alert("Teklif başarıyla Satışa dönüştürüldü ve stoklar güncellendi.");
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || "Dönüştürme hatası.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Beklemede": return <Badge className="bg-slate-100 text-slate-700">Beklemede</Badge>;
      case "Gönderildi": return <Badge className="bg-blue-100 text-blue-700">Teklif Verildi</Badge>;
      case "Onaylandı": return <Badge className="bg-green-100 text-green-700">Onaylandı</Badge>;
      case "Reddedildi": return <Badge className="bg-red-100 text-red-700">Reddedildi</Badge>;
      case "Satışa Döndü": return <Badge className="bg-purple-100 text-purple-700 border-purple-200">Satışa Dönüştü</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teklif Yönetimi</h1>
          <p className="text-slate-500 mt-1">Müşterilere verilen tüm fiyat tekliflerini buradan takip edin.</p>
        </div>
        <Link href="/teklif-olustur">
          <Button className="bg-orange-600 hover:bg-orange-700 font-bold h-12 px-6">
            <Plus className="w-5 h-5 mr-2" /> YENİ TEKLİF HAZIRLA
          </Button>
        </Link>
      </div>

      <Card className="border-t-4 border-t-orange-500 shadow-lg">
        <CardHeader className="bg-gray-50/50 border-b">
          <CardTitle className="text-lg">Teklif Havuzu</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead>Müşteri</TableHead>
                <TableHead className="text-right">Toplam Tutar</TableHead>
                <TableHead className="text-center">Durum</TableHead>
                <TableHead className="text-right">Aksiyonlar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((q) => (
                <Fragment key={q.id}>
                  <TableRow key={q.id} className="hover:bg-slate-50">
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => toggleRow(q.id)}>
                        {expandedRows.includes(q.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {format(new Date(q.quote_date), 'dd MMM yyyy', { locale: tr })}
                    </TableCell>
                    <TableCell className="font-bold">{q.customer?.name}</TableCell>
                    <TableCell className="text-right font-black text-lg">
                      {q.total_price.toLocaleString('tr-TR')} ₺
                    </TableCell>
                    <TableCell className="text-center">{getStatusBadge(q.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {q.status === "Beklemede" && (
                          <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(q.id, "Gönderildi")}>
                            <Send className="w-3 h-3 mr-1" /> GÖNDERİLDİ
                          </Button>
                        )}
                        {q.status === "Gönderildi" && (
                          <div className="flex gap-1">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleStatusUpdate(q.id, "Onaylandı")}>
                              ONAYLA
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(q.id, "Reddedildi")}>
                              REDDET
                            </Button>
                          </div>
                        )}
                        {q.status === "Onaylandı" && (
                          <div className="flex items-center gap-2">
                             <select 
                              className="h-8 rounded border text-[10px] bg-white px-2"
                              value={selectedWarehouse}
                              onChange={e => setSelectedWarehouse(e.target.value)}
                            >
                              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                            <Button size="sm" className="bg-purple-600 hover:bg-purple-700 font-bold" onClick={() => handleConvertToSale(q.id)}>
                              <ShoppingCart className="w-3 h-3 mr-1" /> SATIŞA DÖNÜŞTÜR
                            </Button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  
                  {expandedRows.includes(q.id) && (
                    <TableRow key={`${q.id}-detail`} className="bg-slate-50/50">
                      <TableCell colSpan={6} className="p-6">
                        <div className="bg-white rounded-lg border shadow-sm p-4">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Teklif İçeriği
                          </h4>
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-slate-50 hover:bg-slate-50">
                                <TableHead className="text-[10px]">Ürün</TableHead>
                                <TableHead className="text-[10px] text-right">Miktar</TableHead>
                                <TableHead className="text-[10px] text-right">Birim Fiyat</TableHead>
                                <TableHead className="text-[10px] text-right">Toplam</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {q.items?.map((item: any) => (
                                <TableRow key={item.id}>
                                  <TableCell className="text-sm font-semibold">{item.product?.name}</TableCell>
                                  <TableCell className="text-sm text-right font-mono">{item.quantity} {item.product?.unit}</TableCell>
                                  <TableCell className="text-sm text-right font-mono">{item.unit_price.toLocaleString('tr-TR')} ₺</TableCell>
                                  <TableCell className="text-sm text-right font-bold">{item.total_price.toLocaleString('tr-TR')} ₺</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          <div className="mt-4 p-3 bg-slate-50 rounded text-xs text-slate-600 italic">
                            <b>Not:</b> {q.note || "Not eklenmemiş."}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
              {quotes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20 text-slate-400">
                    Henüz bir teklif kaydı bulunmuyor.
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
