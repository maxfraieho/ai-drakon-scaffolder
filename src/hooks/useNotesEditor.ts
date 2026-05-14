import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { commitNote, fetchNote } from "@/lib/garden/notesApi";

interface UseNotesEditorOptions {
  slug?: string;
  folder?: string;
}

const DRAFT_PREFIX = "garden_draft_";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0400-\u04ff\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export function useNotesEditor({ slug, folder }: UseNotesEditorOptions) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [sha, setSha] = useState<string | undefined>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const loadedSlugRef = useRef<string | undefined>(undefined);

  const draftKey = slug ? `${DRAFT_PREFIX}${slug}` : `${DRAFT_PREFIX}__new__`;

  // Load note on slug change
  useEffect(() => {
    if (loadedSlugRef.current === slug) return;
    loadedSlugRef.current = slug;
    if (!slug) {
      setTitle("");
      setContent("");
      setTags([]);
      setSha(undefined);
      setIsDirty(false);
      const draft = typeof window !== "undefined" ? localStorage.getItem(draftKey) : null;
      setHasDraft(!!draft);
      return;
    }
    void (async () => {
      try {
        const note = await fetchNote(slug);
        if (note) {
          setTitle(note.title);
          setContent(note.content);
          setTags(note.tags);
          setSha(note.sha);
        } else {
          setTitle(slug);
          setContent("");
          setTags([]);
          setSha(undefined);
        }
        setIsDirty(false);
        const draft = typeof window !== "undefined" ? localStorage.getItem(draftKey) : null;
        setHasDraft(!!draft);
      } catch (e) {
        console.error("load note", e);
        toast.error(e instanceof Error ? e.message : "Не вдалося завантажити нотатку");
      }
    })();
  }, [slug, draftKey]);

  // Autosave draft
  useEffect(() => {
    if (!isDirty) return;
    if (typeof window === "undefined") return;
    const t = setTimeout(() => {
      localStorage.setItem(
        draftKey,
        JSON.stringify({ title, content, tags, savedAt: Date.now() }),
      );
      setHasDraft(true);
    }, 800);
    return () => clearTimeout(t);
  }, [title, content, tags, isDirty, draftKey]);

  const wrappedSetTitle = useCallback((v: string) => {
    setTitle(v);
    setIsDirty(true);
  }, []);
  const wrappedSetContent = useCallback((v: string) => {
    setContent(v);
    setIsDirty(true);
  }, []);
  const wrappedSetTags = useCallback((v: string[]) => {
    setTags(v);
    setIsDirty(true);
  }, []);

  const insertAtCursor = useCallback(
    (text: string, opts?: { selectInside?: boolean }) => {
      const ta = textareaRef.current;
      if (!ta) {
        wrappedSetContent(content + text);
        return;
      }
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const next = content.slice(0, start) + text + content.slice(end);
      wrappedSetContent(next);
      requestAnimationFrame(() => {
        if (!textareaRef.current) return;
        const pos = opts?.selectInside ? start + text.length - 2 : start + text.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(pos, pos);
      });
    },
    [content, wrappedSetContent],
  );

  const save = useCallback(async (): Promise<string | null> => {
    if (!title.trim()) {
      toast.error("Вкажіть заголовок нотатки");
      return null;
    }
    setIsSaving(true);
    try {
      const finalSlug = slug || slugify(title) || `note-${Date.now()}`;
      const res = await commitNote({
        slug: finalSlug,
        title: title.trim(),
        content,
        tags,
        sha,
      });
      if (res.sha) setSha(res.sha);
      setIsDirty(false);
      if (typeof window !== "undefined") {
        localStorage.removeItem(draftKey);
        if (finalSlug !== slug) {
          localStorage.removeItem(`${DRAFT_PREFIX}__new__`);
        }
      }
      setHasDraft(false);
      toast.success("Нотатку збережено");
      return finalSlug;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не вдалося зберегти");
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [title, content, tags, slug, sha, draftKey]);

  const restoreDraft = useCallback(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(draftKey);
    if (!raw) return;
    try {
      const d = JSON.parse(raw);
      setTitle(d.title ?? "");
      setContent(d.content ?? "");
      setTags(d.tags ?? []);
      setIsDirty(true);
      toast.success("Чернетку відновлено");
    } catch {
      /* ignore */
    }
  }, [draftKey]);

  const discardDraft = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(draftKey);
    setHasDraft(false);
    toast.success("Чернетку видалено");
  }, [draftKey]);

  return {
    title,
    content,
    tags,
    isDirty,
    isSaving,
    hasDraft,
    setTitle: wrappedSetTitle,
    setContent: wrappedSetContent,
    setTags: wrappedSetTags,
    save,
    restoreDraft,
    discardDraft,
    insertAtCursor,
    textareaRef,
  };
}
