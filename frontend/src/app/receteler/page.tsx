"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Plus, Trash2, Save, BookOpen, CheckCircle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const API_URL = typeof window !== "undefined" ? `http://${window.location.hostname}:8080/api` : "http://localhost:8080/api";

export default function Receteler() {
  const [products, setProducts] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [selectedMainProduct, setSelectedMainProduct] = useState("");
  const [recipeItems, setRecipeItems] = useState<any[]>([]);
  const [isEdit, setIsEdit] = useState(false);
  const [stocks, setStocks] = useState<any[]>([]);
  const [mainSearchTerm, setMainSearchTerm] = useState("");
  const [isMainSearchOpen, setIsMainSearchOpen] = useState(false);
  const [itemSearchTerms, setItemSearchTerms] = useState<Record<number, string>>({});
  const [openItemSearchIdx, setOpenItemSearchIdx] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      const [pRes, rRes, sRes] = await Promise.all([
        axios.get(`${API_URL}/products`),
        axios.get(`${API_URL}/recipes`),
        axios.get(`${API_URL}/stocks`)
      ]);
      setProducts(pRes.data || []);
      setRecipes(rRes.data || []);
      setStocks(sRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateDialog = () => {
    setSelectedMainProduct("");
    setRecipeItems([]);
    setIsEdit(false);
    setIsDialogOpen(true);
  };

  const openEditDialog = (recipe: any) => {
    setSelectedMainProduct(String(recipe.product_id));
    setRecipeItems(recipe.items?.map((item: any) => ({
      product_id: String(item.product_id),
      quantity: item.quantity
    })) || []);
    setIsEdit(true);
    setIsDialogOpen(true);
  };

  const addRecipeItem = () => {
    setRecipeItems([...recipeItems, { product_id: "", quantity: 1 }]);
  };

  const removeRecipeItem = (index: number) => {
    setRecipeItems(recipeItems.filter((_, i) => i !== index));
  };

  const updateRecipeItem = (index: number, field: string, value: any) => {
    const newItems = [...recipeItems];
    newItems[index][field] = value;
    setRecipeItems(newItems);
  };

  const handleSave = async () => {
    if (!selectedMainProduct || recipeItems.length === 0) {
      alert("Lütfen ana ürünü ve en az bir hammaddeyi seçin.");
      return;
    }

    if (recipeItems.some(item => !item.product_id || item.quantity <= 0)) {
      alert("Lütfen tüm hammaddeleri ve miktarlarını doğru girin.");
      return;
    }

    if (!isEdit) {
      const alreadyExists = recipes.some(r => String(r.product_id) === selectedMainProduct);
      if (alreadyExists) {
        alert("Bu ürün için zaten bir reçete tanımlanmış! Mevcut reçeteyi listeden bulup düzenleyebilirsiniz.");
        return;
      }
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/recipes`, {
        product_id: Number(selectedMainProduct),
        items: recipeItems.map(item => ({
          product_id: Number(item.product_id),
          quantity: Number(item.quantity)
        }))
      });
      setIsDialogOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Reçete kaydedilirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bu reçeteyi silmek istediğinize emin misiniz?")) return;
    try {
      await axios.delete(`${API_URL}/recipes/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Reçete silinirken hata oluştu.");
    }
  };

  const filteredRecipes = recipes.filter(r => 
    r.product?.name?.toLowerCase().includes(search.toLowerCase()) || 
    r.product?.barcode?.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Ürün Reçeteleri (BOM)</h1>
        <Button onClick={openCreateDialog} className="bg-orange-600 hover:bg-orange-700 font-bold">
          <Plus className="w-4 h-4 mr-2" /> Yeni Reçete Oluştur
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Tanımlı Reçeteler</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Mamul Ara..." 
                className="pl-8" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Üretilecek Mamul (Barkod / Adı)</TableHead>
                <TableHead>Hammadde Sayısı</TableHead>
                <TableHead>Son Güncelleme</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecipes.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500">{r.product?.barcode}</span>
                      <span>{r.product?.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{r.items?.length || 0} Kalem Hammadde</TableCell>
                  <TableCell className="text-xs text-gray-500">
                    {r.updated_at ? new Date(r.updated_at).toLocaleString('tr-TR') : "-"}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(r)} title="Düzenle">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} title="Sil">
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredRecipes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                    Henüz bir ürün reçetesi tanımlanmamış.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-none w-[95vw] h-[92vh] flex flex-col overflow-hidden p-0 rounded-xl shadow-2xl border-none">
          <div className="px-6 py-4 border-b bg-orange-50 flex justify-between items-center">
            <DialogTitle className="text-2xl font-black text-orange-800 uppercase tracking-tight flex items-center gap-2">
              <BookOpen className="w-8 h-8" />
              {isEdit ? "Ürün Reçetesi Düzenle" : "Yeni Ürün Reçetesi Tanımlama"}
            </DialogTitle>
            <div className="flex gap-2">
               <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Vazgeç</Button>
               <Button onClick={handleSave} disabled={loading} className="bg-green-600 hover:bg-green-700 font-bold px-8">
                 {loading ? "Kaydediliyor..." : "REÇETEYİ KAYDET"}
               </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
            <div className="grid grid-cols-12 gap-6 h-full">
              {/* Sol Panel: Ana Ürün */}
              <div className="col-span-12 lg:col-span-4 space-y-6">
                <Card className="shadow-lg border-t-4 border-t-orange-600">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      1. Adım: Üretilecek Ana Mamul
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 relative">
                      <Label className="text-sm font-bold text-gray-600">Mamul Seçin</Label>
                      <div 
                        className={`flex h-12 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-lg font-bold ${isEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-orange-400'}`}
                        onClick={() => !isEdit && setIsMainSearchOpen(!isMainSearchOpen)}
                      >
                        <span className={selectedMainProduct ? "text-slate-900" : "text-slate-400"}>
                          {selectedMainProduct 
                            ? products.find(p => String(p.id) === selectedMainProduct)?.name || "Seçiniz..."
                            : "Lütfen ürün seçiniz..."
                          }
                        </span>
                        {!isEdit && <Search className="w-4 h-4 text-slate-400" />}
                      </div>

                      {isMainSearchOpen && (
                        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                          <div className="p-2 border-b bg-slate-50">
                            <Input 
                              placeholder="Mamul adı veya barkod..." 
                              value={mainSearchTerm}
                              onChange={(e) => setMainSearchTerm(e.target.value)}
                              autoFocus
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="max-h-[300px] overflow-y-auto p-2 grid grid-cols-1 md:grid-cols-2 gap-2 bg-slate-50/50">
                            {products
                              .filter(p => p.barcode?.startsWith("ALP"))
                              .filter(p => isEdit || !recipes.some(r => r.product_id === p.id))
                              .filter(p => 
                                p.name.toLowerCase().includes(mainSearchTerm.toLowerCase()) || 
                                p.barcode.toLowerCase().includes(mainSearchTerm.toLowerCase())
                              )
                              .map(p => (
                                <div 
                                  key={p.id}
                                  className={`flex flex-col p-3 border-2 rounded-xl transition-all cursor-pointer group hover:shadow-md ${
                                    String(p.id) === selectedMainProduct 
                                    ? 'bg-orange-600 border-orange-600 text-white' 
                                    : 'bg-white border-slate-200 hover:border-orange-400'
                                  }`}
                                  onClick={() => {
                                    setSelectedMainProduct(String(p.id));
                                    setIsMainSearchOpen(false);
                                    setMainSearchTerm("");
                                  }}
                                >
                                  <div className="flex justify-between items-start mb-1">
                                    <span className={`text-[10px] font-mono font-bold ${String(p.id) === selectedMainProduct ? 'text-orange-100' : 'text-slate-400'}`}>
                                      {p.barcode}
                                    </span>
                                  </div>
                                  <span className="font-bold text-xs leading-tight">{p.name}</span>
                                </div>
                              ))
                            }
                          </div>
                        </div>
                      )}
                      {isEdit && <p className="text-xs text-orange-600 font-bold italic">* Düzenleme modunda ana ürün değiştirilemez.</p>}
                    </div>

                    <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl space-y-2">
                      <div className="flex items-center gap-2 text-orange-800 font-bold text-sm">
                        <Info className="w-4 h-4" />
                        Reçete Mantığı
                      </div>
                      <p className="text-xs text-orange-700 leading-relaxed">
                        Burada tanımladığınız her 1 birim mamul üretildiğinde, sağdaki listedeki hammaddeler belirtilen miktarlarda stoktan otomatik olarak düşülecektir.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sağ Panel: Hammaddeler */}
              <div className="col-span-12 lg:col-span-8">
                <Card className="shadow-lg h-full border-t-4 border-t-blue-600 flex flex-col">
                  <CardHeader className="flex flex-row justify-between items-center border-b bg-slate-50">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Plus className="w-5 h-5 text-blue-600" />
                      2. Adım: Kullanılacak Hammaddeler (BOM Listesi)
                    </CardTitle>
                    <Button onClick={addRecipeItem} variant="outline" className="border-blue-600 text-blue-700 hover:bg-blue-50 font-bold">
                      <Plus className="w-4 h-4 mr-2" /> Hammadde Ekle
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 overflow-y-auto min-h-[500px]">
                    <Table className="min-w-[800px] mb-[250px]">
                      <TableHeader className="bg-slate-100 sticky top-0 z-20">
                        <TableRow>
                          <TableHead className="w-[80px]">Sıra</TableHead>
                          <TableHead className="min-w-[450px]">Hammadde (Barkod / Adı)</TableHead>
                          <TableHead className="w-[180px]">Miktar (1 Mamul İçin)</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recipeItems.map((item, idx) => (
                          <TableRow key={idx} className="hover:bg-blue-50/30">
                            <TableCell className="font-bold text-slate-400">#{idx + 1}</TableCell>
                            <TableCell className="relative p-2">
                              <div 
                                className="flex h-10 w-full items-center justify-between rounded-md border-2 border-slate-200 bg-white px-3 py-0 text-sm cursor-pointer hover:border-blue-400 transition-all overflow-hidden"
                                onClick={() => setOpenItemSearchIdx(openItemSearchIdx === idx ? null : idx)}
                              >
                                <span className={`font-bold truncate whitespace-nowrap max-w-[380px] ${item.product_id ? "text-slate-900" : "text-slate-400"}`}>
                                  {item.product_id 
                                    ? products.find(p => String(p.id) === item.product_id)?.name || "Seçiniz..."
                                    : "Hammadde Seçiniz..."
                                  }
                                </span>
                                <Search className="w-3 h-3 text-slate-400 shrink-0 ml-2" />
                              </div>

                              {openItemSearchIdx === idx && (
                                <div className="absolute left-0 top-full z-[100] w-[500px] mt-1 bg-white border-2 border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                  <div className="p-2 border-b bg-slate-50">
                                    <Input 
                                      placeholder="Hammadde adı veya barkod..." 
                                      value={itemSearchTerms[idx] || ""}
                                      onChange={(e) => setItemSearchTerms({...itemSearchTerms, [idx]: e.target.value})}
                                      autoFocus
                                      className="h-8 text-xs"
                                    />
                                  </div>
                                  <div className="max-h-[300px] overflow-y-auto p-2 grid grid-cols-1 gap-1.5 bg-slate-50/50">
                                    {products
                                      .filter(p => String(p.id) !== selectedMainProduct)
                                      .filter(p => {
                                        const term = itemSearchTerms[idx]?.toLowerCase() || "";
                                        return p.name.toLowerCase().includes(term) || p.barcode.toLowerCase().includes(term);
                                      })
                                      .map(p => {
                                        const totalStock = stocks
                                          .filter(s => s.product_id === p.id)
                                          .reduce((sum, s) => sum + s.quantity, 0);
                                        const isSelected = String(p.id) === item.product_id;
                                        return (
                                          <div 
                                            key={p.id}
                                            className={`flex flex-col p-3 border-2 rounded-xl transition-all cursor-pointer group hover:shadow-md ${
                                              isSelected 
                                              ? 'bg-blue-600 border-blue-600 text-white' 
                                              : 'bg-white border-slate-200 hover:border-blue-400'
                                            }`}
                                            onClick={() => {
                                              updateRecipeItem(idx, "product_id", String(p.id));
                                              setOpenItemSearchIdx(null);
                                              setItemSearchTerms({...itemSearchTerms, [idx]: ""});
                                            }}
                                          >
                                            <div className="flex justify-between items-center mb-1">
                                              <span className={`text-[10px] font-mono font-bold ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                                                {p.barcode}
                                              </span>
                                              <span className={`text-[10px] font-bold ${isSelected ? 'text-white' : 'text-blue-600'}`}>
                                                STOK: {totalStock}
                                              </span>
                                            </div>
                                            <span className="font-bold text-xs leading-tight">{p.name}</span>
                                          </div>
                                        );
                                      })
                                    }
                                  </div>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Input 
                                  type="number" 
                                  min="1" 
                                  step="1"
                                  value={item.quantity}
                                  onChange={e => updateRecipeItem(idx, "quantity", e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === ",") e.preventDefault();
                                  }}
                                  className="font-bold text-lg text-blue-700 border-blue-200 focus-visible:ring-blue-500"
                                />
                                <span className="text-xs font-bold text-slate-500">
                                  {products.find(p => String(p.id) === item.product_id)?.unit || "Birim"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => removeRecipeItem(idx)} className="text-red-500 hover:bg-red-50">
                                <Trash2 className="w-5 h-5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {recipeItems.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-20 text-slate-400 italic">
                              Hammadde listesi boş. Lütfen "Hammadde Ekle" butonu ile ekleme yapın.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                  <div className="p-4 border-t bg-slate-50 text-right">
                    <p className="text-sm font-bold text-slate-600">Toplam {recipeItems.length} Kalem Hammadde Tanımlandı</p>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
