
// ==========================================
// GAMESHELF - CRUDCRUD API
// ==========================================

const RESOURCE = "games";

let apiBase = localStorage.getItem("gameShelfApiBase") || "";
let games = [];
let consoleHistory = [];

let formMode = "POST";
let baselinePayload = null;

const $ = id => document.getElementById(id);

const apiUrlInput = $("apiUrl");
const apiStatus = $("apiStatus");
const connectBtn = $("connectBtn");

const gameForm = $("gameForm");
const gamesList = $("gamesList");

const searchInput = $("searchInput");
const filterStatus = $("filterStatus");

const saveBtn = $("saveBtn");
const cancelBtn = $("cancelBtn");

const formMessage = $("formMessage");

const consoleHistoryElement = $("consoleHistory");
const singleResult = $("singleResult");

apiUrlInput.value = apiBase;

// ==========================================
// VALIDAR ENDPOINT
// ==========================================

function validateApiUrl() {

    const value = apiUrlInput.value.trim().replace(/\/+$/, "");

    if (!value) {
        throw new Error("Informe o endpoint do CrudCrud.");
    }

    let url;

    try {
        url = new URL(value);
    } catch {
        throw new Error("Informe uma URL válida.");
    }

    if (
        url.protocol !== "https:" ||
        url.hostname !== "crudcrud.com" ||
        !/^\/api\/[^/]+$/.test(url.pathname) ||
        url.search ||
        url.hash
    ) {
        throw new Error(
            "Utilize o endpoint do CrudCrud sem /games."
        );
    }

    return value;
}

function collectionUrl() {
    return `${apiBase}/${RESOURCE}`;
}

function itemUrl(id) {
    return `${collectionUrl()}/${encodeURIComponent(id)}`;
}

// ==========================================
// STATUS
// ==========================================

function setApiStatus(message, connected = false) {

    apiStatus.textContent = message;

    apiStatus.parentElement.classList.toggle(
        "online",
        connected
    );
}

// ==========================================
// SEGURANÇA HTML
// ==========================================

function escapeHTML(value) {

    return String(value ?? "").replace(
        /[&<>"']/g,
        character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]
    );
}

function safeImageURL(value) {

    if (!value) return "";

    try {
        const url = new URL(value);

        if (
            url.protocol === "https:" ||
            url.protocol === "http:"
        ) {
            return url.href;
        }

    } catch {
        return "";
    }

    return "";
}

function formatJSON(data) {

    if (data === undefined || data === null) {
        return "Nenhum conteúdo.";
    }

    if (typeof data === "string") {
        return data || "Nenhum conteúdo.";
    }

    return JSON.stringify(data, null, 2);
}

// ==========================================
// CONSOLE HTTP
// ==========================================

function addConsoleLog(entry) {

    consoleHistory.unshift(entry);

    consoleHistory = consoleHistory.slice(0, 15);

    renderConsole();
}

function renderConsole() {

    if (!consoleHistory.length) {

        consoleHistoryElement.innerHTML = `
            <div class="empty-console">
                Aguardando requisições HTTP...
            </div>
        `;

        return;
    }

    consoleHistoryElement.innerHTML = consoleHistory.map(
        (entry, index) => {

            const resultClass = entry.ok
                ? "success"
                : "error";

            return `
                <details class="console-entry"
                    ${index === 0 ? "open" : ""}>

                    <summary>

                        <span class="method-badge ${entry.method.toLowerCase()}">
                            ${entry.method}
                        </span>

                        <span class="console-url">
                            ${escapeHTML(entry.url)}
                        </span>

                        <span class="console-result ${resultClass}">
                            ${escapeHTML(entry.status)}
                        </span>

                        <span class="console-result">
                            ${entry.duration} ms
                        </span>

                    </summary>

                    <div class="console-details">

                        <h4>URL DA REQUISIÇÃO</h4>
                        <pre>${escapeHTML(entry.url)}</pre>

                        <h4>PAYLOAD ENVIADO</h4>
                        <pre>${escapeHTML(formatJSON(entry.request))}</pre>

                        <h4>RESPOSTA DA API</h4>
                        <pre>${escapeHTML(formatJSON(entry.response))}</pre>

                    </div>

                </details>
            `;
        }
    ).join("");
}

