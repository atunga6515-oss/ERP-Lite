"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Plus, Trash2, Edit2, Building2, Phone, Mail, Globe, MapPin, 
  Upload, X, Building, Image as ImageIcon
} from "lucide-react";
import { IssuingCompany } from "@/types";

const API_URL = typeof window !== "undefined" ? `http://${window.location.hostname}:8080/api` : "http://localhost:8080/api";
const UPLOAD_URL = typeof window !== "undefined" ? `http://${window.location.hostname}:8080` : "http://localhost:8080";

export default function TeklifVerenSirketler() {
  const [companies, setCompanies] = useState<IssuingCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<IssuingCompany | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    web: "",
    logo_path: ""
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const res = await axios.get(`${API_URL}/issuing-companies`);
      setCompanies(res.data || []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (company: IssuingCompany | null = null) => {
    if (company) {
      setEditingCompany(company);
      setFormData({
        name: company.name,
        address: company.address || "",
        phone: company.phone || "",
        email: company.email || "",
        web: company.web || "",
        logo_path: company.logo_path || ""
      });
    } else {
      setEditingCompany(null);
      setFormData({
        name: "",
        address: "",
        phone: "",
        email: "",
        web: "",
        logo_path: ""
      });
    }
    setModalOpen(true);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const uploadData = new FormData();
    uploadData.append("image", file);

    try {
      const res = await axios.post(`${API_URL}/upload`, uploadData);
      setFormData({ ...formData, logo_path: res.data.path });
    } catch (err) {
      alert("Logo yüklenemedi.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCompany) {
        await axios.put(`${API_URL}/issuing-companies/${editingCompany.id}`, formData);
      } else {
        await axios.post(`${API_URL}/issuing-companies`, formData);
      }
      setModalOpen(false);
      fetchCompanies();
    } catch (err) {
      alert("Hata oluştu.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bu şirketi silmek istediğinize emin misiniz?")) return;
    try {
      await axios.delete(`${API_URL}/issuing-companies/${id}`);
      fetchCompanies();
    } catch (err) {
      alert("Silme hatası.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-white shadow-xl">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Teklif Veren Şirketler</h1>
            <p className="text-slate-500 text-sm font-medium mt-0.5">Teklif formunda görünecek firma bilgilerini buradan yönetin.</p>
          </div>
        </div>
        
        <Button 
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white h-14 px-8 rounded-2xl shadow-lg shadow-blue-200 font-black text-sm uppercase tracking-tighter transition-all flex items-center gap-3"
        >
          <Plus className="w-5 h-5" /> YENİ ŞİRKET EKLE
        </Button>
      </div>

      {/* Main List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-64 bg-slate-100 rounded-[2rem] animate-pulse"></div>
          ))
        ) : companies.length === 0 ? (
          <div className="col-span-full py-20 text-center">
            <Building className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-400">Henüz şirket eklenmemiş.</h3>
          </div>
        ) : (
          companies.map((company: IssuingCompany) => (
            <Card key={company.id} className="rounded-[2rem] border-none shadow-2xl shadow-slate-200/50 overflow-hidden group hover:scale-[1.02] transition-all duration-300">
              <CardHeader className="p-0 h-32 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                {company.logo_path ? (
                  <img 
                    src={`${UPLOAD_URL}/${company.logo_path}`} 
                    alt={company.name} 
                    className="max-h-24 max-w-[80%] object-contain z-10"
                  />
                ) : (
                  <Building className="w-12 h-12 text-slate-300" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent"></div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900 line-clamp-1">{company.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <p className="text-xs text-slate-500 font-medium line-clamp-1">{company.address || "Adres belirtilmemiş"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 pt-2">
                  <div className="flex items-center gap-2 text-slate-600">
                    <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
                        <Phone className="w-3 h-3 text-blue-600" />
                    </div>
                    <span className="text-xs font-bold">{company.phone || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <Mail className="w-3 h-3 text-indigo-600" />
                    </div>
                    <span className="text-xs font-bold truncate">{company.email || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <Globe className="w-3 h-3 text-emerald-600" />
                    </div>
                    <span className="text-xs font-bold truncate">{company.web || "-"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleOpenModal(company)}
                    className="flex-1 rounded-xl hover:bg-blue-50 text-blue-600 font-black text-[10px] uppercase tracking-widest"
                  >
                    <Edit2 className="w-3 h-3 mr-2" /> DÜZENLE
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDelete(company.id)}
                    className="rounded-xl hover:bg-red-50 text-red-500 font-black text-[10px] uppercase tracking-widest"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setModalOpen(false)}></div>
          <Card className="relative w-full max-w-xl rounded-[2.5rem] border-none shadow-2xl animate-in zoom-in-95 duration-300">
            <CardHeader className="p-8 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-black text-slate-900">{editingCompany ? "Şirketi Düzenle" : "Yeni Şirket Ekle"}</CardTitle>
                <p className="text-slate-500 text-sm font-medium">Lütfen firma detaylarını eksiksiz giriniz.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setModalOpen(false)} className="rounded-full">
                <X className="w-6 h-6" />
              </Button>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex flex-col items-center gap-4 mb-4">
                    <div className="relative group cursor-pointer" onClick={() => document.getElementById('logo-upload')?.click()}>
                        <div className="w-24 h-24 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-blue-400">
                            {uploading ? (
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            ) : formData.logo_path ? (
                                <img src={`${UPLOAD_URL}/${formData.logo_path}`} className="w-full h-full object-contain" />
                            ) : (
                                <ImageIcon className="w-8 h-8 text-slate-300" />
                            )}
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                            <Upload className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Logo Yükle (Min. 500x500px)</p>
                    <input id="logo-upload" type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-black text-slate-500 uppercase tracking-tighter ml-1">Firma Adı</Label>
                    <Input 
                      required 
                      value={formData.name} 
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black text-slate-500 uppercase tracking-tighter ml-1">Telefon</Label>
                    <Input 
                      value={formData.phone} 
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black text-slate-500 uppercase tracking-tighter ml-1">E-Posta</Label>
                    <Input 
                      type="email"
                      value={formData.email} 
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black text-slate-500 uppercase tracking-tighter ml-1">Web Sitesi</Label>
                    <Input 
                      value={formData.web} 
                      onChange={e => setFormData({ ...formData, web: e.target.value })}
                      className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 font-bold"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label className="text-xs font-black text-slate-500 uppercase tracking-tighter ml-1">Adres</Label>
                    <textarea 
                      value={formData.address} 
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      className="w-full min-h-[100px] p-4 rounded-2xl border border-slate-200 bg-slate-50/50 font-bold text-sm focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="flex-1 h-14 rounded-2xl font-black text-sm uppercase tracking-tighter">İPTAL</Button>
                  <Button type="submit" className="flex-1 h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 font-black text-sm uppercase tracking-tighter">
                    {editingCompany ? "GÜNCELLE" : "KAYDET"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
