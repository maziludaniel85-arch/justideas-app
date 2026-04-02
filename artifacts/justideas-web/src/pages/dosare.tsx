import { useListDosare, getListDosareQueryKey, ListDosareStatus } from "@workspace/api-client-react";
import { Link } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, FileText, ChevronRight } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

const statusConfig: Record<string, { label: string; color: string }> = {
  ciorna: { label: "Ciornă", color: "bg-gray-100 text-gray-800" },
  in_asteptare: { label: "În Așteptare", color: "bg-yellow-100 text-yellow-800" },
  in_procesare: { label: "În Procesare", color: "bg-blue-100 text-blue-800" },
  aprobat: { label: "Aprobat", color: "bg-green-100 text-green-800" },
  respins: { label: "Respins", color: "bg-red-100 text-red-800" },
};

export default function Dosare() {
  const [cautare, setCautare] = useState("");
  const [status, setStatus] = useState<ListDosareStatus | "toate">("toate");

  const queryParams = {
    ...(cautare ? { cautare } : {}),
    ...(status !== "toate" ? { status: status as ListDosareStatus } : {}),
  };

  const { data: dosare, isLoading, error } = useListDosare(queryParams, {
    query: {
      queryKey: getListDosareQueryKey(queryParams),
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dosarele Mele</h1>
          <p className="text-muted-foreground mt-1">Gestionați dosarele de înregistrare firme.</p>
        </div>
        <Button asChild data-testid="button-create-dosar">
          <Link href="/dosare/nou">
            <Plus className="mr-2 h-4 w-4" /> Dosar Nou
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Căutare dosar..."
            value={cautare}
            onChange={(e) => setCautare(e.target.value)}
            className="pl-9"
            data-testid="input-search-dosare"
          />
        </div>
        <Select value={status} onValueChange={(val: any) => setStatus(val)} data-testid="select-status-filter">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrare status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="toate">Toate statusurile</SelectItem>
            <SelectItem value="ciorna">Ciornă</SelectItem>
            <SelectItem value="in_asteptare">În Așteptare</SelectItem>
            <SelectItem value="in_procesare">În Procesare</SelectItem>
            <SelectItem value="aprobat">Aprobat</SelectItem>
            <SelectItem value="respins">Respins</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center"><Spinner className="size-8" /></div>
      ) : error ? (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">Nu s-au putut încărca dosarele.</div>
      ) : !dosare || dosare.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium">Niciun dosar găsit</h3>
            <p className="text-muted-foreground mt-1 mb-4">Nu aveți niciun dosar care să corespundă criteriilor.</p>
            <Button asChild variant="outline">
              <Link href="/dosare/nou">Creați un dosar</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {dosare.map((dosar) => {
            const config = statusConfig[dosar.status] || { label: dosar.status, color: "bg-gray-100" };
            return (
              <Card key={dosar.id} className="overflow-hidden hover:border-primary transition-colors">
                <Link href={`/dosare/${dosar.id}`} className="block">
                  <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group" data-testid={`dosar-item-${dosar.id}`}>
                    <div>
                      <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                        {dosar.denumireFirma || "Firmă fără denumire"}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Badge variant="secondary">{dosar.formaJuridica}</Badge>
                        {dosar.judet && dosar.localitate && (
                          <span>• {dosar.localitate}, {dosar.judet}</span>
                        )}
                        <span>• Creat la: {new Date(dosar.creatLa).toLocaleDateString("ro-RO")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium">Pasul {dosar.pasCurent}/6</p>
                        <Badge className={config.color} variant="outline">{config.label}</Badge>
                      </div>
                      <Badge className={`sm:hidden ${config.color}`} variant="outline">{config.label}</Badge>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                    </div>
                  </div>
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