// ==========================================
// FUNÇÃO PRINCIPAL FETCH
// ==========================================

async function apiRequest(method, url, body) {

    const start = performance.now();

    const options = {
        method,
        headers: {
            "Accept": "application/json"
        }
    };

    if (body !== undefined) {

        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(body);
    }

    let response;

    try {

        response = await fetch(url, options);

    } catch (error) {

        const duration = Math.round(performance.now() - start);

        addConsoleLog({
            method,
            url,
            status: "ERRO DE REDE",
            duration,
            request: body,
            response: { error: error.message },
            ok: false
        });

        throw new Error(
            "Falha de conexão. Verifique sua internet e o endpoint."
        );
    }

    const duration = Math.round(performance.now() - start);

    const responseText = await response.text();

    let responseData = null;

    if (responseText) {

        try {
            responseData = JSON.parse(responseText);
        } catch {
            responseData = responseText;
        }
    }

    addConsoleLog({
        method,
        url,
        status: String(response.status),
        duration,
        request: body,
        response: responseData,
        ok: response.ok
    });

    if (!response.ok) {

        let message = `Erro HTTP ${response.status}`;

        if (
            responseData &&
            typeof responseData === "object" &&
            responseData.message
        ) {
            message = responseData.message;
        }

        throw new Error(message);
    }

    return responseData;
}

// ==========================================
// CONECTAR AO CRUDCRUD
// ==========================================

async function connectApi() {

    try {

        apiBase = validateApiUrl();

        localStorage.setItem(
            "gameShelfApiBase",
            apiBase
        );

        connectBtn.disabled = true;
        connectBtn.textContent = "Conectando...";

        await loadGames();

        setApiStatus("API conectada", true);

    } catch (error) {

        setApiStatus("API desconectada");

        alert(error.message);

    } finally {

        connectBtn.disabled = false;
        connectBtn.textContent = "Conectar API";
    }
}

// ==========================================
// GET - LISTAR JOGOS
// ==========================================

async function loadGames() {

    if (!apiBase) {
        throw new Error("Conecte sua API primeiro.");
    }

    setApiStatus("Carregando...");

    try {

        const data = await apiRequest(
            "GET",
            collectionUrl()
        );

        if (!Array.isArray(data)) {
            throw new Error("A API não retornou uma lista.");
        }

        games = data;

        renderGames();
        updateStatistics();

        setApiStatus("API conectada", true);

        return games;

    } catch (error) {

        setApiStatus("Erro na API");

        throw error;
    }
}

// ==========================================
// GET - CONSULTAR JOGO E ABRIR JANELA
// ==========================================

async function getOneGame(id) {

    if (!apiBase) {
        alert("Conecte sua API primeiro.");
        return;
    }

    if (!id) {
        alert("ID do jogo não encontrado.");
        return;
    }

    try {

        // Consulta o jogo diretamente no CrudCrud.

        const game = await apiRequest(
            "GET",
            itemUrl(id)
        );

        if (!game || typeof game !== "object") {
            throw new Error("Resposta inválida da API.");
        }

        // Mostra também o JSON no painel GET.

        singleResult.textContent = formatJSON(game);

        $("lookupId").value = id;

        // Título da janela.

        $("modalGameTitle").textContent =
            game.titulo || "Informações do jogo";

        const cover = safeImageURL(game.capa);

        const fields = [
            ["ID", game._id],
            ["Nome", game.titulo],
            ["Plataforma", game.plataforma],
            ["Gênero", game.genero],
            ["Ano de lançamento", game.ano],
            ["Nota", game.nota],
            ["Situação", game.situacao],
            ["URL da capa", game.capa]
        ];

        let html = "";

        // Imagem da capa.

        if (cover) {

            html += `
                <img
                    class="modal-cover"
                    src="${escapeHTML(cover)}"
                    alt="Capa de ${escapeHTML(game.titulo)}"
                >
            `;
        }

        // Informações completas.

        fields.forEach(([label, value]) => {

            html += `
                <div class="detail-item">

                    <span>${escapeHTML(label)}</span>

                    <strong>
                        ${escapeHTML(
                            value !== undefined &&
                            value !== null &&
                            value !== ""
                                ? value
                                : "Não informado"
                        )}
                    </strong>

                </div>
            `;

        });

        $("gameDetails").innerHTML = html;

        // Abre a janela GET.

        $("gameModal").hidden = false;

    } catch (error) {

        singleResult.textContent = "Erro: " + error.message;

        alert(
            "Não foi possível consultar o jogo: " +
            error.message
        );
    }
}

