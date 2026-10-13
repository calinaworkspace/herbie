import { useEffect, useRef, useState } from "react";
import { X, SendHorizonal } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { HerbieJrMascot } from "@/components/Logo";

interface ChatMsg { role: "user" | "assistant"; content: string }

const QUICK_CHIPS = [
  "How's my wallet doing?",
  "How do I rank up faster?",
  "What's my rank and fee?",
  "What should I do first?",
];

export function HerbieJrFloating({ userName }: { userName: string }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<ChatMsg[]>([
    { role: "assistant", content: `Hey ${userName}! I'm Herbie Jr. 🤖 Ask me anything — your wallet, your rank, what to do next — or tap a suggestion below.` },
  ]);
  const chat = trpc.jr.chat.useMutation({
    onSuccess: (data) => setHistory((h) => [...h, { role: "assistant", content: data.reply }]),
    onError: () => setHistory((h) => [...h, { role: "assistant", content: "Oops, something glitched on my side. Try again in a moment! 🔧" }]),
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [history, chat.isPending, open]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t || chat.isPending) return;
    setHistory((h) => [...h, { role: "user", content: t }]);
    setInput("");
    chat.mutate({ text: t, history: history.slice(-10) });
  };

  return (
    <>
      {/* Floating button */}
      <button type="button" onClick={() => setOpen((o) => !o)} title="Chat with Herbie Jr."
        className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-white shadow-xl border-2 border-teal/50 flex items-center justify-center hover:scale-110 transition-transform">
        <HerbieJrMascot size={40} />
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-herbiegreen border-2 border-white" />
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-40 w-[380px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden" style={{ height: 520 }}>
          <div className="bg-gradient-to-r from-teal to-herbiegreen px-4 py-3 flex items-center gap-3">
            <div className="bg-white rounded-full p-1"><HerbieJrMascot size={32} /></div>
            <div className="flex-1">
              <div className="font-bold text-white text-sm">Herbie Jr.</div>
              <div className="text-[11px] text-white/80">AI companion · always here to help</div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="text-white/80 hover:text-white"><X className="w-4 h-4" /></button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {history.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user" ? "bg-navy text-white rounded-br-md" : "bg-white border border-slate-100 text-slate-700 rounded-bl-md shadow-sm"
                }`}>{m.content}</div>
              </div>
            ))}
            {chat.isPending && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                  <span className="inline-flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-teal animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-teal animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-teal animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              </div>
            )}
          </div>

          {history.length <= 2 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5 bg-slate-50">
              {QUICK_CHIPS.map((c) => (
                <button key={c} type="button" onClick={() => send(c)}
                  className="text-[11px] font-medium px-2.5 py-1.5 rounded-full bg-white border border-teal/40 text-teal-dark hover:bg-teal-light transition-colors">
                  {c}
                </button>
              ))}
            </div>
          )}

          <div className="p-3 border-t border-slate-100 flex gap-2 bg-white">
            <input value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(input); }}
              placeholder="Ask Herbie Jr. anything…"
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal/50" />
            <button type="button" onClick={() => send(input)} disabled={!input.trim() || chat.isPending}
              className="w-10 h-10 rounded-xl bg-herbiegreen text-white flex items-center justify-center hover:bg-herbiegreen-dark disabled:opacity-40 transition-colors">
              <SendHorizonal className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
