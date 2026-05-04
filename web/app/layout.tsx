import "./globals.css";
import ClientWrapper from "@/components/ClientWrapper";
import { Toaster } from "react-hot-toast";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-gray-50 dark:bg-gray-950" suppressHydrationWarning>
      <body className="antialiased font-sans min-h-screen">
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              zIndex: 99999,
            },
          }}
        />

        <ClientWrapper>
          {children}
        </ClientWrapper>

        <script src="https://cdn.jsdelivr.net/npm/eruda"></script>
        <script dangerouslySetInnerHTML={{ __html: "eruda.init();" }} />

      </body>
    </html>
  );
}