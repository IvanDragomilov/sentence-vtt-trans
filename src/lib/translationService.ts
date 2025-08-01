export interface TranslationRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export interface TranslationResponse {
  translatedText: string;
  success: boolean;
  error?: string;
}

export class TranslationService {
  static async translateText(
    request: TranslationRequest, 
    apiKey?: string, 
    provider: 'gemini' | 'openai' = 'gemini'
  ): Promise<TranslationResponse> {
    try {
      if (!apiKey) {
        throw new Error('API key required');
      }

      let translatedText: string;

      if (provider === 'gemini') {
        translatedText = await this.translateWithGemini(request.text, request.sourceLanguage, request.targetLanguage, apiKey);
      } else {
        translatedText = await this.translateWithOpenAI(request.text, request.sourceLanguage, request.targetLanguage, apiKey);
      }

      return {
        translatedText,
        success: true
      };
    } catch (error) {
      // Log error for debugging
      console.error('Translation API failed:', error);
      
      const translatedText = this.mockTranslate(
        request.text, 
        request.sourceLanguage, 
        request.targetLanguage
      );

      return {
        translatedText,
        success: false,
        error: error instanceof Error ? error.message : 'Translation API failed'
      };
    }
  }

  private static async translateWithGemini(text: string, from: string, to: string, apiKey: string): Promise<string> {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Translate the following text from ${from} to ${to}. Preserve all formatting including HTML tags, line breaks, and punctuation. Only return the translated text, nothing else:\n\n${text}`
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text.trim();
  }

  private static async translateWithOpenAI(text: string, from: string, to: string, apiKey: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a professional translator. Translate text from ${from} to ${to}. Preserve all formatting including HTML tags, line breaks, and punctuation. Only return the translated text, nothing else.`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  }

  private static mockTranslate(text: string, from: string, to: string): string {
    // This is a mock implementation for demo purposes
    // In production, you would integrate with services like:
    // - Google Translate API
    // - Azure Translator
    // - AWS Translate
    // - DeepL API
    
    const mockTranslations: Record<string, Record<string, string>> = {
      'en-es': {
        'Hello': 'Hola',
        'world': 'mundo',
        'How are you?': '¿Cómo estás?',
        'Good morning': 'Buenos días',
        'Thank you': 'Gracias',
        'Please': 'Por favor',
        'Yes': 'Sí',
        'No': 'No'
      },
      'en-fr': {
        'Hello': 'Bonjour',
        'world': 'monde',
        'How are you?': 'Comment allez-vous?',
        'Good morning': 'Bonjour',
        'Thank you': 'Merci',
        'Please': 'S\'il vous plaît',
        'Yes': 'Oui',
        'No': 'Non'
      },
      'en-de': {
        'Hello': 'Hallo',
        'world': 'Welt',
        'How are you?': 'Wie geht es dir?',
        'Good morning': 'Guten Morgen',
        'Thank you': 'Danke',
        'Please': 'Bitte',
        'Yes': 'Ja',
        'No': 'Nein'
      }
    };

    const langPair = `${from}-${to}`;
    const translations = mockTranslations[langPair] || {};

    // Simple word replacement for demo
    let result = text;
    Object.entries(translations).forEach(([original, translated]) => {
      const regex = new RegExp(`\\b${original}\\b`, 'gi');
      result = result.replace(regex, translated);
    });

    // If no direct translation found, return original text for now
    if (result === text && from !== to) {
      result = text; // Keep original text if no translation found
    }

    return result;
  }

  // Alternative method for using real translation APIs
  static async translateWithGoogleTranslate(
    request: TranslationRequest,
    apiKey: string
  ): Promise<TranslationResponse> {
    try {
      const response = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: request.text,
            source: request.sourceLanguage,
            target: request.targetLanguage,
            format: 'text'
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Translation API error: ${response.status}`);
      }

      const data = await response.json();
      const translatedText = data.data.translations[0].translatedText;

      return {
        translatedText,
        success: true
      };
    } catch (error) {
      return {
        translatedText: '',
        success: false,
        error: error instanceof Error ? error.message : 'Translation API failed'
      };
    }
  }
}

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'sv', name: 'Swedish' },
  { code: 'no', name: 'Norwegian' },
  { code: 'da', name: 'Danish' },
  { code: 'fi', name: 'Finnish' },
  { code: 'pl', name: 'Polish' },
  { code: 'tr', name: 'Turkish' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'ru', name: 'Russian' },
  { code: 'cs', name: 'Czech' },
  { code: 'sk', name: 'Slovak' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'ro', name: 'Romanian' },
  { code: 'bg', name: 'Bulgarian' },
  { code: 'hr', name: 'Croatian' },
  { code: 'sl', name: 'Slovenian' },
  { code: 'et', name: 'Estonian' },
  { code: 'lv', name: 'Latvian' },
  { code: 'lt', name: 'Lithuanian' },
  { code: 'el', name: 'Greek' }
];