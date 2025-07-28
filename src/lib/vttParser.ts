export interface VTTCue {
  startTime: string;
  endTime: string;
  textLines: string[];
  originalIndex: number;
}

export interface VTTGroup {
  cues: VTTCue[];
  combinedText: string;
}

export class VTTParser {
  private static readonly SENTENCE_ENDINGS = /[.!?…]+$/;
  private static readonly SENTENCE_STARTERS = /^[A-Z\-"'"]/;

  static parse(vttContent: string): VTTCue[] {
    const lines = vttContent.split('\n');
    const cues: VTTCue[] = [];
    let currentCue: Partial<VTTCue> | null = null;
    let cueIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines and "WEBVTT" header
      if (!line || line === 'WEBVTT') continue;

      // Check if this is a timestamp line
      if (line.includes('-->')) {
        // Save previous cue if exists
        if (currentCue && currentCue.textLines && currentCue.textLines.length > 0) {
          cues.push({
            startTime: currentCue.startTime!,
            endTime: currentCue.endTime!,
            textLines: currentCue.textLines,
            originalIndex: cueIndex++
          });
        }

        // Parse timestamp
        const [startTime, endTime] = line.split('-->').map(t => t.trim());
        currentCue = {
          startTime,
          endTime,
          textLines: []
        };
      } else if (currentCue && line) {
        // This is a text line
        currentCue.textLines = currentCue.textLines || [];
        currentCue.textLines.push(line);
      }
    }

    // Add the last cue
    if (currentCue && currentCue.textLines && currentCue.textLines.length > 0) {
      cues.push({
        startTime: currentCue.startTime!,
        endTime: currentCue.endTime!,
        textLines: currentCue.textLines,
        originalIndex: cueIndex
      });
    }

    return cues;
  }

  static groupCuesIntoSentences(cues: VTTCue[]): VTTGroup[] {
    if (cues.length === 0) return [];

    const groups: VTTGroup[] = [];
    let currentGroup: VTTCue[] = [cues[0]];

    for (let i = 1; i < cues.length; i++) {
      const currentCue = cues[i - 1];
      const nextCue = cues[i];

      // Get the last text line of current cue
      const lastLine = currentCue.textLines[currentCue.textLines.length - 1] || '';
      
      // Get the first text line of next cue
      const nextFirstLine = nextCue.textLines[0] || '';

      // Check for sentence boundary
      const hasSentenceEnding = this.SENTENCE_ENDINGS.test(lastLine.trim());
      const nextStartsNewSentence = this.SENTENCE_STARTERS.test(nextFirstLine.trim());

      if (hasSentenceEnding && nextStartsNewSentence) {
        // Complete current group
        const combinedText = this.combineCueTexts(currentGroup);
        groups.push({
          cues: [...currentGroup],
          combinedText
        });

        // Start new group
        currentGroup = [nextCue];
      } else {
        // Continue current group
        currentGroup.push(nextCue);
      }
    }

    // Add the final group
    if (currentGroup.length > 0) {
      const combinedText = this.combineCueTexts(currentGroup);
      groups.push({
        cues: [...currentGroup],
        combinedText
      });
    }

    return groups;
  }

  private static combineCueTexts(cues: VTTCue[]): string {
    return cues
      .map(cue => cue.textLines.join(' '))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  static redistributeTranslation(group: VTTGroup, translatedText: string): VTTCue[] {
    const totalLines = group.cues.reduce((sum, cue) => sum + cue.textLines.length, 0);
    
    // Split translated text into lines (preserve existing line breaks if any)
    let translatedLines = translatedText
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    // If we have fewer translated lines than original slots, split longer lines
    while (translatedLines.length < totalLines && translatedLines.length > 0) {
      // Find the longest line to split
      let longestIndex = 0;
      let longestLength = 0;
      
      for (let i = 0; i < translatedLines.length; i++) {
        if (translatedLines[i].length > longestLength) {
          longestLength = translatedLines[i].length;
          longestIndex = i;
        }
      }

      const lineToSplit = translatedLines[longestIndex];
      const words = lineToSplit.split(' ');
      
      if (words.length > 1) {
        const midPoint = Math.ceil(words.length / 2);
        const firstHalf = words.slice(0, midPoint).join(' ');
        const secondHalf = words.slice(midPoint).join(' ');
        
        translatedLines.splice(longestIndex, 1, firstHalf, secondHalf);
      } else {
        break; // Can't split further
      }
    }

    // If we have more translated lines than slots, merge excess into last slot
    if (translatedLines.length > totalLines) {
      const excess = translatedLines.splice(totalLines - 1);
      translatedLines[totalLines - 1] = excess.join(' ');
    }

    // Redistribute lines back to cues
    const updatedCues: VTTCue[] = [];
    let lineIndex = 0;

    for (const cue of group.cues) {
      const newTextLines: string[] = [];
      
      for (let i = 0; i < cue.textLines.length; i++) {
        if (lineIndex < translatedLines.length) {
          newTextLines.push(translatedLines[lineIndex]);
          lineIndex++;
        } else {
          newTextLines.push(''); // Fallback to empty if we run out
        }
      }

      updatedCues.push({
        ...cue,
        textLines: newTextLines.filter(line => line.trim().length > 0)
      });
    }

    return updatedCues;
  }

  static reconstructVTT(cues: VTTCue[]): string {
    let result = 'WEBVTT\n\n';

    // Sort cues by their original index to maintain order
    const sortedCues = [...cues].sort((a, b) => a.originalIndex - b.originalIndex);

    for (const cue of sortedCues) {
      result += `${cue.startTime} --> ${cue.endTime}\n`;
      result += cue.textLines.join('\n') + '\n\n';
    }

    return result.trim();
  }
}