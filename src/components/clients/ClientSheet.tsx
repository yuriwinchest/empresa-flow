import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { ClientForm } from "./ClientForm";

interface ClientSheetProps {
    isOpen: boolean;
    onClose: () => void;
    clientToEdit?: any;
}

export function ClientSheet({ isOpen, onClose, clientToEdit }: ClientSheetProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="mb-4">
                    <DialogTitle>{clientToEdit ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
                    <DialogDescription>
                        {clientToEdit
                            ? "Edite os dados do cliente abaixo."
                            : "Preencha os dados do formulário para cadastrar um novo cliente."}
                    </DialogDescription>
                </DialogHeader>
                <ClientForm onSuccess={onClose} initialData={clientToEdit} />
            </DialogContent>
        </Dialog>
    );
}
