# 无密钥示例与来源

两份示例使用同一段公有领域文本：René Descartes（1596–1650）《谈谈方法》（*Discours de la méthode*，1637）第一部分开头五段，John Veitch（1829–1894）英译。不是 arXiv 论文。

- 来源与版权标记：https://www.gutenberg.org/ebooks/59 （2026-09-22 核实，标注 Public domain in the USA，并列出作者和译者的生卒年）。
- 核对用原文：https://www.gutenberg.org/cache/epub/59/pg59-images.html 。
- 作者和译者去世均已超过 70 年。这里只重排正文节选，没有复制 Project Gutenberg 的商标和许可证附录。
- `descartes-excerpt.json` 保存五段文本（统一了空白）；`demo-descartes-html/source.html` 和 `demo-descartes-pdf/source.pdf` 是本项目重新排版的文件，**不是 1637 年原版的影印件**，页面上写明了这一点。
- 图谱由人工整理：六个主步骤、两个子步骤，包含发散、汇聚、矛盾和细化，附一张术语卡和一条修改建议。没有为了凑齐模式而添加因果关系。所有步骤的状态都是 partial，confidence 是示意值，不是校准过的概率；示例没有调用模型，不能说明抽取效果。
- 步骤名、摘要、主旨和说明文字以法文写在 `scripts/build_examples.py` 中，中英文译文在 `frontend/src/translations.ts`；引文保持英译原文。
- 重建：`.venv/bin/python -m scripts.build_examples`（需要 reportlab）。服务启动时会把示例复制到 data/；如果 data/ 里的副本与这里的 flow.json 不一致，会整体替换（示例目录只由程序维护，不存放用户数据）。

界面里的"原版排版片段"指保持输入的 source.pdf / source.html 的排版；本例的输入文件本身就是上述新排版。
