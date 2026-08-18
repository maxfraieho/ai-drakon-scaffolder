// src/components/garden/DrakonEditor.tsx

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useTheme } from '@/components/theme-provider';
import { slugify } from '@/lib/utils';
import {
Loader2, AlertCircle, Save, Undo, Redo, Download, Home, Plus,
ZoomIn, ZoomOut, Copy, Scissors, Trash2, ClipboardPaste, MousePointer, Hand, FileText
} from 'lucide-react';

// Standard DRAKON icon images
import iconAction from '@/assets/drakon/action.png';
import iconQuestion from '@/assets/drakon/question.png';
import iconSelect from '@/assets/drakon/select.png';
import iconCase from '@/assets/drakon/case.png';
import iconForeach from '@/assets/drakon/foreach.png';
import iconBranch from '@/assets/drakon/branch.png';
import iconInsertion from '@/assets/drakon/insertion.png';
import iconComment from '@/assets/drakon/comment.png';
import iconSinput from '@/assets/drakon/sinput.png';
import iconSoutput from '@/assets/drakon/soutput.png';
import iconTimer from '@/assets/drakon/timer.png';
import iconPause from '@/assets/drakon/pause.png';
import iconDuration from '@/assets/drakon/duration.png';
import iconProcess from '@/assets/drakon/process.png';
import iconInput from '@/assets/drakon/input.png';
import iconOutput from '@/assets/drakon/output.png';
import iconSilhouette from '@/assets/drakon/silhouette.png';
import iconShelf from '@/assets/drakon/shelf.png';
import iconEnd from '@/assets/drakon/end.png';
import iconCtrlStart from '@/assets/drakon/ctrl-start.png';
import iconCtrlEnd from '@/assets/drakon/ctrl-end.png';
import iconPar from '@/assets/drakon/par.png';
import iconParblock from '@/assets/drakon/parblock.png';
import iconGroupDuration from '@/assets/drakon/group-duration.png';
import iconGroupDurationR from '@/assets/drakon/group-duration-r.png';
import iconLink from '@/assets/drakon/link.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from
'@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { loadDrakonWidget, createWidget } from '@/lib/drakon/adapter';
import { getGardenDrakonTheme } from '@/lib/drakon/themeAdapter';
import { api } from '@/lib/api';
import { useLocale } from '@/hooks/useLocale';
import { diagramToPseudocode, pseudocodeToMarkdown } from '@/lib/drakon/pseudocode';
import { createDrakonTranslate, getDrakonLabels } from '@/lib/drakon/i18n';
import { FormatInspector } from '@/components/drakon/FormatInspector';
import {
ProjectFolderSection,
readProjectFolderDefaults,
type ProjectFolderValue,
} from '@/components/drakon/ProjectFolderSection';
import {
listProjects,
parseOwnerRepo,
saveDiagramToGit,
saveDiagramToMinio,
} from '@/lib/mcp/projects';
import { getGithubConfig } from '@/lib/settings-storage';
import { toast } from 'sonner';
import type { DrakonDiagram, DrakonWidget as DrakonWidgetType, DrakonEditSender,
DrakonConfig, DrakonConfigTheme } from '@/types/drakonwidget';
import { convertDiagramToIrWithValidation } from '@/lib/htse/diagram-to-ir';
import type { ValidationIssue } from '@/lib/htse/ir-validator-core';
import { compareDiagrams, type DiagramDiff } from '@/lib/drakon/diff';
import { DiagramTimeline } from './DiagramTimeline';
import { saveDiagramVersion, getDiagramVersions, type DiagramVersion } from '@/lib/drakon/history';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useAuth } from '@/context/AuthContext';



interface DrakonEditorProps {
diagram?: DrakonDiagram;
diagramId: string;
folderSlug?: string;
isNew?: boolean;
onSaved?: (diagramId: string) => void;
onSaveOverride?: (diagram: DrakonDiagram) => Promise<boolean>;
onSelectionChanged?: (items: any[] | null) => void;
className?: string;
diff?: DiagramDiff;
}

// Empty diagram template for new diagrams
function createEmptyDiagram(t: ReturnType<typeof useLocale>['t']): DrakonDiagram {
return {
name: t.drakonEditor.newDiagram,
access: 'write',
items: {
'1': { type: 'end' },
'2': { type: 'branch', branchId: 0, one: '3' },
'3': { type: 'action', content: t.drakonEditor.startHere, one: '1' },
},
};
}

function normWidgetDiagram<T extends { params?: unknown }>(d: T | null | undefined): T | null
| undefined {
if (!d) return d;
if (Array.isArray(d.params)) return { ...d, params: (d.params as string[]).join(', ') } as T;
  return d;
}

const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
const hashCode = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
};
const getUserColor = (userId: string) => {
  const hash = Math.abs(hashCode(userId));
  return colors[hash % colors.length];
};


export function DrakonEditor({
diagram,
diagramId,
folderSlug,
isNew = false,
onSaved,
onSaveOverride,
onSelectionChanged,
className,
diff,
}: DrakonEditorProps) {
const { theme } = useTheme();
const { t, locale } = useLocale();
const isDark = theme === 'dark' || (theme === 'system' &&
window.matchMedia('(prefers-color-scheme: dark)').matches);
const containerRef = useRef<HTMLDivElement>(null);
const widgetRef = useRef<DrakonWidgetType | null>(null);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [conversionIssues, setConversionIssues] = useState<ValidationIssue[]>([]);
const [autofixes, setAutofixes] = useState<any[]>([]);
const [isIssuesPanelExpanded, setIsIssuesPanelExpanded] = useState(false);
const [hasChanges, setHasChanges] = useState(false);
const [diagramName, setDiagramName] = useState(diagram?.name ||
t.drakonEditor.newDiagram);
const [zoomLevel, setZoomLevel] = useState(5000);
const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: Array<{ text:
string; action?: () => void; type?: string }> } | null>(null);
const [panMode, setPanMode] = useState(false);
const { user } = useAuth();
const [guestId] = useState(() => 'guest-' + Math.random().toString(36).substr(2, 9));
const [cursors, setCursors] = useState<Record<string, { x: number; y: number; name: string; color: string }>>({});
const lastUpdateRef = useRef<number>(0);

const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
  if (!wsProviderRef.current || import.meta.env.VITE_USE_REALTIME_SYNC !== 'true') return;
  const now = Date.now();
  if (now - lastUpdateRef.current < 50) return; // limit to 20 fps
  lastUpdateRef.current = now;

  const rect = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  wsProviderRef.current.awareness.setLocalStateField('cursor', { x, y });
}, []);

// Track UI state to guard against unwanted selection/pasteMode resets
const uiStateRef = useRef<'default' | 'contextMenuOpen' | 'pasteMode'>('default');
// Track contextmenu target so Copy/Cut can use it as fallback when selection is lost
const contextTargetIdRef = useRef<string | null>(null);
const [editDialog, setEditDialog] = useState<{
open: boolean;
title: string;
value: string;
onConfirm: (value: string) => void;
}>({ open: false, title: '', value: '', onConfirm: () => {} });
const [formatDialog, setFormatDialog] = useState<{
open: boolean;
title: string;
style: Record<string, unknown>;
onConfirm: (style: Record<string, unknown>) => void;
}>({ open: false, title: '', style: {}, onConfirm: () => {} });

