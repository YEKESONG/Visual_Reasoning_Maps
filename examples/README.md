# 无密钥演示与来源

两份预生成示例使用同一段公有领域文本：René Descartes（1596–1650），*Discourse on the Method*，Part I 开头五段，John Veitch（1829–1894）英译。不是 arXiv 论文。

- 来源与版权标记：https://www.gutenberg.org/ebooks/59 （2026-09-22 核实，标记 Public domain in the USA，并列出作者/译者生卒年）。
- 核对的原文：https://www.gutenberg.org/cache/epub/59/pg59-images.html 。
- 原著 1637；原作者及此译者均去世超过 70 年。这里仅重排正文摘录，不复制 Project Gutenberg 商标或许可证附录。
- `descartes-excerpt.json` 保留五段文本，统一空白；`demo-descartes-html/source.html` 与 `demo-descartes-pdf/source.pdf` 是本项目新排版，**不是历史原版影印件**。页面明确说明这一点。
- 图谱为人工整理的展示数据，所有语义状态均为 partial；未调用模型，不证明抽取准确性。confidence 是演示值，不是校准概率。
- 六个主步骤、两个子步骤、分叉/汇聚/矛盾/细化，附术语和一条可复核建议。这里没有凭空添加因果关系来凑模式。
- 运行 `.venv/bin/python -m scripts.build_examples` 可重建文件（需已安装 reportlab）。启动时复制至 data/，不覆盖用户已有同名结果。

应用中“原版片段”表示保持所输入 source.pdf/source.html 的排版；本例输入文档本身为上述新排版。
