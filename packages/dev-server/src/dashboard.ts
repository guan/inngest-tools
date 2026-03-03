export function renderDashboard(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inngest Tools - Dev Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0d1117; color: #c9d1d9; display: grid; grid-template-rows: auto 1fr; height: 100vh; overflow: hidden; }

    /* Header */
    header { background: #161b22; border-bottom: 1px solid #30363d; padding: 10px 20px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    header h1 { font-size: 15px; font-weight: 600; color: #e6edf3; white-space: nowrap; }
    .header-stats { display: flex; gap: 14px; font-size: 12px; color: #8b949e; }
    .stat { display: flex; align-items: center; gap: 4px; }
    .stat-value { color: #e6edf3; font-weight: 600; }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .status-dot.ok { background: #3fb950; }
    .status-dot.analyzing { background: #d29922; animation: pulse 1s infinite; }
    .status-dot.error { background: #f85149; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
    .spacer { flex: 1; }
    .btn { background: #21262d; border: 1px solid #30363d; color: #c9d1d9; padding: 4px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; transition: all 0.15s; }
    .btn:hover { background: #30363d; border-color: #8b949e; }

    /* Main layout: sidebar left + flow right */
    main { display: grid; grid-template-columns: 300px 1fr; overflow: hidden; }

    /* Sidebar */
    #sidebar { background: #0d1117; border-right: 1px solid #30363d; display: flex; flex-direction: column; overflow: hidden; }
    .sidebar-tabs { display: flex; border-bottom: 1px solid #30363d; flex-shrink: 0; }
    .sidebar-tab { flex: 1; padding: 10px 12px; font-size: 13px; font-weight: 500; color: #8b949e; background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; justify-content: center; gap: 6px; }
    .sidebar-tab:hover { color: #c9d1d9; background: #161b22; }
    .sidebar-tab.active { color: #e6edf3; border-bottom-color: #58a6ff; }
    .tab-badge { background: #30363d; color: #8b949e; padding: 1px 6px; border-radius: 10px; font-size: 10px; font-weight: 600; }
    .tab-badge.has-errors { background: #490202; color: #f85149; }
    .sidebar-search { padding: 8px; border-bottom: 1px solid #30363d; flex-shrink: 0; }
    .sidebar-search input { width: 100%; background: #161b22; border: 1px solid #30363d; color: #c9d1d9; padding: 6px 10px; border-radius: 6px; font-size: 12px; }
    .sidebar-search input:focus { outline: none; border-color: #58a6ff; }
    .sidebar-body { flex: 1; overflow-y: auto; padding: 6px; }

    /* Function list items */
    .fn-item { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border-radius: 8px; cursor: pointer; transition: background 0.15s; margin-bottom: 2px; }
    .fn-item:hover { background: #161b22; }
    .fn-item.active { background: #1c2129; }
    .fn-item.active .fn-name { color: #58a6ff; }
    .fn-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; margin-top: 3px; }
    .fn-info { flex: 1; min-width: 0; }
    .fn-name { font-size: 13px; font-weight: 600; color: #e6edf3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .fn-path { font-size: 11px; color: #484f58; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .fn-tags { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 4px; }
    .fn-tag { font-size: 10px; padding: 1px 5px; border-radius: 3px; }
    .fn-tag.event { color: #58a6ff; background: rgba(88,166,255,0.1); }
    .fn-tag.cron { color: #d29922; background: rgba(210,153,34,0.1); }

    /* Lint list */
    .lint-file { margin-bottom: 8px; padding: 0 4px; }
    .lint-filepath { font-size: 11px; color: #58a6ff; padding: 4px 0; font-weight: 500; }
    .lint-diag { background: #161b22; border-radius: 4px; padding: 6px 8px; margin-bottom: 3px; font-size: 12px; display: flex; gap: 6px; align-items: flex-start; }
    .lint-sev { flex-shrink: 0; font-weight: 600; font-size: 11px; }
    .lint-sev.error { color: #f85149; }
    .lint-sev.warning { color: #d29922; }
    .lint-msg { flex: 1; color: #c9d1d9; line-height: 1.3; }
    .lint-rule { color: #484f58; font-size: 10px; }

    /* Flow panel */
    #flow-panel { overflow-y: auto; background: #0d1117; position: relative; }
    .flow-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #484f58; gap: 12px; }
    .flow-empty-icon { font-size: 48px; opacity: 0.3; }
    .flow-empty-text { font-size: 14px; }

    /* Flow header */
    .flow-header { padding: 24px 40px 0; }
    .flow-title { font-size: 18px; font-weight: 700; color: #e6edf3; }
    .flow-subtitle { font-size: 12px; color: #484f58; margin-top: 4px; }
    .flow-configs { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
    .flow-config { font-size: 10px; padding: 2px 8px; border-radius: 4px; color: #8b949e; border: 1px solid #30363d; background: #161b22; }

    /* Flow diagram */
    .flow { display: flex; flex-direction: column; align-items: center; padding: 24px 40px 60px; }

    /* Flow cards (Motia-style) */
    .flow-card { display: flex; align-items: flex-start; gap: 12px; background: #161b22; border: 1px solid #262d3d; border-radius: 12px; padding: 14px 18px; width: 360px; position: relative; transition: border-color 0.15s, box-shadow 0.15s; }
    .flow-card:hover { border-color: #3d4663; box-shadow: 0 2px 12px rgba(0,0,0,0.3); }
    .flow-card.clickable { cursor: pointer; }
    .flow-card.clickable:hover { border-color: #58a6ff; }
    .flow-card-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; margin-top: 4px; }
    .flow-card-info { flex: 1; min-width: 0; }
    .flow-card-title { font-size: 14px; font-weight: 600; color: #e6edf3; }
    .flow-card-type { font-size: 11px; color: #8b949e; margin-top: 2px; }
    .flow-card-detail { font-size: 11px; color: #484f58; margin-top: 4px; }
    .flow-card-badge { background: #21262d; color: #8b949e; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; flex-shrink: 0; letter-spacing: 0.5px; }
    .flow-card-chevron { color: #30363d; font-size: 16px; flex-shrink: 0; align-self: center; transition: color 0.15s; }
    .flow-card.clickable:hover .flow-card-chevron { color: #58a6ff; }

    /* Connectors (dashed lines between cards) */
    .connector { display: flex; flex-direction: column; align-items: center; height: 48px; position: relative; }
    .connector-line { width: 0; height: 100%; border-left: 2px dashed #6366f1; }
    .connector::before { content: ''; position: absolute; top: -4px; left: 50%; transform: translateX(-50%); width: 8px; height: 8px; border-radius: 50%; background: #6366f1; }
    .connector::after { content: ''; position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%); width: 8px; height: 8px; border-radius: 50%; background: #6366f1; }
    .connector-label { position: absolute; left: calc(50% + 16px); top: 50%; transform: translateY(-50%); background: #161b22; border: 1px dashed #6366f1; border-radius: 12px; padding: 2px 12px; font-size: 11px; color: #c9d1d9; white-space: nowrap; }

    /* Dot colors */
    .dot-green { background: #3fb950; }
    .dot-blue { background: #58a6ff; }
    .dot-pink { background: #f472b6; }
    .dot-orange { background: #d29922; }
    .dot-purple { background: #a371f7; }
    .dot-teal { background: #2dd4bf; }

    /* Empty */
    .empty { color: #484f58; font-size: 13px; padding: 20px; text-align: center; }
  </style>
</head>
<body>
  <header>
    <h1>Inngest Tools</h1>
    <div class="header-stats">
      <div class="stat"><span class="status-dot ok" id="status-dot"></span> <span id="status-text">Ready</span></div>
      <div class="stat">Functions: <span class="stat-value" id="fn-count">0</span></div>
      <div class="stat">Events: <span class="stat-value" id="ev-count">0</span></div>
      <div class="stat">Files: <span class="stat-value" id="file-count">0</span></div>
      <div class="stat" id="analysis-time-stat" style="display:none">Analysis: <span class="stat-value" id="analysis-time">0</span>ms</div>
    </div>
    <span class="spacer"></span>
    <span id="last-analyzed" style="font-size:11px;color:#484f58"></span>
    <button class="btn" id="reanalyze-btn">Re-analyze</button>
  </header>

  <main>
    <aside id="sidebar">
      <div class="sidebar-tabs">
        <button class="sidebar-tab active" data-tab="functions" id="tab-functions">Functions <span class="tab-badge" id="fn-badge">0</span></button>
        <button class="sidebar-tab" data-tab="lint" id="tab-lint">Lint <span class="tab-badge" id="lint-badge"></span></button>
      </div>
      <div class="sidebar-search" id="search-box">
        <input type="text" id="search-input" placeholder="Search functions...">
      </div>
      <div class="sidebar-body" id="sidebar-body">
        <div class="empty">Waiting for analysis...</div>
      </div>
    </aside>

    <section id="flow-panel">
      <div class="flow-empty" id="flow-empty">
        <div class="flow-empty-icon">&#x21C4;</div>
        <div class="flow-empty-text">Select a function from the sidebar</div>
      </div>
      <div id="flow-content" style="display:none"></div>
    </section>
  </main>

  <script>
  (function() {
    var state = null;
    var selectedFnId = null;
    var activeTab = 'functions';
    var searchQuery = '';

    var STEP_LABEL = { run: 'step.run', sleep: 'step.sleep', sleepUntil: 'step.sleepUntil', waitForEvent: 'step.waitForEvent', sendEvent: 'step.sendEvent', invoke: 'step.invoke' };
    var STEP_DOT = { run: 'dot-green', sleep: 'dot-orange', sleepUntil: 'dot-orange', waitForEvent: 'dot-blue', sendEvent: 'dot-teal', invoke: 'dot-purple' };

    /* ===== SSE ===== */
    function connect() {
      var es = new EventSource('/api/events');
      es.addEventListener('state', function(e) { state = JSON.parse(e.data); render(); });
      es.addEventListener('analyzed', function(e) { state = JSON.parse(e.data); render(); });
      es.addEventListener('analyzing', function() { setStatus('analyzing', 'Analyzing...'); });
      es.addEventListener('error', function(e) {
        try { var d = JSON.parse(e.data); setStatus('error', 'Error: ' + d.message); } catch(_) {}
      });
      es.onerror = function() { setStatus('error', 'Disconnected'); };
    }
    connect();

    document.getElementById('reanalyze-btn').onclick = function() {
      fetch('/api/analyze', { method: 'POST' });
    };

    /* ===== Tabs ===== */
    document.querySelectorAll('.sidebar-tab').forEach(function(tab) {
      tab.onclick = function() {
        activeTab = tab.getAttribute('data-tab');
        document.querySelectorAll('.sidebar-tab').forEach(function(t) { t.classList.remove('active'); });
        tab.classList.add('active');
        document.getElementById('search-box').style.display = activeTab === 'functions' ? '' : 'none';
        updateSidebar();
      };
    });

    /* ===== Search ===== */
    document.getElementById('search-input').oninput = function() {
      searchQuery = this.value.toLowerCase();
      updateSidebar();
    };

    /* ===== Render ===== */
    function render() {
      if (!state) return;
      updateHeader();
      updateSidebar();
      updateFlow();
    }

    function setStatus(type, text) {
      var dot = document.getElementById('status-dot');
      dot.className = 'status-dot ' + (type === 'analyzing' ? 'analyzing' : type === 'error' ? 'error' : 'ok');
      document.getElementById('status-text').textContent = text;
    }

    /* ===== Header ===== */
    function updateHeader() {
      if (state.analyzing) setStatus('analyzing', 'Analyzing...');
      else if (state.error) setStatus('error', state.error);
      else setStatus('ok', 'Ready');

      var a = state.analysis;
      document.getElementById('fn-count').textContent = a ? a.functions.length : 0;
      document.getElementById('ev-count').textContent = a ? Object.keys(a.eventMap).length : 0;
      document.getElementById('file-count').textContent = a ? a.analyzedFiles : 0;
      document.getElementById('fn-badge').textContent = a ? a.functions.length : 0;

      if (a && a.analysisTimeMs != null) {
        document.getElementById('analysis-time').textContent = a.analysisTimeMs;
        document.getElementById('analysis-time-stat').style.display = '';
      }
      if (state.lastAnalyzedAt) {
        document.getElementById('last-analyzed').textContent = 'Last: ' + new Date(state.lastAnalyzedAt).toLocaleTimeString();
      }

      /* Lint badge */
      var lr = state.lintResult;
      var lintBadge = document.getElementById('lint-badge');
      if (lr && lr.diagnostics.length > 0) {
        var total = lr.diagnostics.length;
        lintBadge.textContent = total;
        lintBadge.className = 'tab-badge' + (lr.summary.errors > 0 ? ' has-errors' : '');
      } else {
        lintBadge.textContent = '';
        lintBadge.className = 'tab-badge';
      }
    }

    /* ===== Sidebar ===== */
    function updateSidebar() {
      if (activeTab === 'functions') renderFunctionList();
      else renderLintList();
    }

    function renderFunctionList() {
      var el = document.getElementById('sidebar-body');
      var a = state ? state.analysis : null;
      if (!a || a.functions.length === 0) {
        el.innerHTML = '<div class="empty">No functions found</div>';
        return;
      }

      var fns = a.functions;
      if (searchQuery) {
        fns = fns.filter(function(fn) {
          return fn.id.toLowerCase().includes(searchQuery) || fn.relativePath.toLowerCase().includes(searchQuery);
        });
      }

      if (fns.length === 0) {
        el.innerHTML = '<div class="empty">No matches</div>';
        return;
      }

      el.innerHTML = fns.map(function(fn) {
        var isActive = fn.id === selectedFnId;
        var dotClass = 'dot-green';
        if (fn.triggers.length > 0) {
          var t0 = fn.triggers[0];
          if (t0.type === 'cron') dotClass = 'dot-orange';
          else dotClass = 'dot-green';
        }

        var tags = fn.triggers.map(function(t) {
          if (t.type === 'event') return '<span class="fn-tag event">' + esc(t.event || 'dynamic') + '</span>';
          if (t.type === 'cron') return '<span class="fn-tag cron">' + esc(t.cron) + '</span>';
          return '';
        }).join('');

        return '<div class="fn-item' + (isActive ? ' active' : '') + '" data-fn="' + esc(fn.id) + '">'
          + '<div class="fn-dot ' + dotClass + '"></div>'
          + '<div class="fn-info">'
          + '<div class="fn-name">' + esc(fn.id) + '</div>'
          + '<div class="fn-path">' + esc(fn.relativePath) + ':' + fn.line + ' \\u00B7 ' + fn.steps.length + ' steps</div>'
          + (tags ? '<div class="fn-tags">' + tags + '</div>' : '')
          + '</div></div>';
      }).join('');

      el.querySelectorAll('.fn-item').forEach(function(item) {
        item.onclick = function() { selectFunction(item.getAttribute('data-fn')); };
      });
    }

    function renderLintList() {
      var el = document.getElementById('sidebar-body');
      var lr = state ? state.lintResult : null;
      if (!lr || lr.diagnostics.length === 0) {
        el.innerHTML = '<div class="empty">No issues found</div>';
        return;
      }

      var byFile = {};
      lr.diagnostics.forEach(function(d) {
        if (!byFile[d.filePath]) byFile[d.filePath] = [];
        byFile[d.filePath].push(d);
      });

      el.innerHTML = Object.keys(byFile).map(function(file) {
        var diags = byFile[file].map(function(d) {
          return '<div class="lint-diag">'
            + '<span class="lint-sev ' + d.severity + '">' + d.severity + '</span>'
            + '<span class="lint-msg">' + esc(d.message) + '</span>'
            + '<span class="lint-rule">' + esc(d.ruleId) + '</span>'
            + '</div>';
        }).join('');
        var short = file.split('/').slice(-2).join('/');
        return '<div class="lint-file"><div class="lint-filepath">' + esc(short) + '</div>' + diags + '</div>';
      }).join('');
    }

    /* ===== Selection ===== */
    function selectFunction(fnId) {
      selectedFnId = fnId;
      updateSidebar();
      updateFlow();
    }

    /* ===== Flow panel ===== */
    function updateFlow() {
      var emptyEl = document.getElementById('flow-empty');
      var contentEl = document.getElementById('flow-content');

      if (!selectedFnId || !state || !state.analysis) {
        emptyEl.style.display = '';
        contentEl.style.display = 'none';
        return;
      }

      var fn = state.analysis.functions.find(function(f) { return f.id === selectedFnId; });
      if (!fn) {
        emptyEl.style.display = '';
        contentEl.style.display = 'none';
        return;
      }

      emptyEl.style.display = 'none';
      contentEl.style.display = '';
      contentEl.innerHTML = renderFlowDiagram(fn);

      /* Bind click events on clickable cards */
      contentEl.querySelectorAll('.flow-card.clickable').forEach(function(card) {
        card.onclick = function() {
          var target = card.getAttribute('data-target');
          if (target) selectFunction(target);
        };
      });
    }

    function renderFlowDiagram(fn) {
      var html = '';

      /* Header */
      html += '<div class="flow-header">';
      html += '<div class="flow-title">' + esc(fn.id) + '</div>';
      html += '<div class="flow-subtitle">' + esc(fn.relativePath) + ':' + fn.line + '</div>';

      /* Config badges */
      var configs = [];
      if (fn.config.concurrency) configs.push('concurrency: ' + (fn.config.concurrency.limit || '?'));
      if (fn.config.throttle) configs.push('throttle: ' + (fn.config.throttle.limit || '?') + '/' + (fn.config.throttle.period || '?'));
      if (fn.config.retries != null) configs.push('retries: ' + fn.config.retries);
      if (fn.config.rateLimit) configs.push('rateLimit: ' + (fn.config.rateLimit.limit || '?') + '/' + (fn.config.rateLimit.period || '?'));
      if (fn.config.debounce) configs.push('debounce: ' + (fn.config.debounce.period || '?'));
      if (fn.config.batchEvents) configs.push('batch: ' + (fn.config.batchEvents.maxSize || '?'));
      if (fn.config.cancelOn && fn.config.cancelOn.length) configs.push('cancelOn: ' + fn.config.cancelOn.length);
      if (configs.length > 0) {
        html += '<div class="flow-configs">';
        configs.forEach(function(c) { html += '<span class="flow-config">' + esc(c) + '</span>'; });
        html += '</div>';
      }
      html += '</div>';

      /* Flow diagram */
      html += '<div class="flow">';

      /* Triggers */
      fn.triggers.forEach(function(t, i) {
        if (i > 0) html += connector(null);
        if (t.type === 'event') {
          html += card(t.event || 'dynamic', 'Event Trigger', 'dot-pink', null, null, null);
        } else if (t.type === 'cron') {
          html += card(t.cron, 'Cron Trigger', 'dot-orange', null, null, null);
        }
      });

      /* Steps */
      fn.steps.forEach(function(s) {
        var label = null;
        /* Show event name on connector for certain step types */
        if (s.type === 'waitForEvent' && s.waitEventName) label = s.waitEventName;
        else if (s.type === 'sendEvent' && s.sendEventName) label = s.sendEventName;

        html += connector(label);

        var type = STEP_LABEL[s.type] || s.type;
        var dotCls = STEP_DOT[s.type] || 'dot-green';
        var detail = null;
        var clickTarget = null;

        switch (s.type) {
          case 'sleep':
            if (s.duration) detail = 'Duration: ' + s.duration;
            break;
          case 'sleepUntil':
            detail = 'Waits until timestamp';
            break;
          case 'waitForEvent':
            if (s.waitTimeout) detail = 'Timeout: ' + s.waitTimeout;
            break;
          case 'invoke':
            if (s.invokeTarget) {
              detail = 'Target: ' + s.invokeTarget;
              clickTarget = s.invokeTarget;
            }
            break;
        }

        html += card(s.id || s.type, type, dotCls, detail, 'TS', clickTarget);
      });

      /* Top-level sends (not from steps) */
      fn.sends.forEach(function(s) {
        if (s.fromStepId) return;
        html += connector(s.eventName || null);
        html += card(s.eventName || 'dynamic', 'inngest.send', 'dot-teal', null, null, null);
      });

      html += '</div>';
      return html;
    }

    function card(title, type, dotCls, detail, badge, clickTarget) {
      var cls = 'flow-card' + (clickTarget ? ' clickable' : '');
      var dataAttr = clickTarget ? ' data-target="' + esc(clickTarget) + '"' : '';
      var h = '<div class="' + cls + '"' + dataAttr + '>';
      h += '<div class="flow-card-dot ' + dotCls + '"></div>';
      h += '<div class="flow-card-info">';
      h += '<div class="flow-card-title">' + esc(title) + '</div>';
      h += '<div class="flow-card-type">' + esc(type) + '</div>';
      if (detail) h += '<div class="flow-card-detail">' + esc(detail) + '</div>';
      h += '</div>';
      if (badge) h += '<span class="flow-card-badge">' + esc(badge) + '</span>';
      if (clickTarget) h += '<span class="flow-card-chevron">&#x203A;</span>';
      h += '</div>';
      return h;
    }

    function connector(label) {
      var h = '<div class="connector">';
      h += '<div class="connector-line"></div>';
      if (label) h += '<span class="connector-label">' + esc(label) + '</span>';
      h += '</div>';
      return h;
    }

    function esc(t) { return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  })();
  <\/script>
</body>
</html>`
}
