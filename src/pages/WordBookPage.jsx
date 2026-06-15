import { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import { ChevronRight, Star, BookOpen, Plus, Check, X, Pencil, Trash2, Bookmark, ChevronDown, XCircle } from "lucide-react";
import { Card, Badge, ProgressBar } from "../components/UIComponents";
import { wordBooks } from "../data/mockData";
import {
  isSupabaseConfigured,
  getUserRecentWords, getFolders,
  createFolder, renameFolder, deleteFolder,
  createDefaultFolders,
  getFolderWords, removeWordFromFolder,
  getFolderSentences, removeSentenceFromFolder,
  transformSearchResult, getWordsByThaiList,
} from "../lib/supabase.js";

const IW = 1.5;
const MAX_FOLDERS = 5;

const WordBookPage = () => {
  const { userId, handleWordTap, setSelectedSentence } = useAppContext();

  const [tab, setTab] = useState("recent");
  const [recentData, setRecentData] = useState([]);
  const [folders, setFolders] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [addFolderType, setAddFolderType] = useState("word");

  /* ── Expanded folder content states ── */
  const [expandedId, setExpandedId] = useState(null);
  const [folderContents, setFolderContents] = useState({}); // { folderId: [words/sentences] }

  /* ── Fetch data ── */
  useEffect(() => {
    if (!userId || userId === 'anonymous') return;
    if (!isSupabaseConfigured) return;
    getUserRecentWords(userId, 20).then(rows => {
      setRecentData(rows || []); // getUserRecentWords already transforms internally
    });
    // Create default folders if none exist, then fetch
    getFolders(userId).then(rows => {
      const mapped = (rows || []).map(f => ({
        id: f.id, name: f.name, color: f.color,
        wordCount: f.word_count || 0,
        sentenceCount: f.sentence_count || 0,
        folder_type: f.folder_type || 'word',
      }));
      if (mapped.length === 0) {
        createDefaultFolders(userId).then(refreshed => {
          const fresh = (refreshed || []).map(f => ({
            id: f.id, name: f.name, color: f.color,
            wordCount: f.word_count || 0,
            sentenceCount: f.sentence_count || 0,
            folder_type: f.folder_type || 'word',
          }));
          setFolders(fresh);
        });
      } else {
        setFolders(mapped);
      }
    });
  }, [userId]);

  /* ── Folder CRUD ── */
  const wordFolders = folders.filter(f => f.folder_type === 'word');
  const sentenceFolders = folders.filter(f => f.folder_type === 'sentence');

  const handleCreateFolder = (name, type = 'word') => {
    const sameTypeFolders = folders.filter(f => f.folder_type === type);
    if (sameTypeFolders.length >= MAX_FOLDERS) return;
    const colors = type === 'word'
      ? ["#5B8C7E", "#B56576", "#D4845A", "#5B7E9E", "#6B8F5E"]
      : ["#C4993D", "#B56576", "#5B8C7E", "#5B7E9E", "#D4845A"];
    const color = colors[sameTypeFolders.length % colors.length];
    const tempFolder = { id: `temp-${Date.now()}`, name, wordCount: 0, sentenceCount: 0, color, folder_type: type };
    setFolders(prev => [...prev, tempFolder]);
    if (isSupabaseConfigured && userId && userId !== 'anonymous') {
      createFolder(userId, name, color, type).then(folder => {
        if (folder) {
          setFolders(prev => prev.map(f =>
            f.id === tempFolder.id ? {
              id: folder.id, name: folder.name, color: folder.color,
              wordCount: folder.word_count || 0, sentenceCount: folder.sentence_count || 0,
              folder_type: folder.folder_type || type,
            } : f
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
    setFolderContents(prev => { const next = { ...prev }; delete next[folderId]; return next; });
    if (expandedId === folderId) setExpandedId(null);
    if (isSupabaseConfigured) deleteFolder(folderId).catch(() => {});
  };

  /* ── Expand folder to show content ── */
  const handleExpandFolder = (folderId, folderType) => {
    if (expandedId === folderId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(folderId);
    if (isSupabaseConfigured) {
      if (folderType === 'word') {
        getFolderWords(folderId).then(async words => {
          const wordTexts = (words || []).map(w => w.word);
          if (wordTexts.length === 0) {
            setFolderContents(prev => ({ ...prev, [folderId]: [] }));
            return;
          }
          // Fetch full dictionary data for all words in this folder
          const dictData = await getWordsByThaiList(wordTexts);
          const dictMap = new Map(dictData.map(r => [r.word, r]));
          const enriched = wordTexts.map(w => dictMap.get(w) || { word: w, meaning: '', pos: '', sense_count: 0 });
          setFolderContents(prev => ({ ...prev, [folderId]: enriched }));
        });
      } else {
        getFolderSentences(folderId).then(rows => {
          const sentences = (rows || []).map(r => ({
            ...r.sentences, id: r.sentences?.id || r.sentence_id, dbId: r.sentences?.id || r.sentence_id,
            folderRowId: r.id,
          })).filter(s => s.text);
          setFolderContents(prev => ({ ...prev, [folderId]: sentences }));
        });
      }
    }
  };

  /* ── Remove item from folder ── */
  const handleRemoveWord = (folderId, word) => {
    setFolderContents(prev => {
      const items = prev[folderId] || [];
      return { ...prev, [folderId]: items.filter(w => w.word !== word) };
    });
    setFolders(prev => prev.map(f => f.id === folderId ? { ...f, wordCount: Math.max(0, f.wordCount - 1) } : f));
    if (isSupabaseConfigured) removeWordFromFolder(folderId, word).catch(() => {});
  };

  const handleRemoveSentence = (folderId, sentenceId) => {
    setFolderContents(prev => {
      const items = prev[folderId] || [];
      return { ...prev, [folderId]: items.filter(s => (s.id || s.dbId) !== sentenceId) };
    });
    setFolders(prev => prev.map(f => f.id === folderId ? { ...f, sentenceCount: Math.max(0, f.sentenceCount - 1) } : f));
    if (isSupabaseConfigured) removeSentenceFromFolder(folderId, sentenceId).catch(() => {});
  };

  /* ── Add folder input component ── */
  const AddFolderInput = ({ type }) => (
    <Card style={{ padding: 12, background: "var(--c-p50)", border: `1px solid ${"var(--c-p200)"}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input autoFocus value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder={type === 'word' ? "收藏夹名称..." : "句子收藏夹名称..."} style={{
          flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${"var(--c-p200)"}`, background: "var(--c-surface)",
          fontSize: 13, color: "var(--c-p800)", outline: "none", fontFamily: "var(--zh-font), sans-serif",
        }} onKeyDown={e => {
          if (e.key === "Enter" && newFolderName.trim()) { handleCreateFolder(newFolderName.trim(), type); setNewFolderName(""); setShowAddFolder(false); }
          if (e.key === "Escape") { setShowAddFolder(false); setNewFolderName(""); }
        }} />
        <div onClick={() => { if (newFolderName.trim()) { handleCreateFolder(newFolderName.trim(), type); setNewFolderName(""); setShowAddFolder(false); }}} style={{ width: 32, height: 32, borderRadius: 8, background: "var(--c-teal)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <Check size={14} strokeWidth={2} color="#fff" />
        </div>
        <div onClick={() => { setShowAddFolder(false); setNewFolderName(""); }} style={{ width: 32, height: 32, borderRadius: 8, background: "var(--c-surfaceAlt)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <X size={14} strokeWidth={IW} color={"var(--c-s500)"} />
        </div>
      </div>
    </Card>
  );

  /* ── Folder card — shared for both word and sentence folders ── */
  const FolderCard = ({ folder, type }) => {
    const isExpanded = expandedId === folder.id;
    const items = folderContents[folder.id] || [];
    const isDefault = type === 'word' ? folder.name === '我的单词' : folder.name === '我的句子';
    const itemCount = type === 'word' ? folder.wordCount : folder.sentenceCount;
    const itemLabel = type === 'word' ? '词' : '句';

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        <Card style={{ padding: 14, cursor: "pointer" }} onClick={() => handleExpandFolder(folder.id, type)}>
          {editingId === folder.id ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input autoFocus value={editName} onChange={e => setEditName(e.target.value)} style={{
                flex: 1, padding: "8px 12px", borderRadius: 8,
                border: `1px solid ${"var(--c-p200)"}`, background: "var(--c-surface)",
                fontSize: 14, color: "var(--c-p800)", outline: "none", fontWeight: 600,
                fontFamily: "var(--zh-font), sans-serif",
              }} onKeyDown={e => {
                if (e.key === "Enter" && editName.trim()) { handleRenameFolder(folder.id, editName.trim()); setEditingId(null); setEditName(""); }
                if (e.key === "Escape") { setEditingId(null); setEditName(""); }
              }} />
              <div onClick={(e) => { e.stopPropagation(); if (editName.trim()) { handleRenameFolder(folder.id, editName.trim()); setEditingId(null); setEditName(""); }}} style={{ width: 30, height: 30, borderRadius: 8, background: "var(--c-teal)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <Check size={13} strokeWidth={2} color="#fff" />
              </div>
              <div onClick={(e) => { e.stopPropagation(); setEditingId(null); setEditName(""); }} style={{ width: 30, height: 30, borderRadius: 8, background: "var(--c-surfaceAlt)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <X size={13} strokeWidth={IW} color={"var(--c-s500)"} />
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: `${folder.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {type === 'word' ? <Star size={16} strokeWidth={IW} color={folder.color} /> : <Bookmark size={16} strokeWidth={IW} color={folder.color} />}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)" }}>{folder.name}</div>
                  <div style={{ fontSize: 11, color: "var(--c-s300)", marginTop: 1 }}>{itemCount} {itemLabel}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div onClick={(e) => { e.stopPropagation(); setEditingId(folder.id); setEditName(folder.name); }} style={{ width: 28, height: 28, borderRadius: 7, background: "var(--c-surfaceAlt)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <Pencil size={12} strokeWidth={IW} color={"var(--c-s500)"} />
                </div>
                {!isDefault && (
                  <div onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }} style={{ width: 28, height: 28, borderRadius: 7, background: "var(--c-surfaceAlt)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <Trash2 size={12} strokeWidth={IW} color={"var(--c-err)"} />
                  </div>
                )}
                {isExpanded ? <ChevronDown size={14} strokeWidth={IW} color={"var(--c-p500)"} /> : <ChevronRight size={14} strokeWidth={IW} color={"var(--c-s300)"} />}
              </div>
            </div>
          )}
        </Card>

        {/* Expanded content — word list or sentence list */}
        {isExpanded && (
          <div style={{
            marginLeft: 8, marginRight: 8, marginTop: -4,
            padding: "8px 12px 12px", borderRadius: "0 0 14 14",
            background: "var(--c-surfaceAlt)", border: `1px solid ${"var(--c-p100)"}`, borderTop: "none",
          }}>
            {items.length === 0 && !String(folder.id).startsWith('temp') && (
              <div style={{ textAlign: "center", padding: 16, color: "var(--c-s400)", fontSize: 13 }}>
                {isSupabaseConfigured ? `暂无${itemLabel}` : "未连接数据库"}
              </div>
            )}
            {items.map((item, i) => (
              type === 'word' ? (
                <div key={item.word + i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 8px", borderBottom: i < items.length - 1 ? `1px solid ${"var(--c-p100)"}` : "none" }}>
                  <div onClick={() => handleWordTap(item.word)} style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--c-teal)", fontFamily: "var(--th-font), sans-serif" }}>{item.word}</span>
                      {item.pos && <Badge bg={"var(--c-p100)"} fg={"var(--c-p700)"} style={{ fontSize: 9 }}>{item.pos}</Badge>}
                    </div>
                    {item.meaning && <div style={{ fontSize: 12, color: "var(--c-s500)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.meaning}</div>}
                  </div>
                  <div onClick={() => handleRemoveWord(folder.id, item.word)} style={{ width: 24, height: 24, borderRadius: 6, background: "var(--c-surface)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <XCircle size={12} strokeWidth={IW} color={"var(--c-err)"} />
                  </div>
                </div>
              ) : (
                <div key={(item.id || item.dbId) + i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 8px", borderBottom: i < items.length - 1 ? `1px solid ${"var(--c-p100)"}` : "none" }}>
                  <div onClick={() => { if (setSelectedSentence && item) setSelectedSentence(item); }} style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "var(--c-teal)", fontFamily: "var(--th-font), sans-serif" }}>{item.text}</div>
                    {item.actual_meaning && <div style={{ fontSize: 12, color: "var(--c-s500)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.actual_meaning}</div>}
                  </div>
                  <div onClick={() => handleRemoveSentence(folder.id, item.id || item.dbId)} style={{ width: 24, height: 24, borderRadius: 6, background: "var(--c-surface)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <XCircle size={12} strokeWidth={IW} color={"var(--c-err)"} />
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </div>
    );
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
          <button key={t.key} onClick={() => { setTab(t.key); setExpandedId(null); }} style={{
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

      {/* 我的收藏 tab — word folders with expandable content */}
      {tab === "starred" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {wordFolders.map(folder => (
            <FolderCard key={folder.id} folder={folder} type="word" />
          ))}
          {/* Add folder button */}
          {wordFolders.length < MAX_FOLDERS && !showAddFolder && (
            <div onClick={() => { setShowAddFolder(true); setAddFolderType("word"); }} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 0", borderRadius: 12, border: `1.5px dashed ${"var(--c-p300)"}`, background: "var(--c-surface)", cursor: "pointer", fontSize: 13, color: "var(--c-p500)", fontWeight: 500 }}>
              <Plus size={15} strokeWidth={IW} color={"var(--c-p500)"} />
              <span>新建收藏夹</span>
              <span style={{ fontSize: 11, color: "var(--c-s300)" }}>({wordFolders.length}/{MAX_FOLDERS})</span>
            </div>
          )}
          {wordFolders.length >= MAX_FOLDERS && (
            <div style={{ textAlign: "center", padding: "8px 0", fontSize: 12, color: "var(--c-s400)" }}>最多 {MAX_FOLDERS} 个收藏夹</div>
          )}
          {showAddFolder && addFolderType === "word" && <AddFolderInput type="word" />}
        </div>
      )}

      {/* 我的句子 tab — sentence folders with expandable content */}
      {tab === "sentences" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sentenceFolders.map(folder => (
            <FolderCard key={folder.id} folder={folder} type="sentence" />
          ))}
          {/* Add sentence folder button */}
          {sentenceFolders.length < MAX_FOLDERS && !showAddFolder && (
            <div onClick={() => { setShowAddFolder(true); setAddFolderType("sentence"); }} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 0", borderRadius: 12, border: `1.5px dashed ${"var(--c-p300)"}`, background: "var(--c-surface)", cursor: "pointer", fontSize: 13, color: "var(--c-p500)", fontWeight: 500 }}>
              <Plus size={15} strokeWidth={IW} color={"var(--c-p500)"} />
              <span>新建句子收藏夹</span>
              <span style={{ fontSize: 11, color: "var(--c-s300)" }}>({sentenceFolders.length}/{MAX_FOLDERS})</span>
            </div>
          )}
          {sentenceFolders.length >= MAX_FOLDERS && (
            <div style={{ textAlign: "center", padding: "8px 0", fontSize: 12, color: "var(--c-s400)" }}>最多 {MAX_FOLDERS} 个收藏夹</div>
          )}
          {showAddFolder && addFolderType === "sentence" && <AddFolderInput type="sentence" />}
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
