 import { useState, useRef, useEffect } from "react";
 import { motion, AnimatePresence } from "framer-motion";
 import { MessageCircle, X, Send, Wine, Loader2, Sparkles, Bot } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import ReactMarkdown from "react-markdown";
 import { toast } from "@/hooks/use-toast";
 
 type Message = {
   role: "user" | "assistant";
   content: string;
 };
 
 const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sommelier-chat`;
 
 const QUICK_SUGGESTIONS = [
   "Quel vin pour un dîner romantique ?",
   "Accord mets-vin avec du poulet DG",
   "Champagne pour une célébration",
   "Whisky pour offrir en cadeau",
 ];
 
 export function SommelierChat() {
   const [isOpen, setIsOpen] = useState(false);
   const [messages, setMessages] = useState<Message[]>([]);
   const [input, setInput] = useState("");
   const [isLoading, setIsLoading] = useState(false);
   const scrollRef = useRef<HTMLDivElement>(null);
   const inputRef = useRef<HTMLInputElement>(null);
 
   useEffect(() => {
     if (scrollRef.current) {
       scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
     }
   }, [messages]);
 
   useEffect(() => {
     if (isOpen && inputRef.current) {
       inputRef.current.focus();
     }
   }, [isOpen]);
 
   const streamChat = async (userMessages: Message[]) => {
     const response = await fetch(CHAT_URL, {
       method: "POST",
       headers: {
         "Content-Type": "application/json",
         Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
       },
       body: JSON.stringify({ messages: userMessages }),
     });
 
     if (!response.ok) {
       const errorData = await response.json().catch(() => ({}));
       throw new Error(errorData.error || "Erreur de connexion");
     }
 
     if (!response.body) throw new Error("No response body");
 
     const reader = response.body.getReader();
     const decoder = new TextDecoder();
     let textBuffer = "";
     let assistantContent = "";
 
     while (true) {
       const { done, value } = await reader.read();
       if (done) break;
 
       textBuffer += decoder.decode(value, { stream: true });
 
       let newlineIndex: number;
       while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
         let line = textBuffer.slice(0, newlineIndex);
         textBuffer = textBuffer.slice(newlineIndex + 1);
 
         if (line.endsWith("\r")) line = line.slice(0, -1);
         if (line.startsWith(":") || line.trim() === "") continue;
         if (!line.startsWith("data: ")) continue;
 
         const jsonStr = line.slice(6).trim();
         if (jsonStr === "[DONE]") break;
 
         try {
           const parsed = JSON.parse(jsonStr);
           const content = parsed.choices?.[0]?.delta?.content as string | undefined;
           if (content) {
             assistantContent += content;
             setMessages((prev) => {
               const last = prev[prev.length - 1];
               if (last?.role === "assistant") {
                 return prev.map((m, i) =>
                   i === prev.length - 1 ? { ...m, content: assistantContent } : m
                 );
               }
               return [...prev, { role: "assistant", content: assistantContent }];
             });
           }
         } catch {
           textBuffer = line + "\n" + textBuffer;
           break;
         }
       }
     }
   };
 
   const handleSend = async (text?: string) => {
     const messageText = text || input.trim();
     if (!messageText || isLoading) return;
 
     const userMessage: Message = { role: "user", content: messageText };
     setMessages((prev) => [...prev, userMessage]);
     setInput("");
     setIsLoading(true);
 
     try {
       await streamChat([...messages, userMessage]);
     } catch (error) {
       toast({
         title: "Erreur",
         description: error instanceof Error ? error.message : "Une erreur est survenue",
         variant: "destructive",
       });
     } finally {
       setIsLoading(false);
     }
   };
 
   const handleKeyDown = (e: React.KeyboardEvent) => {
     if (e.key === "Enter" && !e.shiftKey) {
       e.preventDefault();
       handleSend();
     }
   };
 
   return (
     <>
       {/* Floating Button */}
       <AnimatePresence>
         {!isOpen && (
           <motion.button
             initial={{ scale: 0, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             exit={{ scale: 0, opacity: 0 }}
             whileHover={{ scale: 1.1 }}
             whileTap={{ scale: 0.95 }}
             onClick={() => setIsOpen(true)}
             className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-gradient-gold shadow-gold flex items-center justify-center group"
           >
             <Wine className="h-7 w-7 text-noir" />
             <motion.div
               animate={{ scale: [1, 1.2, 1] }}
               transition={{ repeat: Infinity, duration: 2 }}
               className="absolute -top-1 -right-1 w-4 h-4 bg-secondary rounded-full flex items-center justify-center"
             >
               <Sparkles className="h-2.5 w-2.5 text-cream" />
             </motion.div>
           </motion.button>
         )}
       </AnimatePresence>
 
       {/* Chat Window */}
       <AnimatePresence>
         {isOpen && (
           <motion.div
             initial={{ opacity: 0, y: 20, scale: 0.95 }}
             animate={{ opacity: 1, y: 0, scale: 1 }}
             exit={{ opacity: 0, y: 20, scale: 0.95 }}
             transition={{ type: "spring", damping: 25, stiffness: 300 }}
             className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-3rem)] bg-noir border border-gold/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
           >
             {/* Header */}
             <div className="bg-gradient-gold p-4 flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-noir/20 flex items-center justify-center">
                   <Wine className="h-5 w-5 text-noir" />
                 </div>
                 <div>
                   <h3 className="font-display font-semibold text-noir">Le Sommelier</h3>
                   <p className="text-xs text-noir/70">Votre expert vins & spiritueux</p>
                 </div>
               </div>
               <Button
                 variant="ghost"
                 size="icon"
                 onClick={() => setIsOpen(false)}
                 className="text-noir hover:bg-noir/10 rounded-full"
               >
                 <X className="h-5 w-5" />
               </Button>
             </div>
 
             {/* Messages */}
             <ScrollArea ref={scrollRef} className="flex-1 p-4">
               {messages.length === 0 ? (
                 <div className="space-y-4">
                   <div className="text-center py-6">
                     <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                       <Bot className="h-8 w-8 text-primary" />
                     </div>
                     <h4 className="font-display text-lg text-cream mb-2">
                       Bienvenue ! 🍷
                     </h4>
                     <p className="text-cream/60 text-sm">
                       Je suis votre sommelier personnel. Comment puis-je vous aider à trouver la bouteille parfaite ?
                     </p>
                   </div>
                   <div className="space-y-2">
                     <p className="text-xs text-cream/40 uppercase tracking-wide">Suggestions</p>
                     {QUICK_SUGGESTIONS.map((suggestion, i) => (
                       <button
                         key={i}
                         onClick={() => handleSend(suggestion)}
                         className="w-full text-left p-3 rounded-lg bg-cream/5 hover:bg-cream/10 border border-cream/10 text-cream/80 text-sm transition-colors"
                       >
                         {suggestion}
                       </button>
                     ))}
                   </div>
                 </div>
               ) : (
                 <div className="space-y-4">
                   {messages.map((message, i) => (
                     <motion.div
                       key={i}
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                     >
                       <div
                         className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                           message.role === "user"
                             ? "bg-primary text-noir rounded-br-sm"
                             : "bg-cream/10 text-cream rounded-bl-sm"
                         }`}
                       >
                         {message.role === "assistant" ? (
                           <div className="prose prose-sm prose-invert max-w-none">
                             <ReactMarkdown>{message.content}</ReactMarkdown>
                           </div>
                         ) : (
                           <p className="text-sm">{message.content}</p>
                         )}
                       </div>
                     </motion.div>
                   ))}
                   {isLoading && messages[messages.length - 1]?.role === "user" && (
                     <motion.div
                       initial={{ opacity: 0 }}
                       animate={{ opacity: 1 }}
                       className="flex justify-start"
                     >
                       <div className="bg-cream/10 rounded-2xl rounded-bl-sm px-4 py-3">
                         <Loader2 className="h-5 w-5 animate-spin text-primary" />
                       </div>
                     </motion.div>
                   )}
                 </div>
               )}
             </ScrollArea>
 
             {/* Input */}
             <div className="p-4 border-t border-gold/20">
               <div className="flex gap-2">
                 <Input
                   ref={inputRef}
                   value={input}
                   onChange={(e) => setInput(e.target.value)}
                   onKeyDown={handleKeyDown}
                   placeholder="Posez votre question..."
                   disabled={isLoading}
                   className="flex-1 bg-cream/10 border-gold/30 text-cream placeholder:text-cream/40 focus:border-primary"
                 />
                 <Button
                   onClick={() => handleSend()}
                   disabled={!input.trim() || isLoading}
                   className="bg-gradient-gold text-noir hover:opacity-90"
                 >
                   <Send className="h-4 w-4" />
                 </Button>
               </div>
             </div>
           </motion.div>
         )}
       </AnimatePresence>
     </>
   );
 }