const [isSaving, setIsSaving] = useState(false);

const [projectFolder, setProjectFolder] = useState<ProjectFolderValue>(() => {
const d = readProjectFolderDefaults();
return { folderSlug: d.folderSlug || folderSlug || '', saveToGit: d.saveToGit };
});
const [knownFolders, setKnownFolders] = useState<string[]>([]);
useEffect(() => {
  let alive = true;
  listProjects().then((list) => {
    if (alive) setKnownFolders(list);
  });
  return () => { alive = false; };
}, []);

const [historyVersions, setHistoryVersions] = useState<DiagramVersion[]>([]);
const [diffVersionId, setDiffVersionId] = useState<string | null>(null);
const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

useEffect(() => {
  if (diagramId && !isNew) {
    getDiagramVersions(diagramId).then(setHistoryVersions).catch(console.error);
  }
}, [diagramId, isNew]);

// Task-V2-09b: Realtime Sync (Cloudflare DO)
const yDocRef = useRef<Y.Doc | null>(null);
const wsProviderRef = useRef<WebsocketProvider | null>(null);

useEffect(() => {
  if (import.meta.env.VITE_USE_REALTIME_SYNC !== 'true') return;
  if (!diagramId || isNew) return;

  const ydoc = new Y.Doc();
  yDocRef.current = ydoc;

  const wsUrl = `${import.meta.env.VITE_WORKER_URL || 'https://drakon-antigravity-worker.maxfraieho.workers.dev'}`.replace(/^http/, 'ws') + `/v1/diagram/${diagramId}/sync`;
  
  const provider = new WebsocketProvider(wsUrl, diagramId, ydoc);
  wsProviderRef.current = provider;

  // Set user awareness state
  const name = user?.name || 'Гість';
  const color = user ? getUserColor(user.$id) : getUserColor(guestId);
  provider.awareness.setLocalStateField('user', { name, color, id: user?.$id || guestId });

  // Listen to other users' awareness
  provider.awareness.on('change', () => {
    const states = provider.awareness.getStates();
    const nextCursors: Record<string, any> = {};
    states.forEach((state: any, clientID: number) => {
      if (clientID === provider.awareness.clientID) return;
      if (state.cursor && state.user) {
        nextCursors[state.user.id] = {
          x: state.cursor.x,
          y: state.cursor.y,
          name: state.user.name,
          color: state.user.color,
        };
      }
    });
    setCursors(nextCursors);
  });

  const yDiagram = ydoc.getMap('diagram');
  const yComments = ydoc.getMap('comments');
  
  yDiagram.observe((event, transaction) => {
    // Only import changes that come from network (not locally applied)
    if (!transaction.local && widgetRef.current) {
      const state = yDiagram.get('state') as string;
      if (state) {
        widgetRef.current.importJson(state);
      }
    }
  });

  yComments.observe(() => {
    // Dispatch event to notify comments drawer
    document.dispatchEvent(new CustomEvent('drakon-comments-updated', {
      detail: { comments: yComments.toJSON() }
    }));
  });

  // Global helper for WorkspaceShell to post comments
  (window as any).addDrakonComment = (nodeId: string, text: string, author: string) => {
    const currentComments = (yComments.get(nodeId) as any[]) || [];
    const newComment = {
      id: Math.random().toString(36).substr(2, 9),
      text,
      author,
      timestamp: new Date().toISOString()
    };
    yComments.set(nodeId, [...currentComments, newComment]);
  };

  return () => {
    provider.destroy();
    ydoc.destroy();
    delete (window as any).addDrakonComment;
  };
}, [diagramId, isNew, user, guestId]);



const activeDiff = useMemo(() => {
  if (diff) return diff;
  if (!diffVersionId || !widgetRef.current) return undefined;
  const version = historyVersions.find(v => v.id === diffVersionId);
  if (!version) return undefined;
  
  try {
    const currentJson = widgetRef.current.exportJson();
    if (!currentJson) return undefined;
    const currentDiagram = JSON.parse(currentJson) as DrakonDiagram;
    
    const oldResult = convertDiagramToIrWithValidation(version.diagramData);
    const newResult = convertDiagramToIrWithValidation(currentDiagram);
    
    return compareDiagrams(oldResult.ir, newResult.ir);
  } catch (e) {
    console.error('[DrakonEditor] Failed to compute diff:', e);
    return undefined;
  }
}, [diff, diffVersionId, historyVersions]);

const handleRestoreVersion = useCallback(async (versionId: string) => {
  const version = historyVersions.find(v => v.id === versionId);
  if (version && widgetRef.current) {
    try {
      widgetRef.current.importJson(JSON.stringify(version.diagramData));
      setDiagramName(version.diagramData.name || '');
      setHasChanges(true);
      
      const targetFolder = (projectFolder.folderSlug || '').trim() || folderSlug || 'general';
      const effectiveId = diagramId;
      if (effectiveId) {
        const diagramData = JSON.parse(JSON.stringify(version.diagramData));
        diagramData.name = version.diagramData.name;
        if (diagramData && Array.isArray(diagramData.params)) {
          diagramData.params = (diagramData.params as string[]).join(', ');
        }
        
        try {
          await saveDiagramToMinio(targetFolder, effectiveId, diagramData);
        } catch {
          await api.saveDiagram(targetFolder, effectiveId, diagramData);
        }
        
        if (projectFolder.saveToGit) {
          const ghCfg = getGithubConfig();
          if (ghCfg.token.trim() && ghCfg.repo.trim()) {
            const ownerRepo = parseOwnerRepo(`${ghCfg.owner}/${ghCfg.repo}`);
            if (ownerRepo) {
              await saveDiagramToGit({
                owner: ownerRepo.owner,
                repo: ownerRepo.repo,
                branch: ghCfg.branch || 'main',
                diagramId: effectiveId,
                diagram: diagramData,
                token: ghCfg.token,
              });
            }
          }
        }
        
        await saveDiagramVersion(effectiveId, diagramData, `Відновлено версію від ${new Date(version.timestamp).toLocaleString()}`);
        const updated = await getDiagramVersions(effectiveId);
        setHistoryVersions(updated);
        setHasChanges(false);
        setDiffVersionId(null); // Reset comparison
        toast.success(`Відновлено та збережено версію від ${new Date(version.timestamp).toLocaleString()}`);
        
        document.dispatchEvent(
          new CustomEvent("diagram-saved", {
            detail: {
              changedFiles: [`drn/${effectiveId}.json`],
            },
          }),
        );
      }
    } catch (err) {
      console.error('[DrakonEditor] Restore failed:', err);
      toast.error('Не вдалося відновити та зберегти версію');
    }
  }
}, [historyVersions, diagramId, folderSlug, projectFolder]);

