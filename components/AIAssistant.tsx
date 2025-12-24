import React, { useState, useRef, useEffect } from 'react';
import { analyzeText, chatWithBook, analyzeNotebookSources, NotebookSource } from '../services/geminiService';
import { Sparkles, Send, X, Loader2, BookOpen, FileText, Link as LinkIcon, Plus, Trash2, Library } from 'lucide-react';
import { ChatMessage } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface AIAssistantProps {
  isVisible: boolean;
  onClose: () => void;
  pageText: string; // Context from current page
}

type AssistantMode = 'reader' | 'notebook';

const AIAssistant: React.FC<AIAssistantProps> = ({ isVisible, onClose, pageText }) => {
  // Mode State
  const [mode, setMode] = useState<AssistantMode>('reader');

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Notebook State
  const [sources, setSources] = useState<NotebookSource[]>([]);
  const [newSourceContent, setNewSourceContent] = useState('');
  const [newSourceType, setNewSourceType] = useState<'text' | 'url'>('text');
  const [showAddSource, setShowAddSource] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, mode]); // Scroll when messages change or mode switches

  // Initial greeting logic
  useEffect(() => {
    if (isVisible && messages.length === 0) {
       setMessages([
        {
          id: 'intro',
          role: 'model',
          text: 'Xin chào! Tôi là trợ lý AI Gemini. Tôi có thể giúp tóm tắt trang sách này, hoặc bạn có thể chuyển sang chế độ "Notebook" để phân tích link và tài liệu bên ngoài.',
          timestamp: Date.now()
        }
      ]);
    }
  }, [isVisible, messages.length]);

  // --- HANDLERS ---

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages
        .filter(m => m.id !== 'intro')
        .map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        }));

      let responseText = "";

      if (mode === 'reader') {
         responseText = await chatWithBook(history, userMsg.text, pageText);
      } else {
         // Notebook Mode
         if (sources.length === 0) {
            responseText = "Bạn chưa thêm nguồn dữ liệu nào (Link hoặc Text). Hãy thêm nguồn để tôi có thể phân tích.";
         } else {
            responseText = await analyzeNotebookSources(sources, userMsg.text, history);
         }
      }

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "Xin lỗi, đã có lỗi xảy ra khi kết nối với Gemini.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = async (action: 'summarize' | 'explain') => {
    if (isLoading) return;
    setIsLoading(true);
    
    let prompt = "";
    if (action === 'summarize') prompt = "Hãy tóm tắt ngắn gọn nội dung chính của trang sách này.";
    if (action === 'explain') prompt = "Giải thích các khái niệm chính hoặc từ khó trong đoạn văn này.";

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: prompt, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);

    try {
      const responseText = await analyzeText(pageText, prompt);
      const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: responseText, timestamp: Date.now() };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) { /* error */ } finally { setIsLoading(false); }
  };

  // Notebook Source Handlers
  const addSource = () => {
      if (!newSourceContent.trim()) return;
      const newSource: NotebookSource = {
          id: uuidv4(),
          type: newSourceType,
          content: newSourceContent.trim()
      };
      setSources([...sources, newSource]);
      setNewSourceContent('');
      setShowAddSource(false);
      
      // Auto trigger analysis intro if it's the first source
      if (sources.length === 0) {
          setMessages(prev => [...prev, {
              id: Date.now().toString(),
              role: 'model',
              text: `Đã thêm nguồn: "${newSourceType === 'url' ? 'Liên kết' : 'Văn bản'}". Bạn có thể thêm nguồn khác hoặc yêu cầu tôi tóm tắt ngay.`,
              timestamp: Date.now()
          }]);
      }
  };

  const removeSource = (id: string) => {
      setSources(sources.filter(s => s.id !== id));
  };

  if (!isVisible) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-[450px] bg-gray-900 border-l border-gray-700 shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out">
      
      {/* 1. Header with Tabs */}
      <div className="bg-gray-800 border-b border-gray-700">
          <div className="p-3 flex justify-between items-center">
            <div className="flex items-center gap-2 text-indigo-400">
                <Sparkles size={20} />
                <h2 className="font-bold text-lg">Gemini Assistant</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
                <X size={20} />
            </button>
          </div>

          <div className="flex px-2 pb-2 gap-2">
              <button 
                onClick={() => setMode('reader')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-colors ${mode === 'reader' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
              >
                  <BookOpen size={16} /> Trang Sách
              </button>
              <button 
                onClick={() => setMode('notebook')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-colors ${mode === 'notebook' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
              >
                  <Library size={16} /> Notebook
              </button>
          </div>
      </div>

      {/* 2. Notebook Source Manager (Only visible in Notebook mode) */}
      {mode === 'notebook' && (
          <div className="bg-gray-800/50 border-b border-gray-700 p-3">
              
              {/* List of Sources */}
              {sources.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3 max-h-32 overflow-y-auto custom-scrollbar">
                      {sources.map(source => (
                          <div key={source.id} className="flex items-center gap-2 bg-gray-700 px-2 py-1 rounded text-xs text-gray-200 border border-gray-600 max-w-full">
                              {source.type === 'url' ? <LinkIcon size={12} className="text-blue-400 shrink-0" /> : <FileText size={12} className="text-green-400 shrink-0" />}
                              <span className="truncate max-w-[150px]">{source.content}</span>
                              <button onClick={() => removeSource(source.id)} className="text-gray-400 hover:text-red-400 ml-1">
                                  <X size={12} />
                              </button>
                          </div>
                      ))}
                  </div>
              )}

              {/* Add Source Toggle/Form */}
              {!showAddSource ? (
                  <button 
                    onClick={() => setShowAddSource(true)}
                    className="w-full py-2 border border-dashed border-gray-600 rounded-lg text-sm text-gray-400 hover:text-white hover:border-gray-400 hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                  >
                      <Plus size={16} /> Thêm nguồn (Link/Text)
                  </button>
              ) : (
                  <div className="bg-gray-900 p-3 rounded-lg border border-gray-600 animate-slide-up">
                      <div className="flex gap-2 mb-2">
                          <button 
                             onClick={() => setNewSourceType('text')}
                             className={`flex-1 text-xs py-1 rounded ${newSourceType === 'text' ? 'bg-gray-700 text-white' : 'text-gray-500'}`}
                          >
                             Văn bản
                          </button>
                          <button 
                             onClick={() => setNewSourceType('url')}
                             className={`flex-1 text-xs py-1 rounded ${newSourceType === 'url' ? 'bg-gray-700 text-white' : 'text-gray-500'}`}
                          >
                             Đường dẫn (URL)
                          </button>
                      </div>
                      
                      {newSourceType === 'text' ? (
                          <textarea 
                              value={newSourceContent}
                              onChange={(e) => setNewSourceContent(e.target.value)}
                              placeholder="Dán nội dung văn bản vào đây..."
                              className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-xs text-white min-h-[80px] mb-2 focus:border-indigo-500 outline-none"
                          />
                      ) : (
                          <input 
                              type="text"
                              value={newSourceContent}
                              onChange={(e) => setNewSourceContent(e.target.value)}
                              placeholder="https://example.com/article"
                              className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-xs text-white mb-2 focus:border-indigo-500 outline-none"
                          />
                      )}

                      <div className="flex gap-2 justify-end">
                          <button onClick={() => setShowAddSource(false)} className="px-3 py-1 text-xs text-gray-400 hover:text-white">Hủy</button>
                          <button onClick={addSource} className="px-3 py-1 bg-indigo-600 text-xs text-white rounded hover:bg-indigo-500">Thêm</button>
                      </div>
                  </div>
              )}
          </div>
      )}

      {/* 3. Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none'
                  : 'bg-gray-700 text-gray-200 rounded-bl-none'
              }`}
            >
              <div className="whitespace-pre-wrap font-sans leading-relaxed">{msg.text}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 rounded-lg p-3 rounded-bl-none flex items-center gap-2 text-gray-400">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-xs">
                  {mode === 'notebook' && sources.some(s => s.type === 'url') 
                    ? "Đang đọc link & phân tích..." 
                    : "Gemini đang suy nghĩ..."}
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 4. Quick Actions (Only Reader Mode) */}
      {mode === 'reader' && pageText.length > 50 && (
        <div className="px-4 py-2 bg-gray-800/50 flex gap-2 overflow-x-auto border-t border-gray-800">
          <button
            onClick={() => handleQuickAction('summarize')}
            disabled={isLoading}
            className="text-xs bg-indigo-900/50 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/50 px-3 py-1.5 rounded-full whitespace-nowrap transition-colors"
          >
            Tóm tắt trang này
          </button>
          <button
            onClick={() => handleQuickAction('explain')}
            disabled={isLoading}
            className="text-xs bg-purple-900/50 hover:bg-purple-900 text-purple-300 border border-purple-700/50 px-3 py-1.5 rounded-full whitespace-nowrap transition-colors"
          >
            Giải thích ý chính
          </button>
        </div>
      )}

      {/* 5. Input Area */}
      <div className="p-4 bg-gray-800 border-t border-gray-700">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={mode === 'notebook' ? "Hỏi về các nguồn đã thêm..." : "Hỏi về nội dung trang sách..."}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg pl-3 pr-10 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none h-12"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-2 p-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-md text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
