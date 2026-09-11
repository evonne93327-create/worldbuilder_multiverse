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
       WORLD RAIL RENDERING (最左側世界觀切換欄)
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

        // 支援右鍵或雙擊改名
        setupRenameTriggers(btn, 'world', world.id, function() { return world.name; });

        container.appendChild(btn);
      });
    }

    /* ==========================================================
       5. TREE RENDERING (中欄：僅渲染當前世界觀的資料夾與文檔)
       ========================================================== */
    function renderSidebarTree() {
      const container = document.getElementById("worldTreeContainer");
      const search = document.getElementById("searchInput").value.trim().toLowerCase();
      container.innerHTML = "";

      const currentWorld = appData.worldviews.find(function(w) { return w.id === activeWorldId; });
      if (!currentWorld) return;

      renderFolderLevel(currentWorld.id, null, container, search);
    }
