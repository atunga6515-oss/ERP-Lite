"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ClipboardList, Plus, FileDown, Printer, ChevronDown, ChevronUp, 
  CheckCircle, XCircle, Send, ShoppingCart, Calendar, Edit3
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "@/context/AuthContext";
import { Quote, Warehouse, QuoteItem } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}/api` : "http://localhost:8080/api");
const UPLOAD_URL = typeof window !== "undefined" ? `http://${window.location.hostname}:8080` : "http://localhost:8080";

export default function Teklifler() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<number[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");

  const getBase64ImageFromURL = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("getBase64ImageFromURL failed:", error);
      throw error;
    }
  };

  const handleDownloadPDF = async (quote: Quote) => {
    const doc = new jsPDF() as any;

    // 0. Load Font for Turkish Characters
    try {
      const fontResponse = await fetch("/fonts/Geist-Regular.ttf");
      const fontBlob = await fontResponse.blob();
      const fontBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(fontBlob);
      });
      doc.addFileToVFS("Geist.ttf", fontBase64);
      doc.addFont("Geist.ttf", "Geist", "normal");
      doc.setFont("Geist");
    } catch (e) {
      console.error("Font loading error:", e);
      doc.setFont("helvetica", "normal");
    }
    
    // 1. Issuing Company Logo and Info (Header)
    let companyLogoBase64 = null;
    if (quote.issuing_company?.logo_path) {
      try {
        companyLogoBase64 = await getBase64ImageFromURL(`${UPLOAD_URL}/${quote.issuing_company.logo_path}`);
      } catch (e) {
        console.error("Company logo error:", e);
      }
    }

    if (companyLogoBase64) {
      doc.addImage(companyLogoBase64, 'PNG', 20, 10, 60, 20, undefined, 'FAST');
    }

    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.setFont("Geist", "normal");
    const headerX = 140;
    const headerY = 10;
    const spacing = 4;
    
    doc.text("ADRES", headerX, headerY);
    doc.text(":", headerX + 15, headerY);
    const addressLines = doc.splitTextToSize(quote.issuing_company?.address || "-", 45);
    doc.text(addressLines, headerX + 18, headerY);

    const nextY = headerY + (addressLines.length * 3) + 2;
    doc.text("TELEFON", headerX, nextY);
    doc.text(":", headerX + 15, nextY);
    doc.text(quote.issuing_company?.phone || "-", headerX + 18, nextY);

    doc.text("GSM", headerX, nextY + spacing);
    doc.text(":", headerX + 15, nextY + spacing);
    doc.text(quote.issuing_company?.phone || "-", headerX + 18, nextY + spacing);

    doc.text("E-POSTA", headerX, nextY + spacing * 2);
    doc.text(":", headerX + 15, nextY + spacing * 2);
    doc.text(quote.issuing_company?.email || "-", headerX + 18, nextY + spacing * 2);

    doc.text("WEB", headerX, nextY + spacing * 3);
    doc.text(":", headerX + 15, nextY + spacing * 3);
    doc.text(quote.issuing_company?.web || "-", headerX + 18, nextY + spacing * 3);

    // 2. Title
    doc.setFontSize(14);
    doc.setFont("Geist", "bold");
    doc.text("TEKLİF FORMU", 105, 45, { align: "center" });

    // 3. Customer & Quote Info Table
    const infoTableData = [
      [
        { content: "MÜŞTERİ ADI", styles: { fontStyle: 'bold', cellWidth: 35 } },
        { content: quote.customer?.name || "-", styles: { cellWidth: 55 } },
        { content: "TEKLİF / NO", styles: { fontStyle: 'bold', cellWidth: 35 } },
        { content: quote.quote_number || "-", styles: { cellWidth: 55 } }
      ],
      [
        { content: "FİRMA YETKİLİSİ", styles: { fontStyle: 'bold' } },
        { content: quote.customer?.authorized_person || "-" },
        { content: "TEKLİF TARİHİ", styles: { fontStyle: 'bold' } },
        { content: format(new Date(quote.quote_date), 'dd.MM.yyyy') }
      ],
      [
        { content: "TELEFON", styles: { fontStyle: 'bold' } },
        { content: quote.customer?.phone || "-" },
        { content: "ÖDEME ŞEKLİ", styles: { fontStyle: 'bold' } },
        { content: "Siparişte Peşin" } // Sample value
      ],
      [
        { content: "FAX", styles: { fontStyle: 'bold' } },
        { content: "-" },
        { content: "PLANLANAN TESLİM TARİHİ", styles: { fontStyle: 'bold' } },
        { content: format(new Date(quote.valid_until), 'dd.MM.yyyy') }
      ]
    ];

    autoTable(doc, {
      startY: 55,
      margin: { left: 10, right: 10 },
      body: infoTableData as any,
      theme: "grid",
      styles: { font: "Geist", fontSize: 8, cellPadding: 2, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.1 },
      columnStyles: { 
        0: { fillColor: [255, 255, 255] },
        2: { fillColor: [255, 255, 255] }
      }
    });

    const getCurrencySymbol = (code: string) => {
      switch (code) {
        case "USD": return "$";
        case "EUR": return "€";
        default: return "TL";
      }
    };
    const cSym = getCurrencySymbol(quote.currency);

    // 5. Items Table
    const tableData: any[] = (quote.items || []).map((item: QuoteItem, idx: number) => {
      return [
        idx + 1,
        item.product?.name || "-",
        `${item.quantity} ${item.product?.unit}`,
        `${item.unit_price.toLocaleString('tr-TR')} ${cSym}`,
        `${item.total_price.toLocaleString('tr-TR')} ${cSym}`
      ];
    });

    // Add empty rows to match sample (up to 9 rows for items)
    while (tableData.length < 9) {
      tableData.push(["", "", "", "", ""]);
    }

    // Add summary rows at the bottom of the table
    const taxRate = quote.items && quote.items.length > 0 ? quote.items[0].tax_rate : 20;
    tableData.push(
        [{ content: "TOPLAM TUTAR", colSpan: 4, styles: { fontStyle: 'bold', halign: 'right' } }, `${quote.sub_total.toLocaleString('tr-TR')} ${cSym}`],
        [{ content: `KDV %${taxRate}`, colSpan: 4, styles: { fontStyle: 'bold', halign: 'right' } }, `${quote.tax_total.toLocaleString('tr-TR')} ${cSym}`],
        [{ content: "GENEL TOPLAM", colSpan: 4, styles: { fontStyle: 'bold', halign: 'right' } }, `${quote.total_price.toLocaleString('tr-TR')} ${cSym}`]
    );

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 2,
      margin: { left: 10, right: 10 },
      head: [["NO", "MALZEME, ÜRÜN ADI", "MİKTARI", "BR.FİYATI", "TUTARI"]],
      body: tableData,
      theme: "grid",
      headStyles: { font: "Geist", fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineWidth: 0.1, lineColor: [0, 0, 0] },
      styles: { font: "Geist", fontSize: 8, halign: "center", textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [0, 0, 0], minCellHeight: 6 },
      columnStyles: { 
        1: { halign: "left", cellWidth: 'auto' },
        0: { cellWidth: 10 }
      }
    });

    // 6. Signature Section
    const sigY = (doc as any).lastAutoTable.finalY + 5;
    doc.rect(10, sigY, 190, 25);
    doc.line(120, sigY, 120, sigY + 25);
    
    doc.setFontSize(9);
    doc.setFont("Geist", "bold");
    doc.text("TEKLİF VEREN", 15, sigY + 5);
    doc.text("MÜŞTERİ ONAYI", 125, sigY + 5);
    
    doc.setFontSize(8);
    doc.setFont("Geist", "normal");
    doc.text("Adı-Soyadı:", 15, sigY + 12);
    doc.text(user?.username || "-", 35, sigY + 12);
    doc.text("İmza:", 15, sigY + 19);

    doc.text("Adı-Soyadı:", 125, sigY + 12);
    doc.text("İmza:", 125, sigY + 19);
    doc.text("( LÜTFEN TEYİD EDİNİZ. )", 155, sigY + 23, { align: "center" });

    // 7. Bottom Right Code
    doc.setFontSize(7);
    doc.text("FR 7 04 (0)", 190, 285, { align: "right" });

    doc.save(`Teklif_${quote.quote_number || quote.id}.pdf`);
  };

  const fetchData = async () => {
    try {
      const [qRes, wRes] = await Promise.all([
        axios.get(`${API_URL}/quotes`),
        axios.get(`${API_URL}/warehouses`)
      ]);
      setQuotes(qRes.data || []);
      setWarehouses(wRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await axios.put(`${API_URL}/quotes/${id}/status`, { status });
      fetchData();
    } catch (err) {
      alert("Durum güncellenirken hata oluştu.");
    }
  };

  const handleConvertToSale = async (id: number) => {
    if (!selectedWarehouse) {
      alert("Lütfen bir depo seçiniz.");
      return;
    }
    try {
      await axios.post(`${API_URL}/quotes/${id}/convert`, { warehouse_id: Number(selectedWarehouse) });
      alert("Teklif başarıyla satışa dönüştürüldü ve sevkiyata gönderildi.");
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || "Dönüştürme hatası.");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Beklemede": return "bg-amber-100 text-amber-700 border-amber-200";
      case "Gönderildi": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Onaylandı": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Reddedildi": return "bg-rose-100 text-rose-700 border-rose-200";
      case "Satışa Döndü": return "bg-slate-100 text-slate-700 border-slate-200";
      default: return "bg-slate-100 text-slate-600";
    }
  };

  const toggleRow = (id: number) => {
    setExpandedRows(prev => prev.includes(id) ? prev.filter((rid: number) => rid !== id) : [...prev, id]);
  };

  if (loading) return <div className="p-20 text-center animate-pulse font-black uppercase tracking-widest text-slate-400">Veriler Yükleniyor...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-white shadow-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-200">
                <ClipboardList className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Teklif Yönetimi</h1>
          </div>
          <p className="text-slate-500 font-medium ml-1">Satış tekliflerinizi hazırlayın, takip edin ve yönetin.</p>
        </div>
        <Link href="/teklif-olustur">
          <Button className="bg-slate-900 hover:bg-slate-800 text-white h-14 px-8 rounded-2xl shadow-xl shadow-slate-200 font-black text-sm uppercase tracking-tighter transition-all hover:scale-[1.02] active:scale-95">
            <Plus className="w-5 h-5 mr-3 text-orange-400" /> Yeni Teklif Oluştur
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {quotes.length === 0 ? (
          <Card className="rounded-[2.5rem] border-dashed border-2 border-slate-200 bg-slate-50/50 p-20 text-center">
            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Henüz teklif kaydı bulunmuyor.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {quotes.map((q: Quote) => (
              <Card key={q.id} className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50 overflow-hidden transition-all hover:shadow-2xl hover:shadow-slate-300/50 group">
                <div className="p-6 md:p-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-slate-50 flex flex-col items-center justify-center border border-slate-100 group-hover:bg-white transition-colors">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">TEKLİF</span>
                        <span className="text-lg font-black text-slate-900 leading-none">#{q.id}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">{q.customer?.name}</h3>
                            <Badge className={`rounded-lg font-black text-[10px] uppercase tracking-tighter ${getStatusColor(q.status)}`}>
                                {q.status}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                          <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {format(new Date(q.quote_date), 'dd MMMM yyyy', { locale: tr })}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                          <span className="text-blue-500 font-black">{q.quote_number}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TOPLAM TUTAR (KDV Dahil)</p>
                            <p className="text-2xl font-black text-slate-900 tracking-tight">
                                {q.total_price.toLocaleString('tr-TR')} <span className="text-sm font-bold text-slate-400">₺</span>
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Link href={`/teklif-duzenle/${q.id}`}>
                                <Button variant="outline" size="sm" className="h-9 bg-white border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold text-xs">
                                    <Edit3 className="w-4 h-4 mr-2" /> Düzenle
                                </Button>
                            </Link>
                            <Button variant="outline" size="sm" onClick={() => handleDownloadPDF(q)} className="h-9 bg-white border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold text-xs">
                                <Printer className="w-4 h-4 mr-2" /> Yazdır
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDownloadPDF(q)} className="h-9 bg-white border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold text-xs">
                                <FileDown className="w-4 h-4 mr-2" /> PDF İndir
                            </Button>
                        </div>
                    </div>
                  </div>

                  <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-6">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => toggleRow(q.id)}
                      className="text-xs font-black text-slate-500 hover:text-slate-900 rounded-xl group/btn"
                    >
                      {expandedRows.includes(q.id) ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />} 
                      DETAYLARI {expandedRows.includes(q.id) ? "GİZLE" : "GÖSTER"}
                    </Button>
                    
                    <div className="h-4 w-px bg-slate-200 mx-2"></div>

                    {q.status === "Beklemede" && (
                        <Button 
                            variant="outline" size="sm" 
                            onClick={() => handleUpdateStatus(q.id, "Gönderildi")}
                            className="bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-100 rounded-xl font-black text-xs px-4"
                        >
                            <Send className="w-4 h-4 mr-2" /> GÖNDERİLDİ OLARAK İŞARETLE
                        </Button>
                    )}

                    {q.status === "Gönderildi" && (
                      <>
                        <Button 
                            variant="outline" size="sm" 
                            onClick={() => handleUpdateStatus(q.id, "Onaylandı")}
                            className="bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100 rounded-xl font-black text-xs px-4"
                        >
                            <CheckCircle className="w-4 h-4 mr-2" /> ONAYLA
                        </Button>
                        <Button 
                            variant="outline" size="sm" 
                            onClick={() => handleUpdateStatus(q.id, "Reddedildi")}
                            className="bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100 rounded-xl font-black text-xs px-4"
                        >
                            <XCircle className="w-4 h-4 mr-2" /> REDDET
                        </Button>
                      </>
                    )}

                    {q.status === "Onaylandı" && (
                      <div className="flex items-center gap-3">
                        <select 
                          className="h-9 px-3 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-blue-100 outline-none"
                          value={selectedWarehouse}
                          onChange={(e) => setSelectedWarehouse(e.target.value)}
                        >
                          <option value="">Çıkış Deposu Seç...</option>
                        {warehouses.map((w: Warehouse) => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                        <Button 
                            variant="default" size="sm" 
                            onClick={() => handleConvertToSale(q.id)}
                            className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs px-4"
                        >
                            <ShoppingCart className="w-4 h-4 mr-2 text-orange-400" /> SATIŞA DÖNÜŞTÜR
                        </Button>
                      </div>
                    )}
                  </div>

                  {expandedRows.includes(q.id) && (
                    <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/50 animate-in slide-in-from-top-2 duration-300">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="font-black text-[10px] uppercase">Ürün</TableHead>
                            <TableHead className="text-center font-black text-[10px] uppercase">Miktar</TableHead>
                            <TableHead className="text-right font-black text-[10px] uppercase">Birim Fiyat</TableHead>
                            <TableHead className="text-right font-black text-[10px] uppercase">KDV (%)</TableHead>
                            <TableHead className="text-right font-black text-[10px] uppercase">Toplam</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(q.items || []).map((item: QuoteItem) => (
                            <TableRow key={item.id} className="hover:bg-slate-100/50">
                              <TableCell className="font-bold text-slate-700">{item.product?.name}</TableCell>
                              <TableCell className="text-center font-bold">{item.quantity} {item.product?.unit}</TableCell>
                              <TableCell className="text-right font-bold">{item.unit_price.toLocaleString('tr-TR')} ₺</TableCell>
                              <TableCell className="text-right font-bold">%{item.tax_rate}</TableCell>
                              <TableCell className="text-right font-black text-slate-900">{item.total_price.toLocaleString('tr-TR')} ₺</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
