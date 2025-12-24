
import { GoogleGenAI, GenerateContentResponse, Tool } from "@google/genai";

// Luôn tạo instance mới để đảm bảo lấy API_KEY vừa được cập nhật từ window.aistudio
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }
  return new GoogleGenAI({ apiKey });
};

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
        systemInstruction: "You are a helpful literary assistant and reading companion. Help the user understand the text provided from the book. Be concise and insightful. Use Vietnamese for response.",
      }
    });
    return response.text || "Xin lỗi, tôi không thể tạo phản hồi lúc này.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message === "API_KEY_MISSING" || error.message?.includes("Requested entity was not found")) {
      return "ERROR_API_KEY";
    }
    return "Đã xảy ra lỗi khi kết nối với AI. Vui lòng thử lại.";
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
          parts: [{ text: `I am reading a book. Here is the context of the page: "${context}". Please answer in Vietnamese.` }]
        },
        {
          role: 'model',
          parts: [{ text: "Tôi đã hiểu nội dung trang sách. Tôi sẵn sàng hỗ trợ bạn bằng tiếng Việt." }]
        },
        ...history
      ],
      config: {
        systemInstruction: "You are a helpful reading companion. Answer questions based on the provided book context in Vietnamese."
      }
    });

    const result = await chat.sendMessage({ message });
    return result.text || "";
  } catch (error: any) {
    console.error("Chat Error:", error);
    if (error.message === "API_KEY_MISSING" || error.message?.includes("Requested entity was not found")) {
      return "ERROR_API_KEY";
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
            parts: [{ text: `You are an intelligent research assistant. Answer in Vietnamese. \n${sourceContext}` }]
        },
        {
            role: 'model',
            parts: [{ text: "Tôi đã nhận được các nguồn tài liệu của bạn. Tôi sẵn sàng phân tích chúng bằng tiếng Việt." }]
        },
        ...history
      ],
      config: {
        tools: tools,
        systemInstruction: "You are a research assistant. Synthesize information from the provided sources. Answer in Vietnamese.",
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
            text += "\n\n**Nguồn tham khảo:**\n" + uniqueLinks.join("\n");
        }
    }

    return text;
  } catch (error: any) {
    console.error("Notebook Analysis Error:", error);
    if (error.message === "API_KEY_MISSING" || error.message?.includes("Requested entity was not found")) {
      return "ERROR_API_KEY";
    }
    return "Lỗi khi xử lý nguồn Notebook. Vui lòng thử lại.";
  }
};
