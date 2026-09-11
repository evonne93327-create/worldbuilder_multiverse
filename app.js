/* ==========================================================
   1. DATA STRUCTURE & STATE
   ========================================================== */
const DEFAULT_PALETTES = {
  "c_gray":   { name: "一般隨記", bg: "#EFE9DC", text: "#5A4F42" },
  "c_blue":   { name: "地理與勢力", bg: "#DCE7F0", text: "#28506B" },
  "c_green":  { name: "定稿與完成", bg: "#DCEAE1", text: "#2C5A44" },
  "c_purple": { name: "角色人物誌", bg: "#E7DFF0", text: "#553B76" },
  "c_orange": { name: "待釐清坑洞", bg: "#F3E1CC", text: "#8A4F1F" },
  "c_rose":   { name: "重要核心伏筆", bg: "#F3DAD5", text: "#8C3527" },
  "c_yellow": { name: "靈感隨筆", bg: "#F2E8C9", text: "#7A5B12" }
};

const COMMON_ICONS = ["📁", "🌍", "⚔️", "🛡️", "📜", "🏰", "🧙", "🐉", "🔮", "🔥", "💎", "🏛️", "👑", "🗡️", "🏹", "📖", "✨", "🔖"];

let appData = {
  colorPalette: Object.assign({}, DEFAULT_PALETTES),
  tagSettings: {
    "帝國軍方": "c_blue",
    "反抗組織": "c_rose",
    "主角群": "c_purple"
  },
  worldviews: [
    {
      id: "w_main",
      name: "艾爾達斯主大陸",
      icon: "🌍",
      canvas: {
        nodes: [
          { id: "node_doc_1", docId: "doc_1", x: 40, y: 70 },
          { id: "node_doc_2", docId: "doc_2", x: 280, y: 150 }
        ],
        edges: [
          { id: "edge_1", source: "node_doc_1", target: "node_doc_2", label: "既敵對亦互相利用" }
        ]
      }
    },
    {
      id: "w_sub",
      name: "星界彼端 (外傳)",
      icon: "🔮",
      canvas: { nodes: [], edges: [] }
    }
  ],
  folders: [
    { id: "f_chars", worldId: "w_main", parentId: null, name: "核心角色群", icon: "👥" },
    { id: "f_knights", worldId: "w_main", parentId: "f_chars", name: "皇家騎士階級", icon: "⚔️" },
    { id: "f_lore", worldId: "w_main", parentId: null, name: "歷史年表", icon: "📜" }
  ],
  docs: [
    {
      id: "doc_1",
      worldId: "w_main",
      folderId: "f_knights",
      icon: "🛡️",
      title: "白銀騎士團長",
      content: "# 第一章 誓約之劍\n性格嚴謹肅穆，掌管皇城近衛軍，手握秘銀軍令狀。 #帝國軍方 #主角群\n\n# 第二章 北境之戰\n於舊曆340年率軍抵禦霜雪巨獸，戰役極為慘烈。",
      tags: ["帝國軍方", "主角群"],
      images: [],
      wordCount: 75,
      updatedAt: "2026-09-09 12:00"
    },
    {
      id: "doc_2",
      worldId: "w_main",
      folderId: "f_chars",
      icon: "🗡️",
      title: "暗夜遊俠",
      content: "# 第一章 陰影交匯\n遊走在黑市與皇城外圍的情報商人，表面玩世不恭，實際上是反抗軍的先鋒探子。 #反抗組織 #主角群",
      tags: ["反抗組織", "主角群"],
      images: [],
      wordCount: 52,
      updatedAt: "2026-09-09 12:10"
    }
  ]
};

let activeWorldId = "w_main";
let activeDocId = "doc_1";
let activeFolderId = null;
let activeView = "editor";
let isBatchDeleteMode = false;
let iconPickerContext = { type: null, id: null };
let moveFolderTargetId = null;
let connectingSourceNodeId = null;
let collapsedFolders = {};

const saved = localStorage.getItem("novel_multi_world_data_v3");
if (saved) {
  try { appData = JSON.parse(saved); } catch (e) { console.error(e); }
}

function saveData() {
  localStorage.setItem("novel_multi_world_data_v3", JSON.stringify(appData));
}

/* ==========================================================
   2. INITIALIZATION & SIDEBAR COLLAPSE
   ========================================================== */
window.addEventListener("DOMContentLoaded", function() {
  buildEmojiPicker();
  renderWorldRail();
  renderSidebarTree();
  updateWorldBadge();
  loadDocToEditor(activeDocId);
  setupCanvasEvents();
  checkResponsiveMode();
});

window.addEventListener("resize", checkResponsiveMode);

function checkResponsiveMode() {
  const isMobile = window.innerWidth <= 768;
  const closeBtn = document.getElementById("closeSidebarBtn");
  if (closeBtn) closeBtn.style.display = isMobile ? 'flex' : 'none';
  if (!isMobile) closeSidebarMobile();
}

function toggleSidebarMenu() {
  const isMobile = window.innerWidth <= 768;
  const sidebar = document.getElementById("appSidebar");
  const worldRail = document.getElementById("appWorldRail");
  const overlay = document.getElementById("sidebarOverlay");

  if (isMobile) {
    const isOpen = sidebar.classList.contains("drawer-open");
    if (isOpen) closeSidebarMobile();
    else {
      sidebar.classList.add("drawer-open");
      worldRail.classList.add("drawer-open");
      overlay.classList.add("active");
    }
  } else {
    sidebar.classList.toggle("desktop-collapsed");
    document.body.classList.toggle("desktop-sidebar-collapsed");
  }
}

function closeSidebarMobile() {
  document.getElementById("appSidebar").classList.remove("drawer-open");
  document.getElementById("appWorldRail").classList.remove("drawer-open");
  document.getElementById("sidebarOverlay").classList.remove("active");
}

function updateWorldBadge() {
  const world = appData.worldviews.find(function(w) { return w.id === activeWorldId; });
  if (world) {
    const icon = world.icon || '🌐';
    document.getElementById("currentWorldIcon").textContent = icon;
    document.getElementById("currentWorldName").textContent = world.name;
    document.getElementById("canvasWorldTitle").textContent = "🕸️ " + icon + " " + world.name + " · 專屬白板";
    const titleEl = document.getElementById("currentWorldRailTitle");
    if (titleEl) titleEl.textContent = world.name;
  }
  renderWorldRail();
}

/* ==========================================================
   WORLD RAIL RENDERING (最左側欄位)
   ========================================================== */
function renderWorldRail() {
  const container = document.getElementById("worldRailContainer");
  if (!container) return;
  container.innerHTML = "";

  appData.worldviews.forEach(function(world) {
    const btn = document.createElement("button");
    btn.className = "world-rail-btn " + (world.id === activeWorldId ? "active" : "");
    btn.title = world.name;
    btn.innerHTML = world.icon || "🌐";

    btn.onclick = function() {
      activeWorldId = world.id;
      activeFolderId = null;
      updateWorldBadge();
      renderSidebarTree();
      if (activeView === 'canvas') renderCanvas();
    };

    setupRenameTriggers(btn, 'world', world.id, function() { return world.name; });
    container.appendChild(btn);
  });
}

/* ==========================================================
   3. BREADCRUMB WITH FOLDER HOVER
   ========================================================== */
