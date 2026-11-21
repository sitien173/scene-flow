# scene-flow: làm video dọc có lời đọc cùng Claude

[![CI](https://github.com/sitien173/scene-flow/actions/workflows/ci.yml/badge.svg)](https://github.com/sitien173/scene-flow/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

[English](README.EN.md)

scene-flow biến một kịch bản và một file giọng đọc thành video 9:16 cho TikTok, Reels và YouTube Shorts. Hình ảnh, phụ đề và hiệu ứng âm thanh chạy khớp theo từng từ trong giọng đọc. Bạn mô tả video bằng lời bình thường, xem thử trên trình duyệt, rồi yêu cầu sửa cho tới khi ưng ý. Claude chỉ xuất file MP4 khi bạn yêu cầu.

## Nên chuẩn bị trước cho kênh

Chuẩn bị những thứ sau một lần, mọi video của kênh sẽ có cùng một dấu ấn. Thiếu thứ nào thì scene-flow dùng mặc định có sẵn, nên bạn vẫn làm được video đầu tiên ngay.

### 1. Logo kênh

Tạo logo bằng một công cụ tạo ảnh hoặc tự thiết kế. Nên có file SVG, hoặc PNG nền trong suốt, hình vuông. Logo hiện ở màn hình cuối mỗi video, cạnh tên kênh và câu slogan.

Claude không tự vẽ logo. Logo luôn lấy từ file bạn đưa. Chưa có logo thì màn hình cuối dùng tạm logo của template.

### 2. Giọng đọc

Chọn một giọng và giữ cố định cho mọi video của kênh. scene-flow hỗ trợ bốn nguồn giọng:

| Nguồn giọng | Cần chuẩn bị | Giọng mặc định |
|---|---|---|
| Tự thu giọng | Micro và một chỗ yên tĩnh. Đây là cách tạo dấu ấn rõ nhất. | Không có |
| Vibi, giọng ElevenLabs | Dòng `VIBI_API_KEY` trong `~/.config/scene-flow/.env`. Vibi tính credit theo số ký tự của kịch bản. | Quang Toan |
| ElevenLabs API | Dòng `ELEVENLABS_API_KEY` trong `~/.config/scene-flow/.env`. ElevenLabs tính credit theo số ký tự của kịch bản. | Quang Toan |
| VieNeu-TTS trên Google Colab | Lệnh `colab` đã đăng nhập tài khoản Google. Không tính phí theo ký tự, nhưng tốn compute unit của Colab. | Hải Đăng |

Chưa biết chọn giọng nào thì chỉ cần chọn nguồn giọng, scene-flow dùng giọng mặc định của nguồn đó. Muốn giọng AI giống giọng thật của bạn thì nhờ Claude nhái giọng từ một đoạn thu mẫu. Chỉ nhái giọng của chính bạn hoặc của người đã đồng ý. Cách chọn giọng chi tiết ở [Chọn giọng đọc](#3-chọn-giọng-đọc).

### 3. Âm thanh

Chọn một bài nhạc nền và mức hiệu ứng âm thanh riêng cho kênh. Nhạc nền đổi được sang bất kỳ bài nào, Claude tự đo và cân âm lượng dưới giọng đọc. Chỉ dùng nhạc bạn có quyền sử dụng. Nói rõ bạn muốn nhiều hay ít hiệu ứng.

Chưa có thì scene-flow dùng bộ âm thanh có sẵn:

- **Nhạc nền:** "Little Things Immaterial" cho `neon3d`, `terra3d` và `cleanui`. "Short Pizzicato Song" cho `atlas3d`, tự lặp lại khi video dài hơn bài nhạc.
- **Hiệu ứng:** tiếng "whoosh" ở mỗi lần chuyển cảnh, một tiếng "thud" mở đầu video, tiếng "pop" khi biểu tượng quan trọng hiện ra, tiếng click cho con số quan trọng. `atlas3d` có thêm tiếng bút, tiếng xu và tiếng trống. Riêng `terra3d` không có tiếng chuyển cảnh. `cleanui` chỉ có "whoosh" ở cắt cảnh dứt khoát và ở đầu mỗi chương.

### 4. Phong cách hình ảnh

Claude hỏi bạn chọn phong cách cho mỗi video. Một kênh nên giữ một hoặc hai phong cách để người xem nhận ra kênh ngay từ khung hình đầu. Chọn theo chủ đề:

| Phong cách | Trông như thế nào | Hợp với chủ đề |
|---|---|---|
| `neon3d` | Các cảnh 3D ngắn trên sân khấu neon tối, ánh sáng phát quang | Công nghệ, công cụ AI, phần mềm, sản phẩm số |
| `terra3d` | Các cảnh 3D ban ngày: quả địa cầu với tuyến đường, tàu trên biển, địa hình nhìn từ drone, mặt cắt đất và nước. Cắt cảnh dứt khoát theo từng từ, phụ đề hiện từng chữ | Kỹ thuật, công trình, địa lý, lịch sử |
| `atlas3d` | Bản đồ thế giới kiểu cổ, máy quay lướt giữa các vùng, lãnh thổ nổi khối 3D, nhân vật chibi đứng trên bản đồ, xen cảnh nền ảnh | Lịch sử, địa lý, địa chính trị, kinh tế kể trên bản đồ |
| `cleanui` | Nền sáng 2D, thẻ và ô biểu tượng bo góc, chữ phụ đề tô sáng từng từ, nhân vật mascot gốc. Hiển thị các bước dùng công cụ AI và phần mềm | Công cụ AI, ứng dụng, phần mềm, hướng dẫn từng bước |

### 5. Hình ảnh và video thật

Dùng hình và video thật thay cho chữ. Tự quay màn hình khi thao tác công cụ. Claude cắt đoạn, chỉnh tốc độ và làm mờ dữ liệu riêng tư trong clip. Gửi link trang web để Claude chụp ảnh trang. Logo sản phẩm luôn lấy từ file chính thức. Với hình minh họa ý tưởng, Claude ưu tiên ảnh stock có giấy phép, và chỉ tạo ảnh bằng AI khi bạn đã thêm `IMAGE_API_URL`, `IMAGE_API_KEY` và `IMAGE_MODEL` vào `~/.config/scene-flow/.env`.

### 6. Thương hiệu và cách nói

Chọn tên kênh, câu slogan ở màn hình cuối, cách xưng hô với người xem, câu mở đầu hoặc câu kết cố định, và bộ hashtag cố định.

Lệnh `/scene-flow:channel` hỏi bạn các lựa chọn trên rồi ghi vào `AGENTS.md` của kênh, để Claude áp dụng cho mọi video sau. Xem [Dựng kênh TikTok nhiều video](#dựng-kênh-tiktok-nhiều-video) và [Phong cách của bạn](#phong-cách-của-bạn).

## Cài đặt

Mở cửa sổ dòng lệnh và dán một dòng. Trình cài đặt kiểm tra từng công cụ trước và bỏ qua những gì máy đã có. Trước khi cài bất cứ thứ gì, nó hỏi bạn xác nhận.

Bạn cần cài sẵn ít nhất một coding agent: Claude Code, Codex, Pi, agy hoặc Antigravity IDE. Trình cài đặt không cài agent. Nếu không tìm thấy agent nào, nó dừng ngay từ đầu.

**Windows:** mở PowerShell và chạy:

```powershell
irm https://raw.githubusercontent.com/sitien173/scene-flow/main/install.ps1 | iex
```

**macOS và Linux:** mở Terminal và chạy:

```bash
curl -fsSL https://raw.githubusercontent.com/sitien173/scene-flow/main/install.sh | bash
```

Trình cài đặt chuẩn bị:

| Công cụ | Phiên bản |
|---|---|
| Git, trên Windows có kèm Git Bash | bất kỳ |
| Python, kèm gói numpy và Pillow | 3.10 trở lên |
| Node.js | 22 trở lên |
| FFmpeg | bất kỳ |
| Blender, không bắt buộc, để dựng nhân vật và mô hình 3D chi tiết | 4.2 trở lên |
| Plugin scene-flow, cho từng agent trên máy mà bạn đồng ý cài | mới nhất |

Cuối cùng, trình cài đặt đề nghị chạy bước kiểm tra HyperFrames. Bước này tải trình duyệt dùng để vẽ video. Khi xong, mở cửa sổ dòng lệnh mới và khởi động agent của bạn trong thư mục làm video.

Nhận dạng giọng nói và giọng AI chạy trên Google Colab, nên bạn cần một tài khoản Google. Cách thiết lập có trong [hướng dẫn sử dụng](docs/user-guide.md#voiceover), bản tiếng Anh.

### Cài plugin bằng tay

Trình cài đặt tự thêm plugin cho các agent nó tìm thấy. Muốn tự thêm plugin thì cài các công cụ ở trên trước, rồi chạy:

| Agent | Lệnh |
|---|---|
| Claude Code | `claude plugin marketplace add sitien173/scene-flow` rồi `claude plugin install scene-flow@scene-flow` |
| Codex | `codex plugin marketplace add sitien173/scene-flow` rồi `codex plugin add scene-flow@scene-flow` |
| Pi | `pi install https://github.com/sitien173/scene-flow` |
| agy | `git clone https://github.com/sitien173/scene-flow` rồi `agy plugin install scene-flow` |
| Antigravity IDE | `git clone https://github.com/sitien173/scene-flow` rồi chạy `python install-agy-ide.py` trong thư mục vừa tải. Xem [README.EN.md](README.EN.md#antigravity-ide) |

Các lệnh và agent hỗ trợ ở phần dưới chỉ chạy trong Claude Code.

## Dựng kênh TikTok nhiều video

Khi làm đều đặn cho một kênh, gom mọi video vào một thư mục kênh để Claude nhớ thương hiệu và phong cách giữa các video. Gõ `/scene-flow:channel`, hoặc nói:

```text
Tạo kênh TikTok mới cho tôi.
```

Nếu bạn chưa có ý tưởng, Claude hỏi bạn thích chủ đề gì, muốn nói với ai, dùng giọng nào, rồi gợi ý ba hướng kênh. Mỗi hướng gồm lĩnh vực, người xem, phong cách hợp, gợi ý tên và ba chủ đề cho video đầu. Sau đó Claude hỏi tên kênh, slogan, logo và thư mục muốn tạo kênh, cho bạn xem đường dẫn đầy đủ, và chỉ tạo khi bạn đồng ý:

```text
<tên-kênh>/
├── AGENTS.md              # quy tắc chung của kênh: giọng văn, thương hiệu, hashtag
├── CLAUDE.md              # chỉ một dòng: @AGENTS.md
├── brand/
│   ├── brand.json         # tên kênh, file logo, slogan
│   └── logos/             # logo chính thức của kênh
├── new-video.sh           # tạo một video mới và gắn thương hiệu; trên Windows là new-video.ps1
├── videos/
│   └── <yyyy-mm>-<slug>/  # mỗi video là một project scene-flow riêng
└── publish/
    └── <yyyy-mm>-<slug>.mp4
```

Tạo video mới cho kênh:

```bash
./new-video.sh <slug> "Tên video" <neon3d|terra3d|atlas3d|cleanui> [file giọng đọc]
```

Trên Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\new-video.ps1 <slug> "Tên video" <neon3d|terra3d|atlas3d|cleanui> [file giọng đọc]
```

Ghi vào `AGENTS.md` những điều áp dụng cho mọi video của kênh, ví dụ màu thương hiệu, cách xưng hô, câu kết cố định, hoặc "tối đa 5 hashtag, luôn có #xuhuong". Mỗi lần làm video, mở Claude Code trong thư mục của video đó, không mở ở thư mục kênh. Nếu dùng Git, bỏ qua `publish/` và các thư mục `renders/`, `snapshots/`, `assets/audio/src/` của từng video vì chúng nặng.

## Làm video bằng prompt

Bạn không cần nhớ lệnh. Mỗi bước dưới đây có một prompt mẫu để gõ vào Claude Code, và một lệnh tắt nếu bạn muốn gọi thẳng. Claude chỉ làm một bước mỗi lần rồi chờ bạn duyệt.

### 1. Tìm chủ đề

Nói rõ lĩnh vực và người xem. Càng cụ thể, chủ đề càng sát.

```text
Tìm 5 chủ đề đang nổi về công cụ AI cho dân văn phòng, người xem 22 đến 35 tuổi.
```

Lệnh tắt: `/scene-flow:topic <lĩnh vực và người xem>`. Claude trả về danh sách chủ đề có xếp hạng và hỏi bạn chọn một.

### 2. Viết và kiểm chứng kịch bản

Đưa Claude chủ đề, link nguồn hoặc ghi chú của bạn. Kịch bản nằm trong `SCRIPT.md`, mỗi câu một dòng.

```text
Viết kịch bản khoảng 60 giây về chủ đề số 2. Nguồn: <link>.
Mở đầu bằng một câu hỏi, giọng nói chuyện, kết bằng lời kêu gọi comment từ khóa CHATBOT.
```

Nếu đã có kịch bản, dán thẳng vào tin nhắn. Sau đó nhờ Claude kiểm tra:

```text
Kiểm chứng thông tin trong kịch bản và chỉ ra câu nào khó đọc thành tiếng.
```

Lệnh tắt: `/scene-flow:script` để viết hoặc sửa, `/scene-flow:review` để kiểm chứng và nhận xét.

### 3. Chọn giọng đọc

Nếu bạn chưa có file giọng, Claude đưa ra bốn lựa chọn theo thứ tự sau:

| Lựa chọn | Cách nói với Claude | Cần chuẩn bị |
|---|---|---|
| Tự thu giọng | `File giọng đọc: recordings/voice.wav` | Thu theo đúng `SCRIPT.md`. Claude có thể đưa từng câu để bạn đọc. |
| Vibi, giọng ElevenLabs | `Dùng giọng Vibi` | Dòng `VIBI_API_KEY` trong `~/.config/scene-flow/.env`. Vibi tính credit theo số ký tự của kịch bản. |
| ElevenLabs API | `Dùng giọng ElevenLabs` | Dòng `ELEVENLABS_API_KEY` trong `~/.config/scene-flow/.env`. ElevenLabs tính credit theo số ký tự của kịch bản. Giọng lấy từ Voice Library phải được thêm vào tài khoản trước. |
| VieNeu-TTS trên Google Colab | `Dùng giọng AI miễn phí` | Lệnh `colab` đã đăng nhập tài khoản Google của bạn. Không tính phí theo ký tự, nhưng tốn compute unit của Colab. |

Muốn để mặc định thì không cần nêu tên giọng. Giọng mặc định của VieNeu-TTS là Hải Đăng, của Vibi và ElevenLabs là Quang Toan. Muốn chọn giọng khác:

```text
Liệt kê các giọng VieNeu có sẵn.
Dùng giọng "<tên giọng>".
Nhái giọng theo file mau-giong.wav.
Dùng Vibi với voice id <id ElevenLabs>.
Liệt kê các giọng trong tài khoản ElevenLabs.
Dùng ElevenLabs với voice id <id ElevenLabs>.
```

Tự thêm `VIBI_API_KEY=<key>` hoặc `ELEVENLABS_API_KEY=<key>` vào `~/.config/scene-flow/.env` rồi chạy `chmod 600 ~/.config/scene-flow/.env`. scene-flow chỉ đọc key và cấu hình từ file này, không đọc biến môi trường. Đừng dán key vào khung chat. Lệnh tắt cho VieNeu-TTS: `/scene-flow:voice`.

### 4. Chọn phong cách và dựng video

```text
Tạo video từ kịch bản này. Phải có logo của các công cụ được nhắc tới. Hạn chế chữ trên hình.
```

Claude hỏi bạn chọn `neon3d`, `terra3d`, `atlas3d` hay `cleanui`, căn hình theo giọng đọc, rồi gửi link xem thử. Nhắc tên phong cách ngay trong prompt nếu bạn đã biết mình muốn gì.

Phong cách chỉ quyết định màu, ánh sáng, góc máy và chuyển động. Nhân vật và vật thể 3D đến từ kịch bản: Claude dựng mới theo đúng phong cách, rồi hỏi "Lưu vào thư viện kênh?". Nếu bạn đồng ý, model được lưu vào `library/<phong cách>/` của kênh, và các video sau của kênh dùng lại thay vì dựng lại.

### 5. Góp ý, xuất file và đăng

- Mở link xem thử và bấm phát. Góp ý bằng lời thường, ví dụ "chữ nhỏ quá" hoặc "cảnh 3 đổi sang logo GitHub".
- Nói **"render video"** để nhận file MP4.
- Nói "viết caption và hashtag" để có tiêu đề, mô tả và hashtag.
- Nói "gửi lên Postiz" để tạo bản nháp. Claude chỉ đăng ngay hoặc hẹn giờ khi bạn yêu cầu rõ.

[Hướng dẫn sử dụng](docs/user-guide.md) giải thích chi tiết từng bước: các cách có giọng đọc, góp ý, đăng bài và xử lý sự cố. Hướng dẫn hiện chỉ có bản tiếng Anh.

## Lệnh

Trong Claude Code, gõ các lệnh sau để chạy từng bước:

| Lệnh | Việc làm |
|---|---|
| `/scene-flow:channel` | Dựng thư mục kênh hoặc gợi ý ý tưởng kênh |
| `/scene-flow:topic` | Tìm chủ đề đang nổi trong lĩnh vực của bạn |
| `/scene-flow:script` | Viết hoặc sửa kịch bản |
| `/scene-flow:review` | Kiểm chứng thông tin và nhận xét kịch bản |
| `/scene-flow:new` | Tạo project video |
| `/scene-flow:voice` | Tạo giọng AI trên Colab |
| `/scene-flow:align` | Căn kịch bản khớp với giọng đọc |
| `/scene-flow:storyboard` | Chia cảnh và chọn hình cho từng câu |
| `/scene-flow:build` | Dựng video và mở bản xem thử |
| `/scene-flow:render` | Xuất file MP4 |
| `/scene-flow:caption` | Viết tiêu đề, mô tả và hashtag |
| `/scene-flow:publish` | Gửi video lên Postiz dưới dạng bản nháp |
| `/scene-flow:theme` | Thiết kế phong cách mới từ một video mẫu |

Bạn cũng có thể chỉ cần mô tả điều mình muốn. Claude tự chọn bước phù hợp.

## Phong cách của bạn

Claude lưu lại góp ý của bạn để không lặp lại lỗi cũ. Sở thích chung cho mọi video nằm trong `AGENTS.md` ở thư mục chứa các video. Góp ý chỉ cho một video nằm trong `CLAUDE.md` của video đó. Xem [Keeping feedback for later videos](docs/user-guide.md#keeping-feedback-for-later-videos).

## Giấy phép

Mã nguồn và tài liệu dùng giấy phép [Apache-2.0](LICENSE), xem thêm [NOTICE](NOTICE). Font dùng SIL Open Font License, icon lấy từ [Lucide](https://lucide.dev), logo thuộc về chủ sở hữu. Kiểm tra giấy phép của âm thanh và video nền trong [SOURCES.md](skills/scene-flow/assets/SOURCES.md) trước khi dùng cho mục đích thương mại. Âm thanh tải từ Freesound là CC0 hoặc CC BY; với CC BY, hãy ghi nguồn trong bài đăng.

## Đóng góp

Xem [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md) và [Code of Conduct](CODE_OF_CONDUCT.md).
