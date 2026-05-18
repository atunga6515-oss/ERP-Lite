"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { 
  Plus, Trash2, Send, ArrowLeft, 
  UserPlus, Package, Search, Calendar, Coins,
  FileText, Percent, Building2
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Customer, Product, Stock, Recipe, IssuingCompany } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}/api` : "http://localhost:8080/api");
const UPLOAD_URL = typeof window !== "undefined" ? `http://${window.location.hostname}:8080` : "http://localhost:8080";

interface QuoteFormItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  total_price: number;
}

export default function TeklifOlustur() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [issuingCompanies, setIssuingCompanies] = useState<IssuingCompany[]>([]);
  
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedIssuingCompanyId, setSelectedIssuingCompanyId] = useState("");
  const [items, setItems] = useState<QuoteFormItem[]>([]);
  const [note, setNote] = useState("");
  const [currency, setCurrency] = useState("TL");
  const [validUntil, setValidUntil] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [openSearchIdx, setOpenSearchIdx] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cRes, pRes, sRes, rRes, iRes] = await Promise.all([
          axios.get(`${API_URL}/customers`),
          axios.get(`${API_URL}/products`),
          axios.get(`${API_URL}/stocks`),
          axios.get(`${API_URL}/recipes`),
          axios.get(`${API_URL}/issuing-companies`)
        ]);
        setCustomers(cRes.data || []);
        setProducts(pRes.data || []);
        setStocks(sRes.data || []);
        setRecipes(rRes.data || []);
        setIssuingCompanies(iRes.data || []);

        if (iRes.data && iRes.data.length > 0) {
            setSelectedIssuingCompanyId(String(iRes.data[0].id));
        }
        
        const date = new Date();
        date.setDate(date.getDate() + 30);
        setValidUntil(date.toISOString().split('T')[0]);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  const addItem = () => {
    setItems([...items, { product_id: "", quantity: 1, unit_price: 0, tax_rate: 20, tax_amount: 0, total_price: 0 }]);
  };

  const getCurrencySymbol = (code: string) => {
    switch (code) {
      case "USD": return "$";
      case "EUR": return "€";
      default: return "₺";
    }
  };

  const updateItem = (index: number, field: keyof QuoteFormItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === "product_id") {
      const prod = products.find((p: Product) => String(p.id) === String(value));
      if (prod) newItems[index].unit_price = prod.sale_price || 0;
    }

    const qty = Number(newItems[index].quantity || 0);
    const price = Number(newItems[index].unit_price || 0);
    const taxRate = Number(newItems[index].tax_rate || 0);

    const sub = qty * price;
    const tax = sub * (taxRate / 100);
    
    newItems[index].tax_amount = tax;
    newItems[index].total_price = sub + tax;
    
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totals = items.reduce((acc, item) => {
    const sub = Number(item.quantity || 0) * Number(item.unit_price || 0);
    acc.subTotal += sub;
    acc.taxTotal += item.tax_amount;
    acc.grandTotal += item.total_price;
    return acc;
  }, { subTotal: 0, taxTotal: 0, grandTotal: 0 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || items.length === 0) {
      alert("Lütfen müşteri ve en az bir ürün seçiniz.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        customer_id: Number(selectedCustomerId),
        issuing_company_id: selectedIssuingCompanyId ? Number(selectedIssuingCompanyId) : null,
        valid_until: new Date(validUntil).toISOString(),
        sub_total: totals.subTotal,
        tax_total: totals.taxTotal,
        total_price: totals.grandTotal,
        note: note,
        currency: currency,
        status: "Beklemede",
        items: items.map((item: QuoteFormItem) => ({
          product_id: Number(item.product_id),
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          tax_rate: Number(item.tax_rate),
          tax_amount: Number(item.tax_amount),
          total_price: Number(item.total_price)
        }))
      };

      await axios.post(`${API_URL}/quotes`, payload);
      router.push("/teklifler");
    } catch (err: any) {
      alert(err.response?.data?.error || "Teklif oluşturulurken hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-32 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-white shadow-xl">
        <div className="flex items-center gap-5">
          <Link href="/teklifler">
            <Button variant="ghost" size="icon" className="rounded-2xl hover:bg-white shadow-sm border border-slate-100">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Badge className="bg-orange-100 text-orange-600 hover:bg-orange-100 border-orange-200 uppercase tracking-tighter text-[10px] font-black px-2 py-0.5">YENİ TASLAK</Badge>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Profesyonel Teklif Hazırla</h1>
            </div>
            <p className="text-slate-500 text-sm font-medium mt-0.5">KDV ve detaylı kalemlerle resmi satış teklifi oluşturun.</p>
          </div>
        </div>
        
        <Button 
            onClick={handleSubmit}
            disabled={loading || !selectedCustomerId || items.length === 0}
            className="bg-slate-900 hover:bg-slate-800 text-white h-14 px-8 rounded-2xl shadow-lg shadow-slate-200 font-black text-sm uppercase tracking-tighter transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-3"
        >
            {loading ? "KAYDEDİLİYOR..." : <><Send className="w-5 h-5 text-orange-400" /> TEKLİFİ KAYDET VE YAYINLA</>}
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Sidebar: Settings */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="rounded-[2rem] border-none shadow-2xl shadow-slate-200/50 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <CardTitle className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
                    <UserPlus className="w-4 h-4 text-blue-600" />
                </div>
                Müşteri & Vade
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-3">
                <Label className="text-xs font-black text-slate-500 uppercase tracking-tighter">Teklif Veren Şirket</Label>
                <div className="relative">
                  <select 
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-11 py-2 text-sm font-bold focus:ring-4 focus:ring-blue-100 outline-none transition-all appearance-none"
                    value={selectedIssuingCompanyId}
                    onChange={e => setSelectedIssuingCompanyId(e.target.value)}
                  >
                    <option value="">Lütfen seçim yapınız...</option>
                    {issuingCompanies.map((c: IssuingCompany) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <Building2 className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-black text-slate-500 uppercase tracking-tighter">İlgili Müşteri / Firma</Label>
                <select 
                  className="flex h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm font-bold focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none"
                  value={selectedCustomerId}
                  onChange={e => setSelectedCustomerId(e.target.value)}
                  required
                >
                  <option value="">Lütfen seçim yapınız...</option>
                  {customers.map((c: Customer) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-black text-slate-500 uppercase tracking-tighter">Teklif Geçerlilik Tarihi</Label>
                <div className="relative">
                    <Input 
                        type="date"
                        value={validUntil}
                        onChange={e => setValidUntil(e.target.value)}
                        className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 font-bold pl-11"
                        required
                    />
                    <Calendar className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-black text-slate-500 uppercase tracking-tighter">Teklif Para Birimi</Label>
                <div className="relative">
                  <select 
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-11 py-2 text-sm font-bold focus:ring-4 focus:ring-blue-100 outline-none transition-all appearance-none"
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                  >
                    <option value="TL">Türk Lirası (₺)</option>
                    <option value="USD">Amerikan Doları ($)</option>
                    <option value="EUR">Euro (€)</option>
                  </select>
                  <Coins className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-black text-slate-500 uppercase tracking-tighter">Özel Not & Açıklama</Label>
                <div className="relative">
                    <Input 
                        placeholder="Örn: %10 özel indirim..."
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 font-bold pl-11"
                    />
                    <FileText className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-2xl shadow-slate-900/20 overflow-hidden relative group">
            <CardContent className="p-8 relative z-10">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-slate-400 text-[10px] uppercase font-black tracking-widest">
                    <span>Ara Toplam</span>
                    <span className="text-white font-bold">{totals.subTotal.toLocaleString('tr-TR')} {getCurrencySymbol(currency)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400 text-[10px] uppercase font-black tracking-widest">
                    <span>Toplam KDV</span>
                    <span className="text-white font-bold">{totals.taxTotal.toLocaleString('tr-TR')} {getCurrencySymbol(currency)}</span>
                </div>
                <div className="h-px bg-white/10 w-full my-2"></div>
                <div className="flex justify-between items-end">
                    <div className="space-y-1">
                        <p className="text-blue-400 text-[10px] uppercase font-black tracking-[0.2em]">Genel Toplam</p>
                        <p className="text-4xl font-black tracking-tight text-white">{totals.grandTotal.toLocaleString('tr-TR')} <span className="text-xl">{getCurrencySymbol(currency)}</span></p>
                    </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Content: Item List */}
        <div className="lg:col-span-8 space-y-6 !overflow-visible">
          <Card className="rounded-[2rem] border-none shadow-2xl shadow-slate-200/50 !overflow-visible">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 p-8">
              <div>
                <CardTitle className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center">
                        <Package className="w-5 h-5 text-orange-600" />
                    </div>
                    Teklif Kalemleri
                </CardTitle>
              </div>
              <Button type="button" onClick={addItem} className="bg-white hover:bg-orange-50 text-orange-600 border-2 border-orange-200 shadow-sm rounded-xl px-5 font-black text-xs uppercase tracking-tighter h-11 transition-all">
                <Plus className="w-4 h-4 mr-2" /> ÜRÜN EKLE
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-visible">
              <div className="w-full overflow-visible">
                <table className="w-full border-collapse overflow-visible">
                  <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr>
                      <th className="pl-8 py-4 font-black text-slate-500 text-[10px] uppercase tracking-widest text-left max-w-[250px]">Ürün</th>
                      <th className="w-[100px] py-4 font-black text-slate-500 text-[10px] uppercase tracking-widest text-center">Miktar</th>
                      <th className="w-[130px] py-4 font-black text-slate-500 text-[10px] uppercase tracking-widest text-left">Birim Fiyat</th>
                      <th className="w-[100px] py-4 font-black text-slate-500 text-[10px] uppercase tracking-widest text-left">KDV (%)</th>
                      <th className="w-[140px] py-4 text-right font-black text-slate-500 text-[10px] uppercase tracking-widest pr-4">Toplam</th>
                      <th className="w-[60px] py-4 pr-8"></th>
                    </tr>
                  </thead>
                  <tbody className="overflow-visible">
                  {items.map((item: QuoteFormItem, index: number) => (
                    <tr key={index} className="group transition-colors hover:bg-slate-50/30 border-b border-slate-100 last:border-0">
                      <td className="relative overflow-visible pl-8 py-5">
                        <div 
                          className={`flex h-12 w-full min-w-0 items-center justify-between rounded-2xl border bg-white px-4 py-2 text-sm font-bold cursor-pointer transition-all shadow-sm group/select ${openSearchIdx === index ? 'border-blue-500 ring-4 ring-blue-100' : 'border-slate-200 hover:border-blue-400'}`}
                          onClick={() => {
                            setOpenSearchIdx(openSearchIdx === index ? null : index);
                            setSearchTerm("");
                          }}
                        >
                          <span className={`${item.product_id ? "text-slate-900 font-black" : "text-slate-400 font-medium"} truncate flex-1`}>
                            {item.product_id 
                              ? products.find((p: Product) => String(p.id) === String(item.product_id))?.name || "Seçiniz..."
                              : "Ürün Seç..."
                            }
                          </span>
                          <Search className="w-4 h-4 text-slate-400 group-hover/select:text-blue-500 shrink-0 ml-2" />
                        </div>

                        {openSearchIdx === index && (
                          <>
                            <div className="fixed inset-0 z-[90]" onClick={() => setOpenSearchIdx(null)}></div>
                            <div className="absolute left-0 top-[calc(100%-4px)] z-[999] w-[550px] bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                              <div className="p-3 border-b bg-slate-50 flex items-center gap-3">
                                <Search className="w-3.5 h-3.5 text-slate-400" />
                                <Input 
                                  placeholder="Ürün adı veya barkod..." 
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                  autoFocus
                                  className="h-8 text-xs border-none bg-transparent focus-visible:ring-0 p-0 shadow-none font-bold placeholder:font-medium"
                                />
                              </div>
                              <div className="max-h-[350px] overflow-y-auto custom-scrollbar bg-white p-2">
                                {products
                                  .filter((p: Product) => 
                                    p.name.toLocaleLowerCase("tr-TR").includes(searchTerm.toLocaleLowerCase("tr-TR")) || 
                                    (p.barcode || "").toLocaleLowerCase("tr-TR").includes(searchTerm.toLocaleLowerCase("tr-TR"))
                                  )
                                  .map((p: Product) => {
                                    const totalStock = stocks
                                      .filter((s: Stock) => s.product_id === p.id)
                                      .reduce((acc: number, s: Stock) => acc + s.quantity, 0);

                                    const recipe = recipes.find((r: Recipe) => r.product_id === p.id);
                                    const hasImage = recipe && recipe.image_path;

                                    return (
                                      <div 
                                        key={p.id}
                                        className={`flex items-center justify-between p-4 rounded-2xl transition-all cursor-pointer group/item mb-1 ${
                                          String(p.id) === String(item.product_id) 
                                          ? 'bg-blue-50 border-l-4 border-l-blue-600' 
                                          : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                                        }`}
                                        onClick={() => {
                                          updateItem(index, "product_id", String(p.id));
                                          setOpenSearchIdx(null);
                                          setSearchTerm("");
                                        }}
                                      >
                                        <div className="flex items-center gap-3">
                                          {hasImage ? (
                                            <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shadow-sm shrink-0 bg-white">
                                              <img src={`${UPLOAD_URL}/${recipe.image_path}`} alt={p.name} className="w-full h-full object-cover" />
                                            </div>
                                          ) : (
                                            <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-100 shrink-0">
                                              <Package className="w-5 h-5 text-slate-300" />
                                            </div>
                                          )}
                                          <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-2">
                                              <Badge className="bg-slate-900 text-white text-[8px] font-mono px-1.5 py-0 border-none">{p.barcode}</Badge>
                                              <span className="font-black text-xs text-slate-800 leading-tight">{p.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{p.category || "Genel"}</span>
                                              <div className="w-0.5 h-0.5 rounded-full bg-slate-300"></div>
                                              <span className="text-[9px] text-blue-500 font-black">Fiyat: {p.sale_price?.toLocaleString('tr-TR')} ₺</span>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-[8px] font-black uppercase tracking-tighter text-slate-400">Stok</p>
                                          <p className={`text-xs font-black ${totalStock > 0 ? 'text-slate-900' : 'text-red-600'}`}>
                                            {totalStock} <span className="text-[9px] font-bold text-slate-400">{p.unit}</span>
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })
                                }
                              </div>
                            </div>
                          </>
                        )}
                      </td>
                      <td className="py-5">
                        <Input 
                          type="number" min="0.1" step="0.1"
                          value={item.quantity}
                          onChange={e => updateItem(index, "quantity", Number(e.target.value))}
                          className="h-12 rounded-2xl border-slate-200 font-black text-sm text-center"
                        />
                      </td>
                      <td className="py-5">
                        <div className="relative">
                          <Input 
                            type="number"
                            value={item.unit_price}
                            onChange={e => updateItem(index, "unit_price", Number(e.target.value))}
                            className="h-12 rounded-2xl border-slate-200 font-black text-sm pl-8"
                          />
                          <span className="absolute left-3 top-3.5 text-xs font-black text-slate-400">₺</span>
                        </div>
                      </td>
                      <td className="py-5">
                        <div className="relative">
                            <select 
                                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-black focus:ring-4 focus:ring-blue-100 outline-none transition-all appearance-none"
                                value={item.tax_rate}
                                onChange={e => updateItem(index, "tax_rate", Number(e.target.value))}
                            >
                                <option value="0">0%</option>
                                <option value="1">1%</option>
                                <option value="10">10%</option>
                                <option value="20">20%</option>
                            </select>
                            <Percent className="absolute right-3 top-4 w-4 h-4 text-slate-300 pointer-events-none" />
                        </div>
                      </td>
                      <td className="py-5 text-right font-black text-slate-800 text-base pr-4">
                        {item.total_price.toLocaleString('tr-TR')} <span className="text-xs text-slate-400 font-medium">{getCurrencySymbol(currency)}</span>
                      </td>
                      <td className="py-5 pr-8">
                        <Button 
                          type="button" 
                          variant="ghost" size="icon"
                          onClick={() => removeItem(index)}
                          className="w-10 h-10 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
          </Card>
          <div className="h-[300px]"></div> {/* Spacing for the dropdowns */}
        </div>
      </form>
    </div>
  );
}