function renderBreadcrumb() {
  const bar = document.getElementById("docBreadcrumbBar");
  bar.innerHTML = "";

  const doc = appData.docs.find(function(d) { return d.id === activeDocId; });
  if (!doc) return;

  const world = appData.worldviews.find(function(w) { return w.id === doc.worldId; }) || { name: "未分類世界觀", icon: "🌐" };

  function revealFolderInTree(folderId) {
    delete collapsedFolders[doc.worldId];
    let cur = folderId;
    while (cur) {
      delete collapsedFolders[cur];
      const f = appData.folders.find(function(x) { return x.id === cur; });
      cur = f ? f.parentId : null;
    }
  }

  function buildChildDropdown(subfolders, docsHere) {
    const dropdown = document.createElement("div");
    dropdown.className = "hover-dropdown";

    if (subfolders.length === 0 && docsHere.length === 0) {
      dropdown.innerHTML = '<span style="font-size:11px; color:var(--text-muted); padding:4px;">(此層級為空)</span>';
      return dropdown;
    }

    subfolders.forEach(function(f) {
      const link = document.createElement("div");
      link.className = "dropdown-doc-link";
      link.innerHTML = `<span>${f.icon || '📁'}</span><span>${escapeHtml(f.name)}</span>`;
      link.onclick = function(e) {
        e.stopPropagation();
        activeFolderId = f.id;
        revealFolderInTree(f.id);
        renderSidebarTree();
      };
      dropdown.appendChild(link);
    });

    docsHere.forEach(function(d) {
      const link = document.createElement("div");
      link.className = "dropdown-doc-link";
      link.innerHTML = `<span>${d.icon || '📄'}</span><span>${escapeHtml(d.title || '無標題')}</span>`;
      link.onclick = function(e) {
        e.stopPropagation();
        loadDocToEditor(d.id);
      };
      dropdown.appendChild(link);
    });

    return dropdown;
  }

  // 1. Worldview Breadcrumb Item
  const worldItem = document.createElement("span");
  worldItem.className = "breadcrumb-item";
  worldItem.innerHTML = `<span>${world.icon || '🌐'} ${escapeHtml(world.name)}</span>`;
  worldItem.onclick = function() {
    activeWorldId = world.id;
    activeFolderId = null;
    delete collapsedFolders[world.id];
    updateWorldBadge();
    renderSidebarTree();
  };
  const worldTopFolders = appData.folders.filter(function(f) { return f.worldId === world.id && f.parentId === null; });
  const worldRootDocs = appData.docs.filter(function(d) { return d.worldId === world.id && !d.folderId; });
  worldItem.appendChild(buildChildDropdown(worldTopFolders, worldRootDocs));
  bar.appendChild(worldItem);

  // 2. Folder Hierarchy Items
  const folderChain = [];
  let curFolderId = doc.folderId;
  while (curFolderId) {
    const f = appData.folders.find(function(item) { return item.id === curFolderId; });
    if (f) {
      folderChain.unshift(f);
      curFolderId = f.parentId;
    } else {
      break;
    }
  }

  folderChain.forEach(function(folder) {
    const sep = document.createElement("span");
    sep.className = "breadcrumb-sep";
    sep.textContent = "›";
    bar.appendChild(sep);

    const folderItem = document.createElement("span");
    folderItem.className = "breadcrumb-item";
    folderItem.innerHTML = `<span>${folder.icon || '📁'} ${escapeHtml(folder.name)}</span>`;
    folderItem.onclick = function(e) {
      if (e.target.closest('.hover-dropdown')) return;
      activeWorldId = folder.worldId;
      activeFolderId = folder.id;
      revealFolderInTree(folder.id);
      updateWorldBadge();
      renderSidebarTree();
    };

    const subfolders = appData.folders.filter(function(f) { return f.parentId === folder.id; });
    const docsInFolder = appData.docs.filter(function(d) { return d.folderId === folder.id; });
    folderItem.appendChild(buildChildDropdown(subfolders, docsInFolder));
    bar.appendChild(folderItem);
  });

  // 3. Document Name Breadcrumb Item
  const sepDoc = document.createElement("span");
  sepDoc.className = "breadcrumb-sep";
  sepDoc.textContent = "›";
  bar.appendChild(sepDoc);

  const docItem = document.createElement("span");
  docItem.className = "breadcrumb-item";
  docItem.style.color = "var(--accent)";
  docItem.innerHTML = `<span>${doc.icon || '📄'} ${escapeHtml(doc.title || '無標題')}</span>`;
  bar.appendChild(docItem);
}

/* ==========================================================
   4. INLINE RENAME
   ========================================================== */
function promptRenameItem(type, id, currentName) {
  const newName = prompt("請輸入新的名稱：", currentName);
  if (newName && newName.trim() && newName.trim() !== currentName) {
    const val = newName.trim();
    if (type === 'world') {
      const w = appData.worldviews.find(function(x) { return x.id === id; });
      if (w) w.name = val;
    } else if (type === 'folder') {
      const f = appData.folders.find(function(x) { return x.id === id; });
      if (f) f.name = val;
    } else if (type === 'doc') {
      const d = appData.docs.find(function(x) { return x.id === id; });
      if (d) {
        d.title = val;
        if (d.id === activeDocId) document.getElementById("docTitleInput").value = val;
      }
    }
    saveData();
    renderSidebarTree();
    renderBreadcrumb();
    updateWorldBadge();
  }
}

function setupRenameTriggers(element, type, id, getNameFn) {
  element.addEventListener("contextmenu", function(e) {
    e.preventDefault();
    e.stopPropagation();
    promptRenameItem(type, id, getNameFn());
  });

  element.addEventListener("dblclick", function(e) {
    e.preventDefault();
    e.stopPropagation();
    promptRenameItem(type, id, getNameFn());
  });

  let lastTap = 0;
  element.addEventListener("touchend", function(e) {
    const now = Date.now();
    if (now - lastTap < 320 && now - lastTap > 0) {
      e.preventDefault();
      e.stopPropagation();
      promptRenameItem(type, id, getNameFn());
    }
    lastTap = now;
  });
}

/* ==========================================================
   5. TREE RENDERING (僅渲染當前世界觀的資料夾與文檔)
   ========================================================== */
function renderSidebarTree() {
  const container = document.getElementById("worldTreeContainer");
  const search = document.getElementById("searchInput").value.trim().toLowerCase();
  container.innerHTML = "";

  const currentWorld = appData.worldviews.find(function(w) { return w.id === activeWorldId; });
  if (!currentWorld) return;

  renderFolderLevel(currentWorld.id, null, container, search);
}

function folderHasChildren(folderId) {
  return appData.folders.some(function(f) { return f.parentId === folderId; }) ||
         appData.docs.some(function(d) { return d.folderId === folderId; });
}

