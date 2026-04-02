import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateDosar, getListDosareQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const schema = z.object({
  denumireFirma: z.string().min(1, "Denumirea firmei este obligatorie"),
  formaJuridica: z.enum(["SRL", "SA", "SNC", "SCS", "RA", "SRL_D"], {
    required_error: "Forma juridică este obligatorie",
  }),
});

export default function DosarNou() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const mutation = useCreateDosar();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      denumireFirma: "",
      formaJuridica: "SRL",
    },
  });

  function onSubmit(values: z.infer<typeof schema>) {
    mutation.mutate(
      { data: values },
      {
        onSuccess: (dosar) => {
          queryClient.invalidateQueries({ queryKey: getListDosareQueryKey() });
          toast({
            title: "Dosar creat cu succes!",
            description: "Acum puteți continua cu completarea detaliilor.",
          });
          setLocation(`/dosare/${dosar.id}`);
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "Eroare la crearea dosarului",
            description: error.data?.eroare || "Ceva nu a funcționat corect.",
          });
        },
      }
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dosare">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Creare Dosar Nou</h1>
          <p className="text-muted-foreground mt-1">Începeți procesul de înregistrare pentru o firmă nouă.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informații de bază</CardTitle>
          <CardDescription>
            Aceste informații vor fi folosite pentru a inițializa dosarul. Le veți putea modifica ulterior.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="denumireFirma"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Denumirea firmei propuse</FormLabel>
                    <FormControl>
                      <Input placeholder="EXEMPLU SRL" {...field} data-testid="input-denumire-firma" />
                    </FormControl>
                    <FormDescription>
                      Introduceți denumirea dorită, fără a include forma juridică la final.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="formaJuridica"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Forma Juridică</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-forma-juridica">
                          <SelectValue placeholder="Selectați forma juridică" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="SRL">SRL - Societate cu Răspundere Limitată</SelectItem>
                        <SelectItem value="SRL_D">SRL-D - SRL Debutant</SelectItem>
                        <SelectItem value="SA">SA - Societate pe Acțiuni</SelectItem>
                        <SelectItem value="SNC">SNC - Societate în Nume Colectiv</SelectItem>
                        <SelectItem value="SCS">SCS - Societate în Comandită Simplă</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4 pt-4 border-t border-border">
                <Button variant="outline" asChild>
                  <Link href="/dosare">Anulare</Link>
                </Button>
                <Button 
                  type="submit" 
                  disabled={mutation.isPending}
                  data-testid="button-submit-dosar-nou"
                >
                  {mutation.isPending ? "Se creează..." : "Continuă la pasul următor"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
