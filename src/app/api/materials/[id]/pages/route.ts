import { NextRequest, NextResponse } from "next/server";
import { MedicalRepository } from "@/lib/db/repository";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const material = await MedicalRepository.getMaterialById(id);

    if (!material) {
      return NextResponse.json({ error: "Материал не найден" }, { status: 404 });
    }

    // Try fetching from Prisma pages if available
    let pages = material.pages || [];
    try {
      const dbPages = await prisma.materialPage.findMany({
        where: { materialId: id },
        orderBy: { pageNumber: "asc" },
      });

      if (dbPages && dbPages.length > 0) {
        pages = dbPages.map((p) => ({
          pageNumber: p.pageNumber,
          text: p.extractedText,
          imageUrl: p.imageUrl || undefined,
          qualityScore: p.ocrQuality || 1.0,
        }));
      }
    } catch {}

    return NextResponse.json({
      success: true,
      materialId: id,
      title: material.title,
      pages,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Не удалось загрузить страницы материала" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { pages } = body;

    if (!Array.isArray(pages)) {
      return NextResponse.json(
        { error: "Неверный формат данных страниц" },
        { status: 400 }
      );
    }

    const updated = await MedicalRepository.updateMaterialPages(id, pages);
    if (!updated) {
      return NextResponse.json({ error: "Материал не найден" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      material: updated,
      message: "Текст страниц успешно сохранён и переиндексирован",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Не удалось обновить текст страниц" },
      { status: 500 }
    );
  }
}
