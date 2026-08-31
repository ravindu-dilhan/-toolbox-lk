const searchInput = document.getElementById("toolSearch");
const filterButtons = document.querySelectorAll(".filter-btn");
const toolItems = Array.from(document.querySelectorAll(".tool-item"));
let activeFilter = "all";
const noResults = document.getElementById('noResults');

const categoryAliases = {
    audio: ["audio", "mp3", "music", "voice", "speech", "sound", "tts"],
    video: ["video", "mp4", "converter", "social", "clip", "movie", "media"],
    image: ["image", "jpg", "png", "photo", "background", "bg", "compress", "base64"],
    text: ["text", "qr", "word", "counter", "password", "case", "generator"]
};

function normalizeQuery(value) {
    return String(value || "").trim().toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function applyToolSearch() {
    if (!searchInput || !toolItems.length) {
        return;
    }

    const normalizedQuery = normalizeQuery(searchInput.value);
    const queryTerms = normalizedQuery ? normalizedQuery.split(" ") : [];

    toolItems.forEach(function (tool) {
        const title = tool.querySelector("h5");
        const description = tool.querySelector("p");
        const category = (tool.dataset.category || "all").toLowerCase();

        const aliasLookup = categoryAliases[category] || [category];
        const searchableText = [
            title ? title.textContent : "",
            description ? description.textContent : "",
            category,
            ...(aliasLookup || [])
        ].join(" ").toLowerCase();

        const matchesCategory = activeFilter === "all" || category === activeFilter;
        const matchesSearch = queryTerms.length === 0 || queryTerms.every(function (term) {
            return searchableText.includes(term);
        });
        const matches = matchesCategory && matchesSearch;

        tool.style.display = matches ? "" : "none";
    });

    if (noResults) {
        const visibleCount = toolItems.filter(t => t.style.display !== 'none').length;
        noResults.classList.toggle('d-none', visibleCount > 0);
    }
}

if (searchInput) {
    searchInput.addEventListener("input", applyToolSearch);
    searchInput.addEventListener("keyup", applyToolSearch);
}

filterButtons.forEach(function (button) {
    button.addEventListener("click", function () {
        activeFilter = this.dataset.filter || "all";

        filterButtons.forEach(function (item) {
            const isActive = item === button;
            item.classList.toggle("active", isActive);
            item.classList.toggle("btn-primary", isActive);
            item.classList.toggle("btn-outline-primary", !isActive);
        });

        applyToolSearch();
    });
});

applyToolSearch();
