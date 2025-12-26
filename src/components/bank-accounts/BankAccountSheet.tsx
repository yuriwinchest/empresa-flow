import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { BankAccountForm } from "./BankAccountForm";

interface BankAccountSheetProps {
    isOpen: boolean;
    onClose: () => void;
    dataToEdit?: any;
}

export function BankAccountSheet({ isOpen, onClose, dataToEdit }: BankAccountSheetProps) {
    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="sm:max-w-[540px] overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle>{dataToEdit ? "Editar Conta Bancária" : "Nova Conta Bancária"}</SheetTitle>
                    <SheetDescription>
                        {dataToEdit
                            ? "Edite os dados da conta bancária abaixo."
                            : "Cadastre uma nova conta bancária para controlar seu fluxo de caixa."}
                    </SheetDescription>
                </SheetHeader>
                <BankAccountForm onSuccess={onClose} initialData={dataToEdit} />
            </SheetContent>
        </Sheet>
    );
}
