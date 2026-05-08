"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, ClipboardList, Send, ArrowLeft, UserPlus, Package } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_URL = typeof window !== "undefined" ? `http://${window.location.hostname}:8080/api` : "http://localhost:8080/api";

export default function TeklifOlustur() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [note, setNote] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cRes, pRes] = await Promise.all([
          axios.get(`${API_URL}/customers`),
          axios.get(`${API_URL}/products`)
        ]);
        setCustomers(cRes.data || []);
        setProducts(pRes.data || []);
        
        // Default valid until (30 days later)
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
    setItems([...items, { product_id: "", quantity: 1, unit_price: 1, total_price: 1 }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;

    if (field === "product_id") {
      const prod = products.find(p => String(p.id) === String(value));
      if (prod) newItems[index].unit_price = prod.sale_price || 1;
    }

    newItems[index].total_price = newItems[index].quantity * newItems[index].unit_price;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateGrandTotal = () => {
    return items.reduce((sum, item) => sum + item.total_price, 0);
  };

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
        quote_date: new Date().toISOString(),
        valid_until: new Date(validUntil).toISOString(),
        total_price: calculateGrandTotal(),
        note: note,
        status: "Beklemede",
        items: items.map(item => ({
          product_id: Number(item.product_id),
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
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
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Link href="/teklifler">
          <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <h1 className="text-3xl font-bold">Yeni Satış Teklifi</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: General Info */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-blue-500" /> Müşteri ve Vade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Müşteri</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600"
                    value={selectedCustomerId}
                    onChange={e => setSelectedCustomerId(e.target.value)}
                    required
                  >
                    <option value="">Seçiniz...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Geçerlilik Tarihi</Label>
                  <Input 
                    type="date"
                    value={validUntil}
                    onChange={e => setValidUntil(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teklif Notu</Label>
                  <Input 
                    placeholder="Örn: %10 indirim uygulandı"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 text-white">
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <p className="text-slate-400 text-xs uppercase font-bold tracking-widest">Teklif Toplamı</p>
                  <p className="text-4xl font-black">{calculateGrandTotal().toLocaleString('tr-TR')} ₺</p>
                </div>
                <Button 
                  type="submit"
                  disabled={loading}
                  className="w-full mt-6 bg-blue-600 hover:bg-blue-700 h-12 text-lg font-bold"
                >
                  <Send className="w-5 h-5 mr-2" /> TEKLİFİ KAYDET
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right: Items */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="w-4 h-4 text-orange-500" /> Ürün Kalemleri
                </CardTitle>
                <Button type="button" onClick={addItem} size="sm" variant="outline" className="h-8">
                  <Plus className="w-4 h-4 mr-1" /> ÜRÜN EKLE
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ürün</TableHead>
                      <TableHead className="w-[100px]">Miktar</TableHead>
                      <TableHead className="w-[140px]">Birim Fiyat</TableHead>
                      <TableHead className="w-[140px] text-right">Toplam</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <select 
                            className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-xs focus:ring-2 focus:ring-blue-600"
                            value={item.product_id}
                            onChange={e => updateItem(index, "product_id", e.target.value)}
                            required
                          >
                            <option value="">Ürün Seç...</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" min="0.1" step="0.1"
                            value={item.quantity}
                            onChange={e => updateItem(index, "quantity", Number(e.target.value))}
                            className="h-9 text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="relative">
                            <Input 
                              type="number"
                              value={item.unit_price}
                              onChange={e => updateItem(index, "unit_price", Number(e.target.value))}
                              className="h-9 text-xs pr-6"
                            />
                            <span className="absolute right-2 top-2 text-[10px] text-slate-400">₺</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-sm">
                          {item.total_price.toLocaleString('tr-TR')} ₺
                        </TableCell>
                        <TableCell>
                          <Button 
                            type="button" 
                            variant="ghost" size="icon"
                            onClick={() => removeItem(index)}
                            className="text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {items.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-slate-400 text-sm">
                          Henüz ürün eklenmedi. "Ürün Ekle" butonunu kullanın.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
