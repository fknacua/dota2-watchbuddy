import ChatWindow from "@/components/ChatWindow";

export default function NewChatPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-[880px] flex-col px-5 pt-6 pb-20">
      <ChatWindow chatId={null} />
    </div>
  );
}
