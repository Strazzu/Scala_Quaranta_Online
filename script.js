/**
 * script.js - Client Side UI/UX Controller Architecture
 * Handles socket state synchronization, touch events, and localized mapping.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Connect to backend gateway instance
    const socket = io();

    // Local Memory Tracking Entities
    let currentLanguage = 'en';
    let localRoomCode = '';
    let localPlayerId = '';
    let selectedMeldCards = [];

    // Localization Data Dictionary Module
    const dictionary = {
        en: {
            lobby_welcome: "Join Casino Table Area",
            label_name: "Player Identity Name",
            btn_create: "Create Private Table",
            btn_join: "Join Room",
            waiting_title: "Waiting for Challengers...",
            badge_room: "Room Code:",
            btn_start: "Authorize Deal & Start",
            melds_table_title: "Table Melds Combinations",
            btn_sort: "Sort Suit/Rank",
            btn_meld_action: "Meld Selection",
            status_connecting: "Initializing Gateway Connection Protocol...",
            status_ready: "Connected safely to Server Node.",
            ROOM_NOT_FOUND: "Target room code does not exist.",
            GAME_ALREADY_STARTED: "The match has already started.",
            ROOM_FULL: "The room is full.",
            NEED_40_POINTS: "Meld score invalid. You need at least 40 points to open."
        },
        it: {
            lobby_welcome: "Accedi al Tavolo da Gioco",
            label_name: "Nome Identità Giocatore",
            btn_create: "Crea Tavolo Privato",
            btn_join: "Entra nel Tavolo",
            waiting_title: "In attesa di sfidanti...",
            badge_room: "Codice Stanza:",
            btn_start: "Autorizza Distribuzione e Inizia",
            melds_table_title: "Combinazioni Calate sul Tavolo",
            btn_sort: "Ordina Seme/Valore",
            btn_meld_action: "Cala Selezione",
            status_connecting: "Inizializzazione del protocollo di rete...",
            status_ready: "Connesso stabilmente al nodo server.",
            ROOM_NOT_FOUND: "Il codice stanza inserito non esiste.",
            GAME_ALREADY_STARTED: "La partita è già iniziata in questa stanza.",
            ROOM_FULL: "La stanza ha raggiunto il limite massimo di giocatori.",
            NEED_40_POINTS: "Combinazione non valida. Sono necessari 40 punti per aprire."
        }
    };

    // UI Cache Selectors Matrix
    const dom = {
        langToggle: document.getElementById('lang-toggle-btn'),
        statusText: document.getElementById('system-status-text'),
        screenLobby: document.getElementById('lobby-screen'),
        screenWaiting: document.getElementById('waiting-screen'),
        screenTable: document.getElementById('table-screen'),
        inputName: document.getElementById('username-input'),
        inputCode: document.getElementById('room-code-input'),
        btnCreate: document.getElementById('btn-create-room'),
        btnJoin: document.getElementById('btn-join-room'),
        btnStart: document.getElementById('btn-start-game'),
        btnSort: document.getElementById('btn-sort-hand'),
        btnMeld: document.getElementById('btn-meld-combination'),
        badgeRoom: document.getElementById('display-room-code'),
        countPlayers: document.getElementById('player-count'),
        ulPlayers: document.getElementById('players-ul'),
        opponentsRack: document.getElementById('opponents-rack'),
        deckPile: document.getElementById('deck-pile-target'),
        discardPile: document.getElementById('discard-pile-target'),
        deckCounter: document.getElementById('deck-counter-badge'),
        sharedMelds: document.getElementById('shared-melds-ground'),
        handSandbox: document.getElementById('player-hand-sandbox'),
        audioDraw: document.getElementById('snd-draw'),
        audioPlace: document.getElementById('snd-place'),
        audioShuffle: document.getElementById('snd-shuffle'),
        audioError: document.getElementById('snd-error'),
        audioWin: document.getElementById('snd-win')
    };

    // Native Interface Translation Refreshes
    function applyLocalization() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dictionary[currentLanguage][key]) {
                el.textContent = dictionary[currentLanguage][key];
            }
        });
    }

    dom.langToggle.addEventListener('click', () => {
        currentLanguage = currentLanguage === 'en' ? 'it' : 'en';
        applyLocalization();
    });

    // Gateway Sync Connectivity Observers
    socket.on('connect', () => {
        localPlayerId = socket.id;
        dom.statusText.textContent = dictionary[currentLanguage]['status_ready'];
    });

    // Navigation Lifecycle Pipeline Actions
    dom.btnCreate.addEventListener('click', () => {
        const name = dom.inputName.value.trim() || "Player_" + Math.floor(Math.random()*100);
        socket.emit('createRoom', { playerName: name });
    });

    dom.btnJoin.addEventListener('click', () => {
        const name = dom.inputName.value.trim() || "Player_" + Math.floor(Math.random()*100);
        const code = dom.inputCode.value.trim();
        if(!code) return;
        socket.emit('joinRoom', { roomCode: code, playerName: name });
    });

    dom.btnStart.addEventListener('click', () => {
        if(localRoomCode) socket.emit('startGame', { roomCode: localRoomCode });
    });

    // Room Core Event Pipeline Routing
    socket.on('roomCreated', ({ roomCode, roomState }) => {
        localRoomCode = roomCode;
        transitionToView(dom.screenWaiting);
        updateWaitingLounge(roomState);
    });

    socket.on('roomUpdated', (roomState) => {
        updateWaitingLounge(roomState);
    });

    socket.on('gameStartedSignal', (roomState) => {
        dom.audioShuffle.play();
        transitionToView(dom.screenTable);
        syncGameBoard(roomState);
    });

    socket.on('errorMsg', ({ key }) => {
        dom.audioError.play();
        alert(dictionary[currentLanguage][key] || key);
    });

    function transitionToView(targetScreen) {
        document.querySelectorAll('.view-panel').forEach(s => s.classList.remove('active'));
        targetScreen.classList.add('active');
    }

    function updateWaitingLounge(state) {
        dom.badgeRoom.textContent = state.code;
        dom.countPlayers.textContent = state.players.length;
        dom.ulPlayers.innerHTML = '';
        
        state.players.forEach(p => {
            const li = document.createElement('li');
            li.textContent = p.name + (p.id === state.hostId ? " (👑 Host)" : "");
            dom.ulPlayers.appendChild(li);
        });

        if (state.hostId === localPlayerId && state.players.length >= 2) {
            dom.btnStart.classList.remove('hidden-element');
        } else {
            dom.btnStart.classList.add('hidden-element');
        }
    }

    // Comprehensive Game Arena State Sync Painter
    function syncGameBoard(state) {
        const me = state.players.find(p => p.id === localPlayerId);
        const activePlayer = state.players[state.turnIndex];
        
        // Update Bottom Bar Context Information
        dom.statusText.textContent = `Turn Tracker: ${activePlayer.name}`;

        // 1. Draw out Opponent Track Metrics
        dom.opponentsRack.innerHTML = '';
        state.players.forEach(p => {
            if(p.id === localPlayerId) return;
            const cardBadge = document.createElement('div');
            cardBadge.className = `opponent-card-badge ${p.id === activePlayer.id ? 'active-turn' : ''}`;
            cardBadge.innerHTML = `<strong>${p.name}</strong><br>Cards: ${p.hand.length} | Points: ${p.points}`;
            dom.opponentsRack.appendChild(cardBadge);
        });

        // 2. Refresh Midsection Play-space Data Metrics
        dom.deckCounter.textContent = state.deck.length;
        
        // Update Discard Pile Card Graphics
        dom.discardPile.innerHTML = '';
        if(state.discardPile.length > 0) {
            const topDiscard = state.discardPile[state.discardPile.length - 1];
            dom.discardPile.appendChild(createCardDOM(topDiscard));
        }

        // 3. Render Table melds streams
        dom.sharedMelds.innerHTML = '';
        state.melds.forEach((meldGroup, index) => {
            const cluster = document.createElement('div');
            cluster.className = 'meld-cluster-group';
            meldGroup.forEach(c => {
                cluster.appendChild(createCardDOM(c, true));
            });
            dom.sharedMelds.appendChild(cluster);
        });

        // 4. Render Active Player Hand Sandbox Area
        dom.handSandbox.innerHTML = '';
        me.hand.forEach(card => {
            const cardEl = createCardDOM(card);
            
            // Re-apply checked flags if array exists
            if (selectedMeldCards.includes(card.id)) {
                cardEl.classList.add('selected-for-meld');
            }

            // Click Handler Action to Toggle Meld Compilation Selection
            cardEl.addEventListener('click', () => {
                if (selectedMeldCards.includes(card.id)) {
                    selectedMeldCards = selectedMeldCards.filter(id => id !== card.id);
                    cardEl.classList.remove('selected-for-meld');
                } else {
                    selectedMeldCards.push(card.id);
                    cardEl.classList.add('selected-for-meld');
                }
                
                // Toggle submit activation matrix state
                if (selectedMeldCards.length >= 3) {
                    dom.btnMeld.classList.remove('disabled');
                } else {
                    dom.btnMeld.classList.add('disabled');
                }
            });

            // Native Desktop Drag Event Setup
            cardEl.setAttribute('draggable', 'true');
            cardEl.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', card.id);
            });

            dom.handSandbox.appendChild(cardEl);
        });

        // Active State Draw Logic Authorization Hooks
        dom.deckPile.onclick = (activePlayer.id === localPlayerId && !state.hasDrawn) ? () => {
            socket.emit('drawCardDeck', { roomCode: state.code });
        } : null;

        dom.discardPile.onclick = (activePlayer.id === localPlayerId && !state.hasDrawn) ? () => {
            socket.emit('drawCardDiscard', { roomCode: state.code });
        } : null;
    }

    // Dynamic Element Construction Builder Helper
    function createCardDOM(card, isMini = false) {
        const cardContainer = document.createElement('div');
        cardContainer.className = 'deck-card';
        if(isMini) cardContainer.style.transform = 'scale(0.85)';

        const isRed = ['H', 'D'].includes(card.suit);
        const suiteClass = isRed ? 'suit-red' : 'suit-black';
        
        let symbol = card.suit;
        if(card.suit === 'H') symbol = '♥';
        if(card.suit === 'D') symbol = '♦';
        if(card.suit === 'C') symbol = '♣';
        if(card.suit === 'S') symbol = '♠';

        if(card.isJoker) {
            cardContainer.innerHTML = `<div class="card-inner-graphic suit-red"><span>🃏</span><span>JOKER</span></div>`;
        } else {
            cardContainer.innerHTML = `
                <div class="card-inner-graphic ${suiteClass}">
                    <div>${card.rank} ${symbol}</div>
                    <div style="text-align: right; transform: rotate(180deg);">${card.rank} ${symbol}</div>
                </div>
            `;
        }
        return cardContainer;
    }

    // Setup Discard Pile Drag Target Receivers
    dom.discardPile.addEventListener('dragover', (e) => e.preventDefault());
    dom.discardPile.addEventListener('drop', (e) => {
        e.preventDefault();
        const droppedCardId = e.dataTransfer.getData('text/plain');
        if(droppedCardId && localRoomCode) {
            socket.emit('discardCard', { roomCode: localRoomCode, cardId: droppedCardId });
        }
    });

    // Support for Mobile Touch Controls via Fallback Interceptors
    dom.handSandbox.addEventListener('touchstart', (e) => {
        const targetCard = e.target.closest('.deck-card');
        if (!targetCard) return;
        targetCard.dataset.isDragging = "true";
    }, { passive: true });

    dom.handSandbox.addEventListener('touchend', (e) => {
        const targetCard = e.target.closest('.deck-card');
        if (!targetCard || targetCard.dataset.isDragging !== "true") return;
        delete targetCard.dataset.isDragging;

        // Target matching tracking check via coordinate calculation positions
        const touch = e.changedTouches[0];
        const discardRect = dom.discardPile.getBoundingClientRect();

        if (touch.clientX >= discardRect.left && touch.clientX <= discardRect.right &&
            touch.clientY >= discardRect.top && touch.clientY <= discardRect.bottom) {
            
            // Extract identifier match context values from runtime cards array
            const cardsInDom = Array.from(dom.handSandbox.children);
            const index = cardsInDom.indexOf(targetCard);
            
            socket.emit('discardCard', { roomCode: localRoomCode, cardId: selectedMeldCards[index] || targetCard.id });
        }
    });

    // Action Execution Hooks
    dom.btnMeld.addEventListener('click', () => {
        if(selectedMeldCards.length < 3) return;
        socket.emit('submitMeld', { roomCode: localRoomCode, cardIds: selectedMeldCards });
        selectedMeldCards = [];
    });

    // Hand Auto-Sorting (Suits ordered recursively, followed by ranks)
    dom.btnSort.addEventListener('click', () => {
        const cardsEl = Array.from(dom.handSandbox.children);
        // Local presentation sort optimization styling arrangement rule triggers
        cardsEl.sort((a, b) => a.innerText.localeCompare(b.innerText));
        dom.handSandbox.innerHTML = '';
        cardsEl.forEach(el => dom.handSandbox.appendChild(el));
    });

    // Event Success Response Streams Management
    socket.on('cardDrawnDeckSuccess', ({ roomState }) => {
        dom.audioDraw.play();
        syncGameBoard(roomState);
    });

    socket.on('cardDrawnDiscardSuccess', ({ roomState }) => {
        dom.audioDraw.play();
        syncGameBoard(roomState);
    });

    socket.on('meldSubmittedSuccess', (roomState) => {
        dom.audioPlace.play();
        syncGameBoard(roomState);
    });

    socket.on('turnEnded', (roomState) => {
        dom.audioPlace.play();
        syncGameBoard(roomState);
    });

    socket.on('handClosed', ({ roomState, winnerName }) => {
        dom.audioWin.play();
        alert(`Hand Closed! Winner: ${winnerName}`);
        syncGameBoard(roomState);
        transitionToView(dom.screenWaiting);
    });

    // Apply basic language rules execution upon initial evaluation runtime load
    applyLocalization();
});
