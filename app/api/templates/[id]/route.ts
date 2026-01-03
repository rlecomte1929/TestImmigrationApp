import { NextRequest, NextResponse } from "next/server";
import { getTemplatePlan } from "@/lib/templates";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const plan = getTemplatePlan(params.id);
  if (!plan) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json({ plan });
}