function renderFolderLevel(worldId, parentId, parentElement, search) {
  const folders = appData.folders.filter(function(f) {
    return f.worldId === worldId && f.parentId === parentId;
  });

  folders.forEach(function(folder) {
    const folderDiv = document.createElement("div");
    folderDiv.className = "folder-group";

    const isCollapsed = !!collapsedFolders[folder.id];
    const folderRow = document.createElement("div");
    folderRow.className = "node-row" + (folder.id === activeFolderId ? " active" : "");
    folderRow.draggable = true;

    folderRow.ondragstart = function(e) {
      e.stopPropagation();
      e.dataTransfer.setData("text/plain", JSON.stringify({ type: "folder", id: folder.id }));
    };

    folderRow.onclick = function(e) {
      if (e.target.closest('.node-checkbox') || e.target.closest('.node-actions') || e.target.closest('.node-icon') || e.target.closest('.folder-caret')) return;
      activeFolderId = folder.id;
      renderSidebarTree();
    };

    const hasChildren = folderHasChildren(folder.id);
    const toggleCaret = !hasChildren ? '' : (isCollapsed ? '▸' : '▾');
    const isDefaultFolderIcon = !folder.icon || folder.icon === '📁' || folder.icon === '📂';
    const folderDisplayIcon = isDefaultFolderIcon ? ((isCollapsed || !hasChildren) ? '📁' : '📂') : folder.icon;

    folderRow.innerHTML = 
      '<div class="node-left">' +
        '<input type="checkbox" class="node-checkbox" data-type="folder" data-id="' + folder.id + '" onclick="event.stopPropagation()">' +
        '<span class="folder-caret" style="font-size:11px; color:var(--text-muted); cursor:' + (hasChildren ? 'pointer' : 'default') + '; width:12px; display:inline-block; text-align:center;">' + toggleCaret + '</span>' +
        '<span class="node-icon" onclick="event.stopPropagation(); openIconPicker(\'folder\', \'' + folder.id + '\')">' + folderDisplayIcon + '</span>' +
        '<span class="node-name">' + escapeHtml(folder.name) + '</span>' +
      '</div>' +
      '<div class="node-actions">' +
        '<button class="icon-btn" title="在此資料夾直接建檔" onclick="event.stopPropagation(); createNewDoc(\'' + folder.id + '\', \'' + worldId + '\')">📄＋</button>' +
        '<button class="icon-btn" title="新增子資料夾" onclick="event.stopPropagation(); promptCreateFolder(\'' + folder.id + '\', \'' + worldId + '\')">📁＋</button>' +
        '<button class="icon-btn" title="移動資料夾" onclick="event.stopPropagation(); promptMoveFolder(\'' + folder.id + '\')">🔀</button>' +
      '</div>';

    if (hasChildren) {
      folderRow.querySelector('.folder-caret').onclick = function(e) {
        e.stopPropagation();
        collapsedFolders[folder.id] = !collapsedFolders[folder.id];
        renderSidebarTree();
      };
    }

    setupRenameTriggers(folderRow.querySelector('.node-name'), 'folder', folder.id, function() { return folder.name; });

    folderRow.ondragover = function(e) { e.preventDefault(); folderRow.classList.add("drag-over"); };
    folderRow.ondragleave = function() { folderRow.classList.remove("drag-over"); };
    folderRow.ondrop = function(e) {
      e.preventDefault();
      e.stopPropagation();
      folderRow.classList.remove("drag-over");
      
      try {
        const dragPayload = JSON.parse(e.dataTransfer.getData("text/plain"));
        if (dragPayload.type === "doc") {
          const doc = appData.docs.find(function(d) { return d.id === dragPayload.id; });
          if (doc) {
            doc.folderId = folder.id;
            doc.worldId = worldId;
            saveData();
            renderSidebarTree();
            renderBreadcrumb();
          }
        } else if (dragPayload.type === "folder") {
          const movingFolderId = dragPayload.id;
          if (movingFolderId !== folder.id && !isDescendantOf(movingFolderId, folder.id)) {
            const f = appData.folders.find(function(x) { return x.id === movingFolderId; });
            if (f) {
              f.parentId = folder.id;
              f.worldId = worldId;
              saveData();
              renderSidebarTree();
              renderBreadcrumb();
            }
          }
        }
      } catch(err) {
        const draggedId = e.dataTransfer.getData("text/plain");
        const doc = appData.docs.find(function(d) { return d.id === draggedId; });
        if (doc) {
          doc.folderId = folder.id;
          doc.worldId = worldId;
          saveData();
          renderSidebarTree();
          renderBreadcrumb();
        }
      }
    };

    folderDiv.appendChild(folderRow);

    const childrenDiv = document.createElement("div");
    childrenDiv.className = "folder-children";
    if (isCollapsed && !search) {
      childrenDiv.style.display = "none";
    }

    renderFolderLevel(worldId, folder.id, childrenDiv, search);

    const docsInFolder = appData.docs.filter(function(d) {
      const matchFolder = d.worldId === worldId && d.folderId === folder.id;
      if (!search) return matchFolder;
      return matchFolder && (d.title.toLowerCase().includes(search) || d.content.toLowerCase().includes(search));
    });

    docsInFolder.forEach(function(doc) {
      childrenDiv.appendChild(createDocRowElement(doc));
    });

    folderDiv.appendChild(childrenDiv);
    parentElement.appendChild(folderDiv);
  });

  if (parentId === null) {
    const rootDocs = appData.docs.filter(function(d) {
      const isRoot = d.worldId === worldId && !d.folderId;
      if (!search) return isRoot;
      return isRoot && (d.title.toLowerCase().includes(search) || d.content.toLowerCase().includes(search));
    });
    rootDocs.forEach(function(doc) {
      parentElement.appendChild(createDocRowElement(doc));
    });
  }
}

function isDescendantOf(parentCheckId, targetFolderId) {
  let cur = targetFolderId;
  while (cur) {
    if (cur === parentCheckId) return true;
    const f = appData.folders.find(function(x) { return x.id === cur; });
    cur = f ? f.parentId : null;
  }
  return false;
}

function createDocRowElement(doc) {
  const row = document.createElement("div");
  row.className = "node-row " + (doc.id === activeDocId ? "active" : "");
  row.draggable = true;
  row.ondragstart = function(e) {
    e.stopPropagation();
    e.dataTransfer.setData("text/plain", JSON.stringify({ type: "doc", id: doc.id }));
  };
  row.onclick = function() {
    activeWorldId = doc.worldId;
    activeFolderId = null;
    updateWorldBadge();
    loadDocToEditor(doc.id);
    if (activeView !== 'editor') switchView('editor');
    if (window.innerWidth <= 768) closeSidebarMobile();
  };

  let displayTitle = doc.title;
  if (!displayTitle) {
    const firstLine = (doc.content || "").split("\n")[0];
    displayTitle = firstLine ? firstLine.substring(0, 16) : "無標題文檔";
  }

  row.innerHTML = 
    '<div class="node-left">' +
      '<input type="checkbox" class="node-checkbox" data-type="doc" data-id="' + doc.id + '" onclick="event.stopPropagation()">' +
      '<span class="node-icon" onclick="event.stopPropagation(); openIconPicker(\'doc\', \'' + doc.id + '\')">' + (doc.icon || '📄') + '</span>' +
      '<span class="node-name">' + escapeHtml(displayTitle) + '</span>' +
    '</div>' +
    '<div class="doc-meta-mini">' + (doc.wordCount || 0) + '字</div>';

  setupRenameTriggers(row.querySelector('.node-name'), 'doc', doc.id, function() { return doc.title || ''; });

  return row;
}

/* ==========================================================
   6. DOCUMENT CREATION & EDITING
   ========================================================== */
