import { useListPlati, getListPlatiQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { CreditCard } from "lucide-react";

const statusConfig: Record<string, { label: string; color: string }> = {
  in_asteptare: { label: "În Așteptare", color: "bg-yellow-100 text-yellow-800" },
  platit: { label: "Plătit", color: "bg-green-100 text-green-800" },
  esuat: { label: "Eșuat", color: "bg-red-100 text-red-800" },
  rambursat: { label: "Rambursat", color: "bg-gray-100 text-gray-800" },
};

const metodaConfig: Record<string, string> = {
  card: "Card",
  transfer_bancar: "Transfer Bancar",
  numerar: "Numerar",
};

export default function Plati() {
  const { data: plati, isLoading, error } = useListPlati({}, {
    query: {
      queryKey: getListPlatiQueryKey({}),
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Istoric Plăți</h1>
        <p className="text-muted-foreground mt-1">Situația plăților pentru dosarele dumneavoastră.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Toate plățile
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 flex justify-center"><Spinner className="size-8" /></div>
          ) : error ? (
            <div className="p-4 bg-destructive/10 text-destructive rounded-md">Nu s-au putut încărca plățile.</div>
          ) : !plati || plati.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nu aveți nicio plată înregistrată.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Dosar ID</TableHead>
                    <TableHead>Metodă</TableHead>
                    <TableHead>Suma</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plati.map((plata) => {
                    const config = statusConfig[plata.status] || { label: plata.status, color: "bg-gray-100 text-gray-800" };
                    return (
                      <TableRow key={plata.id} data-testid={`plata-row-${plata.id}`}>
                        <TableCell>
                          {plata.dataPlata 
                            ? format(new Date(plata.dataPlata), "dd MMM yyyy", { locale: ro }) 
                            : format(new Date(plata.creatLa), "dd MMM yyyy", { locale: ro })}
                        </TableCell>
                        <TableCell>#{plata.dosarId}</TableCell>
                        <TableCell>{plata.metodaPlata ? metodaConfig[plata.metodaPlata] || plata.metodaPlata : "-"}</TableCell>
                        <TableCell className="font-medium">{plata.suma} {plata.valuta}</TableCell>
                        <TableCell>
                          <Badge className={config.color} variant="outline">
                            {config.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
