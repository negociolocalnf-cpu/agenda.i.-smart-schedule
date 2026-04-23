const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken?.startsWith("pk_test_")) return null;

  return (
    <div className="w-full border-b border-warning/40 bg-warning/15 px-4 py-2 text-center text-sm text-warning-foreground">
      Pagamentos em modo de teste. Use o cartão{" "}
      <code className="font-mono">4242 4242 4242 4242</code> para testar.{" "}
      <a
        href="https://docs.lovable.dev/features/payments#test-and-live-environments"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium underline"
      >
        Saiba mais
      </a>
    </div>
  );
}
