import "./globals.css";
import ClientWrapper from "@/components/ClientWrapper";
import { Toaster } from "react-hot-toast";
import InstallButton from "@/components/InstallButton";

export const metadata = {
  title: "Tribe",
  description: "Tribe Social Network",
  manifest: "/manifest.json",
  themeColor: "#4f46e5",
  applicationName: "Tribe",
};
export const viewport = {
  themeColor: "#4f46e5",
};

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
  
        <InstallButton />

        <script src="https://cdn.jsdelivr.net/npm/eruda"></script>
        <script dangerouslySetInnerHTML={{ __html: "eruda.init();" }} />

      </body>
    </html>
  );
}