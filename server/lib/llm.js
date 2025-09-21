import { nanoid } from './nanoid.js';

function splitIntoBlocks(text, minutes = 3) {
  const words = text.split(/\s+/);
  const blockSize = Math.max(80, Math.round((minutes * 150)));
  const blocks = [];
  for (let i = 0; i < words.length; i += blockSize) {
    blocks.push(words.slice(i, i + blockSize).join(' '));
  }
  return blocks;
}

export function simulateSummary(sessionId, text, level = 'global') {
  const blocks = splitIntoBlocks(text);
  const blockSummaries = blocks.map((block, index) => `### Bloc ${index + 1}\n${summarizeParagraph(block)}`);
  const combined = blockSummaries.join('\n\n');
  const meta = {
    id: nanoid(),
    sessionId,
    level,
    contentMD: level === 'global' ? summarizeParagraph(combined) : combined,
    tokensIn: text.split(/\s+/).length,
    tokensOut: combined.split(/\s+/).length,
    model: 'local-sim',
    createdAt: new Date().toISOString()
  };
  return meta;
}

function summarizeParagraph(paragraph) {
  const sentences = paragraph.split(/(?<=[.!?])\s+/).filter(Boolean);
  const pick = sentences.slice(0, 3).map((s) => s.trim()).join(' ');
  return `• ${pick}`;
}

export function simulateQuiz(sessionId, text, n = 5) {
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.length > 20);
  const items = [];
  for (let i = 0; i < n; i += 1) {
    const base = sentences[i % sentences.length] || 'Ce cours insiste sur la rigueur méthodologique.';
    const keyword = selectKeyword(base);
    const distractors = generateDistractors(keyword);
    const choices = shuffle([keyword, ...distractors]).slice(0, 4);
    const answerIndex = choices.indexOf(keyword);
    items.push({
      question: `Que signifie: ${keyword}?`,
      choices,
      answerIndex,
      explanation: `Le terme "${keyword}" est présenté dans le cours comme un élément clé.`
    });
  }
  return {
    id: nanoid(),
    sessionId,
    title: 'Quiz de révision',
    items,
    createdAt: new Date().toISOString()
  };
}

function selectKeyword(sentence) {
  const tokens = sentence.split(/[^A-Za-zÀ-ÖØ-öø-ÿ]+/).filter((w) => w.length > 4);
  return (tokens[0] || 'concept').toLowerCase();
}

function generateDistractors(keyword) {
  const pool = ['analyse', 'synthèse', 'preuve', 'expérience', 'hypothèse', 'loi'];
  return pool.filter((item) => item !== keyword).slice(0, 3);
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function simulateCloze(sessionId, text) {
  const keywords = Array.from(new Set(text.split(/\s+/).filter((w) => w.length > 6))).slice(0, 15);
  let masked = text;
  keywords.forEach((word) => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    masked = masked.replace(new RegExp(escaped, 'gi'), `{{${word}}}`);
  });
  return {
    id: nanoid(),
    sessionId,
    contentMD: masked,
    createdAt: new Date().toISOString()
  };
}

export function simulateFlashcards(sessionId, text) {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const cards = [];
  for (let i = 0; i < Math.max(20, sentences.length); i += 1) {
    const sentence = sentences[i % sentences.length];
    const keyword = selectKeyword(sentence);
    cards.push({
      id: nanoid(),
      sessionId,
      frontMD: `**Définir**: ${keyword}`,
      backMD: sentence,
      tag: 'concept',
      leitner: {
        box: 1,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      createdAt: new Date().toISOString()
    });
  }
  return cards;
}

export function buildProviderHook() {
  return {
    async summarize(sessionId, text, level) {
      return simulateSummary(sessionId, text, level);
    },
    async quiz(sessionId, text, n) {
      return simulateQuiz(sessionId, text, n);
    },
    async cloze(sessionId, text) {
      return simulateCloze(sessionId, text);
    },
    async flashcards(sessionId, text) {
      return simulateFlashcards(sessionId, text);
    }
  };
}