// ==========================================
// POST - CADASTRAR JOGO
// ==========================================

function getFormPayload() {

    const ano = $("ano").value;
    const nota = $("nota").value;

    return {

        titulo: $("titulo").value.trim(),

        plataforma: $("plataforma").value,

        genero: $("genero").value,

        ano: ano ? Number(ano) : null,

        nota: nota ? Number(nota) : null,

        situacao: $("situacao").value,

        capa: $("capa").value.trim()
    };
}

// ==========================================
// PUT - SUBSTITUIR TODOS OS DADOS
// ==========================================

async function updateGame(id, payload) {

    return await apiRequest(
        "PUT",
        itemUrl(id),
        payload
    );
}

// ==========================================
// PATCH - ALTERAÇÃO PARCIAL
// ==========================================

// O CrudCrud documenta GET, POST, PUT e DELETE.
// Para simular PATCH, fazemos GET + PUT.
// Apenas os campos alterados são modificados.

async function patchGame(id, changes) {

    const url = itemUrl(id);

    // GET: buscar os dados atuais.

    const current = await apiRequest(
        "GET",
        url
    );

    if (!current || typeof current !== "object") {
        throw new Error("Não foi possível recuperar o jogo.");
    }

    const { _id, ...currentData } = current;

    // Preservar os campos não modificados.

    const updatedData = {
        ...currentData,
        ...changes
    };

    // PUT: salvar os dados atualizados.

    return await apiRequest(
        "PUT",
        url,
        updatedData
    );
}

// ==========================================
// DELETE - EXCLUIR JOGO
// ==========================================

async function deleteGame(id) {

    if (!confirm("Tem certeza que deseja excluir este jogo?")) {
        return;
    }

    try {

        await apiRequest(
            "DELETE",
            itemUrl(id)
        );

        if ($("gameId").value === id) {
            clearForm();
        }

        await loadGames();

        alert("Jogo excluído com sucesso!");

    } catch (error) {

        alert("Erro ao excluir: " + error.message);
    }
}

// ==========================================
// ENVIAR FORMULÁRIO
// ==========================================

gameForm.addEventListener("submit", async event => {

    event.preventDefault();

    if (!apiBase) {

        showMessage(
            "Conecte sua API antes de cadastrar jogos.",
            true
        );

        return;
    }

    const payload = getFormPayload();

    if (!payload.titulo) {

        showMessage("O nome é obrigatório.", true);
        return;
    }

    if (
        payload.nota !== null &&
        (payload.nota < 0 || payload.nota > 10)
    ) {

        showMessage("A nota deve estar entre 0 e 10.", true);
        return;
    }

    if (
        payload.ano !== null &&
        (payload.ano < 1950 || payload.ano > 2100)
    ) {

        showMessage("Informe um ano válido.", true);
        return;
    }

    saveBtn.disabled = true;

    try {

        // POST

        if (formMode === "POST") {

            await apiRequest(
                "POST",
                collectionUrl(),
                payload
            );

            showMessage("Jogo cadastrado com sucesso!");
        }

        // PUT

        else if (formMode === "PUT") {

            const id = $("gameId").value;

            await updateGame(id, payload);

            showMessage("Jogo atualizado com PUT!");
        }

        // PATCH

        else if (formMode === "PATCH") {

            const id = $("gameId").value;

            const changes = {};

            Object.keys(payload).forEach(key => {

                if (
                    JSON.stringify(payload[key]) !==
                    JSON.stringify(baselinePayload[key])
                ) {
                    changes[key] = payload[key];
                }

            });

            if (!Object.keys(changes).length) {

                showMessage("Nenhum campo foi modificado.");
                return;
            }

            await patchGame(id, changes);

            showMessage("Alteração parcial realizada com sucesso!");
        }

        clearForm();

        await loadGames();

    } catch (error) {

        showMessage(error.message, true);

    } finally {

        saveBtn.disabled = false;
    }

});

