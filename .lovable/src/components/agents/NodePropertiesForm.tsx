import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { fetchAvailableTools, type ToolDefinition } from "@/lib/agent-studio-data";

interface NodePropertiesFormProps {
  nodeId: string;
  node: {
    type: string;
    content?: string;
    secondary?: string;
    branchId?: number;
    one?: string;
    two?: string;
    side?: string;
    style?: string;
  };
  onUpdateNode: (id: string, updated: any) => void;
}

export function NodePropertiesForm({
  nodeId,
  node,
  onUpdateNode,
}: NodePropertiesFormProps) {
  const [type, setType] = useState(node.type || "action");
  const [content, setContent] = useState(node.content || "");
  const [secondary, setSecondary] = useState(node.secondary || "");
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [isLoadingTools, setIsLoadingTools] = useState(false);
  const [isCustomContent, setIsCustomContent] = useState(false);

  useEffect(() => {
    setType(node.type || "action");
    setContent(node.content || "");
    setSecondary(node.secondary || "");
  }, [nodeId, node]);

  useEffect(() => {
    setIsLoadingTools(true);
    fetchAvailableTools()
      .then((data) => {
        setTools(data);
        // If content is not in list of tools, default to custom content
        if (data.length > 0 && node.content) {
          const exists = data.some((t) => t.name === node.content);
          setIsCustomContent(!exists);
        }
      })
      .catch((err) => {
        console.error("Failed to load tools:", err);
      })
      .finally(() => {
        setIsLoadingTools(false);
      });
  }, [nodeId, node.content]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateNode(nodeId, {
      ...node,
      type,
      content,
      secondary: secondary || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="node-id" className="text-[10px] font-mono uppercase text-muted-foreground">
          ID Вузла
        </Label>
        <Input id="node-id" value={nodeId} disabled className="h-8 font-mono text-xs" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="node-type" className="text-[10px] font-mono uppercase text-muted-foreground">
          Тип Вузла
        </Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger id="node-type" className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="action">Дія (Action)</SelectItem>
            <SelectItem value="question">Умова (Question / Router)</SelectItem>
            <SelectItem value="end">Кінець (End)</SelectItem>
            <SelectItem value="branch">Галузь (Branch)</SelectItem>
            <SelectItem value="insertion">Вставка (Insertion)</SelectItem>
            <SelectItem value="input">Введення (Input)</SelectItem>
            <SelectItem value="output">Виведення (Output)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <Label htmlFor="node-content" className="text-[10px] font-mono uppercase text-muted-foreground">
            Функція / Вміст (Content)
          </Label>
          {(type === "action" || type === "question") && (
            <button
              type="button"
              onClick={() => setIsCustomContent(!isCustomContent)}
              className="text-[10px] text-amber-500 hover:underline"
            >
              {isCustomContent ? "Обрати зі списку" : "Ввести вручну"}
            </button>
          )}
        </div>
        {isLoadingTools ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground h-8">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Завантаження інструментів...</span>
          </div>
        ) : (type === "action" || type === "question") && !isCustomContent && tools.length > 0 ? (
          <Select
            value={tools.some((t) => t.name === content) ? content : ""}
            onValueChange={(val) => {
              if (val === "__custom__") {
                setIsCustomContent(true);
                setContent("");
              } else {
                setContent(val);
                const selectedTool = tools.find((t) => t.name === val);
                if (selectedTool && !secondary) {
                  setSecondary(selectedTool.description);
                }
              }
            }}
          >
            <SelectTrigger id="node-content" className="h-8 text-xs font-mono">
              <SelectValue placeholder="Оберіть дію або інструмент" />
            </SelectTrigger>
            <SelectContent>
              {tools.map((t) => (
                <SelectItem key={t.name} value={t.name} className="font-mono text-xs">
                  {t.name}
                </SelectItem>
              ))}
              <SelectItem value="__custom__" className="text-xs italic text-amber-500">
                -- Власна дія --
              </SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Input
            id="node-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Назва функції чи роутера"
            className="h-8 text-xs font-mono"
          />
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="node-secondary" className="text-[10px] font-mono uppercase text-muted-foreground">
          Промпт / Опис (Secondary)
        </Label>
        <Textarea
          id="node-secondary"
          value={secondary}
          onChange={(e) => setSecondary(e.target.value)}
          placeholder="Шаблон промпту або інструкції вузла..."
          rows={6}
          className="text-xs font-mono resize-y"
        />
      </div>

      <Button
        type="submit"
        size="sm"
        className="w-full text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        Оновити властивості
      </Button>
    </form>
  );
}
