import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  X, AlertTriangle, Eye, EyeOff, Save, Check, ChevronRight,
  Bot, MessageSquare, Settings, Plug, CheckCircle
} from 'lucide-react';

type Section = 'ai-models' | 'connectors' | 'mcp' | 'general';
type ModelProvider = 'gemini' | 'openai' | 'claude' | 'ollama';

const providerInfo: Record<ModelProvider, {
  name: string; subtitle: string; color: string; badge: string; placeholder: string; modelPlaceholder: string; tokenHint?: string;
}> = {
  gemini: {
    name: 'Google Gemini', subtitle: 'Fast, multimodal AI by Google DeepMind', color: '#4285F4',
    badge: 'Gemini', placeholder: 'AIza...', modelPlaceholder: 'gemini-2.0-flash', tokenHint: undefined
  },
  openai: {
    name: 'OpenAI GPT', subtitle: 'GPT-4o, o1, and beyond by OpenAI', color: '#10a37f',
    badge: 'OpenAI', placeholder: 'sk-proj-...', modelPlaceholder: 'gpt-4o', tokenHint: undefined
  },
  claude: {
    name: 'Anthropic Claude', subtitle: 'Claude 3.5 Sonnet and Opus by Anthropic', color: '#d97706',
    badge: 'Claude', placeholder: 'sk-ant-...', modelPlaceholder: 'claude-3-5-sonnet-20241022', tokenHint: undefined
  },
  ollama: {
    name: 'Ollama (Local)', subtitle: 'Self-hosted open-source LLMs on your machine', color: '#8b5cf6',
    badge: 'Local', placeholder: 'http://localhost:11434', modelPlaceholder: 'llama3.1', tokenHint: 'No API key needed'
  }
};

