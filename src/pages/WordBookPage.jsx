import { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import { Search, ChevronRight, Star, BookOpen, Plus, Check, X, Folder, Pencil, Trash2 } from "lucide-react";
import { Card, Badge, ProgressBar } from "../components/UIComponents";
import { wordBooks } from "../data/mockData";
import {
  isSupabaseConfigured,
  getUserRecentWords, getBookmarks, getFolders,
  createFolder, renameFolder, deleteFolder,
  transformSearchResult,
} from "../lib/supabase.js";

const IW = 1.5;

const WordBookPage = () => {
  const { userId, handleWordTap } = useAppContext();

  const [tab, setTab] = useState("recent");
  const [recentData, setRecentData] = useState([]);
  const [bookmarksData, setBookmarksData] = useState([]);
  const [foldersData, setFoldersData] = useState([]);
  const [folders, setFolders] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  /* ── Fetch recent words, bookmarks, and folders from Supabase ── */
  useEffect(() => {
    if (!userId || userId === 'anonymous') return;
    if (!isSupabaseConfigured) return;
    getUserRecentWords(userId, 20).then(rows => {
      setRecentData((rows || []).map(transformSearchResult).filter(Boolean));
    });
    getBookmarks(userId).then(rows => {
      setBookmarksData(rows || []);
    });
    getFolders(userId).then(rows => {
      const mapped = (rows || []).map(f => ({
        id: f.id, name: f.name, color: f.color, count: f.word_count || 0,
      }));
      setFoldersData(mapped);
      setFolders(mapped);
    });
  }, [userId]);

  /* ── Folder CRUD helpers ── */
  const handleCreateFolder = (name) => {
    const colors = ["var(--c-teal)", "var(--c-rose)", "var(--c-gold)", "var(--c-amber)", "var(--c-info)"];
    const color = colors[folders.length % colors.length];
    // Optimistic update
    const tempFolder = { id: `temp-${Date.now()}`, name, count: 0, color };
    setFolders(prev => [...prev, tempFolder]);
    if (isSupabaseConfigured && userId && userId !== 'anonymous') {
      createFolder(userId, name, color).then(folder => {
        if (folder) {
          setFolders(prev => prev.map(f =>
            f.id === tempFolder.id ? { id: folder.id, name: folder.name, color: folder.color, count: folder.word_count || 0 } : f
          ));
        }
      }).catch(() => {
        setFolders(prev => prev.filter(f => f.id !== tempFolder.id));
      });
    }
  };

  const handleRenameFolder = (folderId, newName) => {
    setFolders(prev => prev.map(f => f.id === folderId ? { ...f, name: newName } : f));
    if (isSupabaseConfigured) {
      renameFolder(folderId, newName).catch(() => {});
    }
  };

  const handleDeleteFolder = (folderId) => {
    setFolders(prev => prev.filter(f => f.id !== folderId));
    if (isSupabaseConfigured) {
      deleteFolder(folderId).catch(() => {});
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 16px 16px" }}>
      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 6, background: "var(--c-surfaceAlt)", borderRadius: 12, padding: 4 }}>
        {[
          { key: "recent", label: "\u6700\u8FD1\u67E5\u8BCD" },
          { key: "starred", label: "\u6211\u7684\u6536\u85CF" },
          { key: "books", label: "\u8BCD\u4E66" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: "8px 0", borderRadius: 10, border: "none", cursor: "pointer",
            background: tab === t.key ? "var(--c-surface)" : "transparent",
            color: tab === t.key ? "var(--c-p800)" : "var(--c-s500)",
            fontSize: 13, fontWeight: tab === t.key ? 600 : 400,
            boxShadow: tab === t.key ? "0 1px 3px rgba(61,43,31,0.08)" : "none",
            fontFamily: "var(--zh-font), sans-serif", transition: "all 0.2s",
          }}>{t.label}</button>
        ))}
      </div>

      {(tab === "recent" || tab === "starred") && (
        <>
          {/* Search */}
          <div style={{ position: "relative" }}>
            <Search size={16} strokeWidth={IW} color={"var(--c-s300)"} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
            <input placeholder={tab === "recent" ? "\u641C\u7D22\u5386\u53F2\u67E5\u8BCD..." : "\u641C\u7D22\u6536\u85CF\u8BCD\u6C47..."} style={{
              width: "100%", padding: "12px 16px 12px 38px", borderRadius: 12,
              border: `1px solid ${"var(--c-p100)"}`, background: "var(--c-input)", fontSize: 14,
              color: "var(--c-p800)", outline: "none", fontFamily: "var(--zh-font), sans-serif",
              boxSizing: "border-box",
            }} />
          </div>

          {/* Word list — recent tab */}
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
                      {w.sense_count > 1 && <span style={{ fontSize: 10, color: "var(--c-s400)" }}>{w.sense_count}{"义"}</span>}
                    </div>
                    {w.meaning && <div style={{ fontSize: 13, color: "var(--c-p700)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.meaning}</div>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {w.romanization && <span style={{ fontSize: 10, color: "var(--c-s300)", fontFamily: "monospace" }}>{w.romanization}</span>}
                    <ChevronRight size={14} strokeWidth={IW} color={"var(--c-s300)"} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Word list — starred / bookmarks tab */}
          {tab === "starred" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {bookmarksData.length === 0 && (
                <div style={{ textAlign: "center", padding: 24, color: "var(--c-s400)", fontSize: 13 }}>
                  {isSupabaseConfigured ? "暂无收藏" : "未连接数据库"}
                </div>
              )}
              {bookmarksData.map((item, i) => (
                <div key={item.word + i} onClick={() => handleWordTap(item.word)} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 16px", borderRadius: 14, background: "var(--c-surface)",
                  border: `1px solid ${"var(--c-p100)"}`, cursor: "pointer",
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 600, color: "var(--c-teal)", fontFamily: "var(--th-font), sans-serif" }}>{item.word}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Star size={14} strokeWidth={IW} color={"var(--c-gold)"} fill={"var(--c-gold)"} />
                    <ChevronRight size={14} strokeWidth={IW} color={"var(--c-s300)"} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "books" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* System word books */}
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-s500)", paddingLeft: 2 }}>{"\u7CFB\u7EDF\u8BCD\u4E66"}</div>
          {wordBooks.map((book, i) => (
            <Card key={`wb-${i}`} style={{ padding: 14 }} onClick={() => {}}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: `${book.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <BookOpen size={14} strokeWidth={IW} color={book.color} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)" }}>{book.name}</div>
                </div>
                <Badge bg={`${book.color}18`} fg={book.color}>{book.count}{"\u8BCD"}</Badge>
              </div>
              <ProgressBar value={book.learned} max={book.count} color={book.color} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontSize: 11, color: "var(--c-s300)" }}>{"\u5DF2\u5B66"} {book.learned}/{book.count}</span>
                <span style={{ fontSize: 11, color: book.color, fontWeight: 500 }}>{Math.round(book.learned / book.count * 100)}%</span>
              </div>
            </Card>
          ))}

          {/* User folders */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, paddingLeft: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-s500)" }}>{"\u6211\u7684\u6587\u4EF6\u5939"}</span>
            <div onClick={() => setShowAddFolder(true)} style={{
              display: "flex", alignItems: "center", gap: 3, padding: "4px 10px",
              borderRadius: 8, background: "var(--c-p50)", border: `1px dashed ${"var(--c-p200)"}`,
              cursor: "pointer", fontSize: 12, color: "var(--c-p600)", fontWeight: 500,
            }}>
              <Plus size={12} strokeWidth={IW} color={"var(--c-p500)"} />
              <span>{"\u65B0\u5EFA"}</span>
            </div>
          </div>

          {/* Add folder input */}
          {showAddFolder && (
            <Card style={{ padding: 12, background: "var(--c-p50)", border: `1px solid ${"var(--c-p200)"}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  autoFocus
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  placeholder={"\u6587\u4EF6\u5939\u540D\u79F0..."}
                  style={{
                    flex: 1, padding: "8px 12px", borderRadius: 8,
                    border: `1px solid ${"var(--c-p200)"}`, background: "var(--c-surface)",
                    fontSize: 13, color: "var(--c-p800)", outline: "none",
                    fontFamily: "var(--zh-font), sans-serif",
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter" && newFolderName.trim()) {
                      handleCreateFolder(newFolderName.trim());
                      setNewFolderName("");
                      setShowAddFolder(false);
                    }
                    if (e.key === "Escape") { setShowAddFolder(false); setNewFolderName(""); }
                  }}
                />
                <div onClick={() => {
                  if (newFolderName.trim()) {
                    handleCreateFolder(newFolderName.trim());
                    setNewFolderName("");
                    setShowAddFolder(false);
                  }
                }} style={{
                  width: 32, height: 32, borderRadius: 8, background: "var(--c-teal)",
                  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                }}>
                  <Check size={14} strokeWidth={2} color="#fff" />
                </div>
                <div onClick={() => { setShowAddFolder(false); setNewFolderName(""); }} style={{
                  width: 32, height: 32, borderRadius: 8, background: "var(--c-surfaceAlt)",
                  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                }}>
                  <X size={14} strokeWidth={IW} color={"var(--c-s500)"} />
                </div>
              </div>
            </Card>
          )}

          {/* Folder cards */}
          {folders.map(folder => (
            <Card key={folder.id} style={{ padding: 14 }}>
              {editingId === folder.id ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    style={{
                      flex: 1, padding: "8px 12px", borderRadius: 8,
                      border: `1px solid ${"var(--c-p200)"}`, background: "var(--c-surface)",
                      fontSize: 14, color: "var(--c-p800)", outline: "none",
                      fontFamily: "var(--zh-font), sans-serif", fontWeight: 600,
                    }}
                    onKeyDown={e => {
                      if (e.key === "Enter" && editName.trim()) {
                        handleRenameFolder(folder.id, editName.trim());
                        setEditingId(null); setEditName("");
                      }
                      if (e.key === "Escape") { setEditingId(null); setEditName(""); }
                    }}
                  />
                  <div onClick={() => {
                    if (editName.trim()) {
                      handleRenameFolder(folder.id, editName.trim());
                      setEditingId(null); setEditName("");
                    }
                  }} style={{
                    width: 30, height: 30, borderRadius: 8, background: "var(--c-teal)",
                    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                  }}>
                    <Check size={13} strokeWidth={2} color="#fff" />
                  </div>
                  <div onClick={() => { setEditingId(null); setEditName(""); }} style={{
                    width: 30, height: 30, borderRadius: 8, background: "var(--c-surfaceAlt)",
                    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                  }}>
                    <X size={13} strokeWidth={IW} color={"var(--c-s500)"} />
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 10, background: `${folder.color}15`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Folder size={16} strokeWidth={IW} color={folder.color} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)" }}>{folder.name}</div>
                      <div style={{ fontSize: 11, color: "var(--c-s300)", marginTop: 1 }}>{folder.count} {"\u8BCD"}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div onClick={() => { setEditingId(folder.id); setEditName(folder.name); }} style={{
                      width: 28, height: 28, borderRadius: 7, background: "var(--c-surfaceAlt)",
                      display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                    }}>
                      <Pencil size={12} strokeWidth={IW} color={"var(--c-s500)"} />
                    </div>
                    <div onClick={() => handleDeleteFolder(folder.id)} style={{
                      width: 28, height: 28, borderRadius: 7, background: "var(--c-surfaceAlt)",
                      display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                    }}>
                      <Trash2 size={12} strokeWidth={IW} color={"var(--c-err)"} />
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}

          {folders.length === 0 && !showAddFolder && (
            <div style={{ textAlign: "center", padding: "24px 0", color: "var(--c-s400)", fontSize: 13 }}>
              {"\u8FD8\u6CA1\u6709\u6587\u4EF6\u5939\uFF0C\u70B9\u51FB\u201C\u65B0\u5EFA\u201D\u521B\u5EFA\u4E00\u4E2A\u5427"}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WordBookPage;
