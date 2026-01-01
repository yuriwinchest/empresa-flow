import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { ProductForm } from "./ProductForm";
import { Product } from "@/types/product";

interface ProductSheetProps {
    isOpen: boolean;
    onClose: () => void;
    product?: Product | null;
}

export function ProductSheet({ isOpen, onClose, product }: ProductSheetProps) {
    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="sm:max-w-[540px] overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{product ? "Editar Produto" : "Novo Produto"}</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                    <ProductForm
                        product={product || undefined}
                        onSuccess={onClose}
                        onCancel={onClose}
                    />
                </div>
            </SheetContent>
        </Sheet>
    );
}
