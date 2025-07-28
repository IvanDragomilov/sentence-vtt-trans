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
  // Mock translation service - replace with real API in production
  static async translateText(request: TranslationRequest): Promise<TranslationResponse> {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

      // For demo purposes, we'll use a simple mock translation
      // In production, replace this with actual translation API calls
      const translatedText = this.mockTranslate(
        request.text, 
        request.sourceLanguage, 
        request.targetLanguage
      );

      return {
        translatedText,
        success: true
      };
    } catch (error) {
      return {
        translatedText: '',
        success: false,
        error: error instanceof Error ? error.message : 'Translation failed'
      };
    }
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

    // If no direct translation found, add a prefix to indicate it's translated
    if (result === text && from !== to) {
      result = `[${to.toUpperCase()}] ${text}`;
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
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'nl', name: 'Dutch' },
  { code: 'sv', name: 'Swedish' },
  { code: 'no', name: 'Norwegian' },
  { code: 'da', name: 'Danish' },
  { code: 'fi', name: 'Finnish' },
  { code: 'pl', name: 'Polish' },
  { code: 'tr', name: 'Turkish' },
  { code: 'th', name: 'Thai' }
];