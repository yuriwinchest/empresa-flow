import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { SupplierForm } from "./SupplierForm";

interface SupplierSheetProps {
    isOpen: boolean;
    onClose: () => void;
    supplierToEdit?: any;
}

export function SupplierSheet({ isOpen, onClose, supplierToEdit }: SupplierSheetProps) {
    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="sm:max-w-[540px] overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle>{supplierToEdit ? "Editar Fornecedor" : "Novo Fornecedor"}</SheetTitle>
                    <SheetDescription>
                        {supplierToEdit
                            ? "Edite os dados do fornecedor abaixo."
                            : "Preencha os dados para cadastrar um novo fornecedor."}
                    </SheetDescription>
                </SheetHeader>
                <SupplierForm onSuccess={onClose} initialData={supplierToEdit} />
            </SheetContent>
        </Sheet>
    );
}
