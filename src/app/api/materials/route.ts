import { NextRequest, NextResponse } from "next/server";
import { MedicalRepository } from "@/lib/db/repository";

export async function GET() {
  try {
    const materials = await MedicalRepository.getMaterials();
    return NextResponse.json({
      success: true,
      materials,
    });
  } catch (error: any) {
    console.error("[API Error] GET /api/materials failed:", error);
    return NextResponse.json(
      { error: error?.message || "Не удалось загрузить список материалов", code: error?.code },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const material = await MedicalRepository.createMaterial(body);
    return NextResponse.json({
      success: true,
      material,
    });
  } catch (error: any) {
    console.error("[API Error] POST /api/materials failed:", error);
    return NextResponse.json(
      { error: error?.message || "Не удалось создать материал", code: error?.code },
      { status: 500 }
    );
  }
}
