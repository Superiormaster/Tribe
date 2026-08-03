import "./globals.css";
import ClientWrapper from "@/components/ClientWrapper";
import { Toaster } from "react-hot-toast";
import InstallButton from "@/components/InstallButton";

export const metadata = {
  title: "Tribe",
  description:
    "Find your tribe, join communities, chat, watch reels and make new friends.",
  applicationName: "Tribe",
  manifest: "/manifest.json",
  themeColor: "#4f46e5",

  alternates: {
    canonical: "https://tribe-app.app",
  },

  openGraph: {
    title: "Tribe",
    description:
      "Find your tribe, join communities, chat, watch reels and make new friends.",
    url: "https://tribe-app.app",
    siteName: "Tribe",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "https://tribe-app.app/advert_PWAFacebook.png",
        width: 1200,
        height: 1200,
        alt: "Tribe - Find Your Tribe",
        type: "image/png",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Tribe",
    description:
      "Find your tribe, join communities, chat, watch reels and make new friends.",
    images: [
      {
        url: "https://tribe-app.app/advert_PWAFacebook.png",
        width: 1200,
        height: 1200,
        alt: "Tribe - Find Your Tribe",
        type: "image/png",
      },
    ],
  },
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