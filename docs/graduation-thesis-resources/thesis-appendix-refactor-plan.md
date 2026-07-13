# Thesis Appendix Reallocation Plan

> Pham vi: tu van va lap ke hoach di doi noi dung sang phu luc cho bao cao khoa luan QRTable. Chua sua truc tiep file `.tex` chuong chinh trong plan nay.

## 1. Muc tieu

Tai phan bo noi dung cua bao cao khoa luan QRTable: giu cac lap luan, thiet ke va ket luan quan trong trong chuong chinh; dua cac noi dung chi tiet, bang chung mo rong va artifact tai lap sang phu luc dung vai tro. Muc tieu khong phai cat ngan toan bo bao cao bang moi gia, ma la lam cho duong doc chinh mach lac hon trong khi van giu day du bang chung can thiet cho kha nang kiem chung, tai lap va bao ve truoc hoi dong.

Ket qua mong muon:

- Than bai tu `Tom tat` den het Chuong 7 tro thanh duong doc chinh gon va tu dung duoc; so trang than bai co the giam, nhung do la he qua cua viec chuyen noi dung dung cho phu luc, khong phai KPI rieng.
- Tong PDF sau khi bat phu luc co the van dai neu phu luc in kem. Neu giang vien/hoi dong yeu cau in kem phu luc, tong so trang la trade-off chap nhan duoc mien la phu luc co cau truc ro va khong lam roi mach chuong chinh.
- Chuong chinh van tu dung duoc: nguoi doc hieu bai toan, phuong phap, thiet ke, trien khai, danh gia va ket luan ma khong can doc phu luc.
- Phu luc chi chua chi tiet bo sung: UI gallery, command/test output, setup/demo, source/release, diagram mo rong, raw benchmark/log.

## 2. Co so quy chieu

Thu tu uu tien khi co xung dot:

1. Quy dinh cua truong/khoa trong `presentation-format-graduation-thesis.md`.
2. Huong dan cua giang vien huong dan va hoi dong.
3. Cach trinh bay ky thuat theo IEEE/ACM, references theo IEEE.
4. Nguyen tac cau truc van ban theo ISO 7144, ISO 2145 va ISO 690.
5. Nguyen tac phu luc pho bien trong thesis/dissertation guidelines va APA-style appendices.
6. Nhat quan noi bo trong toan bo bao cao.

Nguon noi bo da doi chieu:

- `AGENTS.md`
- `docs/graduation-thesis-resources/presentation-format-graduation-thesis.md`
- `docs/graduation-thesis-resources/thesis-official-outline.md`
- `docs/graduation-thesis-resources/thesis-evidence-map.md`
- `docs/graduation-thesis-resources/thesis-workflow-plan.md`
- `docs/graduation-thesis-resources/thesis-report/undergraduate-theses-report.tex`
- `docs/graduation-thesis-resources/thesis-report/undergraduate-theses-report.toc`
- `docs/graduation-thesis-resources/thesis-report/appendices/*.tex`

Nguon ngoai da tham khao:

- ISO 7144:1986, presentation of theses and similar documents: https://www.iso.org/standard/13736.html
- ISO 2145:1978, numbering of divisions and subdivisions: https://www.iso.org/standard/6937.html
- ISO 690:2021, bibliographic references and citations: https://www.iso.org/standard/72642.html
- IEEE Editorial Style Manual / IEEE Reference Guide: https://journals.ieeeauthorcenter.ieee.org/your-role-in-article-production/ieee-editorial-style-manual/
- Ohio State University thesis/dissertation formatting guidelines: https://gradsch.osu.edu/current-students/dissertations-and-theses/document-preparation/formatting-guidelines-theses
- APA appendices setup: https://apastyle.apa.org/style-grammar-guidelines/paper-format/appendices

## 3. Snapshot hien tai

CodeGraph preflight:

```bash
codegraph status .
```

