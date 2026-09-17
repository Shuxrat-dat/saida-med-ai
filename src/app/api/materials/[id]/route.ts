import { NextRequest, NextResponse } from "next/server";
import { MedicalRepository } from "@/lib/db/repository";

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

    return NextResponse.json({
      success: true,
      material,
    });
  } catch (error: any) {
    console.error(`[API Error] GET /api/materials/[id] failed:`, error);
    return NextResponse.json(
      { error: error?.message || "Не удалось загрузить материал", code: error?.code },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const updated = await MedicalRepository.updateMaterial(id, body);

    return NextResponse.json({
      success: true,
      material: updated,
    });
  } catch (error: any) {
    console.error(`[API Error] PATCH /api/materials/[id] failed:`, error);
    return NextResponse.json(
      { error: error?.message || "Не удалось обновить материал", code: error?.code },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const material = await MedicalRepository.getMaterialById(id);

    if (material?.fileKey) {
      try {
        const { getStorageService } = await import("@/lib/storage");
        const storage = getStorageService();
        await storage.deleteFile(material.fileKey);
      } catch (storageErr) {
        console.warn(`[Storage Warning] Failed to delete file for material ${id}:`, storageErr);
      }
    }

    await MedicalRepository.deleteMaterial(id);

    return NextResponse.json({
      success: true,
      message: "Материал успешно удалён из базы данных",
    });
  } catch (error: any) {
    console.error(`[API Error] DELETE /api/materials/[id] failed:`, error);
    return NextResponse.json(
      { error: error?.message || "Не удалось удалить материал", code: error?.code },
      { status: 500 }
    );
  }
}
