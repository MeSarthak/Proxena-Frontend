import { useEffect, useState } from 'react';
import { Ear, ChevronDown, ChevronUp, Volume2 } from 'lucide-react';
import { sessionsApi } from '../lib/api';
import { useSpeechDemo } from '../hooks/useSpeechDemo';
import { scoreColor, formatPercent } from '../lib/utils';

// ─── Phoneme pattern clusters ─────────────────────────────────────────────────
// Maps commonly confused sound patterns to their phoneme group.
// We match mispronounced words against these patterns (no LLM needed).

interface PhonemeCluster {
  id: string;
  label: string;
  description: string;
  /** Regex patterns that match words belonging to this cluster */
  patterns: RegExp[];
  /** Known example words for this cluster */
  knownWords: Set<string>;
}

const PHONEME_CLUSTERS: PhonemeCluster[] = [
  {
    id: 'th_voiced',
    label: 'Voiced TH (/ð/)',
    description: 'The tongue goes between the teeth with voicing — "the", "this", "that", "there".',
    patterns: [/^th[aeiou]/i, /[aeiou]th[aeiou]/i],
    knownWords: new Set(['the', 'this', 'that', 'these', 'those', 'there', 'their', 'them', 'they', 'than', 'then', 'though', 'thus', 'together', 'weather', 'whether', 'father', 'mother', 'brother', 'other', 'another', 'gather', 'rather', 'either', 'neither', 'bathe', 'breathe', 'clothe', 'soothe', 'smooth', 'with', 'within', 'without']),
  },
  {
    id: 'th_unvoiced',
    label: 'Unvoiced TH (/θ/)',
    description: 'Tongue between teeth, no voicing — "think", "thought", "through", "three".',
    patterns: [/^th[iou]/i, /th$/i, /ght$/i],
    knownWords: new Set(['think', 'thing', 'thought', 'through', 'three', 'throw', 'threw', 'throne', 'thick', 'thin', 'thank', 'therapy', 'theory', 'theme', 'threat', 'thrill', 'thumb', 'thunder', 'birth', 'earth', 'worth', 'health', 'wealth', 'growth', 'math', 'bath', 'path', 'mouth', 'south', 'north', 'truth', 'youth', 'tooth', 'both', 'beneath', 'breath', 'death', 'faith', 'fifth', 'fourth', 'length', 'strength', 'width']),
  },
  {
    id: 'r_l',
    label: 'R / L confusion',
    description: 'Common for speakers of East Asian languages. Focus on tongue position — "r" curls back, "l" touches the ridge.',
    patterns: [/r.*l/i, /l.*r/i, /^r/i, /^l/i],
    knownWords: new Set(['really', 'relatively', 'regularly', 'rely', 'rule', 'role', 'royal', 'rural', 'railroad', 'rarely', 'literally', 'library', 'learn', 'listen', 'release', 'religion', 'relation', 'relevant', 'relief', 'recall', 'problem', 'probably', 'travel', 'world', 'girl', 'parallel', 'general', 'liberal', 'plural', 'coral', 'moral', 'lyrics', 'rivalry']),
  },
  {
    id: 'v_w',
    label: 'V / W confusion',
    description: 'V uses top teeth on lower lip; W rounds both lips — "very" vs "wary", "vine" vs "wine".',
    patterns: [/^v/i, /^w/i],
    knownWords: new Set(['very', 'voice', 'view', 'value', 'various', 'video', 'visit', 'visible', 'volume', 'vote', 'vine', 'version', 'village', 'vast', 'vessel', 'victory', 'violin', 'vivid', 'vocabulary', 'volunteer', 'vulnerable', 'world', 'work', 'would', 'want', 'was', 'were', 'will', 'with', 'wine', 'wave', 'wait', 'walk', 'warm', 'water', 'way', 'wear', 'well', 'west', 'wide', 'wild', 'win', 'wise', 'woman', 'wonder', 'wood', 'word', 'worth']),
  },
  {
    id: 'ed_endings',
    label: '-ed endings',
    description: 'After t/d sounds say "-id" (wanted). After voiceless sounds say "-t" (walked). After voiced say "-d" (played).',
    patterns: [/ed$/i],
    knownWords: new Set(['walked', 'talked', 'cooked', 'looked', 'asked', 'helped', 'stopped', 'watched', 'wished', 'laughed', 'wanted', 'needed', 'started', 'ended', 'decided', 'expected', 'created', 'added', 'provided', 'waited', 'played', 'called', 'moved', 'used', 'changed', 'opened', 'turned', 'lived', 'loved', 'showed', 'seemed', 'learned', 'remained', 'appeared', 'explained', 'believed', 'received', 'improved', 'followed', 'considered', 'discovered']),
  },
  {
    id: 'silent_letters',
    label: 'Silent letters',
    description: 'Many English words have silent letters — "knife" (k), "psychology" (p), "knight" (k+gh).',
    patterns: [/^kn/i, /^wr/i, /^ps/i, /^gn/i, /mb$/i, /mn$/i, /ght/i],
    knownWords: new Set(['knife', 'knight', 'knee', 'kneel', 'knit', 'knob', 'knock', 'knot', 'know', 'knowledge', 'write', 'wrong', 'wrap', 'wrist', 'wreck', 'wrinkle', 'psychology', 'pneumonia', 'psalm', 'pseudo', 'gnaw', 'gnat', 'gnome', 'sign', 'design', 'foreign', 'reign', 'bomb', 'climb', 'comb', 'dumb', 'lamb', 'limb', 'plumb', 'thumb', 'tomb', 'womb', 'autumn', 'column', 'hymn', 'condemn', 'night', 'light', 'right', 'fight', 'might', 'sight', 'thought', 'daughter', 'caught', 'taught', 'weight', 'eight', 'straight', 'through']),
  },
  {
    id: 'vowel_length',
    label: 'Vowel length',
    description: 'English distinguishes short vs long vowels — "ship" vs "sheep", "bit" vs "beat".',
    patterns: [/ee/i, /ea/i, /oo/i, /ou/i, /ie/i],
    knownWords: new Set(['ship', 'sheep', 'bit', 'beat', 'sit', 'seat', 'fit', 'feet', 'hit', 'heat', 'lip', 'leap', 'live', 'leave', 'rich', 'reach', 'fill', 'feel', 'still', 'steal', 'pull', 'pool', 'full', 'fool', 'look', 'luke', 'put', 'boot', 'good', 'food', 'could', 'mood', 'should', 'would', 'hood', 'stood', 'wood']),
  },
  {
    id: 'consonant_clusters',
    label: 'Consonant clusters',
    description: 'Groups of consonants without vowels — "str", "spr", "scr", "sts", "sks".',
    patterns: [/str/i, /spr/i, /scr/i, /sts$/i, /sks$/i, /nds$/i, /mps$/i, /ngs$/i, /lts$/i],
    knownWords: new Set(['street', 'strong', 'strange', 'strategy', 'structure', 'struggle', 'strength', 'stream', 'stress', 'strike', 'spring', 'spread', 'spray', 'sprint', 'screen', 'script', 'scratch', 'scroll', 'scream', 'texts', 'lists', 'costs', 'tests', 'posts', 'rests', 'tasks', 'risks', 'desks', 'masks', 'hands', 'lands', 'bands', 'stands', 'demands', 'camps', 'lamps', 'stamps', 'bumps', 'jumps', 'songs', 'rings', 'things', 'belts', 'results', 'adults']),
  },
  {
    id: 'stress_patterns',
    label: 'Word stress',
    description: 'Some words change meaning based on stress — "REcord" (noun) vs "reCORD" (verb).',
    patterns: [],
    knownWords: new Set(['record', 'present', 'permit', 'object', 'subject', 'project', 'produce', 'progress', 'protest', 'rebel', 'refund', 'contest', 'contract', 'convert', 'decrease', 'desert', 'export', 'import', 'increase', 'insert', 'insult', 'perfect', 'refuse', 'suspect', 'conflict', 'conduct', 'contrast', 'digest', 'discount', 'essay', 'extract', 'impact', 'process', 'survey', 'transfer', 'transport', 'comfortable', 'vegetable', 'temperature', 'especially', 'probably', 'february', 'library', 'interesting', 'different', 'restaurant', 'chocolate']),
  },
];

