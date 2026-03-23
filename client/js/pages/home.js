(() => {
  const recommendedRow = document.getElementById("recommendedRow");
  const topList = document.getElementById("topList");
  const topHighlight = document.getElementById("topHighlight");
  const newRow = document.getElementById("newRow");

  if (!recommendedRow || !topList || !topHighlight || !newRow) return;

  const gradients = ["grad-a", "grad-b", "grad-c", "grad-d", "grad-e"];

  const hash = (value) => {
    let out = 0;
    for (let i = 0; i < value.length; i += 1) {
      out = (out << 5) - out + value.charCodeAt(i);
      out |= 0;
    }
    return Math.abs(out);
  };

  const initials = (name) => {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "APP";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };

  const pickGradient = (name) => gradients[hash(String(name || "")) % gradients.length];

  const buildIcon = (app) => {
    const icon = document.createElement("div");
    icon.className = `app-icon ${pickGradient(app.name)}`;
    if (app.iconUrl) {
      icon.classList.add("has-image");
      const img = document.createElement("img");
      img.src = ui.assetUrl(app.iconUrl);
      img.alt = `${app.name} icon`;
      img.loading = "lazy";
      icon.appendChild(img);
      return icon;
    }
    icon.textContent = initials(app.name);
    return icon;
  };

  const renderAppCard = (app, wide = false) => {
    const card = document.createElement("a");
    card.className = `app-card${wide ? " wide" : ""}`;
    card.href = ui.pageUrl(`pages/apps/detail.html?id=${app.id}`);
    const icon = buildIcon(app);

    const meta = document.createElement("div");
    meta.className = "app-meta";
    const title = document.createElement("h3");
    title.textContent = app.name;
    const desc = document.createElement("p");
    const category = app.category?.name || "Apps";
    desc.textContent = category;

    meta.appendChild(title);
    meta.appendChild(desc);
    card.appendChild(icon);
    card.appendChild(meta);
    return card;
  };

  const renderTopItem = (app, rank) => {
    const li = document.createElement("li");
    li.className = "top-item";
    const rankEl = document.createElement("span");
    rankEl.className = "rank";
    rankEl.textContent = String(rank);

    const icon = buildIcon(app);

    const meta = document.createElement("div");
    meta.className = "app-meta";
    const title = document.createElement("h3");
    title.textContent = app.name;
    const desc = document.createElement("p");
    desc.textContent = app.category?.name || "Apps";

    meta.appendChild(title);
    meta.appendChild(desc);
    li.appendChild(rankEl);
    li.appendChild(icon);
    li.appendChild(meta);
    return li;
  };

  const renderHighlight = (app) => {
    topHighlight.innerHTML = "";
    const label = document.createElement("p");
    label.className = "hero-label";
    label.textContent = "Chart climber";
    const title = document.createElement("h3");
    title.textContent = app?.name || "No apps yet";
    const desc = document.createElement("p");
    desc.textContent = app?.description
      ? String(app.description).slice(0, 120)
      : "Publish an app to see it highlighted here.";
    const toolbar = document.createElement("div");
    toolbar.className = "toolbar";
    const install = document.createElement("button");
    install.className = "button";
    install.textContent = "Install";
    install.disabled = !app;
    const details = document.createElement("a");
    details.className = "button secondary";
    details.textContent = "Details";
    details.href = app ? ui.pageUrl(`pages/apps/detail.html?id=${app.id}`) : "#";
    if (!app) details.setAttribute("aria-disabled", "true");

    toolbar.appendChild(install);
    toolbar.appendChild(details);
    topHighlight.appendChild(label);
    topHighlight.appendChild(title);
    topHighlight.appendChild(desc);
    topHighlight.appendChild(toolbar);
  };

  const renderEmpty = (container, message) => {
    container.innerHTML = "";
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = message;
    container.appendChild(empty);
  };

  const extractList = (payload, key) => {
    const value = payload ? payload[key] : null;
    if (Array.isArray(value)) return value;
    if (value && Array.isArray(value.items)) return value.items;
    return [];
  };

  const goSearch = (value) => {
    const query = String(value || "").trim();
    if (!query) return;
    const url = ui.pageUrl(`pages/apps/index.html?q=${encodeURIComponent(query)}`);
    window.location.href = url;
  };

  const heroSearchInput = document.querySelector(".hero-search .input");
  const heroSearchButton = document.querySelector(".hero-search .button");
  if (heroSearchInput) {
    heroSearchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        goSearch(heroSearchInput.value);
      }
    });
  }
  if (heroSearchButton) {
    heroSearchButton.addEventListener("click", () => {
      goSearch(heroSearchInput ? heroSearchInput.value : "");
    });
  }

  const topbarSearchInput = document.querySelector(".topbar-search .input");
  if (topbarSearchInput) {
    topbarSearchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        goSearch(topbarSearchInput.value);
      }
    });
  }

  const loadApps = async () => {
    try {
      const data = await api.get("/recommendations/home?recommendedLimit=6&chartLimit=3&updateLimit=6");
      const recommended = extractList(data, "recommended");
      const charts = extractList(data, "charts");
      const updates = extractList(data, "updates");

      if (!recommended.length && !charts.length && !updates.length) {
        renderEmpty(recommendedRow, "No published apps yet.");
        renderEmpty(newRow, "No updates yet.");
        renderEmpty(topList, "No charts to show yet.");
        renderHighlight(null);
        return;
      }

      recommendedRow.innerHTML = "";
      if (!recommended.length) {
        renderEmpty(recommendedRow, "No recommendations yet.");
      } else {
        recommended.forEach((app) => recommendedRow.appendChild(renderAppCard(app)));
      }

      topList.innerHTML = "";
      if (!charts.length) {
        renderEmpty(topList, "No charts to show yet.");
        renderHighlight(null);
      } else {
        charts.forEach((app, index) => topList.appendChild(renderTopItem(app, index + 1)));
        renderHighlight(charts[0]);
      }

      newRow.innerHTML = "";
      if (!updates.length) {
        renderEmpty(newRow, "No updates yet.");
      } else {
        updates.forEach((app) => newRow.appendChild(renderAppCard(app, true)));
      }
    } catch (err) {
      renderEmpty(recommendedRow, "Unable to load apps.");
      renderEmpty(newRow, "Unable to load updates.");
      renderEmpty(topList, "Unable to load charts.");
      renderHighlight(null);
    }
  };

  loadApps();
})();
