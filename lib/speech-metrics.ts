/** Counts common English fillers; transcription may omit fillers, so results are approximate. */
export function speechMetrics(text: string, durationSec: number) {
  const words = text.trim().match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)?/gu) ?? [];
  const fillers = words.filter((w) =>
    /^(um|uh|er|ah|like|you know|so|actually|basically|literally)$/i.test(w),
  ).length;
  const sentences = text.trim().match(/[.!?]+/g)?.length ?? 1;
  const avgWordsPerSentence = words.length / Math.max(1, sentences);
  return {
    wordCount: words.length,
    fillers,
    wordsPerMinute:
      durationSec > 0 ? Math.round((words.length * 60) / durationSec) : null,
    fillerRate:
      durationSec > 0 ? Math.round((fillers * 60) / durationSec) : null,
    avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
    durationSec: Math.round(durationSec),
    // Note: These metrics are approximate. Browser audio APIs cannot reliably measure
    // confidence, emotion, or personality. Transcription may omit filler words.
    disclaimer:
      "Approximate metrics from transcript; not a psychological assessment.",
  };
}
