import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import AppHeader from "@/components/AppHeader";
import ChatSidebar from "@/components/ChatSidebar";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <ChatSidebar />
      <SidebarInset>
        <AppHeader />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
