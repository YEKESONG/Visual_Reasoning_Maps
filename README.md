# Visual Reasoning Maps

Un atelier de lecture local pour parcourir les arguments d’un document et revenir à leurs sources. Projet ENAC : prototype de recherche, interface française et état de l’art modifiable.

![Carte et passages](docs/screenshots/map-pdf.png)

## Démarrer

Prérequis : Python **3.12+**, Node.js **22+** (24 testé), pnpm **11.19.0**, Git. Les versions verrouillées nécessitent un environnement plus récent que le minimum initial 3.11/20. Installer pnpm au besoin avec `npm install -g pnpm@11.19.0`.

```sh
git clone git@github.com:YEKESONG/Visual_Reasoning_Maps.git && cd Visual_Reasoning_Maps
bash scripts/setup.sh
python3 run.py
```

Ouvrir **http://localhost:8000**. Le démarrage importe les exemples disponibles, sans appel API. Pour traiter un nouvel article, renseigner `DEEPSEEK_API_KEY` dans `.env` puis redémarrer. Ne jamais committer ce fichier. `PYTHON_BIN=/chemin/python3.12 bash scripts/setup.sh` permet de choisir Python. Le script préserve un `.env` existant.

## Lire un document

Importer un PDF (30 Mo maximum) ou saisir un lien HTTPS `arxiv.org/html/…`. Le HTML arXiv est privilégié ; le PDF est téléchargé si le HTML est inexploitable. Le suivi affiche les étapes de traitement.

La carte montre le flux principal. Les boutons + développent les sous-étapes. Les filtres masquent des types de relations ; « Isoler la chaîne » éclaire les raisons d’une conclusion ou les conséquences des autres étapes. La lecture guidée suit l’ordre logique ou celui du texte. Tab et Entrée sélectionnent une étape, Échap ferme la sélection.

Le panneau relie citation, extrait PDF/HTML, explication à la demande et suggestions. Les liens ouvrent les deux sources. Le texte intégral souligne les ancrages ; cliquer sur un passage retourne à la carte. Les étapes incertaines ont un cadre pointillé. « Vérifié » signifie un contrôle du soutien textuel par le système, pas une certification scientifique.

## Configuration

| Variable | Fonction |
|---|---|
| `LLM_MODEL` | `deepseek/deepseek-flash` (ID V4.1 Flash vérifié). Changer le préfixe LiteLLM pour un autre fournisseur. |
| `LLM_API_BASE` | URL beta DeepSeek pour strict ; vider ou remplacer pour un autre fournisseur. |
| `LLM_OUTPUT_MODE` | `strict`, ou `json` avec validation Pydantic. |
| `LLM_THINKING_STAGES` | `skeleton,cross` ; étapes de raisonnement activées. |
| `LABEL_LANGUAGE` | `auto`, `fr`, `en`, `zh`. |
| `GROBID_URL` | Vide : PyMuPDF. Sinon service TEI, par exemple `http://localhost:8070`. Dans Docker : `http://grobid:8070`. |
| `LANGFUSE_*` | Facultatif ; métriques de génération sans contenu ni clé. |
| `EMBEDDING_MODEL` | Facultatif : modèle sentence-transformers pour fusion conservatrice ; sinon similarité textuelle. |
| `DATA_DIR` | Fichiers locaux, par défaut `data/`. |

Pour Claude/GPT/Grok : changer `LLM_MODEL`, vider `LLM_API_BASE`, définir la variable de clé du fournisseur attendue par LiteLLM. Les options `thinking` spécifiques à DeepSeek ne leur sont pas envoyées. Ce changement est prévu par l’adaptateur mais n’a pas été testé avec des comptes réels.

Les appels envoient le texte au fournisseur configuré. Les résultats, le document et les caches restent sous `data/`. Les fichiers `llm_log.jsonl` contiennent usage, durée et coût estimé quand le fournisseur est reconnu. Aucun coût n’est inventé si le tarif manque.

## Développement et vérification

`bash scripts/dev.sh` lance FastAPI et Vite (http://localhost:5173). `python -m scripts.export_openapi` puis `pnpm --dir frontend types` régénèrent le contrat. Vérifications :

```sh
.venv/bin/pytest -q && .venv/bin/ruff check backend scripts run.py
pnpm --dir frontend lint && pnpm --dir frontend test && pnpm --dir frontend build
```

Les tests n’utilisent ni réseau ni clé API. `python -m scripts.record_fixtures document.pdf` enregistre **un appel réel payant** dans `data/`, après configuration. Les exemples ne sont pas présentés comme des résultats expérimentaux du modèle.

Docker facultatif : `docker compose up --build`, avec `.env` créé auparavant. Ajouter `--profile grobid` pour GROBID et configurer son URL. Cette variante est fournie mais n’a pas été exécutée dans cet environnement.

## Structure et documentation

- `backend/app/` : acquisition, ancrage, extraction, validation, suggestions, stockage et API.
- `frontend/src/` : bibliothèque, graphe, détails, lecteur PDF/HTML.
- `paper/` : [guide chinois et points à vérifier](paper/README.md), sept sections françaises et 24 fiches. `cd paper/etat_de_lart && make` compile le PDF.
- `docs/` : [journal](docs/DEVLOG.md), [décisions](docs/DECISIONS.md), [architecture](docs/ARCHITECTURE.md), [versions](docs/TECH_STACK.md), [reproduction](docs/DEVELOPMENT_PROCESS.md).

## Limites et dépannage

- Sans clé : explorer les exemples. Un nouveau traitement indique comment configurer `.env`.
- PDF scanné : effectuer un OCR externe. Les équations PDF ne sont pas reconstruites en LaTeX ; leur image originale reste lisible. HTML conserve MathML/alttext lorsqu’ils existent.
- L’ordre des colonnes, les tableaux, les abréviations et les sections PDF sont heuristiques.
- Le traitement utilise un seul processus. Un redémarrage interrompt les tâches ; les résultats terminés restent disponibles. Ne pas utiliser `uvicorn --workers`.
- Un cache de document est réutilisé par contenu ; pour refaire une analyse avec une autre configuration, déplacer son répertoire hors de `data/`.
- La critique utilise le même fournisseur et peut reproduire ses erreurs. L’évaluation humaine et les essais réels avec clé restent indispensables.
- Si le port 8000 est occupé : arrêter l’instance précédente ou lancer `PORT=8001 python3 run.py`.

## Licence

Le code original est sous licence MIT. Les documents de tiers conservent leur licence. PyMuPDF est soumis à sa propre licence AGPL/commerciale ; vérifier sa compatibilité avant une distribution dérivée. Voir [LICENSE](LICENSE), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) et les licences propres aux exemples.
