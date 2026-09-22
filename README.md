# Visual Reasoning Maps

Prototype de lecture réalisé pour un projet ENAC. On lui donne un article (PDF, ou page HTML d’arXiv) ; un modèle de langage reconstruit l’argumentation sous forme de carte — question, prémisses, preuves, objections, conclusions et relations entre elles — et chaque étape renvoie à la phrase du texte sur laquelle elle repose. L’interface existe en français, anglais et chinois. Le dépôt contient aussi un premier état de l’art en français (`paper/`).

[中文说明](README.zh-CN.md)

![Carte de l’exemple Descartes et passage cité](docs/screenshots/map-pdf.png)

## Démarrer

Prérequis : Python 3.11 ou plus (3.12 testé), Node.js 22.13 ou plus (24 testé, exigé par PDF.js 6), pnpm 11.19.0 (`npm install -g pnpm@11.19.0`), Git.

```sh
git clone git@github.com:YEKESONG/Visual_Reasoning_Maps.git && cd Visual_Reasoning_Maps
bash scripts/setup.sh
python3 run.py
```

Ouvrir http://localhost:8000. Les deux exemples (un extrait de Descartes, en PDF et en HTML) s’ouvrent sans clé API. Pour analyser vos propres documents, renseigner `DEEPSEEK_API_KEY` dans `.env` (créé par `setup.sh`, jamais versionné), puis relancer `python3 run.py`. Après une mise à jour du code, relancer aussi le serveur. `PYTHON_BIN=/chemin/python3.12 bash scripts/setup.sh` choisit l’interpréteur ; un `.env` existant est conservé.

## Ce que fait une analyse

1. **Lecture du document.** Pour un PDF : ordre des colonnes, titres de section (d’après la taille et la graisse), retrait des en-têtes, numéros de page, formules, tableaux et références ; les phrases coupées par une colonne ou une page sont recollées. Pour arXiv, la version HTML est utilisée si elle existe, sinon le PDF. Le texte est découpé en phrases numérotées (`p12s3` : 3e phrase du 12e paragraphe).
2. **Reconstruction.** Le modèle propose 5 à 12 étapes principales, ajoute des sous-étapes section par section, puis cherche les relations entre sections.
3. **Vérification.** Chaque citation doit se retrouver dans les phrases indiquées ; un second appel du modèle juge si ces phrases soutiennent bien chaque étape et chaque relation. Les problèmes sont renvoyés au modèle deux fois au plus, sous forme de corrections ciblées. Ce qui reste douteux s’affiche avec un cadre pointillé ; les lacunes de structure sont notées dans `validation_report.json`.
4. **Notes de relecture.** Règles de structure (affirmation sans appui, preuve qui n’appuie rien…) et remarques du modèle, chacune rattachée à une étape et à des phrases.

Sur l’article de test (14 pages, deux colonnes), une analyse complète a pris environ 3 min 30 et 0,06 USD avec `deepseek-flash` (estimation de LiteLLM). Chaque appel est mis en cache : relancer une analyse interrompue ne refait que les étapes non terminées. Pendant l’analyse, la page peut être fermée ou rechargée ; la carte apparaît ensuite dans la bibliothèque.

## Lire une carte

- La carte montre les étapes principales ; « + n » affiche les n sous-étapes d’une étape.
- Les cases de la barre d’outils masquent un type de relation (soutien, cause, précision, contradiction) ; « Isoler la chaîne de l’étape choisie » estompe tout le reste.
- « Lecture guidée » parcourt les étapes dans l’ordre du raisonnement ou dans l’ordre du texte.
- Une étape : citation, extrait dans la mise en page d’origine, lien vers la page, explication à la demande, termes, notes de relecture. Une flèche : les deux passages côte à côte.
- « Lire le texte intégral » : les passages cités sont surlignés ; un clic ramène à l’étape. La barre de droite situe les étapes principales dans le texte.
- Clavier : Tab passe d’une étape à l’autre, Entrée ouvre, Échap ferme.

« Vérifié » veut dire que le passage cité soutient l’étape selon le contrôle automatique. Ce n’est pas une validation scientifique de l’affirmation.

## Langues

Le sélecteur en haut à droite (中文 / English / Français) change toute l’interface et reste mémorisé dans le navigateur. La langue de la carte se choisit avant l’import : comme l’interface, comme le document, ou une langue donnée. Les citations restent dans la langue du document. Un même document analysé dans deux langues donne deux cartes distinctes. Les explications à la demande suivent la langue de l’interface.

## Configuration (`.env`)