const editSender = useMemo<DrakonEditSender>(() => ({
  pushEdit: (edit) => {
    setHasChanges(true);
    console.log('[DrakonEditor] Edit:', edit);
    
    // Broadcast via Yjs
    if (yDocRef.current && import.meta.env.VITE_USE_REALTIME_SYNC === 'true') {
      const jsonString = widgetRef.current?.exportJson();
      if (jsonString) {
        const yDiagram = yDocRef.current.getMap('diagram');
        yDocRef.current.transact(() => {
          yDiagram.set('state', jsonString);
        });
      }
    }

    
    // Auto-save history every 30s of inactivity
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      if (!widgetRef.current || !diagramId) return;
      try {
        const jsonString = widgetRef.current.exportJson();
        const diagramData = JSON.parse(jsonString);
        await saveDiagramVersion(diagramId, diagramData, 'Автозбереження');
        const updated = await getDiagramVersions(diagramId);
        setHistoryVersions(updated);
        
        // Also save/commit the actual file (.drakon.json)
        const targetFolder = (projectFolder.folderSlug || '').trim() || folderSlug || 'general';
        const raw = JSON.parse(jsonString);
        raw.name = diagramName;
        if (raw && Array.isArray(raw.params)) {
          raw.params = (raw.params as string[]).join(', ');
        }
        
        // Validate silently
        const { issues } = convertDiagramToIrWithValidation(raw);
        if (!issues.some(i => i.severity === 'error')) {
          try {
            await saveDiagramToMinio(targetFolder, diagramId, raw);
          } catch {
            await api.saveDiagram(targetFolder, diagramId, raw);
          }
          
          if (projectFolder.saveToGit) {
            const ghCfg = getGithubConfig();
            if (ghCfg.token.trim() && ghCfg.repo.trim()) {
              const ownerRepo = parseOwnerRepo(`${ghCfg.owner}/${ghCfg.repo}`);
              if (ownerRepo) {
                try {
                  await saveDiagramToGit({
                    owner: ownerRepo.owner,
                    repo: ownerRepo.repo,
                    branch: ghCfg.branch || 'main',
                    diagramId: diagramId,
                    diagram: raw,
                    token: ghCfg.token,
                  });
                } catch (gitErr) {
                  console.error('[DrakonEditor] Auto-commit to Git failed', gitErr);
                }
              }
            }
          }
          
            setHasChanges(false);
            document.dispatchEvent(
              new CustomEvent("diagram-saved", {
                detail: {
                  changedFiles: [`drn/${diagramId}.json`],
                },
              }),
            );
          }
        } catch (e) {
          console.error('[DrakonEditor] Auto-save to history failed', e);
        }
      }, 2000);
    },
    stop: () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    },
  }), [diagramId, diagramName, folderSlug, projectFolder]);

// CRITICAL: memoize these so buildConfig dependencies stay stable across renders.
// Without this, every setState (e.g. closing context menu) triggers full widget re-init,
// which destroys selection, paste mode, and all widget state.
const drakonLabels = useMemo(() => getDrakonLabels(t.drakon), [t.drakon]);
const drakonTranslate = useMemo(() => createDrakonTranslate(t.drakon), [t.drakon]);

  const buildConfig = useCallback((): DrakonConfig => {
    const issuesIcons: Record<string, Partial<DrakonConfigTheme>> = {};
    conversionIssues.forEach(issue => {
      if (issue.nodeId) {
        issuesIcons[issue.nodeId] = {
          iconBorder: issue.severity === 'error' ? '#dc2626' : '#d97706',
          lineWidth: 2.5
        };
      }
    });

    if (activeDiff) {
      Object.entries(activeDiff.nodes).forEach(([id, res]) => {
        const result = res as any;
        if (result.status === "added") {
           issuesIcons[id] = { ...issuesIcons[id], iconBorder: '#2da44e', lineWidth: 3, iconFill: '#e6ffed' };
        } else if (result.status === "modified") {
           issuesIcons[id] = { ...issuesIcons[id], iconBorder: '#d4a72c', lineWidth: 3, iconFill: '#fff8c5' };
        }
      });
    }

    const baseTheme = getGardenDrakonTheme(isDark);
    const themeWithIssues = {
      ...baseTheme,
      icons: {
        ...baseTheme.icons,
        ...issuesIcons
      }
    };

    return {
      startEditContent: (item, isReadonly) => {
        if (isReadonly) return;
        setEditDialog({
          open: true,
          title: t.drakon.editContent,
          value: item.content || '',
          onConfirm: (newContent) => {
            if (widgetRef.current) {
              widgetRef.current.setContent(item.id, newContent);
              setHasChanges(true);
            }
          },
        });
      },
      showContextMenu: (left, top, items) => {
        // Convert page coordinates to container-relative coordinates
        const containerEl = containerRef.current;
        uiStateRef.current = 'contextMenuOpen';
        console.log('[DRK] showContextMenu, uiState → contextMenuOpen');
        if (containerEl) {
          const rect = containerEl.getBoundingClientRect();
          setContextMenu({ x: left - rect.left, y: top - rect.top, items });
        } else {
          setContextMenu({ x: left, y: top, items });
        }
      },
      startEditSecondary: (item, isReadonly) => {
        if (isReadonly) return;
        setEditDialog({
          open: true,
          title: t.drakon.editSecondaryText,
          value: item.secondary || '',
          onConfirm: (newSecondary) => {
            if (widgetRef.current) {
              widgetRef.current.setSecondary(item.id, newSecondary);
              setHasChanges(true);
            }
          },
        });
      },
      startEditLink: (item, isReadonly) => {
        if (isReadonly) return;
        setEditDialog({
          open: true,
          title: t.drakon.editLink || 'Edit Link',
          value: item.link || '',
          onConfirm: (newLink) => {
            if (widgetRef.current) {
              widgetRef.current.setLink(item.id, newLink);
              setHasChanges(true);
            }
          },
        });
      },
      startEditStyle: (ids, oldStyle, _x, _y, _accepted) => {
        setFormatDialog({
          open: true,
          title: t.drakon.format || 'Format',
          style: (oldStyle || {}) as Record<string, unknown>,
          onConfirm: (newStyle) => {
            if (widgetRef.current) {
              widgetRef.current.setStyle(ids, newStyle);
              setHasChanges(true);
            }
          },
        });
      },
      startEditDiagramStyle: (oldStyle, _x, _y) => {
        setFormatDialog({
          open: true,
          title: t.drakon.format || 'Format Diagram',
          style: (oldStyle || {}) as Record<string, unknown>,
          onConfirm: (newStyle) => {
            if (widgetRef.current) {
              widgetRef.current.setDiagramStyle(newStyle);
              setHasChanges(true);
            }
          },
        });
      },
      canSelect: !panMode,
      canvasIcons: true,
      textFormat: 'plain',
      font: '14px system-ui, -apple-system, sans-serif',
      headerFont: 'bold 16px system-ui, -apple-system, sans-serif',
      theme: themeWithIssues,
      translate: drakonTranslate,
      ...drakonLabels,
      onSelectionChanged: (items) => {
        console.log('[DRK] onSelectionChanged, uiState:', uiStateRef.current, 'items:', items?.length);
        if (onSelectionChanged) {
          onSelectionChanged(items);
        }
        
        // Dispatch custom event for WorkspaceShell / EVIDENCE Comments tab
        const selectedNodeId = items && items.length === 1 ? items[0].id : null;
        const selectedNodeContent = items && items.length === 1 ? items[0].content : null;
        document.dispatchEvent(new CustomEvent('drakon-selection-changed', {
          detail: { selectedNodeId, selectedNodeContent }
        }));
      },

      onZoomChanged: (newZoom) => {
        setZoomLevel(newZoom);
      },
    };
  }, [isDark, panMode, drakonLabels, drakonTranslate, t.drakon, conversionIssues, activeDiff]);

