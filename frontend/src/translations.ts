// French is the source language: keys are the French strings shown in the interface.
export const messages = {
  // Shell and library
  Bibliothèque: { en: "Library", zh: "文档库" },
  "Langue de l’interface": { en: "Interface language", zh: "界面语言" },
  "Nouvelle carte": { en: "New map", zh: "新建图谱" },
  "Importez un article en PDF ou collez le lien de sa version HTML sur arXiv. Le modèle relève les étapes de l’argumentation et relie chacune aux phrases du texte : chaque étape s’ouvre sur le passage d’origine.":
    {
      en: "Upload a paper as a PDF or paste the link to its HTML version on arXiv. The model picks out the steps of the argument and ties each one to sentences in the text, so every step opens on the original passage.",
      zh: "上传论文 PDF，或粘贴它在 arXiv 上的 HTML 链接。模型会找出论证的各个步骤，并把每一步对应到原文句子，点开任何一步都能看到出处。",
    },
  "Aucune clé API n’est configurée. Les exemples restent consultables ; pour analyser un document, ajoutez DEEPSEEK_API_KEY dans .env puis redémarrez le serveur.":
    {
      en: "No API key is set. You can still open the examples; to analyse a document, add DEEPSEEK_API_KEY to .env and restart the server.",
      zh: "还没有配置 API 密钥。示例可以直接查看；要分析新文档，请在 .env 中填写 DEEPSEEK_API_KEY，然后重启服务。",
    },
  "Importer un PDF": { en: "Upload a PDF", zh: "上传 PDF" },
  ou: { en: "or", zh: "或" },
  "Lien arXiv": { en: "arXiv link", zh: "arXiv 链接" },
  "Générer la carte": { en: "Build the map", zh: "生成图谱" },
  "Langue de la carte": { en: "Map language", zh: "图谱语言" },
  "Comme l’interface": { en: "Same as the interface", zh: "与界面相同" },
  "Comme le document": { en: "Same as the document", zh: "与原文相同" },
  "Les citations restent dans la langue du document.": {
    en: "Quotations stay in the language of the document.",
    zh: "引文保留原文语言。",
  },
  "Le texte du document est envoyé au modèle défini dans .env ({model}). Le PDF et les cartes restent dans le dossier data/ de cette machine.":
    {
      en: "The text of the document is sent to the model set in .env ({model}). The PDF and the maps stay in the data/ folder on this machine.",
      zh: "文档文字会发送给 .env 中设置的模型（{model}）。PDF 和图谱只保存在本机的 data/ 目录。",
    },
  "Envoi du document": { en: "Uploading the document", zh: "正在上传文档" },
  "Comptez quelques minutes pour un article. Vous pouvez quitter cette page : la carte apparaîtra dans la bibliothèque une fois prête.":
    {
      en: "A paper takes a few minutes. You can leave this page: the map will appear in the library when it is ready.",
      zh: "一篇论文通常需要几分钟。可以离开这个页面，完成后图谱会出现在文档库里。",
    },
  "Le suivi de l’analyse a été interrompu. Rechargez la page : une carte terminée apparaîtra dans la bibliothèque.":
    {
      en: "Lost track of the analysis. Reload the page: a finished map will show up in the library.",
      zh: "分析进度的连接中断了。请刷新页面，分析完成后图谱会出现在文档库里。",
    },
  "{count} document{plural}": {
    en: "{count} document{plural}",
    zh: "{count} 份文档",
  },
  "Aucune carte pour l’instant. Importez un PDF ou collez un lien arXiv ci-dessus.":
    {
      en: "No maps yet. Upload a PDF or paste an arXiv link above.",
      zh: "还没有图谱。请在上方上传 PDF 或粘贴 arXiv 链接。",
    },
  "Exemple préparé à la main · sans clé API": {
    en: "Hand-made example · no API key needed",
    zh: "人工整理的示例 · 无需 API 密钥",
  },
  "langue du document": { en: "document language", zh: "原文语言" },
  "Une carte est la lecture d’un texte par un modèle. En cas de doute, le passage original fait foi.":
    {
      en: "A map is a model’s reading of a text. When in doubt, the original passage is what counts.",
      zh: "图谱是模型对文本的一种读法，有疑问时以原文为准。",
    },
  "Chargement…": { en: "Loading…", zh: "正在加载…" },
  "Cette page n’existe pas.": {
    en: "This page does not exist.",
    zh: "页面不存在。",
  },
  "Retour à la bibliothèque": { en: "Back to the library", zh: "返回文档库" },

  // Step and relation vocabulary
  Question: { en: "Question", zh: "问题" },
  Prémisse: { en: "Premise", zh: "前提" },
  Affirmation: { en: "Claim", zh: "论断" },
  Preuve: { en: "Evidence", zh: "证据" },
  Objection: { en: "Objection", zh: "异议" },
  Conclusion: { en: "Conclusion", zh: "结论" },
  Soutien: { en: "Support", zh: "支持" },
  Cause: { en: "Cause", zh: "因果" },
  Précision: { en: "Refinement", zh: "细化" },
  Contradiction: { en: "Contradiction", zh: "矛盾" },
  Vérifié: { en: "Checked", zh: "已核对" },
  "Appui partiel": { en: "Partly supported", zh: "部分支持" },
  "À vérifier": { en: "Unconfirmed", zh: "待核实" },
  "Le passage cité soutient cette étape. Il s’agit d’un contrôle automatique de fidélité au texte, pas d’une validation scientifique.":
    {
      en: "The cited passage supports this step. This is an automatic check of fidelity to the text, not a scientific validation.",
      zh: "引文支持这一步。这是对是否忠于原文的自动核对，不代表结论在科学上成立。",
    },
  "Le passage cité ne soutient qu’une partie de cette étape.": {
    en: "The cited passage supports only part of this step.",
    zh: "引文只支持这一步的一部分。",
  },
  "Soutien non confirmé : lisez le passage avant de vous fier à cette étape.": {
    en: "Support not confirmed: read the passage before relying on this step.",
    zh: "原文支持未确认，采信这一步之前请先读原文。",
  },
  "Les passages cités établissent cette relation.": {
    en: "The cited passages back this relation.",
    zh: "引文能支持这条关系。",
  },
  "Les passages cités n’établissent cette relation qu’en partie.": {
    en: "The cited passages only partly back this relation.",
    zh: "引文只能部分支持这条关系。",
  },
  "Relation non confirmée : comparez les deux passages.": {
    en: "Relation not confirmed: compare the two passages.",
    zh: "关系未确认，请对照两段原文。",
  },

  // Map page
  "Ouverture de la carte…": { en: "Opening the map…", zh: "正在打开图谱…" },
  "{steps} étapes principales · {links} relations": {
    en: "{steps} main steps · {links} relations",
    zh: "{steps} 个主步骤 · {links} 条关系",
  },
  "Exemple préparé à la main": {
    en: "Hand-made example",
    zh: "人工整理的示例",
  },
  "Langue de la carte : {language}": {
    en: "Map language: {language}",
    zh: "图谱语言：{language}",
  },
  Thèse: { en: "Thesis", zh: "主旨" },
  "Lire le texte intégral": { en: "Read the full text", zh: "阅读全文" },
  "Relations affichées": { en: "Relations shown", zh: "显示的关系" },
  "Estompe les étapes hors de la chaîne : en amont pour une conclusion, en aval pour les autres étapes.":
    {
      en: "Fades steps outside the chain: what leads to a conclusion, or what follows from any other step.",
      zh: "淡化推理链以外的步骤：选中结论时看它的上游，选中其他步骤时看它的下游。",
    },
  "Isoler la chaîne de l’étape choisie": {
    en: "Isolate the selected step’s chain",
    zh: "只显示所选步骤的推理链",
  },
  "Ordre de lecture": { en: "Reading order", zh: "阅读顺序" },
  "Ordre logique": { en: "Order of the reasoning", zh: "按推理顺序" },
  "Ordre du texte": { en: "Order of the text", zh: "按原文顺序" },
  "Étape précédente": { en: "Previous step", zh: "上一步" },
  "Étape suivante": { en: "Next step", zh: "下一步" },
  Pause: { en: "Pause", zh: "暂停" },
  "Lecture guidée": { en: "Step through", zh: "逐步阅读" },
  "Carte du raisonnement": { en: "Map of the reasoning", zh: "推理图" },
  "{count} passage{plural}": {
    en: "{count} passage{plural}",
    zh: "{count} 处原文",
  },
  "{count} remarque{plural}": {
    en: "{count} note{plural}",
    zh: "{count} 条建议",
  },
  "Masquer les sous-étapes de « {label} »": {
    en: "Hide the sub-steps of “{label}”",
    zh: "收起“{label}”的子步骤",
  },
  "Afficher les {count} sous-étapes de « {label} »": {
    en: "Show the {count} sub-steps of “{label}”",
    zh: "展开“{label}”的 {count} 个子步骤",
  },
  "Appuyez sur Entrée pour ouvrir l’étape, Échap pour fermer.": {
    en: "Press Enter to open the step, Escape to close it.",
    zh: "按 Enter 打开步骤，按 Esc 关闭。",
  },
  "Sélectionnez une relation pour comparer ses deux passages.": {
    en: "Select a relation to compare its two passages.",
    zh: "选中一条关系，对照两端的原文。",
  },
  "Zoom avant": { en: "Zoom in", zh: "放大" },
  "Zoom arrière": { en: "Zoom out", zh: "缩小" },
  "Adapter à la fenêtre": { en: "Fit to window", zh: "适应窗口" },
  "Commandes de la carte": { en: "Map controls", zh: "图谱控制" },
  "Vue d’ensemble": { en: "Overview", zh: "缩略图" },
  "Les flèches vont d’une raison vers ce qu’elle appuie. Cadre pointillé : soutien non confirmé.":
    {
      en: "Arrows run from a reason to what it supports. Dashed frame: support not confirmed.",
      zh: "箭头从理由指向它支持的内容。虚线框：原文支持未确认。",
    },
  "Le calcul de la disposition a échoué. Rechargez la page.": {
    en: "The layout could not be computed. Reload the page.",
    zh: "图谱排版失败，请刷新页面。",
  },
  "Le placement de la carte a échoué. Réduisez les sous-processus puis réessayez.":
    {
      en: "The map could not be laid out. Collapse some sub-steps and try again.",
      zh: "图谱排版失败，请收起部分子步骤后重试。",
    },
  "Lire la carte": { en: "Reading the map", zh: "怎么读这张图" },
  "Cliquez sur une étape pour voir le passage sur lequel elle repose, ou sur une flèche pour comparer les deux passages qu’elle relie.":
    {
      en: "Click a step to see the passage it rests on, or an arrow to compare the two passages it connects.",
      zh: "点击一个步骤，查看它依据的原文；点击一条连线，对照它连接的两段原文。",
    },
  Étapes: { en: "Steps", zh: "步骤" },
  Relations: { en: "Relations", zh: "关系" },
  "Cadre pointillé : le contrôle automatique n’a pas confirmé le soutien du passage cité.":
    {
      en: "Dashed frame: the automatic check did not confirm that the cited passage supports the step.",
      zh: "虚线框：自动核对没有确认引文能支持这一步。",
    },
  "« + 3 » : l’étape a trois sous-étapes, cliquez pour les voir.": {
    en: "“+ 3”: the step has three sub-steps; click to see them.",
    zh: "“+ 3”表示这一步有 3 个子步骤，点击即可展开。",
  },
  "Clavier : Tab passe d’une étape à l’autre, Entrée ouvre l’étape, Échap ferme le panneau.":
    {
      en: "Keyboard: Tab moves between steps, Enter opens one, Escape closes the panel.",
      zh: "键盘：Tab 在步骤之间切换，Enter 打开，Esc 关闭面板。",
    },
  "Structure repérée": { en: "Structure found", zh: "识别出的结构" },
  "{count} divergence{plural}": {
    en: "{count} divergence{plural}",
    zh: "发散 {count} 处",
  },
  "Divergence : une même étape ouvre plusieurs suites.": {
    en: "Divergence: one step leads to several others.",
    zh: "发散：同一步骤引出多条后续。",
  },
  "{count} convergence{plural}": {
    en: "{count} convergence{plural}",
    zh: "汇聚 {count} 处",
  },
  "Convergence : plusieurs raisons aboutissent à la même étape.": {
    en: "Convergence: several reasons lead to the same step.",
    zh: "汇聚：多条理由指向同一步骤。",
  },
  "{count} contradiction{plural}": {
    en: "{count} contradiction{plural}",
    zh: "矛盾 {count} 处",
  },
  "Contradiction : deux étapes sont en tension.": {
    en: "Contradiction: two steps pull against each other.",
    zh: "矛盾：两个步骤相互冲突。",
  },
  "{count} précision{plural}": {
    en: "{count} refinement{plural}",
    zh: "细化 {count} 处",
  },
  "Précision : une étape en détaille ou en restreint une autre.": {
    en: "Refinement: one step details or narrows another.",
    zh: "细化：一个步骤对另一个步骤加以展开或限定。",
  },
  "{count} lien{plural} de cause": {
    en: "{count} causal link{plural}",
    zh: "因果 {count} 处",
  },
  "Cause : le texte présente une étape comme produisant l’autre.": {
    en: "Cause: the text presents one step as bringing about the other.",
    zh: "因果：原文说明一个步骤导致了另一个。",
  },

  // Detail panel
  "p. {page}": { en: "p. {page}", zh: "第 {page} 页" },
  "paragraphe {number}": { en: "paragraph {number}", zh: "第 {number} 段" },
  "détail de « {label} »": {
    en: "detail of “{label}”",
    zh: "“{label}”的子步骤",
  },
  "Confiance indiquée par le modèle : {value}": {
    en: "Confidence given by the model: {value}",
    zh: "模型给出的置信度：{value}",
  },
  "Passage cité": { en: "Quoted passage", zh: "引文" },
  "Dans le texte intégral :": { en: "In the full text:", zh: "在全文中查看：" },
  Explication: { en: "Explanation", zh: "解释" },
  "Expliquer cette étape": { en: "Explain this step", zh: "解释这一步" },
  "Rédaction de l’explication…": {
    en: "Writing the explanation…",
    zh: "正在生成解释…",
  },
  "Le modèle rédige l’explication à partir des passages cités et des étapes qui mènent à celle-ci.":
    {
      en: "The model writes the explanation from the cited passages and the steps that lead to this one.",
      zh: "模型会根据引文和指向这一步的上游步骤写出解释。",
    },
  "Exemple préparé à la main : aucune explication n’est générée, relisez le passage cité.":
    {
      en: "Hand-made example: no explanation is generated, read the quoted passage instead.",
      zh: "这是人工整理的示例，不生成解释，请直接阅读引文。",
    },
  Termes: { en: "Terms", zh: "术语" },
  "Pistes de relecture": { en: "Revision notes", zh: "修改建议" },
  Proposition: { en: "Suggested wording", zh: "改写示例" },
  "Règle de structure": { en: "Structure rule", zh: "结构规则" },
  "Remarque du modèle": { en: "Model note", zh: "模型意见" },
  Relation: { en: "Relation", zh: "关系" },
  "« {from} » appuie « {to} ».": {
    en: "“{from}” supports “{to}”.",
    zh: "“{from}”支持“{to}”。",
  },
  "Selon le texte, « {from} » entraîne « {to} ».": {
    en: "According to the text, “{from}” brings about “{to}”.",
    zh: "按原文的说法，“{from}”导致“{to}”。",
  },
  "« {to} » précise « {from} ».": {
    en: "“{to}” refines “{from}”.",
    zh: "“{to}”对“{from}”作了细化。",
  },
  "« {from} » et « {to} » sont en tension.": {
    en: "“{from}” and “{to}” pull against each other.",
    zh: "“{from}”与“{to}”相互冲突。",
  },
  "Mots de liaison dans le texte : « {words} »": {
    en: "Linking words in the text: “{words}”",
    zh: "原文连接词：“{words}”",
  },
  "Point de départ": { en: "From", zh: "起点" },
  "Point d’arrivée": { en: "To", zh: "终点" },
  "Voir dans le texte intégral": {
    en: "Show in the full text",
    zh: "在全文中查看",
  },

  // Original layout and full text
  "Page {page}": { en: "Page {page}", zh: "第 {page} 页" },
  "Page {page}, mise en page d’origine": {
    en: "Page {page}, original layout",
    zh: "第 {page} 页（原始排版）",
  },
  "Page {page} du document original": {
    en: "Page {page} of the original document",
    zh: "原文第 {page} 页",
  },
  "Revenir à l’étape qui cite : {text}": {
    en: "Back to the step citing: {text}",
    zh: "回到引用这句话的步骤：{text}",
  },
  "Impossible d’afficher cette page du PDF. Rechargez la page.": {
    en: "This PDF page cannot be displayed. Reload the page.",
    zh: "无法显示这一页 PDF，请刷新页面。",
  },
  "Impossible de charger le passage HTML.": {
    en: "The HTML passage could not be loaded.",
    zh: "无法加载 HTML 原文。",
  },
  "Texte intégral dans sa mise en page": {
    en: "Full text in its original layout",
    zh: "全文（原始排版）",
  },
  "Passage dans sa mise en page originale": {
    en: "Passage in its original layout",
    zh: "原文片段（原始排版）",
  },
  "Les phrases citées par cette étape sont introuvables dans le document.": {
    en: "The sentences cited by this step cannot be found in the document.",
    zh: "在文档中找不到这一步引用的句子。",
  },
  "Ouverture du texte…": { en: "Opening the text…", zh: "正在打开原文…" },
  "← Revenir à la carte": { en: "← Back to the map", zh: "← 返回图谱" },
  "Les passages surlignés sont cités dans la carte. Cliquez sur l’un d’eux pour revenir à l’étape correspondante.":
    {
      en: "Highlighted passages are cited in the map. Click one to go back to its step.",
      zh: "高亮部分是图谱引用的原文，点击任意一处可回到对应步骤。",
    },
  "Position des étapes principales dans le texte": {
    en: "Where the main steps appear in the text",
    zh: "主步骤在原文中的位置",
  },
  "Aller au passage de l’étape {number} : {label}": {
    en: "Go to the passage of step {number}: {label}",
    zh: "跳到第 {number} 步的原文：{label}",
  },

  // Requests and server messages
  "Connexion impossible. Vérifiez que le serveur fonctionne puis réessayez.": {
    en: "Cannot reach the server. Check that it is running, then try again.",
    zh: "连不上服务，请确认服务器在运行后重试。",
  },
  "La requête a échoué. Réessayez.": {
    en: "The request failed. Try again.",
    zh: "请求失败，请重试。",
  },
  "Erreur du serveur. Consultez le terminal où il tourne ; après une mise à jour du code, redémarrez-le.":
    {
      en: "Server error. Check the terminal where the server runs; after a code update, restart it.",
      zh: "服务器出错了。请查看运行服务器的终端；如果刚更新过代码，请重启服务器。",
    },
  "Tâche inconnue ou serveur redémarré. Relancez le traitement.": {
    en: "Unknown task, or the server was restarted. Start the analysis again.",
    zh: "找不到这个任务，可能服务已重启，请重新提交。",
  },
  "Document introuvable.": { en: "Document not found.", zh: "找不到文档。" },
  "Langue non prise en charge. Choisissez auto, zh, en ou fr.": {
    en: "Unsupported language. Choose auto, zh, en or fr.",
    zh: "不支持这种语言，请选择 auto、zh、en 或 fr。",
  },
  "Fournissez un lien HTTPS arxiv.org/html/… valide.": {
    en: "Enter a valid HTTPS arxiv.org/html/… link.",
    zh: "请输入有效的 https://arxiv.org/html/… 链接。",
  },
  "Sélectionnez un fichier PDF.": {
    en: "Select a PDF file.",
    zh: "请选择 PDF 文件。",
  },
  "Le PDF dépasse la limite de 30 Mo.": {
    en: "The PDF is larger than the 30 MB limit.",
    zh: "PDF 超过 30 MB 上限。",
  },
  "Ce fichier n’est pas un PDF valide.": {
    en: "This file is not a valid PDF.",
    zh: "这不是有效的 PDF 文件。",
  },
  "Envoyez un PDF ou un lien arXiv au format JSON.": {
    en: "Send a PDF, or an arXiv link as JSON.",
    zh: "请上传 PDF，或以 JSON 提交 arXiv 链接。",
  },
  "Renseignez DEEPSEEK_API_KEY dans .env et redémarrez. Vous pouvez explorer la démonstration sans clé.":
    {
      en: "Set DEEPSEEK_API_KEY in .env and restart. The examples work without a key.",
      zh: "请在 .env 中填写 DEEPSEEK_API_KEY 并重启。示例不需要密钥也能查看。",
    },
  "Source non disponible.": {
    en: "The source is not available.",
    zh: "原文不可用。",
  },
  "Étape inconnue.": { en: "Unknown step.", zh: "找不到这个步骤。" },
  "Explication indisponible. Vérifiez la configuration du modèle et réessayez.":
    {
      en: "No explanation available. Check the model settings and try again.",
      zh: "暂时无法生成解释，请检查模型配置后重试。",
    },
  "Route API inconnue.": { en: "Unknown API route.", zh: "API 路径不存在。" },
  "Interface non construite. Exécutez scripts/setup.sh.": {
    en: "The interface is not built. Run scripts/setup.sh.",
    zh: "界面还没有构建，请运行 scripts/setup.sh。",
  },

  // Progress of an analysis
  "En attente": { en: "Waiting", zh: "等待中" },
  "Lecture du PDF": { en: "Reading the PDF", zh: "正在读取 PDF" },
  "Téléchargement depuis arXiv": {
    en: "Downloading from arXiv",
    zh: "正在从 arXiv 下载",
  },
  "Carte retrouvée": {
    en: "A map of this document already exists",
    zh: "这份文档已有图谱",
  },
  "Repérage des phrases": {
    en: "Splitting the text into sentences",
    zh: "正在切分句子",
  },
  "Esquisse du raisonnement principal": {
    en: "Drafting the main line of reasoning",
    zh: "正在梳理主要推理",
  },
  "Détails section par section": {
    en: "Adding details section by section",
    zh: "正在逐节补充细节",
  },
  "Relations entre les sections": {
    en: "Linking steps across sections",
    zh: "正在连接各节之间的关系",
  },
  "Vérification des passages cités": {
    en: "Checking the cited passages",
    zh: "正在核对引文",
  },
  "Correction des éléments signalés": {
    en: "Fixing flagged steps",
    zh: "正在修正有问题的步骤",
  },
  "Préparation des suggestions": {
    en: "Writing revision notes",
    zh: "正在整理修改建议",
  },
  "Carte prête": { en: "Map ready", zh: "图谱已完成" },

  // Failures of an analysis
  "Le traitement a échoué. Vérifiez le format du document, la configuration du modèle et la connexion, puis réessayez.":
    {
      en: "The analysis failed. Check the document format, the model settings and the connection, then try again.",
      zh: "分析失败。请检查文档格式、模型配置和网络连接后重试。",
    },
  "Le modèle n’a pas fourni de résultat exploitable à l’étape « {stage} ». Relancez l’analyse : les étapes déjà terminées sont gardées en cache.":
    {
      en: "The model did not return a usable result at the “{stage}” stage. Run the analysis again: finished stages are cached.",
      zh: "模型在“{stage}”阶段没有返回可用结果。请重新分析，已完成的阶段有缓存，不会重复计算。",
    },
  "esquisse du raisonnement principal": {
    en: "main line of reasoning",
    zh: "梳理主要推理",
  },
  "détails section par section": { en: "section details", zh: "逐节补充细节" },
  "relations entre les sections": {
    en: "links across sections",
    zh: "连接各节关系",
  },
  "vérification des passages cités": {
    en: "checking cited passages",
    zh: "核对引文",
  },
  "correction des éléments signalés": {
    en: "fixing flagged steps",
    zh: "修正有问题的步骤",
  },
  "suggestions de relecture": { en: "revision notes", zh: "整理修改建议" },
  "Le fournisseur du modèle a refusé la clé API. Vérifiez DEEPSEEK_API_KEY dans .env, puis redémarrez.":
    {
      en: "The model provider refused the API key. Check DEEPSEEK_API_KEY in .env, then restart.",
      zh: "模型服务商拒绝了 API 密钥。请检查 .env 中的 DEEPSEEK_API_KEY，然后重启服务。",
    },
  "Solde insuffisant chez le fournisseur du modèle. Rechargez le compte, puis relancez l’analyse.":
    {
      en: "The model provider account has no balance left. Top it up, then run the analysis again.",
      zh: "模型服务商账户余额不足。充值后请重新分析。",
    },
  "Le fournisseur du modèle limite le nombre de requêtes. Patientez quelques minutes, puis relancez l’analyse.":
    {
      en: "The model provider is limiting requests. Wait a few minutes, then run the analysis again.",
      zh: "模型服务商限制了请求频率。请等几分钟再重新分析。",
    },
  "PDF protégé. Exportez une copie sans mot de passe.": {
    en: "The PDF is password-protected. Export a copy without a password.",
    zh: "PDF 有密码保护，请导出一份无密码的副本。",
  },
  "PDF trop long : limite de 400 pages.": {
    en: "The PDF is too long: the limit is 400 pages.",
    zh: "PDF 太长，最多支持 400 页。",
  },
  "Texte insuffisant. Ce PDF peut être scanné : appliquez une reconnaissance OCR puis réessayez.":
    {
      en: "Too little text. This PDF may be a scan: run OCR on it and try again.",
      zh: "PDF 中几乎没有可提取的文字，可能是扫描件。请先做 OCR 识别再上传。",
    },
  "Document distant trop volumineux.": {
    en: "The remote document is too large.",
    zh: "远程文档太大。",
  },
  "Trop de redirections arXiv.": {
    en: "Too many redirects from arXiv.",
    zh: "arXiv 重定向次数过多。",
  },
  "Aucun HTML ni PDF exploitable sur arXiv.": {
    en: "arXiv has no usable HTML or PDF for this paper.",
    zh: "arXiv 上没有这篇论文可用的 HTML 或 PDF。",
  },
  "Le document contient moins de cinq phrases exploitables. Choisissez un texte plus complet.":
    {
      en: "The document has fewer than five usable sentences. Choose a longer text.",
      zh: "文档中可用的句子不到五句，请换一份更完整的文本。",
    },

  // Warnings attached to a document
  "PDF : l’ordre de lecture et les formules sont reconstitués par heuristique ; les équations ne sont pas converties en LaTeX.":
    {
      en: "PDF: reading order and formulas are recovered with heuristics; equations are not converted to LaTeX.",
      zh: "PDF 的阅读顺序和公式靠启发式规则还原，公式不会转换成 LaTeX。",
    },
  "Une ressource arXiv n’a pas pu être mise en cache.": {
    en: "One arXiv resource could not be cached.",
    zh: "有一项 arXiv 资源没能缓存。",
  },
  "GROBID indisponible : structure extraite avec PyMuPDF.": {
    en: "GROBID unavailable: structure extracted with PyMuPDF.",
    zh: "GROBID 不可用，已改用 PyMuPDF 提取结构。",
  },

  // Structure rules applied to every map
  "Rien dans la carte n’appuie cette affirmation : précisez dans le texte sur quoi elle repose.":
    {
      en: "Nothing in the map supports this claim: say in the text what it rests on.",
      zh: "图中没有任何步骤支持这一论断，请在文中说明它的依据。",
    },
  "Cette observation n’appuie aucune étape de la carte : indiquez dans le texte quelle affirmation elle soutient.":
    {
      en: "This observation supports no step of the map: say in the text which claim it backs.",
      zh: "这一证据没有支持图中任何步骤，请在文中说明它支持哪个论断。",
    },
  "Vérifiez que la conclusion ne va pas plus loin que les éléments cités.": {
    en: "Check that the conclusion does not go further than the cited material.",
    zh: "请核对结论有没有超出所引材料的范围。",
  },
  "Vérifiez si le texte répond à cette tension. Une contradiction relevée n’est pas forcément une erreur.":
    {
      en: "Check whether the text answers this tension. A contradiction found here is not necessarily a mistake.",
      zh: "请看原文是否回应了这处冲突。发现矛盾不一定意味着有错。",
    },

  // Hand-made Descartes example
  "Descartes · Discours de la méthode, première partie · PDF": {
    en: "Descartes · Discourse on the Method, Part I · PDF",
    zh: "笛卡尔 ·《谈谈方法》第一部分 · PDF",
  },
  "Descartes · Discours de la méthode, première partie · HTML": {
    en: "Descartes · Discourse on the Method, Part I · HTML",
    zh: "笛卡尔 ·《谈谈方法》第一部分 · HTML",
  },
  "Descartes expose sa méthode comme un parcours personnel que chaque lecteur est libre de juger.":
    {
      en: "Descartes presents his method as a personal path that each reader is free to judge.",
      zh: "笛卡尔把他的方法当作个人经历来讲述，交由每位读者自行评判。",
    },
  "Le bon sens est également partagé": {
    en: "Good sense is equally shared",
    zh: "良知人人均等",
  },
  "Encore faut-il bien s’en servir": {
    en: "The mind must be applied well",
    zh: "关键在于运用得当",
  },
  "Les progrès qu’il doit à sa méthode": {
    en: "The progress he owes to his method",
    zh: "他归功于方法的进步",
  },
  "Il peut se tromper sur lui-même": {
    en: "He may be wrong about himself",
    zh: "他也可能看错自己",
  },
  "Raconter son chemin plutôt qu’enseigner": {
    en: "Telling his path rather than teaching",
    zh: "讲述自己的路，而不是教人",
  },
  "Chacun pourra en juger": {
    en: "Each reader can judge",
    zh: "由读者自己评判",
  },
  "Un récit, pas une leçon": {
    en: "An account, not a lesson",
    zh: "是自述，不是说教",
  },
  "Qui donne des préceptes s’expose": {
    en: "Giving precepts invites blame",
    zh: "立规矩的人要经得起批评",
  },
  "Descartes pose que la capacité de bien juger est la même chez tous ; les opinions divergent parce que chacun conduit sa pensée autrement.":
    {
      en: "Descartes holds that the power of judging well is the same in everyone; opinions differ because people guide their thinking differently.",
      zh: "笛卡尔认为，正确判断的能力人人相同；意见之所以不同，是因为各人引导思想的方式不同。",
    },
  "Un esprit vigoureux ne suffit pas : ce qui compte est la manière de l’appliquer.":
    {
      en: "A vigorous mind is not enough; what matters is how it is applied.",
      zh: "只有敏锐的头脑还不够，重要的是怎样运用它。",
    },
  "Descartes dit avoir tiré de sa méthode des progrès constants. C’est son propre témoignage, pas une mesure indépendante.":
    {
      en: "Descartes says his method has brought him steady progress. This is his own testimony, not an independent measure.",
      zh: "笛卡尔说他的方法让他不断进步。这是他本人的说法，不是独立的衡量。",
    },
  "Il admet qu’il prend peut-être du cuivre et du verre pour de l’or et des diamants, c’est-à-dire qu’il surestime ses résultats.":
    {
      en: "He admits he may be taking copper and glass for gold and diamonds, that is, overrating his results.",
      zh: "他承认自己也许把铜和玻璃当成了金子和钻石，也就是高估了自己的成果。",
    },
  "Il choisit de décrire, comme dans un tableau, la façon dont il a conduit sa raison, plutôt que d’imposer une méthode.":
    {
      en: "He chooses to describe, as in a picture, how he has guided his own reason, instead of prescribing a method.",
      zh: "他选择像画一幅画那样描述自己如何引导理性，而不是给别人规定方法。",
    },
  "Ainsi exposé, son parcours peut être jugé par chaque lecteur, et les avis reçus deviennent pour lui un moyen de s’instruire.":
    {
      en: "Laid out this way, his path can be judged by each reader, and the opinions he receives become a way for him to learn.",
      zh: "这样摆出来，每位读者都能评判他的道路；别人的意见也成了他继续学习的途径。",
    },
  "Son but n’est pas d’enseigner la méthode que chacun doit suivre, mais de montrer comment il a conduit la sienne.":
    {
      en: "His aim is not to teach the method everyone should follow, but to show how he has guided his own.",
      zh: "他的目的不是教人人都该遵循的方法，而是展示自己如何引导理性。",
    },
  "Celui qui prescrit aux autres se juge plus habile qu’eux et mérite d’être blâmé à la moindre erreur.":
    {
      en: "Whoever prescribes to others thinks himself more skilful than they are and deserves blame for the slightest error.",
      zh: "给别人立规矩的人自认为比别人高明，哪怕出一点错也该受责备。",
    },
  Méthode: { en: "Method", zh: "方法" },
  "Ici, la manière dont l’auteur dit avoir conduit sa pensée, présentée à partir de sa propre expérience.":
    {
      en: "Here, the way the author says he has guided his thinking, presented from his own experience.",
      zh: "在这段文字里，指作者依据自身经历所说的引导思考的方式。",
    },
  "Distinguez le progrès que l’auteur s’attribue d’une mesure indépendante de l’efficacité de la méthode.":
    {
      en: "Separate the progress the author claims for himself from an independent measure of how well the method works.",
      zh: "请把作者自称的进步和对方法效果的独立衡量区分开来。",
    },
  "Extrait du domaine public, remis en page pour cet exemple. Carte préparée à la main ; aucun modèle n’a été évalué dessus.":
    {
      en: "Public-domain excerpt, re-typeset for this example. The map was prepared by hand; no model was evaluated on it.",
      zh: "公有领域文本节选，为本示例重新排版。图谱为人工整理，没有用来评测任何模型。",
    },
} as const;
