/** Preserve tones; accept numbered pinyin only as a typed input convenience. */
export function normalizeDictation(value: string) {
  const marks: Record<string, string> = {
    a: "āáǎà",
    e: "ēéěè",
    i: "īíǐì",
    o: "ōóǒò",
    u: "ūúǔù",
    ü: "ǖǘǚǜ",
  };
  return value
    .toLowerCase()
    .normalize("NFC")
    .trim()
    .replace(/u:|v/g, "ü")
    .replace(
      /([a-zü]+)([1-5])/g,
      (_match: string, syllable: string, digit: string) => {
        const tone = Number(digit);
        if (tone === 5) return syllable;
        let position = syllable.indexOf("a");
        if (position < 0) position = syllable.indexOf("e");
        if (position < 0 && syllable.includes("ou"))
          position = syllable.indexOf("o");
        if (position < 0) {
          for (let i = syllable.length - 1; i >= 0; i--)
            if (marks[syllable[i]]) {
              position = i;
              break;
            }
        }
        return position < 0
          ? `${syllable}${digit}`
          : syllable.slice(0, position) +
              marks[syllable[position]][tone - 1] +
              syllable.slice(position + 1);
      },
    )
    .replace(/\s+/g, " ");
}