// Initialize widget
useEffect(() => {
let mounted = true;

async function init() {
if (!containerRef.current) {
console.error('[DRK-INIT] containerRef is null — component not mounted?');
return;
}
console.log('[DRK-INIT] start, diagramId:', diagramId, 'isNew:', isNew, 'diagram prop present:',
!!diagram);
try {
console.log('[DRK-INIT] loading widget script...');
await loadDrakonWidget();
console.log('[DRK-INIT] widget script loaded OK');
if (!mounted) return;

const widget = createWidget();
console.log('[DRK-INIT] createWidget OK');
widgetRef.current = widget;
const container = containerRef.current;
const rect = container.getBoundingClientRect();
console.log('[DRK-INIT] container rect:', rect.width, 'x', rect.height);
container.innerHTML = '';

const config = buildConfig();
const renderW = Math.max(rect.width, 400);
const renderH = Math.max(rect.height, 300);
const element = widget.render(renderW, renderH, config);
console.log('[DRK-INIT] widget.render OK, element:', (element as HTMLElement)?.tagName);
container.appendChild(element);
// Use provided diagram or empty template for new
const diagramToLoad = normWidgetDiagram(diagram) || createEmptyDiagram(t);
const effectiveId = diagramId || 'new-diagram';
console.log('[DRK-INIT] setDiagram, id:', effectiveId, 'items count:',
Object.keys(diagramToLoad?.items || {}).length, 'name:', diagramToLoad?.name);
await widget.setDiagram(effectiveId, diagramToLoad, editSender);
console.log('[DRK-INIT] setDiagram OK');
widget.setZoom(5000); // 50% zoom for editor

setIsLoading(false);
} catch (err) {
console.error('[DRK-INIT] FAILED:', err);
if (!mounted) return;
setError(err instanceof Error ? err.message : 'Failed to load editor');
setIsLoading(false);
}
}

init();

return () => {
mounted = false;
editSender.stop();
widgetRef.current = null;
if (containerRef.current) containerRef.current.innerHTML = '';
};
}, [diagramId]);

// Validate conversion issues whenever diagram prop changes
useEffect(() => {
if (!diagram) {
setConversionIssues([]);
setAutofixes([]);
return;
}
const result = convertDiagramToIrWithValidation(diagram);
setConversionIssues(result.issues);
setAutofixes([]);
}, [diagram]);

// Native capture-phase guard: prevent canvas/widget from clearing selection
// on right-click or while context menu / paste mode is active
useEffect(() => {
const el = containerRef.current;
if (!el) return;

const onPointerDownCapture = (e: PointerEvent) => {
// Right-click: let it through to widget so contextmenu event fires normally.
// Do NOT stopPropagation — widget needs this to show its context menu.
if (e.button === 2) {
console.log('[DRK] capture guard: right-click, passing through');
return;
}

// While context menu is open: block LEFT clicks on canvas background
// from clearing selection. Clicks on menu items are handled by React.
if (uiStateRef.current === 'contextMenuOpen') {
const target = e.target as HTMLElement;
// Allow clicks inside context menu itself
if (target.closest('[data-drakon-context-menu]')) {
console.log('[DRK] capture guard: click inside menu, allowing');
return;
}
console.log('[DRK] capture guard: contextMenuOpen, left click on canvas, stopPropagation');
e.stopPropagation();
return;
}
// While in paste mode: let widget handle socket clicks
if (uiStateRef.current === 'pasteMode') {
console.log('[DRK] capture guard: pasteMode, allowing click through to widget');
return;
}
};

el.addEventListener('pointerdown', onPointerDownCapture, true); // capture phase
return () => el.removeEventListener('pointerdown', onPointerDownCapture, true);
}, []);

// Handle theme/panMode changes — re-render and re-set diagram to restart mouse behavior
useEffect(() => {
if (!widgetRef.current || !containerRef.current || isLoading) return;

const widget = widgetRef.current;
const container = containerRef.current;
const rect = container.getBoundingClientRect();

// Save current diagram state before re-render
let currentDiagramJson: string | null = null;
try {
currentDiagramJson = widget.exportJson();
} catch { / ignore if no diagram loaded yet / }

const currentZoom = widget.getZoom();

container.innerHTML = '';
const config = buildConfig();
const element = widget.render(rect.width, rect.height, config);
container.appendChild(element);

// Re-set diagram to restart mouse behavior state machine
if (currentDiagramJson) {
const diagramData = normWidgetDiagram(JSON.parse(currentDiagramJson) as Record<string,
unknown>) as unknown as DrakonDiagram;
widget.setDiagram(diagramId, diagramData, editSender).then(() => {
widget.setZoom(currentZoom);
});
} else {
widget.redraw();
}
}, [isDark, buildConfig, isLoading]);

// Resize observer: re-render canvas when container changes size (panel collapse/expand)
useEffect(() => {
const container = containerRef.current;
if (!container || isLoading) return;

let timer: ReturnType<typeof setTimeout> | null = null;

const observer = new ResizeObserver(() => {
if (timer) clearTimeout(timer);
timer = setTimeout(() => {
if (!widgetRef.current || !containerRef.current) return;
const widget = widgetRef.current;
const cont = containerRef.current;
const rect = cont.getBoundingClientRect();
if (rect.width < 10 || rect.height < 10) return; // skip while animating to 0

let json: string | null = null;
try { json = widget.exportJson(); } catch { /* no diagram yet */ }
const zoom = widget.getZoom();

cont.innerHTML = '';
const el = widget.render(rect.width, rect.height, buildConfig());
cont.appendChild(el);

if (json) {
const data = normWidgetDiagram(
JSON.parse(json) as Record<string, unknown>
) as unknown as DrakonDiagram;
void widget.setDiagram(diagramId, data, editSender).then(() => {
widget.setZoom(zoom);
});
} else {
widget.redraw();
}
}, 60);
});

observer.observe(container);
return () => {
observer.disconnect();
if (timer) clearTimeout(timer);
};
}, [isLoading, buildConfig, diagramId]);

