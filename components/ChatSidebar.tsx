"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useChatHistory } from "@/lib/useChatHistory";

export default function ChatSidebar() {
  const { chats, deleteChat } = useChatHistory();
  const pathname = usePathname();
  const router = useRouter();

  const handleDelete = (chatId: string) => {
    deleteChat(chatId);
    if (pathname === `/chat/${chatId}`) {
      router.push("/chat");
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-2">
        <Button asChild variant="outline" className="w-full justify-start gap-2">
          <Link href="/chat">
            <Plus className="size-4" />
            New chat
          </Link>
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Chats</SidebarGroupLabel>
          <SidebarGroupContent>
            <ScrollArea className="h-full">
              <SidebarMenu>
                {chats.map((chat) => (
                  <SidebarMenuItem key={chat.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === `/chat/${chat.id}`}
                      className="h-auto min-h-10 items-center py-1"
                    >
                      <Link href={`/chat/${chat.id}`} title={chat.title}>
                        <span className="line-clamp-2! break-words whitespace-normal!">{chat.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <SidebarMenuAction
                          showOnHover
                          aria-label={`Delete "${chat.title}"`}
                          className="top-1/2! -translate-y-1/2"
                        >
                          <Trash2 className="size-4" />
                        </SidebarMenuAction>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete chat?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {`"${chat.title}" and its messages will be permanently deleted.`}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(chat.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </ScrollArea>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