export const SettingsModal: React.FC = () => {
  const { isSettingsOpen, toggleSettings, fetchSettings, saveSettings } = useApp();

  const [section, setSection] = useState<Section>('ai-models');
  const [activeConnector, setActiveConnector] = useState<ModelProvider>('gemini');
  const [expandedProvider, setExpandedProvider] = useState<ModelProvider | null>(null);

  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [openaiModel, setOpenaiModel] = useState('');
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [anthropicModel, setAnthropicModel] = useState('');
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState('');
  const [ollamaModel, setOllamaModel] = useState('');

  const [slackBotToken, setSlackBotToken] = useState('');
  const [slackAppToken, setSlackAppToken] = useState('');
  const [discordBotToken, setDiscordBotToken] = useState('');

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (isSettingsOpen) {
      const load = async () => {
        setIsLoading(true);
        try {
          const s = await fetchSettings();
          setActiveConnector((s.active_ai_connector as ModelProvider) || 'gemini');
          setGeminiApiKey(s.gemini_api_key || '');
          setGeminiModel(s.gemini_model || '');
          setOpenaiApiKey(s.openai_api_key || '');
          setOpenaiModel(s.openai_model || '');
          setAnthropicApiKey(s.anthropic_api_key || '');
          setAnthropicModel(s.anthropic_model || '');
          setOllamaBaseUrl(s.ollama_base_url || '');
          setOllamaModel(s.ollama_model || '');
          setSlackBotToken(s.slack_bot_token || '');
          setSlackAppToken(s.slack_app_token || '');
          setDiscordBotToken(s.discord_bot_token || '');
          setSaveStatus('idle');
        } catch (err) {
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      };
      load();
    }
  }, [isSettingsOpen]);

  const handleClose = () => toggleSettings(false);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      await saveSettings({
        active_ai_connector: activeConnector,
        gemini_api_key: geminiApiKey,
        gemini_model: geminiModel,
        openai_api_key: openaiApiKey,
        openai_model: openaiModel,
        anthropic_api_key: anthropicApiKey,
        anthropic_model: anthropicModel,
        ollama_base_url: ollamaBaseUrl,
        ollama_model: ollamaModel,
        slack_bot_token: slackBotToken,
        slack_app_token: slackAppToken,
        discord_bot_token: discordBotToken,
      });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleShow = (key: string) => setShowKeys(p => ({ ...p, [key]: !p[key] }));

  if (!isSettingsOpen) return null;

  const navItems: { id: Section; icon: React.ReactNode; label: string; desc: string }[] = [
    { id: 'ai-models', icon: <Bot size={15} />, label: 'AI Models', desc: 'LLM providers & active connector' },
    { id: 'connectors', icon: <MessageSquare size={15} />, label: 'Connectors', desc: 'Slack & Discord bot tokens' },
    { id: 'mcp', icon: <Plug size={15} />, label: 'MCP Servers', desc: 'Model Context Protocol tools' },
    { id: 'general', icon: <Settings size={15} />, label: 'General', desc: 'Workspace preferences' },
  ];

  const inputStyle: React.CSSProperties = {
    width: '100%', backgroundColor: 'rgba(0,0,0,0.35)', border: '1px solid var(--border-color)',
    borderRadius: '4px', padding: '8px 40px 8px 10px', fontSize: '12px', color: 'var(--text-primary)',
    outline: 'none', transition: 'border-color 0.15s ease', boxSizing: 'border-box'
  };
  const labelStyle: React.CSSProperties = {
    fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px', display: 'block'
  };
  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px'
  };
  const sectionDescStyle: React.CSSProperties = {
    fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: '1.5', marginBottom: '20px'
  };

  const PasswordField = ({ id, value, onChange, placeholder }: { id: string; value: string; onChange: (v: string) => void; placeholder: string }) => (
    <div style={{ position: 'relative', display: 'flex' }}>
      <input
        type={showKeys[id] ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={inputStyle}
      />
      <button
        onClick={() => toggleShow(id)}
        style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 0 }}
      >
        {showKeys[id] ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );

  const TextField = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) => (
    <input type="text" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} style={{ ...inputStyle, paddingRight: '10px' }} />
  );

  const providers: ModelProvider[] = ['gemini', 'openai', 'claude', 'ollama'];

  const getKeyValue = (provider: ModelProvider) => {
    if (provider === 'gemini') return geminiApiKey;
    if (provider === 'openai') return openaiApiKey;
    if (provider === 'claude') return anthropicApiKey;
    return '';
  };
  const getModelValue = (provider: ModelProvider) => {
    if (provider === 'gemini') return geminiModel;
    if (provider === 'openai') return openaiModel;
    if (provider === 'claude') return anthropicModel;
    if (provider === 'ollama') return ollamaModel;
    return '';
  };
  const isConfigured = (provider: ModelProvider) => {
    if (provider === 'ollama') return !!ollamaBaseUrl;
    return !!getKeyValue(provider) && getKeyValue(provider) !== '';
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '760px', maxWidth: '95vw', maxHeight: '88vh',
          background: 'rgba(15, 16, 18, 0.95)',
          backdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 30, height: 30, borderRadius: '6px', background: 'rgba(94,106,210,0.15)', border: '1px solid rgba(94,106,210,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Settings size={14} style={{ color: 'var(--primary-color)' }} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Workspace Settings</div>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Manage AI models, connectors, and integrations</div>
            </div>
          </div>
          <button className="btn-icon" onClick={handleClose}><X size={15} /></button>
        </div>

        {/* Body: Sidebar + Content */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
          {/* Left Nav */}
          <div style={{ width: '188px', flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.06)', padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '9px', padding: '9px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.15s ease',
                  background: section === item.id ? 'rgba(94,106,210,0.12)' : 'transparent',
                  color: section === item.id ? 'var(--primary-color)' : 'var(--text-secondary)',
                }}
                onMouseEnter={e => { if (section !== item.id) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
                onMouseLeave={e => { if (section !== item.id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
              >
                <div style={{ marginTop: '1px', flexShrink: 0 }}>{item.icon}</div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: section === item.id ? 600 : 400, lineHeight: '1.2' }}>{item.label}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', lineHeight: '1.3', marginTop: '2px' }}>{item.desc}</div>
                </div>
              </button>
            ))}

            {/* Encryption badge */}
            <div style={{ marginTop: 'auto', padding: '10px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '6px', paddingTop: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                <CheckCircle size={10} style={{ color: '#10b981' }} />
                <span style={{ fontSize: '9px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Encrypted</span>
              </div>
              <p style={{ fontSize: '9px', color: 'var(--text-tertiary)', lineHeight: '1.4', margin: 0 }}>
                All credentials stored with AES-256-GCM encryption.
              </p>
            </div>
          </div>

          {/* Right Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            {isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-tertiary)', fontSize: '12px' }}>
                Loading settings...
              </div>
            ) : (
              <>
                {/* ── AI MODELS ── */}
                {section === 'ai-models' && (
                  <div>
                    <div style={sectionTitleStyle}>AI Models</div>
                    <div style={sectionDescStyle}>Select the active AI connector that powers the in-app Copilot chat and Slack/Discord chatbots. Configure each provider's API key and model below.</div>

                    {/* Active Connector Picker */}
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ ...labelStyle }}>Active AI Connector</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {providers.map(p => {
                          const info = providerInfo[p];
                          const active = activeConnector === p;
                          const configured = isConfigured(p);
                          return (
                            <button
                              key={p}
                              onClick={() => setActiveConnector(p)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease', border: `1px solid ${active ? info.color + '55' : 'rgba(255,255,255,0.06)'}`,
                                background: active ? `${info.color}12` : 'rgba(255,255,255,0.02)',
                              }}
                            >
                              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: configured ? info.color : 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{info.name}</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.subtitle}</div>
                              </div>
                              {active && (
                                <div style={{ flexShrink: 0, width: 16, height: 16, borderRadius: '50%', background: info.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Check size={9} style={{ color: 'white' }} />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ ...labelStyle }}>Provider Configuration</div>
                      {providers.map(p => {
                        const info = providerInfo[p];
                        const isOpen = expandedProvider === p;
                        const configured = isConfigured(p);
                        return (
                          <div key={p} style={{ border: `1px solid ${isOpen ? info.color + '33' : 'rgba(255,255,255,0.06)'}`, borderRadius: '8px', overflow: 'hidden', transition: 'border-color 0.2s' }}>
                            <button
                              onClick={() => setExpandedProvider(isOpen ? null : p)}
                              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                            >
                              <div style={{ width: 7, height: 7, borderRadius: '50%', background: configured ? info.color : 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                              <span style={{ flex: 1, fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>{info.name}</span>
                              {configured && <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '10px', background: `${info.color}20`, color: info.color, fontWeight: 600 }}>Configured</span>}
                              <ChevronRight size={13} style={{ color: 'var(--text-tertiary)', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                            </button>

                            {isOpen && (
                              <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ height: '10px' }} />
                                {p === 'ollama' ? (
                                  <>
                                    <div>
                                      <label style={labelStyle}>Ollama Base URL</label>
                                      <TextField value={ollamaBaseUrl} onChange={setOllamaBaseUrl} placeholder="http://localhost:11434" />
                                      <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '5px' }}>The URL where your local Ollama instance is running.</p>
                                    </div>
                                    <div>
                                      <label style={labelStyle}>Model Name</label>
                                      <TextField value={ollamaModel} onChange={setOllamaModel} placeholder={info.modelPlaceholder} />
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div>
                                      <label style={labelStyle}>{info.name} API Key</label>
                                      <PasswordField id={`key-${p}`} value={p === 'gemini' ? geminiApiKey : p === 'openai' ? openaiApiKey : anthropicApiKey} onChange={p === 'gemini' ? setGeminiApiKey : p === 'openai' ? setOpenaiApiKey : setAnthropicApiKey} placeholder={info.placeholder} />
                                    </div>
                                    <div>
                                      <label style={labelStyle}>Model Name</label>
                                      <TextField value={getModelValue(p)} onChange={p === 'gemini' ? setGeminiModel : p === 'openai' ? setOpenaiModel : setAnthropicModel} placeholder={info.modelPlaceholder} />
                                      <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '5px' }}>
                                        Leave blank to use the default: <code style={{ background: 'rgba(255,255,255,0.06)', padding: '0 3px', borderRadius: '2px' }}>{info.modelPlaceholder}</code>
                                      </p>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── CONNECTORS ── */}
                {section === 'connectors' && (
                  <div>
                    <div style={sectionTitleStyle}>Connectors</div>
                    <div style={sectionDescStyle}>Configure bot tokens for Slack and Discord. These allow the AI to listen to channel mentions and create tickets through conversations.</div>

                    {/* Slack */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ width: 30, height: 30, borderRadius: '7px', background: 'rgba(74,21,75,0.4)', border: '1px solid rgba(154,68,153,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>𝓢</div>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>Slack</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Socket Mode bot — @mention to create tickets</div>
                        </div>
                        {(slackBotToken && slackBotToken !== '••••••••') || (slackAppToken && slackAppToken !== '••••••••') ? null : (slackBotToken === '••••••••' && slackAppToken === '••••••••') && (
                          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#10b981' }}>
                            <CheckCircle size={11} /> Connected
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <label style={{ ...labelStyle, marginBottom: 0 }}>Bot Token</label>
                            <span style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>Starts with <code style={{ background: 'rgba(255,255,255,0.06)', padding: '0 3px', borderRadius: '2px' }}>xoxb-</code></span>
                          </div>
                          <PasswordField id="slack-bot" value={slackBotToken} onChange={setSlackBotToken} placeholder="xoxb-..." />
                        </div>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <label style={{ ...labelStyle, marginBottom: 0 }}>App Token</label>
                            <span style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>Starts with <code style={{ background: 'rgba(255,255,255,0.06)', padding: '0 3px', borderRadius: '2px' }}>xapp-</code></span>
                          </div>
                          <PasswordField id="slack-app" value={slackAppToken} onChange={setSlackAppToken} placeholder="xapp-..." />
                        </div>
                      </div>

                      <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(234,179,8,0.05)', border: '1px solid rgba(234,179,8,0.15)', borderRadius: '6px' }}>
                        <div style={{ fontSize: '10px', color: 'rgba(234,179,8,0.8)', lineHeight: '1.5' }}>
                          <strong>Setup:</strong> Create a Slack app at <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0 3px', borderRadius: '2px' }}>api.slack.com/apps</code> with <em>Event Subscriptions</em> and <em>Socket Mode</em> enabled. Requires <code>app_mentions:read</code> and <code>chat:write</code> scopes.
                        </div>
                      </div>
                    </div>

                    {/* Discord */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ width: 30, height: 30, borderRadius: '7px', background: 'rgba(88,101,242,0.2)', border: '1px solid rgba(88,101,242,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>⎈</div>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>Discord</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Gateway bot — @mention to create tickets</div>
                        </div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <label style={{ ...labelStyle, marginBottom: 0 }}>Bot Token</label>
                          <span style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>From Discord Developer Portal</span>
                        </div>
                        <PasswordField id="discord-bot" value={discordBotToken} onChange={setDiscordBotToken} placeholder="MTM4N..." />
                      </div>

                      <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(234,179,8,0.05)', border: '1px solid rgba(234,179,8,0.15)', borderRadius: '6px' }}>
                        <div style={{ fontSize: '10px', color: 'rgba(234,179,8,0.8)', lineHeight: '1.5' }}>
                          <strong>Setup:</strong> Create a bot at <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0 3px', borderRadius: '2px' }}>discord.com/developers</code>. Requires <em>Message Content Intent</em> and <em>Guilds</em> scopes. Add the bot to your server via OAuth2.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── MCP SERVERS ── */}
                {section === 'mcp' && (
                  <div>
                    <div style={sectionTitleStyle}>MCP Servers</div>
                    <div style={sectionDescStyle}>Model Context Protocol (MCP) enables the AI to use structured tools to interact with your workspace data. The following built-in tools are always available to the active AI model.</div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                      {[
                        { name: 'create_ticket', desc: 'Create a new issue with title, description, priority, and project', color: '#10b981' },
                        { name: 'list_issues', desc: 'Search and filter issues by project, status, assignee, or priority', color: '#3b82f6' },
                        { name: 'update_issue', desc: 'Modify an existing issue\'s status, priority, title, or assignee', color: '#f59e0b' },
                        { name: 'add_comment', desc: 'Post a comment to any issue thread', color: '#8b5cf6' },
                        { name: 'manage_subtasks', desc: 'Add, toggle, or remove subtasks on an issue', color: '#ec4899' },
                        { name: 'ask_for_clarification', desc: 'Request more details from the user before taking action', color: '#6b7280' },
                      ].map(tool => (
                        <div key={tool.name} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px' }}>
                          <div style={{ width: 8, height: 8, borderRadius: '2px', background: tool.color, marginTop: '5px', flexShrink: 0 }} />
                          <div>
                            <code style={{ fontSize: '11px', color: 'var(--text-primary)', fontFamily: 'monospace', fontWeight: 600 }}>{tool.name}</code>
                            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '3px 0 0', lineHeight: '1.4' }}>{tool.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ padding: '14px', background: 'rgba(94,106,210,0.06)', border: '1px solid rgba(94,106,210,0.2)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '6px' }}>
                        <Plug size={12} style={{ color: 'var(--primary-color)' }} />
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary-color)' }}>External MCP Clients</span>
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: '1.5', margin: 0 }}>
                        This workspace exposes a JSON-RPC 2.0 compatible MCP server via stdio at <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 5px', borderRadius: '3px', fontFamily: 'monospace', fontSize: '10px' }}>server/mcpServer.ts</code>. Connect any external MCP client (e.g. Claude Desktop, Cursor) to extend AI capabilities with your project data.
                      </p>
                      <div style={{ marginTop: '10px', padding: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', fontFamily: 'monospace', fontSize: '10px', color: '#38bdf8', whiteSpace: 'pre' }}>
                        {`node server/dist/mcpServer.js`}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── GENERAL ── */}
                {section === 'general' && (
                  <div>
                    <div style={sectionTitleStyle}>General</div>
                    <div style={sectionDescStyle}>Workspace-wide preferences and information.</div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>API Server</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: '1.6' }}>
                          Express backend running on port <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0 4px', borderRadius: '3px' }}>5001</code>. Frontend communicates via <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0 4px', borderRadius: '3px' }}>/api/*</code> proxy routes.
                        </div>
                      </div>

                      <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>Database</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: '1.6' }}>
                          PostgreSQL database. Configure connection via <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0 4px', borderRadius: '3px' }}>.env</code> file in the <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0 4px', borderRadius: '3px' }}>server/</code> directory.
                        </div>
                      </div>

                      <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>Security</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: '1.6' }}>
                          API keys and bot tokens are encrypted with AES-256-GCM before being stored. Set a custom encryption key via the <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0 4px', borderRadius: '3px' }}>ENCRYPTION_SECRET</code> environment variable.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, background: 'rgba(0,0,0,0.2)' }}>
          {saveStatus === 'success' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#10b981', fontSize: '11px', marginRight: 'auto' }}>
              <CheckCircle size={13} /> Settings saved and bots restarted!
            </div>
          )}
          {saveStatus === 'error' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ef4444', fontSize: '11px', marginRight: 'auto' }}>
              <AlertTriangle size={13} /> Failed to save. Please try again.
            </div>
          )}
          <button className="btn-secondary" onClick={handleClose} disabled={isSaving} style={{ fontSize: '12px' }}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={isSaving || isLoading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', opacity: isSaving || isLoading ? 0.6 : 1 }}
          >
            <Save size={13} />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};