Ket qua: index up-to-date, 1,238 files, 15,909 nodes, 32,937 edges. CodeGraph phu TypeScript/TSX/JS/Python/YAML/XML; Markdown/LaTeX phai doc truc tiep bang `rg`, `sed`, `pdfinfo`, `texcount`.

Git:

```bash
git branch --show-current
```

Ket qua: `main`. Khong tao branch moi. Worktree hien co thay doi cua nguoi dung o:

```text
M docs/graduation-thesis-resources/thesis-report/assets/diagrams/chapter3-business-flow.mmd
```

Khong duoc revert hoac ghi de thay doi nay neu khong duoc yeu cau.

PDF baseline:

- File: `docs/graduation-thesis-resources/thesis-report/undergraduate-theses-report.pdf`
- Pages: 192
- References bat dau o page 176 theo `.toc`
- Main LaTeX hien ket thuc sau References va chua include cac file `appendices/*.tex`

Phan bo page theo `.toc`:

| Phan               | Bat dau | Uoc tinh |
| ------------------ | ------: | -------: |
| Tom tat            |       1 |  2 trang |
| Chuong 1           |       3 |  9 trang |
| Chuong 2           |      12 | 23 trang |
| Chuong 3           |      35 | 17 trang |
| Chuong 4           |      52 | 37 trang |
| Chuong 5           |      89 | 52 trang |
| Chuong 6           |     141 | 30 trang |
| Chuong 7           |     171 |  5 trang |
| Tai lieu tham khao |     176 | 17 trang |

Ton tai phu luc chua duoc include:

- `appendices/a-ui-gallery.tex`
- `appendices/b-setup-demo.tex`
- `appendices/c-source-release.tex`
- `appendices/d-test-evidence.tex`
- `appendices/e-extended-diagrams.tex`

## 3.1. Protocol cho agent thuc thi

Phan nay la bat buoc cho agent tiep tuc plan. Muc tieu la giu dung y dinh cua nguoi viet: tai phan bo noi dung sang phu luc, khong toi uu tong so trang bang moi gia.

### Viec can lam truoc khi sua file

1. Lam viec tren `main`; khong tao branch moi neu nguoi viet khong yeu cau.
2. Doc `AGENTS.md` truoc khi sua bat ky file nao.
3. Chay CodeGraph truoc khi doc/sua sau:

```bash
codegraph status .
codegraph context "Audit QRTable thesis appendix reallocation across LaTeX chapters, appendices, thesis workflow, internal technical docs, Mermaid diagrams"
```

4. Ghi nhan gioi han CodeGraph: CodeGraph phu tot TypeScript/TSX/JS/Python/YAML/XML, nhung khong phu day du Markdown/LaTeX. Voi `.tex`, `.md`, `.mmd`, `.toc`, `.lof`, `.lot`, phai doc truc tiep bang `rg`, `sed`, `pdfinfo`, `texcount`.
5. Kiem tra dirty worktree:

```bash
git status --short
```

Khong revert, format lai, ghi de hay di chuyen thay doi co san cua nguoi viet. Tai thoi diem plan nay duoc lap, file dang modified san la:

```text
docs/graduation-thesis-resources/thesis-report/assets/diagrams/chapter3-business-flow.mmd
```

### Thu tu doc tai lieu noi bo

Doc theo thu tu sau, khong nhay thang vao `.tex`:

