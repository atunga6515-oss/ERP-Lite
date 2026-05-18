"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit, Trash2 } from "lucide-react";
import { Warehouse } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}/api` : "http://localhost:8080/api");

export default function Depolar() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const fetchWarehouses = async () => {
    try {
      const res = await axios.get(`${API_URL}/warehouses`);
      setWarehouses(res.data || []);
    } catch (error) {
      console.error("Error fetching warehouses", error);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    
    setLoading(true);
    try {
      await axios.post(`${API_URL}/warehouses`, { name, description });
      setName("");
      setDescription("");
      fetchWarehouses();
    } catch (error) {
      console.error("Error creating warehouse", error);
      alert("Depo oluşturulurken hata oluştu. Depo ismi benzersiz olmalıdır.");
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (w: Warehouse) => {
    setEditId(w.id);
    setEditName(w.name);
    setEditDescription(w.description);
    setIsEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId || !editName) return;

    try {
      await axios.put(`${API_URL}/warehouses/${editId}`, {
        name: editName,
        description: editDescription
      });
      setIsEditOpen(false);
      fetchWarehouses();
    } catch (error) {
      console.error(error);
      alert("Depo güncellenirken hata oluştu.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bu depoyu silmek istediğinize emin misiniz? (Depoda stok veya hareket kaydı varsa silme işlemi engellenecektir)")) return;
    
    try {
      await axios.delete(`${API_URL}/warehouses/${id}`);
      fetchWarehouses();
    } catch (error) {
      console.error(error);
      alert("Depo silinemedi. Bu depoda muhtemelen ürün stokları veya stok hareketleri bulunuyor.");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Depolar</h1>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Yeni Depo Ekle</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Depo Adı</Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="Örn: Depo-Stok, Üretim" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Açıklama</Label>
                <Input 
                  id="desc" 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="Açıklama" 
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Ekleniyor..." : "Ekle"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Mevcut Depolar</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Adı</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warehouses.map((w: Warehouse) => (
                  <TableRow key={w.id}>
                    <TableCell>{w.id}</TableCell>
                    <TableCell className="font-medium">{w.name}</TableCell>
                    <TableCell>{w.description}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(w)} title="Düzenle">
                        <Edit className="w-4 h-4 text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(w.id)} title="Sil">
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {warehouses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">Kayıtlı depo bulunamadı.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Depo Düzenle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Depo Adı</Label>
              <Input 
                value={editName} 
                onChange={e => setEditName(e.target.value)} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Input 
                value={editDescription} 
                onChange={e => setEditDescription(e.target.value)} 
              />
            </div>
            <Button type="submit" className="w-full">Güncelle</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
