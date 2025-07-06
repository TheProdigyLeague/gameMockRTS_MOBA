document.addEventListener('DOMContentLoaded', () => {
    const gameMap = document.getElementById('game-map');
    const playerGoldDisplay = document.getElementById('player-gold');
    const heroHealthValue = document.getElementById('hero-hp-value');

    const GAME_WIDTH = 1000;
    const GAME_HEIGHT = 1000;
    const MINION_SIZE = 20;
    const MINION_SPEED = 1; // Pixels per frame
    const TOWER_HP = 1000;
    const CORE_HP = 5000;

    let playerGold = 0;
    let heroHealth = 100;

    // --- Game State Objects ---
    const bases = {
        team1: { x: 100, y: 850, hp: CORE_HP, element: document.getElementById('base-1') },
        team2: { x: 900, y: 150, hp: CORE_HP, element: document.getElementById('base-2') }
    };

    const towers = {
        team1: [
            { id: 't1_1', x: 200, y: 750, hp: TOWER_HP, lane: 1, element: null },
            { id: 't1_2', x: 350, y: 600, hp: TOWER_HP, lane: 1, element: null },
            { id: 't1_3', x: 500, y: 450, hp: TOWER_HP, lane: 1, element: null },
            // Add more towers for different lanes
        ],
        team2: [
            { id: 't2_1', x: 800, y: 250, hp: TOWER_HP, lane: 1, element: null },
            { id: 't2_2', x: 650, y: 400, hp: TOWER_HP, lane: 1, element: null },
            { id: 't2_3', x: 500, y: 550, hp: TOWER_HP, lane: 1, element: null },
            // Add more towers for different lanes
        ]
    };

    let minions = [];

    // --- Utility Functions for SVG ---
    function createSVGElement(tag, attributes) {
        const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (const key in attributes) {
            element.setAttribute(key, attributes[key]);
        }
        return element;
    }

    function updateUI() {
        playerGoldDisplay.textContent = playerGold;
        heroHealthValue.textContent = heroHealth;
        // Update base/tower health bars (if implemented)
    }

    // --- Game Map & Assets (SVG) ---
    function createMapElements() {
        // Example: Add towers dynamically
        Object.values(towers).forEach(teamTowers => {
            teamTowers.forEach(tower => {
                const towerColor = tower.id.startsWith('t1') ? '#0000FF' : '#FF0000'; // Blue for team 1, Red for team 2
                const towerElement = createSVGElement('rect', {
                    x: tower.x - 25, y: tower.y - 25,
                    width: 50, height: 50,
                    fill: towerColor,
                    stroke: 'white',
                    'stroke-width': 2,
                    id: tower.id
                });
                gameMap.appendChild(towerElement);
                tower.element = towerElement; // Store reference
            });
        });

        // Add more map details here (e.g., jungle camps, shop area markers)
    }

    // --- Minion Logic ---
    class Minion {
        constructor(id, team, x, y, targetPath) {
            this.id = id;
            this.team = team;
            this.x = x;
            this.y = y;
            this.hp = 100;
            this.attackDamage = 10;
            this.attackSpeed = 1000; // milliseconds
            this.lastAttackTime = 0;
            this.targetPath = targetPath; // Array of {x, y} coordinates or target objects (towers, base)
            this.currentPathIndex = 0;
            this.element = this.createMinionSVG();
            gameMap.appendChild(this.element);
        }

        createMinionSVG() {
            const color = this.team === 'team1' ? 'cyan' : 'magenta';
            const minionRect = createSVGElement('rect', {
                x: this.x - MINION_SIZE / 2, y: this.y - MINION_SIZE / 2,
                width: MINION_SIZE, height: MINION_SIZE,
                fill: color,
                stroke: 'black',
                'stroke-width': 1,
                id: `minion-${this.id}`
            });
            return minionRect;
        }

        move() {
            if (this.currentPathIndex >= this.targetPath.length) {
                // Minion reached the end of its path (e.g., enemy base)
                return;
            }

            const target = this.targetPath[this.currentPathIndex];
            let targetX, targetY;

            if (typeof target.x !== 'undefined' && typeof target.y !== 'undefined') {
                // Target is a coordinate
                targetX = target.x;
                targetY = target.y;
            } else if (target.element) {
                // Target is an object with an element (like a tower or base)
                const bbox = target.element.getBBox(); // Get bounding box of the target SVG element
                targetX = bbox.x + bbox.width / 2;
                targetY = bbox.y + bbox.height / 2;
            } else {
                return; // Invalid target
            }

            const dx = targetX - this.x;
            const dy = targetY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < MINION_SPEED) {
                // Close enough to consider reaching the target, move to next point
                this.x = targetX;
                this.y = targetY;
                this.currentPathIndex++;
            } else {
                this.x += (dx / distance) * MINION_SPEED;
                this.y += (dy / distance) * MINION_SPEED;
            }

            this.element.setAttribute('x', this.x - MINION_SIZE / 2);
            this.element.setAttribute('y', this.y - MINION_SIZE / 2);
        }

        attack(target) {
            const now = Date.now();
            if (now - this.lastAttackTime > this.attackSpeed) {
                if (target && target.hp > 0) {
                    target.hp -= this.attackDamage;
                    console.log(`${this.id} attacked ${target.id}. ${target.id} HP: ${target.hp}`);
                    if (target.hp <= 0) {
                        console.log(`${target.id} destroyed!`);
                        if (target.element && target.element.parentNode) {
                            target.element.parentNode.removeChild(target.element);
                        }
                        if (target.id.startsWith('minion')) {
                             // Reward gold for killing a minion
                            playerGold += 10; // Example gold amount
                            updateUI();
                        }
                        // Remove destroyed target from game state arrays (e.g., towers, minions)
                    }
                    this.lastAttackTime = now;
                }
            }
        }

        findTarget(enemyUnits, enemyTowers, enemyBase) {
            // Prioritize enemy minions first
            for (const enemyMinion of enemyUnits) {
                const dist = Math.sqrt(Math.pow(this.x - enemyMinion.x, 2) + Math.pow(this.y - enemyMinion.y, 2));
                if (dist < 100) { // Attack range
                    return enemyMinion;
                }
            }

            // Then prioritize towers along the path
            const nextTowerTarget = this.targetPath[this.currentPathIndex];
            if (nextTowerTarget && nextTowerTarget.hp > 0) {
                const dist = Math.sqrt(Math.pow(this.x - nextTowerTarget.x, 2) + Math.pow(this.y - nextTowerTarget.y, 2));
                if (dist < 100) { // Attack range
                    return nextTowerTarget;
                }
            }

            // Finally, attack the base if nothing else
            if (enemyBase.hp > 0) {
                 const dist = Math.sqrt(Math.pow(this.x - enemyBase.x, 2) + Math.pow(this.y - enemyBase.y, 2));
                if (dist < 100) {
                    return enemyBase;
                }
            }
            return null; // No target in range
        }
    }

    let minionIdCounter = 0;
    function spawnMinions() {
        // Simplified path for a single lane for demonstration
        const team1Path = [towers.team2[0], towers.team2[1], towers.team2[2], bases.team2];
        const team2Path = [towers.team1[0], towers.team1[1], towers.team1[2], bases.team1];

        // Team 1 minion (starts from base 1)
        minions.push(new Minion(minionIdCounter++, 'team1', bases.team1.x, bases.team1.y, team1Path));

        // Team 2 minion (starts from base 2)
        minions.push(new Minion(minionIdCounter++, 'team2', bases.team2.x, bases.team2.y, team2Path));

        console.log('Minions spawned!');
    }

    // --- Game Loop ---
    function gameLoop() {
        // Minion movement and combat
        minions.forEach(minion => {
            minion.move();

            const enemyTeam = minion.team === 'team1' ? 'team2' : 'team1';
            const enemyMinions = minions.filter(m => m.team === enemyTeam && m.hp > 0);
            const enemyTowers = towers[enemyTeam].filter(t => t.hp > 0);
            const enemyBase = bases[enemyTeam];

            const target = minion.findTarget(enemyMinions, enemyTowers, enemyBase);
            if (target) {
                minion.attack(target);
            }
        });

        // Filter out destroyed minions
        minions = minions.filter(m => m.hp > 0);

        // Update UI
        updateUI();

        // Check for game over condition
        if (bases.team1.hp <= 0) {
            alert('Team 2 Wins!');
            clearInterval(gameInterval); // Stop the game loop
        } else if (bases.team2.hp <= 0) {
            alert('Team 1 Wins!');
            clearInterval(gameInterval); // Stop the game loop
        }

        requestAnimationFrame(gameLoop); // Use requestAnimationFrame for smoother animation
    }

    // --- Initialization ---
    createMapElements();
    updateUI();

    // Spawn minions every few seconds
    setInterval(spawnMinions, 5000); // Spawn every 5 seconds

    // Start the game loop
    requestAnimationFrame(gameLoop);
});