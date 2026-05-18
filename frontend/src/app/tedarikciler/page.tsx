"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Truck, Plus, Edit2, Trash2, Mail, Phone, MapPin, UserCheck } from "lucide-react";
import { Supplier } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}/api` : "http://localhost:8080/api");

export default function Tedarikciler() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    authorized_person: "",
    phone: "",
    email: "",
    address: "",
    note: ""
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchSuppliers = async () => {
    try {
      const res = await axios.get(`${API_URL}/suppliers`);
      setSuppliers(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleSubmit = async () => {
    if (!formData.name) {
      alert("Tedarikçi adı zorunludur.");
      return;
    }
    // Duplicate check for NEW suppliers
    if (!editingSupplier) {
      const exists = suppliers.some((s: Supplier) => s.name?.toLocaleLowerCase('tr-TR') === formData.name.toLocaleLowerCase('tr-TR'));
      if (exists) {
        alert("Bu isimde bir tedarikçi zaten kayıtlı!");
        return;
      }
    }
    try {
      if (editingSupplier) {
        await axios.put(`${API_URL}/suppliers/${editingSupplier.id}`, formData);
      } else {
        await axios.post(`${API_URL}/suppliers`, formData);
      }
      setIsDialogOpen(false);
      setEditingSupplier(null);
      setFormData({ name: "", authorized_person: "", phone: "", email: "", address: "", note: "" });
      fetchSuppliers();
    } catch (err: any) {
      alert(err.response?.data?.error || "Bir hata oluştu.");
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name || "",
      authorized_person: supplier.authorized_person || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      note: supplier.note || ""
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bu tedarikçiyi silmek istediğinize emin misiniz?")) return;
    try {
      await axios.delete(`${API_URL}/suppliers/${id}`);
      fetchSuppliers();
    } catch (err: any) {
      alert(err.response?.data?.error || "Tedarikçi silinirken bir hata oluştu.");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Tedarikçi Yönetimi</h1>
        
        <div className="flex flex-wrap gap-2">
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingSupplier(null);
              setFormData({ name: "", authorized_person: "", phone: "", email: "", address: "", note: "" });
            }
          }}>
            <DialogTrigger className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2 rounded-md cursor-pointer transition-colors">
                <Plus className="w-4 h-4" /> Yeni Tedarikçi Ekle
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{editingSupplier ? "Tedarikçi Bilgilerini Düzenle" : "Yeni Tedarikçi Tanımla"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label className="font-bold text-slate-700">Tedarikçi / Firma Adı *</Label>
                  <Input 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    placeholder="Örn: Rulman Sanayi Ltd. Şti." 
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label className="flex items-center gap-2"><UserCheck className="w-4 h-4 text-orange-500"/> Yetkili Kişi</Label>
                  <Input 
                    value={formData.authorized_person} 
                    onChange={e => setFormData({...formData, authorized_person: e.target.value})} 
                    placeholder="Firma Yetkilisi" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Telefon</Label>
                    <Input 
                      value={formData.phone} 
                      onChange={e => setFormData({...formData, phone: e.target.value})} 
                      placeholder="05xx..." 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>E-Posta</Label>
                    <Input 
                      value={formData.email} 
                      onChange={e => setFormData({...formData, email: e.target.value})} 
                      placeholder="mail@tedarikci.com" 
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Adres</Label>
                  <Input 
                    value={formData.address} 
                    onChange={e => setFormData({...formData, address: e.target.value})} 
                    placeholder="Açık adres bilgisi..." 
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Açıklama / Not</Label>
                  <textarea 
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-orange-600"
                    value={formData.note} 
                    onChange={e => setFormData({...formData, note: e.target.value})} 
                    placeholder="Tedarikçi hakkında özel notlar..." 
                  />
                </div>
                <Button onClick={handleSubmit} className="mt-2 w-full h-12 text-lg font-bold bg-orange-600 hover:bg-orange-700">
                  {editingSupplier ? "Değişiklikleri Kaydet" : "Tedarikçiyi Kaydet"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="shadow-md border-t-4 border-t-orange-600">
        <CardHeader className="bg-gray-50 border-b">
          <CardTitle className="text-xl flex items-center gap-2">
            <Truck className="w-5 h-5 text-orange-600" />
            Kayıtlı Tedarikçi Listesi
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[250px]">Tedarikçi / Firma</TableHead>
                  <TableHead>Yetkili</TableHead>
                  <TableHead>İletişim</TableHead>
                  <TableHead>Adres</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((s: Supplier) => (
                  <TableRow key={s.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-bold text-slate-900">
                      <div>{s.name}</div>
                      {s.note && <div className="text-[10px] text-slate-400 font-normal mt-1 italic">{s.note}</div>}
                    </TableCell>
                    <TableCell>
                      {s.authorized_person ? (
                        <div className="flex items-center text-xs font-semibold text-orange-700">
                          <UserCheck className="w-3 h-3 mr-1" /> {s.authorized_person}
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {s.phone && (
                          <div className="flex items-center text-xs text-slate-600">
                            <Phone className="w-3 h-3 mr-1" /> {s.phone}
                          </div>
                        )}
                        {s.email && (
                          <div className="flex items-center text-xs text-slate-600">
                            <Mail className="w-3 h-3 mr-1" /> {s.email}
                          </div>
                        )}
                        {!s.phone && !s.email && "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {s.address ? (
                        <div className="flex items-start text-xs text-slate-600 max-w-[200px] truncate" title={s.address}>
                          <MapPin className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" /> {s.address}
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(s)} className="text-orange-600 hover:text-orange-700 hover:bg-orange-50">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {suppliers.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20 text-slate-400">
                      Henüz hiçbir tedarikçi tanımlanmamış.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
