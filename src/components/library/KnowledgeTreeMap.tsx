"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, Sparkles, CheckCircle2, Zap } from "lucide-react";
import { MockTopic } from "@/lib/db/mock-data";
import { TopicPreStudyModal } from "@/components/study/TopicPreStudyModal";

interface KnowledgeTreeMapProps {
  topics: MockTopic[];
  materialTitle?: string;
  materialId?: string;
}

export function KnowledgeTreeMap({ topics, materialTitle, materialId }: KnowledgeTreeMapProps) {
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({
    [topics[0]?.id || ""]: true,
  });
  const [selectedTopicForModal, setSelectedTopicForModal] = useState<MockTopic | null>(null);

  const toggleTopic = (id: string) => {
    setExpandedTopics((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getImportanceLabel = (imp: string) => {
    switch (imp) {
      case "HIGH":
        return "Высокая";
      case "MEDIUM":
        return "Средняя";
      default:
        return "Базовая";
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-ios-card">
      <div className="flex items-center space-x-2 mb-3.5">
        <div className="w-7 h-7 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Структурированная карта знаний</h3>
          <p className="text-[11px] text-slate-400">Иерархия медицинских понятий из этого материала</p>
        </div>
      </div>

      <div className="space-y-2">
        {topics.map((topic) => {
          const isExpanded = !!expandedTopics[topic.id];
          return (
            <div
              key={topic.id}
              className="border border-slate-200/60 rounded-2xl overflow-hidden bg-slate-50/50"
            >
              {/* Заголовок темы */}
              <button
                onClick={() => toggleTopic(topic.id)}
                className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-100/60 transition-colors ios-press"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="text-slate-400">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-teal-700" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      {topic.name}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {topic.concepts.length} понятий • Важность: {getImportanceLabel(topic.importance)}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                    topic.examRelevance === "HIGH"
                      ? "bg-rose-50 text-rose-700 border-rose-200/60"
                      : "bg-teal-50 text-teal-700 border-teal-200/60"
                  }`}
                >
                  {topic.examRelevance === "HIGH" ? "Высокий приоритет" : "Стандартный"}
                </span>
              </button>

              {/* Вложенные понятия и факты */}
              {isExpanded && (
                <div className="px-4 pb-3 pt-1 space-y-3 border-t border-slate-200/40 bg-white">
                  {topic.concepts.map((concept) => (
                    <div
                      key={concept.id}
                      className="pl-3 border-l-2 border-teal-500/40 py-1 space-y-1.5"
                    >
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-semibold text-slate-900">
                          {concept.name}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {concept.definition}
                      </p>

                      {concept.clinicalSignificance && (
                        <p className="text-[10px] text-teal-900 bg-teal-50/60 p-2 rounded-xl border border-teal-100">
                          <strong className="text-teal-950 font-semibold">Клиническая заметка:</strong>{" "}
                          {concept.clinicalSignificance}
                        </p>
                      )}

                      {/* Проверяемые факты со страницами */}
                      {concept.facts.length > 0 && (
                        <div className="pt-1 space-y-1">
                          {concept.facts.map((f, fIdx) => (
                            <div
                              key={fIdx}
                              className="flex items-start space-x-1.5 text-[10px] text-slate-500"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                              <span>
                                {f.fact}{" "}
                                <span className="font-semibold text-slate-400">
                                  (стр. {f.sourcePage})
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Кнопки действий по теме */}
                  <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                    <button
                      onClick={() => setSelectedTopicForModal(topic)}
                      className="py-1.5 px-3 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-[11px] font-bold flex items-center space-x-1.5 ios-press"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      <span>Разжевать тему с AI</span>
                    </button>
                    <button
                      onClick={() => (window.location.href = `/quiz?topicId=${topic.id}`)}
                      className="py-1.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold flex items-center space-x-1 ios-press"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Сразу к тестам</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Модальное окно предварительного изучения темы */}
      {selectedTopicForModal && (
        <TopicPreStudyModal
          isOpen={true}
          onClose={() => setSelectedTopicForModal(null)}
          topicId={selectedTopicForModal.id}
          topicName={selectedTopicForModal.name}
          materialTitle={materialTitle || "Медицинский конспект"}
          materialId={materialId || selectedTopicForModal.materialId}
          onStartQuiz={() => {
            window.location.href = `/quiz?topicId=${selectedTopicForModal.id}`;
          }}
        />
      )}
    </div>
  );
}
