import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function translateWithGemini(text: string, from: string, to: string, apiKey: string) {
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

async function translateWithOpenAI(text: string, from: string, to: string, apiKey: string) {
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text, sourceLanguage, targetLanguage, provider = 'gemini' } = await req.json()

    // Get API keys from environment
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')

    let translatedText: string

    if (provider === 'gemini' && geminiApiKey) {
      translatedText = await translateWithGemini(text, sourceLanguage, targetLanguage, geminiApiKey)
    } else if (provider === 'openai' && openaiApiKey) {
      translatedText = await translateWithOpenAI(text, sourceLanguage, targetLanguage, openaiApiKey)
    } else {
      throw new Error(`API key not found for provider: ${provider}`)
    }

    return new Response(
      JSON.stringify({ 
        translatedText,
        success: true
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        translatedText: '',
        success: false,
        error: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  }
})