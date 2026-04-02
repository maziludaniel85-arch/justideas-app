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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useInregistrareUtilizator } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building } from "lucide-react";

const schema = z.object({
  email: z.string().email("Email invalid"),
  parola: z.string().min(8, "Parola trebuie să aibă minim 8 caractere"),
  nume: z.string().min(1, "Numele este obligatoriu"),
  prenume: z.string().min(1, "Prenumele este obligatoriu"),
  telefon: z.string().optional(),
});

export default function Inregistrare() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const mutation = useInregistrareUtilizator();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      parola: "",
      nume: "",
      prenume: "",
      telefon: "",
    },
  });

  function onSubmit(values: z.infer<typeof schema>) {
    mutation.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          login(data.token);
          setLocation("/dashboard");
          toast({
            title: "Cont creat cu succes!",
            description: "Bine ați venit pe platforma JustIdeas.",
          });
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "Eroare la înregistrare",
            description: error.data?.eroare || "Ceva nu a funcționat corect.",
          });
        },
      }
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <div className="h-12 w-12 bg-primary rounded-xl flex items-center justify-center mb-4 text-primary-foreground">
            <Building className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Creare cont</h1>
          <p className="text-muted-foreground mt-2">Completați datele pentru a vă înregistra</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nume"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nume</FormLabel>
                        <FormControl>
                          <Input placeholder="Popescu" {...field} data-testid="input-nume" />
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
                          <Input placeholder="Ion" {...field} data-testid="input-prenume" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="nume@exemplu.ro" {...field} data-testid="input-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="telefon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefon (Opțional)</FormLabel>
                      <FormControl>
                        <Input placeholder="07XX XXX XXX" {...field} data-testid="input-telefon" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="parola"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parolă</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} data-testid="input-parola" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={mutation.isPending}
                  data-testid="button-submit-register"
                >
                  {mutation.isPending ? "Se procesează..." : "Creare cont"}
                </Button>
              </form>
            </Form>
            
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Aveți deja cont? </span>
              <Link href="/autentificare" className="text-primary hover:underline font-medium" data-testid="link-login">
                Autentificați-vă
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
