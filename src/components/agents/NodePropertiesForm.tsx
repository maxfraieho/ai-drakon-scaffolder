import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

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

  useEffect(() => {
    setType(node.type || "action");
    setContent(node.content || "");
    setSecondary(node.secondary || "");
  }, [nodeId, node]);

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
        <Label htmlFor="node-content" className="text-[10px] font-mono uppercase text-muted-foreground">
          Функція / Вміст (Content)
        </Label>
        <Input
          id="node-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Назва функції чи роутера"
          className="h-8 text-xs font-mono"
        />
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
