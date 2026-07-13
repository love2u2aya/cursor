import { NextResponse } from "next/server";
import { requireFpUser } from "@/lib/auth";
import { extractWithLlm } from "@/lib/extract/llm";
import { extractFromTranscript } from "@/lib/extract/transcript-parser";
import type { IntakeExtraction } from "@/types/intake";

function mergeLlmIntoRules(
  base: IntakeExtraction,
  llm: Partial<IntakeExtraction>,
): IntakeExtraction {
  const merged: IntakeExtraction = {
    ...base,
    method: "hybrid",
    customer: { ...base.customer, ...llm.customer },
    cashFlow: [...base.cashFlow, ...(llm.cashFlow ?? [])],
    assets: [...base.assets, ...(llm.assets ?? [])],
    liabilities: [...base.liabilities, ...(llm.liabilities ?? [])],
    insurancePolicies: [
      ...base.insurancePolicies,
      ...(llm.insurancePolicies ?? []),
    ],
    internalMemoAppend:
      llm.internalMemoAppend ?? base.internalMemoAppend,
  };

  return merged;
}

export async function POST(request: Request) {
  try {
    await requireFpUser();
    const body = (await request.json()) as { transcript?: string };

    if (!body.transcript?.trim()) {
      return NextResponse.json(
        { error: "文字起こしテキストが必要です。" },
        { status: 400 },
      );
    }

    let extraction = extractFromTranscript(body.transcript);
    const llm = await extractWithLlm(body.transcript);

    if (llm) {
      extraction = mergeLlmIntoRules(extraction, llm);
    }

    return NextResponse.json(extraction);
  } catch {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }
}