// ==========================================
// PREPARAR EDIÇÃO PUT OU PATCH
// ==========================================

function selectGameForEdit(game, mode) {

    if (!game || !game._id) {
        alert("ID do jogo inválido.");
        return;
    }

    $("gameId").value = game._id;

    $("titulo").value = game.titulo ?? "";
    $("plataforma").value = game.plataforma ?? "";
    $("genero").value = game.genero ?? "";
    $("ano").value = game.ano ?? "";
    $("nota").value = game.nota ?? "";
    $("situacao").value = game.situacao ?? "Quero jogar";
    $("capa").value = game.capa ?? "";

    baselinePayload = getFormPayload();

    formMode = mode;

    if (mode === "PUT") {

        $("editorTitle").textContent = "Substituir jogo";
        $("formMethod").textContent = "PUT";

        saveBtn.textContent =
            "PUT — Substituir todos os dados";
    }

    else {

        $("editorTitle").textContent = "Alterar parcialmente";
        $("formMethod").textContent = "PATCH*";

        saveBtn.textContent =
            "PATCH — Alterar campos";
    }

    cancelBtn.hidden = false;

    showMessage("Editando: " + game.titulo);

    $("editorTitle").scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}

// ==========================================
// LIMPAR FORMULÁRIO
// ==========================================

function clearForm() {

    gameForm.reset();

    $("gameId").value = "";

    formMode = "POST";
    baselinePayload = null;

    $("editorTitle").textContent = "Cadastrar jogo";
    $("formMethod").textContent = "POST";

    saveBtn.textContent = "POST — Cadastrar jogo";

    cancelBtn.hidden = true;

    formMessage.textContent = "";
    formMessage.classList.remove("error");
}

// ==========================================
// MENSAGENS
// ==========================================

function showMessage(message, error = false) {

    formMessage.textContent = message;

    formMessage.classList.toggle(
        "error",
        error
    );
}

// ==========================================
// RENDERIZAR JOGOS
// ==========================================

