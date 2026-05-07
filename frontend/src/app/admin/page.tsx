"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Settings, Users, Shield, Mail, Save, Plus, Trash2, Key, Clock, ShieldCheck, Send, Edit, BellRing, Info, Zap, LayoutGrid, Eye, EyeOff, ShoppingBag, Boxes, ClipboardList, Hammer, Truck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

const API_URL = "http://localhost:8080/api";

const MENU_STRUCTURE = [
  {
    category: "Dashboard & Genel",
    menus: [
      { id: "dashboard", label: "Dashboard" },
      { id: "admin", label: "Sistem Yönetim Merkezi" },
    ]
  },
  {
    category: "Temel Tanımlar",
    menus: [
      { id: "tanimlar", label: "Tanımlamalar (Ürün, Depo, Cari)" }
    ]
  },
  {
    category: "Stok Yönetimi",
    menus: [
      { id: "stok", label: "Stok Listesi & Hareketler" }
    ]
  },
  {
    category: "Operasyonlar",
    menus: [
      { id: "satinalma", label: "Satınalma Yönetimi" },
      { id: "teklif", label: "Teklif Yönetimi" },
      { id: "satis", label: "Satış & Sevkiyat" },
      { id: "uretim", label: "Üretim Planlama & İş Emirleri" }
    ]
  },
  {
    category: "Raporlama",
    menus: [
      { id: "raporlar", label: "Raporlama Merkezi" }
    ]
  }
];

const INITIAL_PERMISSIONS = MENU_STRUCTURE.flatMap(cat => 
  cat.menus.map(m => ({ 
    module_name: m.id, 
    can_access: false
  }))
);

const MODULE_LIST = [
  { id: "tanimlar", label: "Tanımlamalar (Ürün, Depo, Müşteri, Tedarikçi)", icon: "📋", category: "Temel" },
  { id: "stok", label: "Depo & Stok Yönetimi", icon: "📦", category: "Temel" },
  { id: "satinalma", label: "Satınalma Yönetimi", icon: "🛒", category: "Operasyonlar" },
  { id: "teklif", label: "Teklif Yönetimi", icon: "📄", category: "Operasyonlar" },
  { id: "satis", label: "Satış & Sevkiyat", icon: "💰", category: "Operasyonlar" },
  { id: "uretim", label: "Üretim Planlama & İş Emirleri", icon: "🔨", category: "Operasyonlar" },
  { id: "raporlar", label: "Raporlama Merkezi", icon: "📊", category: "Raporlama" },
];

const DEFAULT_ACTIVE_MODULES = ["tanimlar", "stok", "satinalma", "satis", "uretim", "raporlar"];