| Variable | Rôle |
|---|---|
| `DEEPSEEK_API_KEY` | Clé du fournisseur par défaut. |
| `LLM_MODEL` | `deepseek/deepseek-flash` par défaut (préfixe LiteLLM). |
| `LLM_API_BASE` | URL beta de DeepSeek, nécessaire au mode strict ; à vider pour un autre fournisseur. |
| `LLM_OUTPUT_MODE` | `strict` (appel d’outil avec schéma strict) ou `json` (JSON validé par Pydantic). |
| `LLM_THINKING_STAGES` | Étapes avec raisonnement activé ; `skeleton,cross` par défaut. |
| `LLM_THINKING_MAX_TOKENS` | Plafond de sortie de ces étapes, raisonnement compris ; 64000 par défaut. |
| `SECTION_CHUNK_CHARS` | Taille des lots de sections envoyés ensemble ; 12000 caractères par défaut. |
| `LABEL_LANGUAGE` | Langue par défaut des cartes : `auto`, `fr`, `en`, `zh`. |
| `GROBID_URL` | Vide : PyMuPDF seul. Sinon, service GROBID (par exemple `http://localhost:8070`). |
| `LANGFUSE_*` | Facultatif ; envoie des métriques d’appel, sans contenu. |
| `EMBEDDING_MODEL` | Facultatif ; modèle sentence-transformers pour détecter les doublons. |
| `DATA_DIR` | Dossier des documents et résultats, `data/` par défaut. |

Autre fournisseur (Claude, GPT, Grok…) : changer `LLM_MODEL`, vider `LLM_API_BASE` et définir la variable de clé attendue par LiteLLM. Les réglages de raisonnement propres à DeepSeek ne leur sont pas envoyés. Ce changement est prévu dans le code mais n’a pas été testé avec de vrais comptes.

Le texte des documents est envoyé au fournisseur configuré. Le reste ne quitte pas la machine : dans `data/<empreinte>/` se trouvent la source, `parsed.json`, `flow.json`, `validation_report.json`, `suggestions.json`, le cache des appels et `llm_log.jsonl` (jetons, durée, coût estimé et cause d’un échec éventuel, jamais le contenu ni la clé).

## Développement

- `bash scripts/dev.sh` lance FastAPI et Vite (http://localhost:5173).
- Vérifications, identiques à la CI :
  ```sh
  .venv/bin/ruff check backend scripts run.py && .venv/bin/ruff format --check backend scripts run.py
  .venv/bin/pytest -q
  pnpm --dir frontend lint && pnpm --dir frontend test && pnpm --dir frontend build
  ```
- Tests de bout en bout (Playwright, serveur lancé) : `pnpm --dir frontend test:e2e` ; `BASE_URL=http://127.0.0.1:8001` pour un autre port.
- Contrat d’API : `.venv/bin/python -m scripts.export_openapi` puis `pnpm --dir frontend types`.
- Exemples : `.venv/bin/python -m scripts.build_examples`. `python -m scripts.record_fixtures document.pdf` enregistre un appel réel, donc payant.
- Les tests n’utilisent ni réseau ni clé.

Chaque étape du développement est un commit distinct ; [docs/DEVLOG.md](docs/DEVLOG.md) explique pour chacune le problème, la solution et la vérification. Voir aussi [décisions](docs/DECISIONS.md), [architecture](docs/ARCHITECTURE.md), [versions](docs/TECH_STACK.md), [conception de l’interface](docs/DESIGN.md) et [reproduction](docs/DEVELOPMENT_PROCESS.md).

## Structure

- `backend/app/` : lecture des documents (`ingest/`), phrases (`anchoring/`), appels au modèle (`llm/`), extraction, vérification, notes, stockage, API.
- `frontend/src/` : bibliothèque, carte, panneau de détails, texte intégral.
- `examples/` : exemples Descartes et leur provenance.
- `paper/` : état de l’art (sept sections, 24 fiches de lecture). `cd paper/etat_de_lart && make` compile le PDF ; le [guide](paper/README.md) liste ce qui reste à vérifier.

## Limites

- PDF scanné : faire d’abord une reconnaissance OCR.
- La mise en page est reconstituée par heuristiques : deux colonnes, titres, tableaux à filets. Les tableaux sans filets, les mises en page à trois colonnes et certains flottants peuvent mal passer. Les formules d’un PDF ne sont pas converties en LaTeX ; en HTML, MathML est conservé.
- Les corrections automatiques ne comblent pas toujours une lacune de structure (une branche qui n’atteint pas la conclusion) ; elle reste signalée dans le rapport.
- Le vérificateur est le même modèle que l’extracteur. Une évaluation humaine reste nécessaire.
- Un seul processus : un redémarrage interrompt les analyses en cours (les étapes terminées restent en cache). Ne pas lancer `uvicorn --workers`.
- Pour refaire une analyse avec un autre réglage, déplacer son dossier hors de `data/`.
- Docker (`docker compose up --build`, option `--profile grobid`), GROBID, Langfuse et les embeddings sont fournis mais n’ont pas été testés ici.
- Port 8000 occupé : `PORT=8001 python3 run.py`.

## Licence

Code sous licence MIT. Les documents de tiers gardent leur licence. PyMuPDF est sous licence AGPL ou commerciale : vérifier la compatibilité avant de redistribuer une version dérivée. Voir [LICENSE](LICENSE), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) et [examples/README.md](examples/README.md).
