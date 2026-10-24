# CLAUDE.md — حقائق المشروع المقفلة

- المستودع: لوحات مبيعات HTML ثابتة لشركة الضبيبي التجارية (index.html, jul26.html, sales-dashboard.html).
- مصدر البيانات: Odoo (شركة واحدة، SAR) عبر موصّل «حصاد» للقراءة فقط.
- المبيعات في اللوحات = pos.order: Σ(amount_total − amount_tax) لكل config_id شهرياً بتوقيت الرياض (مُثبَت).
- التكلفة = pos.order.line: Σ total_cost (مُثبَت).
- نسب مخصّص الصرف (0.5٪/0.75٪/1٪/2.5٪) ونسبة الإدارة 20٪ ليست في Odoo — مصدرها Excel.
- التفاصيل الكاملة: docs/odoo-reverse-engineering.md
