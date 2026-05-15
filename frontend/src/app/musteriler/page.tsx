"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Edit2, Trash2, Mail, Phone, MapPin, UserCheck, UserPlus, FileSpreadsheet, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { Customer } from "@/types";

const API_URL = typeof window !== "undefined" ? `http://${window.location.hostname}:8080/api` : "http://localhost:8080/api";

export default function Musteriler() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    authorized_person: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    note: ""
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchCustomers = async () => {
    try {
      const res = await axios.get(`${API_URL}/customers`);
      // Note: Backend JSON keys are now lowercase/snake_case due to tags
      setCustomers(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSubmit = async () => {
    if (!formData.name) {
      alert("Müşteri adı zorunludur.");
      return;
    }

    // Duplicate check for NEW customers
    if (!editingCustomer) {
      const exists = customers.some((c: Customer) => c.name?.toLocaleLowerCase('tr-TR') === formData.name.toLocaleLowerCase('tr-TR'));
      if (exists) {
        alert("Bu isimde bir müşteri zaten kayıtlı!");
        return;
      }
    }

    try {
      if (editingCustomer) {
        await axios.put(`${API_URL}/customers/${editingCustomer.id}`, formData);
      } else {
        await axios.post(`${API_URL}/customers`, formData);
      }
      setIsDialogOpen(false);
      setEditingCustomer(null);
      setFormData({ name: "", authorized_person: "", contact_person: "", phone: "", email: "", address: "", note: "" });
      fetchCustomers();
    } catch (err: any) {
      alert(err.response?.data?.error || "Bir hata oluştu.");
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || "",
      authorized_person: customer.authorized_person || "",
      contact_person: customer.contact_person || "",
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      note: customer.note || ""
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!id) {
      alert("Hata: Geçersiz Müşteri ID");
      return;
    }
    if (!confirm("Bu müşteriyi silmek istediğinize emin misiniz?")) return;
    try {
      await axios.delete(`${API_URL}/customers/${id}`);
      fetchCustomers();
    } catch (err: any) {
      alert(err.response?.data?.error || "Müşteri silinirken bir hata oluştu. Üzerinde kayıtlı satışlar olabilir.");
    }
  };

  const exportToExcel = () => {
    const data = customers.map((c: Customer) => ({
      "Firma Adı": c.name,
      "Yetkili Kişi": c.authorized_person || "",
      "İlgili Kişi": c.contact_person || "",
      "Telefon": c.phone || "",
      "E-Posta": c.email || "",
      "Adres": c.address || "",
      "Not": c.note || ""
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Müşteriler");
    XLSX.writeFile(wb, `Musteri_Listesi_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
  };

  const handleImport = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data: any[] = XLSX.utils.sheet_to_json(ws);

      const findCol = (item: any, names: string[]) => {
        const foundKey = Object.keys(item).find(key => 
          names.some(name => key.toLocaleLowerCase('tr-TR').trim() === name.toLocaleLowerCase('tr-TR').trim())
        );
        return foundKey ? String(item[foundKey] || "").trim() : "";
      };

      const formattedData = data.map((item: any) => ({
        name: findCol(item, ["Firma Adı", "Firma", "Müşteri", "Customer", "Name", "Firma Adi"]),
        authorized_person: findCol(item, ["Yetkili Kişi", "Yetkili", "Authorized", "Yetkili Kisi"]),
        contact_person: findCol(item, ["İlgili Kişi", "İlgili", "Contact", "Ilgili Kisi"]),
        phone: findCol(item, ["Telefon", "Tel", "Phone", "Mobile"]),
        email: findCol(item, ["E-Posta", "Email", "Mail", "Eposta"]),
        address: findCol(item, ["Adres", "Address", "Adresi"]),
        note: findCol(item, ["Not", "Note", "Açıklama", "Aciklama"])
      })).filter(item => item.name.length > 0);

      if (formattedData.length > 0) {
        try {
          await axios.post(`${API_URL}/customers/bulk`, formattedData);
          alert(`${formattedData.length} müşteri incelendi ve yeni olanlar başarıyla içeri aktarıldı.`);
          fetchCustomers();
        } catch (err: any) {
          alert("İçeri aktarma sırasında hata oluştu: " + (err.response?.data?.error || err.message));
        } finally {
          e.target.value = "";
        }
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Müşteri Yönetimi</h1>
        
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportToExcel} className="border-green-600 text-green-700 hover:bg-green-50">
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel'e Aktar
          </Button>
          
          <div className="relative">
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              onChange={handleImport}
              className="absolute inset-0 opacity-0 cursor-pointer"
              id="excel-upload"
            />
            <Button variant="outline" className="border-blue-600 text-blue-700 hover:bg-blue-50">
              <Upload className="w-4 h-4 mr-2" /> Excel'den Yükle
            </Button>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingCustomer(null);
              setFormData({ name: "", authorized_person: "", contact_person: "", phone: "", email: "", address: "", note: "" });
            }
          }}>
            <DialogTrigger className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-md cursor-pointer transition-colors">
                <UserPlus className="w-4 h-4" /> Yeni Müşteri Ekle
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{editingCustomer ? "Müşteri Bilgilerini Düzenle" : "Yeni Müşteri Tanımla"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label className="font-bold text-slate-700">Müşteri / Firma Adı *</Label>
                  <Input 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    placeholder="Örn: ABC Teknolojileri A.Ş." 
                    className="border-slate-300 focus:ring-blue-500"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="flex items-center gap-2"><UserCheck className="w-4 h-4 text-blue-500"/> Yetkili Kişi</Label>
                    <Input 
                      value={formData.authorized_person} 
                      onChange={e => setFormData({...formData, authorized_person: e.target.value})} 
                      placeholder="Firma Yetkilisi" 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="flex items-center gap-2"><UserPlus className="w-4 h-4 text-blue-500"/> İlgili Kişi</Label>
                    <Input 
                      value={formData.contact_person} 
                      onChange={e => setFormData({...formData, contact_person: e.target.value})} 
                      placeholder="Operasyonel İrtibat" 
                    />
                  </div>
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
                      placeholder="mail@firma.com" 
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
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600"
                    value={formData.note} 
                    onChange={e => setFormData({...formData, note: e.target.value})} 
                    placeholder="Müşteri hakkında özel notlar..." 
                  />
                </div>
                <Button onClick={handleSubmit} className="mt-2 w-full h-12 text-lg font-bold bg-blue-600 hover:bg-blue-700">
                  {editingCustomer ? "Değişiklikleri Kaydet" : "Müşteriyi Kaydet"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="shadow-md border-t-4 border-t-blue-600">
        <CardHeader className="bg-gray-50 border-b">
          <CardTitle className="text-xl flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Kayıtlı Müşteri Listesi
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[200px]">Müşteri / Firma</TableHead>
                  <TableHead>Yetkililer</TableHead>
                  <TableHead>İletişim</TableHead>
                  <TableHead>Adres</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c: Customer) => (
                  <TableRow key={c.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-bold text-slate-900">
                      <div>{c.name}</div>
                      {c.note && <div className="text-[10px] text-slate-400 font-normal mt-1 italic">{c.note}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {c.authorized_person && (
                          <div className="flex items-center text-xs font-semibold text-blue-700">
                            <UserCheck className="w-3 h-3 mr-1" /> {c.authorized_person}
                          </div>
                        )}
                        {c.contact_person && (
                          <div className="flex items-center text-xs text-slate-600">
                            <UserPlus className="w-3 h-3 mr-1" /> {c.contact_person}
                          </div>
                        )}
                        {!c.authorized_person && !c.contact_person && "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {c.phone && (
                          <div className="flex items-center text-xs text-slate-600">
                            <Phone className="w-3 h-3 mr-1" /> {c.phone}
                          </div>
                        )}
                        {c.email && (
                          <div className="flex items-center text-xs text-slate-600">
                            <Mail className="w-3 h-3 mr-1" /> {c.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {c.address ? (
                        <div className="flex items-start text-xs text-slate-600 max-w-[200px] truncate" title={c.address}>
                          <MapPin className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" /> {c.address}
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(c)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {customers.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20 text-slate-400">
                      Henüz hiçbir müşteri tanımlanmamış.
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