function promptCreateWorldview() {
  const name = prompt("請輸入新世界觀名稱：", "新世界觀");
  if (name && name.trim()) {
    const newWorld = {
      id: "w_" + Date.now(),
      name: name.trim(),
      icon: "🌐",
      canvas: { nodes: [], edges: [] }
    };
    appData.worldviews.push(newWorld);
    activeWorldId = newWorld.id;
    saveData();
    updateWorldBadge();
    renderSidebarTree();
  }
}

function promptCreateFolder(parentId = null, worldId = null) {
  const name = prompt("請輸入資料夾名稱：", "新分類");
  if (name && name.trim()) {
    appData.folders.push({
      id: "f_" + Date.now(),
      worldId: worldId || activeWorldId,
      parentId: parentId,
      name: name.trim(),
      icon: "📁"
    });
    saveData();
    renderSidebarTree();
  }
}

function createNewDoc(targetFolderId = null, worldId = null) {
  const wId = worldId || activeWorldId;
  const newDoc = {
    id: "doc_" + Date.now(),
    worldId: wId,
    folderId: targetFolderId,
    icon: "📄",
    title: "",
    content: "",
    tags: [],
    images: [],
    wordCount: 0,
    updatedAt: formatTime(new Date())
  };
  appData.docs.unshift(newDoc);
  activeWorldId = wId;
  updateWorldBadge();
  saveData();
  renderSidebarTree();
  loadDocToEditor(newDoc.id);
  switchView('editor');
  if (window.innerWidth <= 768) closeSidebarMobile();
}

function loadDocToEditor(docId) {
  activeDocId = docId;
  const doc = appData.docs.find(function(d) { return d.id === docId; });
  if (!doc) return;

  document.getElementById("docIconBtn").textContent = doc.icon || "📄";
  document.getElementById("docTitleInput").value = doc.title || "";
  document.getElementById("docContentInput").value = doc.content || "";
  document.getElementById("statWordCount").textContent = doc.wordCount || 0;
  document.getElementById("statUpdatedAt").textContent = doc.updatedAt || "--";

  renderBreadcrumb();
  renderTOC(doc.content || "");
  renderLiveHashtags(doc.tags || []);
  renderDocImages(doc.images || []);
  renderSidebarTree();
}

function onTitleChange() {
  const doc = appData.docs.find(function(d) { return d.id === activeDocId; });
  if (!doc) return;
  doc.title = document.getElementById("docTitleInput").value;
  doc.updatedAt = formatTime(new Date());
  document.getElementById("statUpdatedAt").textContent = doc.updatedAt;
  saveData();
  renderSidebarTree();
  renderBreadcrumb();
}

function onContentChange() {
  const doc = appData.docs.find(function(d) { return d.id === activeDocId; });
  if (!doc) return;

  const text = document.getElementById("docContentInput").value;
  doc.content = text;

  if (!document.getElementById("docTitleInput").value.trim()) {
    const firstLine = text.trim().split("\n")[0] || "";
    doc.title = firstLine.substring(0, 30);
  }

  const cjk = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const eng = (text.replace(/[\u4e00-\u9fa5]/g, ' ').match(/\b[a-zA-Z0-9_]+\b/g) || []).length;
  const wordCount = cjk + eng;
  doc.wordCount = wordCount;
  document.getElementById("statWordCount").textContent = wordCount;

  const foundTags = (doc.tags || []).slice();
  const regex = /#([^\s#]+)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const t = match[1].trim();
    if (!t.startsWith("第") && !foundTags.includes(t)) {
      foundTags.push(t);
    }
  }
  doc.tags = foundTags;

  foundTags.forEach(function(t) {
    if (!appData.tagSettings[t]) appData.tagSettings[t] = "c_gray";
  });

  doc.updatedAt = formatTime(new Date());
  document.getElementById("statUpdatedAt").textContent = doc.updatedAt;

  saveData();
  renderBreadcrumb();
  renderTOC(text);
  renderLiveHashtags(doc.tags);
  renderSidebarTree();
}

