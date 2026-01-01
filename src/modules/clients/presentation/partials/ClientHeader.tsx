
import { UseFormReturn } from "react-hook-form";
import { User, Search, Globe } from "lucide-react";

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { ClientFormValues } from "../../domain/schemas/client.schema";
import { maskCNPJ, maskCPF } from "@/utils/masks";

interface ClientHeaderProps {
    form: UseFormReturn<ClientFormValues>;
    isCnpjLoading: boolean;
    onCnpjLookup: () => void;
}

export function ClientHeader({ form, isCnpjLoading, onCnpjLookup }: ClientHeaderProps) {
    return (
        <div className="flex gap-6 items-start bg-slate-50/50 p-4 rounded-lg border border-slate-100 mb-6">

            {/* Área do Logo (Placeholder para implementação futura de upload) */}
            <div className="flex flex-col items-center gap-2">
                <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center border-4 border-white shadow-sm overflow-hidden">
                    <User className="w-10 h-10 text-slate-400" />
                </div>
                <button type="button" className="text-xs text-blue-600 font-semibold hover:underline">
                    Alterar Logo
                </button>
            </div>

            {/* Campos Principais */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">

                {/* Razão Social */}
                <div className="md:col-span-3 space-y-1">
                    <FormField
                        control={form.control}
                        name="razao_social"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-600 text-xs font-bold uppercase">Razão Social / Nome Completo</FormLabel>
                                <FormControl>
                                    <Input className="h-9 focus-visible:ring-green-600 border-slate-300" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* CPF/CNPJ com Botão de Consulta */}
                <div className="space-y-1">
                    <FormField
                        control={form.control}
                        name="cpf_cnpj"
                        render={({ field }) => (
                            <FormItem>
                                <div className="flex justify-between items-center">
                                    <FormLabel className="text-slate-600 text-xs font-bold uppercase">CNPJ / CPF</FormLabel>
                                    <button
                                        type="button"
                                        className="text-[10px] text-green-600 flex items-center gap-1 disabled:opacity-60 hover:underline"
                                        onClick={onCnpjLookup}
                                        disabled={isCnpjLoading}
                                    >
                                        <Globe className="w-3 h-3" /> {isCnpjLoading ? "Consultando..." : "Pesquisar SEFAZ"}
                                    </button>
                                </div>
                                <FormControl>
                                    <Input
                                        className="h-9 focus-visible:ring-green-600 border-slate-300"
                                        {...field}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const tipo = form.getValues("tipo_pessoa");
                                            field.onChange(tipo === "PJ" ? maskCNPJ(val) : maskCPF(val));
                                        }}
                                        maxLength={18}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Nome Fantasia */}
                <div className="md:col-span-2 space-y-1">
                    <FormField
                        control={form.control}
                        name="nome_fantasia"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-600 text-xs font-bold uppercase">Nome Fantasia</FormLabel>
                                <FormControl>
                                    <Input className="h-9 focus-visible:ring-green-600 border-slate-300" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Categoria seria aqui (mas não vou complicar agora) */}
            </div>
        </div>
    );
}