interface ClusterResult {
  cluster: PhonemeCluster;
  words: { word: string; avgAccuracy: number; count: number }[];
  avgAccuracy: number;
}

function classifyWord(word: string): PhonemeCluster | null {
  const lower = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!lower) return null;

  // First check known word sets (high confidence)
  for (const cluster of PHONEME_CLUSTERS) {
    if (cluster.knownWords.has(lower)) return cluster;
  }

  // Then check regex patterns (broader match)
  for (const cluster of PHONEME_CLUSTERS) {
    for (const pattern of cluster.patterns) {
      if (pattern.test(lower)) return cluster;
    }
  }

  return null;
}

interface WeakSoundIntelligenceProps {
  targetAccent?: string;
}

export function WeakSoundIntelligence({ targetAccent = 'en-US' }: WeakSoundIntelligenceProps) {
  const [clusters, setClusters] = useState<ClusterResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { speak, stop, speaking } = useSpeechDemo();
  const [playingWord, setPlayingWord] = useState<string | null>(null);

  useEffect(() => {
    // Fetch up to 10 recent sessions and aggregate mispronounced words
    sessionsApi.history(1, 10)
      .then(async (hist) => {
        const allWords: { word: string; accuracy: number | null; errorType: string | null }[] = [];
        const details = await Promise.allSettled(
          hist.sessions.map((s) => sessionsApi.get(s.publicId))
        );
        for (const d of details) {
          if (d.status === 'fulfilled') {
            allWords.push(...d.value.words);
          }
        }

        // Only keep mispronounced words
        const mispronounced = allWords.filter(
          (w) => w.errorType && w.errorType !== 'None' && w.errorType !== 'Omission'
        );

        // Group by cluster
        const clusterMap = new Map<string, { cluster: PhonemeCluster; words: Map<string, { total: number; count: number }> }>();

        for (const w of mispronounced) {
          const cluster = classifyWord(w.word);
          if (!cluster) continue;

          if (!clusterMap.has(cluster.id)) {
            clusterMap.set(cluster.id, { cluster, words: new Map() });
          }
          const entry = clusterMap.get(cluster.id)!;
          const key = w.word.toLowerCase().replace(/[^a-z]/g, '');
          const existing = entry.words.get(key) ?? { total: 0, count: 0 };
          existing.total += w.accuracy ?? 0;
          existing.count++;
          entry.words.set(key, existing);
        }

        // Convert to sorted results
        const results: ClusterResult[] = Array.from(clusterMap.values())
          .map(({ cluster, words }) => {
            const wordList = Array.from(words.entries())
              .map(([word, { total, count }]) => ({ word, avgAccuracy: total / count, count }))
              .sort((a, b) => a.avgAccuracy - b.avgAccuracy);
            const totalAcc = wordList.reduce((a, w) => a + w.avgAccuracy * w.count, 0);
            const totalCount = wordList.reduce((a, w) => a + w.count, 0);
            return {
              cluster,
              words: wordList,
              avgAccuracy: totalCount > 0 ? totalAcc / totalCount : 0,
            };
          })
          .filter((r) => r.words.length > 0)
          .sort((a, b) => a.avgAccuracy - b.avgAccuracy); // worst first

        setClusters(results);
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

  useEffect(() => {
    if (!speaking) setPlayingWord(null);
  }, [speaking]);

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">
            <Ear className="w-4 h-4 text-violet-500" />
          </div>
          <div className="skeleton h-4 w-48" />
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-12 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (clusters.length === 0) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">
            <Ear className="w-4 h-4 text-violet-500" />
          </div>
          <h2 className="font-semibold text-gray-900">Weak Sound Intelligence</h2>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Complete a few sessions and your phoneme pattern analysis will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
          <Ear className="w-4 h-4 text-violet-500" />
        </div>
        <h2 className="font-semibold text-gray-900">Weak Sound Intelligence</h2>
      </div>
      <p className="text-xs text-gray-500 mb-4 ml-10">
        Phoneme clusters where you struggle most, based on your last 10 sessions
      </p>

      <div className="flex flex-col gap-2">
        {clusters.map((cr) => {
          const isOpen = expanded === cr.cluster.id;
          return (
            <div key={cr.cluster.id} className="border border-gray-100 rounded-xl overflow-hidden">
              {/* Cluster header */}
              <button
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                onClick={() => setExpanded(isOpen ? null : cr.cluster.id)}
              >
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-gray-900 text-sm">{cr.cluster.label}</span>
                  <span className="text-xs text-gray-400 ml-2">{cr.words.length} word{cr.words.length !== 1 ? 's' : ''}</span>
                </div>
                <span className={`text-sm font-bold tabular-nums ${scoreColor(cr.avgAccuracy)}`}>
                  {formatPercent(cr.avgAccuracy, 0)}
                </span>
                {isOpen
                  ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                  : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                }
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div className="px-4 pb-4 bg-violet-50 border-t border-violet-100">
                  <p className="text-sm text-violet-900 mt-3 mb-3 leading-relaxed">
                    {cr.cluster.description}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {cr.words.map((w) => (
                      <div key={w.word} className="flex items-center gap-2 py-1">
                        <button
                          onClick={() => handleSpeak(w.word)}
                          className={`p-1 rounded-lg transition-colors ${
                            playingWord === w.word
                              ? 'bg-violet-200 text-violet-700'
                              : 'text-gray-400 hover:bg-violet-100 hover:text-violet-600'
                          }`}
                          title={`Hear "${w.word}"`}
                        >
                          <Volume2 className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-medium text-gray-900 capitalize flex-1">{w.word}</span>
                        <span className="text-xs text-gray-400 tabular-nums">{w.count}x</span>
                        <span className={`text-sm font-semibold tabular-nums ${scoreColor(w.avgAccuracy)}`}>
                          {formatPercent(w.avgAccuracy, 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
