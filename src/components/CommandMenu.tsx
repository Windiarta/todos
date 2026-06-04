import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Search, 
  Sparkles, 
  Plus, 
  Layers, 
  User, 
  Palette, 
  FileText,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { processAIChatCommand } from '../utils/aiEngine';

interface Command {
  id: string;
  label: string;
  category: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

export const CommandMenu: React.FC = () => {
  const {
    isCommandMenuOpen,
    toggleCommandMenu,
    toggleCreateModal,
    setFilterType,
    setViewType,
    setTheme,
    createIssue,
    setActiveIssueId
  } = useApp();

  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAiMode, setIsAiMode] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Sync state on close/open
  useEffect(() => {
    if (isCommandMenuOpen) {
      setQuery('');
      setSelectedIdx(0);
      setAiResponse(null);
      setIsAiLoading(false);
      setIsAiMode(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCommandMenuOpen]);

  // Handle Query prefix for AI
  useEffect(() => {
    if (query.toLowerCase().startsWith('ai ')) {
      setIsAiMode(true);
    } else if (query === '') {
      setIsAiMode(false);
    }
  }, [query]);

  if (!isCommandMenuOpen) return null;

  // Basic Commands List
  const baseCommands: Command[] = [
    {
      id: 'ask_ai',
      label: 'Ask Linear AI...',
      category: 'AI Assistant',
      icon: <Sparkles size={14} style={{ color: 'var(--ai-purple)' }} />,
      action: () => {
        setIsAiMode(true);
        setQuery('ai ');
        setSelectedIdx(0);
      }
    },
    {
      id: 'create_issue',
      label: 'Create new issue',
      category: 'Issues',
      icon: <Plus size={14} />,
      shortcut: 'C',
      action: () => {
        toggleCommandMenu(false);
        toggleCreateModal(true);
      }
    },
    {
      id: 'filter_mine',
      label: 'Filter by: Assigned to me',
      category: 'Filters',
      icon: <User size={14} />,
      shortcut: 'G I',
      action: () => {
        setFilterType('my_issues');
        toggleCommandMenu(false);
      }
    },
    {
      id: 'filter_clear',
      label: 'Clear active filters',
      category: 'Filters',
      icon: <Layers size={14} />,
      action: () => {
        setFilterType('all');
        toggleCommandMenu(false);
      }
    },
    {
      id: 'view_list',
      label: 'Switch to List View',
      category: 'Views',
      icon: <FileText size={14} />,
      shortcut: 'G L',
      action: () => {
        setViewType('list');
        toggleCommandMenu(false);
      }
    },
    {
      id: 'view_board',
      label: 'Switch to Board Kanban View',
      category: 'Views',
      icon: <Layers size={14} />,
      shortcut: 'G B',
      action: () => {
        setViewType('board');
        toggleCommandMenu(false);
      }
    },
    {
      id: 'theme_dark',
      label: 'Theme: Dark Mode',
      category: 'Preferences',
      icon: <Palette size={14} />,
      action: () => {
        setTheme('dark');
        toggleCommandMenu(false);
      }
    },
    {
      id: 'theme_light',
      label: 'Theme: Light Mode',
      category: 'Preferences',
      icon: <Palette size={14} />,
      action: () => {
        setTheme('light');
        toggleCommandMenu(false);
      }
    },
    {
      id: 'theme_dawn',
      label: 'Theme: Dawn Purple',
      category: 'Preferences',
      icon: <Palette size={14} />,
      action: () => {
        setTheme('dawn');
        toggleCommandMenu(false);
      }
    },
    {
      id: 'theme_dusk',
      label: 'Theme: Dusk Bronze',
      category: 'Preferences',
      icon: <Palette size={14} />,
      action: () => {
        setTheme('dusk');
        toggleCommandMenu(false);
      }
    }
  ];

  // Filter commands based on query (excluding "ai " prefix if in AI mode)
  const displayQuery = isAiMode ? query.replace(/^ai\s+/i, '') : query;
  const filteredCommands = baseCommands.filter(cmd => {
    if (isAiMode && cmd.id === 'ask_ai') return false; // Hide Ask AI inside AI Mode
    return cmd.label.toLowerCase().includes(displayQuery.toLowerCase()) || 
           cmd.category.toLowerCase().includes(displayQuery.toLowerCase());
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      toggleCommandMenu(false);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(prev => Math.min(prev + 1, filteredCommands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      
      // If AI mode is active and user hits enter, run AI NLP call!
      if (isAiMode) {
        handleAiSubmit();
      } else if (filteredCommands[selectedIdx]) {
        filteredCommands[selectedIdx].action();
      }
    }
  };

  const handleAiSubmit = async () => {
    if (!query.trim()) return;
    setIsAiLoading(true);
    setAiResponse(null);
    try {
      const response = await processAIChatCommand(query);
      setAiResponse(response.answer);

      // Perform response automated action if defined
      if (response.action) {
        setTimeout(async () => {
          const { type, payload } = response.action!;
          if (type === 'change_theme') {
            setTheme(payload.theme);
            toggleCommandMenu(false);
          } else if (type === 'filter_issues') {
            setFilterType(payload.filter);
            toggleCommandMenu(false);
          } else if (type === 'create_issue') {
            // Create issue using AI inputs
            try {
              const created = await createIssue({
                title: payload.title,
                description: payload.description,
                status: 'todo',
                priority: payload.priority,
                estimate: payload.estimate,
                labelIds: payload.labels
              });
              setActiveIssueId(created.id);
            } catch (err) {
              console.error(err);
            }
            toggleCommandMenu(false);
          }
        }, 1200);
      }
    } catch (e) {
      console.error(e);
      setAiResponse("Sorry, I encountered an error parsing that command.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(`ai ${suggestion}`);
    setIsAiMode(true);
    inputRef.current?.focus();
  };

  return (
    <div className="modal-overlay" onClick={() => toggleCommandMenu(false)}>
      <div 
        className={`command-menu ${isAiMode ? 'ai-active' : ''}`} 
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="command-input-wrapper">
          {isAiMode ? <Sparkles size={16} style={{ color: 'var(--ai-purple)' }} /> : <Search size={16} />}
          <input 
            type="text" 
            placeholder={isAiMode ? "Ask Linear AI or command e.g., 'create issue clean imports'..." : "Type a command or 'ai ' to ask assistant..."}
            className="command-menu-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            ref={inputRef}
          />
          {isAiMode && (
            <span className="ai-badge" style={{ fontSize: '8px' }}>Chat Active</span>
          )}
        </div>

        {/* AI Responses Window */}
        {(aiResponse || isAiLoading) && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.1)' }}>
            {isAiLoading ? (
              <div className="ai-sparkles-container" style={{ border: 'none', padding: 0, backgroundColor: 'transparent' }}>
                <div className="ai-typing-indicator">
                  <div className="ai-typing-dot"></div>
                  <div className="ai-typing-dot"></div>
                  <div className="ai-typing-dot"></div>
                </div>
                <span style={{ fontSize: '12px' }}>Linear AI is generating response...</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '600', color: 'var(--ai-purple)' }}>
                  <Sparkles size={11} />
                  <span>LINEAR AI RESPONSE</span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'pre-line', lineHeight: '1.4' }}>
                  {aiResponse}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="command-list-container" ref={listRef}>
          {isAiMode && !aiResponse && !isAiLoading && (
            <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span className="command-section-header" style={{ padding: 0 }}>Try AI Commands</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <button className="badge-label" onClick={() => handleSuggestionClick('create issue optimize database query')} style={{ cursor: 'pointer' }}>
                  "create issue optimize database query"
                </button>
                <button className="badge-label" onClick={() => handleSuggestionClick('theme dawn')} style={{ cursor: 'pointer' }}>
                  "theme dawn"
                </button>
                <button className="badge-label" onClick={() => handleSuggestionClick('show my issues')} style={{ cursor: 'pointer' }}>
                  "show my issues"
                </button>
                <button className="badge-label" onClick={() => handleSuggestionClick('shortcuts help')} style={{ cursor: 'pointer' }}>
                  "shortcuts help"
                </button>
              </div>
            </div>
          )}

          {!isAiMode && (
            <>
              <span className="command-section-header">Workspace commands</span>
              {filteredCommands.map((cmd, idx) => {
                const isSelected = selectedIdx === idx;
                return (
                  <div 
                    key={cmd.id}
                    className={`command-item ${isSelected ? 'selected' : ''}`}
                    onClick={cmd.action}
                    onMouseEnter={() => setSelectedIdx(idx)}
                  >
                    <div className="command-item-left">
                      {cmd.icon}
                      <span>{cmd.label}</span>
                    </div>
                    {cmd.shortcut && (
                      <span className="command-shortcut">{cmd.shortcut}</span>
                    )}
                  </div>
                );
              })}
              {filteredCommands.length === 0 && (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  No matching commands.
                </div>
              )}
            </>
          )}
        </div>

        <div className="command-footer">
          <div className="command-footer-hints">
            <div className="command-footer-hint">
              <kbd><ArrowUp size={10} style={{ verticalAlign: 'middle' }} /></kbd>
              <kbd><ArrowDown size={10} style={{ verticalAlign: 'middle' }} /></kbd>
              <span>to navigate</span>
            </div>
            <div className="command-footer-hint">
              <kbd>Enter</kbd>
              <span>to select</span>
            </div>
            <div className="command-footer-hint">
              <kbd>Esc</kbd>
              <span>to close</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={11} style={{ color: 'var(--ai-purple)' }} />
            <span>AI powered menu</span>
          </div>
        </div>
      </div>
    </div>
  );
};
