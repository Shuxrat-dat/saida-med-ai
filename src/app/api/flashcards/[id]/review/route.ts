import { NextRequest, NextResponse } from "next/server";
import { MedicalRepository } from "@/lib/db/repository";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { rating } = body; // AGAIN | HARD | GOOD | EASY

    if (!["AGAIN", "HARD", "GOOD", "EASY"].includes(rating)) {
      return NextResponse.json({ error: "Некорректная оценка карточки" }, { status: 400 });
    }

    const updated = await MedicalRepository.updateFlashcard(id, rating);
    if (!updated) {
      return NextResponse.json({ error: "Карточка не найдена" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      flashcard: updated,
    });
  } catch (error: any) {
    console.error("Flashcard review error:", error);
    return NextResponse.json(
      { error: error?.message || "Не удалось обновить карточку" },
      { status: 500 }
    );
  }
}