1. `AGENTS.md` - quy tac lam viec, service boundary, doc sync, quality report.
2. `docs/graduation-thesis-resources/thesis-workflow-plan.md` - trang thai moi nhat cua workflow khoa luan.
3. `docs/graduation-thesis-resources/presentation-format-graduation-thesis.md` - quy dinh hinh thuc cua truong/khoa.
4. `docs/graduation-thesis-resources/thesis-official-outline.md` - muc luc, page budget, artifact policy.
5. `docs/graduation-thesis-resources/thesis-evidence-map.md` - claim policy, evidence strength, overclaim guardrails.
6. `docs/graduation-thesis-resources/thesis-source-backbone.md` - citation/source policy cho Chuong 1-2.
7. `docs/graduation-thesis-resources/thesis-report/undergraduate-theses-report.tex` - main LaTeX va thu tu include.
8. `docs/graduation-thesis-resources/thesis-report/undergraduate-theses-report.toc` - page distribution thuc te.
9. `docs/graduation-thesis-resources/thesis-report/undergraduate-theses-report.lof` va `.lot` - danh muc hinh/bang de tranh lam lech numbering.
10. `docs/graduation-thesis-resources/thesis-report/chapters/*.tex` - chi doc sau khi da nam policy.
11. `docs/graduation-thesis-resources/thesis-report/appendices/*.tex` - kiem tra phu luc da co gi, khong tao trung.
12. `docs/graduation-thesis-resources/thesis-report/assets/diagrams/*.mmd` va `assets/figures/*` - chi khi can di chuyen/render diagram.

Khi noi dung lien quan den technical claim, doc them:

- `docs/README.md`
- `docs/DOC-CODE-ANCHORS.md`
- `docs/technical-architecture.md`
- `docs/business-logic.md`
- `docs/phases/*.md` lien quan
- `docs/testing/traceability-matrix.md`
- `docs/architecture/permission-matrix.md`

### Su dung skills

Dung `npx openskills read` de doc skill project neu session chua co skill do trong context. Khong goi lai skill da doc trong cung context neu khong can.

Thu tu uu tien:

1. `zoom-out` - dung dau tien de lap ban do actor/domain/use case va phan biet chuong chinh/phu luc theo vai tro.
2. `grill-with-docs` - dung de audit assumption, contradiction, reviewer-style questions; neu cau hoi co the tra bang code/docs thi doc repo thay vi hoi nguoi viet.
3. `plan-writing` hoac `writing-plans` - dung khi bien chinh sach thanh checkpoint thuc thi.
4. `doc-coauthoring` - chi dung khi can refine cau truc tai lieu audit/plan; khong dung de draft chuong dai trong task nay.
5. `documentation-templates` - dung neu can tao mau appendix, mau evidence inventory, hoac template handoff.
6. `lint-and-validate` / `verification-before-completion` - dung truoc khi noi build pass, plan pass, hoac task hoan tat; phai co lenh verify moi.

Lenh goi skill goi y:

```bash
npx openskills read zoom-out,grill-with-docs,plan-writing
```

Neu sua LaTeX/diagram, co the can doc them skill LaTeX/diagram tu danh sach installed skills cua session, nhung khong tu y doi render pipeline neu workflow da co script rieng.

### Context7, browser va nguon ngoai

- Dung Context7 khi phat sinh cau hoi ve library/framework/SDK/API/CLI/cloud service, vi `AGENTS.md` yeu cau fetch docs hien hanh.
- Dung browser/web search khi can doi chieu guideline hoc thuat, standard, thesis formatting, APA/IEEE/ISO/ACM hoac nguon official ben ngoai.
- Khi them nguon moi vao noi dung khoa luan, phai cap nhat `references.bib`, them `\cite{...}` dung noi dung va build lai. Khong them citation gia hay nguon chi de lam day bibliography.
- Uu tien nguon official/standard truoc blog. Voi quy cach phu luc, thu tu uu tien van la quy dinh truong/khoa -> huong dan giang vien -> style guide/standard quoc te.

### Ranh gioi cong viec

- Khong sua source code QRTable trong task appendix reallocation, tru khi phat hien claim trong khoa luan sai nghiem trong va nguoi viet yeu cau sua code.
- Khong sua technical docs canonical neu chi dang di chuyen noi dung khoa luan; chi cap nhat docs technical khi thay doi route, enum, env, architecture claim hoac folder layout thuc su.
- Khong bien Chuong 5 thanh README/user manual; Chuong 5 giu flow, invariant, ownership va evidence representative.
- Khong bien Chuong 6 thanh gallery cong cu; Chuong 6 giu ket luan, bang doi chieu va hinh dai dien.
- Khong dung phu luc de giau limitation quan trong. Limitation can nam o Chuong 6/7; phu luc chi chua bang chung/chi tiet mo rong.
- Khong coi tong so trang PDF la KPI duy nhat. Thanh cong la chuong chinh mach lac va phu luc co vai tro ro.

