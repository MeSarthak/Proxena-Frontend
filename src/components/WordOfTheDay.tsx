/**
 * WordOfTheDay — shows one focus word on the Dashboard.
 * Priority: worst word from session history (via WordRecommendations logic).
 * Fallback: curated list rotated by day-of-year.
 */

import { useEffect, useState } from 'react';
import { BookOpen, Volume2 } from 'lucide-react';
import { sessionsApi } from '../lib/api';
import { useSpeechDemo } from '../hooks/useSpeechDemo';

interface WordEntry {
  word: string;
  phonetic: string;
  tip: string;
  partOfSpeech: string;
  example: string;
}

const CURATED: WordEntry[] = [
  { word: 'Pronunciation', phonetic: '/prəˌnʌn.siˈeɪ.ʃən/', partOfSpeech: 'noun',      tip: 'Stress the 4th syllable: pro-NUN-ci-A-tion. Don\'t say "pro-NOUN-ciation".',          example: 'Clear pronunciation helps listeners understand you.' },
  { word: 'Comfortable',   phonetic: '/ˈkʌmf.tər.bəl/',     partOfSpeech: 'adjective', tip: 'Three syllables: COMF-ter-ble. The middle syllable is often swallowed.',              example: 'Make yourself comfortable before you begin speaking.' },
  { word: 'February',      phonetic: '/ˈfɛb.ru.ɛr.i/',       partOfSpeech: 'noun',      tip: 'Four syllables. Don\'t drop the first "r" — it\'s not "Feb-yoo-air-ee".',            example: 'February is the shortest month of the year.' },
  { word: 'Particularly',  phonetic: '/pərˈtɪk.jʊ.lər.li/',  partOfSpeech: 'adverb',   tip: 'Five syllables: par-TIC-you-lar-ly. Slow down on this one.',                         example: 'I am particularly proud of your progress.' },
  { word: 'Rhythm',        phonetic: '/ˈrɪð.əm/',             partOfSpeech: 'noun',      tip: 'Two syllables: RITH-um. No vowel between "rh" — the "y" acts as a vowel here.',     example: 'Good speakers have a natural rhythm in their speech.' },
  { word: 'Sixth',         phonetic: '/sɪksθ/',               partOfSpeech: 'adjective', tip: 'Ends with the "ksth" cluster — say it slowly: "siks-th". A classic tongue challenge.', example: 'She finished in sixth place in the competition.' },
  { word: 'Thoroughly',    phonetic: '/ˈθɜː.rə.li/',          partOfSpeech: 'adverb',   tip: 'Three syllables: THUR-uh-lee. The "gh" is silent. Starts with the voiced "th".',    example: 'Practise thoroughly to build lasting muscle memory.' },
  { word: 'Equivalent',    phonetic: '/ɪˈkwɪv.ə.lənt/',      partOfSpeech: 'adjective', tip: 'Four syllables: e-QUIV-uh-lent. Stress is on the second syllable.',                  example: 'One hour of focused practice is equivalent to three casual ones.' },
  { word: 'Hierarchy',     phonetic: '/ˈhaɪ.ər.ɑːr.ki/',     partOfSpeech: 'noun',      tip: 'Four syllables: HI-uh-rar-kee. Don\'t compress it to three.',                        example: 'The hierarchy of needs places language near the top.' },
  { word: 'Necessarily',   phonetic: '/ˌnɛs.əˈsɛr.ɪ.li/',    partOfSpeech: 'adverb',   tip: 'Five syllables: nes-uh-SER-uh-lee. Stress is on the third syllable.',                example: 'More practice doesn\'t necessarily mean faster progress.' },
  { word: 'Vocabulary',    phonetic: '/vəˈkæb.jʊ.lər.i/',    partOfSpeech: 'noun',      tip: 'Five syllables: vo-CAB-yuh-lair-ee. Stress on the second.',                          example: 'Building vocabulary is key to fluent conversation.' },
  { word: 'Entrepreneur',  phonetic: '/ˌɒn.trə.prəˈnɜːr/',   partOfSpeech: 'noun',      tip: 'Four syllables: on-truh-pruh-NUR. The final syllable is stressed. French origin.', example: 'Every entrepreneur started by learning to communicate clearly.' },
  { word: 'Chaos',         phonetic: '/ˈkeɪ.ɒs/',             partOfSpeech: 'noun',      tip: '"Ch" sounds like "k" here — not "ch" as in "church". KAY-os.',                      example: 'Mispronunciation can cause chaos in a conversation.' },
  { word: 'Subtle',        phonetic: '/ˈsʌt.əl/',             partOfSpeech: 'adjective', tip: 'The "b" is completely silent. Say "SUT-ul", not "sub-tle".',                         example: 'The difference is subtle but it matters to native speakers.' },
  { word: 'Worcestershire', phonetic: '/ˈwʊs.tər.ʃɪr/',      partOfSpeech: 'noun',      tip: 'Only three syllables: WOOS-ter-sher. Most of the spelling is silent!',               example: 'Worcestershire sauce is a famously tricky word to pronounce.' },
];

