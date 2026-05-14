

const DEFAULT_OPTIONS: Required<ChunkingOptions> = {
  minWords: 300,
  targetWords: 400,
  maxWords: 500,
  overlapWords: 40,
}

function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function splitIntoWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean)
}

function countWords(text: string): number {
  return splitIntoWords(text).length
}

function splitLargeBlockIntoSentences(block: string): string[] {
  const sentences = block.match(/[^.!?]+[.!?]+|[^.!?]+$/g)
  return sentences?.map((sentence) => sentence.trim()).filter(Boolean) ?? [block]
}

function splitWordsIntoChunks(words: string[], maxWords: number): string[] {
  const chunks: string[] = []

  for (let index = 0; index < words.length; index += maxWords) {
    chunks.push(words.slice(index, index + maxWords).join(" "))
  }

  return chunks
}

function balanceChunks(chunks: string[], options: Required<ChunkingOptions>): ChunkResult[] {
  const balanced: ChunkResult[] = []

  for (const chunk of chunks) {
    const wordCount = countWords(chunk)
    const last = balanced[balanced.length - 1]

    if (wordCount < options.minWords && last) {
      const merged = `${last.text} ${chunk}`.trim()
      if (countWords(merged) <= options.maxWords) {
        balanced[balanced.length - 1] = {
          index: last.index,
          text: merged,
          wordCount: countWords(merged),
        }
        continue
      }
    }

    balanced.push({
      index: balanced.length,
      text: chunk,
      wordCount,
    })
  }

  return balanced.map((chunk, index) => ({ ...chunk, index }))
}

export function chunkSemanticText(text: string, options: ChunkingOptions = {}): ChunkResult[] {
  const config = { ...DEFAULT_OPTIONS, ...options }
  const normalized = normalizeText(text)

  if (!normalized) {
    return []
  }

  const paragraphs = normalized
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  const rawChunks: string[] = []
  let currentChunk = ""

  const flushCurrentChunk = (): void => {
    const trimmed = currentChunk.trim()
    if (trimmed) {
      rawChunks.push(trimmed)
    }
    currentChunk = ""
  }

  for (const paragraph of paragraphs) {
    const paragraphWordCount = countWords(paragraph)

    if (paragraphWordCount > config.maxWords) {
      flushCurrentChunk()

      const sentences = splitLargeBlockIntoSentences(paragraph)
      let sentenceChunk = ""

      for (const sentence of sentences) {
        const nextChunk = sentenceChunk ? `${sentenceChunk} ${sentence}` : sentence

        if (countWords(nextChunk) <= config.maxWords) {
          sentenceChunk = nextChunk
          continue
        }

        if (sentenceChunk) {
          rawChunks.push(sentenceChunk.trim())
        }

        if (countWords(sentence) > config.maxWords) {
          const wordChunks = splitWordsIntoChunks(splitIntoWords(sentence), config.maxWords)
          rawChunks.push(...wordChunks)
          sentenceChunk = ""
        } else {
          sentenceChunk = sentence
        }
      }

      if (sentenceChunk.trim()) {
        rawChunks.push(sentenceChunk.trim())
      }

      continue
    }

    const nextChunk = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph

    if (countWords(nextChunk) <= config.maxWords) {
      currentChunk = nextChunk
      continue
    }

    if (countWords(currentChunk) >= config.minWords) {
      flushCurrentChunk()
      currentChunk = paragraph
      continue
    }

    flushCurrentChunk()
    currentChunk = paragraph
  }

  flushCurrentChunk()

  if (rawChunks.length === 0) {
    rawChunks.push(normalized)
  }

  if (rawChunks.length === 1) {
    return [
      {
        index: 0,
        text: rawChunks[0],
        wordCount: countWords(rawChunks[0]),
      },
    ]
  }

  return balanceChunks(rawChunks, config)
}
