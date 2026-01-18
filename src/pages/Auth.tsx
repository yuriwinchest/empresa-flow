import { useMemo, useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { toast } from "sonner";
import { z } from "zod";
import logoTatica from "@/assets/logo-tatica.png";
import { BarChart3, Users, TrendingUp, Shield, Zap, Target } from "lucide-react";
import Autoplay from "embla-carousel-autoplay";

const loginSchema = z.object({
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().trim().min(3, "Nome deve ter no mínimo 3 caracteres").max(100),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não conferem",
  path: ["confirmPassword"],
});

const resetSchema = z.object({
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não conferem",
  path: ["confirmPassword"],
});

const toPtBrAuthError = (message: string) => {
  const msg = (message || "").toLowerCase();

  if (msg.includes("invalid login credentials"))
    return "Email ou senha incorretos. Se não lembrar, clique em “Esqueci minha senha”.";
  if (msg.includes("email not confirmed"))
    return "Email ainda não confirmado. Verifique sua caixa de entrada ou spam.";
  if (msg.includes("user not found")) return "Usuário não encontrado";
  if (msg.includes("too many requests"))
    return "Muitas tentativas. Aguarde um pouco e tente novamente.";
  if (msg.includes("token has expired") || msg.includes("invalid or expired"))
    return "Link inválido ou expirado. Solicite novamente a redefinição de senha.";
  if (msg.includes("password should be at least") || msg.includes("weak password"))
    return "Senha fraca. Use uma senha mais forte.";
  if (
    msg.includes("already registered") ||
    msg.includes("user already registered") ||
    msg.includes("already been registered") ||
    msg.includes("duplicate") ||
    msg.includes("already exists")
  ) {
    return "Este email já está cadastrado";
  }

  return message;
};

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, signUp, loading, activeClient } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupFullName, setSignupFullName] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");

  const isRecoveryFlow = useMemo(() => {
    const hash = window.location.hash || "";
    const search = window.location.search || "";
    return hash.includes("type=recovery") || search.includes("type=recovery");
  }, []);

  useEffect(() => {
    if (user && !loading) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sidebar">
        <div className="animate-pulse text-sidebar-foreground">Carregando...</div>
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  const handleForgotPassword = async () => {
    setIsLoading(true);
    try {
      const validated = z.string().trim().email("Email inválido").max(255).parse(loginEmail);
      const { error } = await activeClient.auth.resetPasswordForEmail(validated, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) {
        toast.error(toPtBrAuthError(error.message));
        return;
      }

      toast.success("Enviamos um email para redefinir sua senha.");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validated = resetSchema.parse({
        password: resetPassword,
        confirmPassword: resetConfirmPassword,
      });

      const { error } = await activeClient.auth.updateUser({ password: validated.password });
      if (error) {
        toast.error(toPtBrAuthError(error.message));
        return;
      }

      toast.success("Senha atualizada com sucesso!");
      window.location.hash = "";
      navigate("/dashboard");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validated = loginSchema.parse({
        email: loginEmail,
        password: loginPassword,
      });

      const { error } = await signIn(validated.email, validated.password);

      if (error) {
        toast.error(toPtBrAuthError(error.message));
        return;
      }

      toast.success("Login realizado com sucesso!");
      navigate("/dashboard");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validated = signupSchema.parse({
        email: signupEmail,
        password: signupPassword,
        confirmPassword: signupConfirmPassword,
        fullName: signupFullName,
      });

      const { error } = await signUp(validated.email, validated.password, validated.fullName);

      if (error) {
        toast.error(toPtBrAuthError(error.message));
        return;
      }

      toast.success("Conta criada com sucesso!");
      navigate("/dashboard");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: BarChart3,
      title: "Análise Inteligente",
      description: "Transforme dados em insights estratégicos com dashboards interativos e relatórios personalizados."
    },
    {
      icon: Users,
      title: "Gestão de Clientes",
      description: "Centralize informações de clientes PF e PJ com OCR automático de documentos e CNPJs."
    },
    {
      icon: TrendingUp,
      title: "Crescimento Acelerado",
      description: "Monitore KPIs em tempo real e tome decisões baseadas em dados concretos."
    },
    {
      icon: Shield,
      title: "Segurança Total",
      description: "Seus dados protegidos com criptografia de ponta a ponta e backups automáticos."
    },
    {
      icon: Zap,
      title: "Automação Inteligente",
      description: "Economize tempo com processos automatizados e fluxos de trabalho otimizados."
    },
    {
      icon: Target,
      title: "Foco em Resultados",
      description: "Ferramentas projetadas para impulsionar o crescimento do seu negócio."
    }
  ];

  const plugin = useMemo(
    () => [
      Autoplay({
        delay: 4000,
        stopOnInteraction: true,
      })
    ],
    []
  );

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-sidebar via-sidebar to-sidebar/95">
      {/* Left Side - Feature Carousel (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden">
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-primary/10 z-10 pointer-events-none" />

        {/* Decorative Elements */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

        <div className="relative z-20 flex flex-col items-center justify-center w-full p-12 xl:p-16">
          {/* Logo */}
          <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <img src={logoTatica} alt="Tática" className="h-20 xl:h-24 w-auto drop-shadow-2xl" />
          </div>

          {/* Title */}
          <h1 className="text-4xl xl:text-5xl font-bold text-white mb-4 text-center animate-in fade-in slide-in-from-bottom-5 duration-700 delay-100">
            Tática <span className="text-gold-gradient">Flow</span>
          </h1>
          <p className="text-sidebar-foreground text-lg xl:text-xl mb-16 text-center max-w-2xl animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
            Acesse sua plataforma de gestão inteligente e acelere seus resultados
          </p>

          {/* Carousel */}
          <Carousel
            className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-7 duration-700 delay-300"
            plugins={plugin}
            opts={{
              align: "start",
              loop: true,
            }}
          >
            <CarouselContent>
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <CarouselItem key={index}>
                    <div className="p-8">
                      <Card className="bg-card/10 backdrop-blur-md border-primary/20 hover:border-primary/40 transition-all duration-300">
                        <CardContent className="flex flex-col items-center text-center p-8 space-y-4">
                          <div className="p-4 rounded-full bg-primary/20 backdrop-blur-sm">
                            <Icon className="w-10 h-10 text-primary" />
                          </div>
                          <h3 className="text-2xl font-semibold text-white">
                            {feature.title}
                          </h3>
                          <p className="text-sidebar-foreground text-base leading-relaxed">
                            {feature.description}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <CarouselPrevious className="left-0 bg-primary/20 hover:bg-primary/30 border-primary/40 text-white" />
            <CarouselNext className="right-0 bg-primary/20 hover:bg-primary/30 border-primary/40 text-white" />
          </Carousel>

          {/* Dots Indicator */}
          <div className="flex gap-2 mt-8">
            {features.map((_, index) => (
              <div key={index} className="w-2 h-2 rounded-full bg-primary/30" />
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center space-y-4 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <img src={logoTatica} alt="Tática" className="h-16 w-auto drop-shadow-xl" />
            <h1 className="text-3xl font-bold text-white">
              Tática <span className="text-gold-gradient">Flow</span>
            </h1>
          </div>

          {/* Auth Card */}
          <Card className="bg-card border-border shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-500 delay-100">
            <CardHeader className="space-y-3 pb-6">
              <CardTitle className="text-2xl font-bold text-center text-foreground">
                {isRecoveryFlow ? "Redefinir Senha" : "Bem-vindo"}
              </CardTitle>
              <CardDescription className="text-center text-muted-foreground">
                {isRecoveryFlow
                  ? "Crie uma nova senha segura para sua conta"
                  : "Entre na sua conta ou crie uma nova"}
              </CardDescription>
            </CardHeader>

            <CardContent className="pb-6">
              {isRecoveryFlow ? (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-password" className="text-foreground">Nova senha</Label>
                    <Input
                      id="reset-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      className="h-11"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reset-confirm-password" className="text-foreground">Confirmar nova senha</Label>
                    <Input
                      id="reset-confirm-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={resetConfirmPassword}
                      onChange={(e) => setResetConfirmPassword(e.target.value)}
                      className="h-11"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full h-11 mt-6" disabled={isLoading}>
                    {isLoading ? "Atualizando..." : "Atualizar senha"}
                  </Button>
                </form>
              ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6 h-11">
                    <TabsTrigger value="login" className="text-sm font-medium">Entrar</TabsTrigger>
                    <TabsTrigger value="signup" className="text-sm font-medium">Criar Conta</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login" className="mt-0">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email" className="text-foreground">Email corporativo</Label>
                        <Input
                          id="login-email"
                          type="email"
                          autoComplete="email"
                          placeholder="seu@empresa.com"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="h-11"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password" className="text-foreground">Senha de acesso</Label>
                        <Input
                          id="login-password"
                          type="password"
                          autoComplete="current-password"
                          placeholder="••••••••"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="h-11"
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full h-11 mt-6" disabled={isLoading}>
                        {isLoading ? "Entrando..." : "Entrar"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full h-11 text-primary hover:text-primary/80 hover:bg-primary/5"
                        disabled={isLoading}
                        onClick={handleForgotPassword}
                      >
                        Esqueci minha senha
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup" className="mt-0">
                    <form onSubmit={handleSignup} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name" className="text-foreground">Nome Completo</Label>
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="Seu nome completo"
                          value={signupFullName}
                          onChange={(e) => setSignupFullName(e.target.value)}
                          className="h-11"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email" className="text-foreground">Email</Label>
                        <Input
                          id="signup-email"
                          type="email"
                          autoComplete="email"
                          placeholder="seu@empresa.com"
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          className="h-11"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password" className="text-foreground">Senha</Label>
                        <Input
                          id="signup-password"
                          type="password"
                          autoComplete="new-password"
                          placeholder="••••••••"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          className="h-11"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-confirm" className="text-foreground">Confirmar Senha</Label>
                        <Input
                          id="signup-confirm"
                          type="password"
                          autoComplete="new-password"
                          placeholder="••••••••"
                          value={signupConfirmPassword}
                          onChange={(e) => setSignupConfirmPassword(e.target.value)}
                          className="h-11"
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full h-11 mt-6" disabled={isLoading}>
                        {isLoading ? "Criando conta..." : "Criar Conta"}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>

          {/* Footer Text - Mobile Only */}
          <p className="lg:hidden text-center text-sidebar-foreground/60 text-sm animate-in fade-in duration-700 delay-300">
            Plataforma de gestão empresarial inteligente
          </p>
        </div>
      </div>
    </div>
  );
}
