import { useState, useCallback } from 'react';
import type { DisambiguationItem } from '../components/playlist/DisambiguationModal';

export interface UseDisambiguationReturn {
  isDisambiguationOpen: boolean;
  disambiguationCandidates: DisambiguationItem[];
  disambiguationQueryId: string;
  openDisambiguation: (candidates: DisambiguationItem[], queryId: string) => void;
  closeDisambiguation: () => void;
  resetDisambiguation: () => void;
}

export function useDisambiguation(): UseDisambiguationReturn {
  const [isDisambiguationOpen, setIsDisambiguationOpen] = useState(false);
  const [disambiguationCandidates, setDisambiguationCandidates] = useState<DisambiguationItem[]>([]);
  const [disambiguationQueryId, setDisambiguationQueryId] = useState('');

  const openDisambiguation = useCallback((candidates: DisambiguationItem[], queryId: string) => {
    setDisambiguationCandidates(candidates);
    setDisambiguationQueryId(queryId);
    setIsDisambiguationOpen(true);
  }, []);

  const closeDisambiguation = useCallback(() => {
    setIsDisambiguationOpen(false);
  }, []);

  const resetDisambiguation = useCallback(() => {
    setIsDisambiguationOpen(false);
    setDisambiguationCandidates([]);
    setDisambiguationQueryId('');
  }, []);

  return {
    isDisambiguationOpen,
    disambiguationCandidates,
    disambiguationQueryId,
    openDisambiguation,
    closeDisambiguation,
    resetDisambiguation,
  };
}
