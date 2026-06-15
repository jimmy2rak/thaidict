import { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import { Search, ChevronRight, Star, BookOpen, Plus, Check, X, Folder, Pencil, Trash2, Bookmark } from "lucide-react";
import { Card, Badge, ProgressBar } from "../components/UIComponents";
import { wordBooks } from "../data/mockData";
import {
  isSupabaseConfigured,
  getUserRecentWords, getBookmarks, getFolders,
  createFolder, renameFolder, deleteFolder,
  createDefaultFolders,
  getBookmarkedSentences,
  transformSearchResult,
} from "../lib/supabase.js";

const IW = 1.5;
const MAX_FOLDERS = 5;

const WordBookPage = () => {
  const { userId, handleWordTap, setSelectedSentence } = useAppContext();

  const [tab, setTab] = useState("recent");
  const [recentData, setRecentData] = useState([]);
  const [bookmarksData, setBookmarksData] = useState([]);
  const [sentenceBookmarks, setSentenceBookmarks] = useState([]);
  const [folders, setFolders] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  /* ── Fetch data ── */
  useEffect(() => {
    if (!userId || userId === 'anonymous') return;
    if (!isSupabaseConfigured) return;
    getUserRecentWords(userId, 20).then(rows => {
      setRecentData((rows || []).map(transformSearchResult).filter(Boolean));
    });
    getBookmarks(userId).then(rows => {
      setBookmarksData(rows || []);
    });
    getBookmarkedSentences(userId).then(rows => {
      setSentenceBookmarks(rows || []);
    });
    // Create default folders if none exist, then fetch
    getFolders(userId).then(rows => {
      const mapped = (rows || []).map(f => ({
        id: f.id, name: f.name, color: f.color, count: f.word_count || 0,
        folder_type: f.folder_type || 'word',
      }));
      if (mapped.length === 0) {
        createDefaultFolders(userId).then(refreshed => {
          const fresh = (refreshed || []).map(f => ({
            id: f.id, name: f.name, color: f.color, count: f.word_count || 0,
            folder_type: f.folder_type || 'word',
          }));
          setFolders(fresh);
        });
      } else {
        setFolders(mapped);
      }
    });
  }, [userId]);

  /* ── Folder CRUD with 5-limit ── */
  const wordFolders = folders.filter(f => f.folder_type === 'word');
  const sentenceFolders = folders.filter(f => f.folder_type === 'sentence');

  const handleCreateFolder = (name, type = 'word') => {
    const sameTypeFolders = folders.filter(f => f.folder_type === type);
    if (sameTypeFolders.length >= MAX_FOLDERS) return; // limit
    const colors = type === 'word'
      ? ["#5B8C7E", "#B56576", "#D4845A", "#5B7E9E", "#6B8F5E"]
      : ["#C4993D", "#B56576", "#5B8C7E", "#5B7E9E", "#D4845A"];
    const color = colors[sameTypeFolders.length % colors.length];
    const tempFolder = { id: `temp-${Date.now()}`, name, count: 0, color, folder_type: type };
    setFolders(prev => [...prev, tempFolder]);
    if (isSupabaseConfigured && userId && userId !== 'anonymous') {
      createFolder(userId, name, color).then(folder => {
        if (folder) {
          setFolders(prev => prev.map(f =>
            f.id === tempFolder.id ? { id: folder.id, name: folder.name, color: folder.color, count: folder.word_count || 0, folder_type: folder.folder_type || type } : f
          ));
        }
      }).catch(() => {
        setFolders(prev => prev.filter(f => f.id !== tempFolder.id));
      });
    }
  };

  const handleRenameFolder = (folderId, newName) => {
    setFolders(prev => prev.map(f => f.id === folderId ? { ...f, name: newName } : f));
    if (isSupabaseConfigured) renameFolder(folderId, newName).catch(() => {});
  };

  const handleDeleteFolder = (folderId) => {
    setFolders(prev => prev.filter(f => f.id !== folderId));
    if (isSupabaseConfigured) deleteFolder(folderId).catch(() => {});
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 16px 16px" }}>
      {/* Tab switcher — 4 tabs */}
      <div style={{ display: "flex", gap: 4, background: "var(--c-surfaceAlt)", borderRadius: 12, padding: 4 }}>
        {[
          { key: "recent", label: "最近查词" },
          { key: "starred", label: "我的收藏" },
          { key: "sentences", label: "我的句子" },
          { key: "books", label: "词书" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: "7px 0", borderRadius: 10, border: "none", cursor: "pointer",
            background: tab === t.key ? "var(--c-surface)" : "transparent",
            color: tab === t.key ? "var(--c-p800)" : "var(--c-s500)",
            fontSize: 12, fontWeight: tab === t.key ? 600 : 400,
            boxShadow: tab === t.key ? "0 1px 3px rgba(61,43,31,0.08)" : "none",
            fontFamily: "var(--zh-font), sans-serif", transition: "all 0.2s",
          }}>{t.label}</button>
        ))}
      </div>

      {/* 最近查词 tab */}
      {tab === "recent" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {recentData.length === 0 && (
            <div style={{ textAlign: "center", padding: 24, color: "var(--c-s400)", fontSize: 13 }}>
              {isSupabaseConfigured ? "暂无记录" : "未连接数据库"}
            </div>
          )}
          {recentData.map((w, i) => (
            <div key={w.word + i} onClick={() => handleWordTap(w.word)} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 16px", borderRadius: 14, background: "var(--c-surface)",
              border: `1px solid ${"var(--c-p100)"}`, cursor: "pointer",
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: "var(--c-teal)", fontFamily: "var(--th-font), sans-serif" }}>{w.word}</span>
                  {w.pos && <Badge bg={"var(--c-p100)"} fg={"var(--c-p700)"} style={{ fontSize: 9 }}>{w.pos}</Badge>}
                </div>
                {w.meaning && <div style={{ fontSize: 13, color: "var(--c-p700)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.meaning}</div>}
              </div>
              <ChevronRight size={14} strokeWidth={IW} color={"var(--c-s300)"} />
            </div>
          ))}
        </div>
      )}

      {/* 我的收藏 tab — word folders */}
      {tab === "starred" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Word folders */}
          {wordFolders.map(folder => (
            <Card key={folder.id} style={{ padding: 14 }}>
              {editingId === folder.id ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input autoFocus value={editName} onChange={e => setEditName(e.target.value)} style={{
                    flex: 1, padding: "8px 12px", borderRadius: 8,
                    border: `1px solid ${"var(--c-p200)"}`, background: "var(--c-surface)",
                    fontSize: 14, color: "var(--c-p800)", outline: "none", fontWeight: 600,
                  }} onKeyDown={e => {
                    if (e.key === "Enter" && editName.trim()) { handleRenameFolder(folder.id, editName.trim()); setEditingId(null); setEditName(""); }
                    if (e.key === "Escape") { setEditingId(null); setEditName(""); }
                  }} />
                  <div onClick={() => { if (editName.trim()) { handleRenameFolder(folder.id, editName.trim()); setEditingId(null); setEditName(""); }}} style={{ width: 30, height: 30, borderRadius: 8, background: "var(--c-teal)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <Check size={13} strokeWidth={2} color="#fff" />
                  </div>
                  <div onClick={() => { setEditingId(null); setEditName(""); }} style={{ width: 30, height: 30, borderRadius: 8, background: "var(--c-surfaceAlt)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <X size={13} strokeWidth={IW} color={"var(--c-s500)"} />
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: `${folder.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Star size={16} strokeWidth={IW} color={folder.color} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)" }}>{folder.name}</div>
                      <div style={{ fontSize: 11, color: "var(--c-s300)", marginTop: 1 }}>{folder.count} 词</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div onClick={() => { setEditingId(folder.id); setEditName(folder.name); }} style={{ width: 28, height: 28, borderRadius: 7, background: "var(--c-surfaceAlt)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      <Pencil size={12} strokeWidth={IW} color={"var(--c-s500)"} />
                    </div>
                    {folder.name !== '我的单词' && (
                      <div onClick={() => handleDeleteFolder(folder.id)} style={{ width: 28, height: 28, borderRadius: 7, background: "var(--c-surfaceAlt)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                        <Trash2 size={12} strokeWidth={IW} color={"var(--c-err)"} />
                      </div>
                    )}
                    <ChevronRight size={14} strokeWidth={IW} color={"var(--c-s300)"} />
                  </div>
                </div>
              )}
            </Card>
          ))}
          {/* Add folder button — limited to MAX_FOLDERS */}
          {wordFolders.length < MAX_FOLDERS && !showAddFolder && (
            <div onClick={() => setShowAddFolder(true)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 0", borderRadius: 12, border: `1.5px dashed ${"var(--c-p300)"}`, background: "var(--c-surface)", cursor: "pointer", fontSize: 13, color: "var(--c-p500)", fontWeight: 500 }}>
              <Plus size={15} strokeWidth={IW} color={"var(--c-p500)"} />
              <span>新建收藏夹</span>
              <span style={{ fontSize: 11, color: "var(--c-s300)" }}>({wordFolders.length}/{MAX_FOLDERS})</span>
            </div>
          )}
          {wordFolders.length >= MAX_FOLDERS && (
            <div style={{ textAlign: "center", padding: "8px 0", fontSize: 12, color: "var(--c-s400)" }}>最多 {MAX_FOLDERS} 个收藏夹</div>
          )}
          {showAddFolder && (
            <Card style={{ padding: 12, background: "var(--c-p50)", border: `1px solid ${"var(--c-p200)"}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input autoFocus value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="收藏夹名称..." style={{
                  flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${"var(--c-p200)"}`, background: "var(--c-surface)",
                  fontSize: 13, color: "var(--c-p800)", outline: "none",
                }} onKeyDown={e => {
                  if (e.key === "Enter" && newFolderName.trim()) { handleCreateFolder(newFolderName.trim(), 'word'); setNewFolderName(""); setShowAddFolder(false); }
                  if (e.key === "Escape") { setShowAddFolder(false); setNewFolderName(""); }
                }} />
                <div onClick={() => { if (newFolderName.trim()) { handleCreateFolder(newFolderName.trim(), 'word'); setNewFolderName(""); setShowAddFolder(false); }}} style={{ width: 32, height: 32, borderRadius: 8, background: "var(--c-teal)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <Check size={14} strokeWidth={2} color="#fff" />
                </div>
                <div onClick={() => { setShowAddFolder(false); setNewFolderName(""); }} style={{ width: 32, height: 32, borderRadius: 8, background: "var(--c-surfaceAlt)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <X size={14} strokeWidth={IW} color={"var(--c-s500)"} />
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* 我的句子 tab */}
      {tab === "sentences" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sentenceBookmarks.length === 0 && (
            <div style={{ textAlign: "center", padding: 24, color: "var(--c-s400)", fontSize: 13 }}>
              {"暂无收藏的句子"}
            </div>
          )}
          {sentenceBookmarks.map((item, i) => (
            <div key={i} onClick={() => {
              if (setSelectedSentence && item) setSelectedSentence(item);
            }} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 16px", borderRadius: 14, background: "var(--c-surface)",
              border: `1px solid ${"var(--c-p100)"}`, cursor: "pointer",
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: "var(--c-teal)", fontFamily: "var(--th-font), sans-serif" }}>{item.text}</div>
                {item.actual_meaning && <div style={{ fontSize: 13, color: "var(--c-p700)", marginTop: 3 }}>{item.actual_meaning}</div>}
                {item.category && <Badge bg={"var(--c-p100)"} fg={"var(--c-p700)"} style={{ fontSize: 9, marginTop: 4 }}>{item.category === "idioms" ? "俗语" : item.category === "buddhist" ? "佛教用语" : "日常用语"}</Badge>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Bookmark size={14} strokeWidth={IW} color={"var(--c-gold)}"} fill={"var(--c-gold)}"} />
                <ChevronRight size={14} strokeWidth={IW} color={"var(--c-s300)"} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 词书 tab */}
      {tab === "books" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-s500)", paddingLeft: 2 }}>{"系统词书"}</div>
          {wordBooks.map((book, i) => (
            <Card key={`wb-${i}`} style={{ padding: 14 }} onClick={() => {}}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: `${book.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <BookOpen size={14} strokeWidth={IW} color={book.color} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)" }}>{book.name}</div>
                </div>
                <Badge bg={`${book.color}18`} fg={book.color}>{book.count}{"词"}</Badge>
              </div>
              <ProgressBar value={book.learned} max={book.count} color={book.color} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontSize: 11, color: "var(--c-s300)" }}>{"已学"} {book.learned}/{book.count}</span>
                <span style={{ fontSize: 11, color: book.color, fontWeight: 500 }}>{Math.round(book.learned / book.count * 100)}%</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default WordBookPage;
