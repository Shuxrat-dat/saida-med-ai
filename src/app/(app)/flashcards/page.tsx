import { SafeContainer } from "@/components/layout/SafeContainer";
import { FlashcardDeck } from "@/components/flashcards/FlashcardDeck";
import { MedicalRepository } from "@/lib/db/repository";

export default async function FlashcardsPage({
  searchParams,
}: {
  searchParams: Promise<{ materialId?: string }>;
}) {
  const { materialId } = await searchParams;
  let cards = await MedicalRepository.getFlashcards();

  if (materialId) {
    cards = cards.filter((c) => c.materialId === materialId);
  }

  return (
    <SafeContainer>
      <div className="pt-2 pb-4">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Интервальные карточки
        </h2>
        <p className="text-xs text-slate-500">
          Очередь активного воспоминания по алгоритму SuperMemo SM-2 для Саиды
        </p>
      </div>

      <FlashcardDeck initialCards={cards} />
    </SafeContainer>
  );
}
