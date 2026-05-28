# Citation pipeline cho khóa luận QRTable

## Mục tiêu

`references.bib` là nguồn quản lý citation duy nhất cho khóa luận. Main LaTeX dùng `biblatex` với `style=ieee`, `backend=bibtex`, `sorting=nty` để vừa giữ citation dạng IEEE, vừa sắp xếp bibliography theo alphabet theo yêu cầu hình thức.

## Cách dùng trong chương

- Thêm nguồn thật vào `references.bib` trước khi dùng.
- Trích dẫn trong chương bằng `\cite{citation-key}`.
- Không thêm nguồn chưa đọc/chưa dùng chỉ để làm đầy bibliography.
- Không dùng citation cho claim implementation nội bộ nếu claim đó cần source code, tests hoặc canonical docs làm evidence chính.

BibTeX entry mẫu:

```bibtex
@online{nist-cloud-definition-2011,
  author   = {{National Institute of Standards and Technology}},
  title    = {The NIST Definition of Cloud Computing},
  year     = {2011},
  url      = {https://csrc.nist.gov/pubs/sp/800/145/final},
  urldate  = {2026-05-28},
  language = {english},
  keywords = {english,chapter2,saas}
}
```

## Tách tài liệu tiếng Việt và tiếng Anh

Mỗi BibTeX entry cần có `language` và `keywords`.

- Nguồn tiếng Việt: thêm `language = {vietnamese}` và `keywords = {vietnamese,...}`.
- Nguồn tiếng Anh: thêm `language = {english}` và không thêm keyword `vietnamese`.

Main LaTeX render hai nhóm bằng:

```tex
\printbibliography[heading=none,keyword=vietnamese]
\printbibliography[heading=none,notkeyword=vietnamese]
```

## Build command

```bash
cd docs/graduation-thesis-resources/thesis-report
tectonic --keep-logs --keep-intermediates undergraduate-theses-report.tex
```

Các file phụ trợ như `.aux`, `.toc`, `.lof`, `.lot`, `.out`, `.log`, `.bbl`, `.bcf`, `.blg`, `.run.xml`, `*-blx.bib` và PDF preview đã được ignore trong `.gitignore`.

## Ghi chú khi chuyển môi trường

Nếu chuyển sang Overleaf hoặc TeX Live đầy đủ, có thể cân nhắc đổi `backend=bibtex` sang `backend=biber` sau khi kiểm tra build. Không đổi backend trong lúc đang viết nội dung nếu không có nhu cầu thật, vì ưu tiên hiện tại là pipeline ổn định và dễ tái lập.
