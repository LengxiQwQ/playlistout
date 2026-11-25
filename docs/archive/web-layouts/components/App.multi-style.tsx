import React, { useState, useCallback, useEffect } from 'react';
import { recordVisit } from './api/client';
import { LanguageProvider, useTranslation } from './i18n';
import { setClarityTag } from './analytics/clarity';
import { Header } from './components/layout/Header';
import { Hero } from './components/layout/Hero';
import { SearchNote } from './components/playlist/SearchNote';
import { ResultPaper } from './components/playlist/ResultPaper';
import { UserPlaylistsPaper } from './components/playlist/UserPlaylistsPaper';
import { InfoNotes } from './components/layout/InfoNotes';
import { PluginEcosystem } from './components/ecosystem/PluginEcosystem';
// import { DesktopCliSection } from './components/desktop/DesktopCliSection';
import { DeveloperPanel } from './components/developer/DeveloperPanel';
import { StatsJournal, RunningDaysStamp } from './components/stats/StatsJournal';
import { Footer } from './components/layout/Footer';
import { PrivacyModal } from './components/PrivacyModal';
import { DisambiguationModal } from './components/playlist/DisambiguationModal';
import { BinderSpine } from './components/layout/BinderSpine';
import { BackgroundDecorations } from './components/layout/BackgroundDecorations';
import { useBaselineGrid } from './hooks/useBaselineGrid';
import { useViewMode } from './hooks/useViewMode';
import { useDisambiguation } from './hooks/useDisambiguation';
import { useChannelCache } from './hooks/useChannelCache';
import { usePlaylistParser } from './hooks/usePlaylistParser';
import { StyleProvider, useJournalStyle } from './components/settings/StyleContext';
import { LayoutDemoView } from './components/layout-demo/LayoutDemoViews';

