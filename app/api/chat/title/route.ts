import { NextRequest, NextResponse } from "next/server";
import { generateChatTitle } from "@/lib/generateChatTitle";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const userMessage: string = body?.userMessage ?? "";
  const assistantReply: string = body?.assistantReply ?? "";

  if (!userMessage) {
    return NextResponse.json({ error: "userMessage is required" }, { status: 400 });
  }

  try {
    const title = await generateChatTitle(userMessage, assistantReply);
    return NextResponse.json({ title });
  } catch {
    return NextResponse.json({ error: "Title generation failed" }, { status: 500 });
  }
}
