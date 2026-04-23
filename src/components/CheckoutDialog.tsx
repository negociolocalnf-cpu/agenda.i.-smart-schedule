import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { useAuth } from "@/hooks/useAuth";

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  priceId: string | null;
  planName?: string;
}

export function CheckoutDialog({
  open,
  onOpenChange,
  priceId,
  planName,
}: CheckoutDialogProps) {
  const { user } = useAuth();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>
            {planName ? `Assinar ${planName}` : "Finalizar assinatura"}
          </DialogTitle>
        </DialogHeader>
        <div className="p-6">
          {priceId && user && (
            <StripeEmbeddedCheckout
              priceId={priceId}
              returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
