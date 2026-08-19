import { useState } from 'react';
import { AdrTimelineView } from '@/components/adr/AdrTimelineView';
import { AdrViewer } from '@/components/adr/AdrViewer';
import { type AdrRecord } from '@/lib/adr/parser';

export function AdrPage() {
  const [selectedAdr, setSelectedAdr] = useState<AdrRecord | null>(null);

  if (selectedAdr) {
    return <AdrViewer adr={selectedAdr} onBack={() => setSelectedAdr(null)} />;
  }

  return <AdrTimelineView onSelectAdr={setSelectedAdr} />;
}
