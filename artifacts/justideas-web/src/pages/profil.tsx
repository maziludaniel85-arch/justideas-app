import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useUpdateProfil, getGetProfilQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQueryClient } from "@tanstack/react-query";
import { User } from "lucide-react";
import { useEffect } from "react";

const schema = z.object({
  nume: z.string().min(1, "Numele este obligatoriu"),
  prenume: z.string().min(1, "Prenumele este obligatoriu"),
  telefon: z.string().optional().nullable(),
});

export default function Profil() {
  const { profil } = useAuth();
  const { toast } = useToast();
  const mutation = useUpdateProfil();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      nume: "",
      prenume: "",
      telefon: "",
    },
  });

  useEffect(() => {
    if (profil) {
      form.reset({
        nume: profil.nume,
        prenume: profil.prenume,
        telefon: profil.telefon || "",
      });
    }
  }, [profil, form]);

  function onSubmit(values: z.infer<typeof schema>) {
    mutation.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetProfilQueryKey(), data);
          toast({
            title: "Profil actualizat",
            description: "Modificările au fost salvate cu succes.",
          });
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "Eroare",
            description: error.data?.eroare || "Ceva nu a funcționat corect.",
          });
        },
      }
    );
  }

  if (!profil) return null;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Profilul Meu</h1>
        <p className="text-muted-foreground mt-1">Actualizați informațiile contului dumneavoastră.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informații personale
          </CardTitle>
          <CardDescription>Aceste informații vor fi precompletate în noile dosare create.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 pb-6 border-b border-border">
            <FormItem>
              <FormLabel>Adresă de Email (ne-modificabilă)</FormLabel>
              <FormControl>
                <Input value={profil.email} disabled className="bg-muted" />
              </FormControl>
            </FormItem>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nume"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nume</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-profil-nume" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="prenume"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prenume</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-profil-prenume" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="telefon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon (Opțional)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-profil-telefon" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={mutation.isPending || !form.formState.isDirty}
                  data-testid="button-submit-profil"
                >
                  {mutation.isPending ? "Se salvează..." : "Salvează modificările"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
