import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { CategoryForm } from "./CategoryForm";

interface CategorySheetProps {
    isOpen: boolean;
    onClose: () => void;
    dataToEdit?: any;
}

export function CategorySheet({ isOpen, onClose, dataToEdit }: CategorySheetProps) {
    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="sm:max-w-[600px]">
                <SheetHeader className="mb-6">
                    <SheetTitle>{dataToEdit ? "Editar Categoria" : "Nova Categoria"}</SheetTitle>
                    <SheetDescription>
                        {dataToEdit
                            ? "Edite os dados da categoria abaixo."
                            : "Crie uma nova categoria para organizar suas finanças."}
                    </SheetDescription>
                </SheetHeader>
                <CategoryForm onSuccess={onClose} initialData={dataToEdit} />
            </SheetContent>
        </Sheet>
    );
}
