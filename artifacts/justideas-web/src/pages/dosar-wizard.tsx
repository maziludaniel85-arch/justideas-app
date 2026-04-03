import { useState, useEffect } from "react";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  ArrowLeft, CheckCircle2, ChevronRight, Check, Plus, Trash2,
  Building2, Users, Briefcase, CreditCard, FileCheck, Settings,
  MapPin, Package
} from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// ─── STEPS ────────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, title: "Pachet",       icon: Package },
  { id: 2, title: "Date generale",icon: Building2 },
  { id: 3, title: "Sediu social", icon: MapPin },
  { id: 4, title: "Cod CAEN",     icon: Briefcase },
  { id: 5, title: "Capital",      icon: CreditCard },
  { id: 6, title: "Fiscal",       icon: Settings },
  { id: 7, title: "Asociați",     icon: Users },
  { id: 8, title: "Administratori",icon: Users },
  { id: 9, title: "Confirmare",   icon: FileCheck },
];

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function DosarWizard() {
  const { id } = useParams<{ id: string }>();
  const dosarId = parseInt(id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Local state for steps not yet in DB schema
  const [pachet, setPachet] = useState<"infiintare" | "complet">("infiintare");
  const [tva, setTva] = useState<"platitor" | "neplatitor">("neplatitor");
  const [impozitare, setImpozitare] = useState<"micro" | "profit">("micro");
  const [administratori, setAdministratori] = useState<any[]>([]);
  const [pasCurentLocal, setPasCurentLocal] = useState<number | null>(null);

  const { data: dosar, isLoading, error } = useGetDosar(dosarId, {
    query: { enabled: !!dosarId, queryKey: getGetDosarQueryKey(dosarId) },
  });

  const updateDosar = useUpdateDosar();
  const updatePas = useUpdatePasDosar();
  const trimiteDosar = useTrimiteDosar();

  if (isLoading) return <div className="py-20 flex justify-center"><Spinner className="size-8" /></div>;
  if (error || !dosar) return <div className="p-4 bg-destructive/10 text-destructive rounded-md">Nu am putut încărca dosarul.</div>;

  // Use local override for current step if set (for new steps not tracked in DB)
  const pasCurent = pasCurentLocal ?? dosar.pasCurent;

  const goTo = (pas: number) => {
    setPasCurentLocal(pas);
    window.scrollTo(0, 0);
  };

  const handleNext = async (pasUrmator: number, dataToSave?: any) => {
    try {
      if (dataToSave) {
        await updateDosar.mutateAsync({ id: dosarId, data: dataToSave });
        queryClient.setQueryData(getGetDosarQueryKey(dosarId), (old: any) => ({ ...old, ...dataToSave }));
      }
      // Only sync pas to DB for steps that exist in the backend (2-9 mapped to 1-6)
      const dbPas = Math.min(pasUrmator - 1, 6); // backend still has 6 steps
      if (dbPas >= 1 && dbPas <= 6 && pasUrmator > pasCurent) {
        await updatePas.mutateAsync({ id: dosarId, data: { pas: dbPas } });
        queryClient.setQueryData(getGetDosarQueryKey(dosarId), (old: any) => ({ ...old, pasCurent: dbPas }));
      }
      goTo(pasUrmator);
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
      {/* Header */}
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
      <div className="overflow-x-auto pb-4">
        <div className="flex items-center min-w-max gap-0">
          {STEPS.map((step, idx) => {
            const isCurrent = pasCurent === step.id;
            const isCompleted = pasCurent > step.id || isReadonly;
            const Icon = step.icon;

            return (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => !isReadonly && isCompleted && goTo(step.id)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm transition-all
                      ${isCurrent ? "bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110" :
                        isCompleted ? "bg-green-500 text-white cursor-pointer hover:bg-green-600" :
                        "bg-muted text-muted-foreground"}`}
                  >
                    {isCompleted && !isCurrent ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </button>
                  <span className={`text-xs mt-1 text-center whitespace-nowrap max-w-[70px]
                    ${isCurrent ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                    {step.title}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`h-[2px] w-8 mb-4 mx-1 transition-colors
                    ${isCompleted ? "bg-green-500" : "bg-muted"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="mt-8">
        {pasCurent === 1 && (
          <Pas1Pachet
            pachet={pachet}
            setPachet={setPachet}
            onNext={() => goTo(2)}
            readOnly={isReadonly}
          />
        )}
        {pasCurent === 2 && (
          <Pas2DateGenerale
            dosar={dosar}
            onNext={(data: any) => handleNext(3, data)}
            onBack={() => goTo(1)}
            readOnly={isReadonly}
          />
        )}
        {pasCurent === 3 && (
          <Pas3SediuSocial
            dosar={dosar}
            onNext={(data: any) => handleNext(4, data)}
            onBack={() => goTo(2)}
            readOnly={isReadonly}
          />
        )}
        {pasCurent === 4 && (
          <Pas4CodCAEN
            dosar={dosar}
            onNext={(data: any) => handleNext(5, data)}
            onBack={() => goTo(3)}
            readOnly={isReadonly}
          />
        )}
        {pasCurent === 5 && (
          <Pas5CapitalSocial
            dosar={dosar}
            onNext={(data: any) => handleNext(6, data)}
            onBack={() => goTo(4)}
            readOnly={isReadonly}
          />
        )}
        {pasCurent === 6 && (
          <Pas6Fiscal
            tva={tva} setTva={setTva}
            impozitare={impozitare} setImpozitare={setImpozitare}
            onNext={() => goTo(7)}
            onBack={() => goTo(5)}
            readOnly={isReadonly}
          />
        )}
        {pasCurent === 7 && (
          <Pas7Asociati
            dosar={dosar}
            onNext={() => goTo(8)}
            onBack={() => goTo(6)}
            readOnly={isReadonly}
          />
        )}
        {pasCurent === 8 && (
          <Pas8Administratori
            administratori={administratori}
            setAdministratori={setAdministratori}
            onNext={() => goTo(9)}
            onBack={() => goTo(7)}
            readOnly={isReadonly}
          />
        )}
        {pasCurent === 9 && (
          <Pas9Confirmare
            dosar={dosar}
            pachet={pachet}
            tva={tva}
            impozitare={impozitare}
            administratori={administratori}
            onSubmit={handleTrimite}
            onBack={() => goTo(8)}
            readOnly={isReadonly}
            isSubmitting={trimiteDosar.isPending}
          />
        )}
      </div>
    </div>
  );
}

// ─── PAS 1: PACHET ────────────────────────────────────────────────────────────
function Pas1Pachet({ pachet, setPachet, onNext, readOnly }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pasul 1: Selectați Pachetul</CardTitle>
        <CardDescription>Alegeți tipul de serviciu dorit pentru înregistrarea firmei.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pachet Înființare */}
          <button
            disabled={readOnly}
            onClick={() => setPachet("infiintare")}
            className={`p-6 rounded-xl border-2 text-left transition-all hover:shadow-md
              ${pachet === "infiintare"
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:border-primary/50"}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center
                ${pachet === "infiintare" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                <Building2 className="h-5 w-5" />
              </div>
              {pachet === "infiintare" && <Check className="h-5 w-5 text-primary" />}
            </div>
            <h3 className="font-semibold text-lg mb-1">Doar Înființare</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Înregistrare firmă la ONRC, acte constitutive, specimen de semnătură.
            </p>
            <ul className="text-sm space-y-1">
              {["Verificare și rezervare nume","Redactare acte constitutive","Depunere dosar ONRC","CUI și certificat înregistrare"].map(item => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </button>

          {/* Pachet Complet */}
          <button
            disabled={readOnly}
            onClick={() => setPachet("complet")}
            className={`p-6 rounded-xl border-2 text-left transition-all hover:shadow-md relative
              ${pachet === "complet"
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:border-primary/50"}`}
          >
            <div className="absolute top-3 right-3">
              <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-xs">Recomandat</Badge>
            </div>
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center
                ${pachet === "complet" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                <Package className="h-5 w-5" />
              </div>
              {pachet === "complet" && <Check className="h-5 w-5 text-primary" />}
            </div>
            <h3 className="font-semibold text-lg mb-1">Pachet Complet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Tot ce include pachetul de înființare, plus servicii contabile și consultanță.
            </p>
            <ul className="text-sm space-y-1">
              {[
                "Tot din pachetul Înființare",
                "Înregistrare fiscală ANAF",
                "Deschidere cont bancar",
                "Consultanță contabilă 3 luni",
                "Gestiune contabilitate lunară"
              ].map(item => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </button>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onNext}>
            Următorul pas <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── PAS 2: DATE GENERALE ─────────────────────────────────────────────────────
function Pas2DateGenerale({ dosar, onNext, onBack, readOnly }: any) {
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
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pasul 2: Date Generale</CardTitle>
        <CardDescription>Informații de bază despre firma dumneavoastră.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onNext)} className="space-y-4">
            <FormField control={form.control} name="denumireFirma" render={({ field }) => (
              <FormItem>
                <FormLabel>Denumire Firmă</FormLabel>
                <FormControl><Input {...field} disabled={readOnly} placeholder="ex: ALPHA SOLUTIONS" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="formaJuridica" render={({ field }) => (
              <FormItem>
                <FormLabel>Forma Juridică</FormLabel>
                <Select disabled={readOnly} onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selectați..." /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="SRL">SRL – Societate cu Răspundere Limitată</SelectItem>
                    <SelectItem value="SA">SA – Societate pe Acțiuni</SelectItem>
                    <SelectItem value="SRL_D">SRL-D – Societate cu Răspundere Limitată Debutant</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="judet" render={({ field }) => (
                <FormItem>
                  <FormLabel>Județ</FormLabel>
                  <FormControl><Input {...field} value={field.value || ""} disabled={readOnly} placeholder="ex: Cluj" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="localitate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Localitate</FormLabel>
                  <FormControl><Input {...field} value={field.value || ""} disabled={readOnly} placeholder="ex: Cluj-Napoca" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={onBack}>Înapoi</Button>
              {!readOnly && <Button type="submit">Următorul pas <ChevronRight className="ml-2 h-4 w-4" /></Button>}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// ─── PAS 3: SEDIU SOCIAL ──────────────────────────────────────────────────────
function Pas3SediuSocial({ dosar, onNext, onBack, readOnly }: any) {
  const schema = z.object({
    adresaSediu: z.string().min(5, "Adresa completă este necesară"),
    codPostal: z.string().optional().nullable(),
    descriereActivitate: z.string().optional().nullable(),
    punctLucru: z.string().optional().nullable(),
    activitatiAfara: z.boolean().optional(),
  });

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      adresaSediu: dosar.adresaSediu || "",
      codPostal: dosar.codPostal || "",
      descriereActivitate: dosar.descriereActivitate || "",
      punctLucru: dosar.punctLucru || "",
      activitatiAfara: dosar.activitatiAfara || false,
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pasul 3: Sediu Social</CardTitle>
        <CardDescription>Adresa legală a firmei și puncte de lucru.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onNext)} className="space-y-4">
            <FormField control={form.control} name="adresaSediu" render={({ field }) => (
              <FormItem>
                <FormLabel>Adresa completă a sediului social</FormLabel>
                <FormControl><Textarea {...field} value={field.value || ""} disabled={readOnly} placeholder="Str., Nr., Bloc, Sc., Ap., Localitate, Județ" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="codPostal" render={({ field }) => (
              <FormItem>
                <FormLabel>Cod Poștal</FormLabel>
                <FormControl><Input {...field} value={field.value || ""} disabled={readOnly} placeholder="ex: 400001" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="descriereActivitate" render={({ field }) => (
              <FormItem>
                <FormLabel>Scurtă descriere a activității <span className="text-muted-foreground">(opțional)</span></FormLabel>
                <FormControl><Textarea {...field} value={field.value || ""} disabled={readOnly} placeholder="Descrieți pe scurt activitatea firmei..." /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Punct de lucru suplimentar */}
            <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
              <h4 className="font-medium text-sm">Punct de lucru suplimentar <span className="text-muted-foreground">(opțional)</span></h4>
              <FormField control={form.control} name="punctLucru" render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresa punctului de lucru</FormLabel>
                  <FormControl><Input {...field} value={field.value || ""} disabled={readOnly} placeholder="Lasați gol dacă nu aveți punct de lucru suplimentar" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Activitati in afara sediului */}
            <FormField control={form.control} name="activitatiAfara" render={({ field }) => (
              <FormItem className="flex items-center gap-3 space-y-0 border rounded-lg p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={readOnly}
                  />
                </FormControl>
                <div>
                  <FormLabel className="font-medium cursor-pointer">Activități în afara sediului</FormLabel>
                  <p className="text-xs text-muted-foreground mt-0.5">Firma va desfășura activități și în afara sediului social / punctelor de lucru declarate.</p>
                </div>
              </FormItem>
            )} />

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={onBack}>Înapoi</Button>
              {!readOnly && <Button type="submit">Următorul pas <ChevronRight className="ml-2 h-4 w-4" /></Button>}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// ─── PAS 4: COD CAEN ─────────────────────────────────────────────────────────
function Pas4CodCAEN({ dosar, onNext, onBack, readOnly }: any) {
  const [cautare, setCautare] = useState("");
  const [cautareSecundar, setCautareSecundar] = useState("");
  const [selectedPrincipal, setSelectedPrincipal] = useState<string | null>(dosar.codCaenPrincipal || null);
  const [selectedSecundare, setSelectedSecundare] = useState<string[]>([]);

  const { data: dataSearch } = useListCodurICaen(
    { cautare: cautare.length > 2 ? cautare : undefined },
    { query: { enabled: cautare.length > 2 } }
  );

  const { data: dataSecSearch } = useListCodurICaen(
    { cautare: cautareSecundar.length > 2 ? cautareSecundar : undefined },
    { query: { enabled: cautareSecundar.length > 2 } }
  );

  const toggleSecundar = (cod: string) => {
    if (cod === selectedPrincipal) return;
    setSelectedSecundare(prev =>
      prev.includes(cod) ? prev.filter(c => c !== cod) : [...prev, cod]
    );
  };

  const handleSubmit = () => {
    onNext({ codCaenPrincipal: selectedPrincipal });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pasul 4: Coduri CAEN</CardTitle>
        <CardDescription>Selectați activitatea principală și cele secundare ale firmei.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* CAEN Principal */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">P</span>
            Cod CAEN Principal
          </h4>

          {!readOnly && (
            <Input
              placeholder="Căutați CAEN (minim 3 caractere)..."
              value={cautare}
              onChange={e => setCautare(e.target.value)}
            />
          )}

          {selectedPrincipal && (
            <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-xs text-primary font-medium uppercase tracking-wide">Cod selectat</p>
                <p className="font-semibold">{selectedPrincipal}</p>
              </div>
              {!readOnly && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedPrincipal(null)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          )}

          {dataSearch?.date && dataSearch.date.length > 0 && !readOnly && (
            <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
              {dataSearch.date.map(caen => (
                <div
                  key={caen.cod}
                  onClick={() => { setSelectedPrincipal(caen.cod); setCautare(""); }}
                  className={`p-3 cursor-pointer hover:bg-muted transition-colors
                    ${selectedPrincipal === caen.cod ? "bg-primary/5" : ""}`}
                >
                  <p className="font-medium text-sm">{caen.cod}</p>
                  <p className="text-xs text-muted-foreground">{caen.denumire}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CAEN Secundare */}
        <div className="space-y-3 border-t pt-4">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center font-bold">S</span>
            Coduri CAEN Secundare
            <span className="text-xs text-muted-foreground font-normal">(opțional)</span>
          </h4>

          {selectedSecundare.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedSecundare.map(cod => (
                <Badge key={cod} variant="secondary" className="flex items-center gap-1 pr-1">
                  {cod}
                  {!readOnly && (
                    <button onClick={() => toggleSecundar(cod)} className="ml-1 hover:text-destructive">×</button>
                  )}
                </Badge>
              ))}
            </div>
          )}

          {!readOnly && (
            <Input
              placeholder="Căutați coduri secundare..."
              value={cautareSecundar}
              onChange={e => setCautareSecundar(e.target.value)}
            />
          )}

          {dataSecSearch?.date && dataSecSearch.date.length > 0 && !readOnly && (
            <div className="max-h-40 overflow-y-auto border rounded-lg divide-y">
              {dataSecSearch.date
                .filter(c => c.cod !== selectedPrincipal)
                .map(caen => (
                  <div
                    key={caen.cod}
                    onClick={() => { toggleSecundar(caen.cod); }}
                    className={`p-3 cursor-pointer hover:bg-muted transition-colors flex items-center gap-3
                      ${selectedSecundare.includes(caen.cod) ? "bg-primary/5" : ""}`}
                  >
                    <Checkbox
                      checked={selectedSecundare.includes(caen.cod)}
                      onCheckedChange={() => toggleSecundar(caen.cod)}
                    />
                    <div>
                      <p className="font-medium text-sm">{caen.cod}</p>
                      <p className="text-xs text-muted-foreground">{caen.denumire}</p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button type="button" variant="outline" onClick={onBack}>Înapoi</Button>
          {!readOnly && (
            <Button onClick={handleSubmit} disabled={!selectedPrincipal}>
              Următorul pas <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── PAS 5: CAPITAL SOCIAL ────────────────────────────────────────────────────
function Pas5CapitalSocial({ dosar, onNext, onBack, readOnly }: any) {
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
    },
  });

  const capitalSocial = form.watch("capitalSocial");
  const numarParti = form.watch("numarParti");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pasul 5: Capital Social</CardTitle>
        <CardDescription>Capitalul social minim pentru SRL este de 200 RON.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onNext)} className="space-y-4">
            <FormField control={form.control} name="capitalSocial" render={({ field }) => (
              <FormItem>
                <FormLabel>Capital Social Total (RON)</FormLabel>
                <FormControl><Input type="number" {...field} disabled={readOnly} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="numarParti" render={({ field }) => (
                <FormItem>
                  <FormLabel>Număr Părți Sociale</FormLabel>
                  <FormControl><Input type="number" {...field} disabled={readOnly} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="valoareParte" render={({ field }) => (
                <FormItem>
                  <FormLabel>Valoare / Parte (RON)</FormLabel>
                  <FormControl><Input type="number" {...field} disabled={readOnly} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Summary */}
            <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Capital social total</span>
                <span className="font-semibold">{capitalSocial} RON</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valoare per parte</span>
                <span className="font-semibold">{numarParti > 0 ? (capitalSocial / numarParti).toFixed(2) : "–"} RON</span>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={onBack}>Înapoi</Button>
              {!readOnly && <Button type="submit">Următorul pas <ChevronRight className="ml-2 h-4 w-4" /></Button>}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// ─── PAS 6: FISCAL (TVA + IMPOZITARE) ────────────────────────────────────────
function Pas6Fiscal({ tva, setTva, impozitare, setImpozitare, onNext, onBack, readOnly }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pasul 6: Regim Fiscal</CardTitle>
        <CardDescription>Alegeți sistemul de TVA și de impozitare al firmei.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* TVA */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Regim TVA</Label>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                value: "neplatitor",
                title: "Neplătitor TVA",
                desc: "Cifra de afaceri sub 300.000 RON/an. Nu colectați și nu deduceți TVA.",
              },
              {
                value: "platitor",
                title: "Plătitor TVA",
                desc: "Înregistrare voluntară sau obligatorie. Colectați și deduceți TVA 19%.",
              },
            ].map(opt => (
              <button
                key={opt.value}
                disabled={readOnly}
                onClick={() => setTva(opt.value)}
                className={`p-4 rounded-lg border-2 text-left transition-all
                  ${tva === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{opt.title}</span>
                  {tva === opt.value && <Check className="h-4 w-4 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Impozitare */}
        <div className="space-y-3 border-t pt-4">
          <Label className="text-base font-semibold">Sistem de Impozitare</Label>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                value: "micro",
                title: "Impozit pe venit (Micro)",
                desc: "1% din cifra de afaceri (dacă are salariați). Recomandat la start.",
              },
              {
                value: "profit",
                title: "Impozit pe profit",
                desc: "16% din profit net. De obicei ales când marja de profit este mică.",
              },
            ].map(opt => (
              <button
                key={opt.value}
                disabled={readOnly}
                onClick={() => setImpozitare(opt.value)}
                className={`p-4 rounded-lg border-2 text-left transition-all
                  ${impozitare === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{opt.title}</span>
                  {impozitare === opt.value && <Check className="h-4 w-4 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button type="button" variant="outline" onClick={onBack}>Înapoi</Button>
          {!readOnly && (
            <Button onClick={onNext}>Următorul pas <ChevronRight className="ml-2 h-4 w-4" /></Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── PAS 7: ASOCIAȚI ─────────────────────────────────────────────────────────
const asociatSchema = z.object({
  numeComplet: z.string().min(2, "Obligatoriu"),
  cnp: z.string().length(13, "CNP invalid (13 cifre)").optional().or(z.literal("")),
  tipActIdentitate: z.string().min(1, "Obligatoriu"),
  serieActIdentitate: z.string().optional(),
  numarActIdentitate: z.string().optional(),
  nationalitate: z.string().min(1, "Obligatoriu"),
  // Domiciliu
  adresaDomiciliu: z.string().min(5, "Adresa completă este necesară"),
  judetDomiciliu: z.string().optional(),
  localitateaDomiciliu: z.string().optional(),
  // Participare
  numarParti: z.coerce.number().min(1, "Minim 1"),
  procentDetinere: z.coerce.number().min(0).max(100),
  aportCapital: z.coerce.number().min(0),
  estePersoanaJuridica: z.boolean().default(false),
});

function Pas7Asociati({ dosar, onNext, onBack, readOnly }: any) {
  const { data: asociati, isLoading } = useListAsociatiDosar(dosar.id, {
    query: { queryKey: getListAsociatiDosarQueryKey(dosar.id) },
  });
  const addAsociat = useAddAsociatDosar();
  const updateAsociat = useUpdateAsociatDosar();
  const removeAsociat = useRemoveAsociatDosar();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAsociat, setEditingAsociat] = useState<any>(null);

  const form = useForm({
    resolver: zodResolver(asociatSchema),
    defaultValues: {
      numeComplet: "", cnp: "", tipActIdentitate: "ci", serieActIdentitate: "",
      numarActIdentitate: "", nationalitate: "romana", adresaDomiciliu: "",
      judetDomiciliu: "", localitateaDomiciliu: "",
      numarParti: dosar.numarParti || 20,
      procentDetinere: 100, aportCapital: dosar.capitalSocial || 200,
      estePersoanaJuridica: false,
    },
  });

  const openAdd = () => {
    setEditingAsociat(null);
    form.reset({
      numeComplet: "", cnp: "", tipActIdentitate: "ci", serieActIdentitate: "",
      numarActIdentitate: "", nationalitate: "romana", adresaDomiciliu: "",
      judetDomiciliu: "", localitateaDomiciliu: "",
      numarParti: dosar.numarParti || 20,
      procentDetinere: 100, aportCapital: dosar.capitalSocial || 200,
      estePersoanaJuridica: false,
    });
    setModalOpen(true);
  };

  const openEdit = (a: any) => {
    setEditingAsociat(a);
    form.reset({
      numeComplet: a.numeComplet || "",
      cnp: a.cnp || "",
      tipActIdentitate: a.tipActIdentitate || "ci",
      serieActIdentitate: a.serieActIdentitate || "",
      numarActIdentitate: a.numarActIdentitate || "",
      nationalitate: a.nationalitate || "romana",
      adresaDomiciliu: a.adresaDomiciliu || "",
      judetDomiciliu: a.judetDomiciliu || "",
      localitateaDomiciliu: a.localitateaDomiciliu || "",
      numarParti: a.numarParti || 0,
      procentDetinere: a.procentDetinere || 0,
      aportCapital: a.aportCapital || 0,
      estePersoanaJuridica: a.estePersoanaJuridica || false,
    });
    setModalOpen(true);
  };

  const onSave = async (values: any) => {
    try {
      if (editingAsociat) {
        await updateAsociat.mutateAsync({ id: dosar.id, asociatId: editingAsociat.id, data: values });
        toast({ title: "Asociat actualizat" });
      } else {
        await addAsociat.mutateAsync({ id: dosar.id, data: values });
        toast({ title: "Asociat adăugat" });
      }
      queryClient.invalidateQueries({ queryKey: getListAsociatiDosarQueryKey(dosar.id) });
      setModalOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Eroare", description: e.data?.eroare || "Eroare la salvare" });
    }
  };

  const handleRemove = async (asociatId: number) => {
    try {
      await removeAsociat.mutateAsync({ id: dosar.id, asociatId });
      queryClient.invalidateQueries({ queryKey: getListAsociatiDosarQueryKey(dosar.id) });
    } catch (e) {}
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>Pasul 7: Asociați</CardTitle>
            <CardDescription>Adăugați toți asociații firmei cu datele personale complete.</CardDescription>
          </div>
          {!readOnly && (
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4 mr-1" /> Adaugă Asociat
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? <Spinner /> : asociati?.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed rounded-lg text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nu există asociați. Adăugați cel puțin unul.</p>
            </div>
          ) : (
            asociati?.map(asociat => (
              <div key={asociat.id} className="p-4 border rounded-lg flex justify-between items-start">
                <div>
                  <p className="font-semibold">{asociat.numeComplet}</p>
                  <p className="text-sm text-muted-foreground">
                    {asociat.nationalitate} • {asociat.tipActIdentitate?.toUpperCase()}
                    {asociat.cnp && ` • CNP: ${asociat.cnp}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {asociat.procentDetinere}% participare • {asociat.aportCapital} RON aport
                  </p>
                  {asociat.adresaDomiciliu && (
                    <p className="text-xs text-muted-foreground mt-1">{asociat.adresaDomiciliu}</p>
                  )}
                </div>
                {!readOnly && (
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => openEdit(asociat)}>Editează</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleRemove(asociat.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}

          <div className="flex justify-between pt-4 border-t">
            <Button type="button" variant="outline" onClick={onBack}>Înapoi</Button>
            {!readOnly && (
              <Button onClick={onNext} disabled={(asociati?.length ?? 0) === 0}>
                Următorul pas <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal Asociat */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAsociat ? "Editare Asociat" : "Adăugare Asociat"}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
              {/* Persoana juridica toggle */}
              <FormField control={form.control} name="estePersoanaJuridica" render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0 p-3 border rounded-lg bg-muted/30">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="cursor-pointer font-medium">Asociat persoană juridică (firmă)</FormLabel>
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="numeComplet" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nume complet</FormLabel>
                    <FormControl><Input {...field} placeholder="Prenume Nume" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="cnp" render={({ field }) => (
                  <FormItem>
                    <FormLabel>CNP</FormLabel>
                    <FormControl><Input {...field} placeholder="1234567890123" maxLength={13} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="nationalitate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Naționalitate</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="romana">Română</SelectItem>
                        <SelectItem value="alta">Altă naționalitate</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="tipActIdentitate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tip act identitate</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="ci">CI – Carte de identitate</SelectItem>
                        <SelectItem value="pasaport">Pașaport</SelectItem>
                        <SelectItem value="permis_sedere">Permis de ședere</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="serieActIdentitate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serie act</FormLabel>
                    <FormControl><Input {...field} placeholder="AB" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="numarActIdentitate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Număr act</FormLabel>
                    <FormControl><Input {...field} placeholder="123456" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Domiciliu */}
              <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
                <h4 className="font-medium text-sm">Adresa de domiciliu</h4>
                <FormField control={form.control} name="adresaDomiciliu" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresă completă</FormLabel>
                    <FormControl><Textarea {...field} placeholder="Str., Nr., Bloc, Sc., Ap." /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="judetDomiciliu" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Județ</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="localitateaDomiciliu" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Localitate</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Participare */}
              <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
                <h4 className="font-medium text-sm">Participare la capital</h4>
                <div className="grid grid-cols-3 gap-3">
                  <FormField control={form.control} name="numarParti" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nr. Părți</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="procentDetinere" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Procent %</FormLabel>
                      <FormControl><Input type="number" min={0} max={100} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="aportCapital" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aport (RON)</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Anulează</Button>
                <Button type="submit" disabled={addAsociat.isPending || updateAsociat.isPending}>
                  {addAsociat.isPending || updateAsociat.isPending ? "Se salvează..." : "Salvează"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── PAS 8: ADMINISTRATORI ────────────────────────────────────────────────────
const adminSchema = z.object({
  numeComplet: z.string().min(2, "Obligatoriu"),
  cnp: z.string().optional(),
  functie: z.string().min(1, "Obligatoriu"),
  durataMandatAni: z.coerce.number().min(0).max(99),
  mandatNelimitat: z.boolean().default(false),
  esteAsociat: z.boolean().default(true),
});

function Pas8Administratori({ administratori, setAdministratori, onNext, onBack, readOnly }: any) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const form = useForm({
    resolver: zodResolver(adminSchema),
    defaultValues: {
      numeComplet: "", cnp: "", functie: "administrator",
      durataMandatAni: 4, mandatNelimitat: false, esteAsociat: true,
    },
  });

  const mandatNelimitat = form.watch("mandatNelimitat");

  const openAdd = () => {
    setEditIndex(null);
    form.reset({ numeComplet: "", cnp: "", functie: "administrator", durataMandatAni: 4, mandatNelimitat: false, esteAsociat: true });
    setModalOpen(true);
  };

  const openEdit = (idx: number) => {
    setEditIndex(idx);
    form.reset(administratori[idx]);
    setModalOpen(true);
  };

  const onSave = (values: any) => {
    if (editIndex !== null) {
      const updated = [...administratori];
      updated[editIndex] = values;
      setAdministratori(updated);
    } else {
      setAdministratori([...administratori, values]);
    }
    setModalOpen(false);
  };

  const onRemove = (idx: number) => {
    setAdministratori(administratori.filter((_: any, i: number) => i !== idx));
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>Pasul 8: Administratori</CardTitle>
            <CardDescription>Persoanele care vor administra și reprezenta firma.</CardDescription>
          </div>
          {!readOnly && (
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4 mr-1" /> Adaugă Administrator
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {administratori.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed rounded-lg text-muted-foreground">
              <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nu există administratori. Adăugați cel puțin unul.</p>
              <p className="text-xs mt-1">De obicei, asociatul unic este și administratorul.</p>
            </div>
          ) : (
            administratori.map((admin: any, idx: number) => (
              <div key={idx} className="p-4 border rounded-lg flex justify-between items-start">
                <div>
                  <p className="font-semibold">{admin.numeComplet}</p>
                  <p className="text-sm text-muted-foreground capitalize">{admin.functie}</p>
                  <p className="text-xs text-muted-foreground">
                    {admin.mandatNelimitat ? "Mandat nelimitat" : `Mandat: ${admin.durataMandatAni} ani`}
                    {admin.esteAsociat && " • Asociat"}
                  </p>
                </div>
                {!readOnly && (
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => openEdit(idx)}>Editează</Button>
                    <Button variant="destructive" size="sm" onClick={() => onRemove(idx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}

          <div className="flex justify-between pt-4 border-t">
            <Button type="button" variant="outline" onClick={onBack}>Înapoi</Button>
            {!readOnly && (
              <Button onClick={onNext} disabled={administratori.length === 0}>
                Următorul pas <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal Administrator */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editIndex !== null ? "Editare Administrator" : "Adăugare Administrator"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
              <FormField control={form.control} name="numeComplet" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nume complet</FormLabel>
                  <FormControl><Input {...field} placeholder="Prenume Nume" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="cnp" render={({ field }) => (
                <FormItem>
                  <FormLabel>CNP <span className="text-muted-foreground">(opțional)</span></FormLabel>
                  <FormControl><Input {...field} placeholder="1234567890123" maxLength={13} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="functie" render={({ field }) => (
                <FormItem>
                  <FormLabel>Funcție</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="administrator">Administrator</SelectItem>
                      <SelectItem value="director_general">Director General</SelectItem>
                      <SelectItem value="director_executiv">Director Executiv</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="mandatNelimitat" render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="cursor-pointer">Mandat nelimitat</FormLabel>
                </FormItem>
              )} />

              {!mandatNelimitat && (
                <FormField control={form.control} name="durataMandatAni" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Durată mandat (ani)</FormLabel>
                    <FormControl><Input type="number" min={1} max={99} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              <FormField control={form.control} name="esteAsociat" render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="cursor-pointer">Este și asociat al firmei</FormLabel>
                </FormItem>
              )} />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Anulează</Button>
                <Button type="submit">Salvează</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── PAS 9: CONFIRMARE ────────────────────────────────────────────────────────
function Pas9Confirmare({ dosar, pachet, tva, impozitare, administratori, onSubmit, onBack, readOnly, isSubmitting }: any) {
  const { data: asociati } = useListAsociatiDosar(dosar.id, {
    query: { queryKey: getListAsociatiDosarQueryKey(dosar.id) },
  });

  const rows = [
    { label: "Pachet", value: pachet === "complet" ? "Pachet Complet" : "Doar Înființare" },
    { label: "Denumire", value: dosar.denumireFirma },
    { label: "Forma juridică", value: dosar.formaJuridica },
    { label: "Județ / Localitate", value: [dosar.judet, dosar.localitate].filter(Boolean).join(", ") },
    { label: "Sediu social", value: dosar.adresaSediu },
    { label: "Cod CAEN principal", value: dosar.codCaenPrincipal },
    { label: "Capital social", value: `${dosar.capitalSocial} RON` },
    { label: "Regim TVA", value: tva === "platitor" ? "Plătitor TVA" : "Neplătitor TVA" },
    { label: "Sistem impozitare", value: impozitare === "micro" ? "Impozit pe venit (Micro)" : "Impozit pe profit 16%" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pasul 9: Confirmare și Trimitere</CardTitle>
        <CardDescription>Verificați toate datele înainte de a trimite dosarul.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Date generale */}
        <div className="rounded-lg border divide-y overflow-hidden">
          {rows.map(row => (
            <div key={row.label} className="grid grid-cols-2 px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-medium">{row.value || "–"}</span>
            </div>
          ))}
        </div>

        {/* Asociați */}
        <div>
          <h4 className="font-semibold text-sm mb-2">Asociați ({asociati?.length || 0})</h4>
          <div className="space-y-2">
            {asociati?.map(a => (
              <div key={a.id} className="flex justify-between text-sm border rounded-lg px-4 py-2.5">
                <span className="font-medium">{a.numeComplet}</span>
                <span className="text-muted-foreground">{a.procentDetinere}% • {a.aportCapital} RON</span>
              </div>
            ))}
          </div>
        </div>

        {/* Administratori */}
        {administratori.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-2">Administratori ({administratori.length})</h4>
            <div className="space-y-2">
              {administratori.map((a: any, i: number) => (
                <div key={i} className="flex justify-between text-sm border rounded-lg px-4 py-2.5">
                  <span className="font-medium">{a.numeComplet}</span>
                  <span className="text-muted-foreground capitalize">{a.functie}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between pt-4 border-t">
          {!readOnly && <Button type="button" variant="outline" onClick={onBack}>Înapoi</Button>}
          {readOnly ? (
            <Button asChild className="w-full sm:w-auto">
              <Link href="/dosare">Înapoi la lista de dosare</Link>
            </Button>
          ) : (
            <Button onClick={onSubmit} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
              {isSubmitting ? "Se trimite..." : "✓ Trimite Dosarul"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
