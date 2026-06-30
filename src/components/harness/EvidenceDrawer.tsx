import React from 'react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, FileText, CheckCircle, Coins, AlertTriangle } from 'lucide-react';
import { GateVerdict } from '@/lib/harness/pipeline-client';

interface EvidenceDrawerProps {
  gate: string | null;
  verdict: GateVerdict | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const GATE_ICONS: Record<string, React.ElementType> = {
  safety: Shield,
  policy: FileText,
  confidence: CheckCircle,
  cost: Coins,
};

const GATE_LABELS: Record<string, string> = {
  safety: 'Safety Gate Evidence',
  policy: 'Policy Gate Evidence',
  confidence: 'Confidence Gate Evidence',
  cost: 'Cost Gate Evidence',
};

export function EvidenceDrawer({ gate, verdict, isOpen, onOpenChange }: EvidenceDrawerProps) {
  if (!gate) return null;

  const Icon = GATE_ICONS[gate] || AlertTriangle;
  const label = GATE_LABELS[gate] || 'Gate Evidence';

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <div className="mx-auto w-full max-w-sm sm:max-w-md">
          <DrawerHeader>
            <div className="flex items-center gap-2">
              <Icon className={`w-5 h-5 ${verdict?.allowed ? 'text-green-500' : 'text-red-500'}`} />
              <DrawerTitle>{label}</DrawerTitle>
            </div>
            <DrawerDescription>
              Детальний звіт перевірки 4-Gate Control Plane для цього вузла.
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 pb-0">
            {verdict ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <span className="text-sm font-medium">Статус:</span>
                  <span className={`text-sm font-bold ${verdict.allowed ? 'text-green-500' : 'text-red-500'}`}>
                    {verdict.allowed ? 'PASSED' : 'BLOCKED'}
                  </span>
                </div>
                
                {verdict.reason && (
                  <div className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <h4 className="text-sm font-semibold mb-1">Причина:</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{verdict.reason}</p>
                  </div>
                )}

                {verdict.metadata && Object.keys(verdict.metadata).length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold mb-2">Метадані (Evidence):</h4>
                    <ScrollArea className="h-[200px] w-full rounded-md border p-3 bg-slate-50 dark:bg-slate-900">
                      <pre className="text-xs font-mono">
                        {JSON.stringify(verdict.metadata, null, 2)}
                      </pre>
                    </ScrollArea>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-[150px] items-center justify-center text-sm text-slate-500">
                Дані відсутні або гейт ще не виконано.
              </div>
            )}
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Закрити</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
