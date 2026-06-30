import { useEffect, useState } from "react";
import { Loader2, Copy, Check, Code2, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateDrakonCode, type CodegenResponse } from "@/lib/codegen/codegenApi";

const LANGUAGES = [
  { value: "JS2604", label: "JavaScript" },
  { value: "Lua2604", label: "Lua" },
  { value: "Clj2604", label: "Clojure" },
];

function loadScriptOnce(src: string): Promise<void> {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

export function CodegenPage() {
  const [description, setDescription] = useState("");
  const [functionName, setFunctionName] = useState("myFunction");
  const [params, setParams] = useState("");
  const [language, setLanguage] = useState("JS2604");

  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [result, setResult] = useState<CodegenResponse | null>(null);
  const [pseudocode, setPseudocode] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState<"json" | "code" | null>(null);
  const [genReady, setGenReady] = useState(false);

  // Load the drakon code-generation bundles from /public.
  useEffect(() => {
    Promise.all([
      loadScriptOnce("/drakongen.js"),
      loadScriptOnce("/drakontechgen.js"),
    ]).then(() => setGenReady(true));
  }, []);

  async function handleGenerate() {
    setLoading(true);
    setError("");
    setResult(null);
    setPseudocode("");
    try {
      const res = await generateDrakonCode({
        description,
        language,
        functionName,
        params,
      });
      setResult(res);

      // Best-effort client-side pseudocode preview from the .drakon JSON.
      // Exact compiled code requires importing the .drakon into DrakonTech Desktop.
      try {
        if (window.drakongen?.toPseudocode) {
          const text = window.drakongen.toPseudocode(
            JSON.stringify(res.drakon_json),
            functionName,
            `${functionName}.drakon`,
            language
          );
          setPseudocode(text || "");
        }
      } catch {
        // Pseudocode preview is optional; ignore failures.
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function copyText(text: string, which: "json" | "code") {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  const toggleListen = () => {
    if (listening) {
      setListening(false);
      return;
    }
    
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Ваш браузер не підтримує Web Speech API");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = "uk-UA";
    recognition.interimResults = true;
    
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join("");
      
      setDescription(transcript);
    };
    
    recognition.start();
  };

  const jsonString = result ? JSON.stringify(result.drakon_json, null, 2) : "";

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Code2 className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Генерація коду DRAKON</h1>
          <p className="text-sm text-muted-foreground">
            Опишіть функцію природною мовою — LLM згенерує .drakon JSON.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Опис функції</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fn-name">Назва функції</Label>
              <Input
                id="fn-name"
                value={functionName}
                onChange={(e) => setFunctionName(e.target.value)}
                placeholder="myFunction"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fn-lang">Мова</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger id="fn-lang">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fn-params">Параметри (через кому)</Label>
            <Input
              id="fn-params"
              value={params}
              onChange={(e) => setParams(e.target.value)}
              placeholder="a, b"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="fn-desc">Опис</Label>
              <button
                type="button"
                onClick={toggleListen}
                className={cn(
                  "flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md transition-colors",
                  listening ? "bg-rose-500/20 text-rose-500 animate-pulse" : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
                )}
              >
                <Mic className="h-3.5 w-3.5" />
                {listening ? "Слухаю..." : "Диктувати"}
              </button>
            </div>
            <Textarea
              id="fn-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Обчислити суму двох чисел і повернути результат..."
              rows={5}
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading || !description.trim()}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Генерую...
              </>
            ) : (
              "Згенерувати код"
            )}
          </Button>

          {!genReady && (
            <p className="text-xs text-muted-foreground">
              Завантаження генератора DRAKON...
            </p>
          )}
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {result && (
        <>
          {pseudocode && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Псевдокод</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyText(pseudocode, "code")}
                >
                  {copied === "code" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </CardHeader>
              <CardContent>
                <pre className="overflow-x-auto rounded-md bg-muted p-4 text-sm">
                  <code>{pseudocode}</code>
                </pre>
                <p className="mt-2 text-xs text-muted-foreground">
                  Точний код вибраною мовою генерується після імпорту .drakon у
                  DrakonTech Desktop.
                </p>
              </CardContent>
            </Card>
          )}

          <Accordion type="single" collapsible defaultValue="json">
            <AccordionItem value="json">
              <AccordionTrigger>.drakon JSON</AccordionTrigger>
              <AccordionContent>
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyText(jsonString, "json")}
                  >
                    {copied === "json" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs">
                  <code>{jsonString}</code>
                </pre>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </>
      )}
    </div>
  );
}

export default CodegenPage;