## 4. Nguyen tac quyet dinh noi dung chinh vs phu luc

Giu trong chuong chinh neu noi dung:

- La luan diem chinh cua de tai.
- Can thiet de hoi dong hieu bai toan, phuong phap, thiet ke, trien khai, danh gia.
- Truc tiep chung minh dong gop ky thuat: service boundary, data ownership, tenant isolation, Order Confirm Saga, SePay/VietQR boundary, WebSocket hint/refetch, selective Kafka eventing.
- La hinh/bang tong hop ma van ban trong chuong dang dua vao de lap luan.
- La ket qua danh gia dai dien, da duoc dien giai bang ket luan ro rang.

Chuyen sang phu luc neu noi dung:

- La bang chung day du nhung khong can de theo mach lap luan chinh.
- Qua dai, lap lai voi diagram tong quan, hoac chi la sub-step cua mot flow da co hinh tong hop.
- La raw command output, log, terminal screenshot, Allure/Nx Cloud detail, benchmark JSON/markdown, screenshot bo sung.
- La danh sach API, payload mau, route matrix, permission matrix mo rong, DBML/ERD chi tiet.
- La UI gallery day du, setup/demo guide, source/release/commit hash, CD/package structure.

Khong chuyen sang phu luc neu noi dung:

- La co so duy nhat cho mot claim quan trong.
- La phan giai thich bat buoc de hieu flow chinh.
- La noi dung dang che giau mot gioi han nghiem trong cua de tai.
- Khong duoc goi tu than bai. Moi phu luc can co it nhat mot tham chieu trong chuong chinh.

## 5. Cau truc phu luc de xuat

Thu tu de xuat sau `TAI LIEU THAM KHAO`:

```text
PHU LUC A. Minh hoa client he thong QRTable
PHU LUC B. Huong dan setup va kich ban demo
PHU LUC C. Source code, release va cau truc goi nop
PHU LUC D. Minh chung kiem thu va kha nang tai hien
PHU LUC E. Diagram, ma tran va du lieu ky thuat mo rong
PHU LUC F. Ket qua benchmark va quan sat van hanh chi tiet
```

Ghi chu:

- A co the giu nhu hien tai, nhung chi nen include neu anh that da thay placeholder.
- B/C nen ngan, dung vai tro tai lap va goi nop, khong thanh README day du.
- D nen chua command output/test evidence chi tiet; Chuong 6 chi giu bang tong hop va 1-2 hinh dai dien.
- E nen chua permission matrix, DBML/ERD/detail diagram neu can rut gon Chuong 4/5.
- F chi them neu Chapter 6 rut raw k6/Grafana/Prometheus/Tempo/Allure detail ra khoi than bai.

Quy uoc dat ten va danh so:

- Trong LaTeX dung `\appendix` sau References.
- Moi file phu luc dung `\chapter{...}` de LaTeX sinh A, B, C.
- Hinh/bang trong phu luc danh so theo chu cai phu luc: `Hinh A.1`, `Bang D.1`.
- Caption phai ngan, co y nghia, va neu la anh chup thi ghi ro `Nguon: tac gia chup tu he thong QRTable` hoac tuong duong.
- Ten file phu luc nen giu kebab-case: `f-benchmark-observability-evidence.tex`.

## 6. Candidate refactor theo chuong

### Chuong 2 - co so ly thuyet

Muc tieu: giu vai tro nen tang hoc thuat, chuyen cac artifact conceptual lap lai hoac qua chi tiet sang phu luc neu chung khong can cho mach lap luan chinh.

Nen giu:

