"use client";

import Link from "next/link";
import { FileText, ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { MockMaterial } from "@/lib/db/mock-data";

interface RecentMaterialsProps {
  materials: MockMaterial[];
}

export function RecentMaterials({ materials }: RecentMaterialsProps) {
  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-ios-card">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-full bg-teal-50 flex items-center justify-center text-teal-700">
            <FileText className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Недавние материалы</h3>
        </div>
        <Link
          href="/library"
          className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center space-x-0.5 ios-press"
        >
          <span>Все материалы</span>
          <ArrowRight className="w-3 h-3 ml-0.5" />
        </Link>
      </div>

      <div className="space-y-2.5">
        {materials.slice(0, 3).map((mat) => (
          <Link
            key={mat.id}
            href={`/library/${mat.id}`}
            className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/50 flex items-center justify-between transition-colors ios-press block"
          >
            <div className="min-w-0 pr-2">
              <p className="text-xs font-semibold text-slate-800 truncate">
                {mat.title}
              </p>
              <div className="flex items-center space-x-2 mt-1 text-[11px] text-slate-500">
                <span>{mat.subject}</span>
                <span>•</span>
                <span>{mat.pageCount} стр.</span>
              </div>
            </div>

            <div className="shrink-0 flex items-center space-x-1.5">
              {mat.status === "READY" ? (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Готов</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                  <Clock className="w-3 h-3 text-amber-600 animate-spin" />
                  <span>Анализ...</span>
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
