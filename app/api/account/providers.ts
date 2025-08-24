import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ providers: [] });
  }
  const accounts = await prisma.account.findMany({ where: { userId: session.user.id } });
  const providers = accounts.map((a: any) => a.provider);
  return NextResponse.json({ providers });
} 