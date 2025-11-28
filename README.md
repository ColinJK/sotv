# Shadows of the Void

A browser-based Roguelite RPG built with React, TypeScript, and Vite. Features procedural dungeon generation, turn-based combat, a skill tree system, and persistent progression.

## 🎮 Features

* **Procedural Generation:** Every run features a new map layout, enemy placement, and loot drops.
* **Class System:** Choose between Warrior (Tank), Rogue (DPS/Speed), or Mage (Caster).
* **Progression:**
    * **Loot:** Items with randomized rarities (Common to Legendary) and affix systems (e.g., "Sharp Sword of the Bear").
    * **Skills:** A visual skill tree to unlock spells (Fireball, Blink, etc.) and passive feats (Life on Kill).
    * **Persistence:** "Void Essence" currency allows you to buy permanent stat upgrades between runs.
* **Combat:** Turn-based tactical movement with line-of-sight mechanics and status effects (Burn, Freeze, Stun).

## 🕹️ Controls

| Key | Action |
| :--- | :--- |
| **W / A / S / D** | Move / Aim |
| **Arrows** | Move / Aim |
| **1 / 2 / 3 / 4** | Cast Spells |
| **E** or **G** | Pickup Item |
| **I** | Open Inventory |
| **K** | Open Skills |
| **ESC** | Cancel Spell / Open Settings |
| **Mouse** | Hover for tooltips, Click UI |

## 🛠️ Installation & Local Development

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/yourusername/shadows-void.git](https://github.com/yourusername/shadows-void.git)
    cd shadows-void
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run locally:**
    ```bash
    npm run dev
    ```
    Open the link shown in the terminal (usually `http://localhost:5173/`).

## 🚀 Deployment Guide (GitHub Pages)

This project is configured to deploy to GitHub Pages using the `gh-pages` package.

### Prerequisites (First Time Only)
1.  Ensure your `vite.config.ts` has the correct base path:
    ```typescript
    base: "/repo-name/", // Replace with your repository name
    ```
2.  Ensure `package.json` has the `homepage` field:
    ```json
    "homepage": "[https://yourusername.github.io/repo-name](https://yourusername.github.io/repo-name)",
    ```

### How to Update the Live Site
Whenever you make changes to the code and want to update the public game:

1.  **Commit your changes:**
    ```bash
    git add .
    git commit -m "Description of changes"
    git push origin main
    ```

2.  **Run the deploy script:**
    ```bash
    npm run deploy
    ```
    *This command automatically builds the project (creates a `dist` folder) and pushes it to the `gh-pages` branch.*

3.  Wait 1-2 minutes for GitHub to update the site.

## 🤝 Contributing

Feel free to fork this project and submit pull requests. Major changes or new features (like new classes or biomes) are welcome!

## 📝 License

This project is open source.