const handleSave = useCallback(async () => {
if (!widgetRef.current) return;

if (onSaveOverride) {
const raw = JSON.parse(widgetRef.current.exportJson()) as DrakonDiagram;
raw.name = diagramName;
if (raw && Array.isArray(raw.params)) {
raw.params = (raw.params as string[]).join(', ');
}
const { issues } = convertDiagramToIrWithValidation(raw);
setConversionIssues(issues);
setAutofixes([]);
if (issues.some(i => i.severity === 'error')) {
toast.error('Діаграма містить помилки структури. Виправте перед збереженням.');
setIsIssuesPanelExpanded(true);
return;
}
const ok = await onSaveOverride(raw);
if (ok) setHasChanges(false);
return;
}

const effectiveId = diagramId || (isNew ? slugify(diagramName) : '') || crypto.randomUUID();
const jsonString = widgetRef.current.exportJson();
const diagramData = JSON.parse(jsonString);
diagramData.name = diagramName;
if (diagramData && Array.isArray(diagramData.params)) {
diagramData.params = (diagramData.params as string[]).join(', ');
}
const { issues: directIssues } = convertDiagramToIrWithValidation(diagramData as DrakonDiagram);
setConversionIssues(directIssues);
setAutofixes([]);
if (directIssues.some(i => i.severity === 'error')) {
toast.error('Діаграма містить помилки структури. Виправте перед збереженням.');
setIsIssuesPanelExpanded(true);
return;
}

const targetFolder =
(projectFolder.folderSlug || '').trim() || folderSlug || 'general';

setIsSaving(true);
try {
// 1) MinIO save (always)
try {
await saveDiagramToMinio(targetFolder, effectiveId, diagramData);
toast.success(`✓ Saved to MinIO: ${targetFolder}/${effectiveId}`);
} catch (err) {
// legacy fallback for environments without the MCP tool
try {
await api.saveDiagram(targetFolder, effectiveId, diagramData);
toast.success(`✓ Saved to MinIO: ${targetFolder}/${effectiveId}`);
} catch {
toast.error(
`MinIO save failed: ${err instanceof Error ? err.message : String(err)}`,
);
}
}

// 2) Optional git save — uses token/repo/branch from Settings
if (projectFolder.saveToGit) {
const ghCfg = getGithubConfig();
if (!ghCfg.token.trim() || !ghCfg.repo.trim()) {
toast.error('Git save: configure GitHub token and repo in Settings first');
} else {
const ownerRepo = parseOwnerRepo(`${ghCfg.owner}/${ghCfg.repo}`);
if (!ownerRepo) {
toast.error('Git save: invalid repo in Settings');
} else {
try {
await saveDiagramToGit({
owner: ownerRepo.owner,
repo: ownerRepo.repo,
branch: ghCfg.branch || 'main',
diagramId: effectiveId,
diagram: diagramData,
token: ghCfg.token,
});
toast.success(`✓ Saved to git: drn/${effectiveId}.json`);
} catch (err) {
toast.error(
`Git save failed: ${err instanceof Error ? err.message : String(err)}`,
);
}
}
}
}

setHasChanges(false);
onSaved?.(effectiveId);

// Dispatch custom event for EVIDENCE panel diff analysis
document.dispatchEvent(
  new CustomEvent("diagram-saved", {
    detail: {
      changedFiles: [`drn/${effectiveId}.json`],
    },
  }),
);
} finally {
setIsSaving(false);
}
}, [diagramId, diagramName, folderSlug, isNew, onSaved, onSaveOverride, projectFolder]);

// Escape key exits paste mode or closes context menu
useEffect(() => {
const handleKeyDown = (e: KeyboardEvent) => {
if (e.key === 'Escape') {
if (contextMenu) {
setContextMenu(null);
uiStateRef.current = 'default';
} else if (uiStateRef.current === 'pasteMode') {
uiStateRef.current = 'default';
widgetRef.current?.redraw();
}
} else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
e.preventDefault();
void handleSave();
}
};
window.addEventListener('keydown', handleKeyDown);
return () => window.removeEventListener('keydown', handleKeyDown);
}, [contextMenu, handleSave]);

const handleApplyAutofix = useCallback(async (type: string) => {
if (!widgetRef.current) return;
try {
const json = widgetRef.current.exportJson();
const currentDiagram = JSON.parse(json) as DrakonDiagram;

let modified = false;

if (type === 'merge_terminals') {
// Find existing 'end' node or create one
let endNodeId = Object.keys(currentDiagram.items).find(
id => currentDiagram.items[id].type === 'end'
);

if (!endNodeId) {
endNodeId = 'end_node_auto';
currentDiagram.items[endNodeId] = { type: 'end' };
modified = true;
}

// Find all nodes that are not 'end' nodes and have no 'one' pointer
for (const [id, item] of Object.entries(currentDiagram.items)) {
if (id !== endNodeId && item.type !== 'end' && !item.one) {
item.one = endNodeId;
modified = true;
}
}
} else if (type === 'remove_orphan') {
// Run BFS from start node (first item) to find reachable nodes
const itemIds = Object.keys(currentDiagram.items);
if (itemIds.length > 0) {
const startId = itemIds[0];
const visited = new Set<string>();
const queue: string[] = [startId];

while (queue.length > 0) {
const currentId = queue.shift();
if (!currentId || visited.has(currentId)) continue;
visited.add(currentId);

const current = currentDiagram.items[currentId];
if (!current) continue;

const nextIds = [current.one, current.two].filter((id): id is string => Boolean(id));
for (const nextId of nextIds) {
if (currentDiagram.items[nextId] && !visited.has(nextId)) {
queue.push(nextId);
}
}
}

// Delete orphans
for (const id of itemIds) {
if (!visited.has(id)) {
delete currentDiagram.items[id];
modified = true;
}
}
}
}

if (modified) {
setDiagramName(currentDiagram.name);
setHasChanges(true);

const effectiveId = diagramId || 'new-diagram';
await widgetRef.current.setDiagram(effectiveId, currentDiagram, editSender);

// Re-validate to update the issues list
const result = convertDiagramToIrWithValidation(currentDiagram);
setConversionIssues(result.issues);
setAutofixes([]);

toast.success(`Застосовано виправлення: ${type}`);
}
} catch (err) {
console.error('Failed to apply autofix', err);
toast.error('Не вдалося застосувати автоматичне виправлення');
}
}, [diagramId, editSender]);

const handleUndo = useCallback(() => {
widgetRef.current?.undo();
}, []);

const handleRedo = useCallback(() => {
widgetRef.current?.redo();
}, []);

const handleHome = useCallback(() => {
widgetRef.current?.goHome();
}, []);

const handleInsertIcon = useCallback((type: string) => {
widgetRef.current?.showInsertionSockets(type);
}, []);

const handleToggleSilhouette = useCallback(() => {
widgetRef.current?.toggleSilhouette();
setHasChanges(true);
}, []);

const handleZoomIn = useCallback(() => {
if (!widgetRef.current) return;
const current = widgetRef.current.getZoom();
widgetRef.current.setZoom(Math.min(current + 2000, 20000));
}, []);

const handleZoomOut = useCallback(() => {
if (!widgetRef.current) return;
const current = widgetRef.current.getZoom();
widgetRef.current.setZoom(Math.max(current - 2000, 1000));
}, []);

const handleCopy = useCallback(() => {
widgetRef.current?.copySelection();
// Enter paste mode to show insertion sockets
requestAnimationFrame(() => {
widgetRef.current?.showPaste();
uiStateRef.current = 'pasteMode';
});
}, []);
const handleCut = useCallback(() => {
widgetRef.current?.cutSelection();
setHasChanges(true);
// Enter paste mode to show insertion sockets
requestAnimationFrame(() => {
widgetRef.current?.showPaste();
uiStateRef.current = 'pasteMode';
});
}, []);

const handleDelete = useCallback(() => {
widgetRef.current?.deleteSelection();
setHasChanges(true);
}, []);

const handlePaste = useCallback(() => {
widgetRef.current?.showPaste();
setHasChanges(true);
}, []);

const handleExportJson = useCallback(() => {
if (!widgetRef.current) return;
const json = widgetRef.current.exportJson();
const blob = new Blob([json], { type: 'application/json' });
const link = document.createElement('a');
link.download = `${diagramId}.drakon.json`;
link.href = URL.createObjectURL(blob);
link.click();
URL.revokeObjectURL(link.href);
}, [diagramId]);

const handleExportPng = useCallback(() => {
if (!widgetRef.current) return;
try {
const canvas = widgetRef.current.exportCanvas(10000);
const link = document.createElement('a');
link.download = `${diagramId}.png`;
link.href = canvas.toDataURL('image/png');
link.click();
} catch {
console.error('Export PNG failed - may require canvasIcons mode');
}
}, [diagramId]);

