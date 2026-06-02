import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YMALPP ERP",
  description: "ERP multiempresa para licitaciones, contratos, proyectos, RH, inventario y finanzas."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
