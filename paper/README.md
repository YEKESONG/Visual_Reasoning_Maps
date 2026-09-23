# 综述初稿

法文正文在 `etat_de_lart/main.tex`，各节分文件维护；`fiches/` 中每篇文献一张阅读卡片，`reference_index.json` 是卡片的索引（链接、阅读范围、待核实事项）。原清单共 23 项，第 11 项拆成 StoryFlow 和 iStoryline 两篇，第 12 项附带的边绑定综述（Lhuillier 等 2017）作为 12b 纳入，共 25 张卡片；另有 8 篇新增文献（24–31），共 33 张。

## 新增文献

原任务要求只用给定清单，补充文献须附可访问的链接并在此标注"新增"。以下 8 篇在 S23b 加入，每篇都用来填补原清单的一处空缺，理由也写在对应卡片的"为何新增"一行：

| 编号 | 文献 | 链接 | 用途 |
|---|---|---|---|
| 24 | Toulmin, *The Uses of Argument*（2003 年第 2 版，初版 1958） | https://doi.org/10.1017/CBO9780511840005 | 论证成分的经典模型，说明步骤类型的来源 |
| 25 | Mann & Thompson (1988), Rhetorical Structure Theory | https://doi.org/10.1515/text.1.1988.8.3.243 | 篇章关系理论，说明"细化""因果"关系的来源 |
| 26 | Davies (2011), Concept/Mind/Argument Mapping | https://doi.org/10.1007/s10734-010-9387-6 | 区分论证图与概念图 |
| 27 | Shneiderman (1996), The Eyes Have It | https://doi.org/10.1109/VL.1996.545307 | "先概览、再缩放过滤、按需看细节"的交互原则 |
| 28 | Wadden et al. (2020), SciFact | https://aclanthology.org/2020.emnlp-main.609/ | 用证据句核验科学主张的任务定义 |
| 29 | Zheng et al. (2023), LLM-as-a-Judge | https://arxiv.org/abs/2306.05685 | 大模型当评审的偏差 |
| 30 | Peters & Chin-Yee (2025), Generalization Bias | https://doi.org/10.1098/rsos.241776 | 大模型总结科学文献时过度概括的实证 |
| 31 | ELK Layered 文档 | https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-layered.html | 分层布局步骤的可核实描述，也是原型的实际实现 |

编译：安装 TeX Live 或 MacTeX（需要 babel-french），运行 `cd paper/etat_de_lart && make`。编译产物不提交。中文说明与法文正文分开修改。

## 核实范围

2026-09-23 逐篇重新核实，结果写在各卡片的"Lu"（阅读范围）一行：

- 读了全文，事实和数字带页码：Story Ribbons、Graphologue、Sensecape、Brossier 等、Lawrence 与 Reed、Li 等、Stab 与 Gurevych、Lauscher 等、StoryFlow、iStoryline、GraphRAG、Semantic Reader、SciDaSynth、ALCE、Liang 等、MARG、Docling；Zhuang 等和 LightRAG 做了针对性阅读。页码：期刊和会议论文用正式页码，arXiv 预印本用所读版本的页码。
- 只读了摘要和元数据：Khartabil 等（Wiley 全文不开放）、Sugiyama 等（IEEE 全文不开放，方法按 ELK 文档的描述转述）、Hurter 等 2012 和 Lhuillier 等 2017（作者 PDF 超出读取工具的大小限制）。正文引用它们时只用摘要层面的结论。
- 网页与软件：Stanford Agentic Reviewer 技术说明、GROBID 文档，按页面内容核实；其中的效果数字是作者自报。
- 出版信息全部对照 Crossref 或出版方页面。参考文献改为引用正式发表版本，`note` 字段注明实际读的是哪个版本。

## 待办清单

- 文献 4：Crossref 尚未收录 Computer Graphics Forum 45(3) 的 DOI 和页码，定稿前补上。
- 文献 6、13、14、19、23：仍是预印本，定稿前查是否已正式发表。
- 文献 9、10、12、12b：未读全文，如需引用细节，通过学校图书馆获取全文。
- 文献 15：期刊版（CACM 2024）与所读 arXiv v2（2023）可能有差异。
- 文献 21、22：网页和文档中的数字未独立复现。
- 文献 24、25：未读原著，Toulmin 模型按 Lauscher 等（2018）的转述，RST 关系按官方网站的定义。
- 文献 30：数字以预印本为准，需与期刊版核对。

已解决：文献 4 的发表状态（arXiv v2 已是 CGF 45(3) STAR 的排版）；文献 11b 的代码链接改为原仓库 tangtan/iStoryline.js（原链接是 fork 的 fork）；文献 16 的题名按期刊版更正；文献 20 的作者；Lhuillier 等 2017 的链接。

## 修订记录

- S1–S2：阅读卡片、引用索引和七节初稿。
- S21e：摘要、引言和第 2、4、5、6、7 节做了措辞修订；第 6 节补充了原型在真实双栏论文上测试 PDF 解析后的情况。
- S23a：逐篇对照全文或出版方页面重新核实，重写 25 张阅读卡片（研究问题、方法、带页码的结果、与本项目的关系），参考文献改为正式发表版本并注明所读版本，纳入 12b。
- S23b：新增 8 篇文献（24–31），各附阅读卡片、链接和新增理由。
