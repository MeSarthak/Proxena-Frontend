import { useEffect, useState } from 'react';
import { Lightbulb, ChevronDown, ChevronUp, Volume2, TrendingDown } from 'lucide-react';
import { sessionsApi } from '../lib/api';
import type { WordRecommendation } from '../types';
import { useSpeechDemo } from '../hooks/useSpeechDemo';
import { scoreColor, formatPercent } from '../lib/utils';

// ─── Pronunciation tip knowledge base ────────────────────────────────────────
// Covers the most commonly mispronounced words in English by non-native speakers.
// Falls back to a generic tip if the word isn't in the map.

const TIPS: Record<string, { tip: string; phonetic: string; similar: string[] }> = {
  // Th sounds
  the:    { tip: 'Put your tongue lightly between your teeth and blow air — not "da" or "ze".', phonetic: '/ðə/', similar: ['this', 'that', 'them', 'they'] },
  this:   { tip: 'Start with the voiced "th" — tongue between teeth — then a short "i" sound.', phonetic: '/ðɪs/', similar: ['these', 'those', 'them'] },
  that:   { tip: 'Voiced "th" at the start. The vowel is a short "a" like in "cat".', phonetic: '/ðæt/', similar: ['than', 'then', 'them'] },
  there:  { tip: 'Voiced "th" + "air" sound. Often confused with "their" — same pronunciation.', phonetic: '/ðɛr/', similar: ['their', "they're", 'here'] },
  think:  { tip: 'Unvoiced "th" — tongue between teeth, no voice. Ends with a "k" not "g".', phonetic: '/θɪŋk/', similar: ['thing', 'thick', 'thank'] },
  thought: { tip: 'Unvoiced "th" + long "aw" sound (like "caught"). The "ght" is completely silent.', phonetic: '/θɔːt/', similar: ['though', 'through', 'threw'] },
  through: { tip: 'Unvoiced "th" + long "oo" sound. The "-rough" is NOT said like "rough" — it rhymes with "true".', phonetic: '/θruː/', similar: ['threw', 'thorough', 'thought'] },
  // W/V confusion
  world:  { tip: 'Starts with "w" (round lips) — not "v". The "or" sounds like in "word".', phonetic: '/wɜːrld/', similar: ['word', 'work', 'worth'] },
  very:   { tip: 'Starts with "v" — top teeth lightly touch bottom lip. Not "w" or "b".', phonetic: '/ˈvɛri/', similar: ['vary', 'every', 'berry'] },
  voice:  { tip: '"V" at the start — top teeth on lower lip. Vowel is a diphthong: "oy".', phonetic: '/vɔɪs/', similar: ['choice', 'noise', 'boys'] },
  // Commonly mispronounced multisyllable words
  comfortable: { tip: 'Three syllables: COMF-ter-ble. The "or" is often swallowed — don\'t say "com-FOR-ta-ble".', phonetic: '/ˈkʌmftərbəl/', similar: ['comfortable', 'comfortably'] },
  vegetable: { tip: 'Three syllables: VEJ-tuh-bul. The second "e" is nearly silent.', phonetic: '/ˈvɛdʒtəbəl/', similar: ['vegetarian', 'veg'] },
  temperature: { tip: 'Four syllables: TEM-pra-chur. The "era" is often compressed.', phonetic: '/ˈtɛmprətʃər/', similar: ['temporal', 'temperate'] },
  especially: { tip: 'Four syllables: es-PESH-uh-lee. Don\'t say "ex-pesh-ully".', phonetic: '/ɪˈspɛʃəli/', similar: ['specially', 'special'] },
  probably:  { tip: 'Three syllables: PROB-uh-blee. Often reduced to "prob-lee" in casual speech.', phonetic: '/ˈprɒbəbli/', similar: ['possibly', 'probably'] },
  february:  { tip: 'Four syllables: FEB-roo-air-ee. The first "r" is often dropped — try to keep it.', phonetic: '/ˈfɛbruɛri/', similar: ['January', 'library'] },
  library:   { tip: 'Three syllables: LY-brer-ee. Don\'t drop the first "r": not "lie-berry".', phonetic: '/ˈlaɪbrəri/', similar: ['February', 'literacy'] },
  // Silent letters
  knife:    { tip: 'The "k" is completely silent. Say "nyfe" — rhymes with "wife".', phonetic: '/naɪf/', similar: ['know', 'knock', 'knee'] },
  knight:   { tip: 'The "kn" + "gh" are both silent. Rhymes with "night" and "bite".', phonetic: '/naɪt/', similar: ['night', 'might', 'right'] },
  psychology: { tip: 'The "p" is silent. Say "sy-KOL-oh-jee".', phonetic: '/saɪˈkɒlədʒi/', similar: ['psyche', 'pneumonia'] },
  // -ed endings
  walked:   { tip: 'The "-ed" sounds like a "t" here: "walkt". Only say "-id" after t/d sounds.', phonetic: '/wɔːkt/', similar: ['talked', 'cooked', 'looked'] },
  wanted:   { tip: 'After a "t" or "d", say the full "-id": "WONT-id". Two syllables.', phonetic: '/ˈwɒntɪd/', similar: ['needed', 'started', 'ended'] },
  // Vowel length
  live:     { tip: 'As a verb: short "i" — rhymes with "give". As an adjective: long "i" — rhymes with "drive".', phonetic: '/lɪv/ or /laɪv/', similar: ['give', 'live', 'drive'] },
  read:     { tip: 'Present tense: long "ee" — rhymes with "seed". Past tense: short "e" — rhymes with "red".', phonetic: '/riːd/ or /rɛd/', similar: ['lead', 'feed', 'said'] },
  // Stress patterns
  present:  { tip: 'Noun/adjective: PRE-sent (stress on first). Verb: pre-SENT (stress on second).', phonetic: '/ˈprɛzənt/ or /prɪˈzɛnt/', similar: ['permit', 'record', 'object'] },
  record:   { tip: 'Noun: RE-cord (stress on first). Verb: re-CORD (stress on second).', phonetic: '/ˈrɛkərd/ or /rɪˈkɔːrd/', similar: ['present', 'permit', 'object'] },
  // Common errors by accent group
  ask:      { tip: 'In standard American English: "æsk" — short "a" like "cat". In British RP: "ɑːsk" — longer "ah".', phonetic: '/æsk/ or /ɑːsk/', similar: ['task', 'mask', 'flask'] },
  can:      { tip: 'When stressed: "kæn" (rhymes with "pan"). When unstressed in a sentence: "kən" (schwa).', phonetic: '/kæn/ or /kən/', similar: ['man', 'ban', 'plan'] },
  water:    { tip: 'American: "WAW-ter" with a flapped "t". British: "WAW-tuh" with no final "r".', phonetic: '/ˈwɔːtər/', similar: ['daughter', 'quarter', 'later'] },
};

