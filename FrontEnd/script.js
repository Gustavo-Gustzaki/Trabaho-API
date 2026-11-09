
const API_URL = "http://localhost:3000/games";

const form = document.getElementById("game-form");
const gamesList = document.getElementById("games-list");

const gameId = document.getElementById("game-id");
const title = document.getElementById("title");
const genre = document.getElementById("genre");
const platform = document.getElementById("platform");
const status = document.getElementById("status");
const rating = document.getElementById("rating");

const submitBtn = document.getElementById("submit-btn");
const cancelBtn = document.getElementById("cancel-btn");

// READ
async function getGames() {
    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("Erro ao buscar jogos");
        }

        const games = await response.json();

        gamesList.innerHTML = "";

        if (games.length === 0) {
            gamesList.innerHTML = "<p>Nenhum jogo cadastrado.</p>";
            return;
        }

        games.forEach(game => {
            const card = document.createElement("div");
            card.className = "game-card";

            const name = document.createElement("h3");
            name.textContent = game.title;

            const details = document.createElement("p");
            details.textContent =
                `Gênero: ${game.genre} | Plataforma: ${game.platform}`;

            const gameStatus = document.createElement("p");
            gameStatus.textContent = `Status: ${game.status}`;

            const gameRating = document.createElement("p");
            gameRating.textContent = `Nota: ${game.rating ?? "Sem nota"}`;

            const actions = document.createElement("div");
            actions.className = "actions";

            const editBtn = document.createElement("button");
            editBtn.className = "edit-btn";
            editBtn.textContent = "Editar";
            editBtn.addEventListener("click", () => editGame(game));

            const deleteBtn = document.createElement("button");
            deleteBtn.className = "delete-btn";
            deleteBtn.textContent = "Excluir";
            deleteBtn.addEventListener("click", () => deleteGame(game.id));

            actions.append(editBtn, deleteBtn);
            card.append(name, details, gameStatus, gameRating, actions);

            gamesList.appendChild(card);
        });

    } catch (error) {
        gamesList.textContent = error.message;
    }
}

// CREATE / UPDATE
form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const game = {
        title: title.value,
        genre: genre.value,
        platform: platform.value,
        status: status.value,
        rating: rating.value === "" ? null : Number(rating.value)
    };

    const id = gameId.value;

    const url = id ? `${API_URL}/${id}` : API_URL;
    const method = id ? "PUT" : "POST";

    try {
        const response = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(game)
        });

        if (!response.ok) {
            throw new Error("Erro ao salvar jogo");
        }

        resetForm();
        getGames();

    } catch (error) {
        alert(error.message);
    }
});

// EDIT
function editGame(game) {
    gameId.value = game.id;
    title.value = game.title;
    genre.value = game.genre;
    platform.value = game.platform;
    status.value = game.status;
    rating.value = game.rating ?? "";

    submitBtn.textContent = "Salvar alterações";
    document.getElementById("form-title").textContent = "Editar jogo";
    cancelBtn.hidden = false;

    window.scrollTo({ top: 0, behavior: "smooth" });
}

// DELETE
async function deleteGame(id) {
    if (!confirm("Deseja realmente excluir este jogo?")) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            throw new Error("Erro ao excluir jogo");
        }

        getGames();

    } catch (error) {
        alert(error.message);
    }
}

// RESET FORM
function resetForm() {
    form.reset();
    gameId.value = "";

    submitBtn.textContent = "Cadastrar jogo";
    document.getElementById("form-title").textContent = "Cadastrar jogo";
    cancelBtn.hidden = true;
}

cancelBtn.addEventListener("click", resetForm);

// Inicializar
getGames();
