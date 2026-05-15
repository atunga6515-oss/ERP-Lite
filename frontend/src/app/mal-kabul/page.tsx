"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle, Truck, PackageCheck, History as HistoryIcon } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Purchase, PurchaseItem } from "@/types";

const API_URL = typeof window !== "undefined" ? `http://${window.location.hostname}:8080/api` : "http://localhost:8080/api";

export default function MalKabul() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [receiptQtys, setReceiptQtys] = useState<Record<number, string>>({});
  const [message, setMessage] = useState<{type: "success" | "error", text: string} | null>(null);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{open: boolean, type: "receive" | "cancel", purchase: Purchase | null}>({
    open: false, type: "receive", purchase: null
  });

  const fetchPurchases = async () => {
    try {
      const res = await axios.get(`${API_URL}/purchases`);
      setPurchases(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  const openReceiveConfirm = (purchase: Purchase) => {
    const itemsToReceive = (purchase.items || [])
      .map((item: PurchaseItem) => ({
        item_id: item.id,
        received: parseFloat(receiptQtys[item.id] || "0")
      }))
      .filter((r) => r.received > 0);

    if (itemsToReceive.length === 0) {
      setMessage({ type: "error", text: "Lütfen en az bir ürün için kabul miktarı giriniz." });
      setTimeout(() => setMessage(null), 4000);
      return;
    }

    setConfirmDialog({ open: true, type: "receive", purchase });
  };

  const handleReceiveConfirmed = async () => {
    const purchase = confirmDialog.purchase;
    if (!purchase) return;

    const itemsToReceive = (purchase.items || [])
      .map((item: PurchaseItem) => ({
        item_id: item.id,
        received: parseFloat(receiptQtys[item.id] || "0")
      }))
      .filter((r) => r.received > 0);

    setConfirmDialog({ open: false, type: "receive", purchase: null });

    setActionLoading(true);
    try {
      await axios.post(`${API_URL}/purchases/${purchase.id}/receive`, {
        items: itemsToReceive
      });
      
      const newQtys = { ...receiptQtys };
      (purchase.items || []).forEach((item: PurchaseItem) => delete newQtys[item.id]);
      setReceiptQtys(newQtys);
      
      setMessage({ type: "success", text: `#${purchase.id} nolu siparişin mal kabulü başarıyla yapıldı.` });
      fetchPurchases();
    } catch (err: any) {
      setMessage({ type: "error", text: err.response?.data?.error || "Bir hata oluştu." });
    } finally {
      setActionLoading(false);
    }
    setTimeout(() => setMessage(null), 5000);
  };

  const openCancelConfirm = (purchase: Purchase) => {
    setConfirmDialog({ open: true, type: "cancel", purchase });
  };

  const handleCancelConfirmed = async () => {
    const purchase = confirmDialog.purchase;
    if (!purchase) return;
    setConfirmDialog({ open: false, type: "cancel", purchase: null });

    try {
      await axios.post(`${API_URL}/purchases/${purchase.id}/cancel`);
      setMessage({ type: "success", text: `#${purchase.id} nolu sipariş iptal edildi.` });
      fetchPurchases();
    } catch (err: any) {
      setMessage({ type: "error", text: err.response?.data?.error || "Bir hata oluştu." });
    }
    setTimeout(() => setMessage(null), 5000);
  };

  const pendingOrders = purchases.filter((p: Purchase) => p.status === "Sipariş Verildi");
  const completedOrders = purchases.filter((p: Purchase) => p.status === "Tamamlandı" || p.status === "İptal");

  if (loading) return <div className="p-10 text-center text-muted-foreground">Yükleniyor...</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {actionLoading && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center animate-in fade-in duration-300">
          <div className="bg-white p-10 rounded-3xl shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full mx-4 border border-slate-100">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-green-100 border-t-green-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-green-600 rounded-full animate-ping"></div>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-center">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Kabul İşleniyor</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Ürünler depolara aktarılıyor ve stok kartları güncelleniyor. <br />Lütfen bu pencereyi kapatmayınız...
              </p>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-green-600 h-full animate-pulse" style={{width: '85%'}}></div>
            </div>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mal Kabul Masası</h1>
          <p className="text-slate-500 mt-1">Gelen sevkiyatları kontrol edin ve depoya giriş yapın.</p>
        </div>
        <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
          <Truck className="text-blue-600 w-5 h-5" />
          <span className="font-bold text-blue-700">{pendingOrders.length} Bekleyen Sevkiyat</span>
        </div>
      </div>

      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"} className={message.type === "success" ? "border-green-500 text-green-700 bg-green-50 shadow-sm" : ""}>
          <CheckCircle2 className="w-4 h-4" />
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Card className="border-t-4 border-t-orange-500 shadow-lg">
        <CardHeader className="bg-gray-50/50 border-b">
          <CardTitle className="text-lg flex items-center gap-2 text-orange-700">
            <Clock className="w-5 h-5" /> Bekleyen Siparişler (Yoldaki Mallar)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[100px]">Sipariş No</TableHead>
                <TableHead>Tedarikçi</TableHead>
                <TableHead>İçerik</TableHead>
                <TableHead>Toplam Tutar</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead className="text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingOrders.map((p: Purchase) => (
                <TableRow key={p.id} className="hover:bg-orange-50/30">
                  <TableCell className="font-mono font-bold text-orange-600 text-lg">#{p.id}</TableCell>
                  <TableCell>
                    <div className="font-bold">
                      {(() => {
                        if (!p.items || p.items.length === 0) return <span className="text-slate-400 italic font-normal">Belirsiz</span>;
                        const uniqueSuppliers = new Set(p.items.map((i: PurchaseItem) => i.supplier?.name).filter(Boolean));
                        if (uniqueSuppliers.size === 0) return <span className="text-slate-400 italic font-normal">Tedarikçi Seçilmedi</span>;
                        if (uniqueSuppliers.size === 1) return Array.from(uniqueSuppliers)[0] as string;
                        return <span className="text-orange-600">Çoklu Tedarikçi ({uniqueSuppliers.size})</span>;
                      })()}
                    </div>
                    {p.note && <div className="text-xs text-slate-400 italic mt-1">{p.note}</div>}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-3 py-2">
                        {p.items?.map((item: PurchaseItem, i: number) => {
                          const remaining = item.quantity - (item.received_qty || 0);
                          return (
                            <div key={i} className="flex items-center gap-3 bg-white p-2 rounded border border-slate-100 shadow-sm">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-700">{item.product?.name}</span>
                                  <Badge variant="secondary" className="text-[9px] py-0">{item.warehouse?.name}</Badge>
                                  {item.supplier && (
                                    <Badge variant="outline" className="text-[9px] py-0 border-blue-200 text-blue-700 bg-blue-50">
                                      <Truck className="w-3 h-3 mr-1" /> {item.supplier.name}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex gap-3 mt-1">
                                  <span className="text-[10px] text-slate-500 font-medium">Sipariş: <b>{item.quantity}</b></span>
                                  <span className="text-[10px] text-green-600 font-medium">Gelen: <b>{item.received_qty || 0}</b></span>
                                  <span className="text-[10px] text-orange-600 font-bold">Kalan: <b>{remaining}</b></span>
                                </div>
                              </div>
                              
                              {remaining > 0 ? (
                                <div className="w-24">
                                  <Input
                                    type="number"
                                    placeholder="Miktar"
                                    className="h-8 text-right font-bold text-blue-600 border-blue-200 focus:ring-blue-500"
                                    value={receiptQtys[item.id] || ""}
                                    max={remaining}
                                    min={0}
                                    onChange={(e) => setReceiptQtys({ ...receiptQtys, [item.id]: e.target.value })}
                                  />
                                </div>
                              ) : (
                                <Badge className="bg-green-100 text-green-700 text-[9px]"><CheckCircle2 className="w-3 h-3 mr-1" /> Tamamlandı</Badge>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </TableCell>
                  <TableCell className="font-bold">{p.total_price?.toLocaleString('tr-TR')} ₺</TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {format(new Date(p.purchase_date), 'dd MMMM yyyy', { locale: tr })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => openReceiveConfirm(p)}
                        className="bg-green-600 hover:bg-green-700 font-bold h-10 px-4"
                      >
                        <PackageCheck className="w-4 h-4 mr-2" /> KABUL ET
                      </Button>
                      <Button 
                        size="sm" variant="ghost" 
                        onClick={() => openCancelConfirm(p)}
                        className="text-red-500 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {pendingOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20 text-slate-400">
                    <div className="flex flex-col items-center">
                      <CheckCircle2 className="w-12 h-12 mb-2 opacity-20" />
                      Bekleyen sevkiyat bulunmuyor.
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-t-4 border-t-slate-400 shadow">
        <CardHeader className="bg-gray-50/50 border-b">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-600">
            <HistoryIcon className="w-4 h-4" /> Yakın Zamandaki Mal Kabulleri
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableBody>
              {completedOrders.slice(0, 5).map((p: Purchase) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">#{p.id}</TableCell>
                  <TableCell className="text-sm font-medium">{p.supplier?.name}</TableCell>
                  <TableCell>
                    <Badge className={p.status === 'Tamamlandı' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs text-slate-400">
                    {format(new Date(p.created_at), 'dd/MM/yy HH:mm')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => { if (!open) setConfirmDialog({...confirmDialog, open: false}); }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmDialog.type === "receive" ? (
                <><PackageCheck className="w-5 h-5 text-green-600" /> Mal Kabul Onayı</>
              ) : (
                <><XCircle className="w-5 h-5 text-red-600" /> Sipariş İptali</>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {confirmDialog.type === "receive" ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  <b>#{confirmDialog.purchase?.id}</b> nolu siparişte girdiğiniz miktarların depoya girişini onaylıyor musunuz?
                </p>
                <div className="bg-green-50 p-3 rounded-lg border border-green-100 space-y-1">
                  {confirmDialog.purchase?.items?.map((item: PurchaseItem) => {
                    const qty = parseFloat(receiptQtys[item.id] || "0");
                    if (qty <= 0) return null;
                    return (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="font-medium">{item.product?.name}</span>
                        <span className="font-bold text-green-700">+{qty} {item.product?.unit}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                <b>#{confirmDialog.purchase?.id}</b> nolu siparişi iptal etmek istediğinize emin misiniz? Bu işlem geri alınamaz.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog({...confirmDialog, open: false})}>Vazgeç</Button>
            {confirmDialog.type === "receive" ? (
              <Button onClick={handleReceiveConfirmed} className="bg-green-600 hover:bg-green-700 font-bold">
                <PackageCheck className="w-4 h-4 mr-2" /> ONAYLA
              </Button>
            ) : (
              <Button onClick={handleCancelConfirmed} variant="destructive" className="font-bold">
                <XCircle className="w-4 h-4 mr-2" /> İPTAL ET
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