export const AppContent: React.FC = () => {
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const { language } = useTranslation();

  const { viewMode, setViewMode, saveScrollPosition, returnToBatch, resetViewMode } = useViewMode('single');
  const {
    isDisambiguationOpen, disambiguationCandidates, disambiguationQueryId,
    openDisambiguation, closeDisambiguation, resetDisambiguation,
  } = useDisambiguation();
  const { getCachedChannel, setCachedChannel, clearChannelCache } = useChannelCache();

  const scrollToTop = useCallback(() => {
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const scrollToElement = useCallback((elementId: string) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const el = document.getElementById(elementId);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      requestAnimationFrame(() => {
        const lazyEl = document.getElementById(elementId);
        if (lazyEl && typeof lazyEl.scrollIntoView === 'function') {
          lazyEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }
  }, []);

  const {
    inputUrl, setInputUrl, state, setState, playlist, userPlaylists,
    hasCollision, error, feedbackSubmitted, handleParse, handleReload,
    handleReset, handleQuickSample, handleFeedback, handleSwitchChannel,
    handleViewAllUserPlaylists, handleDrilldownToSingle,
    handleSelectDisambiguationPlaylist, handleSelectDisambiguationUser,
  } = usePlaylistParser({
    scrollToTop, scrollToElement, setCachedChannel, getCachedChannel,
    setViewMode, openDisambiguation, closeDisambiguation, resetDisambiguation,
    resetViewMode, clearChannelCache, saveScrollPosition,
  });

  useEffect(() => {
    recordVisit();
    if (typeof window !== 'undefined' && window.location) {
      const hash = window.location.hash.toLowerCase();
      if (hash.startsWith('#/dashboard') || hash.startsWith('#dashboard')) {
        window.location.replace('/dashboard/' + window.location.search);
      }
    }
  }, []);

  useEffect(() => {
    setClarityTag('language', language);
  }, [language]);

  const handleReturnToBatch = useCallback(() => {
    setState('success');
    returnToBatch(Boolean(userPlaylists));
  }, [setState, returnToBatch, userPlaylists]);

  const { styleId, styleSwitchCount } = useJournalStyle();

  useBaselineGrid([state, playlist, userPlaylists, styleId]);

  const headerNode = <Header onBrandClick={handleReset} />;
  const heroNode = <Hero />;
  const searchNode = (
    <SearchNote
      inputUrl={inputUrl}
      onInputChange={setInputUrl}
      onClear={() => setInputUrl('')}
      onParse={() => handleParse()}
      isLoading={state === 'loading'}
      error={state === 'error' ? error : null}
      onRetry={() => handleParse()}
      onFeedback={handleFeedback}
      feedbackSubmitted={feedbackSubmitted}
      onSelectSample={handleQuickSample}
    />
  );

  const singleResultNode =
    (state === 'success' || (state === 'loading' && Boolean(playlist))) && viewMode === 'single' && playlist ? (
      <ResultPaper
        playlist={playlist}
        onReset={handleReset}
        onReturnToBatch={userPlaylists ? handleReturnToBatch : undefined}
        onReload={handleReload}
        onSwitchChannel={handleSwitchChannel}
        isReloading={state === 'loading'}
        onViewAllUserPlaylists={handleViewAllUserPlaylists}
      />
    ) : null;

  const batchResultNode =
    state === 'success' && viewMode === 'batch' && userPlaylists ? (
      <UserPlaylistsPaper
        userData={userPlaylists}
        onReset={handleReset}
        onSelectSinglePlaylist={handleDrilldownToSingle}
        hasSinglePlaylistCollision={hasCollision}
      />
    ) : null;

  const resultNode = singleResultNode || batchResultNode;
  const ecosystemNode = <PluginEcosystem />;
  const infoNotesNode = <InfoNotes />;
  const statsNode = <StatsJournal />;
  const developerNode = <DeveloperPanel />;
  const stampNode = <RunningDaysStamp />;
  const footerNode = <Footer onOpenPrivacy={() => setIsPrivacyOpen(true)} />;

  return (
    <>
      {/* Loose-leaf Binder Spine on Left Margin (Desktop only, dynamically adapts to page length) */}
      <BinderSpine dependencies={[state, playlist, userPlaylists, styleId]} />
      <div className="journal-margin-line" aria-hidden="true" />

      <div className="journal-container" style={{ position: 'relative' }}>
        <BackgroundDecorations />

        {styleId === 'legacy' ? (
          <>
            {headerNode}
            <main key={`legacy-${styleSwitchCount}`}>
              {heroNode}

              {/* Search Note (PERSISTENT across idle, loading, error, and success) */}
              <div className="baseline-grid-snap">{searchNode}</div>

              {/* Result Paper (Single Playlist) */}
              {singleResultNode && <div className="baseline-grid-snap">{singleResultNode}</div>}

              {/* User Playlists Paper (Batch Collection) */}
              {batchResultNode && <div className="baseline-grid-snap">{batchResultNode}</div>}

              {/* Open-source player plugin ecosystem — after parsed playlist results */}
              <div className="baseline-grid-snap">{ecosystemNode}</div>

              {/* Educational Stationery Notes */}
              <div className="baseline-grid-snap">{infoNotesNode}</div>

              {/* Aggregate Public Stats Journal */}
              <div className="baseline-grid-snap">{statsNode}</div>

              {/* Developer entry points — intentionally last for users who explore the project deeply */}
              <div className="baseline-grid-snap">
                {developerNode}
                {stampNode}
              </div>
            </main>

            <div className="baseline-grid-snap">{footerNode}</div>
          </>
        ) : (
          <LayoutDemoView
            key={`${styleId}-${styleSwitchCount}`}
            mode={styleId}
            slots={{
              header: headerNode,
              hero: heroNode,
              search: searchNode,
              result: resultNode,
              ecosystem: ecosystemNode,
              infoNotes: infoNotesNode,
              stats: statsNode,
              developer: developerNode,
              stamp: stampNode,
              footer: footerNode,
              onBrandClick: handleReset,
            }}
          />
        )}

        <PrivacyModal
          isOpen={isPrivacyOpen}
          onClose={() => setIsPrivacyOpen(false)}
        />

        <DisambiguationModal
          isOpen={isDisambiguationOpen}
          onClose={closeDisambiguation}
          queryId={disambiguationQueryId}
          candidates={disambiguationCandidates}
          onSelectPlaylist={handleSelectDisambiguationPlaylist}
          onSelectUserPlaylists={handleSelectDisambiguationUser}
        />
      </div>
    </>
  );
};

export const App: React.FC = () => {
  return (
    <LanguageProvider defaultLanguage="zh-CN">
      <StyleProvider>
        <AppContent />
      </StyleProvider>
    </LanguageProvider>
  );
};

export default App;
