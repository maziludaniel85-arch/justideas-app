import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import {
  useGetDosar,
  getGetDosarQueryKey,
  useUpdateDosar,
  useUpdatePasDosar,
  useTrimiteDosar,
  useListCodurICaen,
  useListAsociatiDosar,
  getListAsociatiDosarQueryKey,
  useAddAsociatDosar,
  useUpdateAsociatDosar,
  useRemoveAsociatDosar,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { ArrowLeft, CheckCircle2, ChevronRight, Check } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const STEPS = [
  { id: 1, title: "Date generale" },
  { id: 2, title: "Sediu social" },
  { id: 3, title: "Cod CAEN" },
  { id: 4, title: "Capital social" },
  { id: 5, title: "Asociați" },
  { id: 6, title: "Confirmare" },
];

export default function DosarWizard() {
  const { id } = useParams<{ id: string }>();
  const dosarId = parseInt(id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dosar, isLoading, error } = useGetDosar(dosarId, {
    query: {
      enabled: !!dosarId,
      queryKey: getGetDosarQueryKey(dosarId),
    },
  });

  const updateDosar = useUpdateDosar();
  const updatePas = useUpdatePasDosar();
  const trimiteDosar = useTrimiteDosar();

  if (isLoading) return <div className="py-20 flex justify-center"><Spinner className="size-8" /></div>;
  if (error || !dosar) return <div className="p-4 bg-destructive/10 text-destructive rounded-md">Nu am putut încărca dosarul.</div>;

  const handleNext = async (pasUrmator: number, dataToSave?: any) => {
    try {
      if (dataToSave) {
        await updateDosar.mutateAsync({ id: dosarId, data: dataToSave });
        queryClient.setQueryData(getGetDosarQueryKey(dosarId), (old: any) => ({ ...old, ...dataToSave }));
      }
      
      await updatePas.mutateAsync({ id: dosarId, data: { pas: pasUrmator } });
      queryClient.setQueryData(getGetDosarQueryKey(dosarId), (old: any) => ({ ...old, pasCurent: pasUrmator }));
      
      window.scrollTo(0,0);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Eroare", description: err.data?.eroare || "Salvarea a eșuat" });
    }
  };

  const handleTrimite = async () => {
    try {
      await trimiteDosar.mutateAsync({ id: dosarId });
      toast({ title: "Dosar trimis cu succes!", description: "Dosarul dumneavoastră a fost trimis spre procesare." });
      setLocation("/dosare");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Eroare", description: err.data?.eroare || "Trimiterea a eșuat" });
    }
  };

  const isReadonly = dosar.status !== "ciorna";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dosare"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Dosar {dosar.denumireFirma}</h1>
          <p className="text-muted-foreground text-sm">Status: {dosar.status}</p>
        </div>
      </div>

      {isReadonly && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-blue-500" />
          <p className="text-sm font-medium">Acest dosar este în statusul "{dosar.status}" și nu mai poate fi modificat.</p>
        </div>
      )}

      {/* Stepper */}
      <div className="flex justify-between items-center mb-8 overflow-x-auto pb-4">
        {STEPS.map((step) => {
          const isCurrent = dosar.pasCurent === step.id;
          const isCompleted = dosar.pasCurent > step.id || isReadonly;
          
          return (
            <div key={step.id} className="flex flex-col items-center min-w-[80px] relative">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm z-10 
                ${isCurrent ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' : 
                  isCompleted ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                {isCompleted && !isCurrent ? <Check className="h-4 w-4" /> : step.id}
              </div>
              <span className={`text-xs mt-2 text-center whitespace-nowrap ${isCurrent ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                {step.title}
              </span>
              {step.id < 6 && (
                <div className={`absolute top-4 left-[50%] w-full h-[2px] -z-0
                  ${isCompleted ? 'bg-green-500' : 'bg-muted'}`} 
                  style={{ width: "calc(100% + 40px)", left: "calc(50% + 16px)" }} 
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="mt-8">
        {dosar.pasCurent === 1 && <Pas1DateGenerale dosar={dosar} onNext={handleNext} readOnly={isReadonly} />}
        {dosar.pasCurent === 2 && <Pas2SediuSocial dosar={dosar} onNext={handleNext} onBack={() => handleNext(1)} readOnly={isReadonly} />}
        {dosar.pasCurent === 3 && <Pas3CodCAEN dosar={dosar} onNext={handleNext} onBack={() => handleNext(2)} readOnly={isReadonly} />}
        {dosar.pasCurent === 4 && <Pas4CapitalSocial dosar={dosar} onNext={handleNext} onBack={() => handleNext(3)} readOnly={isReadonly} />}
        {dosar.pasCurent === 5 && <Pas5Asociati dosar={dosar} onNext={handleNext} onBack={() => handleNext(4)} readOnly={isReadonly} />}
        {dosar.pasCurent === 6 && <Pas6Confirmare dosar={dosar} onSubmit={handleTrimite} onBack={() => handleNext(5)} readOnly={isReadonly} isSubmitting={trimiteDosar.isPending} />}
      </div>
    </div>
  );
}

// -------------------- PAS 1: DATE GENERALE --------------------
function Pas1DateGenerale({ dosar, onNext, readOnly }: { dosar: any, onNext: Function, readOnly: boolean }) {
  const schema = z.object({
    denumireFirma: z.string().min(1, "Obligatoriu"),
    formaJuridica: z.string().min(1, "Obligatoriu"),
    judet: z.string().optional().nullable(),
    localitate: z.string().optional().nullable(),
  });

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      denumireFirma: dosar.denumireFirma,
      formaJuridica: dosar.formaJuridica,
      judet: dosar.judet || "",
      localitate: dosar.localitate || "",
    }
  });

  const onSubmit = (values: any) => onNext(2, values);

  return (
    <Card>
      <CardHeader><CardTitle>Pasul 1: Date Generale</CardTitle></CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="denumireFirma" render={({ field }) => (
              <FormItem><FormLabel>Denumire Firmă</FormLabel><FormControl><Input {...field} disabled={readOnly} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="formaJuridica" render={({ field }) => (
              <FormItem>
                <FormLabel>Forma Juridică</FormLabel>
                <Select disabled={readOnly} onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="SRL">SRL</SelectItem><SelectItem value="SA">SA</SelectItem>
                    <SelectItem value="SRL_D">SRL-D</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="judet" render={({ field }) => (
                <FormItem><FormLabel>Județ</FormLabel><FormControl><Input {...field} value={field.value||''} disabled={readOnly} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="localitate" render={({ field }) => (
                <FormItem><FormLabel>Localitate</FormLabel><FormControl><Input {...field} value={field.value||''} disabled={readOnly} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            {!readOnly && (
              <div className="flex justify-end pt-4"><Button type="submit">Următorul pas <ChevronRight className="ml-2 h-4 w-4"/></Button></div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// -------------------- PAS 2: SEDIU SOCIAL --------------------
function Pas2SediuSocial({ dosar, onNext, onBack, readOnly }: any) {
  const schema = z.object({
    adresaSediu: z.string().min(5, "Adresa completă este necesară"),
    codPostal: z.string().optional().nullable(),
    descriereActivitate: z.string().optional().nullable(),
  });

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      adresaSediu: dosar.adresaSediu || "",
      codPostal: dosar.codPostal || "",
      descriereActivitate: dosar.descriereActivitate || "",
    }
  });

  return (
    <Card>
      <CardHeader><CardTitle>Pasul 2: Sediu Social</CardTitle></CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(v => onNext(3, v))} className="space-y-4">
            <FormField control={form.control} name="adresaSediu" render={({ field }) => (
              <FormItem><FormLabel>Adresa completă a sediului</FormLabel><FormControl><Textarea {...field} value={field.value||''} disabled={readOnly} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="codPostal" render={({ field }) => (
              <FormItem><FormLabel>Cod Poștal</FormLabel><FormControl><Input {...field} value={field.value||''} disabled={readOnly} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="descriereActivitate" render={({ field }) => (
              <FormItem><FormLabel>Scurtă descriere a activității (opțional)</FormLabel><FormControl><Textarea {...field} value={field.value||''} disabled={readOnly} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={onBack}>Înapoi</Button>
              {!readOnly && <Button type="submit">Următorul pas <ChevronRight className="ml-2 h-4 w-4"/></Button>}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// -------------------- PAS 3: COD CAEN --------------------
function Pas3CodCAEN({ dosar, onNext, onBack, readOnly }: any) {
  const [cautare, setCautare] = useState("");
  const [selectedCaen, setSelectedCaen] = useState<string | null>(dosar.codCaenPrincipal || null);

  const { data } = useListCodurICaen(
    { cautare: cautare.length > 2 ? cautare : undefined },
    { query: { enabled: cautare.length > 2 || !!selectedCaen } }
  );

  const handleSubmit = () => {
    onNext(4, { codCaenPrincipal: selectedCaen });
  };

  return (
    <Card>
      <CardHeader><CardTitle>Pasul 3: Cod CAEN Principal</CardTitle><CardDescription>Căutați și selectați codul CAEN pentru activitatea principală a firmei.</CardDescription></CardHeader>
      <CardContent className="space-y-6">
        {!readOnly && (
          <div>
            <Label>Căutare CAEN</Label>
            <Input placeholder="Tastați minim 3 caractere..." value={cautare} onChange={e => setCautare(e.target.value)} />
          </div>
        )}
        
        {selectedCaen && (
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-md">
            <p className="text-sm font-semibold text-primary">Cod Selectat: {selectedCaen}</p>
          </div>
        )}

        {data?.date && data.date.length > 0 && !readOnly && (
          <div className="max-h-60 overflow-y-auto border rounded-md">
            {data.date.map(caen => (
              <div 
                key={caen.cod} 
                className={`p-3 border-b cursor-pointer hover:bg-muted ${selectedCaen === caen.cod ? 'bg-primary/5' : ''}`}
                onClick={() => setSelectedCaen(caen.cod)}
              >
                <p className="font-medium">{caen.cod} - {caen.denumire}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between pt-4 border-t">
          <Button type="button" variant="outline" onClick={onBack}>Înapoi</Button>
          {!readOnly && <Button onClick={handleSubmit} disabled={!selectedCaen}>Următorul pas <ChevronRight className="ml-2 h-4 w-4"/></Button>}
        </div>
      </CardContent>
    </Card>
  );
}

// -------------------- PAS 4: CAPITAL SOCIAL --------------------
function Pas4CapitalSocial({ dosar, onNext, onBack, readOnly }: any) {
  const schema = z.object({
    capitalSocial: z.coerce.number().min(200, "Minim 200 RON"),
    numarParti: z.coerce.number().min(1, "Minim 1"),
    valoareParte: z.coerce.number().min(10, "Minim 10 RON/parte"),
  });

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      capitalSocial: dosar.capitalSocial || 200,
      numarParti: dosar.numarParti || 20,
      valoareParte: dosar.valoareParte || 10,
    }
  });

  return (
    <Card>
      <CardHeader><CardTitle>Pasul 4: Capital Social</CardTitle></CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(v => onNext(5, v))} className="space-y-4">
            <FormField control={form.control} name="capitalSocial" render={({ field }) => (
              <FormItem><FormLabel>Capital Social (RON)</FormLabel><FormControl><Input type="number" {...field} disabled={readOnly} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="numarParti" render={({ field }) => (
                <FormItem><FormLabel>Număr Părți Sociale</FormLabel><FormControl><Input type="number" {...field} disabled={readOnly} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="valoareParte" render={({ field }) => (
                <FormItem><FormLabel>Valoare / Parte (RON)</FormLabel><FormControl><Input type="number" {...field} disabled={readOnly} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={onBack}>Înapoi</Button>
              {!readOnly && <Button type="submit">Următorul pas <ChevronRight className="ml-2 h-4 w-4"/></Button>}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// -------------------- PAS 5: ASOCIATI --------------------
function Pas5Asociati({ dosar, onNext, onBack, readOnly }: any) {
  const { data: asociati, isLoading } = useListAsociatiDosar(dosar.id, {
    query: { queryKey: getListAsociatiDosarQueryKey(dosar.id) }
  });
  const addAsociat = useAddAsociatDosar();
  const removeAsociat = useRemoveAsociatDosar();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleAddDefault = async () => {
    try {
      await addAsociat.mutateAsync({ 
        id: dosar.id, 
        data: {
          numeComplet: "Asociat Nou",
          tipActIdentitate: "ci",
          nationalitate: "romana",
          numarParti: dosar.numarParti || 20,
          procentDetinere: 100,
          aportCapital: dosar.capitalSocial || 200,
          estePersoanaJuridica: false
        }
      });
      queryClient.invalidateQueries({ queryKey: getListAsociatiDosarQueryKey(dosar.id) });
      toast({ title: "Asociat adăugat" });
    } catch (e:any) {
      toast({ variant: "destructive", title: "Eroare", description: e.data?.eroare || "Nu s-a putut adăuga" });
    }
  };

  const handleRemove = async (asociatId: number) => {
    try {
      await removeAsociat.mutateAsync({ id: dosar.id, asociatId });
      queryClient.invalidateQueries({ queryKey: getListAsociatiDosarQueryKey(dosar.id) });
    } catch(e) {}
  };

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
        <CardTitle>Pasul 5: Asociați</CardTitle>
        {!readOnly && <Button size="sm" onClick={handleAddDefault} disabled={addAsociat.isPending}>Adaugă Asociat</Button>}
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? <Spinner /> : asociati?.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">Nu există asociați. Adăugați cel puțin unul.</div>
        ) : (
          asociati?.map(asociat => (
            <div key={asociat.id} className="p-4 border rounded-md flex justify-between items-center">
              <div>
                <p className="font-medium">{asociat.numeComplet}</p>
                <p className="text-sm text-muted-foreground">{asociat.procentDetinere}% • {asociat.aportCapital} RON</p>
              </div>
              {!readOnly && (
                <Button variant="destructive" size="sm" onClick={() => handleRemove(asociat.id)}>Șterge</Button>
              )}
            </div>
          ))
        )}
        <div className="flex justify-between pt-4 border-t">
          <Button type="button" variant="outline" onClick={onBack}>Înapoi</Button>
          {!readOnly && <Button onClick={() => onNext(6)}>Următorul pas <ChevronRight className="ml-2 h-4 w-4"/></Button>}
        </div>
      </CardContent>
    </Card>
  );
}

// -------------------- PAS 6: CONFIRMARE --------------------
function Pas6Confirmare({ dosar, onSubmit, onBack, readOnly, isSubmitting }: any) {
  const { data: asociati } = useListAsociatiDosar(dosar.id, {
    query: { queryKey: getListAsociatiDosarQueryKey(dosar.id) }
  });

  return (
    <Card>
      <CardHeader><CardTitle>Pasul 6: Confirmare și Trimitere</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-muted-foreground">Denumire</p><p className="font-medium">{dosar.denumireFirma}</p></div>
          <div><p className="text-muted-foreground">Forma Juridică</p><p className="font-medium">{dosar.formaJuridica}</p></div>
          <div><p className="text-muted-foreground">Județ/Localitate</p><p className="font-medium">{dosar.judet}, {dosar.localitate}</p></div>
          <div><p className="text-muted-foreground">Cod CAEN Principal</p><p className="font-medium">{dosar.codCaenPrincipal}</p></div>
          <div><p className="text-muted-foreground">Capital Social</p><p className="font-medium">{dosar.capitalSocial} RON</p></div>
        </div>
        
        <div className="border-t pt-4">
          <p className="text-muted-foreground mb-2 text-sm">Asociați ({asociati?.length || 0})</p>
          <ul className="list-disc list-inside text-sm pl-4">
            {asociati?.map(a => <li key={a.id}>{a.numeComplet} ({a.procentDetinere}%)</li>)}
          </ul>
        </div>

        <div className="flex justify-between pt-4 border-t">
          {!readOnly && <Button type="button" variant="outline" onClick={onBack}>Înapoi</Button>}
          {readOnly ? (
            <Button asChild className="w-full sm:w-auto"><Link href="/dosare">Înapoi la lista de dosare</Link></Button>
          ) : (
            <Button onClick={onSubmit} disabled={isSubmitting} className="w-full sm:w-auto bg-green-600 hover:bg-green-700">
              {isSubmitting ? "Se trimite..." : "Trimite Dosarul"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
