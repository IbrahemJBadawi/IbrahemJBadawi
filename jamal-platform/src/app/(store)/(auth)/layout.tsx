export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="container-page flex justify-center py-12 md:py-20"><div className="w-full max-w-md">{children}</div></div>;
}
