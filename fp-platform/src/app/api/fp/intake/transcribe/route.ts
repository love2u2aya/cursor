import { NextResponse } from "next/server";
import { requireFpUser } from "@/lib/auth";
import { transcribeAudio } from "@/lib/extract/llm";

export async function POST(request: Request) {
  try {
    await requireFpUser();
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof Blob)) {
      return NextResponse.json(
        { error: "音声または動画ファイルが必要です。" },
        { status: 400 },
      );
    }

    const filename =
      file instanceof File
        ? file.name
        : `recording.${(file as Blob).type.split("/")[1] ?? "webm"}`;

    const transcript = await transcribeAudio(file, filename);

    if (!transcript) {
      const hasKey = Boolean(process.env.OPENAI_API_KEY);
      return NextResponse.json(
        {
          error: hasKey
            ? "文字起こしに失敗しました。ファイル形式を確認してください。"
            : "ファイルの文字起こしには OPENAI_API_KEY の設定が必要です。録音・テキスト入力をご利用ください。",
          requiresApiKey: !hasKey,
        },
        { status: hasKey ? 422 : 501 },
      );
    }

    return NextResponse.json({ transcript });
  } catch {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }
}
