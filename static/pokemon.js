
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
        pokemon.id <= 1;



    nextPokemon.disabled =
        pokemon.id >= 1025;

}


previousPokemon.addEventListener("click", function () {

    if (currentPokemonId > 1) {

        getPokemon(currentPokemonId - 1);

    }

});


nextPokemon.addEventListener("click", function () {

    if (currentPokemonId < 1025) {

        getPokemon(currentPokemonId + 1);

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

    // Filter matching Pokémon that start with the letter entered (max 6 items)
    const matches = allPokemonList
        .filter(pokemon => pokemon.name.toLowerCase().startsWith(query))
        .slice(0, 20);

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

