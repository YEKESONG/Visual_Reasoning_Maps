# 综述初稿

法文正文在 `etat_de_lart/main.tex`，七节分文件维护；`fiches/` 中有 24 张阅读卡片，覆盖原清单的 23 项文献（第 11 项拆成 StoryFlow 和 iStoryline 两篇）。引用使用实际读过的 arXiv/ACL 版本，年份按该版本标注。

编译：安装 TeX Live 或 MacTeX（需要 babel-french），运行 `cd paper/etat_de_lart && make`。编译产物不提交。中文说明与法文正文分开修改。

核实范围：2026-09-22 读取了各论文的摘要、出版平台元数据和项目官方说明，没有逐篇精读全文；正文只引用摘要层面能核实的结论，研究结果不推广到原文没有涉及的任务。对比表中的"À vérifier"表示这次阅读没有确认，不表示该系统没有这项功能。

补充链接（同一文献的其他访问入口）：
- Khartabil： https://diglib.eg.org/items/70e0bf0c-a653-4e83-a5d0-71cbe19725e7
- StoryFlow： https://www.microsoft.com/en-us/research/publication/storyflow-tracking-evolution-stories/
- Hurter： https://recherche.enac.fr/~hurter/KDEEB/KDEEB.html

## 待办清单

- 全部文献：补充全文页码和实验方法细节。
- 文献 4：核实最终的 EuroVis/CGF 发表状态，目前只引用预印本。
- 文献 10：IEEE 页面访问受限，需核实完整元数据和算法细节。
- 文献 11b：原链接指向 fork，需核实原仓库，以及在线发表年份与卷期年份的差异。
- 文献 15、18：BibTeX 目前用预印本年份；如改引期刊版，需同步更新元数据。
- 文献 16：题名已按 arXiv 当前版本更正。
- 文献 20：作者已核实为 Zhuang、Chen、Xu、Jiang、Lin。
- 文献 21：技术网页没有标注发布日期，引用不带年份；其中的效果数据由作者自己报告。
- 可选文献：Lhuillier 等（2017）边绑定综述尚未纳入正文，链接待补。
- 综述把本项目写成设计目标，没有宣称首创；效果需要通过人工实验验证。

## 修订记录

- S1–S2：阅读卡片、引用索引和七节初稿。
- S21e：摘要、引言和第 2、4、5、6、7 节做了措辞修订，删去重复的免责句，把名词化的长句改成直接陈述；第 6 节补充了原型在真实双栏论文上测试 PDF 解析后的情况。引用、数据和结论未改动。
