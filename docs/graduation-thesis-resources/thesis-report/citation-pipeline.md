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

Ở cuối Phase 2A, `references.bib` chưa chứa entry thật và các chương chưa có `\cite{...}`. Vì vậy log có thể báo `Keyword 'vietnamese' not found` hoặc `Empty bibliography`; đây là trạng thái chấp nhận được trước Phase 2B, miễn là build vẫn chạy BibTeX và không có LaTeX error.

Với MacTeX/TeXstudio, metadata trong main `.tex` có thể dùng XeLaTeX để preview. Khi đã có citation thật, cần chạy đủ chuỗi XeLaTeX -> BibTeX -> XeLaTeX -> XeLaTeX, hoặc cấu hình TeXstudio/latexmk tương đương, để bibliography được cập nhật.

Các dòng magic comments ở đầu `undergraduate-theses-report.tex` được giữ có chủ đích để TeXstudio/MacTeX trên macOS nhận diện đúng document, compiler và encoding:

```tex
% !TeX document-id = {...}
% !TeX program = xelatex
% !TeX encoding = UTF-8
```

Không tự ý đổi các dòng này sang `tectonic` chỉ vì command verification trong repo dùng `tectonic`. `tectonic` là lệnh kiểm chứng nhanh trong workflow; TeXstudio/MacTeX vẫn có thể dùng XeLaTeX theo magic comments.

Các file phụ trợ như `.aux`, `.toc`, `.lof`, `.lot`, `.out`, `.log`, `.bbl`, `.bcf`, `.blg`, `.run.xml`, `*-blx.bib` và PDF preview đã được ignore trong `.gitignore`.

## Ghi chú khi chuyển môi trường

Nếu chuyển sang Overleaf hoặc TeX Live đầy đủ, có thể cân nhắc đổi `backend=bibtex` sang `backend=biber` sau khi kiểm tra build. Không đổi backend trong lúc đang viết nội dung nếu không có nhu cầu thật, vì ưu tiên hiện tại là pipeline ổn định và dễ tái lập.
