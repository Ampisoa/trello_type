import { Card } from '../types';

/**
 * Generates the next sequential, collision-free reference for a new card/model.
 * Default format: REF-YYYY-XXX (e.g. REF-2026-004)
 */
export function generateNextReference(
  existingCards: Card[] = [],
  year: number = new Date().getFullYear()
): string {
  const currentYear = year || 2026;
  const prefix = `REF-${currentYear}-`;

  // Find all existing numbers with the current year prefix
  let maxNumber = 0;
  const takenReferences = new Set<string>();

  existingCards.forEach((card) => {
    if (!card.reference) return;
    const ref = card.reference.trim();
    takenReferences.add(ref.toLowerCase());

    // Check matches for REF-YYYY-XXX or REF-XXX
    const yearMatch = ref.match(new RegExp(`^REF-${currentYear}-(\\d+)$`, 'i'));
    if (yearMatch && yearMatch[1]) {
      const num = parseInt(yearMatch[1], 10);
      if (!isNaN(num) && num > maxNumber) {
        maxNumber = num;
      }
    } else {
      const genericMatch = ref.match(/^REF-(\d+)$/i);
      if (genericMatch && genericMatch[1]) {
        const num = parseInt(genericMatch[1], 10);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    }
  });

  // Calculate next available number
  let nextNum = maxNumber + 1;
  let candidate = `${prefix}${String(nextNum).padStart(3, '0')}`;

  // Ensure absolute uniqueness in case of gaps or manual entries
  while (takenReferences.has(candidate.toLowerCase())) {
    nextNum += 1;
    candidate = `${prefix}${String(nextNum).padStart(3, '0')}`;
  }

  return candidate;
}