function renderGames() {

    const search = searchInput.value.trim().toLowerCase();
    const status = filterStatus.value;

    const filteredGames = games.filter(game => {

        const title = String(game.titulo ?? "").toLowerCase();
        const platform = String(game.plataforma ?? "").toLowerCase();
        const genre = String(game.genero ?? "").toLowerCase();

        const matchesSearch =
            title.includes(search) ||
            platform.includes(search) ||
            genre.includes(search);

        const matchesStatus =
            !status || game.situacao === status;

        return matchesSearch && matchesStatus;
    });

    if (!filteredGames.length) {

        gamesList.innerHTML = `
            <div class="empty-state">
                <span>🎮</span>
                <h3>Nenhum jogo encontrado</h3>
                <p>Cadastre um jogo ou altere os filtros.</p>
            </div>
        `;

        return;
    }

    gamesList.innerHTML = filteredGames.map(game => {

        const id = escapeHTML(game._id);
        const title = escapeHTML(game.titulo);
        const platform = escapeHTML(
            game.plataforma || "Não informado"
        );

        const genre = escapeHTML(
            game.genero || "Não informado"
        );

        const year = escapeHTML(
            game.ano ?? "Não informado"
        );

        const rating =
            game.nota !== null &&
            game.nota !== undefined &&
            game.nota !== ""
                ? escapeHTML(game.nota) + "/10"
                : "Sem nota";

        const situation = game.situacao || "Quero jogar";

        let situationClass = "";

        if (situation === "Concluído") {
            situationClass = "completed";
        }

        if (situation === "Pausado") {
            situationClass = "paused";
        }

        if (situation === "Jogando") {
            situationClass = "playing";
        }

        const cover = safeImageURL(game.capa);

        const coverHTML = cover
            ? `
                <img
                    src="${escapeHTML(cover)}"
                    alt="Capa de ${title}"
                    loading="lazy"
                >
              `
            : `<div class="cover-placeholder">🎮</div>`;

        return `
            <article class="game-card">

                <div class="game-cover">
                    ${coverHTML}
                </div>

                <div class="game-content">

                    <h3>${title}</h3>

                    <div class="game-info">
                        <div>
                            <strong>Plataforma:</strong>
                            ${platform}
                        </div>

                        <div>
                            <strong>Gênero:</strong>
                            ${genre}
                        </div>

                        <div>
                            <strong>Ano:</strong>
                            ${year}
                        </div>

                        <div>
                            <strong>Nota:</strong>
                            ${rating}
                        </div>
                    </div>

                    <span class="game-status ${situationClass}">
                        ${escapeHTML(situation)}
                    </span>

                    <div class="card-actions">

                        <button type="button"
                            data-action="get"
                            data-id="${id}">
                            GET
                        </button>

                        <button type="button"
                            data-action="put"
                            data-id="${id}">
                            PUT
                        </button>

                        <button type="button"
                            data-action="patch"
                            data-id="${id}">
                            PATCH
                        </button>

                        <button type="button"
                            class="delete-action"
                            data-action="delete"
                            data-id="${id}">
                            DELETE
                        </button>

                    </div>

                </div>

            </article>
        `;

    }).join("");
}

// ==========================================
// BOTÕES DOS CARDS
// ==========================================

gamesList.addEventListener("click", async event => {

    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.action;

    const game = games.find(item => item._id === id);

    if (!game) {
        alert("Jogo não encontrado.");
        return;
    }

    if (action === "get") {

        // GET abre a janela com as informações.

        await getOneGame(id);
    }

    else if (action === "put") {

        selectGameForEdit(game, "PUT");
    }

    else if (action === "patch") {

        selectGameForEdit(game, "PATCH");
    }

    else if (action === "delete") {

        await deleteGame(id);
    }

});

// ==========================================
// ESTATÍSTICAS
// ==========================================

function updateStatistics() {

    $("totalGames").textContent = games.length;

    $("playingGames").textContent =
        games.filter(game => game.situacao === "Jogando").length;

    $("completedGames").textContent =
        games.filter(game => game.situacao === "Concluído").length;

    $("plannedGames").textContent =
        games.filter(game => game.situacao === "Quero jogar").length;
}

// ==========================================
// FILTROS
// ==========================================

searchInput.addEventListener("input", renderGames);
filterStatus.addEventListener("change", renderGames);

// ==========================================
// FECHAR JANELA GET
// ==========================================

function closeGameModal() {
    $("gameModal").hidden = true;
}

$("closeGameModal").addEventListener(
    "click",
    closeGameModal
);

$("modalCloseButton").addEventListener(
    "click",
    closeGameModal
);

$("modalBackground").addEventListener(
    "click",
    closeGameModal
);

document.addEventListener("keydown", event => {

    if (event.key === "Escape") {
        closeGameModal();
    }

});

// ==========================================
// EVENTOS GERAIS
// ==========================================

connectBtn.addEventListener("click", connectApi);

$("refreshBtn").addEventListener("click", async () => {

    try {
        await loadGames();
    } catch (error) {
        alert(error.message);
    }
});

$("getOneBtn").addEventListener("click", () => {

    const id = $("lookupId").value.trim();

    getOneGame(id);
});

cancelBtn.addEventListener("click", clearForm);

$("clearConsoleBtn").addEventListener("click", () => {

    consoleHistory = [];

    renderConsole();
});

// ==========================================
// INICIALIZAÇÃO
// ==========================================

clearForm();
renderGames();
renderConsole();
updateStatistics();