- POS F&B lifecycle o muc tong quan.
- SaaS/multi-tenancy va tenant isolation.
- Microservices/service boundary.
- Sync vs async communication.
- Consistency/idempotency/Saga/outbox.
- Related systems va theory-to-QRTable mapping.

Nen rut gon/chuyen phu luc:

- Hinh `chapter2-monolith-vs-microservices.pdf` neu bang so sanh da du.
- Hinh Kafka conceptual neu Chuong 4 da co Kafka decision flow va topic registry.
- Hinh WebSocket hint/refetch neu Chuong 4/5 da giai thich source of truth.
- Hinh Outbox/Saga overview neu Chuong 5 da co Order Confirm Saga va SaaS Onboarding Saga.

Quy tac: Chuong 2 khong nen la textbook mini-book. Moi muc nen gom 1 doan dinh nghia, 1 doan lien he QRTable, 1 artifact neu that su can.

### Chuong 4 - kien truc

Muc tieu: giu cac quyet dinh kien truc va bang tong hop ownership trong chuong chinh; chuyen schema/diagram tra cuu chi tiet sang phu luc neu chung lam dut mach doc.

Nen giu:

- Bang cong nghe va vai tro.
- Overall architecture / C4 container.
- Bang service ownership.
- Bang data ownership tong hop.
- Multi-tenancy isolation.
- Communication matrix.
- Kafka topic contract.
- Redis ownership.
- Security/auth flow.
- SePay/VietQR payment architecture.

Nen chuyen phu luc E:

- 5 hinh schema per-service neu hoi dong khong can xem ngay trong than bai.
- Permission matrix chi tiet neu co bo sung.
- DBML source / ERD chi tiet.
- Diagram mo rong chi phuc vu tra cuu.

Lua chon an toan: trong Chuong 4 giu bang tong hop schema ownership, chuyen 5 schema SVG/PDF chi tiet xuong Phu luc E. Than bai chi tham chieu: "Chi tiet schema per-service xem Phu luc E".

### Chuong 5 - trien khai luong van hanh

Muc tieu: giu flow dai dien va invariant trong chuong chinh; chuyen sub-step diagram, screenshot bo sung va bang chung minh hoa day du sang phu luc.

Nen giu:

- 1 hinh tong quan cho moi luong lon:
  - QR session/shared cart/order submit.
  - Order Confirm Saga.
  - KDS event/projection/realtime.
  - Payment settlement.
  - SaaS onboarding/subscription.
- Bảng tổng hợp kết quả triển khai.
- Hai Saga đại diện.
- 6-8 screenshot đại diện nếu là ảnh thật và gắn với user journey.

Nen chuyen phu luc E/F hoac loai khoi ban in:

- Các hinh sub-step 0.72 textheight cho từng nhánh nhỏ nếu đã có hình overview.
- Các diagram retry/compensation/outbox chi tiết của cùng Order Confirm Saga, trừ khi chỉ giữ một nhóm minh họa sâu.
- Screenshot chứng minh màn hình tồn tại nhưng không phục vụ lập luận chính.
- UI gallery đầy đủ sang Phụ lục A.

Goi y giu/rut:

- QR session: giu overview, chuyen `qr-session-init`, `shared-cart-version`, `session-redis-postgres-sync`, `cart-submit-order` sang appendix hoặc gom thành 1 figure grid.
- Order Confirm Saga: giu overview và 1 figure sâu nhất về idempotency/compensation; chuyển phần còn lại sang appendix.
- KDS: giu lifecycle overview hoặc Redis projection, không giữ đủ 5 hình con trong than bài.
- Payment: giu settlement overview và SePay webhook; rut cash/snapshot intent sang paragraph hoặc appendix.
- SaaS: giu onboarding saga overview và subscription lifecycle; chuyển provisioning/compensation chi tiết sang appendix.

### Chuong 6 - danh gia

Muc tieu: giu ket luan danh gia, ma tran doi chieu va hinh dai dien trong chuong chinh; chuyen raw evidence va anh cong cu chi tiet sang phu luc.

