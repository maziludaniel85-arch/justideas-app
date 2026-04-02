import { useGetDosareStatistici, getGetDosareStatisticiQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Clock, CheckCircle, XCircle, Plus, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; color: string }> = {
  ciorna: { label: "Ciornă", color: "bg-gray-100 text-gray-800" },
  in_asteptare: { label: "În Așteptare", color: "bg-yellow-100 text-yellow-800" },
  in_procesare: { label: "În Procesare", color: "bg-blue-100 text-blue-800" },
  aprobat: { label: "Aprobat", color: "bg-green-100 text-green-800" },
  respins: { label: "Respins", color: "bg-red-100 text-red-800" },
};

export default function Dashboard() {
  const { data, isLoading, error } = useGetDosareStatistici({
    query: {
      queryKey: getGetDosareStatisticiQueryKey(),
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><Spinner className="size-8" /></div>;
  }

  if (error || !data) {
    return <div className="text-destructive p-4 bg-destructive/10 rounded-md">Nu s-au putut încărca statisticile.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <Button asChild data-testid="button-create-dosar-dashboard">
          <Link href="/dosare/nou">
            <Plus className="mr-2 h-4 w-4" /> Dosar Nou
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Dosare</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-dosare">{data.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">În Procesare</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-in-procesare">{data.peStatus.in_procesare}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprobate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-aprobate">{data.peStatus.aprobat}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Respinse</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-respinse">{data.peStatus.respins}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Dosare Recente</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dosare">
              Vezi toate <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {data.dosareRecente.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nu aveți niciun dosar. Începeți prin a crea unul nou.
            </div>
          ) : (
            <div className="space-y-4">
              {data.dosareRecente.map((dosar) => {
                const config = statusConfig[dosar.status] || { label: dosar.status, color: "bg-gray-100" };
                return (
                  <Link href={`/dosare/${dosar.id}`} key={dosar.id}>
                    <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary transition-colors cursor-pointer group bg-card" data-testid={`dosar-recent-${dosar.id}`}>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {dosar.denumireFirma || "Firmă fără nume"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {dosar.formaJuridica} • Pasul {dosar.pasCurent}/6
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge className={config.color} variant="outline">{config.label}</Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
