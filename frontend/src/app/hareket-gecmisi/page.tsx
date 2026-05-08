"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const API_URL = typeof window !== "undefined" ? `http://${window.location.hostname}:8080/api` : "http://localhost:8080/api";

export default function HareketGecmisi() {
  const [movements, setMovements] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchMovements = async () => {
      try {
        const res = await axios.get(`${API_URL}/movements?limit=all`);
        setMovements(res.data || []);
      } catch (error) {
        console.error("Error fetching movements", error);
      }
    };
    fetchMovements();
  }, []);

  const filteredMovements = movements.filter((m: any) => 
    m.product?.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.product?.barcode?.includes(search) ||
    m.type?.toLowerCase().includes(search.toLowerCase()) ||
    m.note?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Hareket Geçmişi</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Tüm Stok Hareketleri</CardTitle>
            <Input 
              placeholder="Ürün, Barkod, İşlem veya Not Ara..." 
              className="max-w-md" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>İşlem Türü</TableHead>
                <TableHead>Ürün</TableHead>
                <TableHead>İlgili Firma</TableHead>
                <TableHead>Miktar</TableHead>
                <TableHead>Nereden (Çıkış)</TableHead>
                <TableHead>Nereye (Giriş)</TableHead>
                <TableHead>İşlemi Yapan</TableHead>
                <TableHead>Not</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMovements.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell className="text-sm">
                    {m.timestamp ? format(new Date(m.timestamp), "dd MMM yyyy HH:mm", { locale: tr }) : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.type?.includes("Giriş") ? "default" : m.type?.includes("Çıkış") ? "destructive" : "secondary"}>
                      {m.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {m.product?.name}
                    <div className="text-xs text-muted-foreground">{m.product?.barcode}</div>
                  </TableCell>
                  <TableCell className="text-xs font-bold text-slate-700">
                    {m.customer?.name || (m.type === "Satış" ? "Bilinmeyen Firma" : "-")}
                  </TableCell>
                  <TableCell className="font-bold">{m.quantity} {m.product?.unit}</TableCell>
                  <TableCell>{m.from_warehouse?.name || "-"}</TableCell>
                  <TableCell>{m.to_warehouse?.name || "-"}</TableCell>
                  <TableCell>{m.user?.username || "-"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.note || "-"}</TableCell>
                </TableRow>
              ))}
              {filteredMovements.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">Kayıtlı stok hareketi bulunamadı.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