function getTip(word: string): { tip: string; phonetic: string; similar: string[] } {
  const lower = word.toLowerCase().replace(/[^a-z]/g, '');
  return TIPS[lower] ?? {
    tip: `Focus on each syllable separately, then blend them. Slow down and exaggerate the sounds until they feel natural, then gradually increase your speed.`,
    phonetic: '',
    similar: [],
  };
}

function buildRecommendations(wordResults: { word: string; accuracy: number | null; errorType: string | null }[]): WordRecommendation[] {
  // Aggregate across all results
  const map: Record<string, { totalAcc: number; count: number }> = {};
  for (const wr of wordResults) {
    if (wr.errorType === 'None' || !wr.errorType) continue;
    const key = wr.word.toLowerCase().replace(/[^a-z]/g, '');
    if (!key) continue;
    if (!map[key]) map[key] = { totalAcc: 0, count: 0 };
    map[key].totalAcc += wr.accuracy ?? 0;
    map[key].count++;
  }

  return Object.entries(map)
    .map(([word, { totalAcc, count }]) => {
      const avgAccuracy = totalAcc / count;
      const { tip, phonetic, similar } = getTip(word);
      return {
        word,
        avgAccuracy,
        occurrences: count,
        tip,
        phonetic,
        similarWords: similar,
      };
    })
    .sort((a, b) => a.avgAccuracy - b.avgAccuracy) // worst first
    .slice(0, 8); // top 8 problem words
}

