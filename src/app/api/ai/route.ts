import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSession } from '@/lib/server/auth';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt, text, action } = await request.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API Key is missing' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    let fullPrompt = '';

    if (action === 'summarize') {
      fullPrompt = `Summarize the following text concisely. Return ONLY the raw summary text without any conversational filler or markdown formatting:\n\n${text}`;
    } else if (action === 'improve') {
      fullPrompt = `Improve the writing of the following text to make it more professional and engaging. Return ONLY the raw improved text without any conversational filler or markdown formatting:\n\n${text}`;
    } else if (action === 'autocomplete') {
      fullPrompt = `Continue writing the following text naturally. Return ONLY the raw continuation text without repeating the original text, and without any conversational filler or markdown formatting:\n\n${text}`;
    } else {
      fullPrompt = `${prompt}\n\nContext text:\n${text}`;
    }

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const generatedText = response.text();

    return NextResponse.json({ result: generatedText });
  } catch (error) {
    console.error('AI error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
