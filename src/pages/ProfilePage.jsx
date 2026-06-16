import { useState, useEffect, useRef } from "react";
import { useAppContext } from "../context/AppContext";
import { Card, Badge, Btn, ProgressBar } from "../components/UIComponents";
import {
  getUserSettings, saveUserSettings,
  getApiKeys, saveApiKey, deleteApiKey,
  getDefaultApi, setDefaultApi,
  getStreak, getBookmarks, getLearningProgress, getMonthlyCheckinStreak,
  uploadAvatar, updateUserProfile,
} from "../lib/supabase.js";
import {
  ChevronLeft, ChevronRight,
  Key, Pencil, Trash2, Plus, X, Check,
  Globe, BookOpen, Moon, Sun, Smartphone,
  Bell, Cloud, Upload, Download,
  HardDrive, FileText,
} from "lucide-react";
import ReminderPage from "./subsections/ReminderPage.jsx";

const IW = 1.5;

const ProfilePage = () => {
  const { userId, supaUser: user, colorMode, setColorMode, handleSignOut, setPage } = useAppContext();
  const onLogout = handleSignOut;
  const onNavigateToWords = () => setPage("words");

  const [dictDir, setDictDir] = useState("zh-th");
  const [webdavConnected, setWebdavConnected] = useState(false);
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [showReminderPage, setShowReminderPage] = useState(false);

  /* ── Stats state ── */
  const [streak, setStreak] = useState(0);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [checkinHistory, setCheckinHistory] = useState([]);
  const [showCheckinHistory, setShowCheckinHistory] = useState(false);

  /* ── Font selection state ── */
  const [showFontPage, setShowFontPage] = useState(false);
  const [zhFont, setZhFont] = useState("Noto Serif SC");
  const [thFont, setThFont] = useState("Sarabun");
  const zhFonts = ["Noto Sans SC", "Noto Serif SC"];
  const thFonts = ["Sarabun", "Noto Sans Thai", "Charm"];

  /* ── Profile editing state ── */
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef(null);

  /* ── WebDAV config state ── */
  const [showWebdavModal, setShowWebdavModal] = useState(false);
  const [webdavConfig, setWebdavConfig] = useState({ serverUrl: "", username: "", password: "" });

  /* ── API management state ── */
  const [showApiMgmt, setShowApiMgmt] = useState(false);
  const [showAddApi, setShowAddApi] = useState(false);
  const [apiKeys, setApiKeys] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState("openai");
  const [customApi, setCustomApi] = useState({ name: "", key: "", baseUrl: "", model: "" });
  const [editingApiId, setEditingApiId] = useState(null);
  const [defaultApiId, setDefaultApiId] = useState("system"); // "system" or api key id

  /* ── Load settings and API keys from Supabase ── */
  useEffect(() => {
    if (!userId || userId === 'anonymous') return;
    getUserSettings(userId).then(s => {
      if (s) {
        if (s.dict_direction) setDictDir(s.dict_direction);
        if (s.color_mode) setColorMode(s.color_mode);
        if (s.reminder_enabled !== undefined) setReminderEnabled(s.reminder_enabled);
        if (s.zh_font) setZhFont(s.zh_font);
        if (s.th_font) setThFont(s.th_font);
      }
    });
    getApiKeys(userId).then(keys => {
      if (keys.length > 0) setApiKeys(keys.map(k => ({
        id: k.id,
        name: k.name || k.provider,
        provider: k.provider,
        key: k.key_masked || '****',
        baseUrl: k.base_url || '',
        model: k.model || '',
      })));
    });
    getDefaultApi(userId).then(id => setDefaultApiId(id || 'system'));
    // Fetch streak and bookmark count
    getMonthlyCheckinStreak(userId).then(r => setStreak(r.totalDays));
    getBookmarks(userId).then(rows => setBookmarkCount((rows || []).length));
    // Fetch check-in history (last 30 days)
    getLearningProgress(userId, 30).then(rows => {
      setCheckinHistory((rows || []).filter(r => r.checked_in).map(r => ({
        date: r.date,
        tasks: r.tasks_completed || [],
      })));
    });
  }, [userId]);

  /* ── Apply font CSS variables when fonts change ── */
  useEffect(() => {
    document.documentElement.style.setProperty('--zh-font', `'${zhFont}'`);
    document.documentElement.style.setProperty('--th-font', `'${thFont}'`);
  }, [zhFont, thFont]);

  /* ── Save settings to Supabase on change ── */
  const prevDictDir = useRef(dictDir);
  useEffect(() => {
    if (prevDictDir.current === dictDir) return;
    prevDictDir.current = dictDir;
    if (userId && userId !== 'anonymous') {
      saveUserSettings(userId, { dict_direction: dictDir });
    }
  }, [dictDir, userId]);

  const prevColorMode = useRef(colorMode);
  useEffect(() => {
    if (prevColorMode.current === colorMode) return;
    prevColorMode.current = colorMode;
    if (userId && userId !== 'anonymous') {
      saveUserSettings(userId, { color_mode: colorMode });
    }
  }, [colorMode, userId]);

  const prevZhFont = useRef(zhFont);
  const prevThFont = useRef(thFont);
  useEffect(() => {
    if (prevZhFont.current === zhFont && prevThFont.current === thFont) return;
    prevZhFont.current = zhFont;
    prevThFont.current = thFont;
    if (userId && userId !== 'anonymous') {
      saveUserSettings(userId, { zh_font: zhFont, th_font: thFont });
    }
  }, [zhFont, thFont, userId]);

  const apiTemplates = [
    { id: "openai", name: "OpenAI", color: "var(--c-p700)", baseUrl: "https://api.openai.com/v1", model: "gpt-4o" },
    { id: "deepseek", name: "DeepSeek", color: "var(--c-teal)", baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat" },
    { id: "kimi", name: "Kimi", color: "var(--c-info)", baseUrl: "https://api.moonshot.cn/v1", model: "moonshot-v1-8k" },
    { id: "doubao", name: "\u8C46\u5305", color: "var(--c-gold)", baseUrl: "https://ark.cn-beijing.volces.com/api/v3", model: "doubao-pro-32k" },
    { id: "zhipu", name: "\u667A\u8C31 (GLM)", color: "var(--c-amber)", baseUrl: "https://open.bigmodel.cn/api/paas/v4", model: "glm-4" },
    { id: "qwen", name: "\u901A\u4E49\u5343\u95EE", color: "var(--c-rose)", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-max" },
    { id: "custom", name: "\u81EA\u5B9A\u4E49", color: "var(--c-s500)", baseUrl: "", model: "" },
  ];

  const SettingRow = ({ icon: Icon, label, desc, children }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: `1px solid ${"var(--c-p100)"}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--c-surfaceAlt)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={16} strokeWidth={IW} color={"var(--c-p500)"} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--c-p800)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
          {desc && <div style={{ fontSize: 11, color: "var(--c-s500)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{desc}</div>}
        </div>
      </div>
      {children}
    </div>
  );

  const Toggle = ({ on, onToggle }) => (
    <div onClick={onToggle} style={{
      width: 44, height: 24, borderRadius: 12, background: on ? "var(--c-ok)" : "var(--c-p200)",
      cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0,
    }}>
      <div style={{
        width: 20, height: 20, borderRadius: "50%", background: "#fff",
        position: "absolute", top: 2, left: on ? 22 : 2, transition: "left 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
      }} />
    </div>
  );

  /* ── API Management Sub-View ── */
  if (showApiMgmt) {
    const tpl = apiTemplates.find(t => t.id === selectedProvider) || apiTemplates[0];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 16px 16px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div onClick={() => { setShowApiMgmt(false); setEditingApiId(null); }} style={{
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            width: 32, height: 32, borderRadius: 10, background: "var(--c-p100)", flexShrink: 0,
          }}>
            <ChevronLeft size={18} strokeWidth={IW} color={"var(--c-p700)"} />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--c-p800)", margin: 0, fontFamily: "var(--zh-font), serif" }}>AI API {"\u7BA1\u7406"}</h2>
        </div>

        {/* Default API Selection */}
        <Card style={{ padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)", marginBottom: 12 }}>{"默认使用的 API"}</div>
          <div style={{ fontSize: 12, color: "var(--c-s500)", marginBottom: 12 }}>{"选择 AI 功能默认使用的 API 服务"}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* System API option */}
            <div onClick={() => { setDefaultApiId('system'); setDefaultApi(userId, 'system'); }} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10,
              border: defaultApiId === 'system' ? `1.5px solid ${"var(--c-teal)"}` : `1px solid ${"var(--c-p200)"}`,
              background: defaultApiId === 'system' ? "color-mix(in srgb, var(--c-teal) 8%, transparent)" : "var(--c-surface)",
              cursor: "pointer",
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: "50%",
                border: defaultApiId === 'system' ? `5px solid ${"var(--c-teal)"}` : `1.5px solid ${"var(--c-p300)"}`,
                flexShrink: 0,
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-p800)" }}>{"系统免费 API"}</div>
                <div style={{ fontSize: 11, color: "var(--c-s400)", marginTop: 2 }}>{"由系统提供，无需配置，密钥存储在服务器端"}</div>
              </div>
            </div>
            {/* User API options */}
            {apiKeys.map(ak => {
              const provider = apiTemplates.find(t => t.id === ak.provider);
              const isDefault = defaultApiId === String(ak.id);
              return (
                <div key={ak.id} onClick={() => { setDefaultApiId(String(ak.id)); setDefaultApi(userId, String(ak.id)); }} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10,
                  border: isDefault ? `1.5px solid ${provider?.color || "var(--c-teal)"}` : `1px solid ${"var(--c-p200)"}`,
                  background: isDefault ? `color-mix(in srgb, ${provider?.color || "var(--c-teal)"} 8%, transparent)` : "var(--c-surface)",
                  cursor: "pointer",
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%",
                    border: isDefault ? `5px solid ${provider?.color || "var(--c-teal)"}` : `1.5px solid ${"var(--c-p300)"}`,
                    flexShrink: 0,
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-p800)" }}>{ak.name}</div>
                    <div style={{ fontSize: 11, color: "var(--c-s400)", marginTop: 2, fontFamily: "monospace" }}>{ak.key} · {ak.model}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Existing keys */}
        {apiKeys.length > 0 && (
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "12px 18px", borderBottom: `1px solid ${"var(--c-p100)"}` }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p700)", margin: 0 }}>{"\u5DF2\u6DFB\u52A0\u7684 API"}</h3>
            </div>
            <div style={{ padding: "4px 18px" }}>
              {apiKeys.map(ak => {
                const provider = apiTemplates.find(t => t.id === ak.provider);
                const isEditing = editingApiId === ak.id;
                return (
                  <div key={ak.id} style={{ padding: "12px 0", borderBottom: `1px solid ${"var(--c-p100)"}` }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: `${provider?.color || "var(--c-s500)"}15`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <Key size={14} strokeWidth={IW} color={provider?.color || "var(--c-s500)"} />
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)" }}>{ak.name}</div>
                          <div style={{ fontSize: 11, color: "var(--c-s400)", marginTop: 1, fontFamily: "monospace" }}>{ak.key}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <div onClick={() => {
                          if (isEditing) { setEditingApiId(null); }
                          else { setEditingApiId(ak.id); setSelectedProvider(ak.provider); setCustomApi({ name: ak.name, key: "", baseUrl: ak.baseUrl, model: ak.model }); }
                        }} style={{
                          width: 28, height: 28, borderRadius: 7, background: "var(--c-surfaceAlt)",
                          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                        }}>
                          <Pencil size={12} strokeWidth={IW} color={"var(--c-s500)"} />
                        </div>
                        <div onClick={() => {
                          deleteApiKey(ak.id).catch(e => console.error("[deleteApiKey]", e));
                          setApiKeys(prev => prev.filter(k => k.id !== ak.id));
                        }} style={{
                          width: 28, height: 28, borderRadius: 7, background: "var(--c-surfaceAlt)",
                          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                        }}>
                          <Trash2 size={12} strokeWidth={IW} color={"var(--c-err)"} />
                        </div>
                      </div>
                    </div>
                    {isEditing && (
                      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                        <input value={customApi.key} onChange={e => setCustomApi(p => ({ ...p, key: e.target.value }))} placeholder={"\u65B0\u7684 API Key"} style={{
                          padding: "10px 12px", borderRadius: 8, border: `1px solid ${"var(--c-p200)"}`,
                          background: "var(--c-surface)", fontSize: 13, color: "var(--c-p800)", outline: "none",
                          fontFamily: "monospace", boxSizing: "border-box", width: "100%",
                        }} />
                        <div style={{ display: "flex", gap: 8 }}>
                          <input value={customApi.model} onChange={e => setCustomApi(p => ({ ...p, model: e.target.value }))} placeholder={"\u6A21\u578B"} style={{
                            flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${"var(--c-p200)"}`,
                            background: "var(--c-surface)", fontSize: 12, color: "var(--c-p800)", outline: "none",
                            fontFamily: "var(--zh-font), sans-serif", boxSizing: "border-box",
                          }} />
                          <div onClick={() => {
                            setApiKeys(prev => prev.map(k => k.id === ak.id ? {
                              ...k, key: customApi.key || k.key, model: customApi.model || k.model, baseUrl: customApi.baseUrl || k.baseUrl
                            } : k));
                            setEditingApiId(null);
                            setCustomApi({ name: "", key: "", baseUrl: "", model: "" });
                          }} style={{
                            padding: "8px 16px", borderRadius: 8, background: "var(--c-teal)",
                            color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer",
                            display: "flex", alignItems: "center", whiteSpace: "nowrap",
                          }}>{"\u4FDD\u5B58"}</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Add new API button */}
        <div onClick={() => { setShowAddApi(true); setEditingApiId(null); }} style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          padding: "14px 0", borderRadius: 12,
          border: `1.5px dashed ${"var(--c-p300)"}`, background: "var(--c-surface)",
          cursor: "pointer", fontSize: 14, fontWeight: 500,
          color: "var(--c-p600)", fontFamily: "var(--zh-font), sans-serif",
          transition: "all 0.2s",
        }}>
          <Plus size={16} strokeWidth={IW} color={"var(--c-p500)"} />
          <span>{"\u6DFB\u52A0\u65B0\u7684 API"}</span>
        </div>

        {/* Add API Modal */}
        {showAddApi && (
          <>
            <div onClick={() => { setShowAddApi(false); setCustomApi({ name: "", key: "", baseUrl: "", model: "" }); }} style={{
              position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
              background: "rgba(0,0,0,0.35)", zIndex: 2000,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div onClick={e => e.stopPropagation()} style={{
                width: "90%", maxWidth: 380, maxHeight: "85vh", overflow: "auto",
                background: "var(--c-surface)", borderRadius: 16,
                boxShadow: "0 8px 32px rgba(61,43,31,0.2)",
              }}>
                {/* Modal header */}
                <div style={{
                  padding: "16px 20px", borderBottom: `1px solid ${"var(--c-p100)"}`,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  position: "sticky", top: 0, background: "var(--c-surface)", zIndex: 1, borderRadius: "16px 16px 0 0",
                }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--c-p800)", margin: 0, fontFamily: "var(--zh-font), serif" }}>{"\u6DFB\u52A0 API"}</h3>
                  <div onClick={() => { setShowAddApi(false); setCustomApi({ name: "", key: "", baseUrl: "", model: "" }); }} style={{
                    width: 28, height: 28, borderRadius: "50%", background: "var(--c-surfaceAlt)",
                    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                  }}>
                    <X size={14} strokeWidth={IW} color={"var(--c-s500)"} />
                  </div>
                </div>

                {/* Provider selection */}
                <div style={{ padding: "14px 20px" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-s500)", marginBottom: 10 }}>{"\u9009\u62E9\u670D\u52A1\u63D0\u4F9B\u5546"}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {apiTemplates.map(t => (
                      <div key={t.id} onClick={() => {
                        setSelectedProvider(t.id);
                        setCustomApi(p => ({
                          ...p,
                          name: t.id === "custom" ? p.name : t.name,
                          baseUrl: t.id === "custom" ? p.baseUrl : t.baseUrl,
                          model: t.id === "custom" ? p.model : t.model,
                        }));
                      }} style={{
                        padding: "8px 14px", borderRadius: 10, cursor: "pointer",
                        border: selectedProvider === t.id ? `1.5px solid ${t.color}` : `1px solid ${"var(--c-p200)"}`,
                        background: selectedProvider === t.id ? `${t.color}12` : "var(--c-surface)",
                        fontSize: 13, fontWeight: selectedProvider === t.id ? 600 : 400,
                        color: selectedProvider === t.id ? t.color : "var(--c-s500)",
                        transition: "all 0.15s", whiteSpace: "nowrap",
                      }}>
                        {t.name}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Form fields */}
                <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "var(--c-s500)", marginBottom: 4 }}>{"\u540D\u79F0"}</div>
                    <input value={customApi.name || (tpl.id !== "custom" ? tpl.name : "")} onChange={e => setCustomApi(p => ({ ...p, name: e.target.value }))} placeholder={"\u4F8B\uFF1AMy OpenAI"} style={{
                      width: "100%", padding: "10px 12px", borderRadius: 8,
                      border: `1px solid ${"var(--c-p200)"}`, background: "var(--c-surface)",
                      fontSize: 13, color: "var(--c-p800)", outline: "none",
                      fontFamily: "var(--zh-font), sans-serif", boxSizing: "border-box",
                    }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "var(--c-s500)", marginBottom: 4 }}>API Key</div>
                    <input value={customApi.key} onChange={e => setCustomApi(p => ({ ...p, key: e.target.value }))} placeholder="sk-..." style={{
                      width: "100%", padding: "10px 12px", borderRadius: 8,
                      border: `1px solid ${"var(--c-p200)"}`, background: "var(--c-surface)",
                      fontSize: 13, color: "var(--c-p800)", outline: "none",
                      fontFamily: "monospace", boxSizing: "border-box",
                    }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "var(--c-s500)", marginBottom: 4 }}>Base URL</div>
                    <input value={customApi.baseUrl} onChange={e => setCustomApi(p => ({ ...p, baseUrl: e.target.value }))} placeholder="https://api.example.com/v1" style={{
                      width: "100%", padding: "10px 12px", borderRadius: 8,
                      border: `1px solid ${"var(--c-p200)"}`, background: "var(--c-surface)",
                      fontSize: 13, color: "var(--c-p800)", outline: "none",
                      fontFamily: "monospace", boxSizing: "border-box",
                    }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "var(--c-s500)", marginBottom: 4 }}>{"\u9ED8\u8BA4\u6A21\u578B"}</div>
                    <input value={customApi.model} onChange={e => setCustomApi(p => ({ ...p, model: e.target.value }))} placeholder="gpt-4o" style={{
                      width: "100%", padding: "10px 12px", borderRadius: 8,
                      border: `1px solid ${"var(--c-p200)"}`, background: "var(--c-surface)",
                      fontSize: 13, color: "var(--c-p800)", outline: "none",
                      fontFamily: "monospace", boxSizing: "border-box",
                    }} />
                  </div>

                  {/* Submit */}
                  <div onClick={async () => {
                    const name = customApi.name || (tpl.id !== "custom" ? tpl.name : "\u81EA\u5B9A\u4E49 API");
                    const key = customApi.key;
                    if (!key.trim()) return;
                    const masked = key.length > 8 ? `${key.slice(0, 4)}...${key.slice(-4)}` : "****";
                    const newKey = {
                      id: Date.now(), name, provider: selectedProvider,
                      key: masked, baseUrl: customApi.baseUrl || tpl.baseUrl,
                      model: customApi.model || tpl.model,
                      added: new Date().toISOString().slice(0, 10),
                    };
                    if (userId && userId !== 'anonymous') {
                      try {
                        const saved = await saveApiKey(userId, {
                          name, key, base_url: newKey.baseUrl, model: newKey.model, provider: selectedProvider,
                        });
                        if (saved && saved.id) newKey.id = saved.id;
                      } catch (e) {
                        console.error("[saveApiKey]", e);
                      }
                    }
                    setApiKeys(prev => [...prev, newKey]);
                    setShowAddApi(false);
                    setCustomApi({ name: "", key: "", baseUrl: "", model: "" });
                  }} style={{
                    padding: "13px 0", borderRadius: 12, background: "var(--c-p800)",
                    color: "#fff", fontSize: 14, fontWeight: 600,
                    textAlign: "center", cursor: "pointer", marginTop: 4,
                    fontFamily: "var(--zh-font), sans-serif",
                  }}>{"\u4FDD\u5B58"}</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  /* ── Check-in history sub-page ── */
  if (showCheckinHistory) {
    const taskNames = ["复习旧词", "学习新词", "阅读理解", "造句练习"];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div onClick={() => setShowCheckinHistory(false)} style={{
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            width: 32, height: 32, borderRadius: 10, background: "var(--c-p100)", flexShrink: 0,
          }}>
            <ChevronLeft size={18} strokeWidth={IW} color={"var(--c-p700)"} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--c-p800)", margin: 0, fontFamily: "var(--zh-font), serif" }}>打卡记录</h1>
        </div>
        <Card style={{ padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: "var(--c-gold)" }}>{streak}</div>
          <div style={{ fontSize: 13, color: "var(--c-s500)", marginTop: 4 }}>连续打卡天数</div>
        </Card>
        {checkinHistory.length === 0 ? (
          <div style={{ textAlign: "center", padding: 24, color: "var(--c-s400)", fontSize: 13 }}>
            暂无打卡记录
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {checkinHistory.sort((a, b) => b.date.localeCompare(a.date)).map((entry, i) => (
              <Card key={i} style={{ padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)" }}>{entry.date}</div>
                    <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                      {(entry.tasks || []).map((tIdx, j) => (
                        <Badge key={j} bg={"color-mix(in srgb, var(--c-ok) 15%, transparent)"} fg={"var(--c-ok)"} style={{ fontSize: 10 }}>
                          {taskNames[tIdx] || `任务${tIdx + 1}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", background: "var(--c-ok)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Check size={14} strokeWidth={2} color="#fff" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ── Font selection sub-page ── */
  if (showFontPage) {
    const FontCard = ({ family, label, preview, active, onClick }) => (
      <div onClick={onClick} style={{
        padding: "16px 18px", borderRadius: 14, position: "relative",
        border: active ? "2px solid var(--c-teal)" : `1px solid ${"var(--c-p100)"}`,
        background: active ? "color-mix(in srgb, var(--c-teal) 6%, transparent)" : "var(--c-surface)",
        cursor: "pointer", transition: "all 0.2s",
      }}>
        {active && <div style={{
          position: "absolute", top: 10, right: 10,
          width: 10, height: 10, borderRadius: "50%", background: "var(--c-teal)",
        }} />}
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-p800)", marginBottom: 8 }}>{label}</div>
        <div style={{ fontSize: 20, color: "var(--c-p700)", fontFamily: `'${family}', sans-serif`, lineHeight: 1.4 }}>{preview}</div>
      </div>
    );

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div onClick={() => setShowFontPage(false)} style={{
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            width: 32, height: 32, borderRadius: 10, background: "var(--c-p100)", flexShrink: 0,
          }}>
            <ChevronLeft size={18} strokeWidth={IW} color={"var(--c-p700)"} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--c-p800)", margin: 0, fontFamily: "var(--zh-font), serif" }}>字体设置</h1>
        </div>
        <Card style={{ padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)", marginBottom: 12 }}>中文</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {zhFonts.map(f => (
              <FontCard key={f} family={f} label={f} preview="สวัสดี 你好世界" active={zhFont === f} onClick={() => setZhFont(f)} />
            ))}
          </div>
        </Card>
        <Card style={{ padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)", marginBottom: 12 }}>泰文</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {thFonts.map(f => (
              <FontCard key={f} family={f} label={f} preview="สวัสดีครับ ยินดีที่ได้รู้จัก" active={thFont === f} onClick={() => setThFont(f)} />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  /* ── Reminder settings sub-page ── */
  if (showReminderPage) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ flex: 1, overflow: "auto" }}>
          <ReminderPage onBack={() => setShowReminderPage(false)} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 16px 16px" }}>
      {/* Profile card */}
      <Card style={{ padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Avatar with upload */}
          <div onClick={() => fileInputRef.current?.click()} style={{
            width: 56, height: 56, borderRadius: "50%", background: "var(--c-p100)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 700, color: "var(--c-p600)", flexShrink: 0,
            cursor: "pointer", overflow: "hidden", position: "relative",
          }}>
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              (user?.user_metadata?.full_name || user?.email || userId || "U").charAt(0).toUpperCase()
            )}
            {avatarUploading && <div style={{
              position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ width: 20, height: 20, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
            </div>}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file || !user) return;
            setAvatarUploading(true);
            try {
              const { url, error } = await uploadAvatar(userId, file);
              if (url) {
                await updateUserProfile({ avatar_url: url });
              } else {
                console.error("[avatar] upload failed:", error);
              }
            } catch (err) { console.error("[avatar]", err); }
            setAvatarUploading(false);
            e.target.value = "";
          }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
            {/* Nickname with inline edit */}
            {editingNickname ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input value={nicknameInput} onChange={e => setNicknameInput(e.target.value)} autoFocus
                  onKeyDown={async (e) => {
                    if (e.key === "Enter" && nicknameInput.trim()) {
                      try { await updateUserProfile({ full_name: nicknameInput.trim() }); } catch {}
                      setEditingNickname(false);
                    } else if (e.key === "Escape") { setEditingNickname(false); }
                  }}
                  style={{
                    flex: 1, padding: "4px 8px", borderRadius: 8,
                    border: `1px solid ${"var(--c-p200)"}`, background: "var(--c-input)",
                    fontSize: 17, fontWeight: 700, color: "var(--c-p800)",
                    fontFamily: "var(--zh-font), sans-serif", outline: "none",
                  }}
                />
                <div onClick={async () => {
                  if (nicknameInput.trim()) {
                    try { await updateUserProfile({ full_name: nicknameInput.trim() }); } catch {}
                  }
                  setEditingNickname(false);
                }} style={{ cursor: "pointer", padding: 4 }}>
                  <Check size={16} strokeWidth={2} color={"var(--c-teal)"} />
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 17, fontWeight: 700, color: "var(--c-p800)" }}>
                  {user?.user_metadata?.full_name || user?.email || (userId ? (userId.length > 12 ? userId.slice(0, 12) + "..." : userId) : "User")}
                </span>
                <div onClick={() => { setNicknameInput(user?.user_metadata?.full_name || ""); setEditingNickname(true); }}
                  style={{ cursor: "pointer", display: "flex" }}>
                  <Pencil size={13} strokeWidth={IW} color={"var(--c-s400)"} />
                </div>
              </div>
            )}
            {/* Stats horizontal */}
            <div style={{ display: "flex", gap: 16 }}>
              <div onClick={() => setShowCheckinHistory(true)} style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer" }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: "var(--c-gold)" }}>{streak}</span>
                <span style={{ fontSize: 11, color: "var(--c-s500)" }}>{"\u5929\u6253\u5361"}</span>
              </div>
              <div onClick={() => onNavigateToWords?.()} style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer" }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: "var(--c-teal)" }}>{bookmarkCount}</span>
                <span style={{ fontSize: 11, color: "var(--c-s500)" }}>{"\u8BCD\u6C47"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: "var(--c-amber)" }}>{checkinHistory.length}</span>
                <span style={{ fontSize: 11, color: "var(--c-s500)" }}>{"\u5929\u5B66\u4E60"}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Settings */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${"var(--c-p100)"}` }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--c-p800)", margin: 0, fontFamily: "var(--zh-font), serif" }}>{"\u57FA\u7840\u8BBE\u7F6E"}</h2>
        </div>
        <div style={{ padding: "0 18px" }}>
          <SettingRow icon={Globe} label={"\u754C\u9762\u8BED\u8A00"} desc={"\u5E94\u7528\u663E\u793A\u8BED\u8A00"}>
            <select style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${"var(--c-p200)"}`, background: "var(--c-input)", fontSize: 12, color: "var(--c-p700)", outline: "none", fontFamily: "var(--zh-font), sans-serif" }}>
              <option>{"\u4E2D\u6587"}</option><option>{"\u6CF0\u8BED"}</option>
            </select>
          </SettingRow>
          <SettingRow icon={BookOpen} label={"\u8BCD\u5178\u65B9\u5411"} desc={"\u4E2D\u6587\u67E5\u6CF0\u8BED\u91CA\u4E49"}>
            <select value={dictDir} onChange={e => setDictDir(e.target.value)} style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${"var(--c-p200)"}`, background: "var(--c-input)", fontSize: 12, color: "var(--c-p700)", outline: "none", fontFamily: "var(--zh-font), sans-serif" }}>
              <option value="zh-th">{"\u4E2D \u2192 \u6CF0"}</option>
              <option value="th-zh">{"\u6CF0 \u2192 \u4E2D"}</option>
            </select>
          </SettingRow>
          <SettingRow icon={Moon} label={"\u989C\u8272\u6A21\u5F0F"}>
            <div style={{ position: "relative" }}>
              <div onClick={() => setShowColorDropdown(!showColorDropdown)} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "6px 10px", borderRadius: 8,
                border: `1px solid ${"var(--c-p200)"}`, background: "var(--c-input)",
                cursor: "pointer", fontSize: 12, color: "var(--c-p700)",
                fontFamily: "var(--zh-font), sans-serif",
                minWidth: 70,
              }}>
                {colorMode === "light" && <Sun size={13} strokeWidth={1.5} color={"var(--c-p600)"} />}
                {colorMode === "dark" && <Moon size={13} strokeWidth={1.5} color={"var(--c-p600)"} />}
                {colorMode === "system" && <Smartphone size={13} strokeWidth={1.5} color={"var(--c-p600)"} />}
                <span>{colorMode === "light" ? "\u660E\u4EAE" : colorMode === "dark" ? "\u591C\u95F4" : "\u7CFB\u7EDF"}</span>
              </div>
              {showColorDropdown && (
                <>
                  <div onClick={() => setShowColorDropdown(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} />
                  <div style={{
                    position: "absolute", right: 0, top: "100%", marginTop: 4,
                    background: "var(--c-surface)", borderRadius: 10,
                    boxShadow: "0 4px 16px rgba(61,43,31,0.14)",
                    border: `1px solid ${"var(--c-p100)"}`, zIndex: 1000,
                    minWidth: 110, overflow: "hidden",
                  }}>
                    {[
                      { key: "light", icon: Sun, label: "\u660E\u4EAE" },
                      { key: "dark", icon: Moon, label: "\u591C\u95F4" },
                      { key: "system", icon: Smartphone, label: "\u7CFB\u7EDF" },
                    ].map(opt => {
                      const Icon = opt.icon;
                      const active = colorMode === opt.key;
                      return (
                        <div key={opt.key} onClick={() => { setColorMode(opt.key); setShowColorDropdown(false); }} style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "9px 14px", cursor: "pointer",
                          background: active ? "var(--c-p50)" : "transparent",
                          color: active ? "var(--c-p800)" : "var(--c-s500)",
                          fontSize: 12, fontWeight: active ? 600 : 400,
                          borderBottom: `1px solid ${"var(--c-p100)"}`,
                        }}>
                          <Icon size={14} strokeWidth={1.5} color={active ? "var(--c-p700)" : "var(--c-s400)"} />
                          <span>{opt.label}</span>
                          {active && <Check size={12} strokeWidth={2} color={"var(--c-teal)"} style={{ marginLeft: "auto" }} />}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </SettingRow>
          <SettingRow icon={Bell} label={"\u590D\u4E60\u63D0\u9192"} desc={reminderEnabled ? "\u5DF2\u5F00\u542F" : "\u6BCF\u65E5\u5B9A\u65F6\u63D0\u9192"}>
            <div onClick={() => setShowReminderPage(true)} style={{
              display: "flex", alignItems: "center", gap: 4, cursor: "pointer",
              fontSize: 12, color: "var(--c-p500)", fontWeight: 500,
            }}>
              <span>{"\u8BBE\u7F6E"}</span>
              <ChevronRight size={14} strokeWidth={IW} color={"var(--c-s300)"} />
            </div>
          </SettingRow>
          <SettingRow icon={Pencil} label="字体设置" desc={`${zhFont} / ${thFont}`}>
            <div onClick={() => setShowFontPage(true)} style={{
              display: "flex", alignItems: "center", gap: 4, cursor: "pointer",
              fontSize: 12, color: "var(--c-p500)", fontWeight: 500,
            }}>
              <span>选择</span>
              <ChevronRight size={14} strokeWidth={IW} color={"var(--c-s300)"} />
            </div>
          </SettingRow>
        </div>
      </Card>

      {/* WebDAV */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${"var(--c-p100)"}` }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--c-p800)", margin: 0, fontFamily: "var(--zh-font), serif" }}>WebDAV 同步</h2>
        </div>
        <div style={{ padding: "0 18px" }}>
          <SettingRow icon={Cloud} label="服务器" desc={webdavConnected ? `已连接: ${webdavConfig.serverUrl.replace(/https?:\/\//, "").split("/")[0]}` : "未连接"}>
            <Btn variant={webdavConnected ? "secondary" : "primary"} icon={webdavConnected ? Check : Plus} onClick={() => setShowWebdavModal(true)} style={{ padding: "6px 12px", fontSize: 12 }}>
              {webdavConnected ? "已连接" : "连接"}
            </Btn>
          </SettingRow>
          <SettingRow icon={Upload} label="上传笔记" desc="同步到 WebDAV">
            <Btn variant="secondary" icon={Upload} onClick={() => !webdavConnected && setShowWebdavModal(true)} style={{ padding: "6px 12px", fontSize: 12, opacity: webdavConnected ? 1 : 0.5 }}>上传</Btn>
          </SettingRow>
          <SettingRow icon={Download} label="下载备份" desc="从服务器恢复">
            <Btn variant="secondary" icon={Download} onClick={() => !webdavConnected && setShowWebdavModal(true)} style={{ padding: "6px 12px", fontSize: 12, opacity: webdavConnected ? 1 : 0.5 }}>下载</Btn>
          </SettingRow>
        </div>
      </Card>

      {/* WebDAV Config Modal */}
      {showWebdavModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 2000, padding: 20,
        }}>
          <div style={{
            width: "100%", maxWidth: 380, background: "var(--c-surface)",
            borderRadius: 18, padding: "24px 20px",
            boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--c-p800)", margin: 0, fontFamily: "var(--zh-font), serif" }}>WebDAV 配置</h3>
              <div onClick={() => setShowWebdavModal(false)} style={{ cursor: "pointer", padding: 4 }}>
                <X size={18} strokeWidth={IW} color={"var(--c-s400)"} />
              </div>
            </div>
            {[
              { label: "服务器地址", key: "serverUrl", placeholder: "https://dav.jianguoyun.com/dav/", type: "url" },
              { label: "用户名", key: "username", placeholder: "your@email.com", type: "text" },
              { label: "密码", key: "password", placeholder: "应用密码", type: "password" },
            ].map(field => (
              <div key={field.key} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--c-s500)", marginBottom: 4 }}>{field.label}</div>
                <input
                  type={field.type}
                  value={webdavConfig[field.key]}
                  onChange={e => setWebdavConfig(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 10,
                    border: `1px solid ${"var(--c-p200)"}`, background: "var(--c-input)",
                    fontSize: 13, color: "var(--c-p800)", outline: "none",
                    fontFamily: "var(--zh-font), sans-serif", boxSizing: "border-box",
                  }}
                />
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              {webdavConnected && (
                <div onClick={() => { setWebdavConnected(false); setWebdavConfig({ serverUrl: "", username: "", password: "" }); setShowWebdavModal(false); }}
                  style={{
                    flex: 1, padding: "12px 0", borderRadius: 12,
                    border: `1px solid ${"var(--c-errL)"}`, background: "var(--c-surface)",
                    color: "var(--c-err)", fontSize: 13, fontWeight: 500,
                    textAlign: "center", cursor: "pointer",
                  }}>断开</div>
              )}
              <div onClick={() => {
                if (webdavConfig.serverUrl && webdavConfig.username && webdavConfig.password) {
                  setWebdavConnected(true);
                  setShowWebdavModal(false);
                }
              }} style={{
                flex: 1, padding: "12px 0", borderRadius: 12,
                background: "var(--c-p800)", color: "#fff", fontSize: 13, fontWeight: 600,
                textAlign: "center", cursor: "pointer",
                opacity: (webdavConfig.serverUrl && webdavConfig.username && webdavConfig.password) ? 1 : 0.5,
              }}>保存</div>
            </div>
          </div>
        </div>
      )}

      {/* Data management */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${"var(--c-p100)"}` }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--c-p800)", margin: 0, fontFamily: "var(--zh-font), serif" }}>{"\u6570\u636E\u7BA1\u7406"}</h2>
        </div>
        <div style={{ padding: "0 18px" }}>
          <SettingRow icon={HardDrive} label={"\u5B58\u50A8\u7A7A\u95F4"} desc={"\u5DF2\u7528 12.4/50 MB"}>
            <div style={{ width: 80 }}><ProgressBar value={12.4} max={50} color={"var(--c-teal)"} /></div>
          </SettingRow>
          <SettingRow icon={FileText} label={"\u5BFC\u51FA\u6570\u636E"} desc={"\u5BFC\u51FA\u4E3A JSON \u6587\u4EF6"}>
            <Btn variant="secondary" icon={Download} style={{ padding: "6px 12px", fontSize: 12 }}>{"\u5BFC\u51FA"}</Btn>
          </SettingRow>
        </div>
      </Card>

      {/* AI API Management */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${"var(--c-p100)"}` }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--c-p800)", margin: 0, fontFamily: "var(--zh-font), serif" }}>AI {"\u7BA1\u7406"}</h2>
        </div>
        <div style={{ padding: "0 18px" }}>
          <SettingRow icon={Key} label={"API \u7BA1\u7406"} desc={`${apiKeys.length} \u4E2A\u5DF2\u914D\u7F6E`}>
            <div onClick={() => setShowApiMgmt(true)} style={{
              display: "flex", alignItems: "center", gap: 4, cursor: "pointer",
              fontSize: 12, color: "var(--c-p500)", fontWeight: 500,
            }}>
              <span>{"\u7BA1\u7406"}</span>
              <ChevronRight size={14} strokeWidth={IW} color={"var(--c-s300)"} />
            </div>
          </SettingRow>
        </div>
      </Card>

      {/* Logout */}
      <div onClick={onLogout} style={{
        padding: "14px 0", borderRadius: 12, background: "var(--c-surface)",
        border: `1px solid ${"var(--c-errL)"}`, textAlign: "center",
        cursor: "pointer", fontSize: 14, fontWeight: 500,
        color: "var(--c-err)", fontFamily: "var(--zh-font), sans-serif",
        transition: "background 0.2s",
      }}>
        {"\u9000\u51FA\u767B\u5F55"}
      </div>
    </div>
  );
};

export default ProfilePage;
