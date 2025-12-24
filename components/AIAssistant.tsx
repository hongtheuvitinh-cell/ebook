
import React, { useState, useRef, useEffect } from 'react';
import { analyzeText, chatWithBook, analyzeNotebookSources, NotebookSource } from '../services/geminiService';
import { Sparkles, Send, X, Loader2, BookOpen, FileText, Link as LinkIcon, Plus, Trash2, Library, Key, AlertTriangle } from 'lucide-react';
import { ChatMessage } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface AIAssistantProps {
  isVisible: boolean;
  onClose: () => void;
  pageText: string;
}

type AssistantMode = 'reader' | 'notebook';

const AIAssistant: React.FC<AIAssistantProps> = ({ isVisible, onClose, pageText }) => {
  const [mode, setMode] = useState<AssistantMode>('reader');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [sources, setSources] = useState<NotebookSource[]>([]);
  const [newSourceContent, setNewSourceContent] = useState('');
  const [newSourceType, setNewSourceType] = useState<'text' | 'url'>('text');
  const [showAddSource, setShowAddSource] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, mode]);

  useEffect(() => {
    if (isVisible && messages.length === 0) {
       setMessages([
        {
          id: 'intro',
          role: 'model',
          text: 'Xin chào! Tôi là trợ lý AI Gemini. Tôi có thể giúp tóm tắt trang sách hoặc phân tích tài liệu bên ngoài. Hãy đặt câu hỏi cho tôi!',
          timestamp: Date.now()
        }
      ]);
    }
  }, [isVisible, messages.length]);

  const handleOpenKeySelector = async () => {
      if (window.aistudio) {
          await window.aistudio.openSelectKey();
          setApiError(false);
          // Gửi lại tin nhắn cuối nếu có thể, hoặc yêu cầu người dùng thử lại
          setMessages(prev => [...prev, {
              id: Date.now().toString(),
              role: 'model',
              text: "Đã cập nhật API Key. Bạn hãy thử gửi lại câu hỏi nhé!",
              timestamp: Date.now()
          }]);
      }
  };

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
    setApiError(false);

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
         if (sources.length === 0) {
            responseText = "Hãy thêm nguồn dữ liệu (Link hoặc Text) để tôi có thể phân tích cho bạn.";
         } else {
            responseText = await analyzeNotebookSources(sources, userMsg.text, history);
         }
      }

      // Check if response indicates API Key error
      if (responseText.includes("Vui lòng chọn API Key") || responseText.includes("Lỗi API")) {
          setApiError(true);
      }

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      console.error("AI Assistant Error:", err);
      setApiError(true);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "Xin lỗi, xảy ra lỗi kết nối Gemini. Có thể do API Key chưa được chọn hoặc hết hạn.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = async (action: 'summarize' | 'explain') => {
    if (isLoading) return;
    setIsLoading(true);
    setApiError(false);
    let prompt = action === 'summarize' ? "Tóm tắt ngắn gọn nội dung trang này." : "Giải thích ý chính của đoạn văn này.";
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: prompt, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    try {
      const responseText = await analyzeText(pageText, prompt);
      if (responseText.includes("API Key")) setApiError(true);
      const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: responseText, timestamp: Date.now() };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
        setApiError(true);
    } finally { setIsLoading(false); }
  };

  const addSource = () => {
      if (!newSourceContent.trim()) return;
      const newSource: NotebookSource = { id: uuidv4(), type: newSourceType, content: newSourceContent.trim() };
      setSources([...sources, newSource]);
      setNewSourceContent('');
      setShowAddSource(false);
      if (sources.length === 0) {
          setMessages(prev => [...prev, {
              id: Date.now().toString(),
              role: 'model',
              text: `Đã thêm nguồn: ${newSourceType === 'url' ? 'Liên kết' : 'Văn bản'}. Tôi đã sẵn sàng phân tích.`,
              timestamp: Date.now()
          }]);
      }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-[400px] bg-slate-900 border-l border-white/5 shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out">
      <div className="bg-slate-800/80 backdrop-blur-xl border-b border-white/5">
          <div className="p-4 flex justify-between items-center">
            <div className="flex items-center gap-2 text-indigo-400">
                <Sparkles size={16} />
                <h2 className="font-black text-[11px] uppercase tracking-widest">Gemini Assistant</h2>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
          </div>
          <div className="flex px-3 pb-3 gap-1.5">
              <button onClick={() => setMode('reader')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${mode === 'reader' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'}`}><BookOpen size={12} /> Trang Sách</button>
              <button onClick={() => setMode('notebook')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${mode === 'notebook' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'}`}><Library size={12} /> Notebook</button>
          </div>
      </div>

      {mode === 'notebook' && (
          <div className="bg-slate-800/30 border-b border-white/5 p-3">
              {sources.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2 max-h-24 overflow-y-auto custom-scrollbar">
                      {sources.map(source => (
                          <div key={source.id} className="flex items-center gap-1.5 bg-slate-800 px-2 py-1 rounded-md text-[9px] text-slate-300 border border-white/5 max-w-full">
                              {source.type === 'url' ? <LinkIcon size={10} className="text-indigo-400" /> : <FileText size={10} className="text-emerald-400" />}
                              <span className="truncate max-w-[120px] font-medium">{source.content}</span>
                              <button onClick={() => setSources(sources.filter(s => s.id !== source.id))} className="text-slate-500 hover:text-red-400"><X size={10} /></button>
                          </div>
                      ))}
                  </div>
              )}
              {!showAddSource ? (
                  <button onClick={() => setShowAddSource(true)} className="w-full py-2 border border-dashed border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all flex items-center justify-center gap-2"><Plus size={12} /> Thêm nguồn dữ liệu</button>
              ) : (
                  <div className="bg-slate-950 p-3 rounded-xl border border-white/10 animate-slide-up">
                      <div className="flex gap-2 mb-2">
                          <button onClick={() => setNewSourceType('text')} className={`flex-1 text-[9px] font-black uppercase py-1.5 rounded-md ${newSourceType === 'text' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>Văn bản</button>
                          <button onClick={() => setNewSourceType('url')} className={`flex-1 text-[9px] font-black uppercase py-1.5 rounded-md ${newSourceType === 'url' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>Link URL</button>
                      </div>
                      {newSourceType === 'text' ? (
                          <textarea value={newSourceContent} onChange={(e) => setNewSourceContent(e.target.value)} placeholder="Nội dung văn bản..." className="w-full bg-slate-900 border border-white/5 rounded-lg p-2.5 text-[13px] text-white min-h-[70px] mb-2 focus:border-indigo-500 outline-none" />
                      ) : (
                          <input type="text" value={newSourceContent} onChange={(e) => setNewSourceContent(e.target.value)} placeholder="https://..." className="w-full bg-slate-900 border border-white/5 rounded-lg p-2.5 text-[13px] text-white mb-2 focus:border-indigo-500 outline-none" />
                      )}
                      <div className="flex gap-2 justify-end">
                          <button onClick={() => setShowAddSource(false)} className="text-[9px] font-bold text-slate-500 uppercase px-2 py-1">Hủy</button>
                          <button onClick={addSource} className="bg-indigo-600 text-[9px] font-black uppercase text-white px-3 py-1 rounded-md">Xác nhận</button>
                      </div>
                  </div>
              )}
          </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-slate-900/50 custom-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] rounded-2xl p-3.5 text-[14px] leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 rounded-bl-none border border-white/5'}`}>
              <div className="whitespace-pre-wrap">{msg.text}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 rounded-2xl p-3.5 rounded-bl-none flex items-center gap-3 text-slate-400 border border-white/5 shadow-sm">
              <Loader2 size={14} className="animate-spin text-indigo-400" />
              <span className="text-[11px] font-medium italic opacity-70">Gemini đang phản hồi...</span>
            </div>
          </div>
        )}
        {apiError && (
            <div className="bg-rose-950/30 border border-rose-500/20 p-4 rounded-2xl flex flex-col items-center text-center gap-3 animate-slide-up">
                <AlertTriangle size={24} className="text-rose-400" />
                <p className="text-[12px] text-rose-200 font-medium">Lỗi kết nối hoặc thiếu API Key (Paid).</p>
                <button 
                    onClick={handleOpenKeySelector}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                >
                    <Key size={14} /> Chọn API Key Ngay
                </button>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {mode === 'reader' && pageText.length > 50 && (
        <div className="px-4 py-2 bg-slate-800/40 flex gap-2 overflow-x-auto border-t border-white/5">
          <button onClick={() => handleQuickAction('summarize')} disabled={isLoading} className="text-[9px] font-black uppercase tracking-widest bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 px-3 py-1.5 rounded-full whitespace-nowrap transition-all">Tóm tắt</button>
          <button onClick={() => handleQuickAction('explain')} disabled={isLoading} className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-full whitespace-nowrap transition-all">Giải thích</button>
        </div>
      )}

      <div className="p-4 bg-slate-800 border-t border-white/5 shadow-2xl">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={mode === 'notebook' ? "Đặt câu hỏi về các nguồn..." : "Hỏi về trang sách này..."}
            className="w-full bg-slate-900 border border-white/10 rounded-xl pl-4 pr-11 py-3.5 text-[14px] text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none h-14"
          />
          <button onClick={handleSend} disabled={isLoading || !input.trim()} className="absolute right-2 top-2 p-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white disabled:opacity-30 disabled:grayscale transition-all shadow-lg shadow-indigo-600/20"><Send size={16} /></button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
