# scene-flow: làm video dọc có lời đọc cùng Claude

[![CI](https://github.com/sitien173/scene-flow/actions/workflows/ci.yml/badge.svg)](https://github.com/sitien173/scene-flow/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

[English](README.EN.md)

scene-flow biến một kịch bản và một file giọng đọc thành video 9:16 cho TikTok, Reels và YouTube Shorts. Hình ảnh, phụ đề và hiệu ứng âm thanh chạy khớp theo từng từ trong giọng đọc. Bạn mô tả video bằng lời bình thường, xem thử trên trình duyệt, rồi yêu cầu sửa cho tới khi ưng ý. Claude chỉ xuất file MP4 khi bạn yêu cầu.

## Bạn có gì

- **Bốn phong cách:** `dark`, `paper`, `world3d` là một thế giới 3D với máy quay di chuyển, và `neon3d` là các cảnh 3D neon ngắn. Claude hỏi bạn chọn phong cách nào cho mỗi video.
- **Hình thật thay cho chữ:** logo sản phẩm, video quay màn hình của bạn, ảnh chụp trang web.
- **Phụ đề khớp giọng:** từ nào được đọc thì từ đó sáng lên.
- **Âm thanh:** nhạc nền và hiệu ứng âm thanh ở mỗi lần chuyển cảnh và các điểm nhấn.
- **Giọng đọc:** dùng file bạn tự thu, hoặc tạo giọng AI miễn phí trên Google Colab.

## Cài đặt

Mở cửa sổ dòng lệnh và dán một dòng. Trình cài đặt kiểm tra từng công cụ trước và bỏ qua những gì máy đã có. Trước khi cài bất cứ thứ gì, nó hỏi bạn xác nhận.

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
| Claude Code và plugin scene-flow | mới nhất |

Cuối cùng, trình cài đặt đề nghị chạy bước kiểm tra HyperFrames. Bước này tải trình duyệt dùng để vẽ video. Khi xong, mở cửa sổ dòng lệnh mới và chạy `claude` một lần để đăng nhập.

Nhận dạng giọng nói và giọng AI chạy trên Google Colab, nên bạn cần một tài khoản Google. Cách thiết lập có trong [hướng dẫn sử dụng](docs/user-guide.md#voiceover), bản tiếng Anh.

### Agent khác

scene-flow cũng chạy trong Codex, Pi và agy. Cài các công cụ ở trên trước, rồi thêm plugin:

| Agent | Lệnh |
|---|---|
| Codex | `codex plugin marketplace add sitien173/scene-flow` rồi `codex plugin add scene-flow@scene-flow` |
| Pi | `pi install https://github.com/sitien173/scene-flow` |
| agy | `git clone https://github.com/sitien173/scene-flow` rồi `agy plugin install scene-flow` |

Các lệnh và agent hỗ trợ ở phần dưới chỉ chạy trong Claude Code.

## Làm video đầu tiên

1. Tạo một thư mục để chứa video và mở Claude Code trong thư mục đó.
2. Gửi tin nhắn giống như sau:

   ```text
   Tạo video tiktok về cách tạo chatbot AI. File giọng đọc: recordings/voice.wav
   Phải có logo của các công cụ. Hạn chế chữ. Phần comment dùng từ khóa CHATBOT.
   Kịch bản:
   <kịch bản của bạn, mỗi câu một dòng>
   ```

3. Chọn phong cách khi Claude hỏi. Claude sẽ căn hình theo giọng đọc rồi gửi bạn link xem thử.
4. Mở link và bấm phát. Yêu cầu sửa bằng lời của bạn, ví dụ "chữ nhỏ quá".
5. Nói **"render video"** để nhận file MP4.

[Hướng dẫn sử dụng](docs/user-guide.md) giải thích chi tiết từng bước: các cách có giọng đọc, góp ý, đăng bài và xử lý sự cố. Hướng dẫn hiện chỉ có bản tiếng Anh.

## Lệnh

Trong Claude Code, gõ các lệnh sau để chạy từng bước:

| Lệnh | Việc làm |
|---|---|
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