export default function AdminPage() {
  const [settings, setSettings] = useState<any>({});
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeModules, setActiveModules] = useState<string[]>(DEFAULT_ACTIVE_MODULES);
  
  // New User Form State
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    is_admin: false,
    permissions: INITIAL_PERMISSIONS
  });

  // Edit User State
  const [editUser, setEditUser] = useState<any>({ id: null, email: "", password: "", is_admin: false, permissions: [] });
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);

  // Notification Rules State
  const [notificationRules, setNotificationRules] = useState<any[]>([]);
  const [newRule, setNewRule] = useState({
    flow_name: "PURCHASE",
    trigger_event: "CREATED",
    target_status: "",
    recipient_emails: "",
    manual_recipients: "",
    subject_template: "Yeni Satınalma Talebi: #{ID}",
    body_template: "Merhaba, {SUPPLIER} firmasından #{ID} nolu yeni bir satınalma talebi oluşturulmuştur.\n\nSipariş Verilen Ürünler:\n{PURCHASE_ITEMS}",
    is_active: true
  });
  const [editRule, setEditRule] = useState<any>(null);
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    // Settings
    try {
      const res = await axios.get(`${API_URL}/settings`);
      setSettings(res.data || {});
      // Load active modules from settings
      if (res.data?.active_modules) {
        try {
          setActiveModules(JSON.parse(res.data.active_modules));
        } catch (e) {}
      }
    } catch (err) {
      console.error("Settings load failed", err);
    }

    // Users
    try {
      const res = await axios.get(`${API_URL}/users`);
      setUsers(res.data || []);
    } catch (err) {
      console.error("Users load failed", err);
    }

    // Notifications
    try {
      const res = await axios.get(`${API_URL}/notifications/rules`);
      setNotificationRules(res.data || []);
    } catch (err) {
      console.error("Notification rules load failed", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSettingSave = async (key: string, value: string) => {
    try {
      await axios.post(`${API_URL}/settings`, { [key]: value });
      alert("Ayar kaydedildi.");
      fetchData();
    } catch (err) {
      alert("Hata oluştu.");
    }
  };

  const handleResendEmail = async (userId: number) => {
    if (!confirm("Kullanıcıya şifre belirleme mailini tekrar göndermek istediğinize emin misiniz?")) return;
    try {
      await axios.post(`${API_URL}/users/${userId}/resend-email`);
      alert("Mail başarıyla gönderildi!");
    } catch (err) {
      alert("Mail gönderilirken hata oluştu. SMTP ayarlarınızı kontrol edin.");
    }
  };

  const handleCreateUser = async () => {
    try {
      setLoading(true);
      await axios.post(`${API_URL}/users`, newUser);
      alert("Kullanıcı oluşturuldu ve hoş geldin maili gönderildi.");
      setNewUser({
        username: "",
        email: "",
        password: "",
        is_admin: false,
        permissions: INITIAL_PERMISSIONS
      });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || "Kullanıcı oluşturulamadı.");
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (moduleId: string) => {
    const target = editUser ? editUser : newUser;
    const setter = editUser ? setEditUser : setNewUser;

    const existing = target.permissions.find((p: any) => p.module_name === moduleId);
    let newPermissions;

    if (existing) {
      newPermissions = target.permissions.map((p: any) => 
        p.module_name === moduleId ? { ...p, can_access: !p.can_access } : p
      );
    } else {
      newPermissions = [...target.permissions, { module_name: moduleId, can_access: true }];
    }

    setter({ ...target, permissions: newPermissions });
  };

  const handleUpdateUser = async () => {
    try {
      setLoading(true);
      await axios.put(`${API_URL}/users/${editUser.id}`, { 
        email: editUser.email, 
        password: editUser.password,
        is_admin: editUser.is_admin,
        permissions: editUser.permissions
      });
      alert("Kullanıcı güncellendi.");
      setEditUserDialogOpen(false);
      fetchData();
    } catch (err) {
      alert("Kullanıcı güncellenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRule = async () => {
    try {
      if (editRule) {
        await axios.put(`${API_URL}/notifications/rules/${editRule.id}`, editRule);
      } else {
        await axios.post(`${API_URL}/notifications/rules`, newRule);
      }
      setIsRuleDialogOpen(false);
      setEditRule(null);
      fetchData();
    } catch (err) {
      alert("Kural kaydedilirken hata oluştu.");
    }
  };

  const handleTestRule = async (rule: any) => {
    try {
      setLoading(true);
      await axios.post(`${API_URL}/notifications/rules/${rule.id}/test`);
      alert("Test maili başarıyla gönderildi!");
    } catch (err) {
      alert("Test maili gönderilemedi. SMTP ayarlarınızı kontrol edin.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRule = async (id: number) => {
    if (!confirm("Bu kuralı silmek istediğinize emin misiniz?")) return;
    try {
      await axios.delete(`${API_URL}/notifications/rules/${id}`);
      fetchData();
    } catch (err) {
      alert("Kural silinemedi.");
    }
  };

  const getFlowLabel = (flow: string) => {
    const labels: any = {
      "PURCHASE": "Satınalma",
      "WORK_ORDER": "İş Emri / Üretim",
      "QUOTE": "Teklif",
      "SALE": "Satış / Sevkiyat",
      "STOCK": "Stok Hareketleri",
      "USER": "Kullanıcı İşlemleri"
    };
    return labels[flow] || flow;
  };

  const getEventLabel = (event: string) => {
    const labels: any = {
      "CREATED": "Yeni Kayıt",
      "STATUS_CHANGED": "Durum Değişimi",
      "CRITICAL_STOCK": "Kritik Stok Uyarısı"
    };
    return labels[event] || event;
  };

  const STATUS_OPTIONS: any = {
    "PURCHASE": ["Hazırlanıyor", "Sipariş Verildi", "Depoya Alındı", "İptal"],
    "WORK_ORDER": ["Planlandı", "Üretimde", "Tamamlandı", "İptal"],
    "QUOTE": ["Beklemede", "Gönderildi", "Onaylandı", "Reddedildi", "Satışa Döndü"],
    "SALE": ["Tamamlandı"],
  };

  const DEFAULT_TEMPLATES: any = {
    "PURCHASE_CREATED": {
      subject: "Yeni Satınalma Talebi: #{ID}",
      body: "Merhaba, {SUPPLIER} firmasından #{ID} nolu yeni bir satınalma talebi oluşturulmuştur.\n\nSipariş Verilen Ürünler:\n{PURCHASE_ITEMS}\n\nToplam Tutar: {TOTAL} ₺\nNot: {NOTE}"
    },
    "PURCHASE_STATUS_CHANGED": {
      subject: "Satınalma Durumu Güncellendi: #{ID}",
      body: "Merhaba, #{ID} nolu satınalma talebinin durumu {STATUS} olarak güncellenmiştir."
    },
    "WORK_ORDER_CREATED": {
      subject: "Yeni İş Emri Oluşturuldu: #{ID}",
      body: "Merhaba, {PRODUCT} ürünü için #{ID} nolu yeni bir iş emri oluşturulmuştur.\n\nNot: {NOTE}\n\nÜretim Akış Detayı ve Hammadde İhtiyaç Analizi (Kaynak: Ana Depo):\n{RAW_MATERIALS}"
    },
    "WORK_ORDER_STATUS_CHANGED": {
      subject: "İş Emri Bildirimi: #{ID}",
      body: "Merhaba, {PRODUCT} ürünü için #{ID} nolu iş emrinin durumu {STATUS} olarak güncellenmiştir.\n\nÜretim Akış Detayı ve Hammadde İhtiyaç Analizi (Kaynak: Ana Depo):\n{RAW_MATERIALS}"
    },
    "QUOTE_CREATED": {
      subject: "Yeni Teklif Hazırlandı: #{ID}",
      body: "Merhaba, {CUSTOMER} firması için #{ID} nolu yeni bir teklif oluşturulmuştur."
    },
    "QUOTE_STATUS_CHANGED": {
      subject: "Teklif Durumu Güncellendi: #{ID}",
      body: "Merhaba, {CUSTOMER} firmasına ait #{ID} nolu teklifin durumu {STATUS} olarak güncellenmiştir."
    },
    "SALE_CREATED": {
      subject: "Yeni Satış / Sevkiyat Gerçekleşti: #{ID}",
      body: "Merhaba, {CUSTOMER_NAME} firmasına #{ID} nolu yeni bir satış yapılmıştır.\n\nSatış İçeriği Detayları:\n{SALE_ITEMS}\n\nToplam Tutar: {TOTAL_PRICE} ₺\nNot: {NOTE}"
    },
    "STOCK_CRITICAL_STOCK": {
      subject: "KRİTİK STOK UYARISI: {PRODUCT}",
      body: "Dikkat! {PRODUCT} ürünü kritik stok seviyesine ulaşmıştır. Mevcut Miktar: {QUANTITY}"
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sistem Yönetim Merkezi</h1>
        <p className="text-slate-500 mt-1">v1.2.0 Güvenlik ve Altyapı Ayarları</p>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="bg-slate-100 p-1 border flex-wrap">
          <TabsTrigger value="users" className="gap-2"><Users className="w-4 h-4" /> Kullanıcılar & Yetkiler</TabsTrigger>
          <TabsTrigger value="modules" className="gap-2"><LayoutGrid className="w-4 h-4" /> Modül Yönetimi</TabsTrigger>
          <TabsTrigger value="general" className="gap-2"><Settings className="w-4 h-4" /> Genel Ayarlar</TabsTrigger>
          <TabsTrigger value="smtp" className="gap-2"><Mail className="w-4 h-4" /> SMTP (E-posta)</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2"><BellRing className="w-4 h-4" /> Bildirim Ayarları</TabsTrigger>
          <TabsTrigger value="security" className="gap-2"><Shield className="w-4 h-4" /> Güvenlik</TabsTrigger>
        </TabsList>

        {/* Kullanıcı Yönetimi */}
        <TabsContent value="users">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Kullanıcı Listesi</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchData} className="gap-1">
                <Zap className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Yenile
              </Button>
              <Dialog>
                <DialogTrigger>
                  <div className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-md cursor-pointer transition-colors">
                    <Plus className="w-4 h-4" /> YENİ KULLANICI EKLE
                  </div>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[1000px] w-11/12">
                  <DialogHeader>
                    <DialogTitle>Yeni Kullanıcı Tanımla</DialogTitle>
                    <DialogDescription>Kullanıcıya mail gidecek ve şifresini kendisi belirleyecektir.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Kullanıcı Adı</Label>
                        <Input value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} placeholder="Örn: ahmet.yilmaz" />
                      </div>
                      <div className="space-y-2">
                        <Label>E-posta Adresi</Label>
                        <Input value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} placeholder="ahmet@sirket.com" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Şifre (İsteğe Bağlı)</Label>
                      <Input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} placeholder="Boş bırakılırsa otomatik şifre atanır" />
                    </div>
                    
                    <div className="flex items-center space-x-2 mt-2 p-3 bg-slate-50 rounded-lg border">
                      <Checkbox id="isAdmin" checked={newUser.is_admin} onCheckedChange={(val) => setNewUser({...newUser, is_admin: !!val})} />
                      <Label htmlFor="isAdmin" className="font-bold text-blue-700 cursor-pointer">SİSTEM ADMİNİ (Tüm yetkilere sahip olur)</Label>
                    </div>

                    {!newUser.is_admin && (
                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                        <Label className="text-slate-500 font-bold uppercase text-[10px]">Modül Erişim Yetkileri</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {MENU_STRUCTURE.map(cat => (
                            <div key={cat.category} className="border rounded-lg p-3 bg-slate-50/50 space-y-2">
                              <h4 className="font-bold text-[10px] text-slate-700 uppercase mb-2 border-b pb-1">{cat.category}</h4>
                              {cat.menus.map(m => {
                                const perm = newUser.permissions.find((p: any) => p.module_name === m.id) || { can_access: false };
                                return (
                                  <div key={m.id} className="flex items-center justify-between bg-white p-2 rounded border border-slate-100">
                                    <span className="text-xs font-semibold">{m.label}</span>
                                    <Switch 
                                      checked={perm.can_access} 
                                      onCheckedChange={() => togglePermission(m.id)} 
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateUser} disabled={loading} className="w-full bg-blue-600 h-12 font-bold">
                      {loading ? "Oluşturuluyor..." : "KULLANICIYI OLUŞTUR VE MAİL GÖNDER"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Card className="shadow-lg border-t-4 border-t-blue-600">
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-y-auto border rounded-md">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow className="bg-slate-50">
                    <TableHead>Kullanıcı</TableHead>
                    <TableHead>E-posta</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-bold text-slate-700">{u.username}</TableCell>
                      <TableCell className="text-slate-500 text-sm">{u.email}</TableCell>
                      <TableCell>
                        {u.is_admin ? <Badge className="bg-blue-100 text-blue-700">Admin</Badge> : <Badge variant="outline">Personel</Badge>}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-700">Aktif</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleResendEmail(u.id)} title="Yeniden Mail Gönder" className="text-orange-500 hover:text-orange-700 hover:bg-orange-50"><Send className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { 
                            setEditUser({ 
                              id: u.id, 
                              email: u.email, 
                              password: "",
                              is_admin: u.is_admin,
                              permissions: MENU_STRUCTURE.flatMap(cat => 
                                cat.menus.map(m => {
                                  const existing = u.permissions?.find((p: any) => p.module_name === m.id);
                                  return existing ? { 
                                    module_name: existing.module_name, 
                                    can_access: existing.can_access
                                  } : { 
                                    module_name: m.id, 
                                    can_access: false
                                  };
                                })
                              )
                            }); 
                            setEditUserDialogOpen(true); 
                          }} className="text-blue-600 hover:bg-blue-50"><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-slate-400">
                        Kullanıcı kaydı bulunamadı veya veriler yüklenemedi.
                      </TableCell>
                    </TableRow>
                  )}
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-blue-600">
                        Yükleniyor...
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          </Card>

          <Dialog open={editUserDialogOpen} onOpenChange={setEditUserDialogOpen}>
            <DialogContent className="sm:max-w-[1000px] w-11/12">
              <DialogHeader>
                <DialogTitle>Kullanıcı Düzenle</DialogTitle>
                <DialogDescription>Kullanıcının e-posta adresini veya şifresini güncelleyebilirsiniz.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>E-posta Adresi</Label>
                    <Input value={editUser.email} onChange={e => setEditUser({...editUser, email: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Yeni Şifre</Label>
                    <Input type="password" value={editUser.password} onChange={e => setEditUser({...editUser, password: e.target.value})} placeholder="Şifreyi değiştirmek istemiyorsanız boş bırakın" />
                  </div>
                </div>

                <div className="flex items-center space-x-2 mt-4 p-3 bg-slate-50 rounded-lg border">
                  <Checkbox id="editIsAdmin" checked={editUser.is_admin} onCheckedChange={(val) => setEditUser({...editUser, is_admin: !!val})} />
                  <Label htmlFor="editIsAdmin" className="font-bold text-blue-700 cursor-pointer">SİSTEM ADMİNİ (Tüm yetkilere sahip olur)</Label>
                </div>

                {editUser.is_admin ? (
                  <div className="p-10 text-center bg-blue-50 rounded-xl border-2 border-dashed border-blue-200 mt-4">
                    <p className="text-blue-700 font-bold">Sistem Admini tüm yetkilere sahiptir.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    {MENU_STRUCTURE.map(cat => (
                      <div key={cat.category} className="border rounded-lg p-3 bg-slate-50/50 space-y-2">
                        <h4 className="font-bold text-[10px] text-slate-700 uppercase mb-2 border-b pb-1">{cat.category}</h4>
                        {cat.menus.map(m => {
                          const perm = editUser.permissions?.find((p: any) => p.module_name === m.id) || { can_access: false };
                          return (
                            <div key={`edit-${m.id}`} className="flex items-center justify-between bg-white p-2 rounded border border-slate-100">
                              <span className="text-xs font-semibold">{m.label}</span>
                              <Switch 
                                checked={perm.can_access} 
                                onCheckedChange={() => togglePermission(m.id)} 
                              />
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button onClick={handleUpdateUser} disabled={loading} className="w-full bg-blue-600">
                  {loading ? "GÜNCELLENİYOR..." : "KAYDET"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Genel Ayarlar */}
        <TabsContent value="general">
          <Card className="shadow-lg border-t-4 border-t-slate-800">
            <CardHeader>
              <CardTitle>Şirket Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading && <div className="text-center py-4 text-blue-600">Yükleniyor...</div>}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Şirket Adı</Label>
                  <div className="flex gap-2">
                    <Input key={`cn-${settings.company_name || 'empty'}`} defaultValue={settings.company_name || ""} id="company_name" />
                    <Button onClick={() => handleSettingSave("company_name", (document.getElementById("company_name") as HTMLInputElement).value)}>
                      <Save className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Şirket Logosu (URL)</Label>
                  <div className="flex gap-2">
                    <Input key={`cl-${settings.company_logo || 'empty'}`} defaultValue={settings.company_logo || ""} id="company_logo" />
                    <Button onClick={() => handleSettingSave("company_logo", (document.getElementById("company_logo") as HTMLInputElement).value)}>
                      <Save className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMTP Ayarları */}
        <TabsContent value="smtp">
          <Card className="shadow-lg border-t-4 border-t-orange-500">
            <CardHeader>
              <CardTitle>E-posta Sunucu Ayarları</CardTitle>
              <CardDescription>Sistemin e-posta gönderebilmesi için SMTP bilgilerini yapılandırın.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2 max-w-sm">
                <Label>SMTP Servis Sağlayıcı</Label>
                <div className="flex gap-2">
                  <Select 
                    key={`smtp-prov-${settings.smtp_provider}`}
                    value={settings.smtp_provider || "gmail"} 
                    onValueChange={(val) => handleSettingSave("smtp_provider", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seçiniz..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gmail">Gmail</SelectItem>
                      <SelectItem value="custom">Özel SMTP Sunucusu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(settings.smtp_provider === "custom") && (
                <div className="grid grid-cols-2 gap-6 p-4 bg-slate-50 rounded-lg border">
                  <div className="space-y-2">
                    <Label>SMTP Sunucu (Host)</Label>
                    <div className="flex gap-2">
                      <Input key={`sh-${settings.smtp_host}`} defaultValue={settings.smtp_host || ""} id="smtp_host" placeholder="smtp.sirket.com" />
                      <Button onClick={() => handleSettingSave("smtp_host", (document.getElementById("smtp_host") as HTMLInputElement).value)}>
                        <Save className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>SMTP Port</Label>
                    <div className="flex gap-2">
                      <Input key={`spo-${settings.smtp_port}`} defaultValue={settings.smtp_port || "587"} id="smtp_port" placeholder="587" />
                      <Button onClick={() => handleSettingSave("smtp_port", (document.getElementById("smtp_port") as HTMLInputElement).value)}>
                        <Save className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Mail className="w-4 h-4 text-orange-500" /> Gönderici E-posta</Label>
                  <div className="flex gap-2">
                    <Input key={`se-${settings.smtp_email}`} defaultValue={settings.smtp_email || ""} id="smtp_email" placeholder={settings.smtp_provider === 'gmail' ? "example@gmail.com" : "kurumsal@sirket.com"} />
                    <Button onClick={() => handleSettingSave("smtp_email", (document.getElementById("smtp_email") as HTMLInputElement).value)}>
                      <Save className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-orange-500" /> {settings.smtp_provider === "custom" ? "SMTP Şifresi" : "Gmail Uygulama Şifresi"}</Label>
                  <div className="flex gap-2">
                    <Input key={`sp-${settings.smtp_password}`} defaultValue={settings.smtp_password || ""} type="password" id="smtp_password" placeholder="•••• •••• •••• ••••" />
                    <Button onClick={() => handleSettingSave("smtp_password", (document.getElementById("smtp_password") as HTMLInputElement).value)}>
                      <Save className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              {settings.smtp_provider !== "custom" && (
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-100 text-sm text-orange-700">
                  <strong>Not:</strong> Gmail kullanırken 2 adımlı doğrulamayı açmalı ve "Uygulama Şifreleri" kısmından ERP Lite için özel bir şifre almalısınız.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bildirim Ayarları */}
        <TabsContent value="notifications">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-bold">Otomatik Bildirim Kuralları</h2>
              <p className="text-xs text-slate-500">İş akışlarına bağlı mail tetikleyicileri.</p>
            </div>
            <Button 
              onClick={() => { 
                setEditRule(null); 
                setNewRule({
                  flow_name: 'PURCHASE',
                  trigger_event: 'CREATED',
                  target_status: '',
                  recipient_emails: '',
                  manual_recipients: '',
                  subject_template: DEFAULT_TEMPLATES['PURCHASE_CREATED'].subject,
                  body_template: DEFAULT_TEMPLATES['PURCHASE_CREATED'].body,
                  is_active: true
                });
                setIsRuleDialogOpen(true); 
              }} 
              className="bg-orange-600 hover:bg-orange-700 font-bold gap-2 shadow-lg shadow-orange-500/20"
            >
              <Plus className="w-4 h-4" /> YENİ KURAL EKLE
            </Button>
          </div>

          <Card className="shadow-lg border-t-4 border-t-orange-600">
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-y-auto border rounded-md">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow className="bg-slate-50">
                    <TableHead>Akış / Olay</TableHead>
                    <TableHead>Hedef Durum</TableHead>
                    <TableHead>Alıcılar</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notificationRules.map((rule) => (
                    <TableRow key={rule.id} className="group hover:bg-slate-50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            rule.flow_name === 'PURCHASE' ? 'bg-blue-50 text-blue-600' :
                            rule.flow_name === 'WORK_ORDER' ? 'bg-purple-50 text-purple-600' :
                            rule.flow_name === 'QUOTE' ? 'bg-orange-50 text-orange-600' :
                            rule.flow_name === 'SALE' ? 'bg-green-50 text-green-600' :
                            rule.flow_name === 'STOCK' ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-600'
                          }`}>
                            {rule.flow_name === 'PURCHASE' && <ShoppingBag size={18} />}
                            {rule.flow_name === 'WORK_ORDER' && <Hammer size={18} />}
                            {rule.flow_name === 'QUOTE' && <ClipboardList size={18} />}
                            {rule.flow_name === 'SALE' && <Truck size={18} />}
                            {rule.flow_name === 'STOCK' && <Boxes size={18} />}
                            {rule.flow_name === 'USER' && <Users size={18} />}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-700">{getFlowLabel(rule.flow_name)}</span>
                            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{getEventLabel(rule.trigger_event)}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {rule.target_status ? (
                          <div className="flex flex-wrap gap-1">
                            {rule.target_status.split(",").map((s: string) => (
                              <Badge key={s} variant="outline" className="text-[10px] border-slate-200 bg-white">{s.trim()}</Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">- Tüm Olaylar -</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                            <Users className="w-3 h-3 text-blue-500" />
                            <span className="truncate max-w-[150px]">{rule.recipient_emails || "Kullanıcı Seçilmedi"}</span>
                          </div>
                          {rule.manual_recipients && (
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                              <Mail className="w-3 h-3" />
                              <span className="truncate max-w-[150px]">{rule.manual_recipients}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch checked={rule.is_active} onCheckedChange={async (val) => {
                            await axios.put(`${API_URL}/notifications/rules/${rule.id}`, { ...rule, is_active: val });
                            fetchData();
                          }} />
                          <span className={`text-[10px] font-bold uppercase ${rule.is_active ? 'text-green-600' : 'text-slate-400'}`}>
                            {rule.is_active ? 'Aktif' : 'Pasif'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" onClick={() => handleTestRule(rule)} className="h-8 w-8 text-orange-600 hover:bg-orange-50" title="Test Gönder"><Send className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { setEditRule(rule); setIsRuleDialogOpen(true); }} className="h-8 w-8 text-blue-600 hover:bg-blue-50"><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteRule(rule.id)} className="h-8 w-8 text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          </Card>

          <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
            <DialogContent className="sm:max-w-[950px] w-11/12 p-0 overflow-hidden border-none shadow-2xl">
              <div className="bg-slate-900 px-6 py-8 text-white relative">
                <DialogTitle className="text-2xl font-black tracking-tight">{editRule ? "Kuralı Düzenle" : "Yeni Bildirim Kuralı"}</DialogTitle>
                <DialogDescription className="text-slate-400 mt-1">Sistemdeki akışlara bağlı otomatik bildirim tetikleyicilerini yapılandırın.</DialogDescription>
                <BellRing className="absolute right-6 top-8 w-12 h-12 text-orange-500 opacity-20" />
              </div>
              
              <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 max-h-[80vh] overflow-y-auto bg-white">
                {/* Left Side: Configuration */}
                <div className="lg:col-span-7 space-y-8">
                  {/* Section 1: Trigger */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2">
                      <Zap className="w-4 h-4 text-orange-500" /> 1. Tetikleyici Koşulları
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-600">Akış Tipi</Label>
                        <Select 
                          value={editRule ? editRule.flow_name : newRule.flow_name} 
                          onValueChange={(val) => {
                            const event = editRule ? editRule.trigger_event : newRule.trigger_event;
                            const template = DEFAULT_TEMPLATES[`${val}_${event}`] || { subject: "", body: "" };
                            const setter = editRule ? setEditRule : setNewRule;
                            setter((prev: any) => ({
                              ...prev,
                              flow_name: val,
                              target_status: "",
                              subject_template: template.subject,
                              body_template: template.body
                            }));
                          }}
                        >
                          <SelectTrigger className="h-11 bg-slate-50">
                            <SelectValue placeholder="Seçiniz" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PURCHASE">Satınalma</SelectItem>
                            <SelectItem value="WORK_ORDER">İş Emri / Üretim</SelectItem>
                            <SelectItem value="QUOTE">Teklif</SelectItem>
                            <SelectItem value="SALE">Satış / Sevkiyat</SelectItem>
                            <SelectItem value="STOCK">Stok Hareketleri</SelectItem>
                            <SelectItem value="USER">Kullanıcı İşlemleri</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-600">Olay</Label>
                        <Select 
                          value={editRule ? editRule.trigger_event : newRule.trigger_event} 
                          onValueChange={(val) => {
                            const flow = editRule ? editRule.flow_name : newRule.flow_name;
                            const template = DEFAULT_TEMPLATES[`${flow}_${val}`] || { subject: "", body: "" };
                            const setter = editRule ? setEditRule : setNewRule;
                            setter((prev: any) => ({
                              ...prev,
                              trigger_event: val,
                              target_status: val !== 'STATUS_CHANGED' ? "" : prev.target_status,
                              subject_template: template.subject,
                              body_template: template.body
                            }));
                          }}
                        >
                          <SelectTrigger className="h-11 bg-slate-50">
                            <SelectValue placeholder="Seçiniz" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CREATED">Yeni Kayıt Oluştuğunda</SelectItem>
                            <SelectItem value="STATUS_CHANGED">Durum Değiştiğinde</SelectItem>
                            <SelectItem value="CRITICAL_STOCK">Kritik Stok Seviyesi</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {((editRule ? editRule.trigger_event : newRule.trigger_event) === 'STATUS_CHANGED') && (
                      <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3">
                        <Label className="text-[11px] font-bold text-blue-700 uppercase">Hangi durumlarda mail gönderilsin?</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {(STATUS_OPTIONS[editRule ? editRule.flow_name : newRule.flow_name] || []).map((status: string) => {
                            const current = (editRule ? editRule.target_status : newRule.target_status || "").split(",").map((s: string) => s.trim()).filter(Boolean);
                            const isChecked = current.includes(status.trim());
                            return (
                              <div key={status} className="flex items-center space-x-2 bg-white p-2 rounded-lg border border-slate-200">
                                <Checkbox 
                                  id={`status-${status}`} 
                                  checked={isChecked}
                                  onCheckedChange={(checked) => {
                                    const updated = checked ? [...current, status].join(",") : current.filter(s => s !== status).join(",");
                                    editRule ? setEditRule({...editRule, target_status: updated}) : setNewRule({...newRule, target_status: updated});
                                  }}
                                />
                                <Label htmlFor={`status-${status}`} className="text-xs cursor-pointer">{status}</Label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 2: Recipients */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2">
                      <Users className="w-4 h-4 text-blue-500" /> 2. Alıcı Tanımları
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-600">Sistem Kullanıcılarını Seçin</Label>
                        <div className="border rounded-xl p-3 bg-slate-50 grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto">
                          {users.map(user => {
                            const current = (editRule ? editRule.recipient_emails : newRule.recipient_emails) || "";
                            const emailList = current.split(",").map(e => e.trim()).filter(Boolean);
                            const isSelected = emailList.includes(user.email);
                            return (
                              <div key={user.id} className="flex items-center space-x-2 bg-white p-2 rounded-lg border border-slate-200 hover:border-blue-300 transition-all shadow-sm">
                                <Checkbox 
                                  id={`rec-${user.id}`} 
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    const newList = checked ? Array.from(new Set([...emailList, user.email])) : emailList.filter(e => e !== user.email);
                                    const finalStr = newList.join(", ");
                                    editRule ? setEditRule({...editRule, recipient_emails: finalStr}) : setNewRule({...newRule, recipient_emails: finalStr});
                                  }}
                                />
                                <Label htmlFor={`rec-${user.id}`} className="text-[11px] font-bold truncate cursor-pointer flex flex-col">
                                  <span>{user.username}</span>
                                  <span className="text-[9px] text-slate-400 font-normal">{user.email}</span>
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-600 flex justify-between items-center">
                          Harici E-posta Adresleri
                          <span className="text-[10px] text-slate-400 font-normal">Virgül ile ayırın</span>
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                          <Input 
                            className="pl-9 bg-slate-50"
                            placeholder="tedarikci@mail.com, yonetim@sirket.com"
                            value={editRule ? editRule.manual_recipients : newRule.manual_recipients}
                            onChange={(e) => editRule ? setEditRule({...editRule, manual_recipients: e.target.value}) : setNewRule({...newRule, manual_recipients: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Template */}
                <div className="lg:col-span-5 space-y-6 lg:border-l lg:pl-8">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2">
                    <Edit className="w-4 h-4 text-blue-600" /> 3. Mesaj Şablonu
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-600">E-posta Konusu</Label>
                      <Input 
                        value={editRule ? editRule.subject_template : newRule.subject_template}
                        onChange={(e) => editRule ? setEditRule({...editRule, subject_template: e.target.value}) : setNewRule({...newRule, subject_template: e.target.value})}
                        className="bg-slate-50 font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-600">Mesaj İçeriği</Label>
                      <Textarea 
                        rows={6}
                        value={editRule ? editRule.body_template : newRule.body_template}
                        onChange={(e) => editRule ? setEditRule({...editRule, body_template: e.target.value}) : setNewRule({...newRule, body_template: e.target.value})}
                        className="bg-slate-50 text-sm leading-relaxed"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-[10px] font-black text-slate-400 uppercase">Kullanılabilir Etiketler</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { tag: "{ID}", label: "ID" },
                          { tag: "{PRODUCT}", label: "Ürün" },
                          { tag: "{STATUS}", label: "Durum" },
                          { tag: "{CUSTOMER}", label: "Müşteri" },
                          { tag: "{SUPPLIER}", label: "Tedarikçi" },
                          { tag: "{QUANTITY}", label: "Miktar" },
                          { tag: "{TOTAL}", label: "Toplam Tutar" },
                          { tag: "{RAW_MATERIALS}", label: "Hammadde Listesi" },
                          { tag: "{PURCHASE_ITEMS}", label: "Satınalma Ürünleri" }
                        ].map(item => (
                          <Badge key={item.tag} variant="secondary" className="text-[9px] py-1 px-2 border border-slate-200 bg-white">
                            <span className="font-bold mr-1 text-blue-600">{item.tag}</span>
                            <span className="text-slate-400 text-[8px]">{item.label}</span>
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-orange-50 rounded-xl border border-orange-100 shadow-inner">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-orange-700 uppercase mb-2">
                        <Eye className="w-3 h-3" /> Canlı Önizleme
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-700">{(editRule ? editRule.subject_template : newRule.subject_template).replace("{ID}", "#123").replace("{PRODUCT}", "Örnek Ürün")}</p>
                        <p className="text-[11px] text-slate-500 leading-relaxed italic whitespace-pre-wrap">
                          {(editRule ? editRule.body_template : newRule.body_template)
                            .replace("{ID}", "123")
                            .replace("#{ID}", "#123")
                            .replace("{PRODUCT}", "ÖRNEK ÜRÜN")
                            .replace("{STATUS}", "ÜRETİMDE")
                            .replace("{CUSTOMER}", "ÖRNEK MÜŞTERİ")
                            .replace("{SUPPLIER}", "ÖRNEK TEDARİKÇİ")
                            .replace("{QUANTITY}", "100")
                            .replace("{TOTAL}", "1,250.00")
                            .replace("{RAW_MATERIALS}", "(Hammadde Analiz Tablosu Burada Görünecek)")
                            .replace("{PURCHASE_ITEMS}", "(Satınalma Ürün Tablosu Burada Görünecek)")
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t flex justify-between items-center">
                <Button variant="ghost" onClick={() => setIsRuleDialogOpen(false)} className="text-slate-500 font-bold">Vazgeç</Button>
                <div className="flex gap-3">
                  {editRule && (
                    <Button variant="outline" onClick={() => handleTestRule(editRule)} className="border-orange-200 text-orange-600 hover:bg-orange-50 font-bold h-11">
                      <Send className="w-4 h-4 mr-2" /> TEST GÖNDER
                    </Button>
                  )}
                  <Button onClick={handleSaveRule} className="bg-orange-600 hover:bg-orange-700 text-white font-bold h-11 px-8 shadow-lg shadow-orange-500/20">
                    <Save className="w-4 h-4 mr-2" /> {editRule ? "DEĞİŞİKLİKLERİ KAYDET" : "KURALI OLUŞTUR"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Modül Yönetimi */}
        <TabsContent value="modules">
          <Card className="shadow-lg border-t-4 border-t-indigo-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><LayoutGrid className="w-5 h-5 text-indigo-600" /> Aktif Modül Yönetimi</CardTitle>
              <CardDescription>Uygulamada hangi modüllerin görünür olacağını buradan kontrol edin. Kapatılan modüller tüm kullanıcıların menüsünden gizlenir.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {MODULE_LIST.map(mod => {
                  const isActive = activeModules.includes(mod.id);
                  return (
                    <div key={mod.id} className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                      isActive 
                        ? 'bg-white border-indigo-200 shadow-sm' 
                        : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{mod.icon}</span>
                        <div>
                          <p className="font-bold text-sm">{mod.label}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{mod.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isActive ? (
                          <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]"><Eye className="w-3 h-3 mr-1" /> Aktif</Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[10px]"><EyeOff className="w-3 h-3 mr-1" /> Pasif</Badge>
                        )}
                        <Switch 
                          checked={isActive} 
                          onCheckedChange={(checked) => {
                            const newModules = checked
                              ? [...activeModules, mod.id]
                              : activeModules.filter(m => m !== mod.id);
                            setActiveModules(newModules);
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end pt-4 border-t">
                <Button 
                  onClick={async () => {
                    try {
                      await axios.post(`${API_URL}/settings`, { active_modules: JSON.stringify(activeModules) });
                      alert("Modül ayarları kaydedildi. Değişikliklerin yansıması için sayfayı yenileyebilirsiniz.");
                    } catch (err) {
                      alert("Modül ayarları kaydedilirken hata oluştu.");
                    }
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 font-bold h-12 px-8 gap-2"
                >
                  <Save className="w-4 h-4" /> MODÜL AYARLARINI KAYDET
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Güvenlik Ayarları */}
        <TabsContent value="security">
          <Card className="shadow-lg border-t-4 border-t-red-600">
            <CardHeader>
              <CardTitle>Oturum ve Güvenlik</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 max-w-sm">
                <Label className="flex items-center gap-2"><Clock className="w-4 h-4 text-red-500" /> Oturum Zaman Aşımı (Dakika)</Label>
                <div className="flex gap-2">
                  <Input key={`st-${settings.session_timeout}`} type="number" defaultValue={settings.session_timeout || "5"} id="session_timeout" />
                  <Button onClick={() => handleSettingSave("session_timeout", (document.getElementById("session_timeout") as HTMLInputElement).value)}>
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">Kullanıcı belirlenen süre boyunca işlem yapmazsa otomatik olarak sistemden atılır.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
