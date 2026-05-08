"use client";

import { useEffect, useState, Fragment } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Play, CheckCircle2, XCircle, AlertCircle, Clock, Hammer, ChevronDown, ChevronUp, Trash2, History, ShoppingCart, ArrowRight, Filter, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const API_URL = typeof window !== "undefined" ? `http://${window.location.hostname}:8080/api` : "http://localhost:8080/api";

export default function IsEmirleri() {
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<number[]>([]);
  const [requirements, setRequirements] = useState<Record<number, any[]>>({});
  const [filters, setFilters] = useState<string[]>(["Planlandı", "Üretimde"]);

  const fetchWorkOrders = async () => {
    try {
      const res = await axios.get(`${API_URL}/work-orders`);
      const sortedData = (res.data || []).sort((a: any, b: any) => b.id - a.id);
      setWorkOrders(sortedData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  const toggleRow = async (id: number) => {
    if (expandedRows.includes(id)) {
      setExpandedRows(prev => prev.filter(r => r !== id));
    } else {
      setExpandedRows(prev => [...prev, id]);
      try {
        const res = await axios.get(`${API_URL}/work-orders/${id}/requirements`);
        setRequirements(prev => ({ ...prev, [id]: res.data }));
      } catch (err) {
        console.error("Gereksinimler yüklenemedi", err);
      }
    }
  };

  const handleStatusUpdate = async (id: number, newStatus: string) => {
    const confirmMsg = newStatus === "Tamamlandı" 
      ? "Üretimi tamamlıyorsunuz. Hammaddeler KAYNAK DEPO'dan düşülecek ve mamul HEDEF DEPO'ya girecektir. Onaylıyor musunuz?" 
      : `İş emri durumunu "${newStatus}" olarak güncellemek istediğinize emin misiniz?`;
    
    if (!confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      await axios.put(`${API_URL}/work-orders/${id}/status`, { status: newStatus });
      await fetchWorkOrders();
      // If the row is expanded, refresh its requirements
      if (expandedRows.includes(id)) {
        const res = await axios.get(`${API_URL}/work-orders/${id}/requirements`);
        setRequirements(prev => ({ ...prev, [id]: res.data }));
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Güncelleme sırasında bir hata oluştu.");
      fetchWorkOrders(); // Revert to actual state on error
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bu iş emrini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) return;
    try {
      await axios.delete(`${API_URL}/work-orders/${id}`);
      fetchWorkOrders();
    } catch (err: any) {
      alert(err.response?.data?.error || "Silme hatası.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Planlandı": return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200"><Clock className="w-3 h-3 mr-1" /> Planlandı</Badge>;
      case "Üretimde": return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200 animate-pulse"><Hammer className="w-3 h-3 mr-1" /> Üretimde</Badge>;
      case "Tamamlandı": return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Tamamlandı</Badge>;
      case "İptal": return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200"><XCircle className="w-3 h-3 mr-1" /> İptal</Badge>;
      case "Güncelleniyor...": return <Badge className="bg-slate-100 text-slate-500 animate-pulse">Lütfen Bekleyin...</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const formatWithTime = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return format(new Date(dateStr), 'dd MMM yyyy HH:mm', { locale: tr });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Üretim Planlama & İş Emirleri</h1>
          <p className="text-slate-500 mt-1">İş emirlerinin tüm yaşam döngüsünü ve hammadde ihtiyacını buradan izleyebilirsiniz.</p>
        </div>
        <Link href="/is-emri-olustur">
          <Button className="bg-purple-600 hover:bg-purple-700 font-bold h-12 px-6">
            <Plus className="w-5 h-5 mr-2" /> YENİ İŞ EMRİ
          </Button>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 text-slate-500 font-bold text-sm mr-4 shrink-0">
          <Filter className="w-4 h-4" /> DURUM FİLTRESİ:
        </div>
        <div className="flex flex-wrap gap-6">
          {[
            { id: "Planlandı", label: "Planlananlar", color: "text-blue-600" },
            { id: "Üretimde", label: "Üretimde Olanlar", color: "text-purple-600" },
            { id: "Tamamlandı", label: "Tamamlananlar", color: "text-green-600" },
            { id: "İptal", label: "İptal Edilenler", color: "text-red-600" },
          ].map((status) => (
            <div key={status.id} className="flex items-center space-x-2">
              <Checkbox 
                id={`filter-${status.id}`} 
                checked={filters.includes(status.id)}
                onCheckedChange={(checked) => {
                  if (checked) setFilters([...filters, status.id]);
                  else setFilters(filters.filter(f => f !== status.id));
                }}
                className="data-[state=checked]:bg-slate-900"
              />
              <Label 
                htmlFor={`filter-${status.id}`} 
                className={`text-sm font-bold cursor-pointer hover:opacity-70 transition-opacity ${status.color}`}
              >
                {status.label}
              </Label>
            </div>
          ))}
        </div>
        <div className="ml-auto text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {workOrders.filter(wo => filters.includes(wo.status)).length} KAYIT LİSTELENİYOR
        </div>
      </div>

      <Card className="border-t-4 border-t-purple-600 shadow-lg">
        <CardHeader className="bg-gray-50/50 border-b">
          <CardTitle className="text-lg">Tüm İş Akışı</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead className="w-[100px]">İş No</TableHead>
                <TableHead>Üretilecek Ürün</TableHead>
                <TableHead>Miktar</TableHead>
                <TableHead>Depo Akışı</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">Aksiyonlar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workOrders.filter(wo => filters.includes(wo.status)).map((wo) => (
                <Fragment key={wo.id}>
                  <TableRow className={`hover:bg-slate-50 transition-colors ${expandedRows.includes(wo.id) ? 'bg-slate-50' : ''}`}>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => toggleRow(wo.id)}>
                        {expandedRows.includes(wo.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-slate-500">#{wo.id}</TableCell>
                    <TableCell>
                      <div className="font-bold">{wo.product?.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{wo.product?.barcode}</div>
                    </TableCell>
                    <TableCell className="font-bold text-lg">{wo.quantity} {wo.product?.unit}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs font-medium">
                        <span className="text-blue-600">{wo.source_warehouse?.name}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="text-green-600">{wo.target_warehouse?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(wo.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {wo.status === "Planlandı" && (
                          <Button 
                            size="sm" 
                            onClick={() => handleStatusUpdate(wo.id, "Üretimde")}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            <Play className="w-3 h-3 mr-1" /> BAŞLAT
                          </Button>
                        )}
                        {wo.status === "Üretimde" && (
                          <Button 
                            size="sm" 
                            onClick={() => handleStatusUpdate(wo.id, "Tamamlandı")}
                            className="bg-green-600 hover:bg-green-700 font-bold"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" /> TAMAMLA
                          </Button>
                        )}
                        {wo.status === "İptal" && (
                          <Button 
                            size="sm" variant="ghost" 
                            onClick={() => handleDelete(wo.id)}
                            className="text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" /> SİL
                          </Button>
                        )}
                        {(wo.status === "Planlandı" || wo.status === "Üretimde") && (
                          <Button 
                            size="sm" variant="ghost" 
                            onClick={() => handleStatusUpdate(wo.id, "İptal")}
                            className="text-red-400 hover:bg-red-50"
                          >
                            İPTAL
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  
                  {expandedRows.includes(wo.id) && (
                    <TableRow key={`${wo.id}-detail`} className="bg-slate-50/80">
                      <TableCell colSpan={7} className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                          {/* Timeline View */}
                          <div className="lg:col-span-2 space-y-4">
                            <h4 className="text-sm font-bold flex items-center gap-2 text-slate-700 uppercase tracking-wider border-b pb-2">
                              <History className="w-4 h-4" /> Üretim Akış Detayı
                            </h4>
                            <div className="flex items-start gap-8 mt-4 relative">
                              <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-slate-200"></div>
                              <div className="space-y-8 w-full">
                                <div className="flex gap-4 relative z-10">
                                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white ring-4 ring-white shrink-0">
                                    <Clock className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="font-bold text-sm">İş Emri Planlandı</p>
                                    <p className="text-xs text-slate-500">{formatWithTime(wo.created_at)}</p>
                                  </div>
                                </div>
                                <div className={`flex gap-4 relative z-10 ${!wo.started_at ? 'opacity-30' : ''}`}>
                                  <div className={`w-8 h-8 rounded-full ${wo.started_at ? 'bg-purple-500' : 'bg-slate-300'} flex items-center justify-center text-white ring-4 ring-white shrink-0`}>
                                    <Hammer className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="font-bold text-sm">Üretime Başlandı</p>
                                    <p className="text-xs text-slate-500">{formatWithTime(wo.started_at)}</p>
                                  </div>
                                </div>
                                <div className={`flex gap-4 relative z-10 ${!wo.end_date ? 'opacity-30' : ''}`}>
                                  <div className={`w-8 h-8 rounded-full ${wo.end_date ? 'bg-green-500' : 'bg-slate-300'} flex items-center justify-center text-white ring-4 ring-white shrink-0`}>
                                    <CheckCircle2 className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="font-bold text-sm">Üretim Tamamlandı</p>
                                    <p className="text-xs text-slate-500">{formatWithTime(wo.end_date)}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Requirements Table */}
                          <div className="lg:col-span-3 space-y-4">
                            <h4 className="text-sm font-bold flex items-center gap-2 text-slate-700 uppercase tracking-wider border-b pb-2">
                              <AlertCircle className="w-4 h-4 text-orange-500" /> Hammadde İhtiyaç Analizi (Kaynak: {wo.source_warehouse?.name})
                            </h4>
                            <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
                              <Table>
                                <TableHeader className="bg-slate-50">
                                  <TableRow>
                                    <TableHead className="text-xs">Parça Adı</TableHead>
                                    <TableHead className="text-xs text-right">Gereken</TableHead>
                                    <TableHead className="text-xs text-right">Mevcut</TableHead>
                                    <TableHead className="text-xs text-center">Durum</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {requirements[wo.id]?.map((req, idx) => (
                                    <TableRow key={idx} className={req.status === 'SHORT' ? 'bg-red-50' : ''}>
                                      <TableCell className="text-xs font-medium">{req.product_name}</TableCell>
                                      <TableCell className="text-xs text-right font-bold">{req.required}</TableCell>
                                      <TableCell className={`text-xs text-right font-bold ${req.status === 'SHORT' ? 'text-red-600' : 'text-green-600'}`}>
                                        {req.in_stock}
                                      </TableCell>
                                      <TableCell className="text-center">
                                        {req.status === 'OK' ? (
                                          <Badge className="bg-green-100 text-green-700 text-[9px] px-1">HAZIR</Badge>
                                        ) : (
                                          <Badge className="bg-red-100 text-red-700 text-[9px] px-1">EKSİK</Badge>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                  {!requirements[wo.id] && (
                                    <TableRow>
                                      <TableCell colSpan={4} className="text-center py-4 text-xs text-slate-400 italic">Analiz yükleniyor...</TableCell>
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                            </div>
                            {requirements[wo.id]?.some(r => r.status === 'SHORT') && (
                              <div className="bg-red-50 border border-red-100 p-3 rounded flex items-center gap-3">
                                <AlertCircle className="text-red-500 w-5 h-5 shrink-0" />
                                <div className="text-[11px] text-red-800 leading-tight">
                                  <b>DİKKAT:</b> <b>{wo.source_warehouse?.name}</b> deposunda bazı hammaddeler yetersiz.
                                </div>
                                <Link 
                                  href={{
                                    pathname: '/satinalma',
                                    query: { 
                                      items: JSON.stringify(
                                        requirements[wo.id]
                                          ?.filter(r => r.status === 'SHORT')
                                          .map(r => ({
                                            id: r.product_id,
                                            quantity: r.required - r.in_stock,
                                            warehouse_id: wo.source_warehouse_id
                                          }))
                                      )
                                    }
                                  }} 
                                  className="ml-auto"
                                >
                                  <Button size="sm" className="bg-red-600 text-[10px] h-7 px-2">
                                    <ShoppingCart className="w-3 h-3 mr-1" /> SATINALMAYA GİT
                                  </Button>
                                </Link>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
              {workOrders.filter(wo => filters.includes(wo.status)).length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-20 text-slate-400">
                    Seçili kriterlere uygun iş emri bulunamadı.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      </Card>

      {/* İşlem Yapılıyor Overlay */}
      {actionLoading && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 max-w-sm w-full mx-4 animate-in fade-in zoom-in duration-300">
            <div className="relative">
              <Loader2 className="w-16 h-16 text-purple-600 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Hammer className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-slate-900">İşlem Yapılıyor</h3>
              <p className="text-slate-500 mt-1 font-medium">Lütfen bekleyin, veriler işleniyor...</p>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
              <div className="bg-purple-600 h-full w-1/2 animate-infinite-scroll" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