function renderTOC(content) {
  const container = document.getElementById("tocLinksContainer");
  const card = document.getElementById("tocCard");
  container.innerHTML = "";

  const lines = content.split("\n");
  const chapters = [];

  lines.forEach(function(line, idx) {
    const trimmed = line.trim();
    if (/^#\s+(.+)/.test(trimmed)) {
      chapters.push({ title: trimmed.replace(/^#\s+/, ''), lineIndex: idx, fullText: trimmed });
    } else if (/^(第[0-9一二三四五六七八九十百]+[章回卷節]|Chapter\s+[0-9]+)/i.test(trimmed)) {
      chapters.push({ title: trimmed.substring(0, 24), lineIndex: idx, fullText: trimmed });
    }
  });

  if (chapters.length === 0) {
    card.style.display = "none";
    return;
  }

  card.style.display = "block";
  chapters.forEach(function(ch) {
    const chip = document.createElement("span");
    chip.className = "toc-chip";
    chip.textContent = "📍 " + ch.title;
    chip.onclick = function() {
      jumpToChapter(ch.fullText);
    };
    container.appendChild(chip);
  });
}

function jumpToChapter(chapterText) {
  const textarea = document.getElementById("docContentInput");
  const pos = textarea.value.indexOf(chapterText);
  if (pos !== -1) {
    textarea.focus();
    textarea.setSelectionRange(pos, pos + chapterText.length);
    const percent = pos / Math.max(1, textarea.value.length);
    textarea.scrollTop = (textarea.scrollHeight - textarea.clientHeight) * percent;
  }
}

/* ==========================================================
   7. HASHTAGS & BODY JUMP
   ========================================================== */
function jumpToHashtagInContent(tag) {
  const textarea = document.getElementById("docContentInput");
  const fullText = textarea.value;
  const targetPattern = "#" + tag;
  const pos = fullText.indexOf(targetPattern);

  if (pos !== -1) {
    textarea.focus();
    textarea.setSelectionRange(pos, pos + targetPattern.length);
    const percent = pos / Math.max(1, fullText.length);
    textarea.scrollTop = (textarea.scrollHeight - textarea.clientHeight) * percent;
  } else {
    alert("在目前內文中未找到 #" + tag + "（可能僅以手動標籤附加）");
  }
}

function renderLiveHashtags(tags) {
  const bar = document.getElementById("liveTagToolbar");
  bar.innerHTML = "";

  (tags || []).forEach(function(tag) {
    const colorId = appData.tagSettings[tag] || "c_gray";
    const palette = appData.colorPalette[colorId] || DEFAULT_PALETTES.c_gray;

    const chip = document.createElement("span");
    chip.className = "tag-chip";
    chip.style.backgroundColor = palette.bg;
    chip.style.color = palette.text;
    
    chip.innerHTML = 
      '<span class="tag-jump-name" title="點擊直接跳轉到內文位置">#' + escapeHtml(tag) + '</span>' +
      '<span class="tag-color-arrow" title="設定色彩">▼</span>';

    chip.querySelector(".tag-jump-name").onclick = function(e) {
      e.stopPropagation();
      jumpToHashtagInContent(tag);
    };

    chip.querySelector(".tag-color-arrow").onclick = function(e) {
      e.stopPropagation();
      openColorPicker(tag, chip);
    };

    bar.appendChild(chip);
  });

  const addBtn = document.createElement("button");
  addBtn.className = "btn-add-tag";
  addBtn.textContent = "＋ 新增 Hashtag";
  addBtn.onclick = function() {
    const inputStr = prompt("請輸入欲加入的 Hashtag（可用逗號「,」或「，」同時新增多個標籤）：");
    if (inputStr && inputStr.trim()) {
      const rawTags = inputStr.split(/[,，]/);
      const doc = appData.docs.find(function(d) { return d.id === activeDocId; });
      if (doc) {
        if (!doc.tags) doc.tags = [];
        let addedCount = 0;
        rawTags.forEach(function(item) {
          const clean = item.trim().replace(/^#/, '');
          if (clean && !doc.tags.includes(clean)) {
            doc.tags.push(clean);
            if (!appData.tagSettings[clean]) appData.tagSettings[clean] = "c_gray";
            addedCount++;
          }
        });
        if (addedCount > 0) {
          saveData();
          renderLiveHashtags(doc.tags);
          renderSidebarTree();
        }
      }
    }
  };
  bar.appendChild(addBtn);
}

/* ==========================================================
   8. IMAGE ATTACHMENT & WHITEBOARD CANVAS
   ========================================================== */
function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    const base64 = evt.target.result;
    const doc = appData.docs.find(function(d) { return d.id === activeDocId; });
    if (doc) {
      if (!doc.images) doc.images = [];
      doc.images.push(base64);
      saveData();
      renderDocImages(doc.images);
    }
  };
  reader.readAsDataURL(file);
  e.target.value = "";
}

function renderDocImages(images) {
  const strip = document.getElementById("docImagesContainer");
  strip.innerHTML = "";
  if (!images || images.length === 0) return;

  images.forEach(function(imgSrc, index) {
    const box = document.createElement("div");
    box.className = "img-preview-box";
    box.innerHTML = 
      '<img src="' + imgSrc + '" alt="圖片">' +
      '<button class="img-del-btn" title="刪除圖片" onclick="deleteDocImage(' + index + ')">✕</button>';
    strip.appendChild(box);
  });
}

function deleteDocImage(index) {
  const doc = appData.docs.find(function(d) { return d.id === activeDocId; });
  if (doc && doc.images) {
    doc.images.splice(index, 1);
    saveData();
    renderDocImages(doc.images);
  }
}

function getCurrentWorldCanvas() {
  const world = appData.worldviews.find(function(w) { return w.id === activeWorldId; });
  if (!world.canvas) world.canvas = { nodes: [], edges: [] };
  return world.canvas;
}

function addCurrentDocToCanvas() {
  const currentDoc = appData.docs.find(function(d) { return d.id === activeDocId; });
  if (!currentDoc) return;

  const canvas = getCurrentWorldCanvas();
  const exists = canvas.nodes.find(function(n) { return n.docId === currentDoc.id; });
  if (exists) {
    alert("此文檔已存在於當前世界觀白板！");
    switchView('canvas');
    return;
  }

  canvas.nodes.push({
    id: "node_" + currentDoc.id,
    docId: currentDoc.id,
    x: Math.max(20, Math.min(window.innerWidth - 220, 50 + (canvas.nodes.length * 25) % 250)),
    y: Math.max(70, Math.min(window.innerHeight - 150, 80 + (canvas.nodes.length * 35) % 300))
  });

  saveData();
  switchView('canvas');
}

function renderCanvas() {
  const container = document.getElementById("canvasNodesContainer");
  container.innerHTML = "";
  const canvas = getCurrentWorldCanvas();

  canvas.nodes.forEach(function(node) {
    const doc = appData.docs.find(function(d) { return d.id === node.docId; });
    if (!doc) return;

    const el = document.createElement("div");
    el.className = "canvas-node";
    el.id = node.id;
    el.style.left = node.x + "px";
    el.style.top = node.y + "px";

    const title = (doc.icon || '📄') + " " + (doc.title || "無標題文檔");
    const preview = (doc.content || "").replace(/\n/g, " ");

    let imgHtml = "";
    if (doc.images && doc.images.length > 0) {
      imgHtml = '<img class="node-img-thumb" src="' + doc.images[0] + '">';
    }

    el.innerHTML = 
      '<div class="node-top">' +
        '<span class="node-title-txt" title="' + escapeHtml(title) + '">' + escapeHtml(title) + '</span>' +
        '<button class="node-connect-btn" title="建立關係連線" onclick="startConnect(\'' + node.id + '\', event)">🔗</button>' +
      '</div>' +
      imgHtml +
      '<div class="node-snippet">' + escapeHtml(preview) + '</div>' +
      '<div style="font-size:10px; color:var(--text-muted); text-align:right;">' + (doc.wordCount || 0) + ' 字</div>';

    el.ondblclick = function() {
      loadDocToEditor(doc.id);
      switchView('editor');
    };

    enableDualDrag(el, node);
    container.appendChild(el);
  });

  renderCanvasLines();
}

function enableDualDrag(element, nodeData) {
  let startX, startY, initialLeft, initialTop;

  element.addEventListener("mousedown", function(e) {
    if (e.target.closest('.node-connect-btn')) return;
    e.preventDefault();
    startX = e.clientX; startY = e.clientY;
    initialLeft = nodeData.x; initialTop = nodeData.y;

    function onMouseMove(m) {
      nodeData.x = initialLeft + (m.clientX - startX);
      nodeData.y = initialTop + (m.clientY - startY);
      element.style.left = nodeData.x + "px";
      element.style.top = nodeData.y + "px";
      renderCanvasLines();
    }
    function onMouseUp() {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      saveData();
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  });

  element.addEventListener("touchstart", function(e) {
    if (e.target.closest('.node-connect-btn')) return;
    const t = e.touches[0];
    startX = t.clientX; startY = t.clientY;
    initialLeft = nodeData.x; initialTop = nodeData.y;

    function onTouchMove(m) {
      m.preventDefault();
      const touch = m.touches[0];
      nodeData.x = initialLeft + (touch.clientX - startX);
      nodeData.y = initialTop + (touch.clientY - startY);
      element.style.left = nodeData.x + "px";
      element.style.top = nodeData.y + "px";
      renderCanvasLines();
    }
    function onTouchEnd() {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      saveData();
    }
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
  }, { passive: true });
}

function startConnect(nodeId, event) {
  event.stopPropagation();
  const nodeEl = document.getElementById(nodeId);
  const canvas = getCurrentWorldCanvas();

  if (!connectingSourceNodeId) {
    connectingSourceNodeId = nodeId;
    nodeEl.classList.add("connecting");
  } else if (connectingSourceNodeId === nodeId) {
    connectingSourceNodeId = null;
    nodeEl.classList.remove("connecting");
  } else {
    const relation = prompt("請輸入這兩個文檔/角色之間的關係說明：", "密切關聯 / 敵對 / 盟友");
    if (relation !== null) {
      canvas.edges.push({
        id: "edge_" + Date.now(),
        source: connectingSourceNodeId,
        target: nodeId,
        label: relation || "關聯"
      });
      saveData();
    }
    document.getElementById(connectingSourceNodeId)?.classList.remove("connecting");
    connectingSourceNodeId = null;
    renderCanvasLines();
  }
}

function renderCanvasLines() {
  const svg = document.getElementById("canvasSvg");
  svg.innerHTML = "";
  const canvas = getCurrentWorldCanvas();

  canvas.edges.forEach(function(edge) {
    const srcNode = canvas.nodes.find(function(n) { return n.id === edge.source; });
    const tgtNode = canvas.nodes.find(function(n) { return n.id === edge.target; });
    if (!srcNode || !tgtNode) return;

    const x1 = srcNode.x + 100;
    const y1 = srcNode.y + 45;
    const x2 = tgtNode.x + 100;
    const y2 = tgtNode.y + 45;

    const dx = (x2 - x1) * 0.3;
    const d = "M " + x1 + " " + y1 + " C " + (x1 + dx) + " " + y1 + ", " + (x2 - dx) + " " + y2 + ", " + x2 + " " + y2;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("class", "relation-line");
    path.onclick = function() { editEdge(edge); };

    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.onclick = function() { editEdge(edge); };

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", midX);
    text.setAttribute("y", midY);
    text.setAttribute("class", "line-label-box");
    text.textContent = edge.label;

    const textWidth = Math.max(edge.label.length * 13, 36);
    const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bgRect.setAttribute("x", midX - textWidth / 2);
    bgRect.setAttribute("y", midY - 11);
    bgRect.setAttribute("width", textWidth);
    bgRect.setAttribute("height", 22);
    bgRect.setAttribute("class", "line-label-bg");

    g.appendChild(bgRect);
    g.appendChild(text);

    svg.appendChild(path);
    svg.appendChild(g);
  });
}

function editEdge(edge) {
  const val = prompt("修改關係說明（留空可直接刪除此連線）：", edge.label);
  if (val === null) return;
  const canvas = getCurrentWorldCanvas();
  if (val.trim() === "") {
    canvas.edges = canvas.edges.filter(function(e) { return e.id !== edge.id; });
  } else {
    edge.label = val.trim();
  }
  saveData();
  renderCanvasLines();
}

function setupCanvasEvents() {
  document.getElementById("canvasView").onclick = function(e) {
    if (!e.target.closest('.canvas-node')) {
      if (connectingSourceNodeId) {
        document.getElementById(connectingSourceNodeId)?.classList.remove("connecting");
        connectingSourceNodeId = null;
      }
    }
  };
}

/* ==========================================================
   9. ICON PICKER & MOVE MODAL
   ========================================================== */
function buildEmojiPicker() {
  const grid = document.getElementById("emojiGrid");
  grid.innerHTML = "";
  COMMON_ICONS.forEach(function(emoji) {
    const div = document.createElement("div");
    div.className = "emoji-opt";
    div.textContent = emoji;
    div.onclick = function() { document.getElementById("customIconInput").value = emoji; };
    grid.appendChild(div);
  });
}

function openIconPicker(type, id) {
  iconPickerContext = { type: type, id: id };
  let currentIcon = "📄";
  if (type === 'world') {
    const w = appData.worldviews.find(function(x) { return x.id === id; });
    currentIcon = w ? w.icon : "🌐";
  } else if (type === 'folder') {
    const f = appData.folders.find(function(x) { return x.id === id; });
    currentIcon = f ? f.icon : "📁";
  } else if (type === 'doc') {
    const d = appData.docs.find(function(x) { return x.id === id; });
    currentIcon = d ? d.icon : "📄";
  }
  document.getElementById("customIconInput").value = currentIcon || "";
  document.getElementById("iconPickerModal").classList.add("active");
}

function applyCustomIcon() {
  const val = document.getElementById("customIconInput").value.trim() || "📄";
  const ctx = iconPickerContext;
  if (ctx.type === 'world') {
    const w = appData.worldviews.find(function(x) { return x.id === ctx.id; });
    if (w) {
      w.icon = val;
      updateWorldBadge();
    }
  } else if (ctx.type === 'folder') {
    const f = appData.folders.find(function(x) { return x.id === ctx.id; });
    if (f) f.icon = val;
  } else if (ctx.type === 'doc') {
    const d = appData.docs.find(function(x) { return x.id === ctx.id; });
    if (d) {
      d.icon = val;
      if (d.id === activeDocId) document.getElementById("docIconBtn").textContent = val;
    }
  }
  saveData();
  renderSidebarTree();
  renderBreadcrumb();
  document.getElementById("iconPickerModal").classList.remove("active");
}

function promptMoveFolder(folderId) {
  moveFolderTargetId = folderId;
  const select = document.getElementById("moveTargetSelect");
  select.innerHTML = "";

  appData.worldviews.forEach(function(w) {
    const opt = document.createElement("option");
    opt.value = JSON.stringify({ worldId: w.id, parentId: null });
    opt.textContent = "🌐 " + w.name + " (根目錄)";
    select.appendChild(opt);
  });

  appData.folders.forEach(function(f) {
    if (f.id !== folderId && f.parentId !== folderId && !isDescendantOf(folderId, f.id)) {
      const opt = document.createElement("option");
      opt.value = JSON.stringify({ worldId: f.worldId, parentId: f.id });
      opt.textContent = "📁 " + f.name;
      select.appendChild(opt);
    }
  });

  document.getElementById("moveModal").classList.add("active");
}

function closeMoveModal() { document.getElementById("moveModal").classList.remove("active"); }

function confirmMoveFolder() {
  const select = document.getElementById("moveTargetSelect");
  if (!select.value || !moveFolderTargetId) return;

  const target = JSON.parse(select.value);
  const folder = appData.folders.find(function(f) { return f.id === moveFolderTargetId; });
  if (folder) {
    folder.worldId = target.worldId;
    folder.parentId = target.parentId;
    saveData();
    renderSidebarTree();
    renderBreadcrumb();
  }
  closeMoveModal();
}

/* ==========================================================
   10. BATCH DELETE & SINGLE DELETE
   ========================================================== */
function toggleBatchDeleteMode() {
  isBatchDeleteMode = !isBatchDeleteMode;
  const trashBtn = document.getElementById("trashToggleBtn");
  const batchBar = document.getElementById("batchActionBar");
  const sidebar = document.getElementById("appSidebar");

  trashBtn.classList.toggle("active-danger", isBatchDeleteMode);
  batchBar.classList.toggle("active", isBatchDeleteMode);
  sidebar.classList.toggle("batch-mode", isBatchDeleteMode);
}

function executeBatchDelete() {
  const checkedBoxes = document.querySelectorAll(".node-checkbox:checked");
  if (checkedBoxes.length === 0) {
    alert("請先勾選欲刪除的項目！");
    return;
  }

  if (!confirm("確定要刪除選取的 " + checkedBoxes.length + " 個項目嗎？（包含其底下的所有資料夾與文檔）")) return;

  const docIdsToDelete = [];
  const folderIdsToDelete = [];

  checkedBoxes.forEach(function(cb) {
    const type = cb.getAttribute("data-type");
    const id = cb.getAttribute("data-id");
    if (type === "doc") docIdsToDelete.push(id);
    else if (type === "folder") folderIdsToDelete.push(id);
  });

  folderIdsToDelete.forEach(function(fId) {
    collectDescendants(fId, folderIdsToDelete, docIdsToDelete);
  });

  appData.folders = appData.folders.filter(function(f) { return !folderIdsToDelete.includes(f.id); });
  appData.docs = appData.docs.filter(function(d) { return !docIdsToDelete.includes(d.id); });

  appData.worldviews.forEach(function(w) {
    if (w.canvas) {
      const removedNodeIds = [];
      w.canvas.nodes = w.canvas.nodes.filter(function(n) {
        const keep = !docIdsToDelete.includes(n.docId);
        if (!keep) removedNodeIds.push(n.id);
        return keep;
      });
      w.canvas.edges = w.canvas.edges.filter(function(e) {
        return !removedNodeIds.includes(e.source) && !removedNodeIds.includes(e.target);
      });
    }
  });

  saveData();
  toggleBatchDeleteMode();
  renderSidebarTree();

  if (docIdsToDelete.includes(activeDocId)) {
    if (appData.docs.length > 0) loadDocToEditor(appData.docs[0].id);
    else createNewDoc();
  }
}

function collectDescendants(folderId, allFolderIds, allDocIds) {
  appData.docs.forEach(function(d) {
    if (d.folderId === folderId && !allDocIds.includes(d.id)) allDocIds.push(d.id);
  });
  const childFolders = appData.folders.filter(function(f) { return f.parentId === folderId; });
  childFolders.forEach(function(cf) {
    if (!allFolderIds.includes(cf.id)) allFolderIds.push(cf.id);
    collectDescendants(cf.id, allFolderIds, allDocIds);
  });
}

function deleteCurrentDocument() {
  const doc = appData.docs.find(function(d) { return d.id === activeDocId; });
  if (!doc) return;

  const title = doc.title || "無標題文檔";
  if (!confirm("確定要刪除文檔「" + title + "」嗎？")) return;

  appData.docs = appData.docs.filter(function(d) { return d.id !== activeDocId; });

  appData.worldviews.forEach(function(w) {
    if (w.canvas) {
      const removedNodeIds = [];
      w.canvas.nodes = w.canvas.nodes.filter(function(n) {
        const keep = n.docId !== activeDocId;
        if (!keep) removedNodeIds.push(n.id);
        return keep;
      });
      w.canvas.edges = w.canvas.edges.filter(function(e) {
        return !removedNodeIds.includes(e.source) && !removedNodeIds.includes(e.target);
      });
    }
  });

  saveData();
  renderSidebarTree();

  if (appData.docs.length > 0) loadDocToEditor(appData.docs[0].id);
  else createNewDoc();
}

/* ==========================================================
   11. BATCH EXPORT MODAL & COLOR PICKER
   ========================================================== */
function openBatchExportModal() {
  const container = document.getElementById("exportChecklistContainer");
  container.innerHTML = "";

  appData.worldviews.forEach(function(w) {
    const wTitle = document.createElement("div");
    wTitle.style.fontWeight = "700";
    wTitle.style.fontSize = "13px";
    wTitle.style.margin = "8px 0 4px 0";
    wTitle.innerHTML = "<span>" + (w.icon || '🌐') + " " + escapeHtml(w.name) + "</span>";
    container.appendChild(wTitle);

    renderExportFolderItems(w.id, null, container, 1);
  });

  document.getElementById("batchExportModal").classList.add("active");
}

function renderExportFolderItems(worldId, parentId, parentEl, level) {
  const folders = appData.folders.filter(function(f) { return f.worldId === worldId && f.parentId === parentId; });

  folders.forEach(function(folder) {
    const row = document.createElement("div");
    row.className = "export-item-row";
    row.style.paddingLeft = (level * 16) + "px";
    row.innerHTML = 
      '<input type="checkbox" class="export-checkbox" data-type="folder" data-id="' + folder.id + '" onchange="onExportFolderToggle(\'' + folder.id + '\', this.checked)">' +
      '<span>' + (folder.icon || '📁') + '</span>' +
      '<strong>' + escapeHtml(folder.name) + '</strong> <span style="font-size:11px; color:var(--text-muted);">(資料夾)</span>';
    parentEl.appendChild(row);

    renderExportFolderItems(worldId, folder.id, parentEl, level + 1);

    const docs = appData.docs.filter(function(d) { return d.worldId === worldId && d.folderId === folder.id; });
    docs.forEach(function(doc) {
      const docRow = document.createElement("div");
      docRow.className = "export-item-row";
      docRow.style.paddingLeft = ((level + 1) * 16) + "px";
      const title = doc.title || (doc.content ? doc.content.split("\n")[0].substring(0, 15) : "無標題文檔");
      docRow.innerHTML = 
        '<input type="checkbox" class="export-checkbox export-doc-item" data-type="doc" data-id="' + doc.id + '" data-parent="' + folder.id + '">' +
        '<span>' + (doc.icon || '📄') + '</span>' +
        '<span>' + escapeHtml(title) + '</span>';
      parentEl.appendChild(docRow);
    });
  });

  if (parentId === null) {
    const rootDocs = appData.docs.filter(function(d) { return d.worldId === worldId && !d.folderId; });
    rootDocs.forEach(function(doc) {
      const docRow = document.createElement("div");
      docRow.className = "export-item-row";
      docRow.style.paddingLeft = (level * 16) + "px";
      const title = doc.title || (doc.content ? doc.content.split("\n")[0].substring(0, 15) : "無標題文檔");
      docRow.innerHTML = 
        '<input type="checkbox" class="export-checkbox export-doc-item" data-type="doc" data-id="' + doc.id + '">' +
        '<span>' + (doc.icon || '📄') + '</span>' +
        '<span>' + escapeHtml(title) + '</span>';
      parentEl.appendChild(docRow);
    });
  }
}

function onExportFolderToggle(folderId, isChecked) {
  const allDocIds = [];
  const allFolderIds = [folderId];
  collectDescendants(folderId, allFolderIds, allDocIds);

  allFolderIds.forEach(function(fId) {
    const cb = document.querySelector('.export-checkbox[data-type="folder"][data-id="' + fId + '"]');
    if (cb) cb.checked = isChecked;
  });

  allDocIds.forEach(function(dId) {
    const cb = document.querySelector('.export-checkbox[data-type="doc"][data-id="' + dId + '"]');
    if (cb) cb.checked = isChecked;
  });
}

function toggleExportAll(checkAll) {
  document.querySelectorAll(".export-checkbox").forEach(function(cb) { cb.checked = checkAll; });
}

function closeBatchExportModal() {
  document.getElementById("batchExportModal").classList.remove("active");
}

function confirmBatchExport() {
  const checkedDocBoxes = document.querySelectorAll('.export-checkbox[data-type="doc"]:checked');
  if (checkedDocBoxes.length === 0) {
    alert("請至少選擇一個文檔進行匯出！");
    return;
  }

  const selectedDocIds = Array.from(checkedDocBoxes).map(function(cb) { return cb.getAttribute("data-id"); });
  const format = document.getElementById("exportFormatSelect").value;
  const exportDocs = appData.docs.filter(function(d) { return selectedDocIds.includes(d.id); });

  if (format === "html") {
    let docArticlesHtml = "";
    exportDocs.forEach(function(d) {
      let tagsHtml = "";
      if (d.tags && d.tags.length > 0) {
        d.tags.forEach(function(tag) {
          const colorKey = appData.tagSettings[tag] || "c_gray";
          const pal = appData.colorPalette[colorKey] || DEFAULT_PALETTES.c_gray;
          tagsHtml += `<span style="background:${pal.bg}; color:${pal.text}; padding:2px 8px; border-radius:12px; font-size:12px; font-weight:600; margin-right:4px;">#${escapeHtml(tag)}</span>`;
        });
      }

      let imagesHtml = "";
      if (d.images && d.images.length > 0) {
        imagesHtml += '<div style="display:flex; flex-wrap:wrap; gap:10px; margin:14px 0;">';
        d.images.forEach(function(img) {
          imagesHtml += `<img src="${img}" style="max-width:240px; max-height:200px; border-radius:8px; object-fit:cover; border:1px solid #e2e8f0;">`;
        });
        imagesHtml += '</div>';
      }

      const formattedContent = escapeHtml(d.content || "")
        .replace(/^#\s+(.+)$/gm, '<h2 style="margin:18px 0 8px 0; color:#1e293b; border-bottom:1px solid #e2e8f0; padding-bottom:4px;">$1</h2>')
        .replace(/\n/g, "<br>");

      docArticlesHtml += `
      <article style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:24px 30px; margin-bottom:28px; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
        <header style="margin-bottom:14px;">
          <h1 style="font-size:22px; font-weight:700; color:#0f172a; margin-bottom:8px;">${d.icon || '📄'} ${escapeHtml(d.title || '無標題')}</h1>
          <div style="font-size:12px; color:#64748b; display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
            <span>字數：<strong>${d.wordCount || 0}</strong></span>
            <span>更新時間：${d.updatedAt || '--'}</span>
          </div>
          <div style="margin-top:8px;">${tagsHtml}</div>
        </header>
        ${imagesHtml}
        <div style="font-size:15px; line-height:1.9; color:#334155;">${formattedContent}</div>
      </article>`;
    });

    const completeHtml = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>世界觀架構匯出文檔</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans TC", sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 24px 16px; }
    .container { max-width: 820px; margin: 0 auto; }
    .top-meta { text-align: center; margin-bottom: 30px; }
    .top-meta h1 { font-size: 26px; margin-bottom: 6px; }
    .top-meta p { color: #64748b; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="top-meta">
      <h1>📖 世界觀架構設定匯出</h1>
      <p>匯出篇數：${exportDocs.length} 篇 · 匯出日期：${formatTime(new Date())}</p>
    </div>
    ${docArticlesHtml}
  </div>
</body>
</html>`;

    downloadFile(completeHtml, "world_docs_export_" + Date.now() + ".html", "text/html;charset=utf-8");
  } else if (format === "json") {
    const exportPackage = {
      exportDate: new Date().toISOString(),
      totalDocuments: exportDocs.length,
      colorPalette: appData.colorPalette,
      tagSettings: appData.tagSettings,
      documents: exportDocs
    };
    downloadFile(JSON.stringify(exportPackage, null, 2), "world_docs_export_" + Date.now() + ".json", "application/json");
  } else {
    let textContent = "====================================\n" +
                      "世界觀架構文檔 批量導出文字檔\n" +
                      "匯出篇數：" + exportDocs.length + "\n" +
                      "匯出時間：" + formatTime(new Date()) + "\n" +
                      "====================================\n\n";

    exportDocs.forEach(function(d, idx) {
      textContent += "【項目 " + (idx + 1) + "】" + (d.icon || '') + " " + (d.title || '無標題') + "\n";
      textContent += "所屬標籤：" + (d.tags ? d.tags.map(function(t){ return '#' + t; }).join(' ') : '無') + "\n";
      textContent += "字數統計：" + (d.wordCount || 0) + " 字\n";
      textContent += "------------------------------------\n";
      textContent += (d.content || '') + "\n\n";
      textContent += "====================================\n\n";
    });
    downloadFile(textContent, "world_docs_export_" + Date.now() + ".txt", "text/plain;charset=utf-8");
  }

  closeBatchExportModal();
}

function downloadFile(content, fileName, contentType) {
  const a = document.createElement("a");
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}

function openPaletteModal() {
  const container = document.getElementById("paletteConfigList");
  container.innerHTML = "";

  Object.keys(DEFAULT_PALETTES).forEach(function(key) {
    const pal = appData.colorPalette[key] || DEFAULT_PALETTES[key];
    const row = document.createElement("div");
    row.className = "color-row";
    row.innerHTML = 
      '<div class="color-badge-demo" style="background:' + pal.bg + '; color:' + pal.text + ';">示範</div>' +
      '<input type="text" class="form-input" id="pal_name_' + key + '" value="' + escapeHtml(pal.name) + '" placeholder="定義此色盤功能...">';
    container.appendChild(row);
  });

  document.getElementById("paletteModal").classList.add("active");
}

function closePaletteModal() {
  Object.keys(DEFAULT_PALETTES).forEach(function(key) {
    const input = document.getElementById("pal_name_" + key);
    if (input && input.value.trim()) {
      appData.colorPalette[key].name = input.value.trim();
    }
  });
  saveData();
  document.getElementById("paletteModal").classList.remove("active");
  const currentDoc = appData.docs.find(function(d) { return d.id === activeDocId; });
  if (currentDoc) renderLiveHashtags(currentDoc.tags);
}

function openColorPicker(tag, anchorElement) {
  const popover = document.getElementById("colorPickerPopover");
  popover.innerHTML = '<div style="font-size:11px; font-weight:700; color:var(--text-muted); margin-bottom:4px;">指定 #' + escapeHtml(tag) + ' 的顏色：</div>';

  Object.keys(DEFAULT_PALETTES).forEach(function(key) {
    const pal = appData.colorPalette[key] || DEFAULT_PALETTES[key];
    const opt = document.createElement("div");
    opt.className = "picker-option";
    opt.innerHTML = 
      '<span style="display:inline-block; width:12px; height:12px; border-radius:3px; background:' + pal.bg + '; border:1px solid ' + pal.text + ';"></span>' +
      '<span style="color:' + pal.text + '; font-weight:600;">' + escapeHtml(pal.name) + '</span>';
    opt.onclick = function() {
      appData.tagSettings[tag] = key;
      saveData();
      popover.classList.remove("active");
      const currentDoc = appData.docs.find(function(d) { return d.id === activeDocId; });
      if (currentDoc) renderLiveHashtags(currentDoc.tags);
    };
    popover.appendChild(opt);
  });

  const rect = anchorElement.getBoundingClientRect();
  let left = rect.left + window.scrollX;
  if (left + 190 > window.innerWidth) left = window.innerWidth - 200;

  popover.style.top = (rect.bottom + window.scrollY + 6) + "px";
  popover.style.left = Math.max(10, left) + "px";
  popover.classList.add("active");
}

document.addEventListener("click", function(e) {
  const popover = document.getElementById("colorPickerPopover");
  if (popover.classList.contains("active") && !popover.contains(e.target)) {
    popover.classList.remove("active");
  }
});

function switchView(view) {
  activeView = view;
  document.getElementById("tabEditorBtn").classList.toggle("active", view === 'editor');
  document.getElementById("tabCanvasBtn").classList.toggle("active", view === 'canvas');

  document.getElementById("editorView").style.display = (view === 'editor') ? 'flex' : 'none';
  document.getElementById("canvasView").style.display = (view === 'canvas') ? 'block' : 'none';

  if (view === 'canvas') renderCanvas();
}

function exportFullDatabaseJSON() {
  downloadFile(JSON.stringify(appData, null, 2), "worldbuilder_full_db_" + Date.now() + ".json", "application/json");
}

function formatTime(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return y + "-" + m + "-" + day + " " + h + ":" + min;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
