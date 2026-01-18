import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { SupplierForm } from "./SupplierForm";

interface SupplierSheetProps {
    isOpen: boolean;
    onClose: () => void;
    supplierToEdit?: any;
}

export function SupplierSheet({ isOpen, onClose, supplierToEdit }: SupplierSheetProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="mb-4">
                    <DialogTitle>{supplierToEdit ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
                    <DialogDescription>
                        {supplierToEdit
                            ? "Edite os dados do fornecedor abaixo."
                            : "Preencha os dados do formulário para cadastrar um novo fornecedor."}
                    </DialogDescription>
                </DialogHeader>
                <SupplierForm onSuccess={onClose} initialData={supplierToEdit} />
            </DialogContent>
        </Dialog>
    );
}
