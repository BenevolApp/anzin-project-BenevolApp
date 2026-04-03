export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            BénévolApp
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Plateforme de bénévolat encadré
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