const handleExportPseudocode = useCallback(async () => {
if (!widgetRef.current) return;
try {
const jsonString = widgetRef.current.exportJson();
const diagramData = JSON.parse(jsonString);
const pseudocode = await diagramToPseudocode(diagramData, diagramName, locale);
const markdown = pseudocodeToMarkdown(pseudocode, diagramName);

const blob = new Blob([markdown], { type: 'text/markdown' });
const link = document.createElement('a');
link.download = `${diagramId}.md`;
link.href = URL.createObjectURL(blob);
link.click();
URL.revokeObjectURL(link.href);
} catch (err) {
console.error('Export pseudocode failed:', err);
}
}, [diagramId, diagramName]);

// DRAKON icon types for the toolbar — standard DRAKON notation icons
const iconButtons = [
{ type: 'action', img: iconAction, label: t.drakonEditor.action },
{ type: 'question', img: iconQuestion, label: t.drakonEditor.question },
{ type: 'select', img: iconSelect, label: t.drakonEditor.choice },
{ type: 'case', img: iconCase, label: t.drakonEditor.caseName },
{ type: 'foreach', img: iconForeach, label: t.drakonEditor.forLoop },
{ type: 'branch', img: iconBranch, label: t.drakonEditor.branchName },
{ type: 'insertion', img: iconInsertion, label: t.drakonEditor.insertion },
{ type: 'comment', img: iconComment, label: t.drakonEditor.comment },
{ type: 'shelf', img: iconShelf, label: t.drakonEditor.shelf },
{ type: 'simpleinput', img: iconSinput, label: t.drakonEditor.simpleInput },
{ type: 'simpleoutput', img: iconSoutput, label: t.drakonEditor.simpleOutput },
{ type: 'input', img: iconInput, label: t.drakonEditor.input },
{ type: 'output', img: iconOutput, label: t.drakonEditor.output },
{ type: 'process', img: iconProcess, label: t.drakonEditor.process },
{ type: 'timer', img: iconTimer, label: t.drakonEditor.timer },
{ type: 'pause', img: iconPause, label: t.drakonEditor.pause },
{ type: 'duration', img: iconDuration, label: t.drakonEditor.duration },
{ type: 'group-duration', img: iconGroupDuration, label: t.drakonEditor.groupDuration },
{ type: 'group-duration-r', img: iconGroupDurationR, label: t.drakonEditor.groupDurationRight },
{ type: 'par', img: iconPar, label: t.drakonEditor.parallel },
{ type: 'parblock', img: iconParblock, label: t.drakonEditor.parallelBlock },
{ type: 'ctrl-start', img: iconCtrlStart, label: t.drakonEditor.controlStart },
{ type: 'ctrl-end', img: iconCtrlEnd, label: t.drakonEditor.controlEnd },
{ type: 'end', img: iconEnd, label: t.drakonEditor.endIcon },
{ type: 'link', img: iconLink, label: t.drakonEditor.link },
];

if (error) {
return (
<div className={cn(
'flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4',
className
)}>
<AlertCircle className="h-5 w-5 text-destructive" />
<span className="text-sm text-destructive">{error}</span>
</div>
);
}

