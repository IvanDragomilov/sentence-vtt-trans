import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { VTTParser, VTTGroup } from '@/lib/vttParser';
import { TranslationService, SUPPORTED_LANGUAGES } from '@/lib/translationService';
import { Languages, Download, Upload, FileText, CheckCircle, Clock } from 'lucide-react';

interface TranslationProgress {
  current: number;
  total: number;
  stage: string;
}

export const VTTTranslator = () => {
  const { toast } = useToast();
  const [vttContent, setVttContent] = useState('');
  const [translatedContent, setTranslatedContent] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [isTranslating, setIsTranslating] = useState(false);
  const [progress, setProgress] = useState<TranslationProgress | null>(null);
  const [groups, setGroups] = useState<VTTGroup[]>([]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.vtt')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setVttContent(content);
        
        // Parse and show groups
        const cues = VTTParser.parse(content);
        const sentenceGroups = VTTParser.groupCuesIntoSentences(cues);
        setGroups(sentenceGroups);
        
        toast({
          title: "VTT File Loaded",
          description: `Parsed ${cues.length} cues into ${sentenceGroups.length} sentence groups`,
        });
      };
      reader.readAsText(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a valid .vtt file",
        variant: "destructive",
      });
    }
  };

  const translateVTT = async () => {
    if (!vttContent.trim()) {
      toast({
        title: "No Content",
        description: "Please load a VTT file first",
        variant: "destructive",
      });
      return;
    }

    setIsTranslating(true);
    setProgress({ current: 0, total: groups.length, stage: "Parsing" });

    try {
      // Step 1: Parse VTT
      const cues = VTTParser.parse(vttContent);
      setProgress({ current: 0, total: groups.length, stage: "Grouping sentences" });

      // Step 2: Group into sentences
      const sentenceGroups = VTTParser.groupCuesIntoSentences(cues);
      setGroups(sentenceGroups);

      setProgress({ current: 0, total: sentenceGroups.length, stage: "Translating" });

      // Step 3: Translate each group
      const translatedCues = [];
      for (let i = 0; i < sentenceGroups.length; i++) {
        const group = sentenceGroups[i];
        setProgress({ current: i + 1, total: sentenceGroups.length, stage: "Translating" });

        const translationResult = await TranslationService.translateText({
          text: group.combinedText,
          sourceLanguage,
          targetLanguage
        });

        if (translationResult.success) {
          // Step 4: Redistribute translated text
          const redistributedCues = VTTParser.redistributeTranslation(
            group,
            translationResult.translatedText
          );
          translatedCues.push(...redistributedCues);
        } else {
          throw new Error(translationResult.error || 'Translation failed');
        }
      }

      setProgress({ current: sentenceGroups.length, total: sentenceGroups.length, stage: "Reconstructing" });

      // Step 5: Reconstruct VTT
      const finalVTT = VTTParser.reconstructVTT(translatedCues);
      setTranslatedContent(finalVTT);

      toast({
        title: "Translation Complete",
        description: `Successfully translated ${sentenceGroups.length} sentence groups`,
      });

    } catch (error) {
      console.error('Translation error:', error);
      toast({
        title: "Translation Failed",
        description: error instanceof Error ? error.message : "An error occurred during translation",
        variant: "destructive",
      });
    } finally {
      setIsTranslating(false);
      setProgress(null);
    }
  };

  const downloadTranslatedVTT = () => {
    if (!translatedContent) return;

    const blob = new Blob([translatedContent], { type: 'text/vtt' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translated_${sourceLanguage}-${targetLanguage}.vtt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Languages className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            VTT Subtitle Translator
          </h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Intelligent sentence-aware translation for VTT subtitle files. 
          Preserves timing while ensuring contextually accurate translations.
        </p>
      </div>

      {/* Language Selection */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium">Source Language</label>
            <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_LANGUAGES.map(lang => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-center">
            <Languages className="w-6 h-6 text-muted-foreground" />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Target Language</label>
            <Select value={targetLanguage} onValueChange={setTargetLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_LANGUAGES.map(lang => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* File Upload */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Upload VTT File</h3>
          </div>
          
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
            <input
              type="file"
              accept=".vtt"
              onChange={handleFileUpload}
              className="hidden"
              id="vtt-upload"
            />
            <label htmlFor="vtt-upload" className="cursor-pointer">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">Choose VTT file</p>
              <p className="text-muted-foreground">Click to browse or drag and drop</p>
            </label>
          </div>

          {vttContent && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  File loaded
                </Badge>
                {groups.length > 0 && (
                  <Badge variant="outline">
                    {groups.length} sentence groups detected
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Translation Progress */}
      {isTranslating && progress && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary animate-spin" />
              <h3 className="text-lg font-semibold">Translation Progress</h3>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{progress.stage}</span>
                <span>{progress.current} / {progress.total}</span>
              </div>
              <Progress 
                value={(progress.current / progress.total) * 100} 
                className="w-full"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button
          onClick={translateVTT}
          disabled={!vttContent || isTranslating}
          className="flex items-center gap-2"
          size="lg"
        >
          <Languages className="w-5 h-5" />
          {isTranslating ? 'Translating...' : 'Translate VTT'}
        </Button>

        {translatedContent && (
          <Button
            onClick={downloadTranslatedVTT}
            variant="outline"
            className="flex items-center gap-2"
            size="lg"
          >
            <Download className="w-5 h-5" />
            Download Translated VTT
          </Button>
        )}
      </div>

      {/* Original Content Preview */}
      {vttContent && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Original VTT Content</h3>
          <Textarea
            value={vttContent}
            onChange={(e) => setVttContent(e.target.value)}
            className="min-h-[200px] font-mono text-sm"
            placeholder="Paste VTT content here or upload a file..."
          />
        </Card>
      )}

      {/* Translated Content Preview */}
      {translatedContent && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Translated VTT Content</h3>
          <Textarea
            value={translatedContent}
            readOnly
            className="min-h-[200px] font-mono text-sm"
          />
        </Card>
      )}

      {/* Sentence Groups Preview */}
      {groups.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Sentence Groups Analysis</h3>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {groups.map((group, index) => (
              <div key={index} className="border rounded-lg p-3 bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">
                    Group {index + 1}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {group.cues.length} cues
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {group.combinedText}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};