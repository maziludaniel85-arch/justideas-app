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
import { useAutentificareUtilizator } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building } from "lucide-react";

const schema = z.object({
  email: z.string().email("Email invalid"),
  parola: z.string().min(1, "Parola este obligatorie"),
});

export default function Autentificare() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const mutation = useAutentificareUtilizator();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      parola: "",
    },
  });

  function onSubmit(values: z.infer<typeof schema>) {
    mutation.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          login(data.token);
          setLocation("/dashboard");
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "Eroare la autentificare",
            description: error.data?.eroare || "Ceva nu a funcționat corect.",
          });
        },
      }
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <div className="h-12 w-12 bg-primary rounded-xl flex items-center justify-center mb-4 text-primary-foreground">
            <Building className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">JustIdeas</h1>
          <p className="text-muted-foreground mt-2">Platforma oficială de înregistrare firme</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Autentificare</CardTitle>
            <CardDescription>Introduceți datele pentru a vă accesa contul</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="nume@exemplu.ro" {...field} data-testid="input-email" />
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
                  data-testid="button-submit-login"
                >
                  {mutation.isPending ? "Se procesează..." : "Autentificare"}
                </Button>
              </form>
            </Form>
            
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Nu aveți cont? </span>
              <Link href="/inregistrare" className="text-primary hover:underline font-medium" data-testid="link-register">
                Înregistrați-vă
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
