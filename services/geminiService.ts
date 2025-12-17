import { GoogleGenAI, GenerateContentResponse, Tool } from "@google/genai";

// Ensure API Key is available
const apiKey = process.env.API_KEY || '';
if (!apiKey) {
  console.warn("API_KEY is not defined in process.env");
}

const ai = new GoogleGenAI({ apiKey });

export const analyzeText = async (
  text: string, 
  prompt: string, 
  modelName: string = 'gemini-2.5-flash'
): Promise<string> => {
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelName,
      contents: `Context from book page:\n"${text}"\n\nUser Question/Instruction:\n${prompt}`,
      config: {
        systemInstruction: "You are a helpful literary assistant and reading companion. Help the user understand the text provided from the book. Be concise and insightful.",
      }
    });
    return response.text || "Sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "An error occurred while contacting the AI.";
  }
};

export const chatWithBook = async (
  history: { role: string; parts: { text: string }[] }[],
  message: string,
  context: string
): Promise<string> => {
  try {
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      history: [
        {
          role: 'user',
          parts: [{ text: `I am reading a book. Here is the context of the page I am currently reading: "${context}". I might ask questions about it.` }]
        },
        {
          role: 'model',
          parts: [{ text: "Understood. I am ready to help you with the book context provided." }]
        },
        ...history
      ],
      config: {
        systemInstruction: "You are a helpful reading companion. Answer questions based on the provided book context."
      }
    });

    const result = await chat.sendMessage({ message });
    return result.text || "";
  } catch (error) {
    console.error("Chat Error:", error);
    throw error;
  }
};

// NEW: NotebookLM style analysis
export interface NotebookSource {
  id: string;
  type: 'text' | 'url';
  content: string;
}

export const analyzeNotebookSources = async (
  sources: NotebookSource[],
  userPrompt: string,
  history: { role: string; parts: { text: string }[] }[] = []
): Promise<string> => {
  try {
    // 1. Prepare Sources Context
    let sourceContext = "Here are the external sources provided by the user for analysis:\n\n";
    
    const hasUrl = sources.some(s => s.type === 'url');
    
    sources.forEach((source, index) => {
      if (source.type === 'url') {
        sourceContext += `[Source ${index + 1} - URL]: ${source.content}\n`;
      } else {
        sourceContext += `[Source ${index + 1} - Text Block]:\n"${source.content}"\n`;
      }
      sourceContext += "---\n";
    });

    // 2. Configure Tools (Enable Google Search if URLs are present to ground the answer)
    const tools: Tool[] = hasUrl ? [{ googleSearch: {} }] : [];

    // 3. Create Chat or Generate Content
    // Using generateContent for single turn deep analysis is often better for "Notebook" style, 
    // but Chat allows follow-up. Let's use Chat to allow Q&A on sources.
    
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      history: [
        {
            role: 'user',
            parts: [{ text: `You are an intelligent research assistant (like NotebookLM). \n${sourceContext}` }]
        },
        {
            role: 'model',
            parts: [{ text: "I have received your sources. I am ready to analyze them, synthesize information, or answer questions based on these specific documents and links." }]
        },
        ...history
      ],
      config: {
        tools: tools,
        systemInstruction: "You are a research assistant. Synthesize information from the provided sources. If a URL is provided, use Google Search grounding to understand its content if you cannot access it directly. Cite your sources (e.g., [Source 1]) when possible.",
      }
    });

    const result = await chat.sendMessage({ message: userPrompt });
    
    // Check for grounding metadata (source links) if search was used
    let text = result.text || "";
    
    // Append grounding chunks if available (simple implementation)
    if (result.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        // Just a simple indicator that search was used, the text usually contains the answer
        // text += "\n\n(Information verified via Google Search)";
    }

    return text;

  } catch (error) {
    console.error("Notebook Analysis Error:", error);
    return "Error processing your notebook sources. Please try again.";
  }
};