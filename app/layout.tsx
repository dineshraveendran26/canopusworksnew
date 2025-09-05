import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "../styles/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { ClientProviders } from "@/components/client-providers"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Canopus Works",
  description: "Streamline your workflow with intelligent task management and role-based access control",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ClientProviders>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </ClientProviders>
      </body>
    </html>
  )
}
