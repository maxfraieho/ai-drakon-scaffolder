import { Bold, Italic, Heading1, Code, List, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EditorToolbarProps {
  onWrap: (left: string, right?: string, placeholder?: string) => void;
  onInsert: (text: string, opts?: { selectInside?: boolean }) => void;
}

export function EditorToolbar({ onWrap, onInsert }: EditorToolbarProps) {
  const btn = "h-7 w-7 p-0";
  return (
    <div className="flex items-center gap-1 border-b border-border bg-muted/30 px-2 py-1">
      <Button size="icon" variant="ghost" className={btn} title="Жирний" onClick={() => onWrap("**", "**", "текст")}>
        <Bold className="h-3.5 w-3.5" />
      </Button>
      <Button size="icon" variant="ghost" className={btn} title="Курсив" onClick={() => onWrap("*", "*", "текст")}>
        <Italic className="h-3.5 w-3.5" />
      </Button>
      <Button size="icon" variant="ghost" className={btn} title="Заголовок" onClick={() => onInsert("\n# Заголовок\n")}>
        <Heading1 className="h-3.5 w-3.5" />
      </Button>
      <Button size="icon" variant="ghost" className={btn} title="Код" onClick={() => onWrap("`", "`", "code")}>
        <Code className="h-3.5 w-3.5" />
      </Button>
      <Button size="icon" variant="ghost" className={btn} title="Список" onClick={() => onInsert("\n- ")}>
        <List className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className={btn}
        title="Wiki-посилання"
        onClick={() => onInsert("[[]]", { selectInside: true })}
      >
        <Link2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
