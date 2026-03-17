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

  const renderAppCard = (app, wide = false) => {
    const card = document.createElement("a");
    card.className = `app-card${wide ? " wide" : ""}`;
    card.href = ui.pageUrl(`pages/apps/detail.html?id=${app.id}`);
    const icon = document.createElement("div");
    icon.className = `app-icon ${pickGradient(app.name)}`;
    icon.textContent = initials(app.name);

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

    const icon = document.createElement("div");
    icon.className = `app-icon ${pickGradient(app.name)}`;
    icon.textContent = initials(app.name);

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

  const loadApps = async () => {
    try {
      const data = await api.get("/apps?limit=18");
      const items = Array.isArray(data?.items) ? data.items : [];

      if (!items.length) {
        renderEmpty(recommendedRow, "No published apps yet.");
        renderEmpty(newRow, "No updates yet.");
        renderEmpty(topList, "No charts to show yet.");
        renderHighlight(null);
        return;
      }

      const recommended = items.slice(0, 6);
      const charts = items.slice(0, 3);
      const updates = items.slice(6, 12);

      recommendedRow.innerHTML = "";
      recommended.forEach((app) => recommendedRow.appendChild(renderAppCard(app)));

      topList.innerHTML = "";
      charts.forEach((app, index) => topList.appendChild(renderTopItem(app, index + 1)));
      renderHighlight(charts[0]);

      newRow.innerHTML = "";
      updates.forEach((app) => newRow.appendChild(renderAppCard(app, true)));
    } catch (err) {
      renderEmpty(recommendedRow, "Unable to load apps.");
      renderEmpty(newRow, "Unable to load updates.");
      renderEmpty(topList, "Unable to load charts.");
      renderHighlight(null);
    }
  };

  loadApps();
})();