Nen giu:

- Evidence policy.
- Traceability summary.
- Functional validation matrix.
- 1 Allure overview.
- 1-2 hinh E2E dai dien.
- 1 hinh Saga tests hoac bang mapping Saga invariant -> evidence.
- Bang k6 summary neu co so lieu that.
- Gioi han danh gia.

Nen chuyen phu luc D/F:

- Allure step-by-step screenshots.
- Nx Cloud screenshots cho tung suite neu chi lap lai ket qua.
- Raw Saga terminal outputs.
- Redis/Kafka/Grafana/Prometheus/Tempo screenshots chi tiet.
- Benchmark summary JSON/raw markdown.

Quy tac: Chuong 6 la noi dien giai ket luan, khong phai gallery công cu. Moi hinh can tra loi "ket luan nao duoc tang do tin cay nho hinh nay?".

## 7. Task plan thuc thi

- [ ] Task 1: Preflight tren `main`.
  - Run: `git branch --show-current`
  - Expected: `main`
  - Run: `git status --short`
  - Expected: ghi nhan dirty files, khong revert.
  - Run: `codegraph status .`
  - Expected: index up-to-date.

- [ ] Task 2: Do baseline PDF/TOC/asset density.
  - Run: `pdfinfo docs/graduation-thesis-resources/thesis-report/undergraduate-theses-report.pdf | rg '^Pages:'`
  - Run: `sed -n '1,260p' docs/graduation-thesis-resources/thesis-report/undergraduate-theses-report.toc`
  - Run: `cd docs/graduation-thesis-resources/thesis-report && texcount -brief chapters/*.tex appendices/*.tex`
  - Verify: co inventory moi cho Chuong 2/4/5/6, gom noi dung nao la argument chinh va noi dung nao la candidate appendix.

- [ ] Task 3: Bat cau truc appendix trong main LaTeX sau References.
  - Modify: `docs/graduation-thesis-resources/thesis-report/undergraduate-theses-report.tex`
  - Them sau block `\endgroup` cua References va truoc `\end{document}`:

```tex
\cleardoublepage
\appendix
\renewcommand{\chaptername}{Phụ lục}
\input{appendices/a-ui-gallery}
\input{appendices/b-setup-demo}
\input{appendices/c-source-release}
\input{appendices/d-test-evidence}
\input{appendices/e-extended-diagrams}
```

- Verify: build pass, `.toc` co Phu luc A-E sau References.

- [ ] Task 4: Quyet dinh "print vs online appendix" voi giang vien/nguoi viet.
  - Neu phu luc in kem: chap nhan tong PDF co the dai hon, nhung can dam bao TOC/appendix ro rang va chuong chinh khong bi bien thanh gallery.
  - Neu phu luc nop online/rieng: main PDF co the chi include phu luc can thiet, A/B/C de trong goi nop hoac PDF phu.
  - Verify: ghi quyet dinh vao `thesis-workflow-plan.md`.

- [ ] Task 5: Tai phan bo Chuong 2.
  - Modify: `chapters/02-co-so-ly-thuyet-va-cong-trinh-lien-quan.tex`
  - Move conceptual figures low-yield sang appendix hoac de ngoai ban in neu da duoc Chuong 4/5 thay the bang QRTable-specific diagrams.
  - Compress prose lap lai voi Chuong 4/5 chi khi no khong lam mat co so hoc thuat.
  - Verify: moi muc ly thuyet con lien ket ro voi QRTable; citations van hop le.

- [ ] Task 6: Tai phan bo Chuong 5.
  - Modify: `chapters/05-trien-khai-he-thong.tex`
  - Giu overview diagram theo flow, chuyen sub-step diagrams sang appendix E/F hoac de asset ngoai PDF.
  - Giu screenshot dai dien, bo UI gallery trung lap.
  - Verify: Chuong 5 van chung minh duoc cac flow chinh, khong mat claim Order Confirm Saga va SaaS Onboarding Mini-Saga.

