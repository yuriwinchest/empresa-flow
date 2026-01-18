import { useMemo, useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { z } from "zod";
import logoTatica from "@/assets/logo-tatica.png";

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

// 20 Imagens de alta qualidade do Unsplash relacionadas a Business, Finance, Accounting
const carouselItems = [
  {
    image: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1920",
    title: "Gestão Corporativa de Elite",
    description: "Ambientes digitais otimizados para o crescimento sustentável da sua empresa.",
  },
  {
    image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=1920",
    title: "Inteligência Financeira",
    description: "Dashboards precisos que transformam números em decisões estratégicas.",
  },
  {
    image: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=1920",
    title: "Conexão e Colaboração",
    description: "Integre equipes e departamentos em uma única plataforma fluida.",
  },
  {
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1920",
    title: "Análise de Dados em Tempo Real",
    description: "Monitore o pulso do seu negócio com métricas atualizadas instantaneamente.",
  },
  {
    image: "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&q=80&w=1920",
    title: "Parcerias de Sucesso",
    description: "Fortaleça o relacionamento com clientes e fornecedores através de processos transparentes.",
  },
  {
    image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=1920",
    title: "Liderança Visionária",
    description: "Ferramentas que empoderam gestores a enxergar além do óbvio.",
  },
  {
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1920",
    title: "Estrutura Sólida",
    description: "Uma base tecnológica robusta para suportar o crescimento do seu império.",
  },
  {
    image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&q=80&w=1920",
    title: "Reuniões Mais Produtivas",
    description: "Dados organizados que tornam cada encontro de negócios mais eficiente.",
  },
  {
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=1920",
    title: "Contabilidade Descomplicada",
    description: "Simplifique a burocracia e foque no que realmente importa: resultados.",
  },
  {
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?auto=format&fit=crop&q=80&w=1920",
    title: "Fluxo de Caixa Otimizado",
    description: "Controle total sobre entradas e saídas para uma saúde financeira impecável.",
  },
  {
    image: "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&q=80&w=1920",
    title: "Mobilidade Empresarial",
    description: "Acesse seus dados de qualquer lugar, a qualquer hora, com total segurança.",
  },
  {
    image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=1920",
    title: "Equipes Sincronizadas",
    description: "Workflow alinhado para maximizar a produtividade do seu time.",
  },
  {
    image: "https://images.unsplash.com/photo-1504384308090-c54be3855833?auto=format&fit=crop&q=80&w=1920",
    title: "Organização Documental",
    description: "Diga adeus à papelada e abrace a eficiência digital.",
  },
  {
    image: "https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80&w=1920",
    title: "Profissionalismo em Cada Detalhe",
    description: "Uma interface elegante que reflete a qualidade do seu trabalho.",
  },
  {
    image: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&q=80&w=1920",
    title: "Ambientes Inspiradores",
    description: "Tecnologia que se adapta ao seu estilo de trabalho moderno.",
  },
  {
    image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=1920",
    title: "Planejamento Estratégico",
    description: "Transforme metas em realidade com acompanhamento detalhado.",
  },
  {
    image: "https://images.unsplash.com/photo-1664575602554-208c7a2643b9?auto=format&fit=crop&q=80&w=1920",
    title: "Inovação Constante",
    description: "Esteja sempre à frente com as melhores práticas de gestão do mercado.",
  },
  {
    image: "https://images.unsplash.com/photo-1664575602276-acd073f104c1?auto=format&fit=crop&q=80&w=1920",
    title: "Visão 360º do Negócio",
    description: "Integração completa de todos os setores da sua empresa.",
  },
  {
    image: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=1920",
    title: "Foco no Cliente",
    description: "Ferramentas que ajudam você a entregar mais valor para quem importa.",
  },
  {
    image: "https://images.unsplash.com/photo-1434626881859-194d67b2b86f?auto=format&fit=crop&q=80&w=1920",
    title: "Resultados Tangíveis",
    description: "Acompanhe o ROI de cada ação e maximize seus lucros.",
  },
];

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, signUp, loading, activeClient } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [carouselIndex, setCarouselIndex] = useState(0);

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

  // Lógica do Carrossel Automático (Troca a cada 5 segundos)
  useEffect(() => {
    const timer = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % carouselItems.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <div className="text-zinc-400 font-medium animate-pulse">Carregando sistema...</div>
        </div>
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  const handleForgotPassword = async () => {
    if (!loginEmail) {
      toast.error("Por favor, informe seu email para recuperar a senha.");
      return;
    }
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

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-zinc-950 overflow-hidden">
      {/* Seção do Carrossel (Esquerda - Desktop) */}
      <div className="relative hidden lg:flex items-center justify-center overflow-hidden h-full">
        {carouselItems.map((item, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-all duration-1000 ease-in-out transform ${index === carouselIndex ? "opacity-100 scale-100 z-10" : "opacity-0 scale-110 pointer-events-none z-0"
              }`}
          >
            {/* Gradiente Overlay para legibilidade */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/20 to-zinc-950/30 z-10" />
            
            <img
              src={item.image}
              alt={item.title}
              className="w-full h-full object-cover"
            />
            
            <div className="absolute bottom-20 left-12 right-12 z-20 space-y-4">
              <h2 className="text-4xl font-bold text-white tracking-tight leading-tight drop-shadow-lg">
                {item.title}
              </h2>
              <p className="text-xl text-zinc-200 max-w-lg leading-relaxed drop-shadow-md font-medium">
                {item.description}
              </p>
              
              {/* Indicadores do Carrossel */}
              <div className="flex gap-2 pt-6">
                {carouselItems.map((_, dotIndex) => (
                  <button
                    key={dotIndex}
                    onClick={() => setCarouselIndex(dotIndex)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      dotIndex === carouselIndex 
                        ? "w-8 bg-primary shadow-[0_0_10px_rgba(255,255,255,0.5)]" 
                        : "w-1.5 bg-white/30 hover:bg-white/50"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Logo Flutuante no Carrossel */}
        <div className="absolute top-12 left-12 z-30 flex items-center gap-3">
          <div className="w-12 h-12 bg-black/40 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10 shadow-xl">
             <img src={logoTatica} alt="Logo" className="w-8 h-8 object-contain" />
          </div>
          <span className="text-white font-bold text-xl tracking-widest uppercase drop-shadow-lg">Tática Gestão</span>
        </div>
      </div>

      {/* Seção do Formulário (Direita) */}
      <div className="flex items-center justify-center p-4 md:p-8 lg:p-12 relative bg-zinc-950">
        {/* Background Effects */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="w-full max-w-[440px] z-10">
          <div className="flex flex-col items-center mb-10 lg:items-start">
            <div className="lg:hidden mb-8">
               <img src={logoTatica} alt="Tática" className="h-16 w-auto drop-shadow-2xl" />
            </div>
            
            <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
              {isRecoveryFlow ? "Nova Senha" : "Bem-vindo"}
            </h1>
            <p className="text-zinc-400 text-center lg:text-left text-lg leading-relaxed">
              {isRecoveryFlow
                ? "Defina uma senha segura para sua conta."
                : "Acesse sua plataforma e gerencie seu negócio com inteligência."}
            </p>
          </div>

          <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group">
            {/* Borda brilhante suave ao passar o mouse (opcional) */}
            <div className="absolute inset-0 border border-white/5 rounded-[2rem] pointer-events-none group-hover:border-white/10 transition-colors duration-500" />

            {isRecoveryFlow ? (
              <form onSubmit={handleResetPassword} className="space-y-6 relative z-10">
                <div className="space-y-2">
                  <Label htmlFor="reset-password">Nova senha</Label>
                  <Input
                    id="reset-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    required
                    className="bg-zinc-950/60 border-white/10 focus:ring-primary/50 focus:border-primary/50 rounded-xl h-12 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reset-confirm-password">Confirmar nova senha</Label>
                  <Input
                    id="reset-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                    required
                    className="bg-zinc-950/60 border-white/10 focus:ring-primary/50 focus:border-primary/50 rounded-xl h-12 transition-all"
                  />
                </div>
                <Button type="submit" className="w-full h-12 rounded-xl text-lg font-semibold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 transition-all" disabled={isLoading}>
                  {isLoading ? "Atualizando..." : "Atualizar senha"}
                </Button>
              </form>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8 relative z-10">
                <TabsList className="grid w-full grid-cols-2 p-1 bg-zinc-950/60 rounded-2xl h-14 border border-white/5">
                  <TabsTrigger value="login" className="rounded-xl h-full data-[state=active]:bg-zinc-800 data-[state=active]:text-white font-medium transition-all">Entrar</TabsTrigger>
                  <TabsTrigger value="signup" className="rounded-xl h-full data-[state=active]:bg-zinc-800 data-[state=active]:text-white font-medium transition-all">Criar Conta</TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-zinc-400 pl-1">Email corporativo</Label>
                      <Input
                        id="login-email"
                        type="email"
                        autoComplete="email"
                        placeholder="seu@empresa.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        className="bg-zinc-950/60 border-white/10 focus:border-primary/50 focus:ring-primary/20 rounded-xl h-12 text-white placeholder:text-zinc-600 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center pl-1">
                        <Label htmlFor="login-password" className="text-zinc-400">Senha</Label>
                        <button
                          type="button"
                          className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                          onClick={handleForgotPassword}
                        >
                          Esqueci minha senha
                        </button>
                      </div>
                      <Input
                        id="login-password"
                        type="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        className="bg-zinc-950/60 border-white/10 focus:border-primary/50 focus:ring-primary/20 rounded-xl h-12 text-white placeholder:text-zinc-600 transition-all"
                      />
                    </div>
                    <Button type="submit" className="w-full h-12 rounded-xl text-lg font-bold hover:scale-[1.02] transition-all active:scale-[0.98] shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground mt-2" disabled={isLoading}>
                      {isLoading ? "Autenticando..." : "Acessar Plataforma"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <form onSubmit={handleSignup} className="space-y-5">
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-name" className="text-zinc-400 pl-1">Nome Completo</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Seu nome"
                        value={signupFullName}
                        onChange={(e) => setSignupFullName(e.target.value)}
                        required
                        className="bg-zinc-950/60 border-white/10 focus:border-primary/50 focus:ring-primary/20 rounded-xl h-12 text-white placeholder:text-zinc-600 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-email" className="text-zinc-400 pl-1">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        autoComplete="email"
                        placeholder="seu@email.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        required
                        className="bg-zinc-950/60 border-white/10 focus:border-primary/50 focus:ring-primary/20 rounded-xl h-12 text-white placeholder:text-zinc-600 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-password" className="text-zinc-400 pl-1">Senha</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="••••••••"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                        className="bg-zinc-950/60 border-white/10 focus:border-primary/50 focus:ring-primary/20 rounded-xl h-12 text-white placeholder:text-zinc-600 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-confirm" className="text-zinc-400 pl-1">Confirmar senha</Label>
                      <Input
                        id="signup-confirm"
                        type="password"
                        autoComplete="new-password"
                        placeholder="••••••••"
                        value={signupConfirmPassword}
                        onChange={(e) => setSignupConfirmPassword(e.target.value)}
                        required
                        className="bg-zinc-950/60 border-white/10 focus:border-primary/50 focus:ring-primary/20 rounded-xl h-12 text-white placeholder:text-zinc-600 transition-all"
                      />
                    </div>
                    <Button type="submit" className="w-full h-12 rounded-xl text-lg font-bold hover:scale-[1.02] transition-all active:scale-[0.98] shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground mt-4" disabled={isLoading}>
                      {isLoading ? "Criando conta..." : "Começar Agora"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </div>

          <div className="mt-10 flex flex-col items-center gap-4 text-center">
            <p className="text-zinc-500 text-sm">
              © {new Date().getFullYear()} Tática Gestão. Segurança e Performance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
