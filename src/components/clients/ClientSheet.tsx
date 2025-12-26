import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { ClientForm } from "./ClientForm";

interface ClientSheetProps {
    isOpen: boolean;
    onClose: () => void;
    clientToEdit?: any; // Replace with proper type
}

export function ClientSheet({ isOpen, onClose, clientToEdit }: ClientSheetProps) {
    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="sm:max-w-[540px] overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle>{clientToEdit ? "Editar Cliente" : "Novo Cliente"}</SheetTitle>
                    <SheetDescription>
                        {clientToEdit
                            ? "Edite os dados do cliente abaixo."
                            : "Preencha os dados para cadastrar um novo cliente."}
                    </SheetDescription>
                </SheetHeader>
                <ClientForm onSuccess={onClose} initialData={clientToEdit} />
            </SheetContent>
        </Sheet>
    );
}
