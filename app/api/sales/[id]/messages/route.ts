import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { senderName, senderEmail, content } = body;

  if (!senderName || !senderEmail || !content) {
    return NextResponse.json(
      { error: "Name, email, and message are required" },
      { status: 400 }
    );
  }

  const sale = await prisma.sale.findUnique({ where: { id } });
  if (!sale) {
    return NextResponse.json({ error: "Sale not found" }, { status: 404 });
  }

  const message = await prisma.message.create({
    data: {
      saleId: id,
      senderName: String(senderName).trim(),
      senderEmail: String(senderEmail).trim().toLowerCase(),
      content: String(content).trim(),
    },
  });

  return NextResponse.json(message, { status: 201 });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const messages = await prisma.message.findMany({
    where: { saleId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(messages);
}
