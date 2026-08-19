import { createFileRoute } from '@tanstack/react-router';
import { AdrPage } from '@/pages/AdrPage';

export const Route = createFileRoute('/adr')({
  component: AdrPage,
});