interface WordRecommendationsProps {
  targetAccent?: string;
}

export function WordRecommendations({ targetAccent = 'en-US' }: WordRecommendationsProps) {
  const [recs, setRecs] = useState<WordRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { speak, stop, speaking } = useSpeechDemo();
  const [playingWord, setPlayingWord] = useState<string | null>(null);

  useEffect(() => {
    // Fetch up to 10 recent sessions and aggregate word errors
    sessionsApi.history(1, 10)
      .then(async (hist) => {
        const allWords: { word: string; accuracy: number | null; errorType: string | null }[] = [];
        // Fetch full session details in parallel
        const details = await Promise.allSettled(
          hist.sessions.map((s) => sessionsApi.get(s.publicId))
        );
        for (const d of details) {
          if (d.status === 'fulfilled') {
            allWords.push(...d.value.words);
          }
        }
        setRecs(buildRecommendations(allWords));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSpeak = (word: string) => {
    if (playingWord === word) {
      stop();
      setPlayingWord(null);
      return;
    }
    stop();
    setPlayingWord(word);
    speak(word, targetAccent);
  };

  // Clear playing indicator when speech ends
  useEffect(() => {
    if (!speaking) setPlayingWord(null);
  }, [speaking]);

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
            <Lightbulb className="w-4 h-4 text-amber-500" />
          </div>
          <div className="skeleton h-4 w-40" />
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-10 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (recs.length === 0) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
            <Lightbulb className="w-4 h-4 text-amber-500" />
          </div>
          <h2 className="font-semibold text-gray-900">AI Word Coach</h2>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Complete a few sessions and your personalised pronunciation tips will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
          <Lightbulb className="w-4 h-4 text-amber-500" />
        </div>
        <h2 className="font-semibold text-gray-900">AI Word Coach</h2>
      </div>
      <p className="text-xs text-gray-500 mb-4 ml-10">
        Personalised tips based on your last 10 sessions
      </p>

      <div className="flex flex-col gap-2">
        {recs.map((rec) => {
          const isOpen = expanded === rec.word;
          return (
            <div
              key={rec.word}
              className="border border-gray-100 rounded-xl overflow-hidden"
            >
              {/* Row */}
              <button
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                onClick={() => setExpanded(isOpen ? null : rec.word)}
              >
                {/* Word + accuracy */}
                <div className="flex-1 flex items-center gap-3 min-w-0">
                  <TrendingDown className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <span className="font-semibold text-gray-900 text-sm capitalize">{rec.word}</span>
                  {rec.phonetic && (
                    <span className="text-xs text-gray-400 font-mono hidden sm:inline">{rec.phonetic}</span>
                  )}
                </div>
                {/* Stats */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-sm font-bold tabular-nums ${scoreColor(rec.avgAccuracy)}`}>
                    {formatPercent(rec.avgAccuracy, 0)}
                  </span>
                  <span className="text-xs text-gray-400 hidden sm:inline">
                    {rec.occurrences}× flagged
                  </span>
                  {/* Listen button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSpeak(rec.word); }}
                    className={`p-1.5 rounded-lg transition-colors ${
                      playingWord === rec.word
                        ? 'bg-blue-100 text-blue-600'
                        : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                    }`}
                    title={`Hear "${rec.word}" in ${targetAccent} accent`}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                  {isOpen
                    ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                    : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  }
                </div>
              </button>

              {/* Expanded tip */}
              {isOpen && (
                <div className="px-4 pb-4 bg-amber-50 border-t border-amber-100">
                  <p className="text-sm text-amber-900 mt-3 leading-relaxed">
                    <span className="font-semibold">Tip: </span>{rec.tip}
                  </p>
                  {rec.similarWords.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-amber-700 font-medium mb-1.5">Practise with similar words:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {rec.similarWords.map((sw) => (
                          <button
                            key={sw}
                            onClick={() => handleSpeak(sw)}
                            className="px-2.5 py-1 bg-white border border-amber-200 text-amber-800 text-xs rounded-lg font-medium hover:bg-amber-100 transition-colors"
                          >
                            {sw}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
