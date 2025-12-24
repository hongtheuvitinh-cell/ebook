
import { GoogleGenAI, GenerateContentResponse, Tool } from "@google/genai";

// Helper to get Gemini client with fresh API Key
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const analyzeText = async (
  text: string, 
  prompt: string, 
  modelName: string = 'gemini-3-flash-preview'
): Promise<string> => {
  try {
    const ai = getAiClient();
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelName,
      contents: `Context from book page:\n"${text}"\n\nUser Question/Instruction:\n${prompt}`,
      config: {
        systemInstruction: "You are a helpful literary assistant and reading companion. Help the user understand the text provided from the book. Be concise and insightful.",
      }
    });
    return response.text || "Sorry, I couldn't generate a response.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes("Requested entity was not found")) {
        return "Lỗi: Vui lòng chọn API Key (Paid) để tiếp tục sử dụng tính năng AI.";
    }
    return "An error occurred while contacting the AI.";
  }
};

export const chatWithBook = async (
  history: { role: string; parts: { text: string }[] }[],
  message: string,
  context: string
): Promise<string> => {
  try {
    const ai = getAiClient();
    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
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
  } catch (error: any) {
    console.error("Chat Error:", error);
    if (error.message?.includes("Requested entity was not found")) {
        return "Lỗi: Vui lòng chọn API Key (Paid) từ trình quản lý để sử dụng chat.";
    }
    throw error;
  }
};

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
    const ai = getAiClient();
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

    const tools: Tool[] = hasUrl ? [{ googleSearch: {} }] : [];

    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
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
        systemInstruction: "You are a research assistant. Synthesize information from the provided sources. If a URL is provided, use Google Search grounding to understand its content. Cite your sources when possible.",
      }
    });

    const result = await chat.sendMessage({ message: userPrompt });
    let text = result.text || "";
    
    if (result.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        const chunks = result.candidates[0].groundingMetadata.groundingChunks;
        const groundingLinks = chunks
            .filter(chunk => chunk.web)
            .map(chunk => `- [${chunk.web?.title}](${chunk.web?.uri})`);
        
        if (groundingLinks.length > 0) {
            const uniqueLinks = [...new Set(groundingLinks)];
            text += "\n\n**Sources & References:**\n" + uniqueLinks.join("\n");
        }
    }

    return text;
  } catch (error: any) {
    console.error("Notebook Analysis Error:", error);
    if (error.message?.includes("Requested entity was not found")) {
        return "Lỗi API: Hãy kiểm tra và chọn lại API Key hợp lệ.";
    }
    return "Error processing your notebook sources. Please try again.";
  }
};
