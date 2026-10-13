const searchForm = document.getElementById("pokemon-search-form");
const searchInput = document.getElementById("pokemon-search");
const searchError = document.getElementById("search-error");

const placeholder = document.getElementById("pokemon-placeholder");
const pokemonCard = document.getElementById("pokemon-card");

const pokemonName = document.getElementById("pokemon-name");
const pokemonId = document.getElementById("pokemon-id");
const pokemonSprite = document.getElementById("pokemon-sprite");

const pokemonTypes = document.getElementById("pokemon-types");
const pokemonHeight = document.getElementById("pokemon-height");
const pokemonWeight = document.getElementById("pokemon-weight");

const pokemonStats = document.getElementById("pokemon-stats");

const navigation = document.getElementById("pokemon-navigation");
const previousPokemon = document.getElementById("previous-pokemon");
const nextPokemon = document.getElementById("next-pokemon");

let currentPokemonId = null;
let currentSpeciesId = null;

// Build the forms section and add it to the card
const formsSection = document.createElement("section");
formsSection.className = "pokemon-forms";
formsSection.hidden = true;
formsSection.innerHTML = `<h2>Forms</h2><ul id="pokemon-forms-list" class="forms-list"></ul>`;
pokemonCard.appendChild(formsSection);
const formsList = document.getElementById("pokemon-forms-list");

// Put the prev/next buttons above the card
pokemonCard.before(navigation);


searchForm.addEventListener("submit", function (event) {

    event.preventDefault();

    const searchValue = searchInput.value.trim().toLowerCase();
    if (!searchValue) {
        return;
    }
    getPokemon(searchValue);

});


async function getPokemon(pokemon) {

    searchError.textContent = "";

    try {

        console.log(
            "Requesting:",
            `https://pokeapi.co/api/v2/pokemon/${pokemon}`
        );

        const response = await fetch(
            `https://pokeapi.co/api/v2/pokemon/${pokemon}`
        );

        if (!response.ok) {
            throw new Error("Pokémon not found.");
        }

        const data = await response.json();

        displayPokemon(data);

    } catch (error) {

        console.error(error);

        pokemonCard.hidden = true;
        navigation.hidden = true;
        placeholder.hidden = false;

        searchError.textContent =
            "Pokémon not found. Check the name or Pokédex number and try again.";
    }
}


function displayPokemon(pokemon) {

    currentPokemonId = pokemon.id;
    // Species number is used for prev/next so forms don't break the order
    currentSpeciesId = Number(pokemon.species.url.split("/").filter(Boolean).pop());

    placeholder.hidden = true;
    pokemonCard.hidden = false;
    pokemonName.textContent = capitalise(pokemon.name);
    pokemonId.textContent = pokemon.id;
    pokemonSprite.src =
        pokemon.sprites.other["official-artwork"].front_default
        || pokemon.sprites.front_default;

    pokemonSprite.alt =
        `${capitalise(pokemon.name)} sprite`;

    pokemonTypes.textContent = pokemon.types
        .map(type => capitalise(type.type.name))
        .join(", ");

    pokemonHeight.textContent =
        `${pokemon.height / 10} m`;

    pokemonWeight.textContent =
        `${pokemon.weight / 10} kg`;

    pokemonStats.innerHTML = "";

    pokemon.stats.forEach(stat => {

        const listItem = document.createElement("li");

        listItem.textContent =
            `${formatStatName(stat.stat.name)}: ${stat.base_stat}`;

        pokemonStats.appendChild(listItem);

    });
    navigation.hidden = false;
    previousPokemon.disabled =
        currentSpeciesId <= 1;
    nextPokemon.disabled =
        currentSpeciesId >= 1025;

    loadForms(pokemon);

}

previousPokemon.addEventListener("click", function () {

    if (currentSpeciesId > 1) {
        getPokemon(currentSpeciesId - 1);
    }

});

nextPokemon.addEventListener("click", function () {

    if (currentSpeciesId < 1025) {
        getPokemon(currentSpeciesId + 1);
    }

});

function capitalise(name) {
    return name.charAt(0).toUpperCase() + name.slice(1);

}


function formatStatName(stat) {

    const names = {
        hp: "HP",
        attack: "Attack",
        defense: "Defense",
        "special-attack": "Special Attack",
        "special-defense": "Special Defense",
        speed: "Speed"
    };

    return names[stat] || capitalise(stat);

}


// Fetch all forms of a Pokémon's species and show them in the table
async function loadForms(pokemon) {

    formsList.innerHTML = "";
    formsSection.hidden = true;

    try {

        const response = await fetch(pokemon.species.url);
        if (!response.ok) return;
        const species = await response.json();

        // Ignore the result if the user has already moved to another Pokémon
        if (currentPokemonId !== pokemon.id) return;

        // Only show the table if there is more than one form
        if (species.varieties.length <= 1) return;

        species.varieties.forEach(variety => {

            const li = document.createElement("li");
            li.className = "form-item";
            li.textContent = formatFormName(variety.pokemon.name);

            // Highlight the form currently being viewed
            if (variety.pokemon.name === pokemon.name) {
                li.classList.add("current");
            }

            // On clicking a form, load that page
            li.addEventListener("click", function () {
                searchInput.value = variety.pokemon.name;
                getPokemon(variety.pokemon.name);
            });

            formsList.appendChild(li);

        });

        formsSection.hidden = false;

    } catch (err) {
        console.error("Failed to load forms:", err);
    }

}

// remove the - in the middle of the different forms 
function formatFormName(name) {
    return name.split("-").map(capitalise).join(" ");
}

// Dropdown element references
const dropdown = document.getElementById("pokemon-dropdown");
let allPokemonList = []; 

// Fetch the full list of Pokémon names once when the script loads
async function loadPokemonList() {
    try {
        const response = await fetch("https://pokeapi.co/api/v2/pokemon?limit=1025");
        if (!response.ok) return;
        const data = await response.json();
        allPokemonList = data.results;
    } catch (err) {
        console.error("Failed to load Pokémon list for autocomplete:", err);
    }
}

loadPokemonList();

// Listen for typing in the search input
searchInput.addEventListener("input", function () {
    const query = searchInput.value.trim().toLowerCase();

    // Hide dropdown if query is empty or list isn't ready
    if (!query || allPokemonList.length === 0) {
        hideDropdown();
        return;
    }

    // Filter matching Pokémon that start with the letter entered (no limit)
    const matches = allPokemonList
        .filter(pokemon => pokemon.name.toLowerCase().startsWith(query))

    if (matches.length === 0) {
        hideDropdown();
        return;
    }

    renderDropdown(matches);
});

// Render suggestions into the list
function renderDropdown(matches) {
    dropdown.innerHTML = "";

    matches.forEach(pokemon => {
        const li = document.createElement("li");
        li.className = "dropdown-item";
        li.textContent = capitalise(pokemon.name);

        // On clicking an item in the dropdown
        li.addEventListener("click", function () {
            searchInput.value = pokemon.name;
            hideDropdown();
            getPokemon(pokemon.name); // Automatically trigger search
        });

        dropdown.appendChild(li);
    });

    dropdown.hidden = false;
}

function hideDropdown() {
    dropdown.hidden = true;
    dropdown.innerHTML = "";
}

// Hide dropdown when user clicks outside the search form
document.addEventListener("click", function (event) {
    if (!searchForm.contains(event.target)) {
        hideDropdown();
    }
});