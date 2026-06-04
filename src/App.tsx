import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ListView } from './components/ListView';
import { BoardView } from './components/BoardView';
import { CreateIssueModal } from './components/CreateIssueModal';
import { CommandMenu } from './components/CommandMenu';
import { IssueDetailPanel } from './components/IssueDetailPanel';
import { SettingsModal } from './components/SettingsModal';
import { CreateProjectModal } from './components/CreateProjectModal';
import { EditProjectModal } from './components/EditProjectModal';
import { AiCopilot } from './components/AiCopilot';

const WorkspaceContent: React.FC = () => {
  const {
    viewType,
    setViewType,
    setFilterType,
    activeIssue,
    setActiveIssueId,
    isCreateModalOpen,
    toggleCreateModal,
    isCommandMenuOpen,
    toggleCommandMenu,
    isEditProjectOpen,
    toggleEditProject
  } = useApp();

  // Keyboard Shortcuts Listener
  useEffect(() => {
    let lastKey = '';
    let lastKeyTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        (activeEl as HTMLElement).isContentEditable
      );

      // 1. Global toggle shortcuts (always capture)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleCommandMenu();
        return;
      }

      if (e.key === 'Escape') {
        if (isCommandMenuOpen) {
          toggleCommandMenu(false);
          return;
        }
        if (isCreateModalOpen) {
          toggleCreateModal(false);
          return;
        }
        if (isEditProjectOpen) {
          toggleEditProject(false);
          return;
        }
        if (activeIssue) {
          setActiveIssueId(null);
          return;
        }
      }

      // If user is currently typing in input fields, ignore single-character triggers
      if (isTyping) return;

      // 2. Navigation / Action triggers
      if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        toggleCreateModal(true);
        return;
      }

      // Sequence key listening: g -> l, g -> b, g -> i
      const now = Date.now();
      if (lastKey === 'g' && now - lastKeyTime < 1000) {
        const key = e.key.toLowerCase();
        if (key === 'l') {
          e.preventDefault();
          setViewType('list');
          lastKey = '';
        } else if (key === 'b') {
          e.preventDefault();
          setViewType('board');
          lastKey = '';
        } else if (key === 'i') {
          e.preventDefault();
          setFilterType('inbox');
          lastKey = '';
        }
      }

      if (e.key.toLowerCase() === 'g') {
        lastKey = 'g';
        lastKeyTime = now;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isCommandMenuOpen, 
    isCreateModalOpen, 
    isEditProjectOpen,
    activeIssue, 
    toggleCommandMenu, 
    toggleCreateModal, 
    toggleEditProject,
    setViewType, 
    setFilterType, 
    setActiveIssueId
  ]);

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-viewport">
        <Header />
        <div className="split-layout">
          <div className="split-main">
            {viewType === 'list' ? <ListView /> : <BoardView />}
          </div>
          {activeIssue && <IssueDetailPanel />}
        </div>
      </main>

      <CreateIssueModal />
      <CommandMenu />
      <SettingsModal />
      <CreateProjectModal />
      <EditProjectModal />
      <AiCopilot />
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <WorkspaceContent />
    </AppProvider>
  );
}

export default App;