return (
<div className={cn('astryx-migrated flex h-full flex-col', className)}>
{/* Toolbar */}
<div className="flex flex-wrap items-center gap-2 shrink-0 border-b pb-1">
<div className="flex items-center gap-2">
<Label htmlFor="diagram-name"
className="sr-only">{t.drakonEditor.diagramName}</Label>
<Input
id="diagram-name"
value={diagramName}
onChange={(e) => {
setDiagramName(e.target.value);
setHasChanges(true);
}}
className="w-32 md:w-48 h-8 text-sm"
placeholder={t.drakonEditor.diagramName}
/>
</div>

<div className="flex items-center gap-1">
<Button
variant="default"
size="sm"
onClick={handleSave}
disabled={!hasChanges || isLoading || isSaving}
title={t.editor?.save || 'Зберегти'}
>
{isSaving ? (
<Loader2 className="h-4 w-4 animate-spin md:mr-1" />
):(
<Save className="h-4 w-4 md:mr-1" />
)}
<span className="hidden md:inline">{t.editor?.save || 'Зберегти'}</span>
</Button>

<Button variant="ghost" size="sm" onClick={handleUndo} disabled={isLoading}>
<Undo className="h-4 w-4" />
</Button>
<Button variant="ghost" size="sm" onClick={handleRedo} disabled={isLoading}>
<Redo className="h-4 w-4" />
</Button>
<Button variant="ghost" size="sm" onClick={handleHome} disabled={isLoading}>
<Home className="h-4 w-4" />
</Button>
</div>

{/* Pan/Select mode toggle */}
<div className="flex items-center gap-0.5 border rounded-md p-0.5">
<Tooltip>
<TooltipTrigger asChild>
<Button
variant={!panMode ? 'secondary' : 'ghost'}
size="sm"
onClick={() => setPanMode(false)}
disabled={isLoading}
>
<MousePointer className="h-4 w-4" />
</Button>
</TooltipTrigger>
<TooltipContent>{t.drakonEditor.select}</TooltipContent>
</Tooltip>
<Tooltip>
<TooltipTrigger asChild>
<Button
variant={panMode ? 'secondary' : 'ghost'}
size="sm"
onClick={() => setPanMode(true)}
disabled={isLoading}
>
<Hand className="h-4 w-4" />
</Button>
</TooltipTrigger>
<TooltipContent>{t.drakonEditor.pan}</TooltipContent>
</Tooltip>
</div>

{/* Zoom & selection controls */}
<div className="flex items-center gap-1">
<Tooltip>
<TooltipTrigger asChild>
<Button variant="ghost" size="sm" onClick={handleZoomOut} disabled={isLoading}>
<ZoomOut className="h-4 w-4" />
</Button>
</TooltipTrigger>
<TooltipContent>{t.drakonEditor.zoomOut}</TooltipContent>
</Tooltip>
<span className="text-xs text-muted-foreground w-10 text-center">{Math.round(zoomLevel /
100)}%</span>
<Tooltip>
<TooltipTrigger asChild>
<Button variant="ghost" size="sm" onClick={handleZoomIn} disabled={isLoading}>
<ZoomIn className="h-4 w-4" />
</Button>
</TooltipTrigger>
<TooltipContent>{t.drakonEditor.zoomIn}</TooltipContent>
</Tooltip>

<div className="mx-1 w-px h-5 bg-border" />

<Tooltip>
<TooltipTrigger asChild>
<Button variant="ghost" size="sm" onClick={handleCopy} disabled={isLoading}>
<Copy className="h-4 w-4" />
</Button>
</TooltipTrigger>
<TooltipContent>{t.drakon.copy}</TooltipContent>
</Tooltip>
<Tooltip>
<TooltipTrigger asChild>
<Button variant="ghost" size="sm" onClick={handleCut} disabled={isLoading}>
<Scissors className="h-4 w-4" />
</Button>
</TooltipTrigger>
<TooltipContent>{t.drakon.cut}</TooltipContent>
</Tooltip>
<Tooltip>
<TooltipTrigger asChild>
<Button variant="ghost" size="sm" onClick={handlePaste} disabled={isLoading}>
<ClipboardPaste className="h-4 w-4" />
</Button>
</TooltipTrigger>
<TooltipContent>{t.drakon.paste}</TooltipContent>
</Tooltip>
<Tooltip>
<TooltipTrigger asChild>
<Button variant="ghost" size="sm" onClick={handleDelete} disabled={isLoading}>
<Trash2 className="h-4 w-4" />
</Button>
</TooltipTrigger>
<TooltipContent>{t.drakon.delete}</TooltipContent>
</Tooltip>
</div>

<div className="flex-1" />

<div className="flex items-center gap-1">
<Tooltip>
<TooltipTrigger asChild>
<Button variant="outline" size="sm" onClick={handleExportPseudocode} disabled={isLoading} title={t.drakonEditor.pseudocode || 'Псевдокод'}>
<FileText className="h-4 w-4 md:mr-1" />
<span className="hidden md:inline">{t.drakonEditor.pseudocode || 'Псевдокод'}</span>
</Button>
</TooltipTrigger>
<TooltipContent>{t.drakonEditor.exportPseudocode}</TooltipContent>
</Tooltip>
<Button variant="outline" size="sm" onClick={handleExportJson} disabled={isLoading} title="Експорт JSON">
<Download className="h-4 w-4 md:mr-1" />
<span className="hidden md:inline">Експорт JSON</span>
</Button>
<Button variant="outline" size="sm" onClick={handleExportPng} disabled={isLoading} title="Зберегти як PNG">
<Download className="h-4 w-4 md:mr-1" />
<span className="hidden md:inline">Зберегти як PNG</span>
</Button>
</div>
</div>

{/* Conversion/validation issues */}
{conversionIssues.length > 0 && (() => {
  const errorsCount = conversionIssues.filter(i => i.severity === 'error').length;
  const warningsCount = conversionIssues.filter(i => i.severity !== 'error').length;
  return (
    <div className="shrink-0 border-b bg-muted/30">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-3 py-1.5">
        <div className="flex items-center gap-2">
          <AlertCircle className={cn("h-4 w-4", errorsCount > 0 ? "text-destructive" : "text-amber-500")} />
          <span className="text-xs font-medium">
            {errorsCount > 0 ? `${errorsCount} помилок` : 'Немає помилок'}
            {', '}
            {warningsCount > 0 ? `${warningsCount} попереджень` : 'немає попереджень'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {autofixes.map((fix) => (
            <Button
              key={fix.type}
              variant="outline"
              size="sm"
              className="h-6 text-[10px] py-0.5 px-2 border-primary/30 text-primary hover:bg-primary/10"
              onClick={() => handleApplyAutofix(fix.type)}
            >
              Auto-fix: {fix.type === 'merge_terminals' ? "Об'єднати термінали" : 'Видалити ізольовані'}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] py-0.5 px-2"
            onClick={() => setIsIssuesPanelExpanded(!isIssuesPanelExpanded)}
          >
            {isIssuesPanelExpanded ? 'Приховати деталі' : 'Показати деталі'}
          </Button>
        </div>
      </div>

      {/* Panel Details */}
      {isIssuesPanelExpanded && (
        <div className="max-h-36 overflow-y-auto px-3 py-2 space-y-1 bg-background border-t">
          {conversionIssues.map((issue, i) => (
            <div key={i} className="flex items-start justify-between text-xs py-1 border-b last:border-0 border-muted">
              <div className="flex items-start gap-1.5 min-w-0 mr-4">
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                  issue.severity === 'error' ? "bg-destructive" : "bg-amber-500"
                )} />
                <div className="min-w-0">
                  <span className="font-semibold mr-1.5 font-mono text-[9px] text-muted-foreground bg-muted px-1 py-0.5 rounded">
                    {issue.code}
                  </span>
                  <span className="text-foreground">{issue.message}</span>
                </div>
              </div>
              {issue.nodeId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-5 text-[9px] font-mono shrink-0 py-0 px-1.5"
                  onClick={() => {
                    if (widgetRef.current) {
                      widgetRef.current.showItem(issue.nodeId!);
                      toast.info(`Фокус на вузол: ${issue.nodeId}`);
                    }
                  }}
                >
                  Focus: {issue.nodeId}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
})()}

{/* Diff Review Changes overlay */}
{activeDiff && (
  <div className="shrink-0 border-b bg-indigo-950/20 px-3 py-2 flex items-center justify-between animate-in fade-in duration-200">
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 font-mono text-xs font-medium text-[var(--text-primary)]">
        <span className="w-2 h-2 rounded-full bg-[#2da44e]" />
        {activeDiff.summary.added} added
      </div>
      <div className="flex items-center gap-1.5 font-mono text-xs font-medium text-[var(--text-primary)]">
        <span className="w-2 h-2 rounded-full bg-[#d4a72c]" />
        {activeDiff.summary.modified} modified
      </div>
      <div className="flex items-center gap-1.5 font-mono text-xs font-medium text-[var(--text-primary)]">
        <span className="w-2 h-2 rounded-full bg-[#cf222e]" />
        {activeDiff.summary.removed} removed
      </div>
    </div>
    
    <div className="flex items-center gap-3">
      <div className="text-xs text-[var(--text-secondary)] font-mono">
        {diff ? "AI Changes Review Mode" : `Порівняння з версією від ${new Date(historyVersions.find(v => v.id === diffVersionId)?.timestamp || 0).toLocaleString()}`}
      </div>
      {!diff && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 px-2 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10"
          onClick={() => setDiffVersionId(null)}
        >
          Закрити порівняння
        </Button>
      )}
    </div>
  </div>
)}

{/* Editor layout with toolbar at bottom */}
<div className="flex flex-col flex-1 min-h-0 gap-2">
{/* Widget container */}
<div 
  className="relative flex-1 min-h-0" 
  onPointerMove={handlePointerMove}
  onClick={(e) => {

// Don't interfere when context menu is open
if (uiStateRef.current === 'contextMenuOpen') return;
// In paste mode, click on empty canvas exits paste mode
if (uiStateRef.current === 'pasteMode') {
// Only exit if clicking on the canvas background, not on a socket
if (!(e.target as HTMLElement).closest('[data-drakon-context-menu]')) {
console.log('[DRK] canvas click in pasteMode → exiting pasteMode');
uiStateRef.current = 'default';
widgetRef.current?.redraw();
}
return;
}
if (!(e.target as HTMLElement).closest('[data-drakon-context-menu]')) {
setContextMenu(null);
uiStateRef.current = 'default';
}
}}>
{isLoading && (
<div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-lg z-10">
<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
</div>
)}
<div
  ref={containerRef}
  className="drakon-container rounded-lg border overflow-hidden h-full"
/>

{/* Collaborative Cursors Overlay */}
{Object.entries(cursors).map(([id, cursor]) => (
  <div
    key={id}
    className="absolute pointer-events-none z-40 transition-[left,top] duration-75 flex flex-col items-start"
    style={{ left: cursor.x, top: cursor.y }}
  >
    <svg
      className="h-5 w-5 drop-shadow-[0_2px_2px_rgba(0,0,0,0.4)]"
      viewBox="0 0 24 24"
      fill={cursor.color}
      stroke="white"
      strokeWidth="1.5"
    >
      <path d="M4.5 3V17L9 12.5H16.5L4.5 3Z" />
    </svg>
    <span
      className="mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-white shadow-sm whitespace-nowrap"
      style={{ backgroundColor: cursor.color }}
    >
      {cursor.name}
    </span>
  </div>
))}


{/* Timeline Overlay */}
<DiagramTimeline 
  diagram={widgetRef.current ? (JSON.parse(widgetRef.current.exportJson() || "null") || diagram) : diagram} 
  versions={historyVersions} 
  onRestore={handleRestoreVersion} 
  onCompare={setDiffVersionId}
  diffVersionId={diffVersionId}
/>

{/* Context menu */}
{contextMenu && (
<div
data-drakon-context-menu
className="absolute z-50 min-w-[140px] rounded-md border bg-popover p-1 shadow-md"
style={{ left: contextMenu.x, top: contextMenu.y }}
>
{contextMenu.items.map((item, i) =>
item.type === 'separator' ? (
<div key={i} className="my-1 h-px bg-border" />
):(
<button
key={i}
className="w-full flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground text-left"
onClick={(e) => {
e.stopPropagation();
const action = item.action;
const isCopyOrCut = item.text === t.drakon.copy || item.text === t.drakon.cut;
console.log('[DRK] context menu click:', item.text, 'isCopyOrCut:', isCopyOrCut);
setContextMenu(null);

if (action) {
// Triple-RAF: 1) React commit 2) repaint 3) widget ready
requestAnimationFrame(() => {
requestAnimationFrame(() => {
requestAnimationFrame(() => {
console.log('[DRK] executing action:', item.text);
action();
if (isCopyOrCut && widgetRef.current) {
requestAnimationFrame(() => {
console.log('[DRK] calling showPaste after', item.text);
widgetRef.current?.showPaste();
uiStateRef.current = 'pasteMode';
console.log('[DRK] uiState → pasteMode');
});
} else {
uiStateRef.current = 'default';
}
});
});
});
} else {
uiStateRef.current = 'default';
}
}}
>
{item.text}
</button>
)
)}
</div>
)}
</div>

{/* Project folder + git binding */}
<ProjectFolderSection
value={projectFolder}
onChange={setProjectFolder}
knownFolders={knownFolders}
/>

{/* Bottom toolbar with icon buttons */}
<div className="w-full overflow-x-auto border rounded-lg bg-background shrink-0">
<div className="flex items-center gap-1 p-1.5">
{iconButtons.map(({ type, img, label }) => (
<Tooltip key={type}>
<TooltipTrigger asChild>
<Button
variant="ghost"
size="icon"
className="h-10 w-10 shrink-0"
onClick={() => handleInsertIcon(type)}
disabled={isLoading}
>
<img src={img} alt={label} className="h-7 w-7 dark:invert" />
</Button>
</TooltipTrigger>
<TooltipContent side="top">{label}</TooltipContent>
</Tooltip>
))}

{/* Separator */}
<div className="mx-1 w-px h-8 bg-border shrink-0" />

{/* Toggle silhouette */}
<Tooltip>
<TooltipTrigger asChild>
<Button
variant="ghost"
size="icon"
className="h-10 w-10 shrink-0"
onClick={handleToggleSilhouette}
disabled={isLoading}
>
<img src={iconSilhouette} alt="Silhouette" className="h-7 w-7 dark:invert" />
</Button>
</TooltipTrigger>
<TooltipContent side="top">{t.drakonEditor.toggleSilhouette}</TooltipContent>
</Tooltip>
</div>

{/* Edit dialog for element content */}
<Dialog open={editDialog.open} onOpenChange={(open) => {
if (!open) setEditDialog(prev => ({ ...prev, open: false }));
}}>
<DialogContent className="sm:max-w-md">
<DialogHeader>
<DialogTitle>{editDialog.title}</DialogTitle>
</DialogHeader>
<div className="space-y-4 py-2">
<Input
autoFocus
value={editDialog.value}
onChange={(e) => setEditDialog(prev => ({ ...prev, value: e.target.value }))}
onKeyDown={(e) => {
if (e.key === 'Enter') {
editDialog.onConfirm(editDialog.value);
setEditDialog(prev => ({ ...prev, open: false }));
}
}}
placeholder="..."
/>
<div className="flex justify-end gap-2">
<Button variant="outline" size="sm" onClick={() => setEditDialog(prev => ({ ...prev, open:
false }))}>
{t.editor?.cancel || 'Cancel'}
</Button>
<Button size="sm" onClick={() => {
editDialog.onConfirm(editDialog.value);
setEditDialog(prev => ({ ...prev, open: false }));
}}>
OK
</Button>
</div>
</div>
</DialogContent>
</Dialog>

{/* Format Inspector dialog for style editing */}
<FormatInspector
open={formatDialog.open}
title={formatDialog.title}
style={formatDialog.style}
onConfirm={(newStyle) => {
formatDialog.onConfirm(newStyle);
setFormatDialog(prev => ({ ...prev, open: false }));
}}
onCancel={() => setFormatDialog(prev => ({ ...prev, open: false }))}
/>
</div>
</div>
</div>
);
}

// Dialog wrapper for creating new diagrams
interface NewDrakonDialogProps {
folderSlug?: string;
trigger?: React.ReactNode;
onCreated?: (diagramId: string) => void;
}

export function NewDrakonDialog({ folderSlug, trigger, onCreated }: NewDrakonDialogProps) {
const [open, setOpen] = useState(false);
const [diagramId, setDiagramId] = useState('');
const [step, setStep] = useState<'name' | 'edit'>('name');
const { t } = useLocale();

const handleStartEdit = () => {
if (!diagramId.trim()) return;
setStep('edit');
};

const handleSaved = (id: string) => {
onCreated?.(id);
setOpen(false);
setStep('name');
setDiagramId('');
};

return (
<Dialog open={open} onOpenChange={setOpen}>
<DialogTrigger asChild>
{trigger || (
<Button variant="outline" size="sm">
<Plus className="h-4 w-4 mr-1" />
{t.drakonEditor.newDrakon}
</Button>
)}
</DialogTrigger>
<DialogContent className={step === 'edit' ? 'max-w-4xl h-[80vh]' : ''}>
<DialogHeader>
<DialogTitle>
{`step === 'name' ? t.drakonEditor.createNewDiagram : Edit: ${diagramId}`}
</DialogTitle>
</DialogHeader>

{step === 'name' ? (
<div className="space-y-4 py-4">
<div className="space-y-2">
<Label htmlFor="new-diagram-id">{t.drakonEditor.diagramId}</Label>
<Input
id="new-diagram-id"
value={diagramId}
onChange={(e) => setDiagramId(e.target.value.replace(/[^a-zA-Z0-9_-]/g, '-'))}
placeholder="my-flowchart"
/>
<p className="text-xs text-muted-foreground">
{t.drakonEditor.savedIn} {folderSlug || 'diagrams'}/diagrams/{diagramId || 'id'}.drakon.json
</p>
</div>
<Button onClick={handleStartEdit} disabled={!diagramId.trim()}>
{t.drakonEditor.createAndEdit}
</Button>
</div>
):(
<div className="flex-1 overflow-hidden">
<DrakonEditor
diagramId={diagramId}
folderSlug={folderSlug}
isNew
onSaved={handleSaved}
/>
</div>
)}
</DialogContent>
</Dialog>
);
}