- [ ] Task 7: Tai phan bo Chuong 6.
  - Modify: `chapters/06-danh-gia.tex`
  - Giu bang ket luan va hinh dai dien; chuyen raw evidence sang Phu luc D/F.
  - Verify: moi ket luan van co evidence anchor; raw evidence trong phu luc duoc goi tu than bai.

- [ ] Task 8: Tai phan bo Chuong 4 neu schema/diagram chi tiet lam dut mach doc.
  - Modify: `chapters/04-thiet-ke-va-kien-truc-he-thong.tex`
  - Chuyen 5 schema per-service sang Phu luc E neu can.
  - Verify: Chuong 4 van giu service/data ownership ro, phu luc E tro thanh noi tra cuu chi tiet.

- [ ] Task 9: Cap nhat tham chieu cheo.
  - Moi appendix duoc goi tu than bai it nhat mot lan.
  - Mau cau:

```tex
Chi tiết các diagram triển khai phụ trợ được trình bày tại Phụ lục~\ref{app:extended-diagrams}.
```

- Verify: build khong undefined references.

- [ ] Task 10: Build va quality gate.
  - Run:

```bash
cd docs/graduation-thesis-resources/thesis-report
latexmk -xelatex -interaction=nonstopmode -halt-on-error undergraduate-theses-report.tex
pdfinfo undergraduate-theses-report.pdf | rg '^Pages:'
rg -n "undefined|Citation.*undefined|Reference.*undefined|Overfull|Underfull" undergraduate-theses-report.log
```

- Expected: build pass, khong undefined citation/reference. Overfull/Underfull neu con phai duoc phan loai ro.

- [ ] Task 11: Visual QA.
  - Kiem tra `.toc`, `.lof`, `.lot`.
  - Render/skim cac trang bat dau Chuong 2, 4, 5, 6, References va Appendices.
  - Verify: khong co appendix orphan, hinh/bang/caption khong vo layout.

- [ ] Task 12: Cap nhat workflow.
  - Modify: `docs/graduation-thesis-resources/thesis-workflow-plan.md`
  - Ghi lai page count truoc/sau nhu so lieu quan sat, appendices duoc include, noi dung da chuyen, rui ro con lai.

## 8. Reviewer-style questions can giu khi refactor

1. Neu bo hinh nay, nguoi doc co con hieu claim chinh khong?
2. Neu chuyen noi dung nay xuong phu luc, than bai co con tu dung duoc khong?
3. Phu luc nay co duoc nhac toi trong than bai khong?
4. Hinh/bang nay chung minh dieu gi ma van ban chua noi duoc?
5. Noi dung nay la research argument, design decision, implementation evidence hay raw artifact?
6. Co dang dung phu luc de giau limitation quan trong khong?
7. Co dang de Chuong 5 thanh user manual/source walkthrough khong?
8. Co dang de Chuong 6 thanh gallery cong cu thay vi evaluation khong?
9. Co claim nao ve production, benchmark, observability, SePay live provider vuot qua bang chung hien co khong?
10. Neu hoi dong chi doc than bai, ho co nam du dong gop QRTable khong?

## 9. Done when

- [ ] Main LaTeX co cau truc appendix sau References neu quyet dinh include appendix trong PDF chinh.
- [ ] Chuong chinh co duong doc mach lac; noi dung dua xuong phu luc la bang chung/chi tiet bo sung, khong phai luan diem bat buoc.
- [ ] Tong PDF duoc ghi nhan nhu trade-off sau khi include appendix, khong xem so trang tong la tieu chi thanh cong duy nhat.
- [ ] References va appendices xuat hien dung thu tu trong TOC.
- [ ] Hinh/bang appendix co numbering dang `A.1`, `D.1` hoac tuong duong.
- [ ] Moi appendix duoc tham chieu tu than bai.
- [ ] Build LaTeX pass, khong undefined citation/reference.
- [ ] `thesis-workflow-plan.md` cap nhat snapshot sau refactor.