function getDayEntry(): WordEntry {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000,
  );
  return CURATED[dayOfYear % CURATED.length];
}

interface WordOfTheDayProps {
  targetAccent?: string;
}

export function WordOfTheDay({ targetAccent = 'en-US' }: WordOfTheDayProps) {
  const [entry, setEntry] = useState<WordEntry>(getDayEntry);
  const { speak, stop, speaking } = useSpeechDemo();
  const [fromHistory, setFromHistory] = useState(false);

  // Try to get worst word from session history
  useEffect(() => {
    sessionsApi.history(1, 5)
      .then(async (hist) => {
        if (hist.sessions.length === 0) return;
        const details = await Promise.allSettled(
          hist.sessions.slice(0, 3).map((s) => sessionsApi.get(s.publicId))
        );
        const map: Record<string, { totalAcc: number; count: number }> = {};
        for (const d of details) {
          if (d.status !== 'fulfilled') continue;
          for (const wr of d.value.words) {
            if (!wr.errorType || wr.errorType === 'None') continue;
            const key = wr.word.toLowerCase().replace(/[^a-z]/g, '');
            if (!key || key.length < 3) continue;
            if (!map[key]) map[key] = { totalAcc: 0, count: 0 };
            map[key].totalAcc += wr.accuracy ?? 0;
            map[key].count++;
          }
        }
        const entries = Object.entries(map)
          .map(([w, { totalAcc, count }]) => ({ word: w, avg: totalAcc / count }))
          .sort((a, b) => a.avg - b.avg);
        if (entries.length === 0) return;

        // Find curated entry for worst word, or build a minimal one
        const worst = entries[0].word;
        const curated = CURATED.find((c) => c.word.toLowerCase() === worst);
        if (curated) {
          setEntry(curated);
          setFromHistory(true);
        } else {
          // Minimal fallback entry for non-curated words
          setEntry({
            word: worst,
            phonetic: '',
            partOfSpeech: '',
            tip: 'Focus on each syllable separately, then blend them. Slow down and exaggerate the sounds until they feel natural.',
            example: `You had difficulty with "${worst}" recently — practise it today.`,
          });
          setFromHistory(true);
        }
      })
      .catch(() => { /* keep curated */ });
  }, []);

  const handleSpeak = () => {
    if (speaking) { stop(); return; }
    speak(entry.word, targetAccent);
  };

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
          <BookOpen className="w-4 h-4 text-indigo-500" />
        </div>
        <h2 className="font-semibold text-gray-900">Word of the Day</h2>
        {fromHistory && (
          <span className="ml-auto text-xs text-indigo-500 font-medium bg-indigo-50 px-2 py-0.5 rounded-full">
            From your sessions
          </span>
        )}
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-2xl font-bold text-gray-900 capitalize">{entry.word}</p>
          <div className="flex items-center gap-2 mt-1">
            {entry.phonetic && (
              <span className="text-sm text-gray-400 font-mono">{entry.phonetic}</span>
            )}
            {entry.partOfSpeech && (
              <span className="text-xs text-gray-400 italic">{entry.partOfSpeech}</span>
            )}
          </div>
        </div>
        <button
          onClick={handleSpeak}
          className={`p-2.5 rounded-xl transition-colors shrink-0 ${
            speaking
              ? 'bg-indigo-100 text-indigo-600'
              : 'bg-gray-100 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600'
          }`}
          title="Listen to pronunciation"
        >
          <Volume2 className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
        <p className="text-xs font-semibold text-amber-700 mb-1">Pronunciation tip</p>
        <p className="text-sm text-amber-900 leading-relaxed">{entry.tip}</p>
      </div>

      {entry.example && (
        <p className="mt-3 text-xs text-gray-500 italic leading-relaxed">"{entry.example}"</p>
      )}
    </div>
  );
}
