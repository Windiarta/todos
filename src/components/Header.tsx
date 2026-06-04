import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Plus, Sparkles, Send, Loader2, AlertCircle, CheckCircle2, X, Settings, Bot } from 'lucide-react';

export const Header: React.FC = () => {
  const { 
    filterType, 
    searchQuery, 
    setSearchQuery, 
    toggleCreateModal, 
    toggleCommandMenu,
    activeProjectId,
    projects,
    toggleEditProject,
    toggleCopilot,
    isCopilotOpen
  } = useApp();

  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<any | null>(null);
  const [showResults, setShowResults] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }
    if (showResults) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showResults]);

  const activeProject = projects.find(p => p.id === activeProjectId);

  const hasIntegrations = activeProject && (
    activeProject.slackChannel || 
    activeProject.discordChannel
  );

  const handleSendHello = async () => {
    if (!activeProject) return;

    // Toggle close if already showing and not loading
    if (showResults && !isTesting) {
      setShowResults(false);
      return;
    }

    setIsTesting(true);
    setTestResults(null);
    setShowResults(false);

    try {
      const response = await fetch(`/api/projects/${activeProject.id}/send-hello`, {
        method: 'POST'
      });
      if (response.ok) {
        const data = await response.json();
        setTestResults(data);
        setShowResults(true);
      } else {
        throw new Error('Failed to send hello connection test');
      }
    } catch (error: any) {
      console.error(error);
      setTestResults({
        slackWebhook: 'failed',
        discordWebhook: 'failed',
        slackBot: 'failed',
        discordBot: 'failed',
        error: error.message
      });
      setShowResults(true);
    } finally {
      setIsTesting(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <span style={{ color: '#2ea44f', backgroundColor: 'rgba(46, 164, 79, 0.1)', padding: '2px 6px', borderRadius: '3px', fontWeight: 500, fontSize: '10px' }}>
            Connected
          </span>
        );
      case 'failed':
        return (
          <span style={{ color: '#cb2431', backgroundColor: 'rgba(203, 36, 49, 0.1)', padding: '2px 6px', borderRadius: '3px', fontWeight: 500, fontSize: '10px' }}>
            Failed
          </span>
        );
      case 'not_configured':
      default:
        return (
          <span style={{ color: 'var(--text-tertiary)', backgroundColor: 'rgba(110, 118, 129, 0.1)', padding: '2px 6px', borderRadius: '3px', fontWeight: 500, fontSize: '10px' }}>
            Not Configured
          </span>
        );
    }
  };

  const getBreadcrumbTitle = () => {
    if (activeProject) {
      return activeProject.name;
    }
    switch (filterType) {
      case 'inbox': return 'Inbox';
      case 'my_issues': return 'My Issues';
      case 'urgent': return 'Urgent Issues';
      case 'all':
      default: return 'All Issues';
    }
  };

  return (
    <header className="workspace-header">
      <div className="header-left">
        <div className="breadcrumbs">
          <span>Workspace</span>
          <span style={{ color: 'var(--text-tertiary)' }}>/</span>
          {activeProject && (
            <>
              <span style={{ color: 'var(--text-tertiary)' }}>Projects</span>
              <span style={{ color: 'var(--text-tertiary)' }}>/</span>
            </>
          )}
          <span style={{ color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center' }}>
            {getBreadcrumbTitle()}
            {activeProject && (
              <button
                onClick={() => toggleEditProject(true, activeProject)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2px',
                  borderRadius: '4px',
                  marginLeft: '6px',
                  verticalAlign: 'middle'
                }}
                className="btn-icon"
                title="Project Settings"
              >
                <Settings size={13} />
              </button>
            )}
          </span>
        </div>
      </div>

      <div className="header-right">
        <div className="search-container">
          <input 
            type="text" 
            placeholder="Search issues..." 
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search size={14} />
        </div>

        <div className="header-actions">
          {hasIntegrations && (
            <div style={{ position: 'relative' }}>
              <button 
                className="btn-secondary" 
                onClick={handleSendHello}
                disabled={isTesting}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  borderColor: 'rgba(94, 106, 210, 0.3)',
                  backgroundColor: 'rgba(94, 106, 210, 0.03)'
                }}
                title="Send a hello test message to configured Slack/Discord channels"
              >
                {isTesting ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Send size={13} />
                )}
                <span>Send Hello</span>
              </button>

              {showResults && testResults && (
                <div 
                  ref={resultsRef}
                  className="card"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '290px',
                    padding: '14px',
                    zIndex: 100,
                    boxShadow: 'var(--shadow-lg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(20, 21, 23, 0.85)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    animation: 'fadeIn 0.15s ease-out'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={12} style={{ color: 'var(--primary-color)' }} />
                      <span style={{ fontWeight: 600, fontSize: '11px', color: 'var(--text-primary)' }}>Connection Test</span>
                    </div>
                    <button 
                      onClick={() => setShowResults(false)}
                      style={{ 
                        color: 'var(--text-tertiary)', 
                        background: 'none', 
                        border: 'none', 
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '4px',
                        transition: 'background-color 0.2s, color 0.2s',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--text-primary)';
                        e.currentTarget.style.backgroundColor = 'var(--border-hover)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--text-tertiary)';
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      title="Close"
                    >
                      <X size={12} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '11px' }}>
                    {/* Slack Webhook */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Slack Webhook</span>
                        {renderStatusBadge(testResults.slackWebhook)}
                      </div>
                      {testResults.errors?.slackWebhook && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', color: 'var(--error-color)', fontSize: '10px', opacity: 0.9, backgroundColor: 'rgba(226, 72, 72, 0.05)', padding: '4px 6px', borderRadius: '4px', marginTop: '2px', wordBreak: 'break-all' }}>
                          <AlertCircle size={10} style={{ flexShrink: 0, marginTop: '1px' }} />
                          <span>{testResults.errors.slackWebhook}</span>
                        </div>
                      )}
                    </div>

                    {/* Discord Webhook */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Discord Webhook</span>
                        {renderStatusBadge(testResults.discordWebhook)}
                      </div>
                      {testResults.errors?.discordWebhook && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', color: 'var(--error-color)', fontSize: '10px', opacity: 0.9, backgroundColor: 'rgba(226, 72, 72, 0.05)', padding: '4px 6px', borderRadius: '4px', marginTop: '2px', wordBreak: 'break-all' }}>
                          <AlertCircle size={10} style={{ flexShrink: 0, marginTop: '1px' }} />
                          <span>{testResults.errors.discordWebhook}</span>
                        </div>
                      )}
                    </div>

                    {/* Slack Chatbot */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Slack Chatbot</span>
                        {renderStatusBadge(testResults.slackBot)}
                      </div>
                      {testResults.errors?.slackBot && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', color: 'var(--error-color)', fontSize: '10px', opacity: 0.9, backgroundColor: 'rgba(226, 72, 72, 0.05)', padding: '4px 6px', borderRadius: '4px', marginTop: '2px', wordBreak: 'break-word' }}>
                          <AlertCircle size={10} style={{ flexShrink: 0, marginTop: '1px' }} />
                          <span>{testResults.errors.slackBot}</span>
                        </div>
                      )}
                    </div>

                    {/* Discord Chatbot */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Discord Chatbot</span>
                        {renderStatusBadge(testResults.discordBot)}
                      </div>
                      {testResults.errors?.discordBot && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', color: 'var(--error-color)', fontSize: '10px', opacity: 0.9, backgroundColor: 'rgba(226, 72, 72, 0.05)', padding: '4px 6px', borderRadius: '4px', marginTop: '2px', wordBreak: 'break-word' }}>
                          <AlertCircle size={10} style={{ flexShrink: 0, marginTop: '1px' }} />
                          <span>{testResults.errors.discordBot}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <button 
            className="btn-secondary" 
            onClick={() => toggleCopilot()}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              border: isCopilotOpen ? '1px solid var(--primary-color)' : '1px solid var(--border-color)', 
              background: isCopilotOpen ? 'rgba(94, 106, 210, 0.1)' : 'transparent' 
            }}
            title="Toggle AI Copilot Panel"
          >
            <Bot size={13} style={{ color: isCopilotOpen ? 'var(--primary-color)' : 'var(--text-secondary)' }} />
            <span style={{ color: 'var(--text-primary)', fontSize: '11px' }}>Copilot</span>
          </button>

          <button 
            className="btn-secondary" 
            onClick={() => toggleCommandMenu(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(138, 43, 226, 0.25)', background: 'rgba(138, 43, 226, 0.03)' }}
            title="Open AI Command Menu (Cmd+K)"
          >
            <Sparkles size={13} style={{ color: 'var(--ai-purple)' }} />
            <span style={{ color: 'var(--text-primary)', fontSize: '11px' }}>AI Assist</span>
            <kbd className="command-shortcut" style={{ fontSize: '9px', marginLeft: '2px' }}>⌘K</kbd>
          </button>

          <button 
            className="btn-primary" 
            onClick={() => toggleCreateModal(true)}
          >
            <Plus size={14} />
            <span>New Issue</span>
            <kbd className="command-shortcut" style={{ fontSize: '9px', backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', border: 'none' }}>C</kbd>
          </button>
        </div>
      </div>
    </header>
  );
};

