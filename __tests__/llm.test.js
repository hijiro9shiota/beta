import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateQuiz, simulateFlashcards } from '../server/lib/llm.js';

test('quiz generation returns desired structure', () => {
  const quiz = simulateQuiz('session-1', 'La physique étudie la matière et l\'énergie. Les équations de Maxwell décrivent l\'électromagnétisme.', 3);
  assert.equal(quiz.items.length, 3);
  quiz.items.forEach((item) => {
    assert.equal(item.choices.length, 4);
    assert.ok(item.answerIndex >= 0 && item.answerIndex < 4);
  });
});

test('flashcards generation produces at least twenty cards', () => {
  const cards = simulateFlashcards('session-2', 'Analyse réelle et complexité des suites numériques.');
  assert.ok(cards.length >= 20);
});
