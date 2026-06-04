import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Bot, User, Send, X, Trash2, Sparkles, Terminal, ArrowRight, Loader2 } from 'lucide-react';

export const AiCopilot: React.FC = () => {
  const {
    isCopilotOpen,
    toggleCopilot,
    copilotMessages,
    sendMessageToCopilot,
    clearCopilotHistory,
    activeProjectId,
    projects
  } = useApp();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeProject = projects.find(p => p.id === activeProjectId);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [copilotMessages]);

  // Focus input when panel is opened
  useEffect(() => {
    if (isCopilotOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isCopilotOpen]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    setInput('');
    await sendMessageToCopilot(text.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  const suggestionPrompts = [
    { text: 'List all issues in this project', label: 'List issues' },
    { text: 'Create a low priority ticket named "Write tests for AI connectors" with description "Implement end to end integration tests for chatbot loop"', label: 'Create ticket' },
    { text: 'Add a comment to issue LIN-1 saying "I am looking into this"', label: 'Add comment' },
    { text: 'What is the status of active tasks?', label: 'Check status' }
  ];

  // Inline markdown tokenizer - handles bold, italic, code, links
  const formatInlineMarkdown = (text: string): React.ReactNode[] => {
    if (!text) return [];
    // Split on inline tokens while preserving the delimiters
    const tokenRegex = /(`[^`]+`|\*\*(?:[^*]|\*(?!\*))+\*\*|__(?:[^_]|_(?!_))+__|(?<!\*)\*(?:[^*\n])+\*(?!\*)|\[([^\]]+)\]\(([^)]+)\))/g;
    const result: React.ReactNode[] = [];
    let lastIdx = 0;

    let match: RegExpExecArray | null;
    while ((match = tokenRegex.exec(text)) !== null) {
      // Push plain text before this token
      if (match.index > lastIdx) {
        result.push(text.slice(lastIdx, match.index));
      }

      const token = match[0];

      if (token.startsWith('`') && token.endsWith('`')) {
        result.push(
          <code key={match.index} style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '3px', padding: '1px 5px', fontFamily: 'monospace', fontSize: '10.5px', color: '#93c5fd' }}>
            {token.slice(1, -1)}
          </code>
        );
      } else if (token.startsWith('**') && token.endsWith('**')) {
        result.push(<strong key={match.index} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{token.slice(2, -2)}</strong>);
      } else if (token.startsWith('__') && token.endsWith('__')) {
        result.push(<strong key={match.index} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{token.slice(2, -2)}</strong>);
      } else if (token.startsWith('*') && token.endsWith('*')) {
        result.push(<em key={match.index} style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>{token.slice(1, -1)}</em>);
      } else if (token.startsWith('[')) {
        const linkMatch = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
          result.push(<a key={match.index} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)', textDecoration: 'underline', fontWeight: 500 }}>{linkMatch[1]}</a>);
        } else {
          result.push(token);
        }
      } else {
        result.push(token);
      }

      lastIdx = match.index + token.length;
    }
    // Push remaining plain text
    if (lastIdx < text.length) {
      result.push(text.slice(lastIdx));
    }
    return result;
  };

  // Block-based markdown parser - groups consecutive lists and handles code fences
  const renderMessageContent = (text: string): React.ReactNode => {
    if (!text) return null;

    type Block =
      | { type: 'heading'; level: 1 | 2 | 3; content: string }
      | { type: 'ul'; items: string[] }
      | { type: 'ol'; items: string[] }
      | { type: 'checkbox'; items: { checked: boolean; text: string }[] }
      | { type: 'blockquote'; content: string }
      | { type: 'code'; lang: string; content: string }
      | { type: 'paragraph'; content: string }
      | { type: 'spacer' };

    const lines = text.split('\n');
    const blocks: Block[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Code fence
      if (line.trim().startsWith('```')) {
        const lang = line.trim().slice(3).trim();
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        blocks.push({ type: 'code', lang, content: codeLines.join('\n') });
        i++; // skip closing ```
        continue;
      }

      // Headings
      if (/^###\s/.test(line)) { blocks.push({ type: 'heading', level: 3, content: line.replace(/^###\s/, '') }); i++; continue; }
      if (/^##\s/.test(line))  { blocks.push({ type: 'heading', level: 2, content: line.replace(/^##\s/, '') }); i++; continue; }
      if (/^#\s/.test(line))   { blocks.push({ type: 'heading', level: 1, content: line.replace(/^#\s/, '') }); i++; continue; }

      // Ordered list - group consecutive
      if (/^\d+\.\s/.test(line)) {
        const items: string[] = [];
        while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
          items.push(lines[i].replace(/^\d+\.\s/, ''));
          i++;
        }
        blocks.push({ type: 'ol', items });
        continue;
      }

      // Checkboxes - group consecutive
      if (/^- \[[ xX]\] /.test(line)) {
        const items: { checked: boolean; text: string }[] = [];
        while (i < lines.length && /^- \[[ xX]\] /.test(lines[i])) {
          const checked = /^- \[[xX]\] /.test(lines[i]);
          items.push({ checked, text: lines[i].replace(/^- \[[ xX]\] /, '') });
          i++;
        }
        blocks.push({ type: 'checkbox', items });
        continue;
      }

      // Unordered list - group consecutive
      if (/^[-*•]\s/.test(line)) {
        const items: string[] = [];
        while (i < lines.length && /^[-*•]\s/.test(lines[i])) {
          items.push(lines[i].replace(/^[-*•]\s/, ''));
          i++;
        }
        blocks.push({ type: 'ul', items });
        continue;
      }

      // Blockquote
      if (/^>\s/.test(line)) {
        blocks.push({ type: 'blockquote', content: line.replace(/^>\s/, '') });
        i++; continue;
      }

      // Spacer
      if (line.trim() === '') {
        blocks.push({ type: 'spacer' });
        i++; continue;
      }

      // Paragraph
      blocks.push({ type: 'paragraph', content: line });
      i++;
    }

    return blocks.map((block, bIdx) => {
      switch (block.type) {
        case 'heading': {
          const sizes = { 1: '15px', 2: '13px', 3: '12px' };
          const margins = { 1: '14px 0 6px', 2: '12px 0 5px', 3: '10px 0 4px' };
          return (
            <div key={bIdx} style={{ fontSize: sizes[block.level], fontWeight: 700, color: 'var(--text-primary)', margin: margins[block.level], lineHeight: '1.3' }}>
              {formatInlineMarkdown(block.content)}
            </div>
          );
        }

        case 'ul':
          return (
            <ul key={bIdx} style={{ paddingLeft: '0', margin: '6px 0', listStyle: 'none' }}>
              {block.items.map((item, iIdx) => (
                <li key={iIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', margin: '3px 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  <span style={{ color: 'var(--primary-color)', marginTop: '5px', fontSize: '8px', flexShrink: 0 }}>●</span>
                  <span>{formatInlineMarkdown(item)}</span>
                </li>
              ))}
            </ul>
          );

        case 'ol':
          return (
            <ol key={bIdx} style={{ paddingLeft: '0', margin: '6px 0', listStyle: 'none', counterReset: 'item' }}>
              {block.items.map((item, iIdx) => (
                <li key={iIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', margin: '3px 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  <span style={{ color: 'var(--primary-color)', fontWeight: 700, fontSize: '11px', minWidth: '14px', flexShrink: 0 }}>{iIdx + 1}.</span>
                  <span>{formatInlineMarkdown(item)}</span>
                </li>
              ))}
            </ol>
          );

        case 'checkbox':
          return (
            <div key={bIdx} style={{ margin: '6px 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {block.items.map((item, iIdx) => (
                <div key={iIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                  <div style={{ width: '13px', height: '13px', borderRadius: '3px', border: `1px solid ${item.checked ? 'var(--primary-color)' : 'rgba(255,255,255,0.2)'}`, background: item.checked ? 'var(--primary-color)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {item.checked && <span style={{ color: 'white', fontSize: '9px', lineHeight: 1 }}>✓</span>}
                  </div>
                  <span style={{ textDecoration: item.checked ? 'line-through' : 'none', color: item.checked ? 'var(--text-tertiary)' : 'var(--text-secondary)' }}>
                    {formatInlineMarkdown(item.text)}
                  </span>
                </div>
              ))}
            </div>
          );

        case 'blockquote':
          return (
            <div key={bIdx} style={{ borderLeft: '2px solid var(--primary-color)', paddingLeft: '10px', color: 'var(--text-tertiary)', fontStyle: 'italic', margin: '8px 0', fontSize: '11.5px', lineHeight: '1.5', opacity: 0.8 }}>
              {formatInlineMarkdown(block.content)}
            </div>
          );

        case 'code':
          return (
            <pre key={bIdx} style={{ backgroundColor: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '10px 12px', fontSize: '11px', fontFamily: '"Fira Code", "Cascadia Code", monospace', overflowX: 'auto', margin: '8px 0', color: '#93c5fd', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '1.5' }}>
              <code>{block.content}</code>
            </pre>
          );

        case 'spacer':
          return <div key={bIdx} style={{ height: '8px' }} />;

        case 'paragraph':
        default:
          return (
            <p key={bIdx} style={{ margin: '4px 0', color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.6' }}>
              {formatInlineMarkdown((block as any).content ?? '')}
            </p>
          );
      }
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '420px',
        maxWidth: '100%',
        background: 'rgba(20, 21, 23, 0.82)',
        backdropFilter: 'blur(16px) saturate(180%)',
        borderLeft: '1px solid var(--border-hover)',
        boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
        zIndex: 110,
        display: 'flex',
        flexDirection: 'column',
        transform: isCopilotOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: 'rgba(94, 106, 210, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(94, 106, 210, 0.3)',
            }}
          >
            <Bot size={15} style={{ color: 'var(--primary-color)' }} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>AI Copilot</div>
            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
              Connected to {activeProject ? `#${activeProject.name}` : 'Workspace'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {copilotMessages.length > 0 && (
            <button
              onClick={clearCopilotHistory}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--error-color)';
                e.currentTarget.style.backgroundColor = 'rgba(226, 72, 72, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-tertiary)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="Clear Conversation History"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            onClick={() => toggleCopilot(false)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.backgroundColor = 'var(--border-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-tertiary)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Messages List Container */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {copilotMessages.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              textAlign: 'center',
              padding: '24px',
              color: 'var(--text-tertiary)',
              gap: '12px',
            }}
          >
            <Sparkles size={28} style={{ color: 'var(--primary-color)', opacity: 0.8 }} />
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Welcome to AI Copilot
            </div>
            <div style={{ fontSize: '11px', lineHeight: '1.5', maxWidth: '280px' }}>
              I can help you search, create, update tasks, add comments, and manage checklists in this workspace. Try a command below:
            </div>

            {/* Suggestions */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                width: '100%',
                marginTop: '16px',
              }}
            >
              {suggestionPrompts.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(s.text)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(94, 106, 210, 0.3)';
                    e.currentTarget.style.backgroundColor = 'rgba(94, 106, 210, 0.03)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  <span>{s.label}</span>
                  <ArrowRight size={10} style={{ opacity: 0.6 }} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          copilotMessages.map(msg => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                width: '100%',
                gap: '4px',
              }}
            >
              {/* Role Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '10px',
                  fontWeight: 600,
                  color: 'var(--text-tertiary)',
                  textTransform: 'uppercase',
                }}
              >
                {msg.role === 'user' ? (
                  <>
                    <span>You</span>
                    <User size={10} />
                  </>
                ) : (
                  <>
                    <Bot size={10} style={{ color: 'var(--primary-color)' }} />
                    <span>Copilot</span>
                  </>
                )}
              </div>

              {/* Content Bubble */}
              <div
                style={{
                  padding: msg.isExecuting ? '12px 16px' : '10px 14px',
                  borderRadius: '8px',
                  backgroundColor:
                    msg.role === 'user'
                      ? 'rgba(94, 106, 210, 0.15)'
                      : 'rgba(255, 255, 255, 0.02)',
                  border:
                    msg.role === 'user'
                      ? '1px solid rgba(94, 106, 210, 0.3)'
                      : '1px solid var(--border-color)',
                  maxWidth: '85%',
                  width: msg.isExecuting ? '100%' : 'auto',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {msg.isExecuting ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '11px' }}>
                    <Loader2 size={13} className="animate-spin" style={{ color: 'var(--primary-color)' }} />
                    <span style={{ fontWeight: 500 }}>AI is planning & executing workspace actions...</span>
                  </div>
                ) : (
                  renderMessageContent(msg.content)
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div
        style={{
          padding: '16px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ position: 'relative', display: 'flex' }}>
          <textarea
            ref={inputRef}
            rows={1}
            placeholder="Ask Copilot to do something..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              backgroundColor: 'rgba(0,0,0,0.3)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '10px 42px 10px 12px',
              fontSize: '12px',
              color: 'var(--text-primary)',
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
              lineHeight: '1.4',
            }}
          />
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim()}
            style={{
              position: 'absolute',
              right: '8px',
              top: '8px',
              background: input.trim() ? 'var(--primary-color)' : 'none',
              border: 'none',
              color: input.trim() ? 'white' : 'var(--text-tertiary)',
              cursor: input.trim() ? 'pointer' : 'default',
              padding: '5px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
          >
            <Send size={12} />
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px', color: 'var(--text-tertiary)', paddingLeft: '2px' }}>
          <Terminal size={9} />
          <span>Press Enter to send, Shift+Enter for new line</span>
        </div>
      </div>
    </div>
  );
};
