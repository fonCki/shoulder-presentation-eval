Shoulder Presentation Evaluation (SPE)
Course 02238 – Biometric Systems
Student ID : s243942
Archive    : 02238-s243942-spe.zip

──────────────────────────────────────────────────────────────────────────────
0  Online resources
──────────────────────────────────────────────────────────────────────────────
Live demo  : https://shoulder-presentation-eval.ridao.ar/
GitHub repo: https://github.com/fonCki/shoulder-presentation-eval

──────────────────────────────────────────────────────────────────────────────
1  Directory overview
──────────────────────────────────────────────────────────────────────────────
datasets/          portrait images plus manual-label CSVs
  ├─ dev15/        15 images used while tuning the algorithm
  ├─ test20/       20 validation portraits
  └─ tono102/      102 TONO-project portraits (external test set)

docs/              figures & screenshots referenced in the term paper
  ├─ algorithm_pseudocode.txt
  ├─ figure_0_overview.pdf   (contact sheet of all 122 evaluated portraits)
  ├─ figure_1.png … figure_4.png
  └─ ui_screenshot.png

results/           numeric outputs and analysis notebook
  ├─ shoulder_eval.csv     (numeric results for all 122 portraits, extracted from the web app)
  └─ analysis.ipynb     (Jupyter notebook with analysis & plots)

source-code/       full React / TypeScript web app
  └─ shoulder-presentation-eval/
        index.html
        package*.json
        vite.config.ts, tsconfig*.json
        src/…  (components, hooks, lib/postureMetrics.ts, etc.)

──────────────────────────────────────────────────────────────────────────────
2  Build & run locally
──────────────────────────────────────────────────────────────────────────────
# Prerequisites: Node ≥18 + npm

cd source-code/shoulder-presentation-eval
npm install
npm run dev        # Vite dev server → open printed URL in browser

──────────────────────────────────────────────────────────────────────────────
3  Contact
──────────────────────────────────────────────────────────────────────────────
Alfonso Ridao – s243942@student.dtu.dk